# SPEC20SCECOM-008: Phase 11 + Pre-flight — ARC_TRACE Persistence Integration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` ID pre-allocation list extended with `ARCTRACE-NNNN` per execution_mode budget; `.claude/skills/branching-story-page-cycle/SKILL.md` Phase 11 §1a envelope op-enumeration extended with `create_arc_trace_record`.
**Deps**: SPEC20SCECOM-004 (ARC_TRACE record class consumed; Phase 7.6 produces the record at runtime); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22 §Track 1 implements `create_arc_trace_record` patch-engine op + extends `expected_id_allocations.arc_trace_ids` envelope; SPEC-22 §Track 4 owns the PG `state_snapshot.arc_trace_id` / `arc_trace_emitted` schema fields)

## Problem

The page-cycle's structural Phase 11 staged commit pre-allocates IDs at pre-flight and emits envelope ops at Phase 11 §1a. Under the scene-commitment-arc pivot, ARC_TRACE persistence requires extending both surfaces: pre-flight pre-allocates `ARCTRACE-NNNN` per execution_mode budget (always in `authoring`; conditional in `interactive_runtime`; checkpoint-only in `batch_generation`), and Phase 11 §1a's envelope op-enumeration extends to include `create_arc_trace_record` when the trace was generated this turn. SPEC-20 §I specifies both extensions and the no-HARD-GATE-change discipline (ARC_TRACE persistence does not change the Phase 10 user-approval contract).

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` exists and houses the current ID pre-allocation list (`PG-NNNN`, `BR-NNNN`, plus one allocation per id-class for each class this turn creates records in: `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `SE`, `SLT`, `STLOC`, `STOBJ`, `DA`, `CHC`); the `ARCTRACE` extension is additive.
2. Verified `.claude/skills/branching-story-page-cycle/SKILL.md` Phase 11 §1a prose lists the envelope op-enumeration: `create_pg_record`, `create_se_record`, `create_sf_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_chc_record`, `create_slt_record` (JIT only), `create_stloc_record`, `create_stobj_record`, `append_story_diegetic_artifact_record`, `create_br_record`. Adding `create_arc_trace_record` is additive; Phase 11 §1a is the right insertion point.
3. Cross-skill boundary: `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)` is owned by SPEC-22 §Track 1 (id-allocation-race extension). The patch-engine envelope's `expected_id_allocations.arc_trace_ids` field is owned by SPEC-22 §Track 1. This ticket consumes both surfaces; the documentation discipline (when to pre-allocate per execution_mode) is the page-cycle skill's contract.
4. HARD-GATE / Mystery Reserve firewall semantics — renumbered from template item 5: ARC_TRACE persistence is a derived per-page artifact (non-authoritative for replay per archived SPEC-19 §C); its emission does NOT change the Phase 10 user-approval contract (preserved per arc-page in `authoring` mode) or the Phase 4.5 canon-promotion HARD-GATE handoff. Documented inline so a future reader sees the no-HARD-GATE-change discipline alongside the new op-enumeration.
5. Schema extension (renumbered from template item 6): consumes the PG `state_snapshot.arc_trace_id` and `arc_trace_emitted` fields (NEW per SPEC-20 §I); these fields are owned by SPEC-22 §Track 4. Additive consumer-side documentation — this ticket records when to populate them, not how to define them.

## Architecture Check

1. Per-execution-mode pre-allocation budget mirrors the per-execution-mode Phase 7.6 Layer 3 critic budget (SPEC20SCECOM-004) — both surfaces share the cost-discipline shape: authoring tolerates higher cost in exchange for catch rate; interactive_runtime amortizes; batch_generation samples. Consistency between the two budgets is intentional.
2. ARC_TRACE persistence non-authoritative for replay — under low-budget interactive_runtime (`arc_trace_emitted: false`), no `create_arc_trace_record` op is emitted; replay-equality is preserved because `state_snapshot.applied_effect_variant` (authoritative) is always recorded regardless of trace emission.
3. No HARD-GATE change: the existing Phase 10 user-approval HARD-GATE fires once per arc-page in `authoring` mode (~5x reduction in user pause-points vs. v1 beat-cadence per SPEC-20 §FOUNDATIONS Alignment); ARC_TRACE persistence does not introduce additional pause-points.
4. No backwards-compatibility aliasing/shims: pre-cutover, no ARC_TRACE records existed; post-cutover, the extension is the only path.

## Verification Layers

1. Pre-flight ID pre-allocation list extension → codebase grep-proof in `pre-flight-and-prerequisites.md` for `ARCTRACE` allocation rule per execution_mode.
2. Phase 11 §1a envelope op-enumeration extension → codebase grep-proof in `branching-story-page-cycle/SKILL.md` for `create_arc_trace_record` in the op list.
3. No-HARD-GATE-change discipline → codebase grep-proof for the explicit "ARC_TRACE persistence does not change the Phase 10 user-approval contract" prose.
4. `arc_trace_emitted: false` short-circuit → codebase grep-proof for the conditional emission rule (`create_arc_trace_record` op IS NOT emitted when `arc_trace_emitted: false`).

