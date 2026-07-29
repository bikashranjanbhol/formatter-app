import { describe, it, expect } from 'vitest';
import { anonymizeJson, type AnonymizeOptions } from '@/lib/json/anonymize';

const opts = (o: Partial<AnonymizeOptions> = {}): AnonymizeOptions => ({
  scope: 'all',
  keys: [],
  strategy: 'realistic',
  indent: 'two-space',
  lineEnding: 'lf',
  finalNewline: true,
  ...o,
});

function parse(out: string | undefined) {
  return JSON.parse(out ?? '{}');
}

describe('JSON anonymizer', () => {
  it('replaces all scalar values while preserving structure and keys', () => {
    const res = anonymizeJson('{"a":"secret","b":123,"c":{"d":"x"},"e":[1,2]}', opts());
    expect(res.ok).toBe(true);
    const v = parse(res.output);
    expect(Object.keys(v)).toEqual(['a', 'b', 'c', 'e']);
    expect(v.a).not.toBe('secret');
    expect(typeof v.a).toBe('string');
    expect(typeof v.b).toBe('number');
    expect(Object.keys(v.c)).toEqual(['d']);
    expect(Array.isArray(v.e)).toBe(true);
    expect(v.e).toHaveLength(2);
  });

  it('produces key-aware realistic values', () => {
    const res = anonymizeJson('{"email":"a@b.com","firstName":"Ada","city":"London"}', opts());
    const v = parse(res.output);
    expect(v.email).toMatch(/@example\.com$/);
    expect(v.firstName).not.toBe('Ada');
    expect(typeof v.city).toBe('string');
  });

  it('always redacts secret-like keys, even in realistic mode', () => {
    const res = anonymizeJson(
      '{"apiKey":"sk_live_123","password":"hunter2","token":"abc"}',
      opts(),
    );
    const v = parse(res.output);
    expect(v.apiKey).toBe('***REDACTED***');
    expect(v.password).toBe('***REDACTED***');
    expect(v.token).toBe('***REDACTED***');
  });

  it('redact strategy masks strings and zeroes numbers', () => {
    const res = anonymizeJson('{"a":"hello","b":42,"c":true}', opts({ strategy: 'redact' }));
    const v = parse(res.output);
    expect(v.a).toBe('***');
    expect(v.b).toBe(0);
    expect(v.c).toBe(true); // booleans left as-is
  });

  it('type strategy produces placeholders', () => {
    const res = anonymizeJson('{"a":"x","b":9,"c":false}', opts({ strategy: 'type' }));
    const v = parse(res.output);
    expect(v).toEqual({ a: 'string', b: 0, c: true });
  });

  it('scope "keys" only replaces the named keys at any depth', () => {
    const res = anonymizeJson(
      '{"email":"a@b.com","name":"Ada","nested":{"email":"c@d.com","keep":"me"}}',
      opts({ scope: 'keys', keys: ['email'], strategy: 'redact' }),
    );
    const v = parse(res.output);
    expect(v.email).toBe('***');
    expect(v.name).toBe('Ada'); // untouched
    expect(v.nested.email).toBe('***');
    expect(v.nested.keep).toBe('me'); // untouched
  });

  it('anonymizes an entire object when its key is matched', () => {
    const res = anonymizeJson(
      '{"customer":{"a":"x","b":1},"other":"y"}',
      opts({ scope: 'keys', keys: ['customer'], strategy: 'type' }),
    );
    const v = parse(res.output);
    expect(v.customer).toEqual({ a: 'string', b: 0 });
    expect(v.other).toBe('y');
  });

  it('matches keys case-insensitively and trims whitespace', () => {
    const res = anonymizeJson(
      '{"Email":"a@b.com"}',
      opts({ scope: 'keys', keys: [' email '], strategy: 'redact' }),
    );
    expect(parse(res.output).Email).toBe('***');
  });

  it('reports how many values were replaced', () => {
    const res = anonymizeJson('{"a":1,"b":2}', opts());
    expect(res.notes?.some((n) => /Anonymized 2 values/.test(n))).toBe(true);
  });

  it('errors when scope is keys but no keys are provided', () => {
    const res = anonymizeJson('{"a":1}', opts({ scope: 'keys', keys: ['', '  '] }));
    expect(res.ok).toBe(false);
    expect(res.errors[0]?.code).toBe('no-keys');
  });

  it('rejects invalid JSON without repairing it', () => {
    const res = anonymizeJson("{'bad': 1}", opts());
    expect(res.ok).toBe(false);
    expect(res.output).toBeUndefined();
  });

  it('notes when no keys matched', () => {
    const res = anonymizeJson('{"a":1}', opts({ scope: 'keys', keys: ['missing'] }));
    expect(res.ok).toBe(true);
    expect(res.notes?.some((n) => /No matching keys/.test(n))).toBe(true);
  });
});
