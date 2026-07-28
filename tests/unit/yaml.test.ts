import { describe, it, expect } from 'vitest';
import { formatYaml, validateYaml, yamlToJson, jsonToYaml, yamlToValue } from '@/lib/yaml';
import { DEFAULT_FORMAT_OPTIONS } from '@/lib/types';
import type { FormatOptions } from '@/lib/types';

const opts = (o: Partial<FormatOptions> = {}): FormatOptions => ({
  ...DEFAULT_FORMAT_OPTIONS,
  ...o,
});

describe('YAML formatting', () => {
  it('preserves comments', () => {
    const src = '# top comment\nname: test\nvalue: 1\n';
    const result = formatYaml(src, opts());
    expect(result.ok).toBe(true);
    expect(result.output).toContain('# top comment');
  });

  it('preserves anchors and aliases without expanding them', () => {
    const src = 'defaults: &d\n  a: 1\nuse:\n  <<: *d\n';
    const result = formatYaml(src, opts());
    expect(result.ok).toBe(true);
    expect(result.output).toContain('&d');
    expect(result.output).toContain('*d');
  });

  it('preserves block scalars', () => {
    const src = 'text: |\n  line one\n  line two\n';
    const result = formatYaml(src, opts());
    expect(result.output).toContain('|');
    expect(result.output).toContain('line one');
  });

  it('preserves quoted strings as strings', () => {
    const src = 'version: "1.0"\nflag: "yes"\n';
    const result = formatYaml(src, opts());
    expect(result.output).toContain('"1.0"');
    // "yes" must remain a quoted string, not become a boolean.
    expect(result.output).toMatch(/flag: ["']yes["']/);
  });

  it('does not sort keys by default', () => {
    const src = 'b: 1\na: 2\n';
    const out = formatYaml(src, opts()).output!;
    expect(out.indexOf('b:')).toBeLessThan(out.indexOf('a:'));
  });

  it('formats multiple documents preserving the separator', () => {
    const src = 'a: 1\n---\nb: 2\n';
    const result = formatYaml(src, opts());
    expect(result.ok).toBe(true);
    expect(result.output).toContain('---');
  });
});

describe('YAML validation', () => {
  it('accepts valid YAML', () => {
    expect(validateYaml('a: 1\nb: 2\n').ok).toBe(true);
  });

  it('reports malformed indentation with a location', () => {
    const result = validateYaml('a:\n  b: 1\n   c: 2\n');
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.line).toBeGreaterThan(0);
  });

  it('handles null values', () => {
    const { value } = yamlToValue('a: null\nb: ~\nc:\n');
    expect(value).toEqual({ a: null, b: null, c: null });
  });

  it('treats boolean-like quoted strings as strings', () => {
    const { value } = yamlToValue('a: "yes"\nb: yes\n');
    // YAML 1.2 core schema: unquoted "yes" is a string, quoted stays a string.
    expect((value as Record<string, unknown>).a).toBe('yes');
  });
});

describe('YAML/JSON conversion with warnings', () => {
  it('converts YAML to JSON', () => {
    const result = yamlToJson('name: test\nvalues:\n  - 1\n  - 2\n', opts());
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.output!)).toEqual({ name: 'test', values: [1, 2] });
  });

  it('warns that aliases are expanded when converting to JSON', () => {
    const src = 'defaults: &d\n  a: 1\nuse:\n  <<: *d\n';
    const result = yamlToJson(src, opts());
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.code === 'alias-expansion')).toBe(true);
  });

  it('warns about comment loss when converting to JSON', () => {
    const result = yamlToJson('# a comment\nname: test\n', opts());
    expect(result.warnings.some((w) => w.code === 'comment-loss')).toBe(true);
  });

  it('warns when converting multiple documents to JSON', () => {
    const result = yamlToJson('a: 1\n---\nb: 2\n', opts());
    expect(result.warnings.some((w) => w.code === 'multi-document')).toBe(true);
    expect(JSON.parse(result.output!)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('converts JSON to YAML preserving key order', () => {
    const result = jsonToYaml('{"z":1,"a":2}', opts());
    expect(result.ok).toBe(true);
    expect(result.output!.indexOf('z:')).toBeLessThan(result.output!.indexOf('a:'));
  });

  it('rejects invalid JSON when converting to YAML', () => {
    expect(jsonToYaml("{'bad': 1}", opts()).ok).toBe(false);
  });

  it('protects against excessive alias expansion (billion laughs)', () => {
    const bomb = [
      'a: &a ["x","x","x","x","x","x","x","x","x","x"]',
      'b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a,*a]',
      'c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b,*b]',
      'd: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c,*c]',
      'e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d,*d]',
    ].join('\n');
    // Alias expansion happens at conversion time; maxAliasCount caps it so the
    // conversion fails safely instead of exhausting memory.
    const result = yamlToJson(bomb, opts());
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.message.toLowerCase()).toContain('alias');
  });
});
