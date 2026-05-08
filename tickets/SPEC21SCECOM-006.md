# SPEC21SCECOM-006: Phase 4-5 — 14 gates, diversity axes refactor, governance Rule 11 update

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium-Large
**Engine Changes**: Yes — full rewrite of `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` + targeted update to `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md`
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (archetype names referenced in gate 14 leverage check); SPEC21SCECOM-005 (Phase 3 produces v2 records consumed by Phase 4 gates 9-13); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (validators `arc_schema_compliance`, `stop_policy_parsability`, `effect_model_legality` backstop Phase 4 gates via Phase 5b)

## Problem

The current Phase 4 reference enforces 9 per-storylet gates (mystery firewall, resolution-authority, invariant compatibility, consequence capacity, dedup, content-intensity, predicate DSL parsability, branch-contamination, schema completeness). Per SPEC-21 §D, v2 extends to 14 gates by adding gate 10 (Arc envelope conformance), gate 11 (Stop-policy parsability), gate 12 (Effect-model legality), gate 13 (Exit-portfolio completeness), and gate 14 (Rule 11 spectator-caste leverage). Gate 1 (mystery firewall) extends with dual-field discipline (v1 `mystery_safety` storylet-level + v2 `execution_envelope.mystery_preservation` envelope-level). Phase 5 diversity axes refactor: shape ≤40% retired (degenerate under v2); commitment_class ≤30%, arc_archetype ≤25%, dramatic-unit-coverage ≥30% per `strong_axis` enum value (8 axes) added; tone ≤40%, theme ≤50%, OBL-engagement ≥60%, cast usage preserved. The governance reference's FOUNDATIONS Alignment table Rule 11 row needs update to acknowledge story-scope extension. Without this rewrite, Phase 4 admits v2 records that fail SPEC-22's downstream validators and Phase 5 produces meaningless distribution data.

## Assumption Reassessment (2026-05-08)

1. The current Phase 4-5 reference at `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` describes 9 v1 gates + 6-axis v1 diversity audit (verified during SPEC-21 reassessment 2026-05-08). The rewrite adds gates 10-14 + extends gate 1's dual-field discipline + replaces v1 axes with v2 axes per SPEC-21 §D.
2. The governance reference at `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` has a FOUNDATIONS Alignment table whose Rule 11 row needs update per SPEC-21's reassessment 2026-05-08: explicit acknowledgment that gate 14 extends Rule 11 to story scope as a deliberate non-default extension (FOUNDATIONS §Story Bundles §5: "Rules 2 / 3 / 6 / 11 / 12 govern world-canon-mutation surfaces ... not story-scope record validators by default"). The update to governance-and-foundations.md is a targeted edit (one row modification + rationale append), not a full rewrite.
3. Cross-skill boundary under audit: Phase 4-5 gates feed Phase 5b's `validate_patch_plan` engine pre-validation (per current `SKILL.md` Phase 5b inline block at lines 246-255, which lists `record_schema_compliance`, `storylet_predicate_dsl_parsability`, `rule11_action_space`, `rule12_redundancy` among coverage). SPEC-22 Track 2 extends `record_schema_compliance` to handle SLT v2 + extends the predicate-DSL grammar to include stop-policy predicates — these extensions transitively backstop Phase 4 gates 9, 11. Gate 10 (`arc_envelope_conformance`) has no SPEC-22 validator implementation in Track 2's listed inventory (per SPEC-22 §Risks "Post-SPEC-21 reassessment required" entry #2: "8th validator gap"); this ticket implements gate 10 as a skill-Phase-4-only deterministic check until SPEC-22's reassessment cycle adds the validator. Gate 14 (Rule 11 leverage) is also skill-internal-only — the existing `rule11_action_space` engine validator's `applies_to: appliesToCanonFacts` only runs over CF records, not SLTs (verified during SPEC-21 reassessment 2026-05-08 against `tools/validators/src/rules/rule11-action-space.ts:28`).
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately) is the principle motivating gate 1's dual-field discipline: the v1 `mystery_safety` field declares storylet-level mystery interactions; the v2 `execution_envelope.mystery_preservation` field declares per-beat enforcement during render. The two fields are not redundant — gate 1 validates BOTH and HARD-REJECTs inconsistencies between them (e.g., `mystery_safety.forbidden_M_resolved: false` but `execution_envelope.mystery_preservation.forbidden_resolutions[]` is empty AND the world has `forbidden`-status M ids — the envelope cannot enforce what the meta-declaration claims is safe). FOUNDATIONS Rule 11 (No Spectator Castes by Accident) motivates gate 14: when `effect_model.required_effects` includes a `fact_create` op with `args.truth_scope.world_level == true` AND `args.exception_governance` populated, arc.notes MUST carry a `leverage:`-prefixed line enumerating ≥3 ordinary-actor leverage forms from the canonical permissible-enum.
5. HARD-GATE / Canon Safety Check surface under audit: Phase 4 gate 1 mystery-firewall hard-reject of `canon_candidate`-on-author-pool storylets is a separate, structurally-prior refusal that fires before the user-facing HARD-GATE (per current SKILL.md HARD-GATE block). Adding gates 10-14 does NOT weaken this firewall — gates 10-14 add new HARD-REJECT failure modes; the canon_candidate-on-author-pool refusal stays untouched.
6. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 reconciled three Gate 14 trigger inconsistencies (§D, §Risks, §Verification) into a single canonical trigger — fires when `effect_model.required_effects` includes a `fact_create` op with `args.truth_scope.world_level == true` AND `args.exception_governance` populated. The reassessment also reconciled the Phase 5 dramatic-unit-coverage axis source — measurement uses `beat_plan.beats[].state_significance` (NOT `value_delta_target` which has only 4 sub-blocks) aggregated across all beats in all arcs in the batch, using the 8-axis `strong_axis` enum. Implementation must reflect these reconciliations verbatim.

