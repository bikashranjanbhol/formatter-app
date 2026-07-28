import type { EngineResult, FormatOptions } from '../types';
import { applyLineEndings, indentUnit } from '../text';
import { parseJson } from './parse';

/**
 * Recursively sort object keys. Arrays keep their order; only object member
 * order changes. Used when the (default-off) "sort keys" option is enabled.
 */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = sortDeep(v);
    return out;
  }
  return value;
}

/**
 * Format (pretty-print) JSON. Uses the diagnostic parser first so callers get
 * precise errors, then native JSON for the actual serialization. Does not
 * attempt any repair of invalid input.
 */
export function formatJson(source: string, options: FormatOptions): EngineResult {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to format — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }

  const parsed = parseJson(source);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, warnings: parsed.warnings };
  }

  // Native parse/stringify for the output. Diagnostics (duplicate keys,
  // precision) are surfaced as warnings by the diagnostic parser above.
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

  const prepared = options.sortKeys ? sortDeep(value) : value;
  const indent = indentUnit(options.indent);
  const pretty = JSON.stringify(prepared, null, indent);
  const output = applyLineEndings(pretty, options);

  const notes: string[] = [];
  if (parsed.precisionWarningPaths.length > 0) {
    notes.push('Some large numbers may have lost precision (see warnings).');
  }

  return { ok: true, output, errors: [], warnings: parsed.warnings, notes };
}

/** Minify JSON to a single line with no insignificant whitespace. */
export function minifyJson(source: string, options?: Partial<FormatOptions>): EngineResult {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to minify — the input is empty.', severity: 'error' }],
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
  const prepared = options?.sortKeys ? sortDeep(value) : value;
  // Minified output never carries a trailing newline.
  const output = JSON.stringify(prepared);
  return { ok: true, output, errors: [], warnings: parsed.warnings };
}

/**
 * Validate JSON without producing formatted output. Returns errors and any
 * advisory warnings (duplicate keys, precision loss).
 */
export function validateJson(source: string): EngineResult {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to validate — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }
  const parsed = parseJson(source);
  return {
    ok: parsed.ok,
    errors: parsed.errors,
    warnings: parsed.warnings,
  };
}
