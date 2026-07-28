import { describe, it, expect } from 'vitest';
import { formatJson, minifyJson, validateJson } from '@/lib/json/format';
import { parseJson } from '@/lib/json/parse';
import { DEFAULT_FORMAT_OPTIONS } from '@/lib/types';
import type { FormatOptions } from '@/lib/types';

const opts = (o: Partial<FormatOptions> = {}): FormatOptions => ({
  ...DEFAULT_FORMAT_OPTIONS,
  ...o,
});

describe('JSON formatting', () => {
  it('formats a nested object with two-space indent', () => {
    const result = formatJson('{"a":1,"b":{"c":[1,2,3]}}', opts());
    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      '{\n  "a": 1,\n  "b": {\n    "c": [\n      1,\n      2,\n      3\n    ]\n  }\n}\n',
    );
  });

  it('formats arrays and primitives', () => {
    expect(formatJson('[1,2,3]', opts()).output).toBe('[\n  1,\n  2,\n  3\n]\n');
    expect(formatJson('true', opts()).output).toBe('true\n');
    expect(formatJson('"hello"', opts()).output).toBe('"hello"\n');
    expect(formatJson('null', opts()).output).toBe('null\n');
  });

  it('supports four-space and tab indentation', () => {
    expect(formatJson('{"a":1}', opts({ indent: 'four-space' })).output).toBe('{\n    "a": 1\n}\n');
    expect(formatJson('{"a":1}', opts({ indent: 'tab' })).output).toBe('{\n\t"a": 1\n}\n');
  });

  it('honors the final newline toggle', () => {
    expect(formatJson('{"a":1}', opts({ finalNewline: false })).output).toBe('{\n  "a": 1\n}');
  });

  it('applies CRLF line endings when requested', () => {
    const out = formatJson('{"a":1}', opts({ lineEnding: 'crlf' })).output!;
    expect(out).toContain('\r\n');
  });

  it('sorts keys only when explicitly enabled', () => {
    const unsorted = formatJson('{"b":1,"a":2}', opts()).output!;
    expect(unsorted.indexOf('"b"')).toBeLessThan(unsorted.indexOf('"a"'));
    const sorted = formatJson('{"b":1,"a":2}', opts({ sortKeys: true })).output!;
    expect(sorted.indexOf('"a"')).toBeLessThan(sorted.indexOf('"b"'));
  });

  it('preserves unicode content', () => {
    const result = formatJson('{"emoji":"😀","greek":"λ"}', opts());
    expect(result.ok).toBe(true);
    expect(result.output).toContain('😀');
    expect(result.output).toContain('λ');
  });
});

describe('JSON minification', () => {
  it('removes insignificant whitespace', () => {
    const result = minifyJson('{\n  "a": 1,\n  "b": [1, 2]\n}', opts());
    expect(result.ok).toBe(true);
    expect(result.output).toBe('{"a":1,"b":[1,2]}');
  });
});

describe('JSON validation and errors', () => {
  it('reports a precise line and column for a syntax error', () => {
    const result = validateJson('{\n  "a": 1,\n  "b" 2\n}');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.line).toBe(3);
    expect(result.errors[0]?.column).toBeGreaterThan(0);
  });

  it('rejects trailing content', () => {
    expect(validateJson('{"a":1} extra').ok).toBe(false);
  });

  it('does not repair invalid JSON', () => {
    const result = formatJson("{'a': 1}", opts());
    expect(result.ok).toBe(false);
    expect(result.output).toBeUndefined();
  });

  it('detects duplicate keys as a warning', () => {
    const parsed = parseJson('{"a":1,"a":2}');
    expect(parsed.ok).toBe(true);
    expect(parsed.duplicateKeyPaths).toContain('/a');
    expect(parsed.warnings.some((w) => w.code === 'duplicate-key')).toBe(true);
  });

  it('warns on integers beyond safe precision', () => {
    const parsed = parseJson('{"id": 9007199254740993}');
    expect(parsed.warnings.some((w) => w.code === 'precision')).toBe(true);
  });

  it('does not warn on normal integers', () => {
    const parsed = parseJson('{"id": 42}');
    expect(parsed.warnings.some((w) => w.code === 'precision')).toBe(false);
  });
});
