# SPEC46STOPIPMAC-002: Add actor-bound MCP summaries (active_intentions, active_statuses)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (extends `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new builders + wiring), story-bundle context fixture/tests, and a SPEC-46 implementation note
**Deps**: None

## Problem

The story-bundle context-packet projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486` (`buildStoryBundleContext`) currently projects twelve summary fields covering storylets, obligations, threads, clocks, secrets, story questions, branch path, recent pages, mysteries in play, mystery evidence chains, cast bind list, and acknowledged invariants. It does not surface active `STINT` (intentions) or active `STSTAT` (entity status), even though both are core actor-bound state classes consumed by turn-cycle eligibility scoring (`STINT`) and entity life/agency/location predicates (`STSTAT`). Skills needing this state fall back on raw file reads (blocked by Hook 2 for oversized `_source/<class>/*.yaml` reads, then routed to per-id `get_record`), which violates the FOUNDATIONS §Tooling Recommendation promise that skills receive needed context "directly or via the documented context-packet + targeted-retrieval pattern". This ticket adds the two simplest actor-bound projections; the grouped and scoped summaries land in sibling tickets 003 and 004.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/context-packet/shared.ts:97` declares `ContextPacketStoryBundleContext`; line 67 declares `ContextPacketStoryBundleContextSummary`. The existing builder pattern at `tools/world-mcp/src/context-packet/story-bundle-context.ts:213-242` (`buildActiveThreads` / `buildActiveClocks`) is the model for new builders. `STINT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.2 carries `id`, `story_id`, `created_at_page`, `supersedes`, `holder`, `intent`, `urgency: low | medium | high`, `expires_when`. `STSTAT` schema (story-state-contract.md §3 confirms `entity_status` is its purpose; story-record-schemas.md §4.5.x carries `entity` + `life` + `agency` + `location` fields per SPEC-44 lifecycle).
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B table specifies `active_intentions: [{id, holder, intent, urgency, expires_when}]` and `active_statuses: [{entity, life, agency, location}]` — every field has a named retrieval-surface consumer per the spec's per-class load-bearing table.
3. Cross-skill boundary: the MCP context-packet contract is consumed by `branching-story-turn-cycle` (eligibility scoring for `intention_active` / `entity_status` predicates per `story-state-contract.md` §5) and by `branching-story-health-audit` (stale-intention detection, life/agency consistency checks). Adding the new fields is additive — consumers that don't request the new field set continue to work unchanged.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates the field selection: every emitted field is consumed by a named retrieval-surface consumer per the Phase B table. No nice-to-have fields are included. The two projections also align with §Tooling Recommendation by making queryable state previously requiring raw-file reads or per-id `get_record` round-trips.
5. Baseline proof before implementation: `npm test --prefix tools/world-mcp` passed with 405 passing tests. Package ignored artifacts (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`) were pre-existing/expected package-local artifacts and are not tracked owned edits.
6. Live fixture/proof reassessment added `tools/world-mcp/tests/tools/story-bundle-fixture.ts`, `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts`, and `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` to the owned surface. The shared story-bundle fixture needed a representative `STINT` row so the new intention projection could be tested, the persisted summary test needed the two new summary fallback fields, and the existing lexical-search fixture expectation needed to include the new `STINT-1` row because its body legitimately matches the shared `"loft"` query.
7. Same-seam spec truthing: `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` is the originating authority and contains broad current-state absence prose for all seven Phase B summaries. This ticket added a dated implementation note for the two actor-bound summaries rather than rewriting the remaining broad proposal text, because sibling tickets 003-015 still own the rest of the spec.

## Architecture Check

1. The two builders mirror the existing `buildActiveThreads` / `buildActiveClocks` pattern at `story-bundle-context.ts:213-242` — same `StoryNodeRow[]` input, same `parseYamlRecord` / `asString` / `asNullableString` helper usage, same node-type filter via `rowsForNodeType`. Adding parallel builders preserves the file's structural consistency without inventing new abstraction. Alternative considered: synthesize all seven Phase B summaries into one mega-builder — rejected because per-summary tickets keep each addition independently reviewable and each summary's consumer set is distinct.
2. No backwards-compatibility aliasing or shims introduced. The new summary fields are additive fields on `ContextPacketStoryBundleContext`, following the existing required-field style for story-bundle context objects. The parallel `active_intention_ids` and `active_status_entities` summary fields on `ContextPacketStoryBundleContextSummary` follow the existing `open_obligation_ids` pattern.

## Verification Layers

1. **Field-set fidelity** → schema validation: per-summary fixture tests assert the projection emits exactly the field set specified in the Phase B table for each summary (corresponds to spec test T-3 scope).
2. **Summary-fallback parity** → codebase grep-proof: `active_intention_ids` and `active_status_entities` enumerate exactly the ids of the records the full summary projects (corresponds to spec test T-4 scope).
3. **Token-budget integration** → existing budget pattern preservation: per-field omission under budget pressure is the existing pattern at `buildStoryBundleContext` — confirm new fields participate in the same omission path (manual review of the wiring change).
4. **No regression on existing summaries** → `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.

## Landed Changes

### 1. Extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` type declarations

In `tools/world-mcp/src/context-packet/shared.ts`, `ContextPacketStoryBundleContext` now includes the two actor-bound projection fields:

```typescript
active_intentions: Array<{
  id: string;
  holder: string;
  intent: string;
  urgency: "low" | "medium" | "high";
  expires_when: string;
}>;
active_statuses: Array<{
  entity: string;
  life: string;
  agency: string;
  location: string;
}>;
```

`ContextPacketStoryBundleContextSummary` now includes the parallel summary fallback fields:

```typescript
active_intention_ids: string[];
active_status_entities: string[];
```

### 2. Implemented two new builder functions

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, `buildActiveIntentions(rows: StoryNodeRow[])` and `buildActiveStatuses(rows: StoryNodeRow[])` parse the indexed YAML rows and project only the Phase B field sets named above. `urgency` is constrained to `low | medium | high` through the same defensive helper used by the obligation projection.

### 3. Wired the new builders into `buildStoryBundleContext`

`buildStoryBundleContext` now fetches `intention_record` and `story_status_record` rows and returns `active_intentions` and `active_statuses` alongside the existing story-bundle summaries. `summarizeStoryBundleContext` now emits `active_intention_ids` and `active_status_entities`, mirroring the existing id-list summary pattern.

### 4. Added per-summary fixture tests

`tools/world-mcp/tests/tools/story-bundle-fixture.ts` now seeds a representative `STINT-1` row alongside the existing `STSTAT-1` row. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` asserts exact field keys and exact projected values for both new summaries. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` asserts the persisted-summary fallback lists include `active_intention_ids` and `active_status_entities`. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` now includes the new fixture row in the existing `"loft"` lexical-search expectation.

### 5. Added a SPEC-46 implementation note

`archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` now records that ticket 002 landed the actor-bound Phase B summaries, while leaving the rest of the broad spec text active for sibling tickets 003-015.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` interfaces)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — add two builders + wire into `buildStoryBundleContext` + summarize)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — add per-summary fixture tests)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — add persisted summary fallback assertions)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — seed representative `STINT` fixture row)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — update shared-fixture lexical-search expectation)
- `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (modify — add dated implementation note for this landed slice)

## Out of Scope

- The other five Phase B summaries (`active_beliefs_by_holder`, `active_relationships_by_participant`, `active_locations_in_scope`, `active_objects_in_scope`, `active_story_diegetic_artifacts`) — covered by sibling tickets 003 and 004.
- `docs/CONTEXT-PACKET-CONTRACT.md` updates — covered by SPEC46STOPIPMAC-005.
- `describe-capabilities.ts` enumeration of the new fields — covered by SPEC46STOPIPMAC-005.
- `tools/world-index/` edge extraction — covered by Phase C tickets (006-013).

## Acceptance Criteria

### Tests That Must Pass

1. Per-summary fixture tests assert `buildActiveIntentions` and `buildActiveStatuses` emit exactly the Phase B-specified field set (T-3 scope for the two summaries).
2. Summary-fallback parity tests assert `active_intention_ids` and `active_status_entities` enumerate the same ids the full summaries project (T-4 scope for the two summaries).
3. `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.
4. `npm run build --prefix tools/world-mcp` typechecks cleanly with the extended interfaces.

### Invariants

1. Each emitted field on `active_intentions` and `active_statuses` has a named retrieval-surface consumer per spec §Phase B's per-class load-bearing table (FOUNDATIONS §Story Bundles §5b discipline).
2. The new fields are additive context fields; consumers that don't read them continue to work unchanged.
3. Token-budget integration follows the existing per-field omission pattern; no regression in `get_context_packet`'s budget management.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — add fixture tests for `buildActiveIntentions` and `buildActiveStatuses` plus their summary-fallback id-list projections.
2. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` — update persisted summary assertion to include `active_intention_ids` and `active_status_entities`.
3. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — add a representative `STINT-1` fixture row used by the context-packet tests.
4. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` — update the fixture-coupled lexical-search expectation for the new `STINT-1` row.

### Commands

1. `npm test --prefix tools/world-mcp` (targeted: full world-mcp test suite passes including new per-summary tests)
2. `npm run build --prefix tools/world-mcp` (typechecks the extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` shapes)

## Outcome

Completed on 2026-05-18. The story-bundle context packet now includes `active_intentions` and `active_statuses`, and persisted packet summaries now include `active_intention_ids` and `active_status_entities`. The shared story-bundle fixture includes `STINT-1`, the existing `STSTAT-1` row is projected through the new status summary, and context-packet tests assert both exact field sets and persisted-summary fallback parity. The fixture-coupled lexical-search expectation now includes the new `STINT-1` row. SPEC-46 now carries a dated implementation note for this landed Phase B slice.

## Verification Result

- Baseline before edits: `npm test --prefix tools/world-mcp` passed with 405 passing tests.
- `npm run build --prefix tools/world-mcp` passed after source/test edits.
- `node --test tools/world-mcp/dist/tests/context-packet/story-bundle-context.test.js tools/world-mcp/dist/tests/context-packet/story-bundle-budget.test.js` passed after the build: 4 passing tests.
- First final `npm test --prefix tools/world-mcp` rerun failed only in `searchNodes scopes lexical search to the requested story bundle` because the new `STINT-1` fixture row legitimately matched the existing `"loft"` query; the expected fixture result was updated.
- Final `npm test --prefix tools/world-mcp` passed after the fixture-search expectation update and final ticket/code truthing: 405 passing tests.

## Deviations

- The ticket's initial `Files to Touch` omitted the shared fixture, persisted-summary test, fixture-coupled lexical-search test, and originating spec note. Reassessment added those surfaces because the new projection needs a representative `STINT` row, the persisted summary contract must move with the new fields, the existing lexical-search fixture expectation must include the new matching row, and the active spec needed a narrow implementation note to avoid stale broad absence prose for the landed actor-bound slice.
- `docs/CONTEXT-PACKET-CONTRACT.md` and `tools/world-mcp/src/tools/describe-capabilities.ts` remain out of scope and are still owned by `tickets/SPEC46STOPIPMAC-005.md`.
