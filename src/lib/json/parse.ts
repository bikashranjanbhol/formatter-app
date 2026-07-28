import type { EngineError } from '../types';
import { offsetToPosition } from '../text';

/**
 * A small, dependency-free JSON parser that produces precise error locations,
 * detects duplicate keys, and flags integers that exceed IEEE-754 safe
 * precision. Native JSON.parse is fast but gives poor diagnostics and silently
 * collapses duplicate keys, so we use this for validation and analysis.
 *
 * The parser follows RFC 8259. It intentionally does NOT repair input.
 */

export interface JsonParseResult {
  ok: boolean;
  value?: unknown;
  errors: EngineError[];
  warnings: EngineError[];
  /** Paths (JSON Pointer) where duplicate keys were found. */
  duplicateKeyPaths: string[];
  /** Paths where an integer literal loses precision as a JS number. */
  precisionWarningPaths: string[];
}

class Scanner {
  pos = 0;
  constructor(readonly src: string) {}

  eof(): boolean {
    return this.pos >= this.src.length;
  }
  peek(): string {
    return this.src[this.pos] ?? '';
  }
  next(): string {
    return this.src[this.pos++] ?? '';
  }
}

class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

function skipWhitespace(s: Scanner): void {
  while (!s.eof() && WHITESPACE.has(s.peek())) s.pos++;
}

function isSafeIntegerLiteral(raw: string): boolean {
  // Only whole-number literals (no fraction/exponent) can silently lose
  // precision in a way users care about for identifiers.
  if (/[.eE]/.test(raw)) return true;
  try {
    return (
      BigInt(raw) <= BigInt(Number.MAX_SAFE_INTEGER) &&
      BigInt(raw) >= BigInt(Number.MIN_SAFE_INTEGER)
    );
  } catch {
    return true;
  }
}

