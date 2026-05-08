# SPEC21SCECOM-005: Phase 3 (Structured Drafting) — arc schema fill rewrite

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — full rewrite of `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md`
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (archetype excerpts fed to the LLM prompt); `archive/tickets/SPEC21SCECOM-004.md` (arc seeds consumed as Phase 3 input)

## Problem

The current Phase 3 reference describes filling the v1 SLT envelope (single beat + choice_templates). Per SPEC-21 §C, v2 fills the seven new structural blocks (`arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`) plus the legacy fields — the draft size grows ~3-4×. The LLM prompt structure must change to include: content_policy verbatim FIRST, story kernel, seed brief, state context, predicate DSL grammar (including the SPEC-19 stop-predicate third tier), an arc-archetype excerpt (from `templates/arc-archetypes.md`), and an arc-template scaffold. Without this rewrite, Phase 3's LLM produces v1-shaped records that SPEC-22's `arc_schema_compliance` validator HARD-REJECTs.

## Assumption Reassessment (2026-05-08)

1. The current file at `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (verified during SPEC-21 reassessment 2026-05-08) describes v1 envelope filling. The rewrite per SPEC-21 §C replaces the LLM prompt assembly to consume the 11-field arc seed (from `archive/tickets/SPEC21SCECOM-004.md`), produce all seven v2 structural blocks, and let the engine wrap with schema scaffolding + DSL parsability + visibility-scope assignment.
2. The v2 SLT scaffold required fields (per archived SPEC-19 §A and `templates/storylet-record.yaml`): `arc_contract` (commitment_class, arc_archetype, actor, target, user_intent, strategic_question_answered, commitment_scope, success_policy, allowed_outcome_band), `dramatic_unit` (scene_question, entry_pressure, value_delta_target, natural_close_definition), `beat_plan` (mode: ordered_soft, min_beats, max_beats, 3-8 beats with function/required/state_significance), `execution_envelope` (invariants, required_functions, allowed_tactics, prohibited_actions, style_directives, mystery_preservation), `stop_policy` (normal_exits using stop predicates, interrupt_before, safety_valves), `effect_model.variants` (1..N rows; each maps to one allowed_outcome_band entry; required_effects use closed effect-type enum), `exit_portfolio.native_seeds` (3-5 entries; each commitment_class + strategy_cluster + expected_state_delta + continuation_arc_selector), plus legacy fields (hard_preconds, soft_preconds, cast_requirements, location_requirements, tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety, provenance, visibility).
3. Cross-skill boundary under audit: Phase 3's LLM output is consumed by Phase 4 gate 9 (Schema completeness) and Phase 5b's engine pre-validation (`record_schema_compliance` validator extension owned by SPEC-22 Track 2). The shared boundary is the v2 SLT field set — Phase 3 MUST produce records that pass the structural completeness check; missing any of the seven new blocks fails Phase 4 gate 9 (HARD-REJECT). The predicate DSL boundary: `templates/predicate-dsl.md` already includes the SPEC-19 stop-predicate third tier (verified during SPEC-21 reassessment 2026-05-08); Phase 3's prompt must inline the full DSL grammar including stop predicates so the LLM populates `stop_policy.normal_exits[].predicate` and `stop_policy.interrupt_before[].predicate` from the closed enum.
4. Adjacent contradictions classification: SPEC-21 §Risks #2 notes the Phase 3 prompt size concern — full v2 SLT scaffold + arc archetype excerpt + content_policy verbatim + state context can exceed 50K tokens for a complex bundle. The recommended mitigation is "archetype excerpt is library-table-only (not full archetype prose) for the LLM prompt; the LLM can request expanded archetype detail via a follow-up retrieval if needed (out of scope for v1)". Implementation must reflect this — Phase 3's prompt assembly excerpts the archetype's mapping-table row + condensed sketch, NOT the full ~30-50 lines of archetype detail. This is a required consequence of the v2 redesign, not a separate bug.

## Architecture Check

1. content_policy verbatim FIRST is the existing convention (preserved from v1) — load order matters because the policy binds before any drafting instruction. The seven-block expansion adds prompt sections but does NOT change the load-order discipline. Each prompt section is independently traceable: content_policy load → state context load → predicate DSL load → archetype excerpt load → arc-template scaffold load → INSTRUCTION block. This keeps the LLM-output-to-record-field mapping deterministic.
2. The engine wraps the LLM output with schema scaffolding + validates field types + generates obligation/fact templates from the LLM's structured proposal. This separates the LLM's role (semantic generation) from the engine's role (schema enforcement, ID allocation, visibility-scope assignment). Per FOUNDATIONS §Tooling Recommendation: "LLM agents should never operate on prose alone" — the engine wrapping ensures Phase 3's output passes downstream gate 7 (predicate DSL parsability), gate 9 (schema completeness), and the SPEC-22 validator stack.
3. No backwards-compatibility shims — the v1 `choice_templates` field is REMOVED under v2 (per `templates/storylet-record.yaml` SPEC-19 v2 comment: "choice_templates is REMOVED under v2. Its presence on a v2 SLT is HARD-REJECTed by SPEC-22's arc_schema_compliance validator"). The Phase 3 rewrite must not emit choice_templates; runtime choice proposal scaffolding moves to `exit_portfolio.native_seeds`.

## Verification Layers

1. v2 SLT structural completeness invariant → schema validation: every record produced by Phase 3 has all seven new structural blocks populated and required sub-fields per block non-empty (verified at runtime by SPEC-22's `arc_schema_compliance` validator extension).
2. Predicate DSL parsability invariant → schema validation: every `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `stop_policy.normal_exits[].predicate`, and `stop_policy.interrupt_before[].predicate` entry parses against the DSL grammar (verified by SPEC-22's `storylet_predicate_dsl_parsability` and `stop_policy_parsability` validators).
3. content_policy load-order invariant → manual review: the prompt assembly pseudocode places content_policy verbatim FIRST (before story kernel, seed brief, state context, predicate DSL, archetype excerpt, arc-template scaffold).
4. choice_templates absence invariant → grep-proof: `grep "choice_templates" references/phase-3-structured-drafting.md` returns 0 matches in any "fill this field" guidance (the v1 field is retired under v2 per `templates/storylet-record.yaml` and SPEC-22's `arc_schema_compliance` HARD-REJECT).

## What to Change

### 1. Rewrite `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md`

Replace the file's body with the arc-schema-fill description per SPEC-21 §C. Required sections:

- **Purpose statement**: Phase 3 turns each Phase 2 arc seed into a v2 SLT record by assembling an LLM prompt with the load-order disciplined structure, letting the LLM produce a structured arc proposal, and letting the engine wrap with schema scaffolding.
- **LLM prompt structure** (per SPEC-21 §C verbatim):
  ```
  [content_policy verbatim]
  [story kernel]
  [seed brief]
  [state context — open OBLs, active THRs, mysteries_in_play, cast roster, current_location]
  [predicate DSL — including stop predicates]
  [arc archetype excerpt for this seed's arc_archetype]
  [arc template scaffold — SLT v2 with TODO markers]

  INSTRUCTION:
  Fill the SLT v2 template for this arc seed. Required:
  - arc_contract (commitment_class, arc_archetype, actor, target, user_intent,
    strategic_question_answered, commitment_scope, success_policy, allowed_outcome_band)
  - dramatic_unit (scene_question, entry_pressure, value_delta_target, natural_close_definition)
  - beat_plan (mode: ordered_soft, min_beats, max_beats, 3-8 beats with function/required/state_significance)
  - execution_envelope (invariants, required_functions, allowed_tactics, prohibited_actions,
    style_directives, mystery_preservation)
  - stop_policy (normal_exits using stop predicates, interrupt_before, safety_valves)
  - effect_model.variants (1..N rows; each maps to one allowed_outcome_band entry; required_effects
    use closed effect-type enum; forbidden_effects enumerate what MUST NOT happen)
  - exit_portfolio.native_seeds (3-5 entries; each commitment_class + strategy_cluster +
    expected_state_delta + continuation_arc_selector)
  - legacy fields (hard_preconds, soft_preconds, cast_requirements, location_requirements,
    tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety, provenance, visibility)

  Do NOT use beat headers in any prose-bearing field. Beat plans are structural; prose flows continuously.
  ```
- **Engine wrapping**: the engine wraps the LLM output with schema scaffolding, validates field types, generates obligation/fact templates from the LLM's structured proposal, and records the LLM's `exit_portfolio.native_seeds[]` verbatim (these become Phase 8's exit candidates at runtime).
- **Archetype excerpt strategy**: per SPEC-21 §Risks #2, the archetype excerpt is library-table-only (not full archetype prose) — Phase 3's prompt assembly excerpts the matching archetype's mapping-table row + condensed structural sketch (typical commitment_class, beat_plan sketch, exit_portfolio sketch), not the full ~30-50 line archetype detail.
- **choice_templates retirement note**: explicit statement that v1 `choice_templates` is REMOVED under v2; runtime choice proposal scaffolding moves to `exit_portfolio.native_seeds`. The Phase 3 LLM prompt must NOT instruct the LLM to fill choice_templates.
- **Cross-references**: cite `templates/arc-archetypes.md` (archetype excerpt source), `templates/predicate-dsl.md` (DSL grammar including stop-predicate tier), `templates/storylet-record.yaml` (v2 scaffold target), `references/phase-2-generation-seeds.md` (upstream — arc seeds), `references/phase-4-5-canon-safety-checks.md` (downstream — gates 9 + 11).

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify — full rewrite)

## Out of Scope

- Phase 4 gate enumeration (owned by SPEC21SCECOM-006)
- SPEC-22 validator implementation (owned by SPEC-22 Track 2)
- predicate-dsl.md edits (already includes stop-predicate tier per SPEC-19 — verified during SPEC-21 reassessment)
- LLM prompt size optimization beyond the archetype-excerpt-table-only strategy (per SPEC-21 §Risks #2: follow-up retrieval is out of scope for v1)

## Acceptance Criteria

### Tests That Must Pass

1. The LLM prompt structure block names all seven v2 structural blocks: `grep -E "(arc_contract|dramatic_unit|beat_plan|execution_envelope|stop_policy|effect_model|exit_portfolio)" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md | wc -l` returns ≥7
2. content_policy verbatim FIRST is documented: `grep -E "content_policy.*FIRST|FIRST.*content_policy" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns ≥1 match
3. The archetype-excerpt-table-only strategy is documented: `grep -E "(table-only|library-table-only|condensed.*sketch)" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns ≥1 match
4. choice_templates is documented as removed under v2: `grep -E "choice_templates.*removed|REMOVED.*choice_templates|retire.*choice_templates" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns ≥1 match (or absence — if the rewrite drops the term entirely, that satisfies the v2 contract)

### Invariants

1. content_policy verbatim is loaded FIRST in the prompt assembly (load-order discipline preserved from v1)
2. All seven v2 structural blocks are named in the prompt INSTRUCTION
3. Predicate DSL inlined into the prompt includes the stop-predicate third tier (verified by reference to `templates/predicate-dsl.md`)
4. choice_templates is NOT referenced as a Phase 3 LLM-fill target (the v1 field is retired under v2)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. The Phase 3 LLM dry-run that exercises this prompt assembly becomes runnable when SPEC-22 Track 2 validators land and the full skill flow can be tested against a real story bundle.

### Commands

1. `grep -nE "(arc_contract|dramatic_unit|beat_plan|execution_envelope|stop_policy|effect_model|exit_portfolio)" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (expect ≥7 hits across the prompt structure)
2. `grep -nE "(content_policy.*FIRST|FIRST.*content_policy)" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (expect ≥1 — load-order discipline named)
3. `grep -nE "(table-only|library-table-only)" .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (expect ≥1 — archetype excerpt strategy documented)
