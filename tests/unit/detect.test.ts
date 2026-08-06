import { describe, it, expect } from 'vitest';
import { detectFormat, isSupported } from '@/lib/detect';
import { SAMPLE_JSON, SAMPLE_YAML, SAMPLE_DIFF_LEFT_YAML } from '@/lib/samples';

const format = (source: string) => detectFormat(source).format;

describe('format detection — the formats we handle', () => {
  it('recognises valid JSON with certainty', () => {
    const result = detectFormat('{"a":1,"b":[1,2]}');
    expect(result.format).toBe('json');
    expect(result.confidence).toBe(1);
  });

  it('recognises the JSON sample document', () => {
    expect(format(SAMPLE_JSON)).toBe('json');
  });

  it('recognises a JSON array', () => {
    expect(format('[1, 2, 3]')).toBe('json');
  });

  it('still reports invalid but JSON-shaped input as JSON', () => {
    // The user should get a parse error here, not "this looks like YAML".
    const result = detectFormat('{ "a": 1, }');
    expect(result.format).toBe('json');
    expect(result.confidence).toBeLessThan(1);
  });

  it('recognises YAML mappings', () => {
    expect(format('name: checkout\nreplicas: 3\n')).toBe('yaml');
  });

  it('recognises YAML with a document marker', () => {
    expect(format('---\na: 1\n')).toBe('yaml');
  });

  it('recognises YAML sequences', () => {
    expect(format('- one\n- two\n- three\n')).toBe('yaml');
  });

  it('recognises the YAML sample documents', () => {
    expect(format(SAMPLE_YAML)).toBe('yaml');
    expect(format(SAMPLE_DIFF_LEFT_YAML)).toBe('yaml');
  });

  it('recognises JSON Lines', () => {
    expect(format('{"a":1}\n{"a":2}\n{"a":3}')).toBe('json-lines');
  });

  it('does not call a single JSON object JSON Lines', () => {
    expect(format('{"a":1}')).toBe('json');
  });
});

describe('format detection — formats we do not handle yet', () => {
  it('recognises XML', () => {
    expect(format('<?xml version="1.0"?><root><a>1</a></root>')).toBe('xml');
    expect(format('<root>\n  <a>1</a>\n</root>')).toBe('xml');
  });

  it('recognises CSV', () => {
    expect(format('name,age,city\nAda,36,London\nGrace,45,NYC')).toBe('csv');
  });

  it('recognises tab-separated values', () => {
    expect(format('name\tage\nAda\t36\nGrace\t45')).toBe('csv');
  });

  it('recognises TOML', () => {
    expect(format('[server]\nhost = "localhost"\nport = 5432')).toBe('toml');
  });

  it('reports which formats have a tool', () => {
    expect(isSupported('json')).toBe(true);
    expect(isSupported('yaml')).toBe(true);
    expect(isSupported('csv')).toBe(false);
    expect(isSupported('toml')).toBe(false);
  });
});

describe('format detection — staying quiet when unsure', () => {
  it('reports nothing for empty input', () => {
    expect(detectFormat('')).toMatchObject({ format: 'unknown', confidence: 0 });
    expect(detectFormat('   \n  ')).toMatchObject({ format: 'unknown', confidence: 0 });
  });

  it('does not mistake prose containing commas for CSV', () => {
    const prose = 'Hello there, this is a sentence.\nAnd here is another one entirely.';
    expect(format(prose)).toBe('unknown');
  });

  it('does not mistake prose for YAML', () => {
    expect(format('just some words\nand some more words')).toBe('unknown');
  });

  it('requires consistent delimiter counts for CSV', () => {
    expect(format('a,b,c\nd,e\nf,g,h,i')).toBe('unknown');
  });

  it('does not call a single line CSV', () => {
    expect(format('a,b,c')).toBe('unknown');
  });

  it('prefers YAML over TOML when the input has YAML mappings', () => {
    expect(format('server:\n  host = localhost\n  port: 5432')).toBe('yaml');
  });

  it('does not mistake a YAML value in angle brackets for XML', () => {
    expect(format('placeholder: <value>\nother: 1')).toBe('yaml');
  });

  it('treats a comment-only YAML file as YAML', () => {
    expect(format('# just a comment\n# and another')).toBe('yaml');
  });
});
