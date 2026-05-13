# PPLAN-005: §15 Selected scene-commitment arc — replace verbatim SLT YAML inlining with prose-direction translation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — edits the canonical page-plan template, `branching-story-page-cycle/SKILL.md`, `branching-story-page-cycle/references/phase-7-page-plan.md`, `branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`, and `branching-story-page-cycle/references/phase-9-validation-gates.md` (`plan_completeness_check`, ARC_TRACE Layer 1, and `arc_envelope_conformance` consumer surfaces). Frontmatter and the Phase 4 selected SLT record remain the validator-bearing surfaces; only the §15 renderer-facing body shape changes.
**Deps**: None directly. Pairs with PPLAN-006 (parallel cleanup of §10/§11/§12) and PPLAN-007 (`forbidden_engine_vocabulary` body cleanup).

## Problem

At intake, `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` §15 inlined the full SLT-12 YAML record verbatim (lines 578-746, ~169 lines). The body content included engine-only fields the external prose renderer cannot act on:

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
3. **Plan_self_containment (Phase 9.5 bootstrap-only check) does not require the full SLT YAML in §15.** Verified by reading `phase-9-5-bootstrap-discipline-validator.md` (Phase 9.5 lives at bootstrap; §15 is omitted at the root case per `phase-7-root-page-plan.md:18` `§15-alt Entry pressure framing replaces both §15 and §16`). The page-cycle case was the active §15 consumer; this ticket changes that consumer body shape while preserving the selected SLT as engine context.
4. **Shared boundary under audit**: the §15 body shape (canonical template + page-cycle parent skill summary + page-cycle phase-7 reference + page-cycle phase-7.6 Layer 1 reference + page-cycle phase-9-validation-gates reference). Five files. The frontmatter consumer surfaces (`frontmatter.selected_arc_id`, `chosen_variant_id`, `required_effects[]`, `forbidden_resolutions[]`, `declared_intended_beats[]`) are unchanged; Layer 1 still has the selected SLT record from Phase 4 as an engine input and no longer depends on the plan body carrying the full SLT schema.
5. **FOUNDATIONS principle under audit**: §Story Bundles §4 (*"the plan is engine-readable and validation-bearing — its frontmatter declares affordances, intended beats, stop conditions, and `forbidden_resolutions[]`"*) — the rule already names the frontmatter as the engine-bearing surface. §Story Bundles §9 (Prose Length Discipline) is touched by the §15 `stop_policy.safety_valves.max_words` field which is engine-only runaway-defense per FOUNDATIONS §Story Bundles §9 (*"Engine-only — never surfaced in the LLM rendering prompt"*). At intake, the old §15 body instruction leaked that engine-only field into the renderer prompt; the landed §15 translation removes it from the body view and tightens FOUNDATIONS §Story Bundles §9 compliance.
6. **Adjacent contradiction**: the §15 body's `mystery_safety` block re-asserts forbidden M ids that `archive/tickets/PPLAN-002-mystery-enumeration-restriction.md` restricts in §7. The archived PPLAN-002 engaged-mystery body filter is the right rule; this ticket's §15 prose-direction translation drops the `mystery_safety` block from body (it stays in frontmatter via the inherited SLT record + the plan's `forbidden_resolutions[]`).

## Architecture Check

1. The change moves engine fields from a redundant body surface to their existing frontmatter surface; it does not create a new surface. The renderer-facing §15 becomes a focused prose-direction translation that paraphrases what the SLT means for this turn's scene, drawing only on the SLT's prose-bearing fields (`notes`, `user_intent`, `scene_question`, `natural_close_definition`, variant `required_effects` paraphrase).
2. No backwards-compatibility shims. Validator gates read frontmatter, which is unchanged. Existing plans with verbose §15 bodies remain valid under the validator (the gates do not require the verbose body); new plans use the focused body.
3. Alternative considered and rejected: keep the full SLT inlined but add a per-field "engine-only — ignore" annotation. This is worse — it adds tokens without helping the renderer, and tagging every field per-instance is brittle.

## Verification Layers

1. **§15 body shape rule documented at the template** → codebase grep-proof: `grep -nE 'prose-direction translation|Engine fields NOT inlined' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md`.
2. **page-cycle phase-7 reference reflects the new prose-direction translation rule** → same grep-proof confirms the Phase 7 reference carries the new body rule.
3. **Validator gates (13 + 18) preserve the frontmatter/engine-context split** → grep-proof/manual review: `phase-9-validation-gates.md` states `arc_envelope_conformance` consumes frontmatter plus the Phase-4-selected arc record and that `plan_completeness_check` requires the SLT id + prose-direction translation, not the full SLT schema body.
4. **Renderer-facing §15 is materially shorter and prose-focused** → manual review of the landed template: §15 carries storylet notes + three one-sentence prose fields + beat-function paraphrases instead of a full SLT YAML dump.
5. **No regression on forbidden-mystery preservation** → manual contract review: Phase 7.6 Layer 1 reads `frontmatter.forbidden_resolutions[]` and the Phase-4-selected arc record; the body §15 absence of `execution_envelope.mystery_preservation` does not weaken this.
6. **Parent skill summary and Layer 1 wording match the new body contract** → codebase grep-proof/manual review: `branching-story-page-cycle/SKILL.md` and `phase-7-6-arc-trace-extraction.md` no longer require the full SLT schema to be inlined into §15 body.

## Landed Changes

### 1. `.claude/skills/_shared-templates/page-plan.md` §15 comment

Replaced:
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

Updated the prompt-assembly block to instruct the LLM author to extract only the prose-bearing fields from the SLT record when authoring §15:

> `[selected arc record — extract from the Phase-4-selected SLT-NNNN ONLY its prose-bearing fields: notes, arc_contract.user_intent, dramatic_unit.scene_question, dramatic_unit.natural_close_definition, beat_plan.beats[].function (paraphrase as prose, NOT verbatim identifier). Engine fields (success_policy, allowed_outcome_band, beat_plan.mode, beat_plan.beats[].state_significance / realization_target, execution_envelope.*, stop_policy.*, effect_model.variants[].probability_weight / maps_to_outcome / forbidden_effects, mystery_safety.*, exit_portfolio.*) are NOT inlined into §15 body — they are validator-consumed via frontmatter or via the canonical SLT record itself]`

Also updated the "Body shape" §15 instruction to direct the author to the §15 prose-direction translation block in the canonical template, and clarified the plan-completeness exception: §15 must inline the SLT id plus translation, not the full SLT schema body.

### 3. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`

Updated gate 13 (`arc_envelope_conformance`) and gate 18 (`plan_completeness_check`) rationale rows:

- Gate 13: clarify that the gate reads `frontmatter.declared_intended_beats[]` (length against `arc.beat_plan.min_beats/max_beats`), `frontmatter.forbidden_resolutions[]`, and the chosen variant's `required_effects[]` from `frontmatter.required_effects[]`. The gate does NOT require the SLT body to be inlined in §15.
- Gate 18: clarify that "every inlined record id resolves" requires the SLT id to appear in §15 and resolve against the index; it does NOT require the full SLT schema body. The §15 prose-direction translation MUST inline the SLT id (e.g., "SLT-12 — Confess one thing about himself in answer to her") so the gate sees the resolvable reference.

### 4. `.claude/skills/branching-story-page-cycle/SKILL.md`

Updated the parent skill Phase 7 summary, Phase 7.6 summary, Phase 10 plan-preview example, and Phase 7 guardrail so they no longer say the full SLT record is inlined verbatim into §15. They now say the selected SLT record is an engine input, while §15 body carries the SLT id plus prose-direction translation; §16 still carries chosen variant required effects verbatim.

### 5. `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`

Clarified that Layer 1 consumes the selected SLT record from the Phase 4 engine context plus plan frontmatter. The §15 body must contain the SLT id for completeness/branch-scope checks, but the full SLT schema body is not required in §15.

### 6. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` — `forbidden_engine_vocabulary` body reference

Brought the §15 prose-direction translation into the same body-cleanup posture as PPLAN-007 (`forbidden_engine_vocabulary` body view). §15 stops surfacing engine schema vocabulary; the frontmatter `forbidden_engine_vocabulary[]` continues to be the engine surface.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify — §15 comment)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — Phase 7 / Phase 7.6 / Phase 10 summary wording)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify — prompt-assembly + body-shape lines)
- `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` (modify — Layer 1 input/body split)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify — gates 13 + 18 rationale rows)

