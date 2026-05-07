<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-21: Scene-Commitment Arc Authoring (Storylet-Pool-Authoring Rewrite)

**Status**: PROPOSED (2026-05-07)
**Phase**: authoring tier of the scene-commitment-arc pivot
**Depends on**: archived SPEC-19 (schemas + canonical vocabularies), SPEC-22 (engine ops + validators)
**Blocks**: none — SPEC-20 (runtime) and SPEC-21 (authoring) are independent given SPEC-19 + SPEC-22
**Source**: `reports/scene-arc-storylet-research-brief.md`; `reports/scene-commitment-arc.md` §11 Pool-Thin Runtime Generation, §17 Highest-Leverage Decisions; current authoring skill at `.claude/skills/storylet-pool-authoring/SKILL.md`; cross-checked against `docs/FOUNDATIONS.md` §Story Bundles, Rule 11 (No Spectator Castes).

## Problem Statement

`storylet-pool-authoring` currently produces beat-granular SLTs across a 14-value `shape:` enum. Phase 1 (Coverage Diagnosis) measures per-shape thinness; Phase 2 (Generation Seeds) produces beat seeds; Phase 3 (Structured Drafting) fills the v1 SLT schema; Phase 4 (Per-Storylet Validation Gates) runs 9 gates; Phase 5 (Diversity Audit) checks shape ≤40% / tone ≤40% / OBL-engagement ≥60%. Under SPEC-19's v2 schema, the unit of authoring is no longer a beat but a **scene-commitment arc** (a multi-beat dramatic unit). Every phase of the authoring skill must rebind to arc semantics.

The phase-by-phase mismatch:

- **Phase 1 (Coverage Diagnosis)**: measures per-shape coverage. Under v2, coverage is per-`commitment_class` and per-`arc_archetype`. The diagnosis matrix shape changes.
- **Phase 2 (Generation Seeds)**: produces seeds with `(target OBL/THR engaged, shape, tone register, content_intensity, preconditions, dramatic transaction)`. Under v2, a seed must additionally specify `commitment_class`, `arc_archetype`, `entry_pressure`, `value_delta_target`, `scene_question`. The seed format expands.
- **Phase 3 (Structured Drafting)**: fills the v1 SLT envelope. Under v2, fills the seven-block extension (arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy, effect_model, exit_portfolio) plus the legacy fields. The draft size grows ~3-4x.
- **Phase 4 (Per-Storylet Validation Gates)**: 9 gates. Under v2, the existing 9 gates extend with arc-level checks (arc_schema_compliance, beat_plan_parsability, stop_policy_parsability, effect_model_legality, exit_portfolio_completeness, plus a Rule 11 leverage check on capability-introducing arcs) — total: 14 gates.
- **Phase 5 (Diversity Audit)**: shape ≤40% / tone ≤40% / OBL-engagement ≥60%. Under v2, the diversity axes shift: `commitment_class` ≤30% (tighter because the enum is larger — 20 values) / `arc_archetype` ≤25% / tone ≤40% (preserved) / OBL-engagement ≥60% (preserved) / dramatic-unit-coverage (new — `value_delta_target.relationship` / `obligation` / `thread` / `information` axes each appear in ≥30% of the batch).

Plus a new authoring artifact: the **arc archetype library** at `templates/arc-archetypes.md`. This is the seed of authoring quality — the LLM proposers reference it when generating seeds and drafts. Its initial content must cover the genre range of supported worlds.

## Approach

Five phase rewrites + one new template + one Rule 11 leverage check. Mode semantics (seed / focus / audit / jit) are preserved; sub-routine invocation discipline (parent_skill_invocation) is preserved.

### A. Phase 1 — Coverage Diagnosis Matrix (commitment-class basis)

Replace the per-`shape:` thinness scan with a per-`commitment_class` and per-`arc_archetype` thinness matrix:

