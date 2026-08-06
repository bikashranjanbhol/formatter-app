/**
 * Best-effort detection of what a pasted document actually is.
 *
 * People arrive from a search result and paste whatever they have, which is
 * often not what the page they landed on expects. Rather than showing a parse
 * error and letting them bounce, we work out what the input looks like and
 * point at the right tool.
 *
 * This is a heuristic and is treated as one: it only reports a format when the
 * evidence is reasonably strong, and the UI phrases the result as a suggestion.
 * Pure and DOM-free.
 */

import { parseJson } from './json/parse';

export type DetectedFormat = 'json' | 'json-lines' | 'yaml' | 'xml' | 'csv' | 'toml' | 'unknown';

export interface Detection {
  format: DetectedFormat;
  /** 0–1. Below ~0.6 the caller should stay quiet. */
  confidence: number;
  /** Human-readable name for the format, for use in UI copy. */
  label: string;
}

const LABELS: Record<DetectedFormat, string> = {
  json: 'JSON',
  'json-lines': 'JSON Lines (NDJSON)',
  yaml: 'YAML',
  xml: 'XML',
  csv: 'CSV',
  toml: 'TOML',
  unknown: 'an unrecognised format',
};

const detection = (format: DetectedFormat, confidence: number): Detection => ({
  format,
  confidence,
  label: LABELS[format],
});

/** Lines with content, ignoring blank ones. */
function contentLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function looksLikeXml(trimmed: string): boolean {
  if (trimmed.startsWith('<?xml')) return true;
  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) return false;
  // Require an actual tag name, so a YAML value like "<placeholder>" on its own
  // does not win.
  return /^<\/?[A-Za-z_][\w.-]*(\s|\/?>)/.test(trimmed);
}

function looksLikeToml(lines: string[]): boolean {
  if (lines.length === 0) return false;
  const meaningful = lines.filter((line) => !line.startsWith('#'));
  if (meaningful.length === 0) return false;
  const sections = meaningful.filter((line) => /^\[[^\]]+\]$/.test(line)).length;
  const assignments = meaningful.filter((line) => /^[A-Za-z_][\w.-]*\s*=\s*\S/.test(line)).length;
  // A TOML file is section headers and key = value lines, and crucially has no
  // YAML-style "key:" mappings.
  const yamlish = meaningful.filter((line) => /^[^:#]+:(\s|$)/.test(line)).length;
  if (yamlish > 0) return false;
  return sections > 0 || assignments >= Math.max(2, meaningful.length * 0.6);
}

function looksLikeCsv(lines: string[]): { ok: boolean; confidence: number } {
  if (lines.length < 2) return { ok: false, confidence: 0 };
  // Structural characters rule CSV out immediately.
  if (lines.some((line) => /^[[{]/.test(line))) return { ok: false, confidence: 0 };

  for (const delimiter of [',', '\t', ';']) {
    const counts = lines.slice(0, 20).map((line) => line.split(delimiter).length - 1);
    const first = counts[0]!;
    if (first < 1) continue;
    // Every row must have the same number of delimiters — that consistency is
    // what distinguishes CSV from prose that happens to contain commas.
    if (counts.every((count) => count === first)) {
      return { ok: true, confidence: lines.length >= 3 ? 0.8 : 0.65 };
    }
  }
  return { ok: false, confidence: 0 };
}

function looksLikeYaml(lines: string[]): number {
  if (lines.length === 0) return 0;
  const meaningful = lines.filter((line) => !line.startsWith('#'));
  if (meaningful.length === 0) return lines.length > 0 ? 0.6 : 0; // comments only
  if (lines.some((line) => line === '---' || line.startsWith('--- '))) return 0.9;

  const mappings = meaningful.filter((line) => /^[^:]+:(\s|$)/.test(line)).length;
  const sequences = meaningful.filter((line) => /^-\s+\S/.test(line)).length;
  const share = (mappings + sequences) / meaningful.length;
  if (share >= 0.8) return 0.85;
  if (share >= 0.5) return 0.7;
  return 0;
}

/**
 * Identify the format of a document. Returns `unknown` with zero confidence for
 * empty input, so callers can treat "nothing typed yet" as "say nothing".
 */
export function detectFormat(source: string): Detection {
  const trimmed = source.trim();
  if (trimmed.length === 0) return detection('unknown', 0);

  // Valid JSON is certain, not a guess.
  if (/^[[{]/.test(trimmed) && parseJson(trimmed).ok) return detection('json', 1);

  const lines = contentLines(trimmed);

  // JSON Lines: every line is its own JSON value.
  if (lines.length >= 2 && lines.every((line) => /^[[{"]/.test(line) && parseJson(line).ok)) {
    return detection('json-lines', 0.9);
  }

  if (looksLikeXml(trimmed)) return detection('xml', 0.9);

  // Invalid but clearly JSON-shaped: braces or brackets that balance out at the
  // ends. Worth reporting as JSON so the user gets the parse error, not a
  // format suggestion.
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return detection('json', 0.75);
  }

  if (looksLikeToml(lines)) return detection('toml', 0.75);

  const yamlScore = looksLikeYaml(lines);
  const csv = looksLikeCsv(lines);
  // A YAML mapping and a semicolon-delimited CSV can both match; prefer
  // whichever scored higher, and prefer YAML on a tie since it is what this app
  // actually handles.
  if (yamlScore > 0 && yamlScore >= csv.confidence) return detection('yaml', yamlScore);
  if (csv.ok) return detection('csv', csv.confidence);

  return detection('unknown', 0);
}

/** Formats this app has a tool for today. */
export const SUPPORTED_FORMATS: DetectedFormat[] = ['json', 'yaml'];

export function isSupported(format: DetectedFormat): boolean {
  return SUPPORTED_FORMATS.includes(format);
}
