/**
 * Suggested repairs for *nearly* valid JSON.
 *
 * This module never repairs anything on its own: it returns what it *would*
 * change, with a count per fix and the resulting document, so the UI can show
 * the user exactly what will happen before they accept it. That keeps the
 * product's "no silent repair" promise intact while still helping with the most
 * common reason people arrive here — a document that is one trailing comma away
 * from being valid.
 *
 * Repairs are applied by a single string-aware pass, not by regular
 * expressions. A regex that strips `//` comments would happily destroy
 * `"url": "https://example.com"`, and one that removes trailing commas would
 * corrupt `"note": "a, b,"`. The scanner below only ever rewrites text that
 * sits outside a string literal.
 *
 * Pure and DOM-free, like the rest of the engine.
 */

import type { EngineError } from '../types';
import { parseJson } from './parse';

export type RepairFix =
  | 'bom'
  | 'smart-quotes'
  | 'comments'
  | 'trailing-commas'
  | 'single-quotes'
  | 'unquoted-keys'
  | 'python-literals'
  | 'unclosed-brackets';

export interface RepairSuggestion {
  fix: RepairFix;
  /** Short label for the suggestion, e.g. "Remove trailing commas". */
  title: string;
  /** One sentence explaining why the input is invalid without the fix. */
  detail: string;
  /** How many occurrences this fix addresses. */
  count: number;
}

export interface RepairResult {
  /** True when the repaired document parses as valid JSON. */
  ok: boolean;
  /** The repaired document. Equal to the input when nothing was changed. */
  output: string;
  /** The fixes that were applied, in the order they are worth explaining. */
  suggestions: RepairSuggestion[];
  /** The remaining parse error, when the repaired document is still invalid. */
  remainingError?: EngineError;
}

const FIX_COPY: Record<RepairFix, { title: string; detail: string }> = {
  bom: {
    title: 'Remove the byte-order mark',
    detail:
      'The file starts with an invisible BOM character, which JSON parsers reject before reading anything else.',
  },
  'smart-quotes': {
    title: 'Replace curly quotes with straight quotes',
    detail:
      'Curly “smart” quotes come from pasting through a word processor or chat app. JSON only accepts straight double quotes as string delimiters.',
  },
  comments: {
    title: 'Remove comments',
    detail:
      'JSON has no comments. // and /* */ are valid in JSONC and JavaScript, but not in JSON (RFC 8259).',
  },
  'trailing-commas': {
    title: 'Remove trailing commas',
    detail:
      'A comma before a closing } or ] is allowed in JavaScript but not in JSON. This is the single most common reason valid-looking JSON fails to parse.',
  },
  'single-quotes': {
    title: 'Convert single-quoted strings to double quotes',
    detail:
      'JSON strings must use double quotes. Single quotes are a JavaScript-ism that JSON parsers reject.',
  },
  'unquoted-keys': {
    title: 'Quote unquoted keys',
    detail:
      'Object keys must be quoted strings in JSON, even when they look like plain identifiers.',
  },
  'python-literals': {
    title: 'Convert Python literals to JSON',
    detail:
      'True, False, and None are Python spellings. JSON uses lowercase true, false, and null.',
  },
  'unclosed-brackets': {
    title: 'Close unclosed brackets',
    detail:
      'The document ends while objects or arrays are still open — usually a truncated copy-paste. Check the appended brackets are where you actually want them.',
  },
};

/** Opening delimiters we accept for a string, and what closes each. */
const STRING_DELIMITERS: Record<string, { closers: string[]; smart: boolean; single: boolean }> = {
  '"': { closers: ['"'], smart: false, single: false },
  "'": { closers: ["'"], smart: false, single: true },
  '“': { closers: ['”', '“', '"'], smart: true, single: false }, // “ ”
  '”': { closers: ['”', '“', '"'], smart: true, single: false },
  '‘': { closers: ['’', '‘', "'"], smart: true, single: true }, // ‘ ’
  '’': { closers: ['’', '‘', "'"], smart: true, single: true },
};

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;

const PYTHON_LITERALS: Record<string, string> = {
  True: 'true',
  False: 'false',
  None: 'null',
};

const ALL_FIXES: RepairFix[] = [
  'bom',
  'smart-quotes',
  'comments',
  'trailing-commas',
  'single-quotes',
  'unquoted-keys',
  'python-literals',
  'unclosed-brackets',
];

/**
 * Rewrite `source` applying the enabled fixes, reporting how many times each
 * one fired. Passing no set enables every fix.
 */
