# SPEC46STOPIPMAC-003: Add grouped MCP summaries (active_beliefs_by_holder, active_relationships_by_participant)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (extends `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new builders + wiring)
**Deps**: None

## Problem

The story-bundle context-packet projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486` does not surface active `BEL` (beliefs) or active `SREL` (relationships) state — both core actor-bound state classes consumed by the observer firewall (`BEL`), social-state prefiltering (`SREL`), and the `belief_record` / `relationship_axis` / `any_belief` / `any_relationship_axis` predicates per `story-state-contract.md` §5. Unlike `STINT` / `STSTAT` (the simple actor-bound state covered by sibling ticket 002), `BEL` and `SREL` benefit from grouped projections — beliefs grouped by holder, relationships grouped by participants — because the consuming firewalls and predicates operate per-holder / per-participant. This ticket adds the two grouped projections; the scoped summaries land in sibling ticket 004.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/context-packet/shared.ts` declares `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`. `BEL` schema at `tools/validators/src/schemas/story-belief.schema.json` carries `belief_mode`, `truth_relation` (`true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`), `confidence`, `visibility` (`private | shared | factional | public | rumored | concealed | suppressed`) plus `holder`, `claim`, and `basis` fields. `SREL` rows use node type `relationship_record_story`; the live schema at `tools/validators/src/schemas/story-relationship.schema.json` carries singular `axis`, `participants[]`, `value`, `valence`, `description`, and optional `derived_from[]`, not the drafted `axes[]` or `status` fields.
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B table specifies `active_beliefs_by_holder: [{holder, beliefs: [{id, claim, belief_mode, truth_relation, confidence, visibility}]}] grouped by holder` and drafted `active_relationships_by_participant: [{participants: [STENT, STENT], axes: [{axis, value}], status}]`. Live schema truthing narrows the relationship projection to grouped participant pairs plus `axes: [{axis, value}]`; no `status` field is emitted because `SREL` has no schema-backed status.
3. Cross-skill boundary: the MCP context-packet contract is consumed by `branching-story-turn-cycle` (observer firewall enforcement per `story-state-contract.md` §6b at move-generation time; `relationship_axis` eligibility checks), by `branching-story-health-audit` (belief/relationship consistency checks), and by future dramatic-irony / social-pressure packet tickets (deferred per SPEC-46 §Out of Scope). Adding the grouped projections is additive — consumers that don't request the new fields continue to work unchanged.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates the field selection per the Phase B per-class consumer table. §Story Bundles §6a (Belief vs. Fact) additionally motivates the BEL grouping: the projection preserves the `belief_mode` / `truth_relation` / `visibility` / `confidence` distinctions exactly as the §4.1 schema records them, so lies / secrets / contested public claims remain coherent through the projection — no collapsing of belief into claim or truth.

## Architecture Check

1. The two builders mirror the existing `buildActiveThreads` / `buildActiveClocks` pattern at `story-bundle-context.ts:213-242` but add a grouping step — `buildActiveBeliefsByHolder` groups beliefs by `holder`, `buildActiveRelationshipsByParticipant` groups by `participants[]` shape. Grouping at the projection layer avoids forcing every consumer to re-group; the firewalls and predicates already operate on the grouped shape. Alternative considered: emit flat lists and let consumers group — rejected because the per-holder / per-participant grouping is the dominant access pattern and projecting flat would force every consumer into duplicate grouping code.
2. No backwards-compatibility aliasing or shims introduced. The new summary fields are additive context fields populated as arrays; the parallel `*_holders` / `*_participants` summary fields on `ContextPacketStoryBundleContextSummary` follow the existing `open_obligation_ids` pattern, with id-list shape adapted to the grouping key (holder STENT id list / participant STENT id pair list).

## Verification Layers

1. **Field-set fidelity + grouping correctness** → schema validation: per-summary fixture tests assert each projection emits the Phase B-specified field set AND that the grouping key (`holder` for beliefs; `participants[]` for relationships) is correctly applied — beliefs with the same holder land in the same group; relationships with the same participants pair land in the same group (corresponds to spec test T-3 scope).
2. **Summary-fallback parity** → codebase grep-proof: `active_belief_holders` and `active_relationship_participants` enumerate exactly the holders / participant pairs the full summaries project (T-4 scope).
3. **§Story Bundles §6a discipline preservation** → manual review: confirm the projection preserves `belief_mode` / `truth_relation` / `visibility` / `confidence` distinctions — no field collapsing.
4. **No regression on existing summaries** → `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.

## Landed Changes

### 1. Extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` type declarations

In `tools/world-mcp/src/context-packet/shared.ts` within the `ContextPacketStoryBundleContext` interface, added two new fields:

```typescript
active_beliefs_by_holder: Array<{
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
active_relationships_by_participant: Array<{
  participants: string[];   // pair of STENT ids
  axes: Array<{ axis: string; value: string }>;
}>;
```

