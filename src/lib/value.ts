/**
 * Shared helpers for describing parsed JSON/YAML values: type classification
 * and short, human-readable previews. Used by the tree view and the structural
 * diff so both label values identically.
 */

export type ValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

const MAX_PREVIEW = 60;

export function valueType(value: unknown): ValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'null';
  }
}

/** Render a scalar for display. Strings are quoted and truncated. */
export function previewScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const text = value.length > MAX_PREVIEW ? `${value.slice(0, MAX_PREVIEW)}…` : value;
    return JSON.stringify(text);
  }
  return String(value);
}

/** Render a container as a size summary, e.g. "3 keys" or "1 item". */
export function previewContainer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length === 1 ? '1 item' : `${value.length} items`;
  }
  const count = Object.keys(value as Record<string, unknown>).length;
  return count === 1 ? '1 key' : `${count} keys`;
}

/** Preview any value, choosing the scalar or container rendering. */
export function previewValue(value: unknown): string {
  if (value !== null && typeof value === 'object') return previewContainer(value);
  return previewScalar(value);
}
