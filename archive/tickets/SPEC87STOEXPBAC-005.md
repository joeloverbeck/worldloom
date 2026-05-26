# SPEC87STOEXPBAC-005: Page read path

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/src/view-models/page-detail.ts` + `choice-navigation.ts` + `child-outcome-variant.ts` + `src/read/record-io.ts` + `page-detail.ts` + `prose-direct.ts` + `raw-yaml.ts` + `provenance.ts` + package YAML dependency.
**Deps**: archive/tickets/SPEC87STOEXPBAC-001.md, archive/tickets/SPEC87STOEXPBAC-003.md, archive/tickets/SPEC87STOEXPBAC-004.md

## Problem

SPEC-87 §4 specifies `PageDetail` as the central view-model the SPEC-88 reading-page surface consumes: the full PG record, rendered prose body (or `proseStatus` discriminator if absent), page-plan summary, receipt summary, navigable choices with multi-outcome variants, currentStateRecordIds passthrough, event delta summary, validation-integrity summary, branch context, and raw-source references with content hashes. The PageDetail assembly composes indexed PG retrieval, direct prose/plan/receipt file reads (per SPEC-87 §7 source priority), and SE-provenance edge walks mirroring `tools/world-mcp/src/tools/get-story-state-provenance.ts:83-118`. This is the largest single read-path ticket because it composes most of the explorer's deterministic-summary surfaces.

## Assumption Reassessment (2026-05-25)

1. PG schema (brainstorm-verified at `tools/validators/src/schemas/story-page.schema.json`, reassess-verified) provides: `id`, `story_id`, `branch_id`, `parent_page_id`, `branch_path`, `turn_index`, `input.choice_id`, `input.manual_action_text`, `input.resolved_event_id`, `state_snapshot.active_records`, `state_snapshot.visible_affordances`, `emitted_choices`, `plan.plan_hash`, `validation_trace`. The SPEC-87 reassessment correction noted `prose_plan_path` is top-level on PG (not nested under `plan`); however the explorer constructs the plan path deterministically from `pages-prose-plans/PG-<n>.md` rather than reading the PG field, so this nuance doesn't propagate. SE schema (brainstorm-verified at `tools/validators/src/schemas/story-event.schema.json`) provides `actor`, `targets`, `commitment.selected_slt_id`, `turn_driver`, `outcome_route`, `resolution`, `world_logic_rationale`, `state_delta.create/supersede/close`, `record_introductions`, `state_relations`, `non_propagation_facts`, `promotion_claims`. CHC schema (brainstorm-verified) carries `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `grounded_in`, `created_at_page` — no `child_page_pointer`, so child navigation derives from scanning PG records whose `parent_page_id` + `input.choice_id` match.
2. SPEC-87 §4 PageDetail / ChoiceNavigation / ChildOutcomeVariant field sets specified; §7 source-priority rules specified (PG via indexed retrieval, prose/plan/receipt via direct file reads, edges via SQLite). The reassessment M3 `terminalReason` discriminator is computed here as part of PageSummary derivation (which 004 defines the type for; this ticket's PageDetail consumes it indirectly via the `isLeaf`/`isTerminalOrPaused`/`terminalReason` triple).
3. Cross-skill boundary: the PG / SE / CHC schema contract is the shared boundary under audit. This ticket's `page-detail.ts` reads PG bodies via indexed retrieval (or direct YAML fallback), parses them per the validator schemas, derives `ChoiceNavigation` by scanning child PGs that match each CHC, and derives `ChildOutcomeVariant` by reading each child PG's resolved SE for the outcome-route + resolution-preview surface SPEC-88's UI displays. Deviation from the schema would silently break the UI's choice-navigation discrimination.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): PG is the page authority; rendered prose is a renderable receipt artifact, not a second state engine. This ticket's `proseStatus` discriminator (`present` / `missing` / `unreadable` / `hash_mismatch`) is the structural enforcement: PageDetail always returns regardless of prose presence; the discriminator tells SPEC-88's `<ProsePanel>` whether to render the literary body or the polished missing-prose placeholder. PageDetail assembly MUST succeed for a missing-prose page — the principle's "prose is optional artifact" guarantee is the UX contract.

