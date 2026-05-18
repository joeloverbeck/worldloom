# SPEC46STOPIPMAC-004: Add scoped MCP summaries (active_locations_in_scope, active_objects_in_scope, active_story_diegetic_artifacts) + JSDoc heuristic

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (extends `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new builders + wiring + scope-heuristic JSDoc), `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts`, `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`, and `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (fixture/proof updates)
**Deps**: None

## Problem

At intake, the story-bundle context-packet projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts` did not surface active `STLOC` (location state), active `STOBJ` (object state), or story-local `DA` (story-local diegetic artifacts) — three classes consumed by the `location`, `has_affordance`, `object_accessible`, and `artifact_accessible` predicates per `story-state-contract.md` §5. Unlike the actor-bound state classes (covered by sibling tickets 002 and 003), these classes benefit from a *scope heuristic*: projecting every active location / object / artifact on every retrieval would defeat the context-packet's purpose, so the projection scopes to records referenced by other active records on the current branch path. This ticket adds the three scoped projections plus the JSDoc documentation of the scope heuristic (D-B5 first half); the cross-cutting CONTEXT-PACKET-CONTRACT.md update (D-B5 second half) and describe-capabilities.ts updates (D-B7) live in sibling ticket 005.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/context-packet/shared.ts` declares `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary`. Live reassessment corrected the drafted field shapes: `STLOC` carries `id`, `label`, `description`, and optional `bound_ent`; `STOBJ` carries `id`, `label`, `description`, `owner`, and `current_location`; story-local `DA` carries `id`, `title`, `author`, `genre`, `intended_audience`, `circulation`, `truth_relation`, and `derived_from`. These live shapes are defined in `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.8-§4.5.10 and `tools/validators/src/schemas/story-location.schema.json`, `story-object.schema.json`, and `story-diegetic-artifact.schema.json`. The ticket therefore does not fabricate the drafted absent fields `name`, `status`, `affordances`, `location`, `kind`, `holders`, or `accessible_to`.
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase B table specifies the three projections and additionally specifies the **scope heuristic** at §Phase B's "Scope heuristic for `active_locations_in_scope` / `active_objects_in_scope`" paragraph: *"a record is in scope if it is referenced by any other active record on the current branch path (transitive over `location_of_entity` / `object_at_location` / similar edges once those edges land in Phase C). Until Phase C lands, the heuristic is purely id-list-based: in scope iff the id appears in any other active record's body."*
3. Cross-skill boundary: the MCP context-packet contract is consumed by `branching-story-turn-cycle` (eligibility for `location` / `has_affordance` / `object_accessible` / `artifact_accessible` predicates) and by future dramatic-irony packet tickets (deferred per SPEC-46 §Out of Scope item 5). The scope heuristic is documented in JSDoc so consumers can verify what they receive; the spec also requires a parallel mention in `docs/CONTEXT-PACKET-CONTRACT.md` under the `story_bundle_context` section (covered by sibling ticket 005).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates the corrected field selection: each projected field exists in the accepted record schemas, and absent access-route rollups are not invented. §Story Bundles §6b (Information / Observer Firewall) remains supported by exposing the scoped location/object/artifact ids and schema-faithful metadata that downstream skills can use before targeted `get_record` / `get_records` retrieval of full bodies, page snapshots, or BEL access routes.

## Architecture Check

1. The scoped builders need a two-pass approach: pass 1 collects record ids referenced by any other active record body (locations, objects, artifacts, statuses, intentions, beliefs, pages, etc.); pass 2 iterates the candidate rows and projects only those whose id is in the referenced set. The id-list-based heuristic is intentionally conservative — it may under-include (a location with no current actor reference but visible via `PG.state_snapshot.visible_affordances`) or over-include (a referenced-but-distant location no actor can reach this turn) per spec §R-2. The heuristic upgrades when Phase C's location / object edges land; the JSDoc names this explicitly so consumers can verify what they receive. Alternative considered: project every active record without scoping — rejected because the context-packet's purpose is to bound the projection to load-bearing state.
2. No backwards-compatibility aliasing or shims introduced. The three new summary fields are additive optional fields; the parallel `*_ids` summary fields on `ContextPacketStoryBundleContextSummary` follow the existing `open_obligation_ids` pattern at `story-bundle-context.ts:442`.

## Verification Layers

1. **Field-set fidelity** → schema validation: per-summary fixture tests assert each projection emits the schema-faithful corrected field set per record (T-3 scope, narrowed from the stale Phase B draft field list during reassessment).
2. **Scope-heuristic correctness** → schema validation: per-summary fixture tests construct a representative bundle with some in-scope and some out-of-scope locations / objects / artifacts; assert in-scope records ARE projected and out-of-scope records are NOT projected (T-3 scope, scope-heuristic sub-check).
3. **Summary-fallback parity** → codebase grep-proof: `active_location_ids`, `active_object_ids`, `active_story_da_ids` enumerate exactly the ids the full summaries project (T-4 scope).
4. **Scope-heuristic transparency** → manual review: the JSDoc on each scoped builder names the heuristic explicitly and references SPEC-46 §Phase B's heuristic paragraph; consumers can read the JSDoc and understand what they receive (preparation for sibling ticket 005's CONTEXT-PACKET-CONTRACT.md mirror).
5. **No regression on existing summaries** → `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite.

## Landed Changes

### 1. Extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` type declarations

In `tools/world-mcp/src/context-packet/shared.ts` within the `ContextPacketStoryBundleContext` interface, added three new fields:

```typescript
active_locations_in_scope: Array<{
  id: string;
  label: string;
  description: string;
  bound_ent: string | null;
}>;
active_objects_in_scope: Array<{
  id: string;
  label: string;
  description: string;
  owner: string | null;
  current_location: string;
}>;
active_story_diegetic_artifacts: Array<{
  id: string;
  title: string;
  author: string;
  genre: string;
  intended_audience: string;
  circulation: string;
  truth_relation: string;
  derived_from: string[];
}>;
```

In the `ContextPacketStoryBundleContextSummary` interface, added parallel id-list fields:

```typescript
active_location_ids: string[];
active_object_ids: string[];
active_story_da_ids: string[];
```

### 2. Implement three new scoped-builder functions with JSDoc scope-heuristic documentation

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, added `buildActiveLocationsInScope(rows: StoryNodeRow[], allStoryRows: StoryNodeRow[])`, `buildActiveObjectsInScope(rows: StoryNodeRow[], allStoryRows: StoryNodeRow[])`, and `buildActiveStoryDiegeticArtifacts(rows: StoryNodeRow[], allStoryRows: StoryNodeRow[])`. Each builder follows the two-pass approach: pass 1 collects the id set referenced by any other active record's body using a story-record-id extraction helper; pass 2 iterates the candidate node-type rows and projects only those whose id appears in the referenced set. Each builder has JSDoc naming the scope heuristic and citing SPEC-46 Phase B.

The story-local DA builder additionally filters by node type: world-level `DA` continues to route through `list_records(record_type='diegetic_artifact_record')` per spec §Phase B; this projection covers only indexed `story_diegetic_artifact_record` rows from `worlds/<slug>/stories/<story-slug>/_source/artifacts/`.

### 3. Wire the new builders into `buildStoryBundleContext`

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, added `locationRows`, `objectRows`, and `storyDaRows` row-fetches via `rowsForNodeType`, fetched all story rows for scope-reference detection, and emitted the three new fields. Added parallel `active_location_ids` / `active_object_ids` / `active_story_da_ids` projections to `summarizeStoryBundleContext`.

### 4. Add per-summary fixture tests including scope-heuristic correctness

In `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts`, `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`, and `tools/world-mcp/tests/tools/story-bundle-fixture.ts`, added fixture coverage that:
- Per scoped summary: constructs a bundle with referenced and unreferenced candidate records; asserts referenced records project and unreferenced records do not project.
- Confirms field-set fidelity per record.
- Confirms the summary-fallback `*_ids` projections match.
- Truths fixture search and persisted-summary expectations after adding location/object fixture records.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — extend `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` interfaces with three scoped projections)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — add three scoped builders with JSDoc scope-heuristic + wire into `buildStoryBundleContext` + summarize)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — add per-summary fixture tests including scope-heuristic correctness)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — persisted summary expectation now includes the three new id lists)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — fixture search expectation includes newly seeded in-scope location/object records)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — add schema-valid in-scope/out-of-scope STLOC, STOBJ, and story-local DA fixture records)

