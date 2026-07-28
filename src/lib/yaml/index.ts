import {
  parseDocument,
  parseAllDocuments,
  Document,
  isMap,
  isSeq,
  isScalar,
  isAlias,
  type ParseOptions,
  type DocumentOptions,
  type SchemaOptions,
  type ToStringOptions,
} from 'yaml';
import type { EngineError, EngineResult, FormatOptions } from '../types';
import { applyLineEndings, indentWidth } from '../text';

/**
 * YAML engine built on the `yaml` package. It preserves comments, anchors,
 * aliases, tags and key order on formatting, and refuses to silently perform
 * lossy transformations. Conversions to JSON surface explicit warnings when
 * YAML features cannot be represented faithfully.
 */

// Guard against malicious inputs such as the "billion laughs" alias-expansion
// bomb. maxAliasCount caps total alias resolutions and is applied at toJS time,
// which is when aliases are actually expanded.
const MAX_ALIAS_COUNT = 100;

const PARSE_OPTIONS: ParseOptions & DocumentOptions & SchemaOptions = {
  version: '1.2',
  keepSourceTokens: false,
};

function optionsWithVersion(
  options: FormatOptions,
): ParseOptions & DocumentOptions & SchemaOptions {
  return { ...PARSE_OPTIONS, version: options.yamlVersion ?? '1.2' };
}

/** Translate a `yaml` error (which carries a linePos) into an EngineError. */
function toEngineError(
  err: {
    message: string;
    pos?: [number, number];
    linePos?: [{ line: number; col: number }, ...unknown[]];
  },
  severity: 'error' | 'warning',
): EngineError {
  const linePos = err.linePos?.[0];
  return {
    message: err.message,
    line: linePos?.line,
    column: linePos?.col,
    offset: err.pos?.[0],
    severity,
    code: severity,
  };
}

function collectDiagnostics(doc: Document.Parsed): {
  errors: EngineError[];
  warnings: EngineError[];
} {
  const errors = doc.errors.map((e) => toEngineError(e, 'error'));
  const warnings = doc.warnings.map((w) => toEngineError(w, 'warning'));
  return { errors, warnings };
}

/**
 * Format a YAML document, preserving comments, anchors, aliases, tags and key
 * order. Sorting keys is only applied when explicitly requested by the user.
 */
export function formatYaml(source: string, options: FormatOptions): EngineResult {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to format — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }

  const docs = parseAllDocuments(source, optionsWithVersion(options));
  const allErrors: EngineError[] = [];
  const allWarnings: EngineError[] = [];
  for (const doc of docs) {
    const { errors, warnings } = collectDiagnostics(doc);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }
  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors, warnings: allWarnings };
  }

  const toStringOptions: ToStringOptions = {
    indent: Math.max(2, indentWidth(options.indent)),
    lineWidth: 0, // never fold long lines; preserve author intent
    singleQuote: false,
    // Preserve original scalar style / block scalars where possible.
    doubleQuotedAsJSON: false,
  };

  const notes: string[] = [];
  const rendered = docs
    .map((doc) => {
      if (options.sortKeys && isMap(doc.contents)) {
        // Only sort when explicitly opted in. Warn because it changes order.
        doc.contents.items.sort((a, b) => {
          const ka = String((a.key as { value?: unknown })?.value ?? '');
          const kb = String((b.key as { value?: unknown })?.value ?? '');
          return ka < kb ? -1 : ka > kb ? 1 : 0;
        });
      }
      return doc.toString(toStringOptions).replace(/\n$/, '');
    })
    .join('\n---\n');

  if (options.sortKeys) {
    notes.push('Keys were sorted at your request. This changes the original document order.');
  }
  if (docs.length > 1) {
    notes.push(
      `Formatted ${docs.length} YAML documents; the document separator "---" was preserved.`,
    );
  }

  const output = applyLineEndings(rendered, options);
  return { ok: true, output, errors: [], warnings: allWarnings, notes };
}

