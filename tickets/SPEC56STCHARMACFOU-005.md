# SPEC56STCHARMACFOU-005: World-index STCHAR node + edges

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (new node type + hybrid parse + 4 edge types + tests).
**Deps**: SPEC56STCHARMACFOU-002

## Problem

STCHAR records must be indexed and resolvable for MCP retrieval and validator reference-resolution to work. Without a world-index node type + parser + edges, `get_record(STCHAR)`, `stchar_resolves`, and the STCHAR-grounding edges have nothing to read.

## Assumption Reassessment (2026-05-20)

1. World-index node types and story edge types are both defined in `tools/world-index/src/schema/types.ts` (`NODE_TYPES`, `STORY_EDGE_TYPES`; verified this session — no `story_character_authority_record` node, no `stent_character_authority`/`stchar_*` edges yet). Edge **emission** lives in `tools/world-index/src/parse/atomic.ts` (verified — `page_active_record`/`choice_grounded_in` etc. are emitted there). **The spec's Phase-5 Files list (`src/parsers/*`, `src/edges/*`) is stale** — the actual dir is `src/parse/` (not `parsers`) and there is no `src/edges/` dir; this ticket targets `src/schema/types.ts` (definitions) + `src/parse/atomic.ts` (emission). Mechanical-drift correction, noted at Step 6.
2. The node type, hybrid-parse, and 4 edges are specified in `specs/SPEC-56-stchar-machine-foundation.md` §Phase 5 (reassessed this session). The hybrid parser is modeled on the existing `character_record` parser.
3. **Cross-artifact boundary under audit**: the STCHAR node/edges consume the schema (ticket 002) and the contract's `STENT.bound_stchar_id` / `STCHAR.source_char_id` / `supersedes` / `bound_stent_ids` surfaces (ticket 001). The 4 new edges must resolve those reference fields; the existing generic edges (`page_active_record`, `choice_grounded_in`, `plan_derived_from`, `emotion_derived_from`) must accept STCHAR after ticket 002's union widening.
4. **FOUNDATIONS principle restatement**: §4a Plan-Authority Boundary / "no floating facts" — indexing STCHAR as a resolvable, edge-connected node is what makes it a non-floating, referenceable authority (hash-backed, active in PG snapshots). The index is the mechanism that satisfies the no-floating-facts requirement for STCHAR references.

## Architecture Check

1. Modeling the STCHAR hybrid parser on the existing `character_record` parser reuses the established frontmatter+body parse path rather than inventing a new one — STCHAR is structurally a hybrid (like CHAR), so the parse shape is identical; only the node type and edge set differ.
2. No backwards-compatibility aliasing: new node type + edge types are additive; no existing node/edge is renamed.

## Verification Layers

1. STCHAR indexed as `story_character_authority_record`; frontmatter + body sections parse → world-index parse test against an STCHAR fixture.
2. The four new edges emit (`stent_character_authority`, `stchar_source_character`, `stchar_supersedes`, `stchar_bound_stent`) → edge-emission test asserting one edge per resolved reference.
3. `page_active_record` emits for active STCHAR → index test over a page snapshot containing `active_records.STCHAR`.

## What to Change

### 1. Node + edge type definitions (`src/schema/types.ts`)

Add `story_character_authority_record` to `NODE_TYPES`; add `stent_character_authority`, `stchar_source_character`, `stchar_supersedes`, `stchar_bound_stent` to `STORY_EDGE_TYPES`.

### 2. Hybrid parse + edge emission (`src/parse/atomic.ts` + hybrid parser)

Parse STCHAR frontmatter + body sections (model on the `character_record` hybrid parser). Emit the four new edges from the resolved STCHAR reference fields; ensure the generic edges accept STCHAR after the ticket-002 union widening.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/parse/` hybrid-record parser (modify — STCHAR frontmatter+body, model on `character_record`)
- `tools/world-index/tests/*` (new + modify — STCHAR index + edge-emission tests)

## Out of Scope

- MCP retrieval surfacing of indexed STCHAR (`get_record`, `list_records`, context-packet) — ticket 006.
- Patch-engine STCHAR write path — ticket 004.

## Acceptance Criteria

### Tests That Must Pass

1. STCHAR fixture indexes as `story_character_authority_record` with parsed frontmatter + body sections.
2. The four STCHAR edges emit (one per resolved reference); `page_active_record` emits for active STCHAR.
3. `npm test --prefix tools/world-index` green.

### Invariants

1. Every STCHAR reference field (`bound_stchar_id`, `source_char_id`, `supersedes`, `bound_stent_ids[]`) resolves to exactly one typed edge — no floating reference (§4a).
2. The hybrid parse follows the `character_record` parser's shape (no parallel parse path).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/*` (new) — STCHAR parse + node-type + 4-edge-emission tests; `page_active_record`-for-STCHAR test.

### Commands

1. `npm run build --prefix tools/world-index` (covers tsc).
2. `npm test --prefix tools/world-index`.