export function parseJson(src: string): JsonParseResult {
  const errors: EngineError[] = [];
  const warnings: EngineError[] = [];
  const duplicateKeyPaths: string[] = [];
  const precisionWarningPaths: string[] = [];

  const s = new Scanner(src);

  function fail(message: string, offset: number): never {
    throw new JsonSyntaxError(message, offset);
  }

  function parseValue(path: string): unknown {
    skipWhitespace(s);
    if (s.eof()) fail('Unexpected end of input.', s.pos);
    const c = s.peek();
    switch (c) {
      case '{':
        return parseObject(path);
      case '[':
        return parseArray(path);
      case '"':
        return parseString();
      case 't':
      case 'f':
        return parseBoolean();
      case 'n':
        return parseNull();
      default:
        if (c === '-' || (c >= '0' && c <= '9')) return parseNumber(path);
        fail(`Unexpected character ${JSON.stringify(c)}.`, s.pos);
    }
  }

  function parseObject(path: string): Record<string, unknown> {
    s.next(); // consume {
    const obj: Record<string, unknown> = {};
    const seen = new Set<string>();
    skipWhitespace(s);
    if (s.peek() === '}') {
      s.next();
      return obj;
    }
    for (;;) {
      skipWhitespace(s);
      if (s.peek() !== '"') fail('Expected a string key.', s.pos);
      const keyStart = s.pos;
      const key = parseString();
      if (seen.has(key)) {
        const { line, column } = offsetToPosition(src, keyStart);
        duplicateKeyPaths.push(`${path}/${escapePointer(key)}`);
        warnings.push({
          message: `Duplicate key "${key}". The last value wins in most parsers.`,
          line,
          column,
          offset: keyStart,
          code: 'duplicate-key',
          severity: 'warning',
        });
      }
      seen.add(key);
      skipWhitespace(s);
      if (s.next() !== ':') fail('Expected ":" after object key.', s.pos - 1);
      obj[key] = parseValue(`${path}/${escapePointer(key)}`);
      skipWhitespace(s);
      const ch = s.next();
      if (ch === ',') continue;
      if (ch === '}') break;
      fail('Expected "," or "}" in object.', s.pos - 1);
    }
    return obj;
  }

  function parseArray(path: string): unknown[] {
    s.next(); // consume [
    const arr: unknown[] = [];
    skipWhitespace(s);
    if (s.peek() === ']') {
      s.next();
      return arr;
    }
    let index = 0;
    for (;;) {
      arr.push(parseValue(`${path}/${index}`));
      index += 1;
      skipWhitespace(s);
      const ch = s.next();
      if (ch === ',') continue;
      if (ch === ']') break;
      fail('Expected "," or "]" in array.', s.pos - 1);
    }
    return arr;
  }

  function parseString(): string {
    s.next(); // consume opening quote
    let out = '';
    for (;;) {
      if (s.eof()) fail('Unterminated string.', s.pos);
      const c = s.next();
      if (c === '"') break;
      if (c === '\\') {
        const esc = s.next();
        switch (esc) {
          case '"':
            out += '"';
            break;
          case '\\':
            out += '\\';
            break;
          case '/':
            out += '/';
            break;
          case 'b':
            out += '\b';
            break;
          case 'f':
            out += '\f';
            break;
          case 'n':
            out += '\n';
            break;
          case 'r':
            out += '\r';
            break;
          case 't':
            out += '\t';
            break;
          case 'u': {
            const hex = s.src.slice(s.pos, s.pos + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('Invalid unicode escape.', s.pos);
            out += String.fromCharCode(parseInt(hex, 16));
            s.pos += 4;
            break;
          }
          default:
            fail(`Invalid escape sequence "\\${esc}".`, s.pos - 1);
        }
      } else if (c.charCodeAt(0) < 0x20) {
        fail('Unescaped control character in string.', s.pos - 1);
      } else {
        out += c;
      }
    }
    return out;
  }

  function parseNumber(path: string): number {
    const start = s.pos;
    if (s.peek() === '-') s.next();
    if (s.peek() === '0') {
      s.next();
    } else if (s.peek() >= '1' && s.peek() <= '9') {
      while (s.peek() >= '0' && s.peek() <= '9') s.next();
    } else {
      fail('Invalid number.', s.pos);
    }
    if (s.peek() === '.') {
      s.next();
      if (!(s.peek() >= '0' && s.peek() <= '9')) fail('Invalid fraction in number.', s.pos);
      while (s.peek() >= '0' && s.peek() <= '9') s.next();
    }
    if (s.peek() === 'e' || s.peek() === 'E') {
      s.next();
      if (s.peek() === '+' || s.peek() === '-') s.next();
      if (!(s.peek() >= '0' && s.peek() <= '9')) fail('Invalid exponent in number.', s.pos);
      while (s.peek() >= '0' && s.peek() <= '9') s.next();
    }
    const raw = s.src.slice(start, s.pos);
    if (!isSafeIntegerLiteral(raw)) {
      const { line, column } = offsetToPosition(src, start);
      precisionWarningPaths.push(path);
      warnings.push({
        message: `Number ${raw} exceeds JavaScript's safe integer range and may lose precision.`,
        line,
        column,
        offset: start,
        code: 'precision',
        severity: 'warning',
      });
    }
    return Number(raw);
  }

  function parseKeyword<T>(word: string, value: T): T {
    if (s.src.slice(s.pos, s.pos + word.length) === word) {
      s.pos += word.length;
      return value;
    }
    fail(`Invalid literal, expected "${word}".`, s.pos);
  }

  function parseBoolean(): boolean {
    return s.peek() === 't' ? parseKeyword('true', true) : parseKeyword('false', false);
  }
  function parseNull(): null {
    return parseKeyword('null', null);
  }

  try {
    const value = parseValue('');
    skipWhitespace(s);
    if (!s.eof()) fail('Unexpected trailing content after JSON value.', s.pos);
    return { ok: true, value, errors, warnings, duplicateKeyPaths, precisionWarningPaths };
  } catch (err) {
    if (err instanceof JsonSyntaxError) {
      const { line, column } = offsetToPosition(src, err.offset);
      errors.push({
        message: err.message,
        line,
        column,
        offset: err.offset,
        code: 'syntax',
        severity: 'error',
      });
    } else {
      errors.push({
        message: err instanceof Error ? err.message : 'Failed to parse JSON.',
        severity: 'error',
        code: 'unknown',
      });
    }
    return { ok: false, errors, warnings, duplicateKeyPaths, precisionWarningPaths };
  }
}

/** Escape a key for use in a JSON Pointer path segment (RFC 6901). */
export function escapePointer(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}
