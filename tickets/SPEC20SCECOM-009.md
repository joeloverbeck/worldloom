# SPEC20SCECOM-009: Cross-Cutting Docs — branching-story-page-cycle SKILL.md Process Flow + Phase Descriptions + Phase 9 Gates

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/SKILL.md` Process Flow diagram extended (Phase 4b + Phase 7.6 added); HARD-GATE block updated; Phase descriptions updated for 4, 4b (NEW), 5, 7, 7.6 (NEW), 8; `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` extended with 5 new gates (total 17).
**Deps**: `archive/tickets/SPEC20SCECOM-001.md`, `archive/tickets/SPEC20SCECOM-002.md`, `archive/tickets/SPEC20SCECOM-003.md`, `archive/tickets/SPEC20SCECOM-004.md`, `archive/tickets/SPEC20SCECOM-005.md`, `archive/tickets/SPEC20SCECOM-006.md`, SPEC20SCECOM-008, `archive/tickets/SPEC20SCECOM-012.md`, SPEC20SCECOM-013 (all phase reference files and the Phase 8 label-prompt cleanup must land before SKILL.md cites them coherently); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22 §Track 2 implements 4 of the 5 new validators; the 5th — `arc_envelope_conformance` — is documented in SPEC-22's §Risks as a cross-spec gap to close at the post-SPEC-21 SPEC-22 reassessment)

## Problem

`branching-story-page-cycle/SKILL.md` carries the canonical Process Flow diagram, HARD-GATE block, and per-Phase summary descriptions. After SPEC20SCECOM-001 through 008 land their per-phase reference files, the SKILL.md surface needs coherent updates: the Process Flow must show the new Phase 4b + Phase 7.6 nodes, the HARD-GATE must reflect the no-additional-HARD-GATE discipline (Phase 4.5 + Phase 10 preserved), and the per-Phase descriptions must point at the rewritten reference files. Additionally, `phase-9-validation-gates.md` lists Phase 9's deterministic gates; SPEC-20 §E + Deliverables row 7 add 5 new gates (total 17). Per §Cross-Cutting Docs Ticket Shape, this ticket lands the docs surface atomically once all upstream implementation tickets have shipped.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/SKILL.md` exists and houses the Process Flow diagram (existing prose lists Phases 1, 2-3, 4, 4.5, 5, 6, 6.5, 7, 7.5, 8, 9, 10, 11), HARD-GATE block (covers Phase 4.5 canon-promotion + Phase 10 user-approval), and per-Phase summary descriptions (Phase 9 currently records 12 gates per existing prose). Cross-checked against SPEC20SCECOM-008 — that ticket also touches SKILL.md (Phase 11 §1a section); this ticket touches Process Flow + HARD-GATE + Phase descriptions sections. The two tickets edit different sections of the same file (per spec-to-tickets §Step 3 "When all deliverables modify the same file, decompose by logical section").
2. Verified `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` exists and houses the current 12-gate list. The 5 new gates per SPEC-20 §E:
   - `arc_envelope_conformance` — runtime gate consuming ARC_TRACE evidence (clarified in SPEC20SCECOM-004); SPEC-22 §Track 2 currently lists 7 validators, not this 8th — gap documented in SPEC-22 §Risks.
   - `effect_model_replay_safety` — owned by SPEC-22 §Track 2.
   - `arc_trace_evidence_alignment` — owned by SPEC-22 §Track 2.
   - `narrative_point_classification` — owned by SPEC-22 §Track 2.
   - `choice_worthiness_completeness` — owned by SPEC-22 §Track 2.
3. Cross-skill boundary: this ticket consumes the 6 phase-reference rewrites produced by SPEC20SCECOM-001..-006 (and the partial SKILL.md edit from SPEC20SCECOM-008); produces an integrated SKILL.md surface that the page-cycle's HARD-GATE block + Process Flow diagram cover end-to-end. The contract under audit is per-Phase summary fidelity (SKILL.md description matches reference-file content) and the Phase 9 gate count (12 → 17 reflects the 5 new gates).
4. FOUNDATIONS Rule 1 (No Floating Facts) — renumbered from template item 4: the 5 new Phase 9 gates each enforce arc-level invariants (envelope-conformance, replay-safety, trace-alignment, narrative-point-classification, choice-worthiness completeness). Documenting them in `phase-9-validation-gates.md` is the discipline that closes the floating-fact loop — Phase 9 records each gate's PASS/FAIL with rationale per existing skill discipline.
5. HARD-GATE / Mystery Reserve firewall semantics — renumbered from template item 5: this ticket updates the HARD-GATE block to reflect (a) Phase 4.5 canon-promotion HARD-GATE preserved (never-elided in every execution_mode); (b) Phase 10 user-approval HARD-GATE fires once per arc-page in `authoring` mode (not once per beat-render — ~5x reduction); (c) no new HARD-GATE introduced by ARC_TRACE persistence (SPEC20SCECOM-008 §No HARD-GATE Change discipline cited).

