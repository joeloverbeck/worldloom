# SPEC46STOPIPMAC-014: Phase C cross-cutting docs (MACHINE-FACING-LAYER.md story-edge enumeration)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md` (extend story-edge enumeration with 22 new edge types + placeholder-skip rationale + tick-history granularity note)
**Deps**: SPEC46STOPIPMAC-006, SPEC46STOPIPMAC-007, SPEC46STOPIPMAC-008, SPEC46STOPIPMAC-009, SPEC46STOPIPMAC-010, SPEC46STOPIPMAC-011, SPEC46STOPIPMAC-012, SPEC46STOPIPMAC-013

## Problem

After Phase C implementation tickets 006-013 land, the 22 new story-edge types added to `STORY_EDGE_TYPES` (4 BEL + 2 SREL + 2 STINT + 1 STSTAT + 3 CLK + 4 STSEC + 3 STQ + 3 SE = 22) plus the placeholder-skip convention (applied to `CLK.driver` and `STSEC.holders[]`) and the tick-history granularity convention (`CLK.tick_history[].event` emits one edge per entry; payload fields stay on the source record) need to be reflected in the canonical machine-facing-layer docs. `docs/MACHINE-FACING-LAYER.md` is the operator-facing reference for the world-index surface; without the new edge enumeration, skill operators and audit operators cannot discover what graph-walks the new edges enable. Landing the docs atomically once all Phase C implementation tickets ship matches the §Cross-Cutting Docs Ticket Shape from spec-to-tickets — grep-proof acceptance against the post-implementation tree.

## Assumption Reassessment (2026-05-18)

1. `docs/MACHINE-FACING-LAYER.md` exists and is the canonical operator-facing reference for the world-index, MCP server, patch engine, validator framework, and hooks per FOUNDATIONS §Machine-Facing Layer (cited at FOUNDATIONS line 537). The current story-edge enumeration covers the 14 pre-Phase-C edges; the new 22 edges contributed by sibling tickets 006-013 need to be enumerated, alongside the placeholder-skip and tick-history-granularity conventions.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C Deliverable D-C7 names `docs/MACHINE-FACING-LAYER.md` story-edge enumeration as the docs target; §R-3 (Risks & Open Questions) names the placeholder-skip convention's rationale as the second documentation concern.
3. Cross-skill boundary: `docs/MACHINE-FACING-LAYER.md` is consumed by skill operators authoring graph-walking queries, by integration-audit operators, and by readers cross-referencing FOUNDATIONS §Machine-Facing Layer. The docs update must enumerate every new edge type with its source class, target class, and semantic shape.
4. FOUNDATIONS §Machine-Facing Layer motivating this ticket (cited at FOUNDATIONS line 537 — *"a phased machine-facing layer beside the human-facing markdown"*): the operator-facing docs are the canonical reference for the world-index surface; without the new edge enumeration, skill operators and audit operators cannot discover the graph-walks the new edges enable. The placeholder-skip and tick-history-granularity convention statements similarly preserve operator-facing transparency per the principle's "directly or via the documented ... pattern" framing.

## Architecture Check

1. Cross-cutting docs ticket per §Cross-Cutting Docs Ticket Shape — landing the docs surface atomically once Phase C implementation tickets ship avoids the staleness window where partial Phase C is implemented but docs reflect either pre-Phase-C state or partial state. Per-ticket co-location of docs is rejected because the docs surface enumerates all 22 edges in one prose section, which requires every upstream surface to exist coherently before it can land.
2. No backwards-compatibility aliasing or shims introduced. The docs additions are additive — pre-Phase-C references to the existing 14 edges remain valid; the new 22 edges are net-additions.

## Verification Layers

1. **All 22 new edges enumerated** → codebase grep-proof: `grep -nE "belief_holder|belief_basis_event|belief_access_record|belief_opens|relationship_participant|relationship_derived_from|intention_holder|intention_supersedes|status_entity|clock_linked_record|clock_driver|clock_tick_event|secret_truth_anchor|secret_holder|secret_clue_carrier|secret_reveal_record|story_question_source|story_question_payoff_of|story_question_answer_record|event_actor|event_target|event_selected_storylet" docs/MACHINE-FACING-LAYER.md` returns hits for all 22 new edge type names.
2. **Placeholder-skip rationale present** → codebase grep-proof: `grep -n "placeholder\|group:\|driver.*system\|narrator" docs/MACHINE-FACING-LAYER.md` returns at least one hit naming the placeholder-skip convention applied to `CLK.driver` and `STSEC.holders[]`.
3. **Tick-history granularity note present** → codebase grep-proof: `grep -n "tick_history\|delta.*cause\|payload" docs/MACHINE-FACING-LAYER.md` returns at least one hit explaining that `clock_tick_event` edges encode only the `event` field; `delta` and `cause` payload stays on the source record.
4. **Edge-count update if cited** → codebase grep-proof: if `docs/MACHINE-FACING-LAYER.md` cites the current story-edge count (e.g., "14 story-edge types"), update to "36 story-edge types" — confirm via `grep -n "14 story" docs/MACHINE-FACING-LAYER.md` returning no stale matches.