export function repairJson(source: string, enabled?: Iterable<RepairFix>): RepairResult {
  const fixes = new Set<RepairFix>(enabled ?? ALL_FIXES);
  const counts = new Map<RepairFix, number>();
  const bump = (fix: RepairFix) => counts.set(fix, (counts.get(fix) ?? 0) + 1);

  let src = source;
  if (fixes.has('bom') && src.charCodeAt(0) === 0xfeff) {
    src = src.slice(1);
    bump('bom');
  }

  let out = '';
  let pos = 0;
  /** Open brackets, so we can close them at EOF if asked to. */
  const brackets: string[] = [];
  /** Set when the input is too broken to rewrite safely (e.g. unterminated string). */
  let bailed = false;

  /** Skip whitespace and, if comment removal is on, comments — for lookahead only. */
  const lookaheadNonSpace = (from: number): { index: number; char: string } => {
    let i = from;
    for (;;) {
      while (i < src.length && /\s/.test(src[i]!)) i++;
      if (fixes.has('comments') && src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
        if (src[i + 1] === '/') {
          while (i < src.length && src[i] !== '\n') i++;
        } else {
          const end = src.indexOf('*/', i + 2);
          i = end === -1 ? src.length : end + 2;
        }
        continue;
      }
      return { index: i, char: src[i] ?? '' };
    }
  };

  /**
   * Read a string literal starting at `pos` and append its JSON form to `out`.
   * Returns false if the string is unterminated.
   */
  const readString = (): boolean => {
    const open = src[pos]!;
    const spec = STRING_DELIMITERS[open]!;
    const verbatim = open === '"';
    const start = pos;
    pos++;

    let decoded = '';
    for (;;) {
      if (pos >= src.length) return false; // unterminated
      const ch = src[pos]!;
      if (ch === '\\') {
        // Preserve the escape sequence as authored; the parser will validate it.
        decoded += ch + (src[pos + 1] ?? '');
        pos += 2;
        continue;
      }
      if (spec.closers.includes(ch)) {
        pos++;
        break;
      }
      decoded += ch;
      pos++;
    }

    if (verbatim) {
      out += src.slice(start, pos);
      return true;
    }

    // Re-emit as a proper JSON string. `decoded` still carries raw escape
    // sequences, so unescape the ones that were only needed for the original
    // delimiter, then escape what JSON requires.
    const unescaped = decoded.replace(/\\(['"‘’“”])/g, '$1');
    out += JSON.stringify(unescaped);
    if (spec.smart) bump('smart-quotes');
    else if (spec.single) bump('single-quotes');
    return true;
  };

  while (pos < src.length) {
    const ch = src[pos]!;

    // --- strings -----------------------------------------------------------
    const spec = STRING_DELIMITERS[ch];
    if (spec) {
      const usable =
        ch === '"' ||
        (spec.smart && fixes.has('smart-quotes')) ||
        (spec.single && !spec.smart && fixes.has('single-quotes'));
      if (usable) {
        if (!readString()) {
          bailed = true;
          break;
        }
        continue;
      }
    }

    // --- comments ----------------------------------------------------------
    if (fixes.has('comments') && ch === '/' && (src[pos + 1] === '/' || src[pos + 1] === '*')) {
      if (src[pos + 1] === '/') {
        while (pos < src.length && src[pos] !== '\n') pos++;
      } else {
        const end = src.indexOf('*/', pos + 2);
        pos = end === -1 ? src.length : end + 2;
      }
      bump('comments');
      continue;
    }

    // --- trailing commas ---------------------------------------------------
    if (fixes.has('trailing-commas') && ch === ',') {
      const next = lookaheadNonSpace(pos + 1);
      if (next.char === '}' || next.char === ']') {
        pos++; // drop the comma; whitespace and the closer are emitted normally
        bump('trailing-commas');
        continue;
      }
    }

    // --- brackets ----------------------------------------------------------
    if (ch === '{' || ch === '[') {
      brackets.push(ch === '{' ? '}' : ']');
      out += ch;
      pos++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      if (brackets[brackets.length - 1] === ch) brackets.pop();
      out += ch;
      pos++;
      continue;
    }

    // --- bare identifiers: keys and Python literals -------------------------
    if (IDENTIFIER_START.test(ch)) {
      let end = pos;
      while (end < src.length && IDENTIFIER_PART.test(src[end]!)) end++;
      const word = src.slice(pos, end);
      const following = lookaheadNonSpace(end);

      if (following.char === ':') {
        // Key position. `true`, `false` and `null` are not valid keys either,
        // so quote any bare word that sits here.
        if (fixes.has('unquoted-keys')) {
          out += JSON.stringify(word);
          pos = end;
          bump('unquoted-keys');
          continue;
        }
      } else if (fixes.has('python-literals') && word in PYTHON_LITERALS) {
        out += PYTHON_LITERALS[word]!;
        pos = end;
        bump('python-literals');
        continue;
      }

      out += word;
      pos = end;
      continue;
    }

    out += ch;
    pos++;
  }

  if (bailed) {
    // Do not hand back a half-rewritten document.
    return finish(source, source, new Map(), fixes);
  }

  if (fixes.has('unclosed-brackets') && brackets.length > 0) {
    for (let i = brackets.length - 1; i >= 0; i--) out += brackets[i];
    counts.set('unclosed-brackets', brackets.length);
  }

  return finish(source, out, counts, fixes);
}

function finish(
  source: string,
  output: string,
  counts: Map<RepairFix, number>,
  fixes: Set<RepairFix>,
): RepairResult {
  const suggestions: RepairSuggestion[] = ALL_FIXES.filter(
    (fix) => fixes.has(fix) && (counts.get(fix) ?? 0) > 0,
  ).map((fix) => ({
    fix,
    title: FIX_COPY[fix].title,
    detail: FIX_COPY[fix].detail,
    count: counts.get(fix)!,
  }));

  const parsed = parseJson(output);
  return {
    ok: parsed.ok,
    output: suggestions.length === 0 ? source : output,
    suggestions,
    remainingError: parsed.ok ? undefined : parsed.errors[0],
  };
}

/**
 * Analyse a document that failed to parse and report the fixes that would help.
 * Returns `null` when the document is already valid or when nothing we know how
 * to fix applies — callers should then show the parse error unchanged rather
 * than implying a repair exists.
 */
export function suggestJsonRepairs(source: string): RepairResult | null {
  if (source.trim().length === 0) return null;
  if (parseJson(source).ok) return null;
  const result = repairJson(source);
  return result.suggestions.length > 0 ? result : null;
}
