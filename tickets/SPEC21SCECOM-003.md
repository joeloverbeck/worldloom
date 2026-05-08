# SPEC21SCECOM-003: Phase 1 (Coverage Diagnosis) — commitment-class matrix rewrite

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — full rewrite of `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (archetype names referenced in `arc_archetype_distribution`); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (COMMITMENT_CLASSES + ARC_ARCHETYPES enums)

## Problem

The current Phase 1 reference at `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` measures per-`shape:` coverage — a v1 14-value enum that v2 has retired (under v2 every authored SLT carries `shape: scene_commitment_arc`, making per-shape distribution degenerate). Per SPEC-21 §A, the diagnosis matrix must rebind to per-`commitment_class` and per-`arc_archetype` thinness measurement. Without this rewrite, Phase 1 surfaces meaningless distribution data, Phase 2 seed selection has no usable diagnosis input, and audit-mode RSP card targeting (which uses `target_commitment_class` and `target_arc_archetype` per SPEC-21 §F) has no consumer.

## Assumption Reassessment (2026-05-08)

1. The current file at `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (verified during SPEC-21 reassessment 2026-05-08) describes v1 per-shape thinness scanning. The rewrite per SPEC-21 §A replaces the per-`shape:` matrix with per-`commitment_class` + per-`arc_archetype` matrices; the recent-history repetition signal also rebinds to commitment_class.
2. The rewrite produces a structured diagnosis_matrix output with these top-level keys (per SPEC-21 §A): `open_obligations_by_commitment_class`, `active_threads_by_commitment_class`, `arc_archetype_distribution`, `commitment_class_distribution`, `content_intensity_distribution` (preserved from v1), `mysteries_in_play_by_arc`, `recent_history_repetition_signal`. Audit mode populates the matrix from RSP card `target_commitment_class` / `target_arc_archetype` fields; JIT mode reduces to one continuation-failure row from `caller_state_snapshot`.
3. Cross-skill boundary under audit: Phase 1 produces the diagnosis matrix consumed by Phase 2 (seed selection — `references/phase-2-generation-seeds.md`). The shared boundary is the matrix structure — Phase 2 reads `commitment_class_distribution` and `arc_archetype_distribution` to weight seed generation, reads `mysteries_in_play_by_arc.gap` to surface mystery-coverage seeds, and reads `recent_history_repetition_signal.over_represented` to suppress over-represented commitment_classes. Audit mode boundary: RSP card schema (`target_commitment_class` / `target_arc_archetype`) is owned by `branching-story-health-audit` and SPEC-22 Track 4; this ticket's Phase 1 prose consumes those fields without owning their schema.
4. FOUNDATIONS Rule 1 (No Floating Facts) is the principle motivating the diagnosis matrix: gaps surfaced by Phase 1 (commitment_classes with 0 eligible arcs, mysteries with no touching arc) drive Phase 2 to author arcs that pay off open obligations / advance active threads / brush against mysteries — preventing floating-OBL / floating-THR / floating-M states in the storylet pool.
5. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 added an explicit note clarifying that the OBL → `eligible_commitment_classes` mapping is heuristic (LLM-driven against the OBL's `type` and `subjects`), not a closed table. Implementation must reflect this — Phase 1 should prompt the LLM to enumerate which commitment_classes could plausibly pay off each open OBL given its narrative shape, NOT lookup against a static mapping table.

## Architecture Check

1. Per-commitment_class + per-arc_archetype matrix matches the runtime weighting axes (commitment_class_continuity bonus in branching-story-page-cycle Phase 4 selection per SPEC-20; commitment_class diversity threshold ≤30% in Phase 5 audit per SPEC-21 §D). Aligning the diagnosis axes with the runtime-selection and batch-audit axes keeps the authoring → runtime pipeline deterministic — Phase 1 surfaces the same gaps that Phase 4 selection and Phase 5 audit care about.
2. No backwards-compatibility shims — v1 per-shape distribution is retired entirely; the v1 14-value shape enum is degenerate under v2 and the rewrite replaces (not aliases) the matrix.

## Verification Layers

1. Coverage matrix correctness invariant → schema validation: every value in `commitment_class_distribution` is from the closed COMMITMENT_CLASSES enum (verified at runtime by SPEC-22's `record_schema_compliance` validator extension when consuming SLT records); every value in `arc_archetype_distribution` is from the closed ARC_ARCHETYPES enum.
2. Audit-mode RSP integration invariant → skill dry-run: invoking storylet-pool-authoring with `mode=audit` and an RSP card path produces a diagnosis matrix where each RSP becomes a diagnosis-matrix row with the card's `target_commitment_class` / `target_arc_archetype` driving Phase 2 seed selection.
3. JIT-mode reduction invariant → skill dry-run: invoking storylet-pool-authoring with `mode=jit parent_skill_invocation=true caller_state_snapshot=<snapshot>` produces a diagnosis matrix with exactly one row (the continuation-failure context).
4. FOUNDATIONS Rule 1 alignment check: gaps in `commitment_class_distribution` and `mysteries_in_play_by_arc.gap` surface as Phase 2 seed-selection priorities.

## What to Change

### 1. Rewrite `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`

Replace the file's body with the per-commitment_class + per-arc_archetype matrix description per SPEC-21 §A. Required sections:

- **Purpose statement**: Phase 1 produces the diagnosis matrix that drives Phase 2 seed selection; rebinding from v1 per-shape to v2 per-commitment_class + per-arc_archetype.
- **Direct invocation matrix structure** (the YAML block from SPEC-21 §A): `open_obligations_by_commitment_class`, `active_threads_by_commitment_class`, `arc_archetype_distribution` (key per ARC_ARCHETYPES enum value, value = pool occurrence count), `commitment_class_distribution` (key per COMMITMENT_CLASSES enum value, value = pool occurrence count), `content_intensity_distribution` (preserved from v1: tame / mature / explicit), `mysteries_in_play_by_arc` (per M-NNNN: touching_arcs, progressing_arcs, gap), `recent_history_repetition_signal` (last_5_pages_classes, over_represented).
- **OBL → eligible_commitment_classes mapping note**: explicit clarification that the mapping is LLM-driven heuristic per the OBL's `type` and `subjects` — not a closed table — per SPEC-21 §A reassessment-2026-05-08 addition.
- **Audit mode**: each RSP card row becomes a diagnosis-matrix entry; the card's `target_commitment_class` and `target_arc_archetype` fields drive Phase 2 seed selection. Cite SPEC-22 Track 4 ownership of the RSP card schema extension.
- **JIT mode**: diagnosis matrix reduces to one row — the continuation-failure context from `caller_state_snapshot` — and the JIT seed is one arc whose `commitment_class` matches the chosen CHC's `commitment_class`.
- **Cross-references**: cite `templates/arc-archetypes.md` (consumed for archetype-name vocabulary), `references/phase-2-generation-seeds.md` (downstream consumer of the matrix), and SPEC-22's COMMITMENT_CLASSES + ARC_ARCHETYPES enums (canonical-vocabularies source).

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (modify — full rewrite)

## Out of Scope

- Phase 2 seed-format rewrite (owned by SPEC21SCECOM-004)
- RSP card schema extension to add `target_commitment_class` / `target_arc_archetype` (owned by SPEC-22 Track 4 per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md`)
- Implementation of the canonical-vocabularies enums (owned by SPEC-22 Track 3)
- SKILL.md Process Flow updates that reference Phase 1 (owned by SPEC21SCECOM-007)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "shape:" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` returns 0 in the diagnosis-matrix YAML structure (per-shape distribution is retired; only `shape: scene_commitment_arc` boilerplate context, if any, remains)
2. `grep -E "(commitment_class|arc_archetype)" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md | wc -l` returns ≥10 (the rewrite is keyed on these terms)
3. The OBL → `eligible_commitment_classes` heuristic note is present: `grep "heuristic.*OBL" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` OR `grep "LLM-driven" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` returns ≥1 match
4. Audit mode and JIT mode special-case paragraphs are present and reference the appropriate inputs (RSP cards for audit; `caller_state_snapshot` for JIT)

### Invariants

1. Diagnosis matrix uses only closed-enum values from COMMITMENT_CLASSES and ARC_ARCHETYPES (no free-form vocabulary)
2. OBL → eligible_commitment_classes is documented as heuristic (LLM-driven), not as a closed lookup table
3. Audit-mode and JIT-mode invocation paths preserve their existing semantics (audit consumes RSP card targeting fields; JIT reduces to one row from caller_state_snapshot)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. The skill dry-run that exercises Phase 1 (`storylet-pool-authoring mode=seed` against a real story bundle) becomes runnable when SPEC21SCECOM-006 lands the Phase 4-5 gates and SPEC-22 implements the canonical-vocabularies enums.

### Commands

1. `grep -nE "(commitment_class|arc_archetype)" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md | head -20` (sanity-check the matrix axis terms appear throughout)
2. `wc -l .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (expect a similar order-of-magnitude line count to the v1 reference)
3. `grep -nE "(audit mode|jit mode|JIT mode)" .claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (expect both special-case paragraphs to be present)
