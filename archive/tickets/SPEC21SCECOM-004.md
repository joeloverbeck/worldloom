# SPEC21SCECOM-004: Phase 2 (Generation Seeds) — arc seed format rewrite

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — full rewrite of `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md`
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (archetype names referenced in seed brief generation); `archive/tickets/SPEC21SCECOM-003.md` (Phase 1 diagnosis matrix consumed by Phase 2 seed selection)

## Problem

At intake, the Phase 2 reference produced seeds with v1 fields: `(target OBL/THR engaged, shape, tone register, content_intensity, preconditions, dramatic transaction)`. Per SPEC-21 §B, v2 seeds must additionally specify `commitment_class`, `arc_archetype`, `entry_pressure`, `value_delta_target`, `scene_question` — the seed format expands from ~6 fields to 11 fields. Without this rewrite, Phase 3 (Structured Drafting) had no commitment_class / arc_archetype context to feed the LLM prompt, JIT mode had no path to produce its single seed from the continuation-failure context, and audit mode had no path to consume RSP card `target_commitment_class` / `target_arc_archetype` fields.

## Assumption Reassessment (2026-05-08)

1. The current file at `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (verified during SPEC-21 reassessment 2026-05-08) describes v1 seeds. The rewrite per SPEC-21 §B replaces the seed format with an arc seed format containing 11 fields: `commitment_class`, `arc_archetype`, `target_obligation` (OBL-NNNN | null), `target_thread` (THR-NNNN | null), `entry_pressure_description`, `scene_question`, `value_delta_target_axes` (list of `<strong_axis enum>`), `tone_register`, `content_intensity_band`, `implied_preconditions` (Phase 3 formalizes via DSL), `dramatic_transaction_summary`. Per SPEC-21 §Verification (post-reassessment 2026-05-08), 9 fields are mandatory and `target_obligation` / `target_thread` may be null.
2. Seed-count target preserved from v1: `target_pool_size + ceil(target_pool_size * 0.30)` for seed/focus batches (the +30% buffer absorbs Phase 4 rejections without forcing a stop-and-redraft cycle). Per SPEC-21 §B and the landed `references/phase-2-generation-seeds.md` Seed Count Target section. JIT mode produces exactly one seed.
3. Cross-skill boundary under audit: Phase 2 produces seeds consumed by Phase 3's LLM prompt assembly (`references/phase-3-structured-drafting.md`). Audit-mode boundary: RSP card `target_commitment_class` / `target_arc_archetype` fields are populated by `branching-story-health-audit` per SPEC-22 Track 4; this ticket consumes those fields without owning their schema. The `value_delta_target_axes` field uses the 8-value `strong_axis` enum from SPEC-22 Track 3 (`relationship_trajectory`, `obligation_state`, `information_posture`, `risk_cost_exposure`, `route_or_scene_type`, `thread_pressure`, `irreversibility`, `character_intention`).
4. Output schema extension: the arc seed format extends the v1 seed format additively (5 new fields added; 6 v1 fields preserved with possible renaming — `dramatic transaction` → `dramatic_transaction_summary`). Consumer of the seed format is Phase 3 (single internal consumer); the additive extension is safe because Phase 3 also rewrites under SPEC21SCECOM-005.
5. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 expanded §Verification "Arc-seed completeness" from 6 fields to all 11 fields with required vs. nullable distinction (9 mandatory, 2 nullable). This ticket reflects that 11-field set in the Phase 2 reference; future runtime validation should assert generated seeds carry the 9 mandatory fields plus explicit-null-or-id for the 2 nullable fields.
6. Final proof boundary correction: the live repo has no executable `storylet-pool-authoring` runner or SPEC-22 validator stack that can synthesize and validate 10 Phase 2 seeds in isolation. This docs-only ticket therefore verifies the landed reference by grep/manual review over the 11-field block, enum-source references, buffer rule, and audit/JIT mode prose. Runtime seed synthesis remains blocked on SPEC21SCECOM-005/006 and SPEC-22 implementation work.

## Architecture Check

1. The 11-field arc seed format aligns with the v2 SLT scaffold (Phase 3 fills the seven new structural blocks plus legacy fields). Each seed field maps cleanly to a target SLT field: `commitment_class` → `arc_contract.commitment_class`, `arc_archetype` → `arc_contract.arc_archetype`, `scene_question` → `dramatic_unit.scene_question`, `entry_pressure_description` → `dramatic_unit.entry_pressure.description`, `value_delta_target_axes` → guides which `beat_plan.beats[].state_significance` values the LLM populates, etc. The seed-to-SLT mapping is deterministic.
2. No backwards-compatibility shims — the 11-field format replaces (not aliases) the v1 format; v1 produced beat-granular seeds, v2 produces arc-granular seeds. The unit of authoring shifts from beat to scene-commitment arc.

## Verification Layers

1. Arc-seed completeness invariant → grep/manual review: the Phase 2 reference contains the 11-field `arc_seed` YAML block and documents 9 mandatory fields plus 2 explicit nullable fields.
2. Closed-enum compliance invariant → manual cross-reference: the Phase 2 reference cites SPEC-22 Track 3 as the source for COMMITMENT_CLASSES, ARC_ARCHETYPES, and STRONG_AXES, and lists the eight STRONG_AXES values used by `value_delta_target_axes`; `content_intensity_band` is constrained to {tame, mature, explicit}.
3. Buffer-rule invariant → arithmetic check: for `target_pool_size = N`, Phase 2 produces exactly `N + ceil(N * 0.30)` seeds in seed/focus mode; exactly 1 seed in JIT mode; consumes RSP cards in audit mode (one seed per RSP).
4. Audit-mode RSP integration invariant → grep/manual review: the reference consumes `target_commitment_class`, `target_arc_archetype`, `sketch_arc_contract`, and `sketch_dramatic_unit` from SPEC-22 Track 4 RSP cards and refuses to map historical v1 `proposed_shape` cards by guesswork.

## Landed Changes

### 1. Rewrote `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md`

Replaced the file's body with the arc seed format description per SPEC-21 §B:

- Purpose statement: Phase 2 produces arc seeds as proposals, not structured SLT records.
- Arc seed format: one 11-field YAML block with `<commitment_class enum>`, `<arc_archetype enum>`, and `<strong_axis enum>` fields.
- Required vs. nullable fields: 9 mandatory fields and 2 explicit nullable fields (`target_obligation`, `target_thread`).
- Seed-count target: `target_pool_size + ceil(target_pool_size * 0.30)` for seed/focus batches; JIT mode produces exactly 1 seed.
- Audit mode: consumes RSP `target_commitment_class`, `target_arc_archetype`, `sketch_arc_contract`, and `sketch_dramatic_unit` fields owned by SPEC-22 Track 4.
- JIT mode: produces one seed from `caller_state_snapshot`, with `commitment_class` matching the chosen CHC and `arc_archetype` selected from `templates/arc-archetypes.md`.
- Cross-references: cites Phase 1, Phase 3, `templates/arc-archetypes.md`, SPEC-22 Track 3, and SPEC-22 Track 4.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (modify — full rewrite)

## Out of Scope

- Phase 3 LLM prompt assembly rewrite (owned by SPEC21SCECOM-005)
- Implementation of canonical-vocabularies enums (owned by SPEC-22 Track 3)
- RSP card schema extension (owned by SPEC-22 Track 4)
- SKILL.md Process Flow updates (owned by SPEC21SCECOM-007)

## Acceptance Criteria

### Tests That Must Pass

1. The arc seed YAML block is present and lists 11 fields: `grep -E "^  (commitment_class|arc_archetype|target_obligation|target_thread|entry_pressure_description|scene_question|value_delta_target_axes|tone_register|content_intensity_band|implied_preconditions|dramatic_transaction_summary):" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` returns 11 field-name matches
2. The +30% buffer rule is preserved verbatim: `grep "ceil(target_pool_size" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` returns ≥1 match
3. Audit mode and JIT mode special-case paragraphs are present
4. The required vs. nullable distinction is documented (9 mandatory, 2 nullable): `grep -E "(mandatory|nullable|null )" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` returns ≥3 matches across the field list

### Invariants

1. Arc seed format has exactly 11 fields per SPEC-21 §B and reassessment 2026-05-08 §Verification
2. `target_pool_size + ceil(target_pool_size * 0.30)` buffer-rule arithmetic preserved from v1
3. Audit-mode and JIT-mode invocation paths produce seeds correctly (audit reads RSP fields; JIT reduces to 1 seed)
4. All enum-typed fields (commitment_class, arc_archetype, value_delta_target_axes elements, content_intensity_band) reference SPEC-22 Track 3 closed enums

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. Synthesizing 10 seeds against a real story bundle becomes runnable when SPEC21SCECOM-006 + SPEC-22 implementations land.

### Commands

1. `grep -E "^  [a-z_]+:" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md | sort -u | wc -l` (expect exactly 11 unique field names from the arc_seed YAML block)
2. `grep -nE "(audit mode|JIT mode|jit mode)" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (expect both special-case paragraphs)
3. `grep -nE "(mandatory|nullable)" .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (expect required-vs-nullable distinction documented)

## Outcome

Completed 2026-05-08. Rewrote Phase 2 generation seeds around the SPEC-21 scene-commitment-arc seed contract: 11 seed fields, 9 mandatory fields, 2 explicit nullable OBL/THR target fields, SPEC-22 closed-vocabulary references, structural +30% seed buffering, audit-mode RSP consumption, and JIT-mode single-seed behavior.

## Verification Result

1. `grep -E '^  (commitment_class|arc_archetype|target_obligation|target_thread|entry_pressure_description|scene_question|value_delta_target_axes|tone_register|content_intensity_band|implied_preconditions|dramatic_transaction_summary):' .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` -> 11 field-name matches.
2. `grep -E '^  [a-z_]+:' .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md | sort -u | wc -l` -> 11.
3. `grep 'ceil(target_pool_size' .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` -> `target_pool_size + ceil(target_pool_size * 0.30)`.
4. `grep -nE '(audit mode|JIT mode|jit mode)' .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` -> matched audit-mode and JIT-mode prose.
5. `grep -nE '(mandatory|Mandatory|nullable|Nullable|null )' .claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` -> matched the required-vs-nullable section and explicit-null guidance.
6. Manual cross-reference: the reference cites SPEC-22 Track 3 as the closed-vocabulary source for COMMITMENT_CLASSES, ARC_ARCHETYPES, and STRONG_AXES, lists the eight STRONG_AXES values, and cites SPEC-22 Track 4 as the RSP schema owner.

## Deviations

- The drafted future schema-validation proof that synthesizes 10 seeds was not runnable in the live repo. The active ticket remained docs-only and was verified by grep/manual review over the rewritten Phase 2 reference. Runtime seed synthesis remains blocked on SPEC21SCECOM-005/006 and SPEC-22 implementation work.
