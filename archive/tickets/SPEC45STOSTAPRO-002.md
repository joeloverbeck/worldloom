# SPEC45STOSTAPRO-002: STORY_EDGE_TYPES additions + edgesForStoryEvent helper

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 3 entries to `tools/world-index/src/schema/types.ts` `STORY_EDGE_TYPES` array; adds new `edgesForStoryEvent` helper to `tools/world-index/src/parse/atomic.ts`; extends story-event indexing via the shared intro-tag parser from SPEC45STOSTAPRO-001.
**Deps**: `archive/tickets/SPEC45STOSTAPRO-001.md`

## Problem

At intake, `tools/world-index/src/parse/atomic.ts` `edgesForStoryRecord()` extracted zero edges from `story_event_record` (SE) records. The data needed for story-state provenance graph queries — which SE created which record, which SE superseded which record, which records cite which evidence — was fully present in the indexed YAML (`SE.state_delta.create[]`, `SE.state_delta.supersede[]`, and the SPEC-43 parseable intro tags in `SE.world_logic_rationale`) but unreachable via graph traversal because no edges existed. This ticket added 3 entries to `STORY_EDGE_TYPES` (`state_delta_create`, `state_delta_supersede`, `creation_evidence`) and added an `edgesForStoryEvent` helper that extracts the corresponding edges from each indexed SE record. The shared intro-tag parser from SPEC45STOSTAPRO-001 supplies the parsed-tag data for `creation_evidence` edge emission.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-96` exports `STORY_EDGE_TYPES` as a const array with 11 entries (`world_entity_binding`, `story_fact_derived_from`, `created_at_page`, `opens_obligation`, `pays_off_obligation`, `complicates_obligation`, `transfers_obligation`, `parent_page`, `leaf_page`, `dependent_fact`, `thread_obligation`); the array is composed into `EDGE_TYPES` at line 100-106. `tools/world-index/src/parse/atomic.ts:541-607` exports `edgesForStoryRecord()` with one switch arm per existing edge-emitting record class (no `story_event_record` arm currently). Verified via Read.
2. SPEC-45 §Approach Phase 1 D1 specifies adding `state_delta_create`, `state_delta_supersede`, `creation_evidence` to `STORY_EDGE_TYPES`; D4 specifies new `edgesForStoryEvent(record)` helper near line 541; D6 specifies new test cases extending `tools/world-index/tests/parse/atomic.test.ts`. **Mechanical-drift note**: world-index tests live FLAT at `tools/world-index/tests/*.test.ts`; existing edge-extraction tests are at `tools/world-index/tests/structured-edges.test.ts`. The new edge-extraction test cases extend `structured-edges.test.ts` rather than creating a `parse/atomic.test.ts` file. **Parser-behavior correction**: SPEC45STOSTAPRO-001 preserved the live shared parser's strict malformed-tag behavior (`MidstoryIntroductionTagError`), so this ticket's malformed intro-tag case must assert rejection, not silent zero `creation_evidence` emission.
3. Cross-skill / cross-package boundary under audit: world-index emits edges that world-mcp's retrieval tools consume via `edges(src, tgt, edge_type)` SQL queries. SPEC45STOSTAPRO-003 builds the MCP tool that queries the new edges; this ticket and SPEC45STOSTAPRO-003 share the edge-type contract — the new `state_delta_create` / `state_delta_supersede` / `creation_evidence` edge_type strings must match exactly across producer (this ticket) and consumer (SPEC45STOSTAPRO-003).
4. FOUNDATIONS principle under audit: §Story Bundles §5b — *"every field in every story-bundle record schema must be load-bearing"*. This ticket adds zero new fields to any story-bundle record schema; the new edges are derived purely from existing fields (`SE.state_delta.create[]`, `SE.state_delta.supersede[]`, parsed `SE.world_logic_rationale` intro tags). The principle is honored by construction.
5. Implementation exposed a build-order requirement: `creation_evidence` edges point from the introduced record to its evidence records, so the introduced record must already exist in the SQLite `nodes` table before event edges insert. `listStoryBundleSourceFiles()` now keeps deterministic story-bundle ordering while processing `events/` after the other story `_source` classes, and full builds clear this ticket's provenance edge family before reindexing so a failed prior rebuild cannot leave partial generated rows that poison the next run.

## Architecture Check

1. **Edge extraction matches the existing per-class dispatch pattern**: the new `edgesForStoryEvent` helper sits alongside the existing `edgesForStoryRecord` switch and is invoked for `story_event_record` node-type — the same shape every other story record class uses. No restructure of the dispatch is required to add the new arm; if the existing single-function shape becomes unwieldy with the SE-specific logic (regex parse + multi-source edge emission), the implementation may refactor for clarity, but the refactor stays within `atomic.ts` and does not change the function's external contract.
2. **No backwards-compatibility shims introduced**: the new edges are additive; no existing edge_type values change semantics. Pre-SPEC-45 indexes simply lacked these edges; running the indexer once after this ticket lands produces the new edges from existing YAML — no fixture changes, no data backfill, no PG mutation.

## Verification Layers

1. **STORY_EDGE_TYPES contains 14 entries (11 → 14)** → codebase grep-proof: `grep -c '".*"' tools/world-index/src/schema/types.ts` confirms STORY_EDGE_TYPES literal count; verify the 3 new strings are present.
2. **edgesForStoryEvent emits correct counts per SE** → schema validation via unit test: synthetic SE with 3 create + 2 supersede + 4 intro tags (with N evidence ids each) emits exactly `3 + 2 + Σ(evidence_per_tag)` edges; SE with empty state_delta and no intro tags emits zero edges; SE with malformed intro tag rejects through the shared parser's `MidstoryIntroductionTagError` instead of silently emitting partial edges.
3. **Indexer rebuild on red-bunny produces expected edge counts** → schema validation: `SELECT COUNT(*) FROM edges WHERE story_slug='red-bunny' AND edge_type='state_delta_create'` equals `Σ|SE.state_delta.create[]|` summed across red-bunny's 5 SE records.

## Landed Changes

### 1. Extend STORY_EDGE_TYPES

In `tools/world-index/src/schema/types.ts`, added three entries to the `STORY_EDGE_TYPES` const array:

```typescript
export const STORY_EDGE_TYPES = [
  "world_entity_binding",
  "story_fact_derived_from",
  "created_at_page",
  "opens_obligation",
  "pays_off_obligation",
  "complicates_obligation",
  "transfers_obligation",
  "parent_page",
  "leaf_page",
  "dependent_fact",
  "thread_obligation",
  "state_delta_create",      // NEW
  "state_delta_supersede",   // NEW
  "creation_evidence"        // NEW
] as const;
```

Array expanded from 11 to 14 entries. `EDGE_TYPES` composes them automatically.

### 2. Add edgesForStoryEvent helper to atomic.ts

In `tools/world-index/src/parse/atomic.ts`, added a new helper alongside the existing `edgesForStoryRecord`. The helper receives the parsed `story_event_record` and emits story-scoped edges:

```typescript
function edgesForStoryEvent(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  // state_delta_create: SE → each created record
  for (const targetId of stringArrayField(record, "create", ["state_delta"])) {
    edges.push(createStoryRefEdge(node.node_id, "state_delta_create", storySlug, targetId));
  }

  // state_delta_supersede: SE → each superseded record
  for (const targetId of stringArrayField(record, "supersede", ["state_delta"])) {
    edges.push(createStoryRefEdge(node.node_id, "state_delta_supersede", storySlug, targetId));
  }

  // creation_evidence: parse intro tags from world_logic_rationale,
  // emit edge from each created record to each evidence record
  const introTags = extractIntroTags(stringField(record, "world_logic_rationale") ?? "");
  for (const tag of introTags) {
    for (const evidenceId of tag.evidence) {
      edges.push(
        createStoryRefEdge(storyNodeId(storySlug, tag.recordId), "creation_evidence", storySlug, evidenceId)
      );
    }
  }

  return edges;
}
```

Imported `extractIntroTags` from the shared module created by SPEC45STOSTAPRO-001.

### 3. Wire edgesForStoryEvent into the dispatch

Updated `edgesForStoryRecord()` to delegate to `edgesForStoryEvent` for `story_event_record` node_type.

No `state_delta_close` edges emit in this iteration; close events remain terminal and have no current consumer per SPEC-45 §Out of Scope.

### 4. Preserve build/sync insertion safety

Updated `listStoryBundleSourceFiles()` so story-event records are processed after other story-bundle `_source` classes. This keeps `creation_evidence` source records present before event-derived edges insert. Added full-build cleanup for `state_delta_create`, `state_delta_supersede`, and `creation_evidence` rows before reindexing so partial generated rows from a failed rebuild do not persist.

### 5. Extend tests at structured-edges.test.ts

Added new test cases to `tools/world-index/tests/structured-edges.test.ts` covering:

- Synthetic SE with 3 `state_delta.create`, 2 `state_delta.supersede`, 4 intro tags (each with 2 evidence ids) emits exactly 13 edges (3 + 2 + 4×2).
- Synthetic SE with empty `state_delta` and no `world_logic_rationale` emits 0 edges.
- Synthetic SE with malformed intro tag in `world_logic_rationale` rejects through the shared parser's `MidstoryIntroductionTagError` (parser behavior from SPEC45STOSTAPRO-001 is strict, not silent).
- Synthetic SE with `state_delta.close` populated still emits exactly 13 expected non-close edges; close is not indexed in this iteration.
- Edge `src`/`tgt`/`edge_type` field values match expected exactly (no truncation, no extra whitespace).

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify) — add 3 entries to `STORY_EDGE_TYPES`.
- `tools/world-index/src/parse/atomic.ts` (modify) — add `edgesForStoryEvent` helper; wire into dispatch; import `extractIntroTags`; process story events after other story source classes.
- `tools/world-index/src/commands/shared.ts` (modify) — clear provenance edge rows at the start of a full rebuild.
- `tools/world-index/tests/types.test.ts` (modify) — update edge registry counts and assert the three new edge types.
- `tools/world-index/tests/structured-edges.test.ts` (modify) — add edges-for-story-event test cases.

## Out of Scope

- `state_delta_close` edge type — deferred per SPEC-45 §Out of Scope (no consumer).
- `supersedes_record` edge type (record → predecessor) — deferred per SPEC-45 §Out of Scope (`state_delta_supersede` in-edges suffice for the Tier 1 consumer).
- MCP tool implementation — SPEC45STOSTAPRO-003.
- Consumer skill wiring — SPEC45STOSTAPRO-004.
- Validator extension for dangling-ref detection — SPEC45STOSTAPRO-005.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/world-index` passes after the new entries and helper land.
2. New test cases pass through the focused compiled lane: `node --test dist/tests/types.test.js dist/tests/structured-edges.test.js` from `tools/world-index`.
3. Indexer rebuild against red-bunny (post-Codex remediation) produces edge counts matching `Σ|SE.state_delta.create[]|`, `Σ|SE.state_delta.supersede[]|`, and `Σ(evidence per intro tag)` summed across red-bunny's 5 SE records.

### Invariants

1. `STORY_EDGE_TYPES` literal count is exactly 14 (was 11).
2. `EDGE_TYPES` composition at types.ts:100-106 still resolves at type-level (no breaking type changes to `EdgeType`).
3. `edgesForStoryEvent` is a pure function over its input record (no I/O, no side effects, no shared mutable state).
4. Pre-existing edge extraction for other story record classes (STENT / SF / SLT / PG / CHC / BR / OBL / THR) is unchanged in shape and count.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/structured-edges.test.ts` — covers the event-edge scenarios in §Landed Changes step 5.

### Commands

1. `npm run build` from `tools/world-index` — type-checking + compilation.
2. `node --test dist/tests/types.test.js dist/tests/structured-edges.test.js` from `tools/world-index` — focused compiled registry + event-edge tests.
3. `npm test` from `tools/world-index` — full world-index test suite.
4. `node tools/world-index/dist/src/cli.js build erotica-world` from the repo root — rebuilds the live red-bunny-containing index.
5. Node/SQLite count probe against `worlds/erotica-world/_index/world.db` — verifies red-bunny edge counts against SE YAML-derived totals.

## Outcome

Completed: 2026-05-18

What changed:

1. Added `state_delta_create`, `state_delta_supersede`, and `creation_evidence` to `STORY_EDGE_TYPES` and the composed `EDGE_TYPES` union.
2. Added `edgesForStoryEvent()` and wired it into story-record edge extraction for `story_event_record`.
3. Emitted `state_delta_create` and `state_delta_supersede` as SE-to-record story-scoped refs.
4. Emitted `creation_evidence` as introduced-record-to-evidence story-scoped refs using the shared strict intro-tag parser from SPEC45STOSTAPRO-001.
5. Kept `state_delta.close` unindexed.
6. Processed story event files after other story `_source` classes and cleared this ticket's provenance edge family at full-rebuild start to preserve SQLite FK safety for introduced-record source edges.
7. Added focused compiled tests for registry count, exact event-edge rows, empty event rows, and strict malformed intro-tag rejection.

Verification:

1. `npm run build` from `tools/world-index` — passed.
2. `node --test dist/tests/types.test.js dist/tests/structured-edges.test.js` from `tools/world-index` — passed, 6/6.
3. `npm test` from `tools/world-index` — passed, 95/95.
4. `node tools/world-index/dist/src/cli.js build erotica-world` from repo root — passed after the event-last ordering and full-build provenance-edge cleanup landed.
5. Red-bunny count probe after rebuild — expected and actual matched: `state_delta_create=81`, `state_delta_supersede=5`, `creation_evidence=9`.

Deviations:

1. The malformed intro-tag expectation was corrected during reassessment. SPEC45STOSTAPRO-001 preserved strict `MidstoryIntroductionTagError` behavior, so this ticket rejects malformed intro tags instead of silently emitting partial state-delta edges.
2. The live build path required a small insertion-order/supporting cleanup change in `tools/world-index/src/commands/shared.ts` and `listStoryBundleSourceFiles()`. Without it, `creation_evidence` edges can reference introduced records before those records are inserted during full rebuilds.
3. The first two red-bunny rebuild attempts failed with `FOREIGN KEY constraint failed` before the event-last ordering fix was complete. The final rebuild and count probe passed after the fix.