```yaml
diagnosis_matrix:
  open_obligations_by_commitment_class:
    # for each open OBL, identify the commitment_class(es) that could pay it off
    # under each commitment_class, list the existing arcs in the pool that match
    # surface gaps where commitment_class has no eligible arc
    OBL-NNNN:
      eligible_commitment_classes: [<commitment_class>, ...]
      pool_arcs_by_class:
        <commitment_class>: [SLT-NNNN, ...]
      gaps: [<commitment_class>, ...]                       # commitment_classes with 0 eligible arcs

  active_threads_by_commitment_class:
    THR-NNNN:
      escalation_commitment_classes: [<commitment_class>, ...]
      pool_arcs_by_class: {...}
      gaps: [<commitment_class>, ...]

  arc_archetype_distribution:
    # for each archetype value, count current pool occurrences
    fragile_offer: 3
    bounded_question: 5
    confession_received: 0
    refusal_and_aftercare: 1
    ...

  commitment_class_distribution:
    # for each class value, count current pool occurrences
    stay_available_without_pressure: 2
    offer_practical_help: 4
    ask_one_bounded_question: 0
    ...

  content_intensity_distribution:
    tame: A | mature: B | explicit: C                       # preserved from v1

  mysteries_in_play_by_arc:
    # mysteries with no touching arc
    M-NNNN:
      touching_arcs: [SLT-NNNN, ...]
      progressing_arcs: [SLT-NNNN, ...]
      gap: <bool>                                            # true if no arc touches this mystery

  recent_history_repetition_signal:
    # which commitment_classes appeared in the last 5 pages along the longest active branch_path
    last_5_pages_classes: [<commitment_class>, ...]
    over_represented: [<commitment_class>, ...]              # ≥3 of 5
```

Audit mode: each RSP card row becomes a diagnosis-matrix entry. The card's `target_commitment_class` and `target_arc_archetype` fields drive Phase 2 seed selection.

JIT mode: the diagnosis matrix reduces to ONE row — the continuation-failure context from `caller_state_snapshot`. The JIT seed is one arc whose `commitment_class` matches the chosen CHC's `commitment_class`.

### B. Phase 2 — Generation Seeds (arc seed format)

Each seed becomes an **arc seed**:

```yaml
arc_seed:
  commitment_class: <commitment_class enum>
  arc_archetype: <arc_archetype enum>
  target_obligation: OBL-NNNN | null                      # the OBL this arc engages
  target_thread: THR-NNNN | null                          # the THR this arc advances
  entry_pressure_description: >                           # what is unstable on entry
  scene_question: >                                       # the dramatic-unit question
  value_delta_target_axes:                                # which strong axes the arc moves
    - <strong_axis enum>
  tone_register: <kebab-case>
  content_intensity_band: tame | mature | explicit
  implied_preconditions:                                  # informal; Phase 3 formalizes via DSL
    - <kebab-case description>
  dramatic_transaction_summary: >                         # one-line core
```

Seed count target: `target_pool_size + ceil(target_pool_size × 0.30)` for seed/focus batches (existing buffer rule preserved).

Audit mode seeds are populated from RSP cards' targeting fields. The RSP card schema (owned by branching-story-health-audit; SPEC-22 §Sibling-skill alignment) gains `target_commitment_class` and `target_arc_archetype` fields.

JIT mode produces exactly one seed.

### C. Phase 3 — Structured Drafting (arc schema fill)

Per seed, the LLM prompt is assembled with content_policy verbatim FIRST + story kernel + seed brief + state context + predicate DSL grammar (`predicate-dsl.md` including the SPEC-19 stop-predicate extension) + arc archetype excerpt (from `arc-archetypes.md`) + an arc-template scaffold:

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

