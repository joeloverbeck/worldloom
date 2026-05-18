# SPEC46STOPIPMAC-002: Add actor-bound MCP summaries (active_intentions, active_statuses)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (extends `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new builders + wiring)
**Deps**: None

## Problem

The story-bundle context-packet projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486` (`buildStoryBundleContext`) currently projects twelve summary fields covering storylets, obligations, threads, clocks, secrets, story questions, branch path, recent pages, mysteries in play, mystery evidence chains, cast bind list, and acknowledged invariants. It does not surface active `STINT` (intentions) or active `STSTAT` (entity status), even though both are core actor-bound state classes consumed by turn-cycle eligibility scoring (`STINT`) and entity life/agency/location predicates (`STSTAT`). Skills needing this state fall back on raw file reads (blocked by Hook 2 for oversized `_source/<class>/*.yaml` reads, then routed to per-id `get_record`), which violates the FOUNDATIONS §Tooling Recommendation promise that skills receive needed context "directly or via the documented context-packet + targeted-retrieval pattern". This ticket adds the two simplest actor-bound projections; the grouped and scoped summaries land in sibling tickets 003 and 004.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/context-packet/shared.ts:97` declares `ContextPacketStoryBundleContext`; line 67 declares `ContextPacketStoryBundleContextSummary`. The existing builder pattern at `tools/world-mcp/src/context-packet/story-bundle-context.ts:213-242` (`buildActiveThreads` / `buildActiveClocks`) is the model for new builders. `STINT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.2 carries `id`, `story_id`, `created_at_page`, `supersedes`, `holder`, `intent`, `urgency: low | medium | high`, `expires_when`. `STSTAT` schema (story-state-contract.md §3 confirms `entity_status` is its purpose; story-record-schemas.md §4.5.x carries `entity` + `life` + `agency` + `location` fields per SPEC-44 lifecycle).
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B table specifies `active_intentions: [{id, holder, intent, urgency, expires_when}]` and `active_statuses: [{entity, life, agency, location}]` — every field has a named retrieval-surface consumer per the spec's per-class load-bearing table.
3. Cross-skill boundary: the MCP context-packet contract is consumed by `branching-story-turn-cycle` (eligibility scoring for `intention_active` / `entity_status` predicates per `story-state-contract.md` §5) and by `branching-story-health-audit` (stale-intention detection, life/agency consistency checks). Adding the new fields is additive — consumers that don't request the new field set continue to work unchanged.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates the field selection: every emitted field is consumed by a named retrieval-surface consumer per the Phase B table. No nice-to-have fields are included. The two projections also align with §Tooling Recommendation by making queryable state previously requiring raw-file reads or per-id `get_record` round-trips.

## Architecture Check

1. The two builders mirror the existing `buildActiveThreads` / `buildActiveClocks` pattern at `story-bundle-context.ts:213-242` — same `StoryNodeRow[]` input, same `parseYamlRecord` / `asString` / `asNullableString` helper usage, same node-type filter via `rowsForNodeType`. Adding parallel builders preserves the file's structural consistency without inventing new abstraction. Alternative considered: synthesize all seven Phase B summaries into one mega-builder — rejected because per-summary tickets keep each addition independently reviewable and each summary's consumer set is distinct.
2. No backwards-compatibility aliasing or shims introduced. The new summary fields are additive optional fields on `ContextPacketStoryBundleContext`; the parallel `active_intention_ids` and `active_status_entities` summary fields on `ContextPacketStoryBundleContextSummary` follow the existing `open_obligation_ids` pattern at `story-bundle-context.ts:442`.

## Verification Layers

1. **Field-set fidelity** → schema validation: per-summary fixture tests assert the projection emits exactly the field set specified in the Phase B table for each summary (corresponds to spec test T-3 scope).
2. **Summary-fallback parity** → codebase grep-proof: `active_intention_ids` and `active_status_entities` enumerate exactly the ids of the records the full summary projects (corresponds to spec test T-4 scope).
3. **Token-budget integration** → existing budget pattern preservation: per-field omission under budget pressure is the existing pattern at `buildStoryBundleContext` — confirm new fields participate in the same omission path (manual review of the wiring change).
4. **No regression on existing summaries** → `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.

## What to Change

### 1. Extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` type declarations

In `tools/world-mcp/src/context-packet/shared.ts` within the `ContextPacketStoryBundleContext` interface (line 97 region), add two new optional fields:

```typescript
active_intentions?: Array<{
  id: string;
  holder: string;
  intent: string;
  urgency: "low" | "medium" | "high";
  expires_when: string;
}>;
active_statuses?: Array<{
  entity: string;
  life: string;
  agency: string;
  location: string;
}>;
```

In the `ContextPacketStoryBundleContextSummary` interface (line 67), add parallel id-list fields:

```typescript
active_intention_ids?: string[];
active_status_entities?: string[];
```

### 2. Implement two new builder functions

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, add `buildActiveIntentions(rows: StoryNodeRow[])` and `buildActiveStatuses(rows: StoryNodeRow[])` modeled on `buildActiveThreads` (line 213) and `buildActiveClocks` (line 227). Each builder iterates `rowsForNodeType(rows, '<node_type>')`, parses each row via `parseYamlRecord`, and projects the field set named in step 1.

### 3. Wire the new builders into `buildStoryBundleContext`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486` (`buildStoryBundleContext`), add `intentionRows` and `statusRows` row-fetches via `rowsForNodeType` (matching the existing pattern for `obligationRows`, `threadRows`, etc.), then emit `active_intentions: buildActiveIntentions(intentionRows)` and `active_statuses: buildActiveStatuses(statusRows)` in the returned object. Add the parallel `*_ids` projections to the `summarizeStoryBundleContext` function at line 431-450 mirroring the existing `open_obligation_ids` pattern.

### 4. Add per-summary fixture tests

In `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, add fixture tests that load representative `STINT` and `STSTAT` records and assert each builder emits exactly the Phase B-specified field set per row.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` interfaces)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — add two builders + wire into `buildStoryBundleContext` + summarize)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — add per-summary fixture tests)

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
2. The new fields are additive optional fields; consumers that don't request them continue to work unchanged.
3. Token-budget integration follows the existing per-field omission pattern; no regression in `get_context_packet`'s budget management.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — add fixture tests for `buildActiveIntentions` and `buildActiveStatuses` plus their summary-fallback id-list projections.

### Commands

1. `npm test --prefix tools/world-mcp` (targeted: full world-mcp test suite passes including new per-summary tests)
2. `npm run build --prefix tools/world-mcp` (typechecks the extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` shapes)
