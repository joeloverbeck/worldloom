# SPEC21SCECOM-003: Phase 1 (Coverage Diagnosis) — commitment-class matrix rewrite

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — full rewrite of `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (archetype names referenced in `arc_archetype_distribution`); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (COMMITMENT_CLASSES + ARC_ARCHETYPES enums)

## Problem

At intake, the Phase 1 reference at `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` measured per-`shape:` coverage — a v1 14-value enum that v2 retired. Per SPEC-21 §A, the diagnosis matrix needed to rebind to per-`commitment_class` and per-`arc_archetype` thinness measurement. Without this rewrite, Phase 1 surfaced degenerate distribution data, Phase 2 seed selection had no usable diagnosis input, and audit-mode RSP card targeting (which uses `target_commitment_class` and `target_arc_archetype` per SPEC-21 §F) had no Phase 1 consumer.

## Assumption Reassessment (2026-05-08)

1. The intake file at `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` described v1 per-shape thinness scanning. This ticket replaced that file with a per-`commitment_class` + per-`arc_archetype` diagnosis matrix; the recent-history repetition signal also rebinds to commitment_class.
2. The landed reference produces a structured `diagnosis_matrix` output with these top-level keys per SPEC-21 §A: `open_obligations_by_commitment_class`, `active_threads_by_commitment_class`, `arc_archetype_distribution`, `commitment_class_distribution`, `content_intensity_distribution`, `mysteries_in_play_by_arc`, and `recent_history_repetition_signal`. Audit mode has an `audit_rsp_rows` section populated from RSP `target_commitment_class` / `target_arc_archetype`; JIT mode has `jit_continuation_failure` from `caller_state_snapshot`.
3. Cross-skill boundary under audit: Phase 1 now produces the matrix that Phase 2 is intended to consume. The live Phase 2 reference at `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` remains v1 and is owned by active follow-up `tickets/SPEC21SCECOM-004.md`; this ticket does not rewrite Phase 2 or claim the end-to-end consumer is already operational.
4. FOUNDATIONS Rule 1 (No Floating Facts) is the principle motivating the diagnosis matrix: gaps surfaced by Phase 1 (commitment_classes with 0 eligible arcs, mysteries with no touching arc) drive Phase 2 to author arcs that pay off open obligations / advance active threads / brush against mysteries — preventing floating-OBL / floating-THR / floating-M states in the storylet pool.
5. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 added an explicit note clarifying that the OBL → `eligible_commitment_classes` mapping is heuristic (LLM-driven against the OBL's `type` and `subjects`), not a closed table. The landed Phase 1 reference includes this note and instructs the LLM to enumerate plausible commitment_classes rather than use a static mapping table.
6. Audit-mode boundary: the live `branching-story-health-audit` RSP card template still has the v1 `proposed_shape` fields; SPEC-22 Track 4 owns the RSP schema extension to `target_commitment_class` / `target_arc_archetype`. This ticket's Phase 1 reference consumes those future fields and explicitly stops rather than guessing when a historical RSP lacks them.

## Architecture Check

1. Per-commitment_class + per-arc_archetype matrix matches the runtime weighting axes (commitment_class_continuity bonus in branching-story-page-cycle Phase 4 selection per SPEC-20; commitment_class diversity threshold ≤30% in Phase 5 audit per SPEC-21 §D). Aligning the diagnosis axes with the runtime-selection and batch-audit axes keeps the authoring → runtime pipeline deterministic — Phase 1 surfaces the same gaps that Phase 4 selection and Phase 5 audit care about.
2. No backwards-compatibility shims — v1 per-shape distribution is retired entirely; the v1 14-value shape enum is degenerate under v2 and the rewrite replaces (not aliases) the matrix.

## Verification Layers

1. Coverage matrix correctness invariant → grep/manual review: `commitment_class_distribution` uses SPEC-22 Track 3 COMMITMENT_CLASSES values, and `arc_archetype_distribution` uses SPEC-22 Track 3 ARC_ARCHETYPES values.
2. Audit-mode RSP integration invariant → grep/manual review: the reference defines one `audit_rsp_rows` entry per RSP and consumes `target_commitment_class` / `target_arc_archetype` without owning the RSP schema migration.
3. JIT-mode reduction invariant → grep/manual review: the reference defines one `jit_continuation_failure` row from `caller_state_snapshot` and states that JIT does not run full pool-health scans.
4. FOUNDATIONS Rule 1 alignment check: gaps in `commitment_class_distribution`, OBL/THR rows, and `mysteries_in_play_by_arc.gap` surface as Phase 2 seed-selection priorities.

## Landed Changes

### 1. Rewrote `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`

The file now describes the per-commitment_class + per-arc_archetype matrix per SPEC-21 §A:

- Purpose statement rebinding Phase 1 from v1 per-shape diagnosis to v2 per-commitment_class and per-arc_archetype diagnosis.
- Direct invocation matrix with `open_obligations_by_commitment_class`, `active_threads_by_commitment_class`, `arc_archetype_distribution`, `commitment_class_distribution`, `content_intensity_distribution`, `mysteries_in_play_by_arc`, and `recent_history_repetition_signal`.
- OBL and THR classification rules documenting the OBL → `eligible_commitment_classes` mapping as an LLM-driven heuristic, not a closed table.
- Audit mode `audit_rsp_rows` consuming RSP `target_commitment_class` and `target_arc_archetype`, with SPEC-22 Track 4 schema ownership called out.
- JIT mode `jit_continuation_failure` reducing diagnosis to one `caller_state_snapshot` row and bypassing full pool-health scans.
- Cross-references to `templates/arc-archetypes.md`, `references/phase-2-generation-seeds.md`, and SPEC-22 Track 3 / Track 4 authorities.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (modify — full rewrite)

## Out of Scope

- Phase 2 seed-format rewrite (owned by SPEC21SCECOM-004)
- RSP card schema extension to add `target_commitment_class` / `target_arc_archetype` (owned by SPEC-22 Track 4 per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md`)
- Implementation of the canonical-vocabularies enums (owned by SPEC-22 Track 3)
- SKILL.md Process Flow updates that reference Phase 1 (owned by SPEC21SCECOM-007)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c 'shape:' .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` outputs `0` (grep exit 1 is expected because the stale literal is absent).
2. `grep -E "(commitment_class|arc_archetype)" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md | wc -l` returns ≥10 (the rewrite is keyed on these terms)
3. The OBL → `eligible_commitment_classes` heuristic note is present: `grep "heuristic.*OBL" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` OR `grep "LLM-driven" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` returns ≥1 match
4. Audit mode and JIT mode special-case paragraphs are present and reference the appropriate inputs (RSP cards for audit; `caller_state_snapshot` for JIT)

### Invariants

1. Diagnosis matrix uses only closed-enum values from COMMITMENT_CLASSES and ARC_ARCHETYPES (no free-form vocabulary)
2. OBL → eligible_commitment_classes is documented as heuristic (LLM-driven), not as a closed lookup table
3. Audit-mode and JIT-mode invocation paths preserve their existing semantics (audit consumes RSP card targeting fields; JIT reduces to one row from caller_state_snapshot)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep/manual-review based per Acceptance Criteria above. A real skill dry-run that exercises Phase 1 remains blocked until SPEC21SCECOM-004 rewrites Phase 2, SPEC21SCECOM-006 lands the Phase 4-5 gates, and SPEC-22 implements the canonical-vocabularies/RSP schema surfaces.

### Commands

1. `grep -nE "(commitment_class|arc_archetype)" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md | head -20` (sanity-check the matrix axis terms appear throughout)
2. `wc -l .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (expect a similar order-of-magnitude line count to the v1 reference)
3. `grep -nE "(audit mode|jit mode|JIT mode)" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (expect both special-case paragraphs to be present)

## Outcome

Completed 2026-05-08. Rewrote Phase 1 coverage diagnosis as a SPEC-21 scene-commitment-arc diagnosis matrix keyed by `commitment_class` and `arc_archetype`, with explicit OBL/THR heuristic classification, preserved content-intensity scanning, mystery-gap scanning, recent commitment-class repetition scanning, bootstrap handling, audit-mode RSP targeting, and JIT-mode reduction.

## Verification Result

1. `grep -c 'shape:' .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` -> `0` (grep exit 1 expected for no matches).
2. `grep -E '(commitment_class|arc_archetype)' .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md | wc -l` -> 35.
3. `grep -nE '(heuristic.*OBL|LLM-driven|audit mode|Audit Mode|jit mode|JIT Mode|caller_state_snapshot|target_commitment_class|target_arc_archetype)' .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` -> matched the LLM-driven note, Audit Mode section, JIT Mode section, RSP targeting fields, and `caller_state_snapshot` rows.
4. `wc -l .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` -> 272 lines.

## Deviations

- The ticket's initial dry-run language was narrowed to grep/manual-review proof. The live repo has no executable `storylet-pool-authoring` runner for Phase 1, the live Phase 2 reference is still v1 and owned by `tickets/SPEC21SCECOM-004.md`, and the RSP schema extension is still SPEC-22 Track 4 work.