## Architecture Check

1. Cross-cutting docs ticket per §Cross-Cutting Docs Ticket Shape — all upstream phase tickets must land first; this ticket integrates them atomically. Splitting into per-phase SKILL.md edits would create a stale-window pattern where Process Flow shows Phase 4b but Phase 4 summary doesn't yet describe arc-selection.
2. Phase 9 gate count (12 → 17) is part of this ticket because it depends on the 5 new gates being defined upstream — adding gates before the validator surface is documented in references creates the same stale window.
3. No backwards-compatibility aliasing/shims: the v1 Process Flow + per-Phase descriptions are retired; the v2 surface is the only path post-cutover.

## Verification Layers

1. Process Flow diagram includes Phase 4b + Phase 7.6 → codebase grep-proof in SKILL.md for both phase nodes.
2. HARD-GATE block reflects Phase 4.5 + Phase 10 preservation + no-new-HARD-GATE discipline → codebase grep-proof for the discipline statement.
3. Per-Phase summary descriptions point at correct reference files → codebase grep-proof for cross-references to each phase-N reference file.
4. Phase 9 gate list includes 5 new gates (total 17) → codebase grep-proof in `phase-9-validation-gates.md` for each gate name and the count.
5. `arc_envelope_conformance` gate clarification points to SPEC-22 §Track 2 ownership → codebase grep-proof for the cross-spec attribution.

## What to Change

### 1. Process Flow diagram (SKILL.md)

Update the existing Process Flow diagram to insert Phase 4b (between Phase 4 and Phase 4.5) and Phase 7.6 (between Phase 7 and Phase 8). Preserve all other phases verbatim.

### 2. HARD-GATE block (SKILL.md)

Update the HARD-GATE block to:
- Preserve Phase 4.5 canon-promotion HARD-GATE handoff to `story-fact-promotion-to-canon` (never-elided in every execution_mode).
- Document that Phase 10 user-approval HARD-GATE fires once per arc-page in `authoring` mode (not once per beat-render).
- Add a clause: "ARC_TRACE persistence (Phase 7.6) does not change the Phase 10 user-approval contract or the Phase 4.5 canon-promotion handoff" (cite SPEC20SCECOM-008 §No HARD-GATE Change).

### 3. Per-Phase summary descriptions (SKILL.md)

Update Phase 4, 4b (NEW), 5, 7, 7.6 (NEW), 8 summary descriptions to:
- Phase 4: "Arc selection (was: storylet selection at beat granularity); see `references/phase-4-storylet-and-mystery-authority.md`."
- Phase 4b (NEW): "Effect-variant selection before render; deterministic pick by `weighted_pick_seed`; see `references/phase-4-storylet-and-mystery-authority.md` §Phase 4b."
- Phase 5: "State mutation at arc-close (extended to apply variant.required_effects); see `references/phase-5-state-mutation.md`."
- Phase 7: "Multi-beat arc render (was: single-beat render); length per Prose Craft Contract Rule 11; see `references/phase-7-page-render.md`."
- Phase 7.6 (NEW): "ARC_TRACE extraction + three-layer validation; per-execution-mode budget for Layer 3; see `references/phase-7-6-arc-trace-extraction.md`."
- Phase 8: "Choice-surface gate (was: habitual menu emission); 6-step gate; see `references/phase-8-choice-generation.md`."

### 4. Phase 9 gate list extension (`phase-9-validation-gates.md`)

In `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`, add 5 new gates to the existing 12-gate list (total 17):

