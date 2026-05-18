# SPEC46STOPIPMAC-004: Add scoped MCP summaries (active_locations_in_scope, active_objects_in_scope, active_story_diegetic_artifacts) + JSDoc heuristic

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (extends `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new builders + wiring + scope-heuristic JSDoc)
**Deps**: None

## Problem

The story-bundle context-packet projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486` does not surface active `STLOC` (location state), active `STOBJ` (object state), or story-local `DA` (story-local diegetic artifacts) — three classes consumed by the `location`, `has_affordance`, `object_accessible`, and `artifact_accessible` predicates per `story-state-contract.md` §5. Unlike the actor-bound state classes (covered by sibling tickets 002 and 003), these classes benefit from a *scope heuristic*: projecting every active location / object / artifact on every retrieval would defeat the context-packet's purpose, so the projection scopes to records referenced by other active records on the current branch path. This ticket adds the three scoped projections plus the JSDoc documentation of the scope heuristic (D-B5 first half); the cross-cutting CONTEXT-PACKET-CONTRACT.md update (D-B5 second half) and describe-capabilities.ts updates (D-B7) live in sibling ticket 005.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/context-packet/shared.ts:97` declares `ContextPacketStoryBundleContext` and line 67 declares `ContextPacketStoryBundleContextSummary`. `STLOC`, `STOBJ`, and `DA` schemas at `.claude/skills/_shared-templates/story-record-schemas.md` carry id + name + affordances (locations) / accessible_to (objects, artifacts) / location / status / kind / holders fields per their respective §4.5.x sections. The existing builder pattern at `story-bundle-context.ts:213-264` is the model for the new scoped builders.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B table specifies the three projections and additionally specifies the **scope heuristic** at §Phase B's "Scope heuristic for `active_locations_in_scope` / `active_objects_in_scope`" paragraph: *"a record is in scope if it is referenced by any other active record on the current branch path (transitive over `location_of_entity` / `object_at_location` / similar edges once those edges land in Phase C). Until Phase C lands, the heuristic is purely id-list-based: in scope iff the id appears in any other active record's body."*
3. Cross-skill boundary: the MCP context-packet contract is consumed by `branching-story-turn-cycle` (eligibility for `location` / `has_affordance` / `object_accessible` / `artifact_accessible` predicates) and by future dramatic-irony packet tickets (deferred per SPEC-46 §Out of Scope item 5). The scope heuristic is documented in JSDoc so consumers can verify what they receive; the spec also requires a parallel mention in `docs/CONTEXT-PACKET-CONTRACT.md` under the `story_bundle_context` section (covered by sibling ticket 005).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates the field selection per the Phase B per-class consumer table. §Story Bundles §6b (Information / Observer Firewall) additionally motivates these projections: they expose the access-route fields (`STLOC.affordances[].accessible_to`, `STOBJ.accessible_to`, `DA.accessible_to`) that the firewall already consumes at move-generation time — making them queryable supports rather than weakens the firewall.

## Architecture Check

1. The scoped builders need a two-pass approach: pass 1 collects the id set referenced by any other active record (locations, objects, artifacts, statuses, intentions, beliefs, etc.); pass 2 iterates the candidate rows and projects only those whose id is in the referenced set. The id-list-based heuristic is intentionally conservative — it may under-include (a location with no current actor reference but visible via `PG.state_snapshot.visible_affordances`) or over-include (a referenced-but-distant location no actor can reach this turn) per spec §R-2. The heuristic upgrades when Phase C's location / object edges land; the JSDoc names this explicitly so consumers can verify what they receive. Alternative considered: project every active record without scoping — rejected because the context-packet's purpose is to bound the projection to load-bearing state.
2. No backwards-compatibility aliasing or shims introduced. The three new summary fields are additive optional fields; the parallel `*_ids` summary fields on `ContextPacketStoryBundleContextSummary` follow the existing `open_obligation_ids` pattern at `story-bundle-context.ts:442`.

## Verification Layers

1. **Field-set fidelity** → schema validation: per-summary fixture tests assert each projection emits exactly the Phase B-specified field set per record (T-3 scope).
2. **Scope-heuristic correctness** → schema validation: per-summary fixture tests construct a representative bundle with some in-scope and some out-of-scope locations / objects / artifacts; assert in-scope records ARE projected and out-of-scope records are NOT projected (T-3 scope, scope-heuristic sub-check).
3. **Summary-fallback parity** → codebase grep-proof: `active_location_ids`, `active_object_ids`, `active_story_da_ids` enumerate exactly the ids the full summaries project (T-4 scope).
4. **Scope-heuristic transparency** → manual review: the JSDoc on each scoped builder names the heuristic explicitly and references SPEC-46 §Phase B's heuristic paragraph; consumers can read the JSDoc and understand what they receive (preparation for sibling ticket 005's CONTEXT-PACKET-CONTRACT.md mirror).
5. **No regression on existing summaries** → `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.

## What to Change

### 1. Extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` type declarations

In `tools/world-mcp/src/context-packet/shared.ts` within the `ContextPacketStoryBundleContext` interface (line 97 region), add three new optional fields:

