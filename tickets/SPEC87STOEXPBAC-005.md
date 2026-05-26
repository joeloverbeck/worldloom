# SPEC87STOEXPBAC-005: Page read path

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/src/view-models/page-detail.ts` + `choice-navigation.ts` + `child-outcome-variant.ts` + `src/read/page-detail.ts` + `prose-direct.ts` + `raw-yaml.ts` + `provenance.ts`.
**Deps**: archive/tickets/SPEC87STOEXPBAC-001.md, archive/tickets/SPEC87STOEXPBAC-003.md, SPEC87STOEXPBAC-004

## Problem

SPEC-87 §4 specifies `PageDetail` as the central view-model the SPEC-88 reading-page surface consumes: the full PG record, rendered prose body (or `proseStatus` discriminator if absent), page-plan summary, receipt summary, navigable choices with multi-outcome variants, currentStateRecordIds passthrough, event delta summary, validation-integrity summary, branch context, and raw-source references with content hashes. The PageDetail assembly composes indexed PG retrieval, direct prose/plan/receipt file reads (per SPEC-87 §7 source priority), and SE-provenance edge walks mirroring `tools/world-mcp/src/tools/get-story-state-provenance.ts:83-118`. This is the largest single read-path ticket because it composes most of the explorer's deterministic-summary surfaces.

## Assumption Reassessment (2026-05-25)

1. PG schema (brainstorm-verified at `tools/validators/src/schemas/story-page.schema.json`, reassess-verified) provides: `id`, `story_id`, `branch_id`, `parent_page_id`, `branch_path`, `turn_index`, `input.choice_id`, `input.manual_action_text`, `input.resolved_event_id`, `state_snapshot.active_records`, `state_snapshot.visible_affordances`, `emitted_choices`, `plan.plan_hash`, `validation_trace`. The SPEC-87 reassessment correction noted `prose_plan_path` is top-level on PG (not nested under `plan`); however the explorer constructs the plan path deterministically from `pages-prose-plans/PG-<n>.md` rather than reading the PG field, so this nuance doesn't propagate. SE schema (brainstorm-verified at `tools/validators/src/schemas/story-event.schema.json`) provides `actor`, `targets`, `commitment.selected_slt_id`, `turn_driver`, `outcome_route`, `resolution`, `world_logic_rationale`, `state_delta.create/supersede/close`, `record_introductions`, `state_relations`, `non_propagation_facts`, `promotion_claims`. CHC schema (brainstorm-verified) carries `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `grounded_in`, `created_at_page` — no `child_page_pointer`, so child navigation derives from scanning PG records whose `parent_page_id` + `input.choice_id` match.
2. SPEC-87 §4 PageDetail / ChoiceNavigation / ChildOutcomeVariant field sets specified; §7 source-priority rules specified (PG via indexed retrieval, prose/plan/receipt via direct file reads, edges via SQLite). The reassessment M3 `terminalReason` discriminator is computed here as part of PageSummary derivation (which 004 defines the type for; this ticket's PageDetail consumes it indirectly via the `isLeaf`/`isTerminalOrPaused`/`terminalReason` triple).
3. Cross-skill boundary: the PG / SE / CHC schema contract is the shared boundary under audit. This ticket's `page-detail.ts` reads PG bodies via indexed retrieval (or direct YAML fallback), parses them per the validator schemas, derives `ChoiceNavigation` by scanning child PGs that match each CHC, and derives `ChildOutcomeVariant` by reading each child PG's resolved SE for the outcome-route + resolution-preview surface SPEC-88's UI displays. Deviation from the schema would silently break the UI's choice-navigation discrimination.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): PG is the page authority; rendered prose is a renderable receipt artifact, not a second state engine. This ticket's `proseStatus` discriminator (`present` / `missing` / `unreadable` / `hash_mismatch`) is the structural enforcement: PageDetail always returns regardless of prose presence; the discriminator tells SPEC-88's `<ProsePanel>` whether to render the literary body or the polished missing-prose placeholder. PageDetail assembly MUST succeed for a missing-prose page — the principle's "prose is optional artifact" guarantee is the UX contract.

## Architecture Check

1. PageDetail assembly is the largest read-path composition in the explorer; centralizing it in one module (`page-detail.ts`) with smaller helper modules per source (prose-direct, raw-yaml, provenance) keeps the diff reviewable per-source. The `proseStatus` discriminator is structurally separable from the PG body — missing prose is a first-class state per SPEC-87 §2 / FOUNDATIONS §4a, not an error.
2. No backwards-compatibility shims. The page read path is wholly new.