## What to Change

### 1. Pre-flight ID pre-allocation list extension

In `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`, locate the existing pre-allocation list section. Append the per-execution-mode ARCTRACE rule:

> Under v2, the list extends to include `ARCTRACE` when Phase 7.6 is configured to emit a trace this turn (per the per-execution-mode budget in §Phase 7.6 — see `phase-7-6-arc-trace-extraction.md`):
> - `authoring` mode (default): always pre-allocate `ARCTRACE-NNNN` (Phase 7.6 always runs).
> - `interactive_runtime` mode: pre-allocate `ARCTRACE-NNNN` only when Layer 1 or Layer 2 surfaced a possible violation that triggers Phase 7.6 Layer 3; otherwise omit and the PG record's `state_snapshot.arc_trace_emitted: false` reflects the absence.
> - `batch_generation` mode: pre-allocate at configured checkpoints only.
>
> When the trace is emitted, allocation routes through `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)` per SPEC-22 §Track 1's id-allocation-race extension. The PG record's `state_snapshot.arc_trace_id: ARCTRACE-NNNN` field is populated at Phase 7.6.

### 2. Phase 11 §1a envelope op-enumeration extension

In `.claude/skills/branching-story-page-cycle/SKILL.md`, locate Phase 11 §1a's envelope op-enumeration (the prose listing `create_pg_record`, `create_se_record`, …). Append:

> Under v2, the list extends to include `create_arc_trace_record` for `_source/arc-traces/ARCTRACE-NNNN.yaml` (the new ARC_TRACE record from Phase 7.6) — emitted IF the trace was generated this turn (per the Pre-flight pre-allocation rule above). The op shape mirrors other story-bundle ops: `{op: "create_arc_trace_record", target_world, target_file: "worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml", payload: {story_slug, record}}` per SPEC-22 §Track 1.
>
> The op IS NOT emitted when `arc_trace_emitted: false` (the PG record's marker for the omission). The envelope is otherwise unchanged — the engine routes the new op through the same patch-engine transaction as other story-bundle ops; `id_allocation_race` extends to cover ARCTRACE ids per SPEC-22.

### 3. No-HARD-GATE-change discipline

Add an explicit statement to either Phase 11 prose or to a §No HARD-GATE Change inline note:

> **No HARD-GATE change**: ARC_TRACE persistence is a derived per-page artifact (non-authoritative for replay per archived SPEC-19 §C); its emission does not change the Phase 10 user-approval contract or the Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` (preserved as never-elided in every execution_mode).

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify — pre-allocation list extension)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — Phase 11 §1a envelope op-enumeration; partial edit, does NOT touch Process Flow + Phase descriptions sections — those are SPEC20SCECOM-009)

## Out of Scope

- `create_arc_trace_record` patch-engine op implementation (SPEC-22 §Track 1).
- `expected_id_allocations.arc_trace_ids` envelope schema extension (SPEC-22 §Track 1).
- `id_allocation_race` pre-apply check extension for ARCTRACE ids (SPEC-22 §Track 1).
- PG `state_snapshot.arc_trace_id` and `arc_trace_emitted` schema field definitions (SPEC-22 §Track 4).
- Process Flow diagram update + Phase descriptions update in SKILL.md (SPEC20SCECOM-009).
- Phase 9 gate count update (SPEC20SCECOM-009).
- ARCTRACE-NNNN ID class registration in CLAUDE.md §ID Allocation Conventions (SPEC-22 §Track 3 cross-spec).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `branching-story-page-cycle` advances one tick on a v2 fixture in `authoring` mode; pre-flight pre-allocates `ARCTRACE-NNNN`; Phase 11 §1a emits `create_arc_trace_record` op; the patch-engine transaction succeeds.
2. Per-mode budget: `interactive_runtime` mode without Layer 1/2 surface skips ARCTRACE pre-allocation; PG record carries `state_snapshot.arc_trace_emitted: false`; no `create_arc_trace_record` op is emitted.
3. HARD-GATE preservation: in `authoring` mode, Phase 10 user-approval HARD-GATE fires once per arc-page (not once per ARC_TRACE emission); Phase 4.5 canon-promotion HARD-GATE preserved.

### Invariants

1. ARCTRACE pre-allocation matches per-execution-mode budget exactly — `authoring` always; `interactive_runtime` conditional on Layer 1/2 surface; `batch_generation` checkpoint-only.
2. Phase 11 §1a emits `create_arc_trace_record` IFF `arc_trace_emitted: true` (no orphan ops; no missed emissions).
3. No new HARD-GATE introduced; no existing HARD-GATE altered.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -nE "ARCTRACE-NNNN|ARCTRACE'" .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` — confirms ARCTRACE pre-allocation rule lands.
2. `grep -nE "authoring.*always|interactive_runtime.*conditional|batch_generation.*checkpoint" .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` — confirms per-execution-mode budget documented.
3. `grep -n "create_arc_trace_record" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms Phase 11 §1a op-enumeration extension lands.
4. `grep -n "No HARD-GATE change" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms no-HARD-GATE-change discipline lands.
