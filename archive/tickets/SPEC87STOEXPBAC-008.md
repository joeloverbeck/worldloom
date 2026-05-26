# SPEC87STOEXPBAC-008: Page/record/prose/provenance routes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/src/server/routes/pages.ts` + `records.ts` + `prose.ts` + `provenance.ts`.
**Deps**: archive/tickets/SPEC87STOEXPBAC-005.md, archive/tickets/SPEC87STOEXPBAC-006.md, archive/tickets/SPEC87STOEXPBAC-007.md

## Problem

SPEC-87 §5 specifies the page-detail, record-fetch, prose-direct, page-plan-direct, prose-receipt-direct, and provenance routes. The page-detail route returns the full PageDetail composition from ticket 005; the record-fetch route validates the recordId against the full FOUNDATIONS §6 27-class story-bundle ID set per the SPEC-87 reassessment I1 correction (the 23 indexed classes plus SLB/SAU/SP/RSP which route to direct-file-read paths per SPEC-87 §7); the prose / page-plan / prose-receipt routes serve the direct-file-read bodies per SPEC-87 §7 source priority with their use-case clauses from the reassessment M4 (lazy-fetch / per-tab-fetch); the provenance route mirrors `tools/world-mcp/src/tools/get-story-state-provenance.ts:83-118` via ticket 005's `provenance.ts` helper. This is the largest single routes ticket — the read primitives compose into route handlers here.

## Assumption Reassessment (2026-05-25)

1. Tickets 005 + 006 + 007 have produced PageDetail assembly (`getPageDetail`), record-card data path (`buildRecordCard`), raw-yaml helper (`readRawRecord`), prose-direct helper (`readProse`), and provenance helper (`getRecordProvenance`), plus the HTTP server bootstrap with envelope wiring. This ticket's route bodies are thin orchestrations calling these primitives and wrapping the result in the envelope from ticket 007.
2. FOUNDATIONS §Story Bundles §6 (line 672, brainstorm-verified + reassess-verified at SPEC-87 §5 line 218 per the I1 correction): the full per-bundle class set is 24 (PG, SE, BEL, SF, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STCHAR, STLOC, STOBJ, CLK, STSEC, STQ, STPLAN, STEMO, BR, CHC, SLT, DA, SLB) plus 3 audit/promotion classes (SAU, SP, RSP), totaling 27. This ticket's `records.ts` validation accepts all 27; SLB/SAU/SP/RSP route to direct-file-read code paths per SPEC-87 §7. The validation logic mirrors `tools/world-mcp/src/tools/get-record.ts:244-252` `story_slug`-required gate.
3. Cross-skill boundary: the just-amended `/reassess-spec` §3.9 / §4.4 trigger ("MCP tools or other tools that mediate canon reads/writes — including HTTP read-backends") explicitly covers this ticket's surface. The records route is the structural enforcement that the trigger's Rule 1/6/7 preservation requirements are met: Rule 1 (no floating facts) — the route returns parsed record bodies as-is with no field synthesis; Rule 6 (no silent retcons) — read-only, no mutation; Rule 7 (Mystery Reserve firewall) — the route does not filter or transform record content based on mystery-resolution status, so it cannot silently resolve a Mystery Reserve entry (resolution is a story-pipeline authoring concern, not a viewer concern; SPEC-87 §2 / Named Assumption D — no spoiler protection in v1 — is the architectural decision).
4. FOUNDATIONS §Story Bundles §3 (Read Discipline): `story_slug` scoping is required for story-bundle ID retrieval. This ticket's records route validates that `story_slug` is present in the resolution path (mirrors `tools/world-mcp/src/tools/get-record.ts:244-252` gate); cross-bundle ID collisions return a structured `invalid_input` envelope error.
5. HARD-GATE surface: the records route mediates canon reads via HTTP transport. Per the just-amended §3.9 / §4.4 trigger, this is exactly the surface the trigger covers. The Layer 2 read-only fence from ticket 002 ensures no POST/PUT/PATCH/DELETE handler can be registered; this ticket's routes are all GET. The data path returns parsed bodies as-is; no field synthesis, no canon mutation.

## Assumption Reassessment (2026-05-26)

1. Live package proof uses TypeScript plus Node's built-in test runner (`npm run build && node --test "dist/test/**/*.test.js"`), not Vitest. The targeted route proof is the compiled Node test file `dist/test/routes.test.js`; the package wrapper still runs the full compiled glob.
2. Tickets 005-007 landed the required read helpers and HTTP bootstrap. Reassessment found one same-seam prerequisite in `record-io.ts`: `SLB`, `SAU`, `SP`, and `RSP` are not `_source/*.yaml` records in this v1 surface, so route implementation also needed direct markdown lookup for `storylet-batches/`, `audits/`, `story-promotions/`, and nested remediation proposal cards.
3. The implementation remains read-only by construction: all route registrations are GET, route bodies use existing read helpers plus direct `readFile` artifact reads, and no package dependency or production code path imports patch-engine, world-mcp, ID allocation, index refresh, or filesystem write APIs.

