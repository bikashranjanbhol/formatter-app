import { describe, it, expect } from 'vitest';
import { validateWithSchema } from '@/lib/schema/validate';

const schema = JSON.stringify({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'integer', minimum: 0 },
    address: {
      type: 'object',
      required: ['city'],
      properties: { city: { type: 'string' } },
    },
  },
});

describe('JSON Schema validation (Draft 2020-12)', () => {
  it('accepts a valid instance', () => {
    const result = validateWithSchema(schema, { name: 'Ada', age: 30 });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an invalid instance with a helpful message', () => {
    const result = validateWithSchema(schema, { name: '', age: -1 });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports nested error instance paths', () => {
    const result = validateWithSchema(schema, { name: 'Ada', age: 30, address: { city: 123 } });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.grouped).some((p) => p.includes('/address/city'))).toBe(true);
  });

  it('flags a missing required property', () => {
    const result = validateWithSchema(schema, { name: 'Ada' });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'required')).toBe(true);
  });

  it('reports an invalid schema without crashing', () => {
    const result = validateWithSchema('{ not valid json', { a: 1 });
    expect(result.schemaInvalid).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('supports Draft 2020-12 prefixItems tuples', () => {
    const tupleSchema = JSON.stringify({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'array',
      prefixItems: [{ type: 'string' }, { type: 'number' }],
      items: false,
    });
    expect(validateWithSchema(tupleSchema, ['a', 1]).ok).toBe(true);
    expect(validateWithSchema(tupleSchema, ['a', 1, 'extra']).ok).toBe(false);
  });
});