## Out of Scope

- Bootstrap PG-1 §15-alt entry-pressure framing (unchanged — the root case omits §15 entirely).
- The SLT record schema at `worlds/<slug>/stories/<slug>/_source/storylets/SLT-NNNN.yaml` (unchanged — the SLT record continues to carry the full schema; only the page-plan body view of the SLT changes).
- Re-authoring of existing rendered plans.
- Storylet-pool-authoring `notes:` field discipline (handled by `archive/tickets/PPLAN-004-storylet-notes-character-agnostic-gestures.md`).

## Acceptance Criteria

### Tests That Must Pass

1. The canonical template `.claude/skills/_shared-templates/page-plan.md` §15 comment names the prose-direction translation rule and explicitly lists the engine fields NOT inlined.
2. `phase-7-page-plan.md` prompt-assembly block extracts only prose-bearing SLT fields.
3. `phase-9-validation-gates.md` gates 13 and 18 rationale rows clarify the frontmatter-vs-body split.
4. `branching-story-page-cycle/SKILL.md` and `phase-7-6-arc-trace-extraction.md` no longer require full SLT schema-body inlining for §15.
5. Stale active-surface anchors for "full SLT verbatim" / "inlined arc record" are absent from the edited active skill/template surfaces.

### Invariants

1. The SLT id always appears in §15 body so `plan_completeness_check`'s record-id-resolution rule sees a hit.
2. Frontmatter `selected_arc_id`, `chosen_variant_id`, `required_effects[]`, `declared_intended_beats[]`, `forbidden_resolutions[]` are unchanged in shape and consumer-surface usage.
3. The SLT record at `_source/storylets/SLT-NNNN.yaml` continues to carry the full schema — the body view is a renderer-facing translation, not a schema reduction.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. Existing Phase 9 gates 13 + 18 are the proof surfaces.

