# JSON & YAML Workbench

**Private, schema-aware JSON and YAML tools that run entirely in your browser.**

A fast, privacy-first developer toolkit for formatting, validating, converting, and exploring
JSON and YAML. Every document operation runs locally in your browser — your data is never
uploaded, logged, or stored.

Built with Next.js (App Router), React, TypeScript (strict), Tailwind CSS, CodeMirror 6, the
`yaml` library, and AJV for JSON Schema Draft 2020-12.

---

## Table of contents

- [Features](#features)
- [Privacy architecture](#privacy-architecture)
- [Local development](#local-development)
- [Available scripts](#available-scripts)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [How browser-side workers are used](#how-browser-side-workers-are-used)
- [Adding a new formatter page](#adding-a-new-formatter-page)
- [Future Stripe & database integration](#future-stripe--database-integration)
- [Known limitations](#known-limitations)

---

## Features

### Tools (public routes)

| Route                          | What it does                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `/`                            | Landing page with all tools and value proposition                                      |
| `/json-formatter`              | Format / beautify JSON (2-space, 4-space, tab; LF/CRLF; sort keys optional)            |
| `/json-validator`              | Validate JSON with precise line/column errors, duplicate-key & precision warnings      |
| `/json-viewer`                 | Collapsible tree view with search, expand/collapse all, copy value / JSON Pointer path |
| `/json-minifier`               | Minify JSON (validated first)                                                          |
| `/json-to-yaml`                | Convert JSON → YAML 1.2, preserving key order                                          |
| `/yaml-formatter`              | Format YAML 1.2, preserving comments, anchors, aliases, tags, key order                |
| `/yaml-validator`              | Validate YAML 1.2 with exact error locations; multi-document aware                     |
| `/yaml-to-json`                | Convert YAML → JSON with honest lossy-feature warnings                                 |
| `/json-schema-validator`       | Validate JSON or YAML against a JSON Schema (Draft 2020-12)                            |
| `/pricing`                     | Free / Pro / Developer-API / Team plans (paid features honestly marked "Coming soon")  |
| `/privacy`, `/terms`, `/about` | Company pages                                                                          |

### Core capabilities

- **JSON**: format, validate, minify, tree view, JSON Pointer paths, duplicate-key detection,
  large-integer precision warnings, JSON → YAML, JSON Schema validation.
- **YAML**: YAML 1.2 parse/validate/format, multiple documents, comments/anchors/aliases/tags/
  block scalars preserved, YAML → JSON with warnings, alias-expansion (billion-laughs) protection.
- **Editor UX**: CodeMirror 6, resizable two-panel desktop layout, mobile input/output tabs,
  status bar (type, validity, lines, chars, bytes, processing time), light/dark/system themes,
  keyboard shortcuts + help dialog, drag-and-drop file upload, download, undo/redo, cancellation.
- **Safety**: no silent repair, no silent lossy conversion — every risky transformation is warned
  about before it replaces your output.

---

## Privacy architecture

This is the core product promise: **user documents are never transmitted to the server** for
formatting, validation, conversion, searching, or tree visualization.

- All parsing, formatting, validation, conversion, and tree building execute as JavaScript in the
  browser (main thread or a Web Worker — both on your device).
- **Never**: transmit, log, or store document contents; include them in analytics; persist them by
  default.
- **Only** UI preferences (theme, indentation, etc.) are stored, in `localStorage`, never leaving
  your device.
- Uploaded files are treated as **untrusted**: read as text only, restricted to expected
  extensions, and capped at a configurable size limit.
- A **Content Security Policy** (see `next.config.mjs`) restricts `connect-src` to `'self'`, so the
  page cannot exfiltrate data even accidentally. `worker-src blob:` and `'unsafe-inline'` styles are
  allowed because CodeMirror and bundled Web Workers require them.
- Server **Route Handlers** exist only for future functionality (health check, later payments /
  encrypted sharing). Editor contents are never sent to them during normal use.
- The route-level error boundary (`src/app/error.tsx`) deliberately shows a generic message and
  never renders error details, so document contents cannot leak into the UI or logs.

A visible **“Processed locally in your browser”** indicator is shown on every tool.

---

## Local development

Requirements: **Node.js ≥ 18.18** (Node 20+ recommended) and npm.

```bash
npm install
cp .env.example .env.local   # optional; sensible defaults work out of the box
npm run dev                  # http://localhost:3000
```

---

## Available scripts

| Script                 | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start the dev server                                        |
| `npm run build`        | Production build (also type-checks and lints)               |
| `npm run start`        | Serve the production build                                  |
| `npm run lint`         | ESLint                                                      |
| `npm run typecheck`    | `tsc --noEmit`                                              |
| `npm run format`       | Prettier write                                              |
| `npm run format:check` | Prettier check                                              |
| `npm run test`         | Unit/component tests (Vitest) once                          |
| `npm run test:watch`   | Vitest watch mode                                           |
| `npm run test:e2e`     | Playwright end-to-end tests (builds + serves automatically) |

---

## Environment variables

All are optional; the app builds and runs without them. See `.env.example`.

| Variable                     | Default                 | Purpose                                                               |
| ---------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`       | `http://localhost:3000` | Canonical URLs, sitemap, Open Graph. **Set this in production.**      |
| `NEXT_PUBLIC_GITHUB_URL`     | `https://github.com/`   | Header/footer GitHub link (placeholder)                               |
| `NEXT_PUBLIC_ENABLE_ADS`     | `false`                 | Show advertising **placeholder** slots (hidden by default, incl. dev) |
| `NEXT_PUBLIC_MAX_FILE_BYTES` | `10485760` (10 MB)      | Client-side upload size limit                                         |

No secrets are required. Never commit real secrets; use your deployment platform's secret storage.

---

## Testing

The pure engine (`src/lib/**`) is decoupled from React so it can be tested directly and reused by a
future API or CLI.

```bash
npm run test        # Vitest: JSON, YAML, schema, tree, and component tests
npm run test:e2e    # Playwright smoke tests (home, format, validate, convert, mobile, theme, health)
```

Coverage highlights:

- **JSON**: valid/invalid/nested/primitive docs, unicode, large-integer precision, duplicate keys,
  all formatting options, minification, JSON → YAML.
- **YAML**: comments, anchors/aliases, multiple documents, block scalars, quoted values,
  boolean-like strings, nulls, malformed indentation, conversion warnings, billion-laughs guard.
- **Schema**: valid/invalid instances, nested error paths, invalid schema, Draft 2020-12
  (`prefixItems`).
- **UI**: privacy indicator, status bar, error display (not color-only), pricing "coming soon",
  theme switching; Playwright covers the format workflow, validation, conversion warnings, mobile
  tabs, and the health endpoint.

> Playwright note: in this managed environment a full Chromium is pre-installed and used via a
> stable symlink (`/opt/pw-browsers/chromium`). Elsewhere, run
> `npm run test:e2e:install` (or `npx playwright install chromium`) once first.

---

## Production build

```bash
npm run build
npm run start        # serves on http://localhost:3000
```

The build type-checks, lints, and statically prerenders all public routes. The heavy CodeMirror
and schema-validation code is code-split and lazy-loaded on the client, so tool pages have a small
first-load payload.

---

## Deployment

The app is a standard Next.js application and deploys to any platform that supports Next.js
(Vercel, Netlify, a Node server, or a container).

1. Set `NEXT_PUBLIC_SITE_URL` to your production origin (no trailing slash).
2. `npm run build`
3. `npm run start` (or your platform's Next.js runtime).

The security headers and CSP in `next.config.mjs` are applied to all responses. If you add
third-party scripts (e.g. a real ad network or analytics), update the CSP accordingly.

---

## How browser-side workers are used

Expensive operations are offloaded to a **Web Worker** so the main thread — and therefore the UI —
stays responsive on large documents.

- `src/lib/engine.ts` holds a **pure**, DOM-free dispatcher (`runOperation`) shared by the main
  thread and the worker.
- `src/workers/formatter.worker.ts` runs that dispatcher off the main thread.
- `src/lib/runner.ts` decides per operation: inputs below `WORKER_THRESHOLD_BYTES` (256 KB) run
  inline to avoid round-trip latency; larger inputs go to the worker. It returns a handle with a
  `cancel()` that terminates in-flight worker work, and falls back to inline execution if a worker
  cannot be created.
- Worker errors are sanitized (never echoing document contents) and memory errors are reported
  gracefully.

---

## Adding a new formatter page

The architecture makes new tools cheap to add:

1. **Engine** (if needed): add a pure function in `src/lib/json/`, `src/lib/yaml/`, or
   `src/lib/schema/`, and wire it into the `EngineOperation` union and `runOperation` dispatcher in
   `src/lib/engine.ts`. Add unit tests in `tests/unit/`.
2. **Register the tool**: add an entry to `TOOLS` in `src/lib/tools.ts` (slug, nav label, SEO
   title, description, intro, language, group).
3. **Content**: add instructions, an example, and FAQ to `TOOL_CONTENT` in `src/lib/content.ts`
   (keep it unique to avoid thin SEO content).
4. **Workbench behavior**: map the slug in `resolveConfig` (`src/components/workbench/config.ts`)
   and, if it's a new operation kind, in `Workbench`'s `buildOperation`.
5. **Route**: create `src/app/<slug>/page.tsx`:

   ```tsx
   import type { Metadata } from 'next';
   import { ToolPage } from '@/components/workbench/ToolPage';
   import { toolMetadata } from '@/lib/metadata';

   export const metadata: Metadata = toolMetadata('<slug>');
   export default function Page() {
     return <ToolPage mode="<slug>" />;
   }
   ```

The sitemap, navigation, and footer pick up the new tool automatically from `TOOLS`.

---

## Future Stripe & database integration

The project is structured so billing and persistence can be added **later** via Route Handlers,
without a separate backend and without requiring credentials to build or run today.

**Stripe (payments):**

- Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to your
  environment (placeholders are noted in `.env.example`).
- Create `src/app/api/checkout/route.ts` to start a Stripe Checkout session and
  `src/app/api/webhooks/stripe/route.ts` to handle subscription webhooks (use the raw request body
  for signature verification).
- Wire the disabled "Coming soon" CTAs in `src/components/monetization/PricingCard.tsx` to the
  checkout route. **Never** send editor/document contents to these routes.

**Database (accounts, saved preferences, teams):**

- Add a database client (e.g. Postgres via Prisma/Drizzle) behind Route Handlers under
  `src/app/api/`.
- Gate Pro/Team features on the server; keep all document processing on the client.
- If "saved content" is ever offered, it must be strictly opt-in and clearly disclosed, consistent
  with the privacy promise.

---

## Known limitations

- **YAML round-trip.** Formatting preserves comments, anchors, aliases, tags, block scalars, and
  key order via the `yaml` library. However, perfect byte-for-byte round-tripping is not guaranteed
  for every construct — some whitespace and styling may be normalized. Semantics and the listed
  features are preserved; keys are never sorted and aliases never expanded unless you opt in.
- **YAML → JSON is inherently lossy.** JSON cannot represent comments, shared aliases (they are
  expanded), custom tags, or multiple documents (combined into an array). The converter **warns**
  about each of these rather than hiding them.
- **Number precision.** JSON output uses native `JSON.stringify`; integers beyond JavaScript's safe
  range (2^53) can lose precision. The tools warn when this is possible instead of failing silently.
- **JSON Schema remote `$ref`.** Remote reference fetching is disabled to keep everything private
  and offline — provide the full schema locally.
- **Tree view scale.** Very large documents render with collapsed branches for performance; full
  windowed virtualization is a future enhancement. Target smooth operation up to ~10 MB.
- **PWA icons.** A scalable SVG icon ships in `public/icons/icon.svg`. Raster PNG icons
  (`icon-192.png`, `icon-512.png`) are documented placeholders you can drop into `public/icons/` for
  broader install-prompt support.
- **Advertising & paid plans.** Ad slots are clearly labelled placeholders (no real network is
  integrated) and are hidden unless `NEXT_PUBLIC_ENABLE_ADS=true`. Paid capabilities that are not
  built are marked "Coming soon"; there is no checkout flow yet.
- **Testimonials are placeholder content.** The landing-page testimonials in
  `src/lib/testimonials.ts` are sample copy, attributed by role only and visibly badged "Sample
  content." Replace them with real, permissioned quotes before launch — do not present invented
  quotes as genuine reviews. The trust-bar figures next to them are honest, verifiable product facts.
- **Social sharing images.** Branded Open Graph / Twitter images are generated on the fly with
  `next/og` — one site-wide default (`src/app/opengraph-image.tsx`, `twitter-image.tsx`) and a
  titled image per tool (`src/app/<slug>/opengraph-image.tsx`), all driven by
  `src/lib/og.tsx`. The landing page also has a lightweight, illustrative before/after animation
  (`src/components/marketing/BeforeAfterDemo.tsx`) that respects `prefers-reduced-motion`.

```

```