/** Validate YAML 1.2, returning precise error/warning locations. */
export function validateYaml(source: string, options?: Partial<FormatOptions>): EngineResult {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to validate — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }
  const docs = parseAllDocuments(source, {
    ...PARSE_OPTIONS,
    version: options?.yamlVersion ?? '1.2',
  });
  const errors: EngineError[] = [];
  const warnings: EngineError[] = [];
  for (const doc of docs) {
    const d = collectDiagnostics(doc);
    errors.push(...d.errors);
    warnings.push(...d.warnings);
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** Detect YAML features that cannot be faithfully represented in JSON. */
function detectLossyFeatures(source: string, docCount: number): EngineError[] {
  const warnings: EngineError[] = [];
  if (docCount > 1) {
    warnings.push({
      message: `This input contains ${docCount} YAML documents. JSON has no multi-document concept; the result will be a JSON array of documents.`,
      severity: 'warning',
      code: 'multi-document',
    });
  }
  const doc = parseDocument(source, PARSE_OPTIONS);
  let hasAlias = false;
  let hasCustomTag = false;
  const hasComment = /(^|\s)#/.test(source);
  // Walk the AST looking for aliases and non-standard tags.
  const visit = (node: unknown): void => {
    if (isAlias(node)) {
      hasAlias = true;
      return;
    }
    if (isScalar(node) && node.tag && !node.tag.startsWith('tag:yaml.org')) {
      hasCustomTag = true;
    }
    if (isMap(node)) {
      for (const item of node.items) {
        visit(item.key);
        visit(item.value);
      }
    } else if (isSeq(node)) {
      for (const item of node.items) visit(item);
    }
  };
  visit(doc.contents);

  if (hasAlias) {
    warnings.push({
      message:
        'Aliases (`*ref`) will be expanded into full values in JSON. The shared-reference relationship is lost.',
      severity: 'warning',
      code: 'alias-expansion',
    });
  }
  if (hasCustomTag) {
    warnings.push({
      message: 'Custom tags cannot be represented in JSON and will be dropped or coerced.',
      severity: 'warning',
      code: 'custom-tag',
    });
  }
  if (hasComment) {
    warnings.push({
      message: 'Comments are not part of the data model and will not appear in the JSON output.',
      severity: 'warning',
      code: 'comment-loss',
    });
  }
  return warnings;
}

/**
 * Convert YAML to JSON. Emits warnings (never silent) whenever a YAML feature
 * cannot survive the trip: multiple documents, aliases, custom tags, comments.
 */
export function yamlToJson(source: string, options: FormatOptions): EngineResult {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to convert — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }
  const docs = parseAllDocuments(source, optionsWithVersion(options));
  const errors: EngineError[] = [];
  const warnings: EngineError[] = [];
  for (const doc of docs) {
    const d = collectDiagnostics(doc);
    errors.push(...d.errors);
    warnings.push(...d.warnings);
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  warnings.push(...detectLossyFeatures(source, docs.length));

  let jsValue: unknown;
  try {
    if (docs.length === 1) {
      jsValue = docs[0]!.toJS({ maxAliasCount: MAX_ALIAS_COUNT });
    } else {
      jsValue = docs.map((d) => d.toJS({ maxAliasCount: MAX_ALIAS_COUNT }));
    }
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          message:
            err instanceof Error
              ? `Could not convert to JSON: ${err.message}`
              : 'Could not convert this YAML to JSON.',
          severity: 'error',
          code: 'conversion',
        },
      ],
      warnings,
    };
  }

  const indent = indentWidth(options.indent) === 4 ? 4 : options.indent === 'tab' ? '\t' : 2;
  const pretty = JSON.stringify(jsValue, null, indent);
  const output = applyLineEndings(pretty, options);
  return { ok: true, output, errors: [], warnings };
}

/** Convert JSON to YAML 1.2, preserving key order from the JSON source. */
export function jsonToYaml(source: string, options: FormatOptions): EngineResult {
  if (source.trim().length === 0) {
    return {
      ok: false,
      errors: [{ message: 'Nothing to convert — the input is empty.', severity: 'error' }],
      warnings: [],
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (err) {
    // Surface a precise location via our diagnostic parser.
    return {
      ok: false,
      errors: [
        {
          message: err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON.',
          severity: 'error',
          code: 'syntax',
        },
      ],
      warnings: [],
    };
  }

  const doc = new Document(value, optionsWithVersion(options));
  if (options.sortKeys && isMap(doc.contents)) {
    doc.contents.items.sort((a, b) => {
      const ka = String((a.key as { value?: unknown })?.value ?? '');
      const kb = String((b.key as { value?: unknown })?.value ?? '');
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }
  const rendered = doc
    .toString({ indent: Math.max(2, indentWidth(options.indent)), lineWidth: 0 })
    .replace(/\n$/, '');
  const output = applyLineEndings(rendered, options);
  return { ok: true, output, errors: [], warnings: [] };
}

/** Parse YAML to a plain JS value for the tree view, or throw on error. */
export function yamlToValue(source: string): { value: unknown; multiDocument: boolean } {
  const docs = parseAllDocuments(source, PARSE_OPTIONS);
  const firstError = docs.find((d) => d.errors.length > 0)?.errors[0];
  if (firstError) {
    throw new Error(firstError.message);
  }
  if (docs.length === 1) {
    return { value: docs[0]!.toJS({ maxAliasCount: MAX_ALIAS_COUNT }), multiDocument: false };
  }
  return {
    value: docs.map((d) => d.toJS({ maxAliasCount: MAX_ALIAS_COUNT })),
    multiDocument: true,
  };
}
