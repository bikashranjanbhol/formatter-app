import type { EngineError, EngineResult, FormatOptions } from './types';
import { formatJson, minifyJson, validateJson } from './json/format';
import { anonymizeJson, type AnonymizeOptions } from './json/anonymize';
import { formatYaml, validateYaml, yamlToJson, jsonToYaml, anonymizeYaml } from './yaml';
import { validateWithSchema } from './schema/validate';
import { parseJson } from './json/parse';
import { yamlToValue } from './yaml';
import { buildTree, countNodes } from './tree';
import type { TreeNode } from './types';
import { diffValues, type DiffOptions, type DiffResult } from './diff';
import { repairJson, type RepairResult } from './json/repair';

/**
 * The set of operations the engine can perform. Kept as a discriminated union
 * so the same dispatcher runs on the main thread and inside the Web Worker.
 *
 * Most operations take a single `source`. Operations that compare two
 * documents take a named input per side instead — `runner.estimateSize` knows
 * about both shapes when deciding whether to offload to the worker.
 */
export type EngineOperation =
  | { kind: 'format-json'; source: string; options: FormatOptions }
  | { kind: 'minify-json'; source: string; options: FormatOptions }
  | { kind: 'validate-json'; source: string }
  | { kind: 'format-yaml'; source: string; options: FormatOptions }
  | { kind: 'validate-yaml'; source: string; options: FormatOptions }
  | { kind: 'yaml-to-json'; source: string; options: FormatOptions }
  | { kind: 'json-to-yaml'; source: string; options: FormatOptions }
  | { kind: 'schema-validate'; schema: string; instance: string; instanceKind: 'json' | 'yaml' }
  | { kind: 'build-tree'; source: string; sourceKind: 'json' | 'yaml' }
  | { kind: 'anonymize-json'; source: string; options: AnonymizeOptions }
  | { kind: 'anonymize-yaml'; source: string; options: AnonymizeOptions }
  | { kind: 'diff-json'; left: string; right: string; options: DiffOptions }
  | { kind: 'diff-yaml'; left: string; right: string; options: DiffOptions }
  | { kind: 'repair-json'; source: string };

export interface TreeResult {
  ok: boolean;
  tree?: TreeNode;
  nodeCount?: number;
  errors: { message: string; line?: number; column?: number; severity: 'error' | 'warning' }[];
  warnings: { message: string; severity: 'error' | 'warning' }[];
  multiDocument?: boolean;
}

export interface SchemaResult extends EngineResult {
  schemaInvalid?: boolean;
  grouped?: Record<
    string,
    { message: string; instancePath?: string; code?: string; severity: 'error' | 'warning' }[]
  >;
}

export type EngineResponse = EngineResult | TreeResult | SchemaResult | DiffResult | RepairResult;

/** Pure dispatcher. No DOM or React usage, safe to run in a worker. */
export function runOperation(op: EngineOperation): EngineResponse {
  switch (op.kind) {
    case 'format-json':
      return formatJson(op.source, op.options);
    case 'minify-json':
      return minifyJson(op.source, op.options);
    case 'validate-json':
      return validateJson(op.source);
    case 'format-yaml':
      return formatYaml(op.source, op.options);
    case 'validate-yaml':
      return validateYaml(op.source, op.options);
    case 'yaml-to-json':
      return yamlToJson(op.source, op.options);
    case 'json-to-yaml':
      return jsonToYaml(op.source, op.options);
    case 'schema-validate':
      return runSchemaValidate(op.schema, op.instance, op.instanceKind);
    case 'build-tree':
      return runBuildTree(op.source, op.sourceKind);
    case 'anonymize-json':
      return anonymizeJson(op.source, op.options);
    case 'anonymize-yaml':
      return anonymizeYaml(op.source, op.options);
    case 'diff-json':
      return runDiff(op.left, op.right, 'json', op.options);
    case 'diff-yaml':
      return runDiff(op.left, op.right, 'yaml', op.options);
    case 'repair-json':
      return repairJson(op.source);
    default: {
      const _exhaustive: never = op;
      return {
        ok: false,
        errors: [{ message: 'Unknown operation.', severity: 'error' }],
        warnings: [],
      } as EngineResult;
    }
  }
}

