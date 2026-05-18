# SPEC45STOSTAPRO-002: STORY_EDGE_TYPES additions + edgesForStoryEvent helper

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 3 entries to `tools/world-index/src/schema/types.ts` `STORY_EDGE_TYPES` array; adds new `edgesForStoryEvent` helper to `tools/world-index/src/parse/atomic.ts`; extends story-event indexing via the shared intro-tag parser from SPEC45STOSTAPRO-001.
**Deps**: `archive/tickets/SPEC45STOSTAPRO-001.md`

## Problem

`tools/world-index/src/parse/atomic.ts` `edgesForStoryRecord()` at lines 541-607 currently extracts zero edges from `story_event_record` (SE) records. The data needed for story-state provenance graph queries — which SE created which record, which SE superseded which record, which records cite which evidence — is fully present in the indexed YAML (`SE.state_delta.create[]`, `SE.state_delta.supersede[]`, and the SPEC-43 parseable intro tags in `SE.world_logic_rationale`) but unreachable via graph traversal because no edges exist. Per SPEC-45 §Approach Phase 1, this ticket adds 3 new entries to `STORY_EDGE_TYPES` (`state_delta_create`, `state_delta_supersede`, `creation_evidence`) and adds a new `edgesForStoryEvent` helper that extracts the corresponding edges from each indexed SE record. The shared intro-tag parser from SPEC45STOSTAPRO-001 supplies the parsed-tag data for `creation_evidence` edge emission.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-96` exports `STORY_EDGE_TYPES` as a const array with 11 entries (`world_entity_binding`, `story_fact_derived_from`, `created_at_page`, `opens_obligation`, `pays_off_obligation`, `complicates_obligation`, `transfers_obligation`, `parent_page`, `leaf_page`, `dependent_fact`, `thread_obligation`); the array is composed into `EDGE_TYPES` at line 100-106. `tools/world-index/src/parse/atomic.ts:541-607` exports `edgesForStoryRecord()` with one switch arm per existing edge-emitting record class (no `story_event_record` arm currently). Verified via Read.
2. SPEC-45 §Approach Phase 1 D1 specifies adding `state_delta_create`, `state_delta_supersede`, `creation_evidence` to `STORY_EDGE_TYPES`; D4 specifies new `edgesForStoryEvent(record)` helper near line 541; D6 specifies new test cases extending `tools/world-index/tests/parse/atomic.test.ts`. **Mechanical-drift note**: world-index tests live FLAT at `tools/world-index/tests/*.test.ts`; existing edge-extraction tests are at `tools/world-index/tests/structured-edges.test.ts`. The new edge-extraction test cases extend `structured-edges.test.ts` rather than creating a `parse/atomic.test.ts` file.
3. Cross-skill / cross-package boundary under audit: world-index emits edges that world-mcp's retrieval tools consume via `edges(src, tgt, edge_type)` SQL queries. SPEC45STOSTAPRO-003 builds the MCP tool that queries the new edges; this ticket and SPEC45STOSTAPRO-003 share the edge-type contract — the new `state_delta_create` / `state_delta_supersede` / `creation_evidence` edge_type strings must match exactly across producer (this ticket) and consumer (SPEC45STOSTAPRO-003).
4. FOUNDATIONS principle under audit: §Story Bundles §5b — *"every field in every story-bundle record schema must be load-bearing"*. This ticket adds zero new fields to any story-bundle record schema; the new edges are derived purely from existing fields (`SE.state_delta.create[]`, `SE.state_delta.supersede[]`, parsed `SE.world_logic_rationale` intro tags). The principle is honored by construction.

## Architecture Check

1. **Edge extraction matches the existing per-class dispatch pattern**: the new `edgesForStoryEvent` helper sits alongside the existing `edgesForStoryRecord` switch and is invoked for `story_event_record` node-type — the same shape every other story record class uses. No restructure of the dispatch is required to add the new arm; if the existing single-function shape becomes unwieldy with the SE-specific logic (regex parse + multi-source edge emission), the implementation may refactor for clarity, but the refactor stays within `atomic.ts` and does not change the function's external contract.
2. **No backwards-compatibility shims introduced**: the new edges are additive; no existing edge_type values change semantics. Pre-SPEC-45 indexes simply lacked these edges; running the indexer once after this ticket lands produces the new edges from existing YAML — no fixture changes, no data backfill, no PG mutation.

## Verification Layers

1. **STORY_EDGE_TYPES contains 14 entries (11 → 14)** → codebase grep-proof: `grep -c '".*"' tools/world-index/src/schema/types.ts` confirms STORY_EDGE_TYPES literal count; verify the 3 new strings are present.
2. **edgesForStoryEvent emits correct counts per SE** → schema validation via unit test: synthetic SE with 3 create + 2 supersede + 4 intro tags (with N evidence ids each) emits exactly `3 + 2 + Σ(evidence_per_tag)` edges; SE with empty state_delta and no intro tags emits zero edges; SE with malformed intro tag emits state_delta_* edges but zero creation_evidence edges.
3. **Indexer rebuild on red-bunny produces expected edge counts** → schema validation: `SELECT COUNT(*) FROM edges WHERE edge_type='state_delta_create' AND src LIKE 'SE-%'` equals `Σ|SE.state_delta.create[]|` summed across red-bunny's 5 SE records.

## What to Change

### 1. Extend STORY_EDGE_TYPES

In `tools/world-index/src/schema/types.ts:84-96`, add three entries to the `STORY_EDGE_TYPES` const array (alphabetical or grouped placement — operator judgment):

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

Array expands from 11 → 14 entries. `EDGE_TYPES` at line 100-106 composes them automatically (no change needed at the composition site).

### 2. Add edgesForStoryEvent helper to atomic.ts

In `tools/world-index/src/parse/atomic.ts` near line 541, add a new helper alongside the existing `edgesForStoryRecord`. The helper receives a parsed `story_event_record` and returns the edges it produces:

```typescript
function edgesForStoryEvent(record: ParsedStoryRecord): EdgeRow[] {
  const edges: EdgeRow[] = [];
  const seId = record.id;

  // state_delta_create: SE → each created record
  for (const targetId of record.state_delta?.create ?? []) {
    edges.push({ src: seId, tgt: targetId, edge_type: "state_delta_create" });
  }

  // state_delta_supersede: SE → each superseded record
  for (const targetId of record.state_delta?.supersede ?? []) {
    edges.push({ src: seId, tgt: targetId, edge_type: "state_delta_supersede" });
  }

  // creation_evidence: parse intro tags from world_logic_rationale,
  // emit edge from each created record to each evidence record
  const introTags = extractIntroTags(record.world_logic_rationale ?? "");
  for (const tag of introTags) {
    for (const evidenceId of tag.evidence) {
      edges.push({ src: tag.recordId, tgt: evidenceId, edge_type: "creation_evidence" });
    }
  }

  return edges;
}
```

Import `extractIntroTags` and `ParsedIntroTag` from the shared module created by SPEC45STOSTAPRO-001.

### 3. Wire edgesForStoryEvent into the dispatch

Update `edgesForStoryRecord()` (or its successor structure) to delegate to `edgesForStoryEvent` for `story_event_record` node_type. If the existing single-function shape becomes unwieldy (regex parse + multi-source edge emission inside a switch arm), refactor for clarity — extract per-class helpers into a per-class dispatch table or analogous structure. The refactor stays within `atomic.ts` and does not change the function's external contract (signature, return type, error semantics).

Do NOT emit `state_delta_close` edges in this iteration — close events are terminal and have no current consumer per SPEC-45 §Out of Scope.

### 4. Extend tests at structured-edges.test.ts

Add new test cases to `tools/world-index/tests/structured-edges.test.ts` (or create `tools/world-index/tests/edges-for-story-event.test.ts` if structurally cleaner) covering:

- Synthetic SE with 3 `state_delta.create`, 2 `state_delta.supersede`, 4 intro tags (each with 2 evidence ids) emits exactly 13 edges (3 + 2 + 4×2).
- Synthetic SE with empty `state_delta` and no `world_logic_rationale` emits 0 edges.
- Synthetic SE with malformed intro tag in `world_logic_rationale` emits `state_delta_*` edges normally but 0 `creation_evidence` edges (parser returns empty array).
- Synthetic SE with `state_delta.close` populated emits 0 `state_delta_close` edges (close not indexed in this iteration).
- Edge `src`/`tgt`/`edge_type` field values match expected exactly (no truncation, no extra whitespace).

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify) — add 3 entries to `STORY_EDGE_TYPES`.
- `tools/world-index/src/parse/atomic.ts` (modify) — add `edgesForStoryEvent` helper; wire into dispatch; import `extractIntroTags` from shared module.
- `tools/world-index/tests/structured-edges.test.ts` (modify) — add edges-for-story-event test cases; or new `tools/world-index/tests/edges-for-story-event.test.ts` if structurally cleaner.

## Out of Scope

- `state_delta_close` edge type — deferred per SPEC-45 §Out of Scope (no consumer).
- `supersedes_record` edge type (record → predecessor) — deferred per SPEC-45 §Out of Scope (`state_delta_supersede` in-edges suffice for the Tier 1 consumer).
- MCP tool implementation — SPEC45STOSTAPRO-003.
- Consumer skill wiring — SPEC45STOSTAPRO-004.
- Validator extension for dangling-ref detection — SPEC45STOSTAPRO-005.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/world-index` passes after the new entries and helper land.
2. New test cases pass: `npm test --prefix tools/world-index` (running only the new edges-for-story-event tests via `node --test dist/tests/structured-edges.test.js` or analogous).
3. Indexer rebuild against red-bunny (post-Codex remediation) produces edge counts matching `Σ|SE.state_delta.create[]|`, `Σ|SE.state_delta.supersede[]|`, and `Σ(evidence per intro tag)` summed across red-bunny's 5 SE records.

### Invariants

1. `STORY_EDGE_TYPES` literal count is exactly 14 (was 11).
2. `EDGE_TYPES` composition at types.ts:100-106 still resolves at type-level (no breaking type changes to `EdgeType`).
3. `edgesForStoryEvent` is a pure function over its input record (no I/O, no side effects, no shared mutable state).
4. Pre-existing edge extraction for other story record classes (STENT / SF / SLT / PG / CHC / BR / OBL / THR) is unchanged in shape and count.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/structured-edges.test.ts` (or new `tools/world-index/tests/edges-for-story-event.test.ts`) — covers the 4 enumerated scenarios in §What to Change step 4.

### Commands

1. `npm run build --prefix tools/world-index` — type-checking + compilation.
2. `npm test --prefix tools/world-index` — full world-index test suite.
3. End-to-end against red-bunny: rebuild index, then `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM edges WHERE edge_type IN ('state_delta_create','state_delta_supersede','creation_evidence')"` against the rebuilt index; manually verify counts against red-bunny SE YAML files.
