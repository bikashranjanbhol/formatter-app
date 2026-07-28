/** Sample documents used by the "Load sample" action on each tool. */

export const SAMPLE_JSON = `{
  "product": "JSON & YAML Workbench",
  "private": true,
  "version": "1.0.0",
  "features": ["format", "validate", "convert", "tree view"],
  "limits": { "maxFileMb": 10, "worker": true },
  "maintainers": [
    { "name": "Ada", "role": "engineering" },
    { "name": "Grace", "role": "design" }
  ],
  "releasedAt": "2026-01-01T00:00:00Z"
}`;

export const SAMPLE_JSON_MINIFIED =
  '{"product":"JSON & YAML Workbench","private":true,"features":["format","validate","convert"],"limits":{"maxFileMb":10}}';

export const SAMPLE_YAML = `# Application configuration
product: JSON & YAML Workbench
private: true
version: 1.0.0
defaults: &defaults
  worker: true
  maxFileMb: 10
environments:
  development:
    <<: *defaults
    debug: true
  production:
    <<: *defaults
    debug: false
features:
  - format
  - validate
  - convert
  - tree view
notes: |
  This YAML uses an anchor (&defaults) and aliases (*defaults)
  plus a block scalar. Converting to JSON expands the aliases.
`;

export const SAMPLE_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Product",
  "type": "object",
  "required": ["product", "version"],
  "properties": {
    "product": { "type": "string", "minLength": 1 },
    "private": { "type": "boolean" },
    "version": { "type": "string", "pattern": "^\\\\d+\\\\.\\\\d+\\\\.\\\\d+$" },
    "features": { "type": "array", "items": { "type": "string" } },
    "limits": {
      "type": "object",
      "properties": {
        "maxFileMb": { "type": "number", "minimum": 1 },
        "worker": { "type": "boolean" }
      }
    }
  },
  "additionalProperties": true
}`;