## Out of Scope

- The other four Phase B summaries (`active_intentions`, `active_statuses` in sibling 002; `active_beliefs_by_holder`, `active_relationships_by_participant` in sibling 003).
- `docs/CONTEXT-PACKET-CONTRACT.md` scope-heuristic mirror — covered by SPEC46STOPIPMAC-005 (which copies the JSDoc heuristic statement into the contract doc under the `story_bundle_context` section).
- `describe-capabilities.ts` enumeration of the new fields — covered by SPEC46STOPIPMAC-005.
- Tightening the scope heuristic via Phase C edges (per spec §R-2 Mitigation, "the heuristic upgrades when Phase C's location / object edges land") — deliberate follow-up if the id-list heuristic proves too lossy in practice.

## Acceptance Criteria

### Tests That Must Pass

1. Per-summary fixture tests assert each scoped builder emits the schema-faithful corrected field set per row (T-3 scope).
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

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — modified fixture tests for `buildActiveLocationsInScope`, `buildActiveObjectsInScope`, and `buildActiveStoryDiegeticArtifacts` covering field-set fidelity AND scope-heuristic correctness (in-scope / out-of-scope sub-cases).

### Commands

1. `npm test --prefix tools/world-mcp` (targeted: full world-mcp test suite passes including new scoped-summary tests)
2. `npm run build --prefix tools/world-mcp` (typechecks the extended `ContextPacketStoryBundleContext` and `ContextPacketStoryBundleContextSummary` shapes)

