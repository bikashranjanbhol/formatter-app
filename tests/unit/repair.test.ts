import { describe, it, expect } from 'vitest';
import { repairJson, suggestJsonRepairs, type RepairFix } from '@/lib/json/repair';
import { parseJson } from '@/lib/json/parse';

/** Repair and assert the result parses to the expected value. */
function repaired(source: string, expected: unknown) {
  const result = repairJson(source);
  expect(result.ok, `still invalid: ${result.remainingError?.message}`).toBe(true);
  expect(JSON.parse(result.output)).toEqual(expected);
  return result;
}

const fixes = (source: string): RepairFix[] => repairJson(source).suggestions.map((s) => s.fix);

describe('JSON repair — the common breakages', () => {
  it('removes a trailing comma in an object', () => {
    const result = repaired('{ "a": 1, "b": 2, }', { a: 1, b: 2 });
    expect(result.suggestions).toEqual([
      expect.objectContaining({ fix: 'trailing-commas', count: 1 }),
    ]);
  });

  it('removes trailing commas in arrays and counts each one', () => {
    const result = repaired('[1, 2, 3, ]', [1, 2, 3]);
    expect(result.suggestions[0]).toMatchObject({ fix: 'trailing-commas', count: 1 });

    const many = repairJson('{ "a": [1, 2, ], "b": { "c": 1, }, }');
    expect(many.ok).toBe(true);
    expect(many.suggestions[0]).toMatchObject({ fix: 'trailing-commas', count: 3 });
  });

  it('converts single-quoted strings to double quotes', () => {
    repaired("{ 'name': 'Ada' }", { name: 'Ada' });
  });

  it('quotes unquoted keys', () => {
    const result = repaired('{ name: "Ada", age: 36 }', { name: 'Ada', age: 36 });
    expect(result.suggestions[0]).toMatchObject({ fix: 'unquoted-keys', count: 2 });
  });

  it('strips line and block comments', () => {
    repaired('{\n  // the name\n  "a": 1,\n  /* block */ "b": 2\n}', { a: 1, b: 2 });
  });

  it('converts Python literals', () => {
    repaired('{ "a": True, "b": False, "c": None }', { a: true, b: false, c: null });
  });

  it('replaces curly quotes from a word processor paste', () => {
    repaired('{ “name”: “Ada” }', { name: 'Ada' });
  });

  it('removes a byte-order mark', () => {
    const result = repaired('﻿{ "a": 1 }', { a: 1 });
    expect(result.suggestions[0]).toMatchObject({ fix: 'bom' });
  });

  it('closes unclosed brackets from a truncated paste', () => {
    const result = repaired('{ "a": { "b": [1, 2', { a: { b: [1, 2] } });
    expect(result.suggestions.at(-1)).toMatchObject({ fix: 'unclosed-brackets', count: 3 });
  });

  it('fixes several problems at once', () => {
    const messy = `{
      // config
      name: 'checkout',
      replicas: 3,
      debug: True,
    }`;
    const result = repaired(messy, { name: 'checkout', replicas: 3, debug: true });
    expect(result.suggestions.map((s) => s.fix).sort()).toEqual(
      ['comments', 'python-literals', 'single-quotes', 'trailing-commas', 'unquoted-keys'].sort(),
    );
  });
});

