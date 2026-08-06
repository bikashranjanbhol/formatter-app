# Advanced Features Plan — Attract, Activate, and Retain

**Status:** proposal for discussion. Nothing here is built yet.
**Scope:** what to build next in the JSON & YAML Workbench so more developers find us, more of them
come back, and enough of them convert to paid plans.

---

## Table of contents

- [1. Where we stand today](#1-where-we-stand-today)
- [2. Strategy in one page](#2-strategy-in-one-page)
- [3. A note on "enforcing" usage](#3-a-note-on-enforcing-usage)
- [4. Feature roadmap](#4-feature-roadmap)
  - [Tier A — Acquisition: high-intent tools we don't have](#tier-a--acquisition-high-intent-tools-we-dont-have)
  - [Tier B — Activation: make the first minute unbeatable](#tier-b--activation-make-the-first-minute-unbeatable)
  - [Tier C — Retention: reasons to come back and to stay](#tier-c--retention-reasons-to-come-back-and-to-stay)
  - [Tier D — Distribution: be where the developer already is](#tier-d--distribution-be-where-the-developer-already-is)
  - [Tier E — Monetization: what people will actually pay for](#tier-e--monetization-what-people-will-actually-pay-for)
- [5. Phased delivery plan](#5-phased-delivery-plan)
- [6. Architecture notes](#6-architecture-notes)
- [7. Metrics](#7-metrics)
- [8. Risks and things we should not do](#8-risks-and-things-we-should-not-do)

---

## 1. Where we stand today

Eleven tool routes, all client-side: JSON formatter, validator, viewer, minifier, anonymizer,
JSON→YAML; YAML formatter, validator, anonymizer, YAML→JSON; and a JSON Schema validator
(Draft 2020-12). Supporting surfaces: landing page, pricing, about/privacy/terms, PWA manifest and
service worker, generated OG images, sitemap and robots.

The engine is already in the right shape for everything below. `src/lib/engine.ts` is a pure,
DOM-free dispatcher; `src/lib/runner.ts` decides inline-vs-worker by input size; `src/lib/tools.ts`
is a registry that drives nav, sitemap, breadcrumbs, and metadata. Adding a tool is: pure function →
registry entry → content entry → workbench variant → 6-line route file.

**What we're missing, bluntly:**

| Gap | Consequence |
| --- | --- |
| No diff, no query, no codegen, no non-YAML converters | We miss the highest-intent searches in this category |
| Nothing persists between visits | Every visit is a cold start; zero switching cost |
| No accounts, no checkout, no API | Every paid plan says "Coming soon"; revenue is $0 |
| Web-only | We're absent from the editor, the terminal, and CI where the work actually happens |
| Single-document, paste-only workflow | No reason to stay longer than one paste |

Everything in this plan attacks one of those five rows.

---

## 2. Strategy in one page

**The wedge is privacy.** "Runs entirely in your browser, nothing is uploaded" is not a marketing
line for us — it is enforced by CSP (`connect-src 'self'`) and verifiable in DevTools. Every
competitor that posts your payload to a server is disqualified for anyone handling production data,
customer PII, or secrets in config. That's a large, underserved, high-value audience.

**The three moats, in order of durability:**

1. **Trust** — the only tool a developer can paste a production `secrets.yaml` into. Hard to copy
   because competitors would have to give up their server-side architecture.
2. **Breadth in one place** — diff, query, convert, generate types, mock, validate: one tab, one set
   of keyboard shortcuts, one mental model. Beats ten single-purpose sites.
3. **Presence in the workflow** — CLI, VS Code extension, GitHub Action, browser extension. Once a
   schema check runs in someone's CI, the tool stops being a website and becomes infrastructure.

**The funnel we're building for:**

```
SEO long-tail  →  paste works in <5s  →  a reason to return  →  a reason to install  →  a reason to pay
   (Tier A)          (Tier B)               (Tier C)              (Tier D)              (Tier E)
```

---

## 3. A note on "enforcing" usage

We can't force anyone to use a free web tool, and attempts to do so backfire in the developer
market specifically — this audience punishes dark patterns loudly and publicly. Anything that looks
like coercion (crippling the free tool, forced sign-up walls, nag modals, fake urgency, "log in to
copy your own output") would cost us more in reputation than it gains in conversions, and it
directly contradicts the privacy positioning that is our whole advantage.

So this plan builds **switching cost that the user actually wants**: their saved snippets, their
schema library, their presets, their keyboard muscle memory, their CI pipeline. That's the honest
version of lock-in, and it's stronger — people don't leave a tool that holds their work and runs in
their build. Where limits exist (Tier E), they're on scale and automation, never on the core
promise: format/validate/convert stays free and unlimited forever.

---

## 4. Feature roadmap

Each item carries **Impact** (acquisition/activation/retention/revenue), **Effort** (S ≈ days,
M ≈ 1–2 weeks, L ≈ 3+ weeks), and where it lands in the codebase.

### Tier A — Acquisition: high-intent tools we don't have

These are new routes. Each one is its own SEO landing page and each one is a search term developers
type several times a week.

**A1. JSON / YAML Diff & Merge** — *Impact: acquisition + retention · Effort: L*
Structural (not line-based) diff: added / removed / changed / moved keys, side-by-side and unified
views, array-matching by identity heuristic or user-chosen key, "copy patch" as JSON Patch
(RFC 6902) or JSON Merge Patch, and a three-way merge view for conflicts. Routes:
`/json-diff`, `/yaml-diff`.
*Why first:* "json diff" and "compare json" are among the largest untapped search volumes adjacent
to what we already rank for, and diff is the single most requested feature on tools like ours. It's
also inherently two-document — the first genuine reason to open a workspace rather than a text box.

**A2. JSONPath & jq-style query playground** — *Impact: acquisition + retention · Effort: M*
Live query bar over the tree view with instant highlighting of matched nodes, result panel, query
history, and a cheatsheet. Start with JSONPath (small, well-specified); add a jq-subset evaluator
after. Route: `/json-query` (plus a query bar embedded in `/json-viewer`).

**A3. Schema inference — generate a JSON Schema from sample data** — *Impact: acquisition + revenue · Effort: M*
Infer Draft 2020-12 from one or many samples: types, required vs optional, enums from repeated
literals, format detection (date-time, email, uuid, uri), `additionalProperties` policy toggle.
Feeds directly into the schema validator we already ship, and into the Team schema registry (E3).
Route: `/json-schema-generator`.

**A4. Type codegen — JSON/Schema → TypeScript, Go, Python, Rust, Java, C#** — *Impact: acquisition · Effort: M*
"Paste JSON, get an interface" is a daily task and a very high-intent search. Ship TypeScript first
(fast, highest volume), then Go structs with tags, then Pydantic models. Route: `/json-to-typescript`
and siblings — one route per target language, each its own indexable page.

**A5. The converter matrix — CSV, XML, TOML, .env, .properties, Base64, query strings** — *Impact: acquisition · Effort: M per pair, S after scaffolding*
We only convert JSON↔YAML. Each additional pair is a route and a search term: `/json-to-csv`,
`/csv-to-json`, `/xml-to-json`, `/json-to-xml`, `/toml-to-json`, `/json-to-toml`, `/env-to-json`.
Build a generic converter scaffold once, then adding a pair is a day.

**A6. JSON Graph view (node-and-edge visualization)** — *Impact: acquisition + shareability · Effort: L*
The JSON Crack effect: a canvas graph of the document with pan/zoom, collapsible subgraphs, and PNG/SVG
export. This is the most *screenshottable* feature in the category — it's what gets posted on Reddit
and Hacker News. Route: `/json-graph`.

**A7. Adjacent micro-tools** — *Impact: acquisition · Effort: S each*
JWT decoder (client-side, obviously), Base64 encode/decode, URL encode/decode, UUID generator,
timestamp converter, hash calculator. Individually small; collectively they're a wide net of
long-tail traffic that funnels into the main tools via a shared header.

### Tier B — Activation: make the first minute unbeatable

**B1. Multi-document workspace with tabs** — *Impact: activation + retention · Effort: L*
Named tabs, each with its own document and tool mode; drag to reorder; per-tab dirty state. This is
the structural change that turns "a page I paste into" into "an app I keep open." Diff (A1) and
query (A2) both want it. Local-only, `IndexedDB`.

**B2. Command palette (⌘K)** — *Impact: activation + retention · Effort: M*
Every action reachable by keyboard: switch tool, run, copy, download, change indent, open sample,
jump to path. Keyboard fluency is the quiet retention mechanism — once someone's fingers know
`⌘K → diff`, alternatives feel slow.

**B3. Auto-detect input format** — *Impact: activation · Effort: S*
Paste anything; we detect JSON / YAML / CSV / XML / TOML / JSON-Lines and offer the right tool
inline. Removes the "am I on the right page?" friction that costs us bounces from search landings.

**B4. Fix-it suggestions with one-click apply** — *Impact: activation · Effort: M*
We already report precise errors and deliberately never repair silently. Keep that, and add
*explicit, previewed* fixes: trailing comma, single→double quotes, unquoted keys, tab/space mixing,
BOM, smart quotes, missing bracket. Each shows a diff before applying. Honest and genuinely useful —
"my JSON is broken" is the #1 reason people arrive.

**B5. Real virtualization for large documents** — *Impact: activation + differentiation · Effort: L*
Currently ~10 MB with collapsed branches, and the README flags full virtualization as future work.
Windowed rendering plus streaming/incremental parse takes us to 100 MB+. "The only formatter that
doesn't crash on my 80 MB file" is a specific, credible, word-of-mouth claim — and server-based
competitors physically can't match it, because they'd have to upload it.

**B6. Deep-linkable tool state (no document)** — *Impact: acquisition · Effort: S*
Encode *options* — not content — in the URL: `?indent=4&sort=true`. Shareable, bookmarkable, and it
gives teams a way to standardize settings without an account.

### Tier C — Retention: reasons to come back and to stay

**C1. Local history & snippet library** — *Impact: retention · Effort: M*
Last N documents auto-saved to IndexedDB, plus explicitly saved, named, taggable, searchable
snippets. **Strictly opt-in, clearly disclosed, one-click purge, never synced by default** — that
constraint is non-negotiable and consistent with the privacy promise. This is the single highest
retention-per-effort item on the list: it's the difference between "a site" and "my scratchpad."

**C2. Presets / profiles** — *Impact: retention · Effort: S*
Named bundles of formatting options ("work: 4-space, sorted, LF" / "k8s: 2-space, no sort"),
switchable in one click, exportable as a file a team can share.

**C3. Custom anonymization rules** — *Impact: retention + revenue · Effort: M*
Our anonymizer is a real differentiator and under-exploited. Add saved rule sets: per-key regex
matching, per-type fake-data generators, deterministic pseudonymization (same input → same fake
output, so referential integrity survives), allow/deny lists. Rule sets are exactly the kind of
artifact a security-conscious team builds once and reuses forever.

**C4. End-to-end encrypted sharing** — *Impact: retention + virality + revenue · Effort: L*
Share links where the key lives in the URL fragment (`#key=…`) and never reaches the server; the
server stores only ciphertext it cannot read, with a mandatory TTL and optional burn-after-read.
This is the *only* way to add sharing without breaking our promise — and it's a promise we can state
precisely, which makes it marketable. Requires a storage backend and a CSP amendment; both scoped to
ciphertext only.

**C5. Mock / fake data generator from a schema** — *Impact: retention · Effort: M*
Given a JSON Schema (or an inferred one from A3), generate N realistic sample documents, seedable
for reproducibility. Closes the loop: infer schema → validate → generate fixtures. Route:
`/json-mock-generator`.

**C6. Offline-first, genuinely** — *Impact: retention · Effort: S–M*
We ship a service worker; make it a promise. Full offline capability for every tool, an install
prompt after the second successful operation (not on arrival), and an honest "works on a plane"
claim. Ship the raster PWA icons the README currently lists as placeholders.

### Tier D — Distribution: be where the developer already is

**D1. `npx` CLI + npm library** — *Impact: retention + revenue + credibility · Effort: M*
`src/lib/**` is already pure and DOM-free — the README explicitly anticipates this. Publish it as a
package with a CLI: `npx @jsonyaml/tools fmt src/**/*.json --check`. A `--check` mode that exits
non-zero is the hook into pre-commit and CI.

**D2. GitHub Action** — *Impact: retention (deep) · Effort: S once D1 exists*
Validate JSON/YAML and enforce schemas on every PR, with annotations on the failing lines. Once
this is green-checking someone's pull requests, we're part of their pipeline, not a bookmark.

**D3. VS Code extension** — *Impact: retention · Effort: M*
Format/validate/convert/diff/anonymize in-editor, same engine, same rules as the site. Marketplace
listing is its own discovery channel.

**D4. Browser extension** — *Impact: acquisition + retention · Effort: M*
Auto-format `application/json` responses in the browser with our tree view, plus a context-menu
"format selection." This is the highest-frequency touchpoint available — several times a day for
anyone working with APIs.

**D5. Docs, embeds, and an OSS posture** — *Impact: acquisition · Effort: M*
An embeddable read-only viewer widget (`<iframe>` or web component) that others put in *their* docs,
each carrying a backlink. Consider open-sourcing the engine: for a privacy-first tool, auditability
is the proof, and it converts skeptics into advocates. `NEXT_PUBLIC_GITHUB_URL` is currently a
placeholder — a real, active repo is itself a trust signal.

### Tier E — Monetization: what people will actually pay for

The current pricing page is honest about being unbuilt, which is the right call — but it can't stay
that way indefinitely. The conversion trigger should always be **scale or automation**, never
access to the core tools.

**E1. Accounts + Stripe Checkout** — *Effort: M*
The prerequisite for everything else. Route handlers under `src/app/api/`, gating on the server,
documents still never leaving the client. The README already sketches the integration.
**Hard rule: no document content ever reaches these routes.**

**E2. Developer API** — *Effort: L*
Server-side format/validate/convert/schema-check with API keys, quotas, and usage dashboards. Sold
to CI systems and backend services, where privacy expectations differ and server-side is what's
wanted. This is the plan with the clearest willingness to pay.

**E3. Team schema registry** — *Effort: L*
Shared, versioned schema library with diff-on-change and breaking-change detection, org roles, and
audit history. Naturally multi-seat, naturally sticky, and it's the enterprise upsell path.

**E4. Pro tier, defined concretely** — *Effort: S once E1 ships*
No ads · unlimited local history and snippets · unlimited saved presets and anonymization rule sets ·
batch processing (drag a folder in) · larger file ceiling · E2E share links with longer TTL ·
priority support. Every one of those is a *more of what you already like* upgrade, not a
*we took something away* upgrade.

---

## 5. Phased delivery plan

**Phase 1 — Prove the thesis (~6 weeks).** A1 diff · A2 query · B3 auto-detect · B4 fix-it ·
C2 presets · B6 deep-linkable options.
*Exit criteria:* two new high-volume search terms ranked; measurable lift in returning visitors.

**Phase 2 — Make it an app (~8 weeks).** B1 workspace tabs · B2 command palette · C1 history &
snippets · A3 schema inference · A4 TypeScript codegen · C6 offline hardening.
*Exit criteria:* ≥25% of sessions are returning users; median session touches ≥2 tools.

**Phase 3 — Escape the tab (~8 weeks).** D1 CLI · D2 GitHub Action · D4 browser extension ·
A5 converter matrix · A7 micro-tools.
*Exit criteria:* CLI installs and Action usage tracked as first-class top-of-funnel.

**Phase 4 — Charge for it (~8 weeks).** E1 accounts + Stripe · E4 Pro defined and live ·
C3 anonymization rule sets · C4 E2E sharing.
*Exit criteria:* first paying customers; free tier demonstrably not degraded.

**Phase 5 — Move upmarket (~12 weeks).** E2 API · E3 team registry · D3 VS Code · A6 graph view ·
B5 large-file virtualization · C5 mock generator.

Sequencing rationale: acquisition before retention (no point retaining traffic we don't have),
retention before monetization (no point charging users who don't return), and distribution before
enterprise (the CLI and Action are what get us into the orgs that buy E2/E3).

---

## 6. Architecture notes

**What holds.** The pure-engine split is the reason this roadmap is feasible at this pace. Keep
`src/lib/**` DOM-free — it's what lets the same code serve the web app, the worker, the CLI (D1),
the Action (D2), and the extension (D3). Every new operation goes into the `EngineOperation` union
and the `runOperation` dispatcher, with unit tests in `tests/unit/`, before any UI exists.

**What needs to change.**

- **Two-input operations.** Diff (A1), schema validation with a separate schema, and merge don't fit
  the single-input `Workbench` shape. Generalize the operation payload to accept an input *set*
  before building A1 — retrofitting later is much more expensive.
- **Workspace state layer.** B1/C1/C2 need a persistence module (IndexedDB, versioned, migratable)
  that is strictly opt-in and purgeable. Build it once, correctly, at the start of Phase 2.
- **Converter scaffold.** Before A5, factor the JSON↔YAML path into a generic
  `parse → normalize → serialize` pipeline so each new format is a parser plus a serializer, not a
  new tool.
- **Streaming parse.** B5 needs an incremental parser and a windowed tree renderer — a real project,
  correctly scheduled late.
- **CSP.** Currently `connect-src 'self'`, which is a feature, not an obstacle. Only C4 (encrypted
  sharing), E1 (Stripe), and E2 (API) need amendments, and each should be the narrowest possible
  addition, documented, with the privacy claim in `README.md` and `/privacy` updated in the same PR.

**Non-negotiable invariants for every item above:**

1. Document contents never leave the device except through C4, where they leave *encrypted with a
   key the server never sees*, only on an explicit user action.
2. No silent repair, no silent lossy conversion. B4's fixes are previewed and confirmed.
3. Anything not built is labelled "Coming soon" and there is no fake checkout — the standard the
   current pricing page already sets.
4. No invented testimonials, metrics, or logos. The trust bar stays factual.

---

## 7. Metrics

| Layer | Metric | Why it matters |
| --- | --- | --- |
| Acquisition | Organic sessions per tool route; ranked keywords | Tells us which Tier A bets paid |
| Activation | % of sessions with ≥1 successful operation; time-to-first-result | Catches broken first-minute UX |
| Engagement | Tools per session; ⌘K usage; sessions using diff or query | Are the new tools discovered? |
| Retention | D7 / D30 return rate; % sessions with restored history; PWA installs | The real health metric |
| Distribution | CLI installs; Action runs; extension MAU | Workflow penetration |
| Revenue | Free→Pro conversion; API keys active; MRR; churn | The point |
| Trust | Privacy-page views; "how do I verify this" support volume | Our moat, monitored |

All of it must be measurable **without touching document contents** — the current Vercel Analytics
setup respects that and should stay that way.

---

## 8. Risks and things we should not do

- **Scope sprawl.** Six half-finished tools beat nothing but lose to two excellent ones. Each phase
  ships complete, tested, and documented before the next starts.
- **Breaking the privacy promise for a feature.** If a feature can't be done client-side or
  end-to-end encrypted, it either doesn't ship or ships as an explicitly separate, clearly labelled
  server-side product (that's exactly what E2 is).
- **Ads degrading the experience.** Slots are placeholders today, hidden by default. If real ads
  ever land, they must not appear in the editor surface, must not track, and must not require CSP
  relaxations that weaken the guarantee.
- **Dark patterns.** No forced sign-up to use core tools, no nag modals, no artificial slowdowns, no
  hiding the copy button behind an account. See §3 — with this audience it's a losing trade.
- **Underestimating diff and virtualization.** A1 and B5 are the two genuinely hard items here.
  Budget them honestly rather than shipping a bad structural diff, which is worse than none.
- **Building E2/E3 before anyone returns twice.** Enterprise features without a retained user base
  are the classic way to burn a quarter.

---

*Prepared as a planning document. No product code changes accompany it.*
