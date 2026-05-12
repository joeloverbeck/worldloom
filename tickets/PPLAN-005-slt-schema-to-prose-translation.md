# PPLAN-005: §15 Selected scene-commitment arc — replace verbatim SLT YAML inlining with prose-direction translation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — edits the canonical page-plan template, `branching-story-page-cycle/references/phase-7-page-plan.md`, and `branching-story-page-cycle/references/phase-9-validation-gates.md` (`plan_completeness_check` and `arc_envelope_conformance` consumer surfaces). Frontmatter remains the validator-bearing surface; only the body shape changes.
**Deps**: None directly. Pairs with PPLAN-006 (parallel cleanup of §10/§11/§12) and PPLAN-007 (`forbidden_engine_vocabulary` body cleanup).

## Problem

`worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md` §15 inlines the full SLT-0012 YAML record verbatim (lines 578-746, ~169 lines). The body content includes engine-only fields the external prose renderer cannot act on:

- `arc_contract.success_policy: contested`
- `arc_contract.allowed_outcome_band: [succeeds, partially_succeeds, fails_with_consequence, backfires, accepted_with_limits, refused_without_break, partially_deflected]`
- `dramatic_unit.value_delta_target.information_posture.direction: confessed`
- `beat_plan.mode: ordered_soft`, `beat_plan.beats[].state_significance`, `beat_plan.beats[].realization_target: realizes-her-question-or-gaze-pulls-the-confession-as-scene-movement`, `beat_plan.beats[].required: true`
- `execution_envelope.required_functions[]`, `prohibited_actions[]`, `invariants[]: [soc-2-floor-respected, soc1-secular-cohort-jon-no-catholic-residual, ont-1-saturation-as-substrate-not-as-explained-anomaly]`, `allowed_tactics[]`, `style_directives[]`, `mystery_preservation.allowed_claims: [apparent]`
- `stop_policy.normal_exits[].predicate: commitment_satisfied`, `stop_policy.normal_exits[].args: { commitment_class: confess_one_thing, outcome: accepted_with_limits }`, `stop_policy.safety_valves.max_internal_beats: 5`, `stop_policy.safety_valves.max_words: 2200`
- `effect_model.variants[].probability_weight: 0.35`, `effect_model.variants[].maps_to_outcome: partially_deflected`, `effect_model.variants[].required_effects[].type: fact_create`, `effect_model.variants[].required_effects[].args.epistemic_class: belief`
- `mystery_safety.M_touched`, `M_progressed`, `M_resolution_claims`, `forbidden_M_resolved: false`, `resolution_safety_per_M`
- `exit_portfolio.native_seeds[].continuation_arc_selector.require_arc_archetype`, `exit_portfolio.engine_discovered_exit_budget`

The renderer cannot use `success_policy: contested` as prose direction; the field tells the engine which outcome-band-modeling logic to apply. `probability_weight: 0.35` is engine selection logic. `realization_target: realizes-her-question-or-gaze-pulls-the-confession-as-scene-movement` is engine identifier slang the rule against engine vocabulary explicitly forbids appearing in prose — yet the rule is right there in §15 of the prompt.

The prose-relevant content lives in three places: storylet `notes:` (free-form authorial prose), `arc_contract.user_intent` (one prose sentence), `dramatic_unit.scene_question` (one prose sentence), `dramatic_unit.natural_close_definition` (one prose sentence), and the chosen variant's `required_effects[]` translated as "the scene must realize X." Everything else is engine. The same engine content is already required by `frontmatter.selected_arc_id` + `frontmatter.chosen_variant_id` + `frontmatter.required_effects[]` for `plan_completeness_check` (Phase 9 gate 18) and `arc_envelope_conformance` (Phase 9 gate 13) validator consumption.

## Assumption Reassessment (2026-05-12)