## Assumption Reassessment (2026-05-26)

1. Archived dependencies 001/003/004 landed the package skeleton, `IndexStatus`, repo-root helpers, and enumeration read path. The live package uses TypeScript plus Node's built-in test runner (`npm run build && node --test "dist/test/**/*.test.js"`), not Vitest; the targeted proof commands below are corrected to `npm run build` followed by direct compiled Node test files.
2. The page read path needs a small shared same-package record helper (`src/read/record-io.ts`) so PageDetail, raw-source reads, and later record-card work use the same story-bundle source-directory map and YAML/JSON parsing boundary. This is same-seam fallout from implementing the drafted `raw-yaml.ts` and `page-detail.ts` helpers, not a new public route or frontend surface.
3. The ticket remains read-only by construction: it uses `openExistingIndex()` for indexed reads, direct `readFile`/`readdir` for story-bundle artifacts, and no patch-engine, world-mcp, subprocess refresh, ID allocation, or filesystem writes in production code.

## Architecture Check

1. PageDetail assembly is the largest read-path composition in the explorer; centralizing it in one module (`page-detail.ts`) with smaller helper modules per source (record-io, prose-direct, raw-yaml, provenance) keeps the diff reviewable per-source. The `proseStatus` discriminator is structurally separable from the PG body — missing prose is a first-class state per SPEC-87 §2 / FOUNDATIONS §4a, not an error.
2. No backwards-compatibility shims. The page read path is wholly new.

## Verification Layers

