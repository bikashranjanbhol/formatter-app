/**
 * Shared types for the formatting engine. These are intentionally free of any
 * React or DOM dependencies so the engine can run in the main thread, a Web
 * Worker, or a future Node-based API/CLI.
 */

export type IndentStyle = 'two-space' | 'four-space' | 'tab';

export type LineEnding = 'lf' | 'crlf';

export type DocumentKind = 'json' | 'yaml';

export interface FormatOptions {
  indent: IndentStyle;
  lineEnding: LineEnding;
  finalNewline: boolean;
  sortKeys: boolean;
  /** YAML version target. Defaults to 1.2. */
  yamlVersion?: '1.1' | '1.2';
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: 'two-space',
  lineEnding: 'lf',
  finalNewline: true,
  sortKeys: false,
  yamlVersion: '1.2',
};

/** A single, precise problem discovered while parsing or validating. */
export interface EngineError {
  message: string;
  /** 1-based line number where the problem occurs, if known. */
  line?: number;
  /** 1-based column number where the problem occurs, if known. */
  column?: number;
  /** Absolute character offset into the source, if known. */
  offset?: number;
  /** Machine-readable code for grouping (e.g. "required", "type"). */
  code?: string;
  /** JSON Pointer / instance path for schema errors. */
  instancePath?: string;
  severity: 'error' | 'warning';
}

/** Result of a formatting or conversion operation. */
export interface EngineResult {
  ok: boolean;
  /** The produced output, present when ok is true. */
  output?: string;
  errors: EngineError[];
  warnings: EngineError[];
  /** Non-fatal advisory notes (e.g. precision warnings). */
  notes?: string[];
}

/** A node in the collapsible tree view. */
export interface TreeNode {
  /** Display key or array index label. Empty string for the root. */
  key: string;
  /** JSON Pointer path from the document root. */
  path: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  /** A short, human-friendly rendering of scalar values. */
  preview: string;
  /** The raw scalar value for copying, when the node is a leaf. */
  rawValue?: string | number | boolean | null;
  children?: TreeNode[];
}

export interface DocumentStats {
  lines: number;
  characters: number;
  bytes: number;
}
