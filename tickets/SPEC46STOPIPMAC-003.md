# SPEC46STOPIPMAC-003: Add grouped MCP summaries (active_beliefs_by_holder, active_relationships_by_participant)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (extends `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new builders + wiring)
**Deps**: None

## Problem

The story-bundle context-packet projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486` does not surface active `BEL` (beliefs) or active `SREL` (relationships) state — both core actor-bound state classes consumed by the observer firewall (`BEL`), social-state prefiltering (`SREL`), and the `belief_record` / `relationship_axis` / `any_belief` / `any_relationship_axis` predicates per `story-state-contract.md` §5. Unlike `STINT` / `STSTAT` (the simple actor-bound state covered by sibling ticket 002), `BEL` and `SREL` benefit from grouped projections — beliefs grouped by holder, relationships grouped by participants — because the consuming firewalls and predicates operate per-holder / per-participant. This ticket adds the two grouped projections; the scoped summaries land in sibling ticket 004.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/context-packet/shared.ts:97` declares `ContextPacketStoryBundleContext` and line 67 declares `ContextPacketStoryBundleContextSummary`. `BEL` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.1 carries `belief_mode`, `truth_relation` (`true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`), `confidence`, `visibility` (`private | shared | factional | public | rumored | concealed | suppressed`) plus `holder`, `claim`, and `basis` fields. `SREL` schema (story-record-schemas.md §4.5.x) carries `participants[]`, `axes[]` (with axis name + value), and `status` fields.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B table specifies `active_beliefs_by_holder: [{holder, beliefs: [{id, claim, belief_mode, truth_relation, confidence, visibility}]}] grouped by holder` and `active_relationships_by_participant: [{participants: [STENT, STENT], axes: [{axis, value}], status}]` — each emitted field has a named consumer (observer firewall, dramatic-irony queries, social-state firewall prefiltering, future social-pressure packet, future STEMO appraisal-basis access).
3. Cross-skill boundary: the MCP context-packet contract is consumed by `branching-story-turn-cycle` (observer firewall enforcement per `story-state-contract.md` §6b at move-generation time; `relationship_axis` eligibility checks), by `branching-story-health-audit` (belief/relationship consistency checks), and by future dramatic-irony / social-pressure packet tickets (deferred per SPEC-46 §Out of Scope). Adding the grouped projections is additive — consumers that don't request the new fields continue to work unchanged.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates the field selection per the Phase B per-class consumer table. §Story Bundles §6a (Belief vs. Fact) additionally motivates the BEL grouping: the projection preserves the `belief_mode` / `truth_relation` / `visibility` / `confidence` distinctions exactly as the §4.1 schema records them, so lies / secrets / contested public claims remain coherent through the projection — no collapsing of belief into claim or truth.

## Architecture Check

1. The two builders mirror the existing `buildActiveThreads` / `buildActiveClocks` pattern at `story-bundle-context.ts:213-242` but add a grouping step — `buildActiveBeliefsByHolder` groups beliefs by `holder`, `buildActiveRelationshipsByParticipant` groups by `participants[]` shape. Grouping at the projection layer avoids forcing every consumer to re-group; the firewalls and predicates already operate on the grouped shape. Alternative considered: emit flat lists and let consumers group — rejected because the per-holder / per-participant grouping is the dominant access pattern and projecting flat would force every consumer into duplicate grouping code.
2. No backwards-compatibility aliasing or shims introduced. The new summary fields are additive optional fields; the parallel `*_holders` / `*_participants` summary fields on `ContextPacketStoryBundleContextSummary` follow the existing `open_obligation_ids` pattern at `story-bundle-context.ts:442`, with id-list shape adapted to the grouping key (holder STENT id list / participant STENT id pair list).

## Verification Layers

1. **Field-set fidelity + grouping correctness** → schema validation: per-summary fixture tests assert each projection emits the Phase B-specified field set AND that the grouping key (`holder` for beliefs; `participants[]` for relationships) is correctly applied — beliefs with the same holder land in the same group; relationships with the same participants pair land in the same group (corresponds to spec test T-3 scope).
2. **Summary-fallback parity** → codebase grep-proof: `active_belief_holders` and `active_relationship_participants` enumerate exactly the holders / participant pairs the full summaries project (T-4 scope).
3. **§Story Bundles §6a discipline preservation** → manual review: confirm the projection preserves `belief_mode` / `truth_relation` / `visibility` / `confidence` distinctions — no field collapsing.
4. **No regression on existing summaries** → `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.

## What to Change

### 1. Extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` type declarations