## Architecture Check

1. The four route files (pages / records / prose / provenance) each handle one route family with a thin handler body. The records route is the largest because it carries the 27-class validation logic; isolating it in `records.ts` keeps the diff reviewable. The prose route file handles three endpoint paths (prose / page-plans / prose-receipts) because they share the same direct-file-read pattern with different file paths.
2. No backwards-compatibility shims. The routes are wholly new.

## Verification Layers

1. Page-detail route returns correct PageDetail → compiled Node test (issues `GET /api/worlds/fixture-world/stories/red-bunny/pages/PG-1`; asserts PageDetail shape, prose status, and choice navigation)
2. Record route validates against full 27-class set → compiled Node test (issues valid-class missing-record probes to prove no valid class is rejected at validation; issues `GET /api/.../records/SLB-1` with `storySlug` → returns SLB body via direct-file-read; issues `GET /api/.../records/INVALID-1` → returns `invalid_input` envelope error)
3. Record route requires storySlug for story-bundle IDs → compiled Node test (mirrors `get-record.ts:244-252` gate behavior with a missing-`storySlug` invalid-input route)
4. FOUNDATIONS §Story Bundles §3 + §6 alignment → FOUNDATIONS alignment check (the 27-class validation list matches §6 exactly; the `story_slug` gate matches §3's "scoped reads with explicit story_slug" requirement)
5. HARD-GATE surface (per the just-amended §3.9 / §4.4 trigger covering HTTP read-backends) → manual review (route handlers return parsed bodies without filtering or synthesizing fields; no canon mutation path exists; Mystery Reserve firewall is structurally preserved because reads don't resolve mysteries)

## Landed Changes

### 1. Page-detail route

- `tools/story-explorer/src/server/routes/pages.ts` exports `registerPageRoutes(server)`. It mounts:
  - `GET /api/worlds/:slug/stories/:storySlug/pages?root&latest&list` → returns `PageSummary[]` (root → just PG-1; latest → highest turn_index; list → all PG summaries). Calls `getPageSummaries` from ticket 004's `story-list.ts`.
  - `GET /api/worlds/:slug/stories/:storySlug/pages/:pageId` → returns `PageDetail`. Calls `getPageDetail` from ticket 005.

### 2. Record-fetch route with full 27-class validation

- `tools/story-explorer/src/server/routes/records.ts` exports `registerRecordRoutes(server)`. It mounts:
  - `GET /api/worlds/:slug/stories/:storySlug/records/:recordId` → validates `recordId` against the full FOUNDATIONS §6 27-class set: 23 indexed classes (PG, SE, BEL, SF, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STCHAR, STLOC, STOBJ, CLK, STSEC, STQ, STPLAN, STEMO, BR, CHC, SLT, DA) routing to indexed-node retrieval; 4 direct-file-read classes (SLB, SAU, SP, RSP) routing to `readRawRecord` from ticket 005. Validates `story_slug` is present per the §3 read discipline; returns `invalid_input` envelope error otherwise. Returns parsed body + RecordCard summary via ticket 006's `buildRecordCard`.
  - `GET /api/worlds/:slug/stories/:storySlug/records/:recordId/raw` → returns raw body + content hash + source path via `readRawRecord`.

### 3. Prose / page-plan / prose-receipt routes

- `tools/story-explorer/src/server/routes/prose.ts` exports `registerProseRoutes(server)`. It mounts:
  - `GET /api/worlds/:slug/stories/:storySlug/prose/:pageId` → returns rendered markdown body + proseStatus via `readProse` from ticket 005 (use case per SPEC-87 §5 reassessment M4: SPEC-88's `<ProsePanel>` lazy-fetches when PageSummary chrome was rendered first).
  - `GET /api/worlds/:slug/stories/:storySlug/page-plans/:pageId` → returns page-plan body via direct file read of `pages-prose-plans/PG-<n>.md` (use case per M4: SPEC-89's Plan & Prose tab on-demand fetch).
  - `GET /api/worlds/:slug/stories/:storySlug/prose-receipts/:pageId` → returns parsed receipt YAML via direct file read of `pages-prose-receipts/PG-<n>.yaml` (use case per M4: SPEC-89's Validation & Integrity tab on-demand fetch).

### 4. Provenance route

- `tools/story-explorer/src/server/routes/provenance.ts` exports `registerProvenanceRoutes(server)`. It mounts:
  - `GET /api/worlds/:slug/stories/:storySlug/provenance/:recordId` → returns `{ creatingSeId, modifyingSeIds, evidenceRecords }` via `getRecordProvenance` from ticket 005 (mirrors `tools/world-mcp/src/tools/get-story-state-provenance.ts:83-118` edge-walk logic).

### 5. Route registration and direct markdown lookup

- `tools/story-explorer/src/server/http.ts` calls `registerPageRoutes`, `registerRecordRoutes`, `registerProseRoutes`, and `registerProvenanceRoutes` after the base routes from 007.
- `tools/story-explorer/src/read/record-io.ts` now resolves `SLB`, `SAU`, `SP`, and `RSP` direct markdown paths before falling back to atomic story `_source/*.yaml` paths, and parses YAML frontmatter markdown records for RecordCard input.

### 6. Tests

- `tools/story-explorer/test/routes.test.ts` covers page/list/detail routes, full 27-class record-id validation, missing-story-slug invalid-input handling, SLB/RSP direct markdown paths, prose/page-plan/prose-receipt direct reads, and provenance edge walking.

## Files to Touch

- `tools/story-explorer/src/server/routes/pages.ts` (new)
- `tools/story-explorer/src/server/routes/records.ts` (new)
- `tools/story-explorer/src/server/routes/prose.ts` (new)
- `tools/story-explorer/src/server/routes/provenance.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify)
- `tools/story-explorer/src/read/record-io.ts` (modify)
- `tools/story-explorer/test/routes.test.ts` (new)

## Out of Scope

- Search / branch-map routes (ticket 009)
- Capstone integration test (ticket 010)
- Frontend client code consuming these endpoints (SPEC-88 / SPEC-89)
- Spoiler protection — explicitly out per SPEC-87 §2 Named Assumption D and per FOUNDATIONS §Story Bundles §6b firewall (firewall enforcement is a story-pipeline authoring concern, not a viewer concern).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build && node --test dist/test/routes.test.js` — page / record / prose / provenance route tests all pass.
2. Records route accepts all 27 FOUNDATIONS §6 story-bundle classes; rejects invalid prefixes with structured `invalid_input` envelope error.
3. SLB / SAU / SP / RSP IDs route to direct-file-read code paths and return parsed bodies (not indexed-node bodies, since they're not in the parser layer).
4. Records route requires `story_slug`; missing slug returns structured error matching `tools/world-mcp/src/tools/get-record.ts:244-252` behavior.

### Invariants

1. Records route validation set MUST cover all 27 FOUNDATIONS §6 story-bundle classes (per the SPEC-87 reassessment I1 correction); silent rejection of valid classes is a Rule 6 regression.
2. All routes MUST be GET (Layer 2 fence enforced at ticket 007's server bootstrap).
3. Records route MUST NOT filter or transform record bodies based on mystery-resolution status (FOUNDATIONS §Story Bundles §6b firewall is authoring-time, not viewer-time per SPEC-87 §2 Named Assumption D).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/routes.test.ts` — page-detail + page-list routes, 27-class validation + storySlug gate + SLB/SAU/SP/RSP direct-file-read routing, prose / page-plan / prose-receipt direct-file-read, and provenance edge walk.

### Commands

1. `cd tools/story-explorer && npm run build && node --test dist/test/routes.test.js` (targeted: route surface)
2. `cd tools/story-explorer && npm test` (full-pipeline)

## Outcome

Completed 2026-05-26. Added the page, record, prose/page-plan/prose-receipt, and provenance HTTP route modules and registered them in the Fastify server after the base routes. The records route validates the full 27-class story-bundle/audit/promotion ID set, rejects invalid prefixes with a structured `invalid_input` envelope, and exposes a missing-`storySlug` invalid-input route for bundle-scoped record IDs.

Extended `record-io.ts` so direct-read markdown classes (`SLB`, `SAU`, `SP`, `RSP`) resolve to their story-bundle artifact locations and parse YAML frontmatter without treating those files as `_source/*.yaml` records. Added a consolidated compiled Node route test covering page summaries/detail, record validation/direct markdown, direct prose/plan/receipt reads, and provenance edge walking.

## Verification Result

1. `cd tools/story-explorer && npm run build` — passed.
2. `cd tools/story-explorer && node --test dist/test/routes.test.js` — passed: 3 tests, 3 pass.
3. `cd tools/story-explorer && npm test` — passed: 62 tests, 62 pass.
4. Manual FOUNDATIONS / HARD-GATE alignment check: all new route registrations are GET-only, direct reads are read-only artifact reads, no route filters or transforms record bodies based on Mystery Reserve status, and no mutation package or index-refresh path was introduced.

## Deviations

1. Drafted Vitest / `npm test -- routes` proof wording was corrected to the live compiled Node test runner. The package wrapper runs the full compiled glob; the truthful targeted proof is `npm run build && node --test dist/test/routes.test.js`.
2. The four drafted route test files were consolidated into `tools/story-explorer/test/routes.test.ts` because one fixture-backed compiled Node file covers the shared HTTP server envelope and the route families together without duplicate setup.
3. Same-seam direct-read fallout landed in `record-io.ts` so `SLB`, `SAU`, `SP`, and `RSP` route through markdown artifact paths per SPEC-87 §7 rather than the atomic `_source/*.yaml` map used by indexed story records.