1. PageDetail assembly with all artifacts present → Node test (uses a temp story fixture's PG-1; asserts PageDetail returns with `proseStatus: 'present'`, plan summary, receipt summary, choice navigation, etc.)
2. PageDetail with missing prose → Node test (uses a fixture variant with `pages-prose/PG-1.md` absent; asserts `proseStatus: 'missing'`, PageDetail still returns successfully, all other fields populated)
3. Multi-outcome choice navigation → Node test (uses a fixture with one CHC and 3 child PGs matching it; asserts `ChoiceNavigation.childOutcomeVariants.length === 3`, each variant carries its `pageId`/`branchId`/`outcomeRoute` from the resolved SE)
4. Provenance edge walk → Node test (mocks indexed `state_delta_create` / `state_delta_supersede` / `creation_evidence` edges; asserts the provenance helper returns the creating SE + modifying SE list + evidence records correctly)
5. FOUNDATIONS §Story Bundles §4a alignment → manual review (PageDetail returns successfully for missing-prose pages; `proseStatus` discriminator is the first-class state surface; PG remains the page authority; rendered prose never blocks PageDetail return)

## What to Change

### 1. Implement page view-models

- `tools/story-explorer/src/view-models/page-detail.ts` — exports `PageDetail` type per SPEC-87 §4 (page, prose, proseStatus, pagePlanSummary, receiptSummary, choiceNavigation, currentStateRecordIds, eventDelta, validationIntegrity, branchContext, rawSources) plus the supporting `ProseStatus`, `PagePlanSummary`, `ReceiptSummary`, `EventDeltaSummary`, `ValidationIntegritySummary`, `BranchContext`, `RawSourceReference` types.
- `tools/story-explorer/src/view-models/choice-navigation.ts` — exports `ChoiceNavigation` per SPEC-87 §4 (`choiceId`, `surfaceLabel`, `playerVisibleIntent`, `pressure`, `groundedInCount`, `childOutcomeVariants`, `isNavigable`).
- `tools/story-explorer/src/view-models/child-outcome-variant.ts` — exports `ChildOutcomeVariant` per SPEC-87 §4 (`pageId`, `branchId`, `turnIndex`, `resolvedEventId`, `outcomeRoute`, `resolutionPreview`, `selectedStoryletId`, `hasRenderedProse`, `stateDeltaCounts`).
- `tools/story-explorer/src/read/record-io.ts` — exports story-bundle record path, parser, class-directory map, index-row, and direct-read helpers used by the PageDetail and raw-source helpers.

### 2. Implement direct-file-read helpers

- `tools/story-explorer/src/read/prose-direct.ts` — exports `readProse(worldSlug, storySlug, pageId): Promise<{ body: string | null; status: ProseStatus }>`. Reads `pages-prose/PG-<n>.md`. Returns `{ body: <content>, status: 'present' }` on success; `{ body: null, status: 'missing' }` on ENOENT; `{ body: null, status: 'unreadable' }` on other errors; `{ body: <content>, status: 'hash_mismatch' }` when the receipt is present AND its declared state_hash mismatches the recomputed hash.
- `tools/story-explorer/src/read/raw-yaml.ts` — exports `readRawRecord(worldSlug, storySlug, recordId): Promise<{ body: string; sourcePath: string; contentHash: string }>`. Reads `_source/<class-from-id>/<recordId>.yaml` directly; computes sha256 content hash.

### 3. Implement provenance helper

- `tools/story-explorer/src/read/provenance.ts` — exports `getRecordProvenance(worldSlug, storySlug, recordId): Promise<{ creatingSeId: string | null; modifyingSeIds: string[]; evidenceRecords: string[] }>`. Mirrors the edge-walk logic at `tools/world-mcp/src/tools/get-story-state-provenance.ts:83-118` — queries indexed edges via `better-sqlite3` (per ticket 003's connection pattern): `state_delta_create` edges to `recordId` → creating SE; `state_delta_supersede` edges to `recordId` → modifying SE list; `creation_evidence` edges from `recordId` → evidence records.

### 4. Implement page-detail assembly

- `tools/story-explorer/src/read/page-detail.ts` — exports `getPageDetail(worldSlug, storySlug, pageId): Promise<PageDetail>`. Composes: PG body via indexed retrieval (or direct YAML fallback when stale), prose via `readProse`, plan body via direct read of `pages-prose-plans/PG-<n>.md`, receipt via direct read of `pages-prose-receipts/PG-<n>.yaml`, choiceNavigation by scanning child PGs (`parent_page_id === pageId`) and grouping by `input.choice_id` → CHC, childOutcomeVariants by reading each child PG's `input.resolved_event_id` → SE → `outcome_route` + `resolution`, eventDelta by reading the current page's `input.resolved_event_id` → SE → `state_delta` + `record_introductions` + `state_relations`, validationIntegrity by reading the PG `validation_trace` + receipt verdict + hash status, branchContext by walking `branch_path`, rawSources by enumerating the active records' source paths + content hashes.

### 5. Tests

- `tools/story-explorer/test/page-detail.test.ts` — full PageDetail assembly against red-bunny fixture; assertions on every field's presence and correct value.
- `tools/story-explorer/test/missing-prose.test.ts` — PageDetail return when prose is absent; asserts `proseStatus: 'missing'`, other fields populated.

## Files to Touch

- `tools/story-explorer/src/view-models/page-detail.ts` (new)
- `tools/story-explorer/src/view-models/choice-navigation.ts` (new)
- `tools/story-explorer/src/view-models/child-outcome-variant.ts` (new)
- `tools/story-explorer/src/read/record-io.ts` (new)
- `tools/story-explorer/src/read/prose-direct.ts` (new)
- `tools/story-explorer/src/read/raw-yaml.ts` (new)
- `tools/story-explorer/src/read/provenance.ts` (new)
- `tools/story-explorer/src/read/page-detail.ts` (new)
- `tools/story-explorer/test/page-detail.test.ts` (new)
- `tools/story-explorer/test/missing-prose.test.ts` (new)
- `tools/story-explorer/package.json` / `package-lock.json` (modify only if a direct YAML parser dependency is needed by the shared read helper)

## Out of Scope

- Record card data path + per-class deterministic summaries (ticket 006 — `record-card.ts` consumes `raw-yaml.ts` from this ticket but adds the deterministic-summary layer separately)
- HTTP routes consuming PageDetail (tickets 007-008)
- Frontend rendering of any PageDetail field (SPEC-88 / SPEC-89 scope)
- Hash mismatch resolution (the discriminator is set; the resolution UX is SPEC-89's Validation & Integrity tab)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build && node --test dist/test/page-detail.test.js` — full PageDetail assembly succeeds against a temp story fixture with all fields populated.
2. `cd tools/story-explorer && npm run build && node --test dist/test/missing-prose.test.js` — PageDetail returns successfully when prose is absent; `proseStatus: 'missing'`.
3. Multi-outcome choice navigation test asserts childOutcomeVariants.length matches the child-PG count for a multi-outcome CHC.

### Invariants

1. PageDetail assembly MUST succeed for missing-prose pages (FOUNDATIONS §Story Bundles §4a: prose is optional artifact, PG is page authority).
2. `proseStatus` discriminator MUST be one of the 4 variants per SPEC-87 §4 (`present` / `missing` / `unreadable` / `hash_mismatch`); the discriminator never maps to a generic "error" state that blocks the frontend.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/page-detail.test.ts` — full assembly test + per-field assertions.
2. `tools/story-explorer/test/missing-prose.test.ts` — first-class missing-prose state.

### Commands

1. `cd tools/story-explorer && npm run build && node --test dist/test/page-detail.test.js` (targeted: page-detail assembly)
2. `cd tools/story-explorer && npm run build && node --test dist/test/missing-prose.test.js` (targeted: missing-prose)
3. `cd tools/story-explorer && npm test` (full-pipeline)

## Outcome

Completed 2026-05-26. Added PageDetail, ChoiceNavigation, and ChildOutcomeVariant view-model types; added shared `record-io` parsing/source-path/index helpers; added direct prose, raw-record, provenance, and PageDetail read primitives. PageDetail now composes indexed PG reads when the index is fresh, direct story-bundle artifact reads for prose/plan/receipt/raw sources, multi-outcome CHC child navigation, current-state record IDs, event-delta summaries, validation-integrity summaries, branch context, and raw-source content hashes.

Added fixture-backed compiled Node tests for full PageDetail assembly, multi-outcome navigation, provenance edge walking, and missing-prose first-class behavior. Added `yaml` as a direct `tools/story-explorer` dependency because production read helpers parse YAML bodies directly instead of relying on a transitive package.

## Verification Result

1. `cd tools/story-explorer && npm run build` — passed.
2. `cd tools/story-explorer && node --test dist/test/page-detail.test.js` — passed: 2 tests, 2 pass.
3. `cd tools/story-explorer && node --test dist/test/missing-prose.test.js` — passed: 1 test, 1 pass.
4. `cd tools/story-explorer && npm test` — passed: 21 tests, 21 pass.
5. Manual FOUNDATIONS alignment check: missing prose returns `proseStatus: "missing"` with a usable PageDetail; PG remains the page authority and rendered prose does not block page access.

## Deviations

1. Drafted Vitest proof wording was corrected to the live compiled Node test runner.
2. The original red-bunny fixture reference was implemented as temp story fixtures because this public checkout has no live `worlds/erotica-world/stories/red-bunny/` tree.
3. A shared `record-io.ts` helper and direct `yaml` dependency were added as same-seam implementation fallout so direct raw reads, parsed record bodies, and future record-card work share one source-directory/parser boundary.
4. `npm install` reported one high-severity audit item in the package dependency tree; dependency remediation is outside this ticket.