## Outcome

Completed on 2026-05-18.

Implemented schema-faithful `active_locations_in_scope`, `active_objects_in_scope`, and `active_story_diegetic_artifacts` projections in `tools/world-mcp`, plus `active_location_ids`, `active_object_ids`, and `active_story_da_ids` summary fields. The scoped builders include JSDoc for the SPEC-46 Phase B heuristic and project only records referenced by another story-bundle row body.

The implementation intentionally deviates from the stale drafted field list: live schemas do not define `name`, `status`, `affordances`, `accessible_to`, `kind`, `holders`, or a DA `location` field for these records. The landed projections use the current validator/story-contract fields instead.

## Verification Result

- `npm test --prefix tools/world-mcp` — PASS before edits (baseline).
- `npm run build --prefix tools/world-mcp` — PASS after edits.
- `node --test tools/world-mcp/dist/tests/context-packet/story-bundle-context.test.js` — PASS after implementation.
- `node --test tools/world-mcp/dist/tests/context-packet/story-bundle-budget.test.js tools/world-mcp/dist/tests/tools/search-nodes.story-bundle.test.js tools/world-mcp/dist/tests/context-packet/story-bundle-context.test.js` — PASS after fixture expectation truthing.
- `npm test --prefix tools/world-mcp` — PASS after final implementation and proof-surface updates: 405 passing tests.

## Deviations

- The spec/ticket draft described richer access-route fields that are not present in the live STLOC/STOBJ/story-local DA schemas. This ticket landed the schema-faithful corrected projection and left broader access-route/documentation/capability prose to sibling ticket 005 as originally scoped.