1. **Validators read engine SLT content from frontmatter, not from §15 body.** Verified: `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md:21` (gate 13 `arc_envelope_conformance` reads `frontmatter.declared_intended_beats[]`, `frontmatter.forbidden_resolutions[]`, and the chosen variant's `required_effects[]` — the variant.required_effects are read from `frontmatter.required_effects[]` which the plan author copies verbatim per `phase-7-page-plan.md:71-72`); gate 18 `plan_completeness_check` reads `frontmatter.selected_arc_id` and `frontmatter.chosen_variant_id`. Phase 7.6 Layer 1 forbidden-mystery-preservation check (`.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md:23`) reads from frontmatter.
2. **The "every inlined record id resolves" rule of `plan_completeness_check` operates on body record-id references.** Verified: `phase-9-validation-gates.md:26` states *"every inlined record id (CF / CHAR / SF / OBL / THR / SREL / STINT / STLOC / STOBJ / M / INV / SLT) resolves against the current world index or story-bundle working buffer"*. The rule requires the SLT id to be present and resolvable; it does NOT require the full schema body. A §15 that names the SLT id, inlines its prose-bearing fields, and references it cleanly satisfies the rule.
3. **Plan_self_containment (Phase 9.5 bootstrap-only check) does not require the full SLT YAML in §15.** Verified by reading `phase-9-5-bootstrap-discipline-validator.md` (Phase 9.5 lives at bootstrap; §15 is omitted at the root case per `phase-7-root-page-plan.md:18` `§15-alt Entry pressure framing replaces both §15 and §16`). The page-cycle case is the consumer of full §15 SLT body; bootstrap is not.
4. **Shared boundary under audit**: the §15 body shape (canonical template + page-cycle phase-7 reference + page-cycle phase-9-validation-gates reference). Three files. The frontmatter consumer surfaces (`frontmatter.selected_arc_id`, `chosen_variant_id`, `required_effects[]`, `forbidden_resolutions[]`, `declared_intended_beats[]`) are unchanged.
5. **FOUNDATIONS principle under audit**: §Story Bundles §4 (*"the plan is engine-readable and validation-bearing — its frontmatter declares affordances, intended beats, stop conditions, and `forbidden_resolutions[]`"*) — the rule already names the frontmatter as the engine-bearing surface. §Story Bundles §9 (Prose Length Discipline) is touched by the §15 `stop_policy.safety_valves.max_words` field which is engine-only runaway-defense per FOUNDATIONS §Story Bundles §9 (*"Engine-only — never surfaced in the LLM rendering prompt"*) — currently leaking into the renderer prompt via the §15 body. Cleaning this up tightens FOUNDATIONS §Story Bundles §9 compliance.
6. **Adjacent contradiction**: the §15 body's `mystery_safety` block re-asserts forbidden M ids that PPLAN-002 restricts in §7. The PPLAN-002 engaged-mystery body filter is the right rule; this ticket's §15 prose-direction translation drops the `mystery_safety` block from body (it stays in frontmatter via the inherited SLT record + the plan's `forbidden_resolutions[]`).

## Architecture Check

1. The change moves engine fields from a redundant body surface to their existing frontmatter surface; it does not create a new surface. The renderer-facing §15 becomes a focused prose-direction translation that paraphrases what the SLT means for this turn's scene, drawing only on the SLT's prose-bearing fields (`notes`, `user_intent`, `scene_question`, `natural_close_definition`, variant `required_effects` paraphrase).
2. No backwards-compatibility shims. Validator gates read frontmatter, which is unchanged. Existing plans with verbose §15 bodies remain valid under the validator (the gates do not require the verbose body); new plans use the focused body.
3. Alternative considered and rejected: keep the full SLT inlined but add a per-field "engine-only — ignore" annotation. This is worse — it adds tokens without helping the renderer, and tagging every field per-instance is brittle.

## Verification Layers

1. **§15 body shape rule documented at the template** → codebase grep-proof: `grep -n 'user_intent\|scene_question\|natural_close_definition' .claude/skills/_shared-templates/page-plan.md` returns the new §15 comment block.
2. **page-cycle phase-7 reference reflects the new prose-direction translation rule** → codebase grep-proof: `grep -n 'prose-direction translation\|engine-only fields' .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns hits.
3. **Validator gates (13 + 18) continue to pass on a re-authored plan** → schema validation: re-author PG-0004 of `worlds/erotica-world/stories/red-bunny` under the new §15 shape; `arc_envelope_conformance` and `plan_completeness_check` PASS by reading frontmatter values; the body §15 absence of engine fields does not affect the result.
4. **Renderer-facing §15 is materially shorter and prose-focused** → manual review: a re-authored PG-0004 plan §15 should be approximately 25-40 lines (storylet notes + 3 one-sentence prose fields + chosen variant prose translation) versus PG-0003's ~169-line SLT YAML dump.
5. **No regression on forbidden-mystery preservation** → schema validation: Phase 7.6 Layer 1 reads `frontmatter.forbidden_resolutions[]` which continues to carry every `forbidden`-status M in `mysteries_in_play[]` ∪ `arc.execution_envelope.mystery_preservation.forbidden_resolutions[]`; the body §15 absence of `execution_envelope.mystery_preservation` does not weaken this.

## What to Change

### 1. `.claude/skills/_shared-templates/page-plan.md` §15 comment (lines 173-178)

Replace:
> `<!-- INLINE: full SLT-NNNN arc record (arc_contract, dramatic_unit, beat_plan with min/max/beat-functions, execution_envelope, stop_policy.normal_exits, effect_model.variants[]). -->`

with:
> `<!-- INLINE the prose-direction translation of the selected SLT-NNNN arc record:`
> ``
> `**SLT id (one line)**: SLT-NNNN — <storylet title>.`
> ``
> `**Storylet notes (verbatim)**: <SLT.notes content — the authorial prose framing>.`
> ``
> `**What this scene commits to (one sentence)**: <SLT.arc_contract.user_intent>.`
> ``
> `**The scene question (one sentence)**: <SLT.dramatic_unit.scene_question>.`
> ``
> `**Natural close**: <SLT.dramatic_unit.natural_close_definition>.`
> ``
> `**Beats this scene must realize** (1-N short paragraphs, one per intended beat):`
> `- <beat 1 prose paraphrase from beat_plan.beats[0].function — translated, NOT the engine identifier>`
> `- <beat 2 prose paraphrase>`
> `- ...`
> ``
> `**Engine fields NOT inlined here** (carried by frontmatter for validator consumption): success_policy, allowed_outcome_band, value_delta_target schema fields, beat_plan.mode, beat_plan.beats[].state_significance, beat_plan.beats[].realization_target identifier, execution_envelope.{required_functions, prohibited_actions, invariants, allowed_tactics, style_directives, mystery_preservation}, stop_policy.{normal_exits.predicate/args, interrupt_before, safety_valves}, effect_model.variants[].{probability_weight, maps_to_outcome, forbidden_effects}, mystery_safety.*, exit_portfolio.*. These remain on the SLT record at worlds/<slug>/stories/<slug>/_source/storylets/SLT-NNNN.yaml and on plan frontmatter (selected_arc_id, chosen_variant_id, required_effects, forbidden_resolutions, declared_intended_beats) for engine readback. -->`

### 2. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md`

Update the prompt-assembly block (lines 44-46) to instruct the LLM author to extract only the prose-bearing fields from the SLT record when authoring §15:

> `[selected arc record — extract from the Phase-4-selected SLT-NNNN ONLY its prose-bearing fields: notes, arc_contract.user_intent, dramatic_unit.scene_question, dramatic_unit.natural_close_definition, beat_plan.beats[].function (paraphrase as prose, NOT verbatim identifier). Engine fields (success_policy, allowed_outcome_band, beat_plan.mode, beat_plan.beats[].state_significance / realization_target, execution_envelope.*, stop_policy.*, effect_model.variants[].probability_weight / maps_to_outcome / forbidden_effects, mystery_safety.*, exit_portfolio.*) are NOT inlined into §15 body — they are validator-consumed via frontmatter or via the canonical SLT record itself]`

Also update the "Body shape" §15 instruction line (around line 91-94) to direct the author to the §15 prose-direction translation block in the canonical template.

### 3. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`

Update gate 13 (`arc_envelope_conformance`) and gate 18 (`plan_completeness_check`) rationale rows:

- Gate 13: clarify that the gate reads `frontmatter.declared_intended_beats[]` (length against `arc.beat_plan.min_beats/max_beats`), `frontmatter.forbidden_resolutions[]`, and the chosen variant's `required_effects[]` from `frontmatter.required_effects[]`. The gate does NOT require the SLT body to be inlined in §15.
- Gate 18: clarify that "every inlined record id resolves" requires the SLT id to appear in §15 and resolve against the index; it does NOT require the full SLT schema body. The §15 prose-direction translation MUST inline the SLT id (e.g., "SLT-0012 — Confess one thing about himself in answer to her") so the gate sees the resolvable reference.

### 4. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` — `forbidden_engine_vocabulary` body reference

Bring the §15 prose-direction translation into the same body-cleanup posture as PPLAN-007 (`forbidden_engine_vocabulary` body view). Pair the two changes: §15 stops surfacing engine schema vocabulary; §18/§19 negative discipline says "do not use record-identifier vocabulary" without enumeration; the frontmatter `forbidden_engine_vocabulary[]` continues to be the engine surface.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify — §15 comment)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify — prompt-assembly + body-shape lines)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify — gates 13 + 18 rationale rows)