```typescript
active_locations_in_scope?: Array<{
  id: string;
  name: string;
  status: string;
  affordances: Array<{ action_family: string; accessible_to: string[] }>;
}>;
active_objects_in_scope?: Array<{
  id: string;
  name: string;
  location: string;
  accessible_to: string[];
}>;
active_story_diegetic_artifacts?: Array<{
  id: string;
  name: string;
  kind: string;
  holders: string[];
  location: string;
  accessible_to: string[];
}>;
```

In the `ContextPacketStoryBundleContextSummary` interface (line 67), add parallel id-list fields:

```typescript
active_location_ids?: string[];
active_object_ids?: string[];
active_story_da_ids?: string[];
```

### 2. Implement three new scoped-builder functions with JSDoc scope-heuristic documentation

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, add `buildActiveLocationsInScope(rows: StoryNodeRow[])`, `buildActiveObjectsInScope(rows: StoryNodeRow[])`, and `buildActiveStoryDiegeticArtifacts(rows: StoryNodeRow[])`. Each builder follows the two-pass approach: pass 1 collects the id set referenced by any other active record's body (using `parseYamlRecord` and a shallow id-extraction helper); pass 2 iterates the candidate node-type rows and projects only those whose id appears in the referenced set. Add JSDoc on each builder naming the scope heuristic explicitly and citing SPEC-46 §Phase B (e.g., `/** Scoped to records referenced by any other active record's body on the current branch path. See SPEC-46 Phase B §Scope heuristic. */`).

The story-local DA builder additionally filters: world-level `DA` continues to route through `list_records(record_type='diegetic_artifact_record')` per spec §Phase B; this projection covers only story-local `DA` records (those under `worlds/<slug>/stories/<story-slug>/_source/artifacts/`).

### 3. Wire the new builders into `buildStoryBundleContext`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486`, add `locationRows`, `objectRows`, and `storyDaRows` row-fetches via `rowsForNodeType`, then emit the three new fields. Add parallel `active_location_ids` / `active_object_ids` / `active_story_da_ids` projections to `summarizeStoryBundleContext` at line 431-450.

### 4. Add per-summary fixture tests including scope-heuristic correctness

In `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, add fixture tests that:
- Per scoped summary: construct a bundle with N candidate records and M references from other active records; assert exactly M-overlap records project; assert excluded records do not project.
- Confirm field-set fidelity per record.
- Confirm the summary-fallback `*_ids` projections match.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` interfaces with three scoped projections)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — add three scoped builders with JSDoc scope-heuristic + wire into `buildStoryBundleContext` + summarize)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — add per-summary fixture tests including scope-heuristic correctness)

## Out of Scope

- The other four Phase B summaries (`active_intentions`, `active_statuses` in sibling 002; `active_beliefs_by_holder`, `active_relationships_by_participant` in sibling 003).
- `docs/CONTEXT-PACKET-CONTRACT.md` scope-heuristic mirror — covered by SPEC46STOPIPMAC-005 (which copies the JSDoc heuristic statement into the contract doc under the `story_bundle_context` section).
- `describe-capabilities.ts` enumeration of the new fields — covered by SPEC46STOPIPMAC-005.
- Tightening the scope heuristic via Phase C edges (per spec §R-2 Mitigation, "the heuristic upgrades when Phase C's location / object edges land") — deliberate follow-up if the id-list heuristic proves too lossy in practice.

## Acceptance Criteria

### Tests That Must Pass

1. Per-summary fixture tests assert each scoped builder emits exactly the Phase B-specified field set per row (T-3 scope).
2. Scope-heuristic fixture tests confirm in-scope records ARE projected and out-of-scope records are NOT projected for `active_locations_in_scope` / `active_objects_in_scope` / `active_story_diegetic_artifacts` (T-3 scope, sub-check).
3. Summary-fallback parity tests assert `active_location_ids` / `active_object_ids` / `active_story_da_ids` enumerate the same ids the full summaries project (T-4 scope).
4. `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.
5. `npm run build --prefix tools/world-mcp` typechecks cleanly.

### Invariants

1. Each emitted field on the three scoped summaries has a named retrieval-surface consumer per spec §Phase B's per-class load-bearing table (FOUNDATIONS §Story Bundles §5b discipline).
2. The scope heuristic is documented in JSDoc on each builder, citing SPEC-46 §Phase B; consumers can verify what they receive without reading the implementation (FOUNDATIONS §Story Bundles §6b transparency).
3. Story-local `DA` projection covers only `worlds/<slug>/stories/<story-slug>/_source/artifacts/` records; world-level `DA` continues to route through `list_records(record_type='diegetic_artifact_record')`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — add fixture tests for `buildActiveLocationsInScope`, `buildActiveObjectsInScope`, and `buildActiveStoryDiegeticArtifacts` covering field-set fidelity AND scope-heuristic correctness (in-scope / out-of-scope sub-cases).

### Commands

1. `npm test --prefix tools/world-mcp` (targeted: full world-mcp test suite passes including new scoped-summary tests)
2. `npm run build --prefix tools/world-mcp` (typechecks the extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` shapes)