- **Gate 13 — `arc_envelope_conformance`**: deterministic gate consuming ARC_TRACE evidence (per `references/phase-7-6-arc-trace-extraction.md`); validates no `possible_violations[]` entry of `severity: high` slipped past Phase 7.6 Layers 1-3 unaddressed; every `possible_violations[].envelope_item` references a real entry in `arc.execution_envelope.{invariants, required_functions, prohibited_actions}`; trace's `effect_evidence[]` realized-status consistent with chosen variant's `required_effects[]`. Validator implementation owned by SPEC-22 §Track 2 — currently lists 7 validators; this gate is an 8th and is documented in SPEC-22 §Risks as a cross-spec gap to close at the post-SPEC-21 SPEC-22 reassessment. Pages with `arc_trace_emitted: false` auto-PASS this gate with rationale `"ARC_TRACE not emitted under low-budget interactive_runtime configuration"`.
- **Gate 14 — `effect_model_replay_safety`**: deterministic gate; PG `state_snapshot.applied_effect_variant` is a valid `variants[].id` of realized arc's `effect_model`; SE record's ops are derivable from chosen variant's `required_effects[]`. Owned by SPEC-22 §Track 2.
- **Gate 15 — `arc_trace_evidence_alignment`**: deterministic gate; every ARC_TRACE evidence_span has valid `{start, end}` byte offsets within prose byte-range; every `effect_evidence[].effect_ref` references a real `required_effects[N]`. Owned by SPEC-22 §Track 2.
- **Gate 16 — `narrative_point_classification`**: deterministic gate; PG `state_snapshot.narrative_point_classification` is in the closed enum AND consistent with ARC_TRACE.stop_condition_hit.category. Owned by SPEC-22 §Track 2.
- **Gate 17 — `choice_worthiness_completeness`**: deterministic gate; every `choice_kind: scene_commitment` CHC has non-empty `likely_effects` + populated `choice_worthiness` block. Owned by SPEC-22 §Track 2.

Update the gate count in the reference file's intro from "12 gates" to "17 gates".

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — Process Flow + HARD-GATE + Phase descriptions sections; partial edit, does NOT touch Phase 11 §1a section — that's SPEC20SCECOM-008)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify — add 5 gates, update count 12 → 17)

## Out of Scope

- Per-phase reference file rewrites (SPEC20SCECOM-001..-006).
- NEW phase-7-6-arc-trace-extraction.md file (SPEC20SCECOM-004).
- Phase 11 §1a envelope op-enumeration extension (SPEC20SCECOM-008).
- Validator implementations for the 5 new gates (SPEC-22 §Track 2).
- `arc_envelope_conformance` validator addition to SPEC-22 §Track 2 (cross-spec; documented in SPEC-22 §Risks; resolved at post-SPEC-21 SPEC-22 reassessment).
- Bootstrap-skill SKILL.md updates (SPEC-22 §Track 4 sibling-skill alignment).
- ARCTRACE-NNNN ID class registration in CLAUDE.md §ID Allocation Conventions (SPEC-22 §Track 3).

## Acceptance Criteria

### Tests That Must Pass

1. Process Flow diagram parses (visual review): the new Phase 4b + Phase 7.6 nodes appear in the correct positions; no stale phase numbers.
2. Per-Phase summary cross-references resolve: every reference-file path cited in SKILL.md per-Phase descriptions corresponds to an existing file (post-SPEC20SCECOM-001..-008 landing).
3. Phase 9 gate count: `grep -c "Gate" phase-9-validation-gates.md` returns 17 (or the equivalent count by section anchor).

### Invariants

1. SKILL.md and per-phase reference files agree on phase semantics (no contradiction between summary description and reference content).
2. Phase 9 gate list is exhaustive — no validator implemented in SPEC-22 §Track 2 is absent from `phase-9-validation-gates.md`.
3. The HARD-GATE block lists ONLY the two preserved HARD-GATEs (Phase 4.5 + Phase 10); no new HARD-GATE introduced.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -nE "Phase 4b|Phase 7.6" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms Process Flow includes new phases.
2. `grep -nE "Phase 4.5|Phase 10" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms HARD-GATE block lists both preserved gates.
3. `grep -nE "arc_envelope_conformance|effect_model_replay_safety|arc_trace_evidence_alignment|narrative_point_classification|choice_worthiness_completeness" .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` — confirms all 5 new gates land.
4. `grep -nE "12 gates|17 gates" .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` — confirms count updated to 17.
5. `grep -n "ARC_TRACE persistence.*does not change" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms no-HARD-GATE-change discipline lands.