The engine wraps the LLM output with schema scaffolding, validates field types, generates obligation/fact templates from the LLM's structured proposal, and records the LLM's `exit_portfolio.native_seeds[]` verbatim (these become Phase 8's exit candidates at runtime).

### D. Phases 4-5 — Canon Safety Checks (extended gates + diversity axes)

**Phase 4 — Per-Storylet Validation Gates** (now 14 gates per candidate arc):

| Gate | Existing v1 | New v2 | Failure mode |
|---|---|---|---|
| 1. Mystery firewall (forbidden_M_resolved == false; envelope-level forbidden_resolutions completeness) | yes | extended — see dual-field clarification below | HARD-REJECT |
| 2. Resolution-authority declaration (canon_candidate only on branch_scoped) | yes | preserved | HARD-REJECT |
| 3. Invariant compatibility | yes | preserved | HARD-REJECT |
| 4. Consequence capacity | yes | preserved | HARD-REJECT |
| 5. Dedup (no duplicate seed shape) | yes | preserved (now per-`(commitment_class, arc_archetype, target_obligation)`) | HARD-REJECT |
| 6. Content-intensity coherence | yes | preserved | HARD-REJECT |
| 7. Predicate DSL parsability (hard_preconds, soft_preconds, cast_requirements, location_requirements) | yes | extended to include stop_policy predicates | HARD-REJECT |
| 8. Branch-contamination | yes | preserved | HARD-REJECT |
| 9. Schema completeness | yes | extended to v2 (all seven new blocks populated) | HARD-REJECT |
| 10. Arc envelope conformance (envelope.invariants and required_functions are kebab-case kebab-case strings; no free-form prose; reference open-vocab) | NEW | n/a | HARD-REJECT |
| 11. Stop-policy parsability (every entry parses against the extended DSL) | NEW | n/a | HARD-REJECT |
| 12. Effect-model legality (each variant.required_effects entry uses a closed effect-type enum value; forbidden_effects similarly; ≥1 variant; ≥1 required_effects per variant) | NEW | n/a | HARD-REJECT |
| 13. Exit-portfolio completeness (≥1 native_seed; engine_discovered_exit_budget block present with min/max/allowed_sources) | NEW | n/a | HARD-REJECT |
| 14. Rule 11 spectator-caste leverage (when `effect_model.required_effects` introduces or depends on exceptional capability per `requiresExceptionGovernance` taxonomy, arc.notes carries a `leverage:`-prefixed line enumerating ≥3 ordinary-actor leverage forms from the canonical enum) | NEW | n/a | HARD-REJECT |

Up to 2 revise retries per gate before drop-and-replace via under-represented seed.

**Gate 1 dual-field discipline — v1 `mystery_safety` + v2 `execution_envelope.mystery_preservation`**: under v2, the per-storylet `mystery_safety` block (preserved verbatim from v1: `forbidden_M_resolved`, `M_touched[]`, `M_progressed[]`, `M_resolution_claims[]`, `resolution_safety_per_M{}`) is the **storylet-level meta-declaration** — it asserts the storylet's relationship to mysteries at the SLT-record level. The v2 `execution_envelope.mystery_preservation` block (NEW per SPEC-19 §A: `forbidden_resolutions[]`, `allowed_claims[]`) is the **per-beat enforcement contract** — it asserts what the LLM render MAY NOT do during arc rendering at the page-cycle (Phase 7 multi-beat render under envelope; Phase 7.6 ARC_TRACE Layer 1 verifies `forbidden_resolutions[]` M ids absent from any extracted claim's `canon_status: forbidden_risk`). Gate 1 validates BOTH:

- **Storylet-level (v1 mystery_safety)**: `forbidden_M_resolved == false`; `resolution_safety_per_M{}` consistent with each cited M's actual `future_resolution_safety`; `M_resolution_claims[].requires_canon_promotion == true` IFF `resolution_authority == canon_candidate`.
- **Envelope-level (v2 execution_envelope.mystery_preservation)**: `forbidden_resolutions[]` includes every `forbidden`-status M id from the world's whole-class M load (so the page-cycle's Phase 7.6 Layer 1 has a complete forbidden-list to test against); `allowed_claims[]` is a non-empty subset of `{apparent, branch_local_counterfactual, canon_candidate}` consistent with the storylet's `mystery_safety.M_resolution_claims[].resolution_authority` values (no allowed_claims permission for an authority the storylet doesn't actually claim).

The two fields are not redundant — the v1 field declares storylet-level mystery interactions (what the storylet AS A WHOLE does to mysteries); the v2 field declares per-beat enforcement during render (what each beat MAY NOT do). A v2 SLT missing either field is HARD-REJECTed; an inconsistency between the two (e.g., `mystery_safety.forbidden_M_resolved: false` but `execution_envelope.mystery_preservation.forbidden_resolutions[]` is empty AND the world has `forbidden`-status M ids) is also HARD-REJECTed because the envelope cannot enforce what the meta-declaration claims is safe.

**Phase 5 — Diversity Audit** (axes refactored for arc semantics):

| Axis | v1 threshold | v2 threshold | Notes |
|---|---|---|---|
| `commitment_class` distribution | shape ≤40% per class | ≤30% per class | tighter because enum is larger (20 vs 14) |
| `arc_archetype` distribution | n/a | ≤25% per archetype | new — archetype is finer-grained than commitment_class |
| Tone distribution | ≤40% per tag | ≤40% per tag | preserved |
| Theme distribution | ≤50% per tag | ≤50% per tag | preserved |
| Content-intensity distribution | matches baseline | matches baseline | preserved |
| OBL-engagement coverage | ≥60% in seed; source_obligations hit in focus | ≥60% in seed; source_obligations hit in focus | preserved |
| Cast usage | no major cast member with zero engagement | no major cast member with zero engagement | preserved |
| Dramatic-unit-coverage | n/a | each `value_delta_target` axis (`relationship`, `obligation`, `thread`, `information`, `risk`, `route`, `irreversibility`, `intention`) appears in ≥30% of the batch | new — ensures the batch covers the strong-axis space |