## Out of Scope

- Bootstrap PG-0001 §15-alt entry-pressure framing (unchanged — the root case omits §15 entirely).
- The SLT record schema at `worlds/<slug>/stories/<slug>/_source/storylets/SLT-NNNN.yaml` (unchanged — the SLT record continues to carry the full schema; only the page-plan body view of the SLT changes).
- Re-authoring of existing rendered plans.
- Storylet-pool-authoring `notes:` field discipline (handled by PPLAN-004).

## Acceptance Criteria

### Tests That Must Pass

1. The canonical template `.claude/skills/_shared-templates/page-plan.md` §15 comment names the prose-direction translation rule and explicitly lists the engine fields NOT inlined.
2. `phase-7-page-plan.md` prompt-assembly block extracts only prose-bearing SLT fields.
3. `phase-9-validation-gates.md` gates 13 and 18 rationale rows clarify the frontmatter-vs-body split.
4. Skill dry-run on PG-0004 of `worlds/erotica-world/stories/red-bunny` produces a §15 of approximately 25-40 lines (vs PG-0003's ~169 lines).
5. `arc_envelope_conformance` and `plan_completeness_check` continue to PASS on the new §15 shape.

### Invariants

1. The SLT id always appears in §15 body so `plan_completeness_check`'s record-id-resolution rule sees a hit.
2. Frontmatter `selected_arc_id`, `chosen_variant_id`, `required_effects[]`, `declared_intended_beats[]`, `forbidden_resolutions[]` are unchanged in shape and consumer-surface usage.
3. The SLT record at `_source/storylets/SLT-NNNN.yaml` continues to carry the full schema — the body view is a renderer-facing translation, not a schema reduction.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. Existing Phase 9 gates 13 + 18 are the proof surfaces.

### Commands

1. `grep -nE 'prose-direction translation|Engine fields NOT inlined' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (verifies the new rule is documented at both sites).
2. Manual diff: compare PG-0003 §15 (≈169 lines, full SLT YAML) against re-authored PG-0004 §15 (target 25-40 lines, prose-direction translation only).
3. Run Phase 9 validation on the re-authored PG-0004 working buffer and confirm gates 13 + 18 PASS.
