# SPEC21SCECOM-004: Phase 2 (Generation Seeds) — arc seed format rewrite

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — full rewrite of `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md`
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (archetype names referenced in seed brief generation); SPEC21SCECOM-003 (Phase 1 diagnosis matrix consumed by Phase 2 seed selection)

## Problem

The current Phase 2 reference produces seeds with v1 fields: `(target OBL/THR engaged, shape, tone register, content_intensity, preconditions, dramatic transaction)`. Per SPEC-21 §B, v2 seeds must additionally specify `commitment_class`, `arc_archetype`, `entry_pressure`, `value_delta_target`, `scene_question` — the seed format expands from ~6 fields to 11 fields. Without this rewrite, Phase 3 (Structured Drafting) has no commitment_class / arc_archetype context to feed the LLM prompt, JIT mode has no path to produce its single seed from the continuation-failure context, and audit mode has no path to consume RSP card `target_commitment_class` / `target_arc_archetype` fields.

## Assumption Reassessment (2026-05-08)

1. The current file at `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (verified during SPEC-21 reassessment 2026-05-08) describes v1 seeds. The rewrite per SPEC-21 §B replaces the seed format with an arc seed format containing 11 fields: `commitment_class`, `arc_archetype`, `target_obligation` (OBL-NNNN | null), `target_thread` (THR-NNNN | null), `entry_pressure_description`, `scene_question`, `value_delta_target_axes` (list of `<strong_axis enum>`), `tone_register`, `content_intensity_band`, `implied_preconditions` (Phase 3 formalizes via DSL), `dramatic_transaction_summary`. Per SPEC-21 §Verification (post-reassessment 2026-05-08), 9 fields are mandatory and `target_obligation` / `target_thread` may be null.
2. Seed-count target preserved from v1: `target_pool_size + ceil(target_pool_size × 0.30)` for seed/focus batches (the +30% buffer absorbs Phase 4 rejections without forcing a stop-and-redraft cycle). Per SPEC-21 §B and the existing skill `references/phase-2-generation-seeds.md:3` rule. JIT mode produces exactly one seed.
3. Cross-skill boundary under audit: Phase 2 produces seeds consumed by Phase 3's LLM prompt assembly (`references/phase-3-structured-drafting.md`). Audit-mode boundary: RSP card `target_commitment_class` / `target_arc_archetype` fields are populated by `branching-story-health-audit` per SPEC-22 Track 4; this ticket consumes those fields without owning their schema. The `value_delta_target_axes` field uses the 8-value `strong_axis` enum from SPEC-22 Track 3 (`relationship_trajectory`, `obligation_state`, `information_posture`, `risk_cost_exposure`, `route_or_scene_type`, `thread_pressure`, `irreversibility`, `character_intention`).
4. Output schema extension: the arc seed format extends the v1 seed format additively (5 new fields added; 6 v1 fields preserved with possible renaming — `dramatic transaction` → `dramatic_transaction_summary`). Consumer of the seed format is Phase 3 (single internal consumer); the additive extension is safe because Phase 3 also rewrites under SPEC21SCECOM-005.
5. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 expanded §Verification "Arc-seed completeness" from 6 fields to all 11 fields with required vs. nullable distinction (9 mandatory, 2 nullable). Implementation must reflect the 11-field set; the test-synthesis verification command synthesizes 10 seeds and asserts all 10 carry the 9 mandatory fields plus explicit-null-or-id for the 2 nullable fields.

## Architecture Check

1. The 11-field arc seed format aligns with the v2 SLT scaffold (Phase 3 fills the seven new structural blocks plus legacy fields). Each seed field maps cleanly to a target SLT field: `commitment_class` → `arc_contract.commitment_class`, `arc_archetype` → `arc_contract.arc_archetype`, `scene_question` → `dramatic_unit.scene_question`, `entry_pressure_description` → `dramatic_unit.entry_pressure.description`, `value_delta_target_axes` → guides which `beat_plan.beats[].state_significance` values the LLM populates, etc. The seed-to-SLT mapping is deterministic.
2. No backwards-compatibility shims — the 11-field format replaces (not aliases) the v1 format; v1 produced beat-granular seeds, v2 produces arc-granular seeds. The unit of authoring shifts from beat to scene-commitment arc.

## Verification Layers

1. Arc-seed completeness invariant → schema validation (SPEC-21 §Verification): synthesizing 10 seeds (e.g., via Phase 1 diagnosis matrix populated against a test bundle) produces 10 seeds where 9 mandatory fields are populated and 2 nullable fields are explicitly set (null or a real OBL-NNNN / THR-NNNN id).
2. Closed-enum compliance invariant → schema validation: every `commitment_class` value in seeds is from COMMITMENT_CLASSES; every `arc_archetype` value is from ARC_ARCHETYPES; every `value_delta_target_axes` entry is from STRONG_AXES; `content_intensity_band` is from {tame, mature, explicit}.
3. Buffer-rule invariant → arithmetic check: for `target_pool_size = N`, Phase 2 produces exactly `N + ceil(N × 0.30)` seeds in seed/focus mode; exactly 1 seed in JIT mode; consumes RSP cards in audit mode (one seed per RSP).
4. Audit-mode RSP integration invariant → skill dry-run: an RSP card with `target_commitment_class: <X>` and `target_arc_archetype: <Y>` populated drives Phase 2 to emit a seed with those exact values.

## What to Change

### 1. Rewrite `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md`

Replace the file's body with the arc seed format description per SPEC-21 §B. Required sections:

- **Purpose statement**: Phase 2 produces arc seeds (proposals, not yet structured records); each seed encodes a candidate scene-commitment-arc shape that Phase 3 fills into a v2 SLT record.
- **Arc seed format** (the YAML block from SPEC-21 §B): 11 fields with `<strong_axis enum>` for `value_delta_target_axes`, `<commitment_class enum>` for `commitment_class`, `<arc_archetype enum>` for `arc_archetype`. Cite SPEC-22 Track 3 enums as the closed-vocabulary source.
- **Required vs. nullable fields** (per reassessment 2026-05-08): 9 mandatory (`commitment_class`, `arc_archetype`, `entry_pressure_description`, `scene_question`, `value_delta_target_axes`, `tone_register`, `content_intensity_band`, `implied_preconditions`, `dramatic_transaction_summary`); 2 nullable (`target_obligation`, `target_thread`) — arcs that engage neither an OBL nor a THR are valid; the 2 nullable fields MUST be explicitly set (null or a real id).
- **Seed-count target**: `target_pool_size + ceil(target_pool_size × 0.30)` for seed/focus batches (the +30% buffer is structural — produces all N+30% upfront, not lazy-deferred). JIT mode = exactly 1 seed.
- **Audit mode**: seeds are populated from RSP cards' targeting fields (`target_commitment_class`, `target_arc_archetype`, `sketch_arc_contract`, `sketch_dramatic_unit` per SPEC-21 §F). The RSP card schema extension is owned by SPEC-22 Track 4; this section consumes those fields.
- **JIT mode**: produces exactly 1 seed from the continuation-failure context in `caller_state_snapshot`; the seed's `commitment_class` matches the chosen CHC's `commitment_class`.
- **Cross-references**: cite `templates/arc-archetypes.md` (archetype-name vocabulary), `references/phase-1-coverage-diagnosis.md` (upstream — diagnosis matrix), `references/phase-3-structured-drafting.md` (downstream — LLM prompt assembly).

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (modify — full rewrite)

## Out of Scope

- Phase 3 LLM prompt assembly rewrite (owned by SPEC21SCECOM-005)
- Implementation of canonical-vocabularies enums (owned by SPEC-22 Track 3)
- RSP card schema extension (owned by SPEC-22 Track 4)
- SKILL.md Process Flow updates (owned by SPEC21SCECOM-007)

## Acceptance Criteria

### Tests That Must Pass

1. The arc seed YAML block is present and lists 11 fields: `grep -E "^  (commitment_class|arc_archetype|target_obligation|target_thread|entry_pressure_description|scene_question|value_delta_target_axes|tone_register|content_intensity_band|implied_preconditions|dramatic_transaction_summary):" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` returns 11 distinct field-name matches
2. The +30% buffer rule is preserved verbatim: `grep "ceil(target_pool_size" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` returns ≥1 match
3. Audit mode and JIT mode special-case paragraphs are present
4. The required vs. nullable distinction is documented (9 mandatory, 2 nullable): `grep -E "(mandatory|nullable|null )" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` returns ≥3 matches across the field list

### Invariants

1. Arc seed format has exactly 11 fields per SPEC-21 §B and reassessment 2026-05-08 §Verification
2. `target_pool_size + ceil(target_pool_size × 0.30)` buffer-rule arithmetic preserved from v1
3. Audit-mode and JIT-mode invocation paths produce seeds correctly (audit reads RSP fields; JIT reduces to 1 seed)
4. All enum-typed fields (commitment_class, arc_archetype, value_delta_target_axes elements, content_intensity_band) reference SPEC-22 Track 3 closed enums

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. Synthesizing 10 seeds against a real story bundle becomes runnable when SPEC21SCECOM-006 + SPEC-22 implementations land.

### Commands

1. `grep -E "^  [a-z_]+:" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md | sort -u | wc -l` (expect ≥11 unique field names from the arc_seed YAML block)
2. `grep -nE "(audit mode|JIT mode|jit mode)" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (expect both special-case paragraphs)
3. `grep -nE "(mandatory|nullable)" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (expect required-vs-nullable distinction documented)