Up to 2 diversity-correction iterations before escalating to user.

JIT mode bypasses Phase 5 (one storylet has no diversity profile).
Audit mode bypasses Phase 5 except for batch-level branch-contamination + RSP visibility-match (preserved).

### E. JIT Mode — Template Cascade

JIT mode produces one runtime arc via a template cascade rather than full author-quality drafting:

1. **Classify the selected commitment**: the calling Phase 4 of branching-story-page-cycle hands over the chosen CHC's `commitment_class` and `caller_state_snapshot`.
2. **Select an arc archetype**: from the `arc-archetypes.md` library, choose the archetype matching the commitment_class (deterministic mapping per the library's `commitment_class → recommended_archetype` table).
3. **Fill minimum viable fields**: the LLM fills only the fields required for runtime selection (preconditions, cast_requirements, beat_plan, execution_envelope, stop_policy, effect_model with one variant matching the chosen CHC's `success_policy`, exit_portfolio.native_seeds with 1-3 entries). Tone, theme, aftermath_weight, etc. are populated from defaults or omitted.
4. **Validate**: run all 14 Phase 4 gates against the JIT candidate.
5. **Render** (the calling Phase 4 of branching-story-page-cycle proceeds to Phase 7 with the JIT arc).
6. **Mark provenance**: `provenance.origin: runtime_jit`, `provenance.created_at_page: <caller PG>`, `visibility.scope: branch_scoped`.
7. **Cache the draft** in the bundle's pool (visibility.scope: branch_scoped — visible only on the calling branch).
8. **Promote later**: a future skill (or manual workflow) may promote a validated JIT arc to author-pool visibility (`provenance.origin: jit_promoted_to_authoring`, `visibility.scope: global_author_pool`). Promotion is out of scope for v1.

The template cascade is not a full author run — it is a fast-path. JIT runtime arcs are intentionally "just enough" arcs; their authoring quality is bounded by the archetype library's expressiveness, not by the seed/focus mode's full structured drafting.

### F. Audit Mode — RSP Cards Target Arcs

The RSP (remediation-storylet-proposal) card schema (owned by branching-story-health-audit; SPEC-22) is extended with:

```yaml
target_commitment_class: <commitment_class enum>
target_arc_archetype: <arc_archetype enum>
sketch_arc_contract: >                                  # rough arc_contract description
sketch_dramatic_unit: >                                  # rough dramatic_unit description
```

Phase 2's seed generation in audit mode reads these fields. The card body's free-form rationale remains as before.

The card class id remains `RSP-NNNN` for path stability (audit sub-directory paths preserve `audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md`); the semantic name in skill prose becomes "remediation-arc-proposal" but the id class is unchanged.

### G. Arc Archetype Library

NEW template at `.claude/skills/storylet-pool-authoring/templates/arc-archetypes.md`. Initial library content:

```markdown
# Arc Archetype Library

This file lists 14-20 arc archetypes that scene-commitment-arc authoring may use as
structural templates. Each archetype names: the typical commitment_class, a
recommended-arc-shape sketch, an entry_pressure pattern, a value_delta_target
pattern, a beat_plan sketch (3-6 functions), an execution_envelope skeleton
(invariants/required_functions/prohibited_actions), a stop_policy skeleton, an
effect_model.variants pattern (typical 1-3 variants), and an exit_portfolio.native_seeds
sketch (typical 3 seeds).

Authors may extend this library; new archetypes must additionally land in the
canonical-vocabularies.ts `arc_archetype` enum (SPEC-22 — append-only authorial change).

## fragile_offer
Typical commitment_class: offer_practical_help, restitution_offered
[... archetype detail ...]

## bounded_question
Typical commitment_class: ask_one_bounded_question, force_disclosure
[... archetype detail ...]

## confession_received
Typical commitment_class: stay_available_without_pressure, bear_witness
[... archetype detail ...]

## refusal_and_aftercare
[...]

## practical_aid_attempt
[...]

## withdrawal_without_abandonment
[...]

## escalation_to_confrontation
[...]

## concealment_under_pressure
[...]

## third_party_intervention
[...]

## investigation_followup
[...]

## aftermath_processing
[...]

## route_change
[...]

## public_commitment
[...]

## private_betrayal
[...]

## intimacy_negotiation
[...]

## boundary_setting
[...]

## restitution_offered
[...]

## silent_witness
[...]

## forced_disclosure
[...]

## pressure_release
[...]

# Mapping table (used by JIT mode)

| commitment_class | recommended arc_archetype |
|---|---|
| stay_available_without_pressure | confession_received |
| offer_practical_help | fragile_offer |
| ask_one_bounded_question | bounded_question |
| withdraw_without_abandoning | withdrawal_without_abandonment |
| confess_one_thing | private_betrayal |
| accept_offered_help | practical_aid_attempt |
| refuse_with_grace | refusal_and_aftercare |
| escalate_to_confrontation | escalation_to_confrontation |
| conceal_under_pressure | concealment_under_pressure |
| seek_third_party | third_party_intervention |
| change_venue | route_change |
| make_public_commitment | public_commitment |
| private_betrayal | private_betrayal |
| bear_witness | silent_witness |
| release_pressure | pressure_release |
| tighten_pressure | escalation_to_confrontation |
| defer_decision | withdrawal_without_abandonment |
| force_disclosure | forced_disclosure |
| mirror_acknowledgment | bear_witness |
| intimacy_advance | intimacy_negotiation |
```

Each archetype entry is ~30-50 lines of structured prose + YAML sketches. Initial library length: ~400-700 lines. Future expansion by append-only authorial change (parallels canonical-vocabularies.ts extension pattern).

## Deliverables

| File | Action |
|---|---|
| `.claude/skills/storylet-pool-authoring/SKILL.md` | Update Process Flow; HARD-GATE block; phase descriptions; mode discipline |
| `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` | Rewrite for commitment-class + arc-archetype matrix |
| `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` | Rewrite for arc seed format |
| `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` | Rewrite for arc schema fill |
| `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` | Add gates 10-14; refactor diversity axes |
| `.claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` | NEW — initial archetype library (14-20 archetypes) |
| `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` | Already updated by SPEC-19; SPEC-21 adds usage examples for v2 fields per archetype |
| `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` | Update for arc semantics: per-arc summary line includes `commitment_class`, `arc_archetype`, `value_delta_target.axes[]` |
| `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` | Update FOUNDATIONS Alignment table for v2 schema; add Rule 11 leverage discipline |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5 Rule 1 (No Floating Facts) | aligns | Phase 4 gate 9 schema-completeness extends to all seven v2 blocks; Rule 1 enforced at arc level |
| §Story Bundles §5 Rule 4 (No Globalization by Accident) | aligns | branch-isolation invariant unchanged; visibility scope unchanged; gate 8 (branch-contamination) preserved |
| §Story Bundles §5 Rule 5 (No Consequence Evasion) | aligns | gate 12 (effect-model legality) requires ≥1 required_effects per variant; gate 13 (exit-portfolio completeness) requires ≥1 native_seed |
| §Story Bundles §5 Rule 7 (Preserve Mystery Deliberately) | aligns | gate 1 (mystery firewall) extended to arc-level; gate 2 (resolution-authority) preserved; arc.execution_envelope.mystery_preservation.forbidden_resolutions[] explicit list |
| Rule 11 (No Spectator Castes by Accident) | aligns | NEW gate 14 — when arc.effect_model.required_effects introduces or depends on exceptional capability, arc.notes must carry a `leverage:`-prefixed line enumerating ≥3 ordinary-actor leverage forms (mirrors create-base-world Phase 9's genesis spectator-caste check from SPEC-18) |
| §Story Bundles §6 (ID classes) | aligns | SLT IDs unchanged; SLB IDs unchanged; arc records use existing SLT-NNNN id class |
| §Tooling Recommendation (LLM-never-the-continuity-database) | aligns | Phase 3 LLM produces structured proposals; engine wraps with schema scaffolding; Phase 4 gates structurally enforce predicate DSL parsability and schema completeness; LLM output is never the persistence layer |
| HARD-GATE Discipline | aligns | direct-invocation HARD-GATE preserved; parent_skill_invocation no-write sub-routine path preserved; Phase 4 mystery-firewall hard-reject of canon_candidate-on-author-pool still pre-HARD-GATE |

## Verification

- **Coverage matrix correctness**: Phase 1 outputs a diagnosis matrix where every value in `commitment_class_distribution` is from the closed enum, every value in `arc_archetype_distribution` is from the closed enum, and gaps are computed deterministically.
- **Arc-seed completeness**: Phase 2 seeds carry all required fields (commitment_class, arc_archetype, scene_question, value_delta_target_axes, content_intensity_band, dramatic_transaction_summary). Test: synthesize 10 seeds; all 10 have all fields populated.
- **Phase 4 gate coverage**: every candidate arc records PASS with one-line rationale across all 14 gates. A bare PASS without rationale is treated as FAIL (existing skill discipline).
- **Phase 5 diversity thresholds**: a 20-arc batch has commitment_class ≤30% per class, arc_archetype ≤25% per archetype, tone ≤40%, theme ≤50%, OBL-engagement ≥60%, dramatic-unit-coverage axes ≥30% each.
- **JIT mode template cascade**: a JIT call returns one arc with all 14 Phase 4 gates passing in <30s wall-clock (token-cost target — to be measured on real workloads).
- **Rule 11 leverage on capability arcs**: an arc whose `required_effects` includes `mystery_progress` on a `safety: low` mystery (an exceptional-capability use) MUST carry `leverage:` in `notes` with ≥3 forms; gate 14 HARD-REJECTs missing or under-3 leverage lines.
- **Audit mode RSP integration**: an RSP card with `target_commitment_class` and `target_arc_archetype` populated drives Phase 2 seed selection deterministically; the resulting arc carries `provenance.source_audit: SAU-NNNN` and `provenance.source_rsp: RSP-NNNN`.

## Out of Scope

- **Schema definitions** — owned by archived SPEC-19.
- **Runtime pipeline behavior** — owned by SPEC-20.
- **Engine ops + validators + canonical-vocabularies + sibling-skill alignment** — owned by SPEC-22.
- **JIT arc promotion to author-pool** — deferred follow-on (a runtime JIT arc that validates and is approved may be promoted to a permanent author-pool record by a future skill or manual workflow; not in v1).
- **Arc archetype library expansion beyond the initial 14-20 archetypes** — append-only authorial change, no spec required.
- **branching-story-bootstrap Phase 6 alignment** — owned by SPEC-22 §Sibling-skill alignment.

## Risks & Open Questions

- **Arc archetype library quality**: the initial 14-20 archetypes must be expressive enough to cover the genre range of supported worlds (literary character drama, erotica, mystery, action, etc.). Empirical: pilot the new authoring on `worlds/animalia/` (no story bundle yet, can be the first v2 bundle); coverage gaps surface as Phase 1 diagnosis matrix entries with no eligible archetype, indicating library expansion needs.
- **Phase 3 prompt size**: full v2 SLT scaffold + arc archetype excerpt + content_policy verbatim + state context can exceed 50K tokens for a complex bundle. Recommendation: archetype excerpt is library-table-only (not full archetype prose) for the LLM prompt; the LLM can request expanded archetype detail via a follow-up retrieval if needed (out of scope for v1).
- **Phase 5 diversity threshold tightening**: `commitment_class ≤30%` may be too tight for early authoring runs against a small pool. Recommendation: relax to ≤40% for batches with `target_pool_size < 20`; tighten to ≤30% for top-up batches against an established pool. Configurable per-bundle via STORY_KERNEL.
- **JIT template cascade quality**: JIT arcs are bounded by the archetype library. A JIT call against a commitment_class with no recommended-archetype mapping (rare but possible) falls through to a generic `bear_witness` archetype with a warning logged. Future tickets may add commitment-class-specific JIT prompts.
- **Rule 11 leverage on every capability arc**: gate 14 may produce false positives (arcs whose `mystery_progress` is on a low-safety mystery and doesn't represent capability use). Recommendation: gate 14 only fires when `required_effects` includes `fact_create` with `truth_scope.world_level == true` AND `exception_governance` populated (the `requiresExceptionGovernance` taxonomy from canon-addition).
- **Audit mode RSP card schema migration**: existing RSP cards predating SPEC-21 lack `target_commitment_class` / `target_arc_archetype`. Migration: SPEC-22 §Sibling-skill alignment adds these fields with defaults inferable from the RSP body. Older audits (pre-cutover) are not regenerated.
