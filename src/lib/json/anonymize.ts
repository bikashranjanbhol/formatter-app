import type { EngineResult, IndentStyle, LineEnding } from '../types';
import { applyLineEndings, indentUnit } from '../text';
import { parseJson } from './parse';

/**
 * Client-side JSON anonymizer. Replaces values with dummy data so users can
 * safely share sample payloads without leaking company/PII data. Runs entirely
 * in the browser, like every other tool — the document is never uploaded.
 *
 * Two scopes:
 *  - 'all'  : replace every scalar value in the document.
 *  - 'keys' : replace only values under the named keys (matched case-insensitively
 *             at any depth). If a matched key holds an object/array, everything
 *             inside it is replaced too.
 *
 * Three strategies:
 *  - 'realistic' : key-aware fake data (email -> user1@example.com, etc.).
 *  - 'redact'    : mask with "***" (numbers -> 0), for hiding secrets/PII.
 *  - 'type'      : minimal type placeholders ("string", 0, true).
 *
 * Structure, keys, array lengths, and value types are always preserved.
 */

export type AnonymizeStrategy = 'realistic' | 'redact' | 'type';
export type AnonymizeScope = 'all' | 'keys';

export interface AnonymizeOptions {
  scope: AnonymizeScope;
  /** Key names to target when scope is 'keys'. Case-insensitive. */
  keys: string[];
  strategy: AnonymizeStrategy;
  indent: IndentStyle;
  lineEnding: LineEnding;
  finalNewline: boolean;
}

// Deterministic pools so output is stable across runs (and testable). The
// values are intentionally generic/fictional to avoid resembling real data.
const NAMES = [
  'Jordan Lee',
  'Alex Morgan',
  'Sam Rivera',
  'Taylor Chen',
  'Casey Kim',
  'Riley Novak',
];
const FIRST = ['Jordan', 'Alex', 'Sam', 'Taylor', 'Casey', 'Riley'];
const LAST = ['Lee', 'Morgan', 'Rivera', 'Chen', 'Kim', 'Novak'];
const CITIES = ['Springfield', 'Riverton', 'Fairview', 'Lakeside', 'Kingsport', 'Ashland'];
const COUNTRIES = ['Freedonia', 'Genovia', 'Latveria', 'Sokovia'];
const COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Vandelay LLC', 'Hooli', 'Umbrella Co'];
const STREETS = ['123 Main St', '456 Oak Ave', '789 Pine Rd', '1010 Maple Ln'];
const WORDS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur'];

function pick<T>(pool: T[], n: number): T {
  return pool[n % pool.length]!;
}

const SECRET_RE = /(pass|secret|token|api[-_]?key|auth|credential|private[-_]?key)/;

/** Produce a realistic dummy value based on the key name and original type. */
function realistic(key: string | null, value: unknown, n: number): unknown {
  const k = (key ?? '').toLowerCase();

  // Secrets are always fully masked, regardless of type.
  if (k && SECRET_RE.test(k)) return '***REDACTED***';

  if (k.includes('email') || k.includes('mail')) return `user${n}@example.com`;
  if (k.includes('firstname') || k === 'first' || k.includes('first_name')) return pick(FIRST, n);
  if (k.includes('lastname') || k.includes('last_name') || k.includes('surname'))
    return pick(LAST, n);
  if (k.includes('username') || k === 'user' || k === 'login') return `user${n}`;
  if (k.includes('name')) return pick(NAMES, n);
  if (k.includes('phone') || k.includes('mobile') || k === 'tel' || k.includes('contact'))
    return `+1-555-${String(100 + (n % 900)).padStart(4, '0')}`;
  if (k.includes('ssn') || k.includes('socialsecurity')) return '000-00-0000';
  if (k.includes('street') || k.includes('address') || k === 'addr') return pick(STREETS, n);
  if (k.includes('city')) return pick(CITIES, n);
  if (k.includes('country')) return pick(COUNTRIES, n);
  if (k === 'state' || k.includes('province')) return 'CA';
  if (k.includes('zip') || k.includes('postal')) return String(10000 + (n % 89999));
  if (k.includes('company') || k.includes('organization') || k === 'org' || k.includes('employer'))
    return pick(COMPANIES, n);
  if (k.includes('url') || k.includes('website') || k.includes('link') || k.includes('href'))
    return 'https://example.com';
  if (k.includes('ip')) return `192.0.2.${(n % 254) + 1}`; // TEST-NET-1, non-routable
  if (k.includes('uuid') || k.includes('guid'))
    return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  if (k === 'id' || k.endsWith('id') || k.endsWith('_id'))
    return typeof value === 'number' ? 1000 + n : `id-${n}`;
  if (k.includes('date') || k.endsWith('at') || k.includes('time') || k.includes('timestamp'))
    return typeof value === 'number' ? 1577836800 + n : '2020-01-01T00:00:00Z';
  if (
    k.includes('price') ||
    k.includes('amount') ||
    k.includes('cost') ||
    k.includes('salary') ||
    k.includes('balance')
  )
    return typeof value === 'number' ? Math.round(((n * 37) % 10000) * 100) / 100 : '0.00';

  // Fall back to the original type.
  switch (typeof value) {
    case 'string':
      return pick(WORDS, n);
    case 'number':
      return (n * 7) % 1000;
    case 'boolean':
      return n % 2 === 0;
    default:
      return value; // null stays null
  }
}

