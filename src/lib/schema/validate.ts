import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { EngineError } from '../types';

/**
 * JSON Schema validation using AJV with the Draft 2020-12 meta-schema. The
 * schema and the instance are both provided by the user and validated entirely
 * in the browser; nothing is transmitted.
 */

export interface SchemaValidationResult {
  ok: boolean;
  /** True when the schema itself failed to compile. */
  schemaInvalid: boolean;
  errors: EngineError[];
  /** Grouped errors keyed by instance path for display. */
  grouped: Record<string, EngineError[]>;
}

function buildAjv(): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    // Never fetch remote refs; all resolution is local and offline.
    loadSchema: undefined,
  });
  addFormats(ajv);
  return ajv;
}

function humanizeError(err: ErrorObject): string {
  const path = err.instancePath || '(root)';
  switch (err.keyword) {
    case 'required':
      return `${path} is missing required property "${(err.params as { missingProperty: string }).missingProperty}".`;
    case 'type':
      return `${path} must be ${(err.params as { type: string }).type}.`;
    case 'additionalProperties':
      return `${path} has an unexpected property "${(err.params as { additionalProperty: string }).additionalProperty}".`;
    case 'enum':
      return `${path} must be one of the allowed values.`;
    case 'const':
      return `${path} must equal the required constant value.`;
    case 'minimum':
    case 'maximum':
    case 'minLength':
    case 'maxLength':
    case 'minItems':
    case 'maxItems':
    case 'pattern':
    case 'format':
      return `${path} ${err.message ?? 'is invalid'}.`;
    default:
      return `${path} ${err.message ?? 'failed validation'}.`;
  }
}

export function validateWithSchema(
  schemaText: string,
  instanceValue: unknown,
): SchemaValidationResult {
  let schema: unknown;
  try {
    schema = JSON.parse(schemaText);
  } catch (err) {
    return {
      ok: false,
      schemaInvalid: true,
      errors: [
        {
          message: `The schema is not valid JSON: ${err instanceof Error ? err.message : 'parse error'}.`,
          severity: 'error',
          code: 'schema-syntax',
        },
      ],
      grouped: {},
    };
  }

  const ajv = buildAjv();
  let validate;
  try {
    validate = ajv.compile(schema as object);
  } catch (err) {
    return {
      ok: false,
      schemaInvalid: true,
      errors: [
        {
          message: `The schema could not be compiled: ${err instanceof Error ? err.message : 'invalid schema'}.`,
          severity: 'error',
          code: 'schema-invalid',
        },
      ],
      grouped: {},
    };
  }

  const valid = validate(instanceValue);
  if (valid) {
    return { ok: true, schemaInvalid: false, errors: [], grouped: {} };
  }

  const errors: EngineError[] = (validate.errors ?? []).map((e) => ({
    message: humanizeError(e),
    instancePath: e.instancePath || '',
    code: e.keyword,
    severity: 'error',
  }));

  const grouped: Record<string, EngineError[]> = {};
  for (const e of errors) {
    const key = e.instancePath || '(root)';
    (grouped[key] ??= []).push(e);
  }

  return { ok: false, schemaInvalid: false, errors, grouped };
}
