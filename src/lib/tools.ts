/**
 * Central registry of tool pages. Drives navigation, sitemap, breadcrumbs and
 * per-page metadata so content stays consistent and non-duplicated.
 */

export type ToolMode =
  | 'json-formatter'
  | 'json-validator'
  | 'json-viewer'
  | 'json-minifier'
  | 'json-to-yaml'
  | 'json-anonymizer'
  | 'json-diff'
  | 'yaml-formatter'
  | 'yaml-validator'
  | 'yaml-to-json'
  | 'yaml-anonymizer'
  | 'yaml-diff'
  | 'json-schema-validator';

export interface ToolMeta {
  slug: ToolMode;
  /** Short label for navigation. */
  nav: string;
  /** Full page H1. */
  title: string;
  /** <title> tag / SEO title. */
  seoTitle: string;
  /** Meta description. */
  description: string;
  /** One-paragraph on-page introduction (server rendered). */
  intro: string;
  /** Primary language edited: affects editor mode and file types. */
  language: 'json' | 'yaml';
  group: 'JSON' | 'YAML' | 'Schema';
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'json-formatter',
    nav: 'JSON Formatter',
    title: 'JSON Formatter & Beautifier',
    seoTitle: 'JSON Formatter & Beautifier — Private, In-Browser',
    description:
      'Format and beautify JSON with 2-space, 4-space, or tab indentation. Runs entirely in your browser — your data never leaves your device.',
    intro:
      'Paste or upload JSON and get clean, readable output instantly. Choose your indentation, line endings, and whether to sort keys. All formatting happens locally in your browser, so even sensitive documents stay private.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'json-validator',
    nav: 'JSON Validator',
    title: 'JSON Validator',
    seoTitle: 'JSON Validator — Precise Errors, In-Browser',
    description:
      'Validate JSON and get precise line and column error locations, plus duplicate-key and number-precision warnings. Nothing is uploaded.',
    intro:
      'Check whether your JSON is valid and pinpoint exactly where problems are. The validator reports the line and column of syntax errors and warns about duplicate keys and integers that exceed safe numeric precision.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'json-viewer',
    nav: 'JSON Viewer',
    title: 'JSON Tree Viewer',
    seoTitle: 'JSON Tree Viewer — Explore & Copy Paths',
    description:
      'Explore JSON as a collapsible tree. Search keys and values, expand or collapse all, and copy any value or its JSON Pointer path. In-browser only.',
    intro:
      'Turn JSON into an interactive, collapsible tree. Search across keys and values, expand or collapse the whole document, and copy any node or its JSON Pointer path with one click.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'json-minifier',
    nav: 'JSON Minifier',
    title: 'JSON Minifier',
    seoTitle: 'JSON Minifier — Compress JSON In-Browser',
    description:
      'Minify JSON to the smallest valid form by removing insignificant whitespace. Fast, private, and entirely client-side.',
    intro:
      'Compress JSON by stripping all insignificant whitespace, producing the smallest valid representation for storage or transport. The document is parsed and validated first so you never ship broken JSON.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'json-to-yaml',
    nav: 'JSON to YAML',
    title: 'JSON to YAML Converter',
    seoTitle: 'JSON to YAML Converter — Private & Order-Preserving',
    description:
      'Convert JSON to YAML 1.2 while preserving key order. Runs locally in your browser with no uploads.',
    intro:
      'Convert JSON into clean YAML 1.2. Key order from your JSON is preserved, and the conversion runs entirely in your browser so your data stays on your machine.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'json-anonymizer',
    nav: 'JSON Anonymizer',
    title: 'JSON Anonymizer & Data Masker',
    seoTitle: 'JSON Anonymizer — Mask & Redact Data In-Browser',
    description:
      'Replace sensitive JSON values with realistic dummy data or redact them — all values or only specific keys. Runs entirely in your browser; nothing is uploaded.',
    intro:
      'Sanitize JSON before sharing it in a ticket, Slack message, or bug report. Swap real values for realistic fake data, mask them with ***, or replace only the keys you choose (like email, ssn, or token). Everything happens locally in your browser, so the original data never leaves your device.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'json-diff',
    nav: 'JSON Diff',
    title: 'JSON Diff & Compare',
    seoTitle: 'JSON Diff — Structural Compare, In-Browser',
    description:
      'Compare two JSON documents structurally and see exactly which keys were added, removed, or changed. Export the difference as a JSON Patch. Nothing is uploaded.',
    intro:
      'Compare two JSON documents and see precisely what changed. This is a structural diff, not a text diff: reformatting, whitespace, and key order never show up as differences, so you only see real changes. Match array items by position or by an identity key like id, then export the result as an RFC 6902 JSON Patch. Both documents stay in your browser.',
    language: 'json',
    group: 'JSON',
  },
  {
    slug: 'yaml-formatter',
    nav: 'YAML Formatter',
    title: 'YAML Formatter',
    seoTitle: 'YAML Formatter — Comment & Anchor Preserving',
    description:
      'Format YAML 1.2 while preserving comments, anchors, aliases, tags, and key order. Private, in-browser processing.',
    intro:
      'Tidy up YAML without losing what matters. Comments, anchors, aliases, tags, block scalars, and key order are preserved. Keys are never sorted unless you explicitly ask, and aliases are never silently expanded.',
    language: 'yaml',
    group: 'YAML',
  },
  {
    slug: 'yaml-validator',
    nav: 'YAML Validator',
    title: 'YAML Validator',
    seoTitle: 'YAML Validator — YAML 1.2, In-Browser',
    description:
      'Validate YAML 1.2 and get exact error locations. Handles multiple documents, anchors, and block scalars. Nothing is uploaded.',
    intro:
      'Validate YAML against the 1.2 specification and see exactly where issues occur. The validator understands multiple documents, anchors and aliases, tags, and block scalars, and guards against malicious alias-expansion inputs.',
    language: 'yaml',
    group: 'YAML',
  },
  {
    slug: 'yaml-to-json',
    nav: 'YAML to JSON',
    title: 'YAML to JSON Converter',
    seoTitle: 'YAML to JSON Converter — With Safety Warnings',
    description:
      'Convert YAML 1.2 to JSON with clear warnings when features like comments, aliases, or multiple documents cannot be represented faithfully.',
    intro:
      'Convert YAML into JSON, with honest warnings. Because JSON cannot represent comments, shared aliases, custom tags, or multiple documents, the converter tells you exactly what changes before you rely on the output.',
    language: 'yaml',
    group: 'YAML',
  },
  {
    slug: 'yaml-anonymizer',
    nav: 'YAML Anonymizer',
    title: 'YAML Anonymizer & Data Masker',
    seoTitle: 'YAML Anonymizer — Mask & Redact Data In-Browser',
    description:
      'Replace sensitive YAML values with realistic dummy data or redact them — all values or only specific keys. Runs entirely in your browser; nothing is uploaded.',
    intro:
      'Sanitize YAML config or data before sharing it. Swap real values for realistic fake data, mask them with ***, or replace only the keys you choose. Everything happens locally in your browser, so the original data never leaves your device. Note: anonymizing re-serializes YAML, so comments and anchors are not preserved.',
    language: 'yaml',
    group: 'YAML',
  },
  {
    slug: 'yaml-diff',
    nav: 'YAML Diff',
    title: 'YAML Diff & Compare',
    seoTitle: 'YAML Diff — Structural Compare, In-Browser',
    description:
      'Compare two YAML files structurally and see which keys were added, removed, or changed. Ideal for config drift and Kubernetes manifests. Runs entirely in your browser.',
    intro:
      'Compare two YAML documents by structure rather than by line. Indentation changes, quoting style, and key order are not differences, so you see only what actually changed — which is what you want when checking config drift between two environments. Match list items by position or by an identity key, and export the result as a JSON Patch.',
    language: 'yaml',
    group: 'YAML',
  },
  {
    slug: 'json-schema-validator',
    nav: 'JSON Schema Validator',
    title: 'JSON Schema Validator (Draft 2020-12)',
    seoTitle: 'JSON Schema Validator — Draft 2020-12, In-Browser',
    description:
      'Validate JSON or YAML against a JSON Schema (Draft 2020-12) using AJV. Grouped, path-aware errors. Runs entirely in your browser.',
    intro:
      'Validate a JSON or YAML document against your own JSON Schema using Draft 2020-12. Errors are grouped by instance path so you can see precisely which parts of the document fail, all without sending anything to a server.',
    language: 'json',
    group: 'Schema',
  },
];

export function getTool(slug: ToolMode): ToolMeta {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

export const STATIC_PAGES = [
  { slug: 'pricing', nav: 'Pricing' },
  { slug: 'about', nav: 'About' },
  { slug: 'privacy', nav: 'Privacy' },
  { slug: 'terms', nav: 'Terms' },
] as const;