## What to Change

### 1. Extend `docs/MACHINE-FACING-LAYER.md` story-edge enumeration

Locate the story-edge enumeration section in `docs/MACHINE-FACING-LAYER.md` and:
- Add the 22 new edge types to the enumeration, grouped by source class (BEL, SREL, STINT, STSTAT, CLK, STSEC, STQ, SE-extension). For each edge, name the source class, target class (per the Phase C table in spec §C), and semantic shape (one short sentence summarizing what the edge represents).
- Add a sub-section documenting the **placeholder-skip convention**: edges emit only when the source field resolves to a known node-id prefix; `group:<name>`, `system`, `unknown`, and `narrator` placeholder values are silently skipped to keep the edge graph capturing only record-to-record relations. The convention applies to `CLK.driver` and `STSEC.holders[]`. The information remains on the source record retrievable via `get_record`.
- Add a sub-section documenting the **tick-history granularity convention**: `clock_tick_event` edges encode one row per `tick_history[].event` field; the `delta` and `cause` payload fields stay on the source `CLK` record (not encoded as edge properties), matching SPEC-45's `creation_evidence` payload convention.
- If the doc cites a current story-edge count (e.g., "14 story-edge types"), update to "36 story-edge types" per the post-Phase-C total.

### 2. Add a brief Out-of-Scope / Future note

Add a brief note pointing to the deferred Priority 2 packets (dramatic-irony, social-pressure, reader-expectation, branch-possibility-space) that will consume the new edges, so doc readers know the 22 new edges are foundation for those packets but not the packets themselves.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify — extend story-edge enumeration with 22 new edge types + placeholder-skip sub-section + tick-history-granularity sub-section + edge-count update if cited)

## Out of Scope

- Production code changes: covered by sibling tickets 006-013.
- Phase B documentation (`docs/CONTEXT-PACKET-CONTRACT.md` + registered `get_context_packet` capability description in `tools/world-mcp/src/server.ts`): covered by `archive/tickets/SPEC46STOPIPMAC-005.md`.
- Updates to skill prose under `.claude/skills/` that reference the new edges: spec §Deliverable D-X2 marks this as strictly opt-in / no-change.

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: all 22 new edge type names appear in `docs/MACHINE-FACING-LAYER.md` (verification command in the Test Plan below).
2. Grep-proof: placeholder-skip convention is documented with reference to `CLK.driver` and `STSEC.holders[]`.
3. Grep-proof: tick-history granularity note explicitly states `delta` and `cause` payload stays on the source record.
4. If a story-edge count is cited in the doc, it reads "36" not "14" or other stale value after this ticket lands.

### Invariants

1. Every edge type name added to `docs/MACHINE-FACING-LAYER.md` matches the edge type string landed on `STORY_EDGE_TYPES` by sibling tickets 006-013 — no drift between the docs enumeration and the const-typed const.
2. The placeholder-skip convention statement in the docs matches the convention applied in code by SPEC46STOPIPMAC-010 (CLK.driver) and SPEC46STOPIPMAC-011 (STSEC.holders[]) — single source of truth for the convention's rationale; the docs section is the canonical operator reference.
3. The tick-history granularity statement matches the convention applied in code by SPEC46STOPIPMAC-010 — `clock_tick_event` encodes only `event`, not `delta` or `cause`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "belief_holder|belief_basis_event|belief_access_record|belief_opens|relationship_participant|relationship_derived_from|intention_holder|intention_supersedes|status_entity|clock_linked_record|clock_driver|clock_tick_event|secret_truth_anchor|secret_holder|secret_clue_carrier|secret_reveal_record|story_question_source|story_question_payoff_of|story_question_answer_record|event_actor|event_target|event_selected_storylet" docs/MACHINE-FACING-LAYER.md` (targeted grep-proof: all 22 new edge type names appear)
2. `grep -n "placeholder\|group:\|narrator" docs/MACHINE-FACING-LAYER.md` (placeholder-skip convention documented)
3. `grep -n "tick_history\|delta.*cause" docs/MACHINE-FACING-LAYER.md` (tick-history granularity documented)
4. `grep -n "14 story\|14 edge" docs/MACHINE-FACING-LAYER.md` (returns nothing — any stale "14" count was updated to "36")