## Architecture Check

1. The 14-gate structure preserves the v1 gate-1-through-9 numbering and adds 10-14 as net-new HARD-REJECT modes — no renumbering, no semantic re-binding of existing gates (gates 5 and 9 receive scope clarification under v2 but their gate-numbers are stable). This keeps existing PASS/FAIL rationale logs from prior sessions readable as PASS/FAIL evidence at gates 1-9; new logs add gates 10-14 entries. Audit-trail compatibility preserved.
2. Gate 14 as skill-internal-only (no SPEC-22 validator) is the right scope for v1 — the Rule 11 leverage check is a skill-level deterministic pattern match against arc.notes, not an engine-level structural validator. Adding `rule11_action_space_arc` to SPEC-22's validator inventory is a future enhancement (deferred per SPEC-21 §Risks); gate 14 still fires at Phase 4 with skill-internal logic in v1.
3. Phase 5 axis basis (`beat_plan.beats[].state_significance` for dramatic-unit-coverage) aligns with the runtime per-beat strong-axis-significance signal that branching-story-page-cycle's Phase 4 selection consumes (per SPEC-20 §Phase 4 selection scoring). Aligning the authoring diversity-audit axis with the runtime-selection axis keeps the pool's coverage in lockstep with what runtime selection rewards — no axis-source mismatch between authoring-time discipline and runtime behavior.
4. No backwards-compatibility shims — v1 per-shape ≤40% diversity threshold is retired entirely (degenerate under v2's mono-shape `scene_commitment_arc`); the rewrite replaces (not aliases) the axis. Gate 1 dual-field discipline is additive (v2 envelope-level check is added to v1 storylet-level check, both must pass).

## Verification Layers

1. Phase 4 gate coverage invariant (per SPEC-21 §Verification) → schema validation + skill dry-run: every candidate arc records PASS with one-line rationale across all 14 gates; bare PASS without rationale is treated as FAIL (existing skill discipline).
2. Phase 5 diversity threshold invariant → arithmetic check: a 20-arc batch has commitment_class ≤30% per class, arc_archetype ≤25% per archetype, tone ≤40%, theme ≤50%, OBL-engagement ≥60%, and each of 8 `strong_axis` values appears as `beat_plan.beats[].state_significance` on ≥30% of the batch's arcs.
3. Gate 1 dual-field discipline invariant → schema validation: a v2 SLT missing either `mystery_safety` (storylet-level) or `execution_envelope.mystery_preservation` (envelope-level) is HARD-REJECTed; an inconsistency between the two (envelope-empty-but-world-has-forbidden-M) is also HARD-REJECTed.
4. Gate 14 trigger narrowness invariant → skill dry-run: an arc whose `effect_model.required_effects` includes ONLY non-fact_create entries (e.g., `mystery_progress` on a low-safety mystery, `relationship_axis_shift`, `thread_pressure_delta`) does NOT trigger gate 14; an arc whose `effect_model.required_effects` includes a `fact_create` with `args.truth_scope.world_level == true` AND `args.exception_governance` populated DOES trigger gate 14, and HARD-REJECTs if arc.notes lacks a `leverage:` line with ≥3 forms.
5. FOUNDATIONS Rule 11 story-scope extension alignment check (per reassessment 2026-05-08): governance-and-foundations.md Rule 11 row's Rationale field explicitly cites FOUNDATIONS §Story Bundles §5 as the "non-default extension" basis.

## What to Change

### 1. Rewrite `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`

Replace the file's body with the 14-gate enumeration + Phase 5 v2 diversity axes per SPEC-21 §D. Required sections:

- **Phase 4 — Per-Storylet Validation Gates (14 gates)**: tabular enumeration with Failure mode = HARD-REJECT for each. Gates 1-9 preserve v1 semantics with extensions: gate 1 dual-field discipline (storylet-level `mystery_safety` + envelope-level `execution_envelope.mystery_preservation` per SPEC-21 §D); gate 5 dedup now per-`(commitment_class, arc_archetype, target_obligation)`; gate 7 predicate DSL parsability extends to include stop_policy predicates; gate 9 schema completeness extends to v2 (all seven new structural blocks populated). Gates 10-14: gate 10 (Arc envelope conformance — skill-internal-only per SPEC-21 §Risks routing the validator implementation back to SPEC-22 reassessment; check envelope.invariants and required_functions are kebab-case strings, no free-form prose, reference open-vocab); gate 11 (Stop-policy parsability — every entry parses against extended DSL, args match per-predicate args schema; backstopped by SPEC-22's `stop_policy_parsability` validator at Phase 5b); gate 12 (Effect-model legality — every variant.required_effects has ≥1 entry from closed effect-type enum; ≥1 variant; backstopped by SPEC-22's `effect_model_legality` validator at Phase 5b); gate 13 (Exit-portfolio completeness — ≥1 native_seed; engine_discovered_exit_budget block present with min/max/allowed_sources; sub-field minimums enforced by SPEC-22's `arc_schema_compliance` validator); gate 14 (Rule 11 spectator-caste leverage — skill-internal-only; trigger: `effect_model.required_effects` includes a `fact_create` op with `args.truth_scope.world_level == true` AND `args.exception_governance` populated; check: arc.notes has `leverage:`-prefixed line with ≥3 ordinary-actor leverage forms from the canonical permissible-enum).
- **Gate 1 dual-field discipline section** (per SPEC-21 §D): explicit enumeration of v1 `mystery_safety` storylet-level checks (`forbidden_M_resolved == false`; `resolution_safety_per_M{}` consistent with each cited M's actual `future_resolution_safety`; `M_resolution_claims[].requires_canon_promotion == true` IFF `resolution_authority == canon_candidate`) AND v2 `execution_envelope.mystery_preservation` envelope-level checks (`forbidden_resolutions[]` includes every `forbidden`-status M id from the world's whole-class M load; `allowed_claims[]` is a non-empty subset of `{apparent, branch_local_counterfactual, canon_candidate}` consistent with the storylet's `mystery_safety.M_resolution_claims[].resolution_authority` values).
- **Up to 2 revise retries per gate** before drop-and-replace via under-represented seed (preserved from v1).
- **Phase 5 — Diversity Audit (axes refactored for arc semantics)**: tabular enumeration with v1 thresholds replaced by v2 thresholds. `commitment_class` ≤30% per class (tighter because enum is larger — 20 vs 14); `arc_archetype` ≤25% per archetype (new); tone ≤40% per tag (preserved); theme ≤50% per tag (preserved); content-intensity matches baseline (preserved); OBL-engagement ≥60% in seed; cast usage (no major cast member with zero engagement); dramatic-unit-coverage (NEW — measured against `beat_plan.beats[].state_significance` aggregated across all beats in all arcs in the batch using the 8-axis `strong_axis` enum: each axis appears on ≥30% of the batch's arcs).
- **Up to 2 diversity-correction iterations** before escalating to user (preserved from v1).
- **JIT mode bypasses Phase 5** (one storylet has no diversity profile); audit mode bypasses Phase 5 except for batch-level branch-contamination + RSP visibility-match (preserved).
- **Cross-references**: cite SPEC-22's validators (Track 2: `arc_schema_compliance`, `stop_policy_parsability`, `effect_model_legality`) as Phase 5b backstops; cite SPEC-21 §Risks routing for gate 10's deferred validator; cite `templates/storylet-record.yaml` for v2 SLT structural fields; cite `templates/predicate-dsl.md` for stop-predicate grammar.

### 2. Update `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md`

Targeted update to the FOUNDATIONS Alignment table's Rule 11 row (per SPEC-21 reassessment 2026-05-08):

- Change the Rule 11 row's Rationale from a generic "aligned" statement to a specific acknowledgment: "NEW gate 14 — when `arc.effect_model.required_effects` includes a `fact_create` op with world-level scope AND exception_governance populated, `arc.notes` must carry a `leverage:`-prefixed line enumerating ≥3 ordinary-actor leverage forms (mirrors create-base-world Phase 9's genesis spectator-caste check from SPEC-18). Note: extends Rule 11 to story scope as a deliberate non-default extension per FOUNDATIONS §Story Bundles §5 ('Rules 2 / 3 / 6 / 11 / 12 ... are not story-scope record validators by default'); rationale — arcs whose `required_effects` implicate world-level capabilities need leverage discipline parallel to canon-addition's CF-level Rule 11 enforcement."
- Optionally add a sub-section discussing the dual-field mystery-firewall discipline (Rule 7) under v2 — referencing SPEC-21 §D's gate 1 expansion.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify — full rewrite)
- `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (modify — Rule 11 row update + optional Rule 7 dual-field note)

## Out of Scope

- Implementation of `arc_envelope_conformance` validator (deferred per SPEC-21 §Risks routing to SPEC-22 reassessment cycle — "8th validator gap")
- Implementation of `rule11_action_space_arc` validator (deferred per SPEC-21 §Risks; not in v1 scope)
- SPEC-22 Track 2 validator implementations (`arc_schema_compliance`, `stop_policy_parsability`, `effect_model_legality`) — owned by SPEC-22
- SKILL.md HARD-GATE block update to reference 14 gates instead of 9 (owned by SPEC21SCECOM-007)

## Acceptance Criteria

### Tests That Must Pass

1. Phase 4 gate enumeration totals 14: `grep -cE "^\| [0-9]+\." .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns 14 (one row per gate in the markdown table)
2. Gate 1 dual-field discipline section is present: `grep -E "(dual-field|mystery_safety.*execution_envelope|execution_envelope.*mystery_safety)" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns ≥1 match
3. Gate 14 trigger condition is the canonical fact_create + world_level + exception_governance form: `grep -E "fact_create.*truth_scope.world_level|truth_scope\.world_level.*fact_create" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns ≥1 match; `grep "requiresExceptionGovernance" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns 0 matches (the taxonomy reference was retired during reassessment)
4. Phase 5 dramatic-unit-coverage axis source is `beat_plan.beats[].state_significance` with the 8-axis `strong_axis` enum: `grep -E "(beat_plan\.beats|state_significance)" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns ≥1 match in the Phase 5 axis description; `grep -E "value_delta_target" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns 0 matches in the dramatic-unit-coverage row (the v1-style 4-axis basis was retired during reassessment)
5. Phase 5 thresholds match SPEC-21 §D: commitment_class ≤30%, arc_archetype ≤25%, tone ≤40%, theme ≤50%, OBL-engagement ≥60% — verified by grep against the table
6. governance-and-foundations.md Rule 11 row cites story-scope extension: `grep -E "(non-default extension|story scope)" .claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` returns ≥1 match

### Invariants

1. 14 gates enumerated; gates 1-9 preserve v1 numbering and semantics (with documented extensions); gates 10-14 are net-new
2. Gate 1 mystery-firewall HARD-REJECTs canon_candidate authority on author-pool storylets (preserved from v1; pre-HARD-GATE refusal)
3. Gate 14 trigger uses fact_create + world_level + exception_governance (canonical reconciliation per reassessment 2026-05-08)
4. Phase 5 dramatic-unit-coverage axis source is `beat_plan.beats[].state_significance` aggregated across all beats (NOT `value_delta_target`)
5. governance-and-foundations.md Rule 11 row acknowledges story-scope extension as deliberate non-default per FOUNDATIONS §Story Bundles §5

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. The skill dry-run that exercises Phase 4 gates 9-14 (`storylet-pool-authoring mode=seed` with a representative arc) becomes runnable when SPEC-22 Track 2 validators land.

### Commands

1. `grep -cE "^\| [0-9]+\." .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (expect 14 — one row per gate in the markdown table)
2. `grep -nE "(dual-field|mystery_safety.*execution_envelope)" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (expect ≥1 — gate 1 dual-field discipline section present)
3. `grep -nE "(beat_plan\.beats|state_significance)" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (expect ≥1 — Phase 5 dramatic-unit-coverage axis source)
4. `grep -n "requiresExceptionGovernance" .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (expect 0 matches — taxonomy reference retired)
5. `grep -nE "(non-default extension|story scope.*Rule 11|Rule 11.*story scope)" .claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (expect ≥1 — Rule 11 row updated)