## Verification Layers

1. PageDetail assembly with all artifacts present → vitest test (uses the red-bunny fixture's PG-1; asserts PageDetail returns with `proseStatus: 'present'`, plan summary, receipt summary, choice navigation, etc.)
2. PageDetail with missing prose → vitest test (uses a fixture variant with `pages-prose/PG-1.md` removed; asserts `proseStatus: 'missing'`, PageDetail still returns successfully, all other fields populated)
3. Multi-outcome choice navigation → vitest test (uses a fixture with one CHC and 3 child PGs matching it; asserts `ChoiceNavigation.childOutcomeVariants.length === 3`, each variant carries its `pageId`/`branchId`/`outcomeRoute` from the resolved SE)
4. Provenance edge walk → vitest test (mocks indexed `state_delta_create` / `state_delta_supersede` / `creation_evidence` edges; asserts the provenance helper returns the creating SE + modifying SE list + evidence records correctly)
5. FOUNDATIONS §Story Bundles §4a alignment → manual review (PageDetail returns successfully for missing-prose pages; `proseStatus` discriminator is the first-class state surface; PG remains the page authority; rendered prose never blocks PageDetail return)

## What to Change

### 1. Implement page view-models

- `tools/story-explorer/src/view-models/page-detail.ts` — exports `PageDetail` type per SPEC-87 §4 (page, prose, proseStatus, pagePlanSummary, receiptSummary, choiceNavigation, currentStateRecordIds, eventDelta, validationIntegrity, branchContext, rawSources) plus the supporting `ProseStatus`, `PagePlanSummary`, `ReceiptSummary`, `EventDeltaSummary`, `ValidationIntegritySummary`, `BranchContext`, `RawSourceReference` types.
- `tools/story-explorer/src/view-models/choice-navigation.ts` — exports `ChoiceNavigation` per SPEC-87 §4 (`choiceId`, `surfaceLabel`, `playerVisibleIntent`, `pressure`, `groundedInCount`, `childOutcomeVariants`, `isNavigable`).
- `tools/story-explorer/src/view-models/child-outcome-variant.ts` — exports `ChildOutcomeVariant` per SPEC-87 §4 (`pageId`, `branchId`, `turnIndex`, `resolvedEventId`, `outcomeRoute`, `resolutionPreview`, `selectedStoryletId`, `hasRenderedProse`, `stateDeltaCounts`).

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
- `tools/story-explorer/src/read/prose-direct.ts` (new)
- `tools/story-explorer/src/read/raw-yaml.ts` (new)
- `tools/story-explorer/src/read/provenance.ts` (new)
- `tools/story-explorer/src/read/page-detail.ts` (new)
- `tools/story-explorer/test/page-detail.test.ts` (new)
- `tools/story-explorer/test/missing-prose.test.ts` (new)

## Out of Scope

- Record card data path + per-class deterministic summaries (ticket 006 — `record-card.ts` consumes `raw-yaml.ts` from this ticket but adds the deterministic-summary layer separately)
- HTTP routes consuming PageDetail (tickets 007-008)
- Frontend rendering of any PageDetail field (SPEC-88 / SPEC-89 scope)
- Hash mismatch resolution (the discriminator is set; the resolution UX is SPEC-89's Validation & Integrity tab)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test -- page-detail` — full PageDetail assembly succeeds against red-bunny fixture with all fields populated.
2. `cd tools/story-explorer && npm test -- missing-prose` — PageDetail returns successfully when prose is absent; `proseStatus: 'missing'`.
3. Multi-outcome choice navigation test asserts childOutcomeVariants.length matches the child-PG count for a multi-outcome CHC.

### Invariants

1. PageDetail assembly MUST succeed for missing-prose pages (FOUNDATIONS §Story Bundles §4a: prose is optional artifact, PG is page authority).
2. `proseStatus` discriminator MUST be one of the 4 variants per SPEC-87 §4 (`present` / `missing` / `unreadable` / `hash_mismatch`); the discriminator never maps to a generic "error" state that blocks the frontend.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/page-detail.test.ts` — full assembly test + per-field assertions.
2. `tools/story-explorer/test/missing-prose.test.ts` — first-class missing-prose state.

### Commands

1. `cd tools/story-explorer && npm test -- page-detail` (targeted: page-detail assembly)
2. `cd tools/story-explorer && npm test -- missing-prose` (targeted: missing-prose)
3. `cd tools/story-explorer && npm test` (full-pipeline)