In the `ContextPacketStoryBundleContextSummary` interface, added parallel grouping-key list fields:

```typescript
active_belief_holders: string[];
active_relationship_participants: string[][];   // list of participant-pair lists
```

### 2. Implemented two new grouped-builder functions

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, added `buildActiveBeliefsByHolder(rows: StoryNodeRow[])` and `buildActiveRelationshipsByParticipant(rows: StoryNodeRow[])`. Each builder iterates `rowsForNodeType` for the respective node type, parses each row via `parseYamlRecord`, then groups: beliefs by `holder` field, relationships by sorted `participants[]` to ensure stable grouping. Relationship rows are fetched from `relationship_record_story`, and each grouped axis entry projects the live singular `axis` / `value` fields into the grouped `axes[]` list. The implementation uses the existing `asString` / `asStringArray` helpers for field projection.

### 3. Wired the new builders into `buildStoryBundleContext`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, added `beliefRows` and `relationshipRows` row-fetches via `rowsForNodeType`, then emitted `active_beliefs_by_holder: buildActiveBeliefsByHolder(beliefRows)` and `active_relationships_by_participant: buildActiveRelationshipsByParticipant(relationshipRows)`. Added parallel `active_belief_holders` and `active_relationship_participants` projections to `summarizeStoryBundleContext`.

### 4. Added per-summary fixture tests

In `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, added fixture tests that load representative `BEL` records with multiple holders and representative `SREL` records with multiple participant axes; assertions cover grouping correctness and field-set fidelity per group. Same-fixture expectations were also updated in persisted-summary and list-records tests.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` interfaces with grouped projections)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — add two grouped builders + wire into `buildStoryBundleContext` + summarize)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — add per-summary fixture tests covering grouping correctness)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — update persisted summary fixture expectations for the new fallback keys)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify — update belief fixture count after adding a second holder)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — add multi-holder BEL records and grouped SREL records for fixture coverage)
- `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (modify — add implementation note truthing the live SREL no-status boundary)

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

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — added fixture tests for `buildActiveBeliefsByHolder` and `buildActiveRelationshipsByParticipant` plus their summary-fallback grouping-key projections, including a multi-holder BEL fixture and a multi-participant SREL fixture to cover grouping correctness.

### Commands

1. `npm test --prefix tools/world-mcp` (targeted: full world-mcp test suite passes including new grouped-summary tests)
2. `npm run build --prefix tools/world-mcp` (typechecks the extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` shapes)
3. `node --test tools/world-mcp/dist/tests/context-packet/story-bundle-context.test.js tools/world-mcp/dist/tests/context-packet/story-bundle-budget.test.js tools/world-mcp/dist/tests/tools/list-records.story-bundle.test.js` (focused compiled proof for the new context-packet summaries and same-fixture fallout)

## Outcome

Completed: 2026-05-18

Landed the Phase B grouped MCP story-bundle summaries for `BEL` and `SREL` records:

- `ContextPacketStoryBundleContext` now exposes `active_beliefs_by_holder` and `active_relationships_by_participant`.
- `ContextPacketStoryBundleContextSummary` now exposes `active_belief_holders` and `active_relationship_participants`.
- `buildStoryBundleContext` fetches `belief_record` and `relationship_record_story` rows, groups BEL records by `holder`, groups SREL records by sorted participant pair, and projects schema-backed fields only.
- The shared story-bundle fixture now includes multiple BEL holders and multiple SREL axes for the same participant pair; context-packet, persisted-summary, and list-records tests were updated to cover the new fixture shape.
- The originating spec gained an implementation note recording the live SREL correction: the projection does not emit the drafted `status` field because `tools/validators/src/schemas/story-relationship.schema.json` has no schema-backed SREL status.

## Verification Result

- `npm run build --prefix tools/world-mcp` — passed.
- `node --test tools/world-mcp/dist/tests/context-packet/story-bundle-context.test.js tools/world-mcp/dist/tests/context-packet/story-bundle-budget.test.js tools/world-mcp/dist/tests/tools/list-records.story-bundle.test.js` — passed, 13/13 tests.
- `npm test --prefix tools/world-mcp` — passed after same-fixture expectation updates, 405/405 tests.

## Deviations

- Reassessment corrected the drafted SREL projection shape. The live row type is `relationship_record_story`, and the live SREL schema has singular `axis` / `value` fields with no `status`; the landed projection groups those schema-backed axis/value pairs and does not fabricate `status`.
- The first broad `npm test --prefix tools/world-mcp` run failed in two same-fixture assertions after the fixture gained a third BEL record and new summary keys. Those assertions were updated in `story-bundle-budget.test.ts` and `list-records.story-bundle.test.ts`; focused compiled tests and the final broad suite then passed.