### Commands

1. `grep -nE 'prose-direction translation|Engine fields NOT inlined' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (verifies the new rule is documented at both sites).
2. `grep -nE 'Phase-4-selected arc record|full SLT schema body|SLT id' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (verifies the parent skill, Layer 1, and gate wording match the new body contract).
3. `if rg -n 'selected arc record \(full|full.*SLT.*verbatim|inlined selected-arc record|inlined arc record|SLT-NNNN inlined verbatim|Inline the full[[:space:]]+Phase-4-selected SLT|execution_envelope, stop_policy.normal_exits, effect_model.variants\[\]' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md; then exit 1; fi` (verifies stale full-SLT-body anchors are gone from active edited surfaces).
4. `git diff --check -- .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md`

## Outcome

Completion date: 2026-05-12.

Completed the §15 SLT schema-to-prose body cleanup. The canonical page-plan template now tells plan authors to put only the SLT id, storylet notes, user intent, scene question, natural close, and beat-function prose paraphrases in §15. Engine-only SLT schema fields remain on the canonical SLT record and frontmatter/engine context for validator readback.

Same-seam parent and Layer 1 docs were updated so the page-cycle skill no longer claims the full SLT schema body is inlined into §15. Phase 9 gates 13 and 18 now state the frontmatter/engine-context split explicitly.

## Verification Result

1. `grep -nE 'prose-direction translation|Engine fields NOT inlined' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` — PASS; the template and Phase 7 reference contain the new §15 rule.
2. `grep -nE 'Phase-4-selected arc record|full SLT schema body|SLT id' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` — PASS; parent skill, Layer 1, and gate wording all describe the SLT id/prose-direction body plus engine-context SLT record.
3. `if rg -n 'selected arc record \(full|full.*SLT.*verbatim|inlined selected-arc record|inlined arc record|SLT-NNNN inlined verbatim|Inline the full[[:space:]]+Phase-4-selected SLT|execution_envelope, stop_policy.normal_exits, effect_model.variants\[\]' ...; then exit 1; fi` over the edited active skill/template surfaces — PASS; stale full-SLT-body anchors are absent.
4. Manual contract review — PASS; `frontmatter.selected_arc_id`, `chosen_variant_id`, `required_effects[]`, `declared_intended_beats[]`, and `forbidden_resolutions[]` remain the engine-bearing surfaces, and the selected SLT record remains available to Layer 1 as Phase 4 engine context.
5. `git diff --check -- .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md` — PASS after archival path repair.

## Deviations

- Did not re-author PG-4 or run a live Phase 9 validation pass. The repo does not expose an executable dry-run harness for these prose workflow skills in this ticket's scope. This documentation-only contract change is verified by source contract review and grep proofs.
- Same-seam scope widened during reassessment to include `.claude/skills/branching-story-page-cycle/SKILL.md` and `phase-7-6-arc-trace-extraction.md`; both still described the old full-SLT-body assumption.