describe('JSON repair — never corrupts string contents', () => {
  it('leaves a URL containing // alone', () => {
    const source = '{ "url": "https://example.com/a//b" }';
    const result = repairJson(source);
    expect(result.suggestions).toEqual([]);
    expect(result.output).toBe(source);
  });

  it('does not strip a /* sequence inside a string', () => {
    // "src/**/*.ts" contains /* — a naive comment stripper would eat the rest
    // of the document from there.
    repaired('{ "glob": "src/**/*.ts", }', { glob: 'src/**/*.ts' });
  });

  it('leaves a comma inside a string alone', () => {
    const result = repairJson('{ "note": "a, b,", }');
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.output)).toEqual({ note: 'a, b,' });
  });

  it('leaves a brace inside a string alone', () => {
    const result = repairJson('{ "tpl": "{{ name }}" }');
    expect(result.suggestions).toEqual([]);
    expect(JSON.parse(result.output)).toEqual({ tpl: '{{ name }}' });
  });

  it('keeps curly quotes that are string content, not delimiters', () => {
    const source = '{ "quote": "He said “hi”" }';
    const result = repairJson(source);
    expect(result.suggestions).toEqual([]);
    expect(JSON.parse(result.output).quote).toBe('He said “hi”');
  });

  it('keeps a word that looks like a Python literal inside a string', () => {
    const result = repairJson('{ "a": "True" }');
    expect(result.suggestions).toEqual([]);
    expect(JSON.parse(result.output)).toEqual({ a: 'True' });
  });

  it('preserves unicode escapes in already-valid strings', () => {
    const source = '{ "a": "\\u00e9\\n", }';
    const result = repairJson(source);
    expect(result.output).toContain('\\u00e9\\n');
    expect(JSON.parse(result.output)).toEqual({ a: 'é\n' });
  });

  it('escapes a double quote when converting a single-quoted string', () => {
    repaired(`{ 'say': 'He said "hi"' }`, { say: 'He said "hi"' });
  });

  it('handles an escaped single quote inside a single-quoted string', () => {
    repaired(`{ 'a': 'it\\'s' }`, { a: "it's" });
  });

  it('does not treat a colon inside a string as a key separator', () => {
    const result = repairJson('{ "a": "b: c" }');
    expect(result.suggestions).toEqual([]);
  });
});

describe('JSON repair — knows when to stay out of the way', () => {
  it('changes nothing when the document is already valid', () => {
    const source = '{\n  "a": 1\n}\n';
    const result = repairJson(source);
    expect(result.suggestions).toEqual([]);
    expect(result.output).toBe(source);
    expect(result.ok).toBe(true);
  });

  it('returns the input untouched when a string is unterminated', () => {
    const source = '{ "a": "unterminated }';
    const result = repairJson(source);
    expect(result.output).toBe(source);
    expect(result.ok).toBe(false);
  });

  it('reports the remaining error when the fixes are not enough', () => {
    const result = repairJson('{ "a": @@@ }');
    expect(result.ok).toBe(false);
    expect(result.remainingError?.message).toBeTruthy();
  });

  it('honours a restricted fix set', () => {
    const source = "{ 'a': 1, }";
    const only = repairJson(source, ['trailing-commas']);
    expect(only.suggestions.map((s) => s.fix)).toEqual(['trailing-commas']);
    // Single quotes were not in the set, so the result is still invalid.
    expect(only.ok).toBe(false);
  });
});

describe('suggestJsonRepairs', () => {
  it('returns null for a valid document', () => {
    expect(suggestJsonRepairs('{ "a": 1 }')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(suggestJsonRepairs('   ')).toBeNull();
  });

  it('returns null when nothing we know how to fix applies', () => {
    expect(suggestJsonRepairs('{ "a": @@@ }')).toBeNull();
  });

  it('returns suggestions for a fixable document', () => {
    const result = suggestJsonRepairs('{ "a": 1, }');
    expect(result?.ok).toBe(true);
    expect(result?.suggestions[0]?.fix).toBe('trailing-commas');
  });

  it('every suggestion carries a title and an explanation', () => {
    const result = suggestJsonRepairs("{ name: 'Ada', }")!;
    for (const suggestion of result.suggestions) {
      expect(suggestion.title.length).toBeGreaterThan(0);
      expect(suggestion.detail.length).toBeGreaterThan(0);
      expect(suggestion.count).toBeGreaterThan(0);
    }
  });
});

describe('repaired output is always parseable by the strict parser', () => {
  const cases = [
    '{ "a": 1, }',
    "{ 'a': 1 }",
    '{ a: 1 }',
    '{ "a": True }',
    '// lead\n{ "a": 1 }',
    '{ "a": [1, 2, ], }',
    '{ "a": { "b": 1 }',
  ];
  for (const source of cases) {
    it(`repairs ${JSON.stringify(source)}`, () => {
      const result = repairJson(source);
      expect(result.ok).toBe(true);
      expect(parseJson(result.output).ok).toBe(true);
    });
  }
});

describe('fix ordering', () => {
  it('lists fixes in a stable, explainable order', () => {
    expect(fixes("﻿{ // c\n a: 'x', }")).toEqual([
      'bom',
      'comments',
      'trailing-commas',
      'single-quotes',
      'unquoted-keys',
    ]);
  });
});