function redact(value: unknown): unknown {
  switch (typeof value) {
    case 'string':
      return '***';
    case 'number':
      return 0;
    default:
      return value; // booleans / null left as-is (not sensitive)
  }
}

function typePlaceholder(value: unknown): unknown {
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 0;
    case 'boolean':
      return true;
    default:
      return value;
  }
}

interface Ctx {
  counter: number;
  replaced: number;
}

function replaceScalar(
  value: unknown,
  key: string | null,
  strategy: AnonymizeStrategy,
  ctx: Ctx,
): unknown {
  ctx.replaced += 1;
  const n = ctx.counter++;
  switch (strategy) {
    case 'realistic':
      return realistic(key, value, n);
    case 'redact':
      return redact(value);
    case 'type':
      return typePlaceholder(value);
  }
}

/** Core anonymization options (format-independent). */
export interface AnonymizeCoreOptions {
  scope: AnonymizeScope;
  keys: string[];
  strategy: AnonymizeStrategy;
}

/** How many non-empty key names were provided (after trimming). */
export function namedKeyCount(keys: string[]): number {
  return keys.filter((k) => k.trim().length > 0).length;
}

/**
 * Anonymize an already-parsed JS value. Framework- and format-independent, so
 * it is reused by both the JSON and YAML anonymizers. Returns the new value and
 * how many scalars were replaced.
 */
export function anonymizeValue(
  value: unknown,
  options: AnonymizeCoreOptions,
): { value: unknown; replaced: number } {
  const keySet = new Set(
    options.keys.map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0),
  );
  const ctx: Ctx = { counter: 1, replaced: 0 };

  const walk = (val: unknown, key: string | null, targeted: boolean): unknown => {
    const nowTargeted =
      targeted || (options.scope === 'keys' && key != null && keySet.has(key.toLowerCase()));

    if (Array.isArray(val)) {
      return val.map((item) => walk(item, null, nowTargeted));
    }
    if (val && typeof val === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        out[k] = walk(v, k, nowTargeted);
      }
      return out;
    }
    if (options.scope === 'all' || nowTargeted) {
      return replaceScalar(val, key, options.strategy, ctx);
    }
    return val;
  };

  return { value: walk(value, null, false), replaced: ctx.replaced };
}

/** Advisory note describing the result of an anonymization run. */
export function anonymizeNote(replaced: number, scope: AnonymizeScope): string {
  if (replaced === 0) {
    return scope === 'keys'
      ? 'No matching keys were found, so nothing was changed. Check the key names.'
      : 'No scalar values were found to replace.';
  }
  return `Anonymized ${replaced} value${replaced === 1 ? '' : 's'}.`;
}

export function anonymizeJson(source: string, options: AnonymizeOptions): EngineResult {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to anonymize — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }

  const parsed = parseJson(source);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, warnings: parsed.warnings };
  }

  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (err) {
    return {
      ok: false,
      errors: [
        { message: err instanceof Error ? err.message : 'Invalid JSON.', severity: 'error' },
      ],
      warnings: parsed.warnings,
    };
  }

  if (options.scope === 'keys' && namedKeyCount(options.keys) === 0) {
    return {
      ok: false,
      errors: [
        {
          message: 'Enter at least one key to anonymize, or switch the scope to “All values”.',
          severity: 'error',
          code: 'no-keys',
        },
      ],
      warnings: parsed.warnings,
    };
  }

  const { value: result, replaced } = anonymizeValue(value, options);
  const pretty = JSON.stringify(result, null, indentUnit(options.indent));
  const output = applyLineEndings(pretty, {
    indent: options.indent,
    lineEnding: options.lineEnding,
    finalNewline: options.finalNewline,
    sortKeys: false,
  });

  return {
    ok: true,
    output,
    errors: [],
    warnings: parsed.warnings,
    notes: [anonymizeNote(replaced, options.scope)],
  };
}
