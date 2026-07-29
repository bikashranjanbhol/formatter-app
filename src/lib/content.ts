import type { ToolMode } from './tools';

export interface ToolContent {
  instructions: string[];
  example: { title: string; input: string; output: string; note?: string };
  faq: { q: string; a: string }[];
}

export const TOOL_CONTENT: Record<ToolMode, ToolContent> = {
  'json-formatter': {
    instructions: [
      'Paste your JSON into the input editor, or use Upload / drag-and-drop to load a .json file.',
      'Pick an indentation style (2 spaces, 4 spaces, or tabs) and set line-ending and final-newline preferences.',
      'Press Format (or Ctrl/Cmd + Enter). The beautified result appears on the right.',
      'Copy or download the output. Invalid JSON is reported with an exact line and column — nothing is auto-repaired.',
    ],
    example: {
      title: 'Beautifying minified JSON',
      input: '{"name":"Ada","langs":["json","yaml"],"active":true}',
      output: '{\n  "name": "Ada",\n  "langs": ["json", "yaml"],\n  "active": true\n}',
      note: 'Key order is preserved. Enable “Sort keys” only if you explicitly want alphabetical order.',
    },
    faq: [
      {
        q: 'Is my JSON uploaded to a server?',
        a: 'No. Formatting runs entirely in your browser using JavaScript and a Web Worker for large files. Your document never leaves your device.',
      },
      {
        q: 'Will the formatter change my numbers?',
        a: 'The output uses native JSON serialization. Integers beyond JavaScript’s safe range (2^53) can lose precision, so the tool warns you when that is possible instead of failing silently.',
      },
      {
        q: 'Can it fix invalid JSON automatically?',
        a: 'No. The formatter never silently repairs input. It reports the exact location of the first error so you can fix it deliberately.',
      },
      {
        q: 'What indentation options are supported?',
        a: 'Two spaces, four spaces, and tabs. You can also choose LF or CRLF line endings and whether to add a final newline.',
      },
    ],
  },
  'json-validator': {
    instructions: [
      'Paste or upload the JSON you want to check.',
      'Validation runs automatically as you type (debounced) and on demand with the Validate button.',
      'Errors show the precise line and column. Click a location to jump to it in the editor.',
      'Warnings flag duplicate keys and numbers that exceed safe integer precision.',
    ],
    example: {
      title: 'Catching a trailing comma',
      input: '{\n  "a": 1,\n  "b": 2,\n}',
      output: 'Error at line 4, column 1: Expected a string key.',
      note: 'JSON does not allow trailing commas; the validator points to exactly where the parser fails.',
    },
    faq: [
      {
        q: 'What kinds of problems does the validator detect?',
        a: 'Syntax errors (with line and column), duplicate object keys, unterminated strings, invalid escapes, trailing content, and numbers that may lose precision.',
      },
      {
        q: 'Does it detect duplicate keys?',
        a: 'Yes. Native JSON.parse silently keeps only the last duplicate; this validator reports each duplicate key as a warning with its location.',
      },
      {
        q: 'Is the validation standards-compliant?',
        a: 'Yes. It follows RFC 8259, the JSON interchange standard.',
      },
    ],
  },
  'json-viewer': {
    instructions: [
      'Load JSON by pasting, uploading, or dragging a file in.',
      'The document is rendered as a collapsible tree on the right.',
      'Use the search box to filter keys and values, and Expand/Collapse all to navigate.',
      'Hover any node to copy its value or its JSON Pointer path.',
    ],
    example: {
      title: 'Copying a JSON Pointer path',
      input: '{"user":{"roles":["admin","editor"]}}',
      output: 'The path to "admin" is /user/roles/0',
      note: 'JSON Pointer (RFC 6901) paths are stable references you can use in code and tooling.',
    },
    faq: [
      {
        q: 'How big a document can the viewer handle?',
        a: 'Large documents render with collapsed branches to stay responsive, and very large files are parsed in a background worker. Aim for documents up to about 10 MB.',
      },
      {
        q: 'What is a JSON Pointer path?',
        a: 'A standard (RFC 6901) way to reference a specific value inside a JSON document, such as /items/0/name. The viewer can copy these for you.',
      },
      {
        q: 'Can I view YAML as a tree?',
        a: 'Yes — the YAML tools offer the same tree view for any YAML that can be safely represented as data.',
      },
    ],
  },
  'json-minifier': {
    instructions: [
      'Paste or upload the JSON you want to compress.',
      'Press Minify. The document is validated first, then all insignificant whitespace is removed.',
      'Copy or download the single-line result.',
      'Because the input is parsed first, you never ship broken minified JSON.',
    ],
    example: {
      title: 'Shrinking JSON for transport',
      input: '{\n  "a": 1,\n  "b": [1, 2, 3]\n}',
      output: '{"a":1,"b":[1,2,3]}',
    },
    faq: [
      {
        q: 'Does minifying change the meaning of my JSON?',
        a: 'No. Only insignificant whitespace is removed. The data is identical; it is just more compact.',
      },
      {
        q: 'Is the minified output validated?',
        a: 'Yes. The tool parses your JSON before minifying, so invalid input is reported rather than producing a broken result.',
      },
    ],
  },
  'json-to-yaml': {
    instructions: [
      'Paste or upload JSON.',
      'Choose your YAML output indentation and version (1.2 by default).',
      'Press Convert to YAML. Key order from your JSON is preserved.',
      'Copy or download the .yaml result.',
    ],
    example: {
      title: 'Converting a config object',
      input: '{"service":"api","replicas":3,"env":{"DEBUG":false}}',
      output: 'service: api\nreplicas: 3\nenv:\n  DEBUG: false',
    },
    faq: [
      {
        q: 'Is key order preserved?',
        a: 'Yes. The converter keeps the order of keys exactly as they appear in your JSON.',
      },
      {
        q: 'Which YAML version is produced?',
        a: 'YAML 1.2 by default. You can select 1.1 if you need compatibility with older parsers.',
      },
      {
        q: 'Are strings kept as strings?',
        a: 'Yes. Values that look boolean-like or numeric but are strings in your JSON stay quoted so their type is not changed.',
      },
    ],
  },
  'json-anonymizer': {
    instructions: [
      'Paste or upload the JSON you want to sanitize.',
      'Choose a scope: replace All values, or only specific keys (type key names like email, name, ssn).',
      'Pick a style: Realistic fake data, Redact (***), or Type placeholder.',
      'Press Anonymize, then copy or download the safe-to-share result. Your original data never leaves the browser.',
    ],
    example: {
      title: 'Masking PII before sharing a payload',
      input: '{ "name": "Ada Lovelace", "email": "ada@company.com", "id": 42, "active": true }',
      output: '{ "name": "Jordan Lee", "email": "user1@example.com", "id": 1001, "active": false }',
      note: 'With “Realistic” style, values are swapped for believable fake data while keys, structure, and types stay intact.',
    },
    faq: [
      {
        q: 'Is my data sent anywhere to be anonymized?',
        a: 'No. The replacement happens entirely in your browser with JavaScript (and a Web Worker for large files). Your original values never leave your device.',
      },
      {
        q: 'Can I anonymize only certain fields?',
        a: 'Yes. Choose the “Only these keys” scope and list the key names (for example: email, phone, ssn, token). Matching is case-insensitive and works at any depth. If a matched key holds an object or array, everything inside it is anonymized too.',
      },
      {
        q: 'What replacement styles are available?',
        a: 'Realistic fake data (key-aware — emails become user@example.com, names become fake names), Redact (mask with ***), and Type placeholder ("string", 0, true). Secret-like keys such as password, token, or apiKey are always fully redacted.',
      },
      {
        q: 'Does it keep my JSON structure?',
        a: 'Yes. Keys, nesting, array lengths, and value types are preserved — only the values change, so the anonymized output stays a valid, representative sample.',
      },
    ],
  },
  'yaml-formatter': {
    instructions: [
      'Paste or upload YAML (.yaml or .yml).',
      'Choose indentation and YAML version (1.2 by default).',
      'Press Format. Comments, anchors, aliases, tags, and key order are preserved.',
      'Keys are never sorted and aliases are never expanded unless you explicitly ask.',
    ],
    example: {
      title: 'Tidying YAML without losing comments',
      input: '# db config\nhost: localhost\nport:    5432',
      output: '# db config\nhost: localhost\nport: 5432',
      note: 'Comments and structure are preserved; only inconsistent spacing is normalized.',
    },
    faq: [
      {
        q: 'Will formatting remove my comments?',
        a: 'No. The formatter preserves comments, anchors, aliases, tags, block scalars, and key order. It never performs destructive changes silently.',
      },
      {
        q: 'Does it expand anchors and aliases?',
        a: 'No. Anchors (&name) and aliases (*name) are kept as-is. They are only expanded if you convert to JSON, and you are warned when that happens.',
      },
      {
        q: 'Can I sort keys?',
        a: 'Only if you opt in. Sorting is off by default and, when enabled, the tool notes that it changed the original order.',
      },
    ],
  },
  'yaml-validator': {
    instructions: [
      'Paste or upload YAML.',
      'Validation runs as you type and on demand with the Validate button.',
      'Errors include the exact location the parser reports.',
      'Multiple documents, anchors, and block scalars are all understood.',
    ],
    example: {
      title: 'Catching bad indentation',
      input: 'a:\n  b: 1\n   c: 2',
      output: 'Error: bad indentation of a mapping entry (line 3).',
    },
    faq: [
      {
        q: 'Which YAML version is validated?',
        a: 'YAML 1.2 by default, with an option for 1.1. Validation is based on the well-tested `yaml` library.',
      },
      {
        q: 'Are malicious YAML inputs handled safely?',
        a: 'Yes. The parser caps alias expansion to protect against “billion laughs”-style denial-of-service documents.',
      },
      {
        q: 'Does it support multiple documents?',
        a: 'Yes. Documents separated by --- are each validated, and errors are reported per document.',
      },
    ],
  },
  'yaml-to-json': {
    instructions: [
      'Paste or upload YAML.',
      'Press Convert to JSON.',
      'Review any warnings: JSON cannot represent comments, shared aliases, custom tags, or multiple documents faithfully.',
      'Copy or download the JSON result.',
    ],
    example: {
      title: 'Converting YAML with an anchor',
      input: 'defaults: &d\n  retries: 3\nprod:\n  <<: *d',
      output: '{\n  "defaults": { "retries": 3 },\n  "prod": { "retries": 3 }\n}',
      note: 'The alias *d is expanded in JSON. The converter warns you so the loss of the shared reference is never a surprise.',
    },
    faq: [
      {
        q: 'What warnings might I see?',
        a: 'You are warned when comments will be dropped, when aliases are expanded, when custom tags cannot be represented, and when multiple documents are combined into a JSON array.',
      },
      {
        q: 'Why does JSON lose information from YAML?',
        a: 'JSON has no concept of comments, anchors/aliases, tags, or multiple documents. The converter makes these trade-offs explicit instead of hiding them.',
      },
      {
        q: 'Are multiple YAML documents supported?',
        a: 'Yes. They are converted into a JSON array, with a warning explaining the transformation.',
      },
    ],
  },
  'yaml-anonymizer': {
    instructions: [
      'Paste or upload the YAML you want to sanitize.',
      'Choose a scope: replace All values, or only specific keys (type key names like email, name, ssn).',
      'Pick a style: Realistic fake data, Redact (***), or Type placeholder.',
      'Press Anonymize, then copy or download the safe-to-share result. Your original data never leaves the browser.',
    ],
    example: {
      title: 'Masking secrets in a config file',
      input: 'db:\n  host: prod-db.corp.internal\n  password: s3cr3t\n  user: admin',
      output: 'db:\n  host: lorem\n  password: "***REDACTED***"\n  user: user1',
      note: 'Secret-like keys (password, token, apiKey…) are always fully redacted. Comments and anchors are not preserved, since anonymizing re-serializes the document.',
    },
    faq: [
      {
        q: 'Is my YAML sent anywhere to be anonymized?',
        a: 'No. It is parsed and rewritten entirely in your browser. Your original values never leave your device.',
      },
      {
        q: 'Are comments and anchors preserved?',
        a: 'No. Anonymizing re-serializes YAML from its data model, so comments, anchors, and aliases are dropped — the tool warns you about this. Use the YAML formatter if you need lossless formatting.',
      },
      {
        q: 'Can I target only certain keys?',
        a: 'Yes. Use the “Only these keys” scope and list key names such as password, email, or token. Matching is case-insensitive and works at any depth.',
      },
      {
        q: 'What replacement styles are available?',
        a: 'Realistic fake data (key-aware), Redact (mask with ***), and Type placeholder. Secret-like keys are always fully redacted.',
      },
    ],
  },
  'json-schema-validator': {
    instructions: [
      'Put your document (JSON) in the input editor and your JSON Schema in the schema editor.',
      'Press Validate against schema. Validation uses AJV with Draft 2020-12.',
      'Errors are grouped by instance path so you can see exactly which fields fail.',
      'If the schema itself is invalid, that is reported separately from data errors.',
    ],
    example: {
      title: 'Validating a required field',
      input: '{ "name": "Ada" }',
      output: 'Error at (root): missing required property "age".',
      note: 'The schema requires both name and age; the missing field is reported with its path.',
    },
    faq: [
      {
        q: 'Which JSON Schema draft is supported?',
        a: 'Draft 2020-12, via the AJV validator, including keywords like prefixItems and unevaluatedProperties.',
      },
      {
        q: 'Are remote $ref schemas fetched?',
        a: 'No. To keep everything private and offline, remote references are not fetched. Provide the full schema locally.',
      },
      {
        q: 'Can I validate YAML against a schema?',
        a: 'Yes. YAML is parsed to a data value first and then validated against your JSON Schema.',
      },
      {
        q: 'Where does validation run?',
        a: 'Entirely in your browser. Neither the schema nor the document is sent anywhere.',
      },
    ],
  },
};