function runSchemaValidate(schema: string, instance: string, kind: 'json' | 'yaml'): SchemaResult {
  let value: unknown;
  if (kind === 'json') {
    const parsed = parseJson(instance);
    if (!parsed.ok) {
      return { ok: false, errors: parsed.errors, warnings: parsed.warnings };
    }
    try {
      value = JSON.parse(instance);
    } catch (err) {
      return {
        ok: false,
        errors: [
          { message: err instanceof Error ? err.message : 'Invalid JSON.', severity: 'error' },
        ],
        warnings: [],
      };
    }
  } else {
    try {
      value = yamlToValue(instance).value;
    } catch (err) {
      return {
        ok: false,
        errors: [
          { message: err instanceof Error ? err.message : 'Invalid YAML.', severity: 'error' },
        ],
        warnings: [],
      };
    }
  }

  const result = validateWithSchema(schema, value);
  return {
    ok: result.ok,
    schemaInvalid: result.schemaInvalid,
    errors: result.errors,
    warnings: [],
    grouped: result.grouped,
  };
}

/**
 * Parse one side of a comparison. Errors are labelled with the side they came
 * from, because "invalid JSON" is useless when two documents are on screen.
 */
function parseSide(
  source: string,
  kind: 'json' | 'yaml',
  side: 'Left' | 'Right',
): { ok: true; value: unknown; warnings: EngineError[] } | { ok: false; errors: EngineError[] } {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: `${side} document is empty.`, severity: 'error' }],
    };
  }

  if (kind === 'json') {
    const parsed = parseJson(source);
    if (!parsed.ok) {
      return {
        ok: false,
        errors: parsed.errors.map((e) => ({ ...e, message: `${side}: ${e.message}` })),
      };
    }
    return {
      ok: true,
      value: parsed.value,
      warnings: parsed.warnings.map((w) => ({ ...w, message: `${side}: ${w.message}` })),
    };
  }

  try {
    const { value } = yamlToValue(source);
    return { ok: true, value, warnings: [] };
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          message: `${side}: ${err instanceof Error ? err.message : 'Invalid YAML.'}`,
          severity: 'error',
        },
      ],
    };
  }
}

function runDiff(
  left: string,
  right: string,
  kind: 'json' | 'yaml',
  options: DiffOptions,
): DiffResult {
  const leftParsed = parseSide(left, kind, 'Left');
  const rightParsed = parseSide(right, kind, 'Right');

  if (!leftParsed.ok || !rightParsed.ok) {
    return {
      ok: false,
      errors: [
        ...(leftParsed.ok ? [] : leftParsed.errors),
        ...(rightParsed.ok ? [] : rightParsed.errors),
      ],
      warnings: [],
    };
  }

  const result = diffValues(leftParsed.value, rightParsed.value, options);
  return {
    ...result,
    warnings: [...leftParsed.warnings, ...rightParsed.warnings, ...result.warnings],
  };
}

function runBuildTree(source: string, kind: 'json' | 'yaml'): TreeResult {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to display — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }
  try {
    if (kind === 'json') {
      const parsed = parseJson(source);
      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors, warnings: parsed.warnings };
      }
      const value = JSON.parse(source);
      const tree = buildTree(value);
      return {
        ok: true,
        tree,
        nodeCount: countNodes(tree),
        errors: [],
        warnings: parsed.warnings,
      };
    }
    const { value, multiDocument } = yamlToValue(source);
    const tree = buildTree(value);
    return {
      ok: true,
      tree,
      nodeCount: countNodes(tree),
      errors: [],
      warnings: [],
      multiDocument,
    };
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          message: err instanceof Error ? err.message : 'Could not build the tree.',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }
}
