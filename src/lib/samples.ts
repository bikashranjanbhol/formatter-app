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

export const SAMPLE_ANON = `{
  "customer": {
    "id": 84213,
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada.lovelace@contoso.com",
    "phone": "+1-202-555-0173",
    "ssn": "123-45-6789",
    "address": { "street": "10 Downing St", "city": "London", "country": "UK", "zip": "SW1A" }
  },
  "account": {
    "apiKey": "sk_live_9f8a7b6c5d4e3f2a1b0c",
    "balance": 4200.5,
    "active": true,
    "createdAt": "2024-06-01T09:30:00Z"
  },
  "notes": ["Follow up about invoice", "VIP customer"]
}`;

export const SAMPLE_ANON_YAML = `customer:
  id: 84213
  firstName: Ada
  lastName: Lovelace
  email: ada.lovelace@contoso.com
  phone: "+1-202-555-0173"
  ssn: "123-45-6789"
  address:
    street: 10 Downing St
    city: London
    country: UK
account:
  apiKey: sk_live_9f8a7b6c5d4e3f2a1b0c
  balance: 4200.5
  active: true
  createdAt: 2024-06-01T09:30:00Z
notes:
  - Follow up about invoice
  - VIP customer
`;

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

/**
 * Diff samples. Deliberately exercise every difference class the viewer can
 * show: a changed scalar, an added key, a removed key, a nested change, and an
 * array whose items moved as well as changed.
 */
export const SAMPLE_DIFF_LEFT = `{
  "service": "checkout-api",
  "version": "2.3.1",
  "replicas": 3,
  "region": "eu-west-1",
  "limits": { "memoryMb": 512, "cpu": "500m" },
  "features": ["cart", "payments", "receipts"],
  "endpoints": [
    { "id": "health", "path": "/healthz", "public": true },
    { "id": "charge", "path": "/v1/charge", "public": false }
  ]
}`;

export const SAMPLE_DIFF_RIGHT = `{
  "service": "checkout-api",
  "version": "2.4.0",
  "replicas": 5,
  "limits": { "memoryMb": 1024, "cpu": "500m" },
  "features": ["cart", "payments", "receipts", "refunds"],
  "endpoints": [
    { "id": "charge", "path": "/v1/charge", "public": false },
    { "id": "health", "path": "/healthz", "public": true },
    { "id": "refund", "path": "/v1/refund", "public": false }
  ],
  "owner": "payments-team"
}`;

export const SAMPLE_DIFF_LEFT_YAML = `service: checkout-api
version: 2.3.1
replicas: 3
region: eu-west-1
limits:
  memoryMb: 512
  cpu: 500m
features:
  - cart
  - payments
  - receipts
endpoints:
  - id: health
    path: /healthz
    public: true
  - id: charge
    path: /v1/charge
    public: false
`;

export const SAMPLE_DIFF_RIGHT_YAML = `service: checkout-api
version: 2.4.0
replicas: 5
limits:
  memoryMb: 1024
  cpu: 500m
features:
  - cart
  - payments
  - receipts
  - refunds
endpoints:
  - id: charge
    path: /v1/charge
    public: false
  - id: health
    path: /healthz
    public: true
  - id: refund
    path: /v1/refund
    public: false
owner: payments-team
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