In `tools/world-mcp/src/context-packet/shared.ts` within the `ContextPacketStoryBundleContext` interface (line 97 region), add two new optional fields:

```typescript
active_beliefs_by_holder?: Array<{
  holder: string;
  beliefs: Array<{
    id: string;
    claim: string;
    belief_mode: string;
    truth_relation: "true" | "false" | "partly_true" | "unknown" | "contested" | "branch_counterfactual" | "future_contingent";
    confidence: string;
    visibility: "private" | "shared" | "factional" | "public" | "rumored" | "concealed" | "suppressed";
  }>;
}>;
active_relationships_by_participant?: Array<{
  participants: string[];   // pair of STENT ids
  axes: Array<{ axis: string; value: string }>;
  status: string;
}>;
```

In the `ContextPacketStoryBundleContextSummary` interface (line 67), add parallel grouping-key list fields:

```typescript
active_belief_holders?: string[];
active_relationship_participants?: string[][];   // list of participant-pair lists
```

### 2. Implement two new grouped-builder functions

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, add `buildActiveBeliefsByHolder(rows: StoryNodeRow[])` and `buildActiveRelationshipsByParticipant(rows: StoryNodeRow[])`. Each builder iterates `rowsForNodeType` for the respective node type, parses each row via `parseYamlRecord`, then groups: beliefs by `holder` field, relationships by sorted `participants[]` to ensure stable grouping. Use the existing `asString` / `asStringArray` helpers for field projection.

### 3. Wire the new builders into `buildStoryBundleContext`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486`, add `beliefRows` and `relationshipRows` row-fetches via `rowsForNodeType`, then emit `active_beliefs_by_holder: buildActiveBeliefsByHolder(beliefRows)` and `active_relationships_by_participant: buildActiveRelationshipsByParticipant(relationshipRows)`. Add parallel `active_belief_holders` and `active_relationship_participants` projections to `summarizeStoryBundleContext` at line 431-450 — for beliefs, `context.active_beliefs_by_holder?.map(group => group.holder)`; for relationships, `context.active_relationships_by_participant?.map(rel => rel.participants)`.

### 4. Add per-summary fixture tests

In `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, add fixture tests that load representative `BEL` records with multiple holders and representative `SREL` records with multiple participant pairs; assert the grouping correctness AND the field-set fidelity per group.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` interfaces with grouped projections)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — add two grouped builders + wire into `buildStoryBundleContext` + summarize)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — add per-summary fixture tests covering grouping correctness)

## Out of Scope

- The other five Phase B summaries (`active_intentions`, `active_statuses` in sibling 002; `active_locations_in_scope`, `active_objects_in_scope`, `active_story_diegetic_artifacts` in sibling 004).
- `docs/CONTEXT-PACKET-CONTRACT.md` updates — covered by SPEC46STOPIPMAC-005.
- `describe-capabilities.ts` enumeration of the new fields — covered by SPEC46STOPIPMAC-005.
- Future dramatic-irony / social-pressure packets that compose `active_beliefs_by_holder` and `active_relationships_by_participant` — deferred per SPEC-46 §Out of Scope items 5 and 6.

## Acceptance Criteria

### Tests That Must Pass

1. Per-summary fixture tests assert `buildActiveBeliefsByHolder` and `buildActiveRelationshipsByParticipant` emit exactly the Phase B-specified field set AND correctly group by `holder` / `participants[]` (T-3 scope).
2. Summary-fallback parity tests assert `active_belief_holders` and `active_relationship_participants` enumerate the same grouping keys the full summaries project (T-4 scope).
3. `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.
4. `npm run build --prefix tools/world-mcp` typechecks cleanly.

### Invariants

1. Each emitted field on the two grouped summaries has a named retrieval-surface consumer per spec §Phase B's per-class load-bearing table (FOUNDATIONS §Story Bundles §5b discipline).
2. The `BEL` projection preserves `belief_mode` / `truth_relation` / `visibility` / `confidence` distinctions (FOUNDATIONS §Story Bundles §6a discipline).
3. Grouping is stable: beliefs with the same `holder` land in exactly one group; relationships with the same `participants[]` pair (after sorting) land in exactly one group.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — add fixture tests for `buildActiveBeliefsByHolder` and `buildActiveRelationshipsByParticipant` plus their summary-fallback grouping-key projections, including a multi-holder BEL fixture and a multi-participant SREL fixture to cover grouping correctness.

### Commands

1. `npm test --prefix tools/world-mcp` (targeted: full world-mcp test suite passes including new grouped-summary tests)
2. `npm run build --prefix tools/world-mcp` (typechecks the extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` shapes)
