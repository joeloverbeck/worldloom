# STPOOL-007: Genericize the world-bound tone-theme tag dictionary

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — skill-template and triage-doc content edits only.
**Deps**: None

## Problem

At intake, `.claude/skills/storylet-pool-authoring/templates/tone-theme-tag-dictionary.md` was framed as generic recommended tag vocabulary for `tone_tags` and `theme_tags` in any storylet pool, but the actual tag dictionary was bound to one specific world (a Marla/Iker mystery-thriller set in Basque Country / San Sebastián).

World-specific tags (≥40 items) include:

- Character-name-bound tags: `marla_seed_landing`, `marla_displacement_compounding`, `marla_displacement_invisible_but_real`, `marla_register_under_pressure`, `marla_native_register_versus_calibrated_register`, `marla_stage_3_register_engaging`, `marla_hidden_register_legible_to_iker`, `marla_inside_discretion_infrastructure`, `iker_pursuit_engaging`, `iker_agency_emerging`, `iker_home_register_inversion`.
- Specific-CF / specific-INV bound tags: `cf_0004_grammar_engaging`, `dis_1_at_centro_acquisition_layer`, `dis_1_made_concrete`, `dis_1_register`, `cau_1_register`, `cau_2_register`, `aes_1_register`, `aes_2_register`, `soc_1_register_ambient`, `soc_2_legal_frame_holding`, `ont_2_bodily_substrate_exception_instantiated`.
- Specific-M bound tags: `m_1_property_gating_brushed_not_resolved`, `m_2_locked_rooms_brushed_not_resolved`, `m_3_substrate_untouched`, `m_4_variant_untouched`, `m_4_referenced_no_cause_proposed`.
- DA-0001 stage progression (specific diegetic artifact): `stage_2_engineered_first_contact`, `stage_3_register_engaging`, `stage_4_buildup`, `stage_4_disclosure_runtime`, `stage_5_register_engaging`, `stage_6_ironic_pre_figure`.
- Specific-location bound tags: `centro_register`, `gros_working_class_pov`, `irun_border_register`, `cuadrilla_register`, plus location-class references in `templates/predicate-dsl.md:127-128` (`centro_wealth_register`, `gros_working_class_register`, `irun_border_register`).
- Specific-SF bound: `sf_0007_payoff_literal`.

At intake, the "Convergence target" paragraph treated the dictionary as pool-lifetime shared vocabulary for cross-batch tag-distribution analysis (per Phase 5 Tone distribution and Theme distribution checks in `references/phase-4-5-canon-safety-checks.md`). But the dictionary as authored could not serve as shared vocabulary across worlds — every other world that invoked `storylet-pool-authoring` received misleading guidance, since the tag names referenced characters, mysteries, CFs, and locations that did not exist in their world.

The skill's stated invocation contract is "any existing world under `worlds/<world-slug>/`". The genericized template is now compatible with that contract.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-06.

## Assumption Reassessment (2026-05-12)

1. At intake, verified `templates/tone-theme-tag-dictionary.md` enumerated the world-bound tags. The family headings (POV register, Emotional charge, Structural beat, Class/cultural register, Temporal/spatial register, Narrative-mechanic) were generic; the per-family tag instances were world-bound.
2. At intake, verified `templates/predicate-dsl.md` repeated some of the same world-bound location-class labels (`centro_wealth_register`, `gros_working_class_register`, `irun_border_register`); these were touched in lockstep by genericizing the location-kind, location-id, location-class, and role-matcher examples.
3. Verified `references/phase-4-5-canon-safety-checks.md:58-60` (Phase 5 tone/theme distribution checks) treats the dictionary as recommended vocabulary, not gate-enforced; the genericization does NOT require validator changes.
4. The intent of the dictionary — cross-batch tag-convergence for distribution analysis — is sound and worth preserving. The instance set is the misfit, not the structure.
5. Verified `docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` recorded STPOOL-007 as the active accepted remediation for the world-bound dictionary. That status prose was same-seam closeout fallout and has been updated.
6. Genericization options resolved during implementation:
   - (a) **Move-per-world**: relocate the world-bound dictionary to `worlds/<bound-world>/templates/tone-theme-tag-dictionary.md` (preserves the existing dictionary as a per-world artifact for the world it was authored against). Skill-level file becomes a generic-only stub.
   - (b) **Genericize-in-place**: strip world-bound instances; keep family headings + family descriptions + a "When to invent a new tag" note + an "Authoring a per-world dictionary" note pointing to where world-specific tags should live.
   - (c) **Replace-with-source-doc**: document that bootstrap's per-world `STORY_KERNEL.themes` is the actual source of tag vocabulary and reduce this file to family-naming guidance only.

   Chosen: (b) genericize-in-place. (a) and (c) are larger reshapings; (b) preserves the family taxonomy at the skill level while cleanly separating world-bound vocabulary from skill-bound guidance.

## Architecture Check

1. The genericized dictionary is structurally compatible with cross-batch tag-distribution analysis at the family level (tone family ≤40% per dominant family; theme family ≤50% per dominant family — the same threshold semantics, applied at the family axis instead of the instance axis). Per-world tag instances become a separate per-world artifact.
2. No backwards-compatibility shim — in-tree storylets that carry the existing world-bound tags continue to work; the dictionary's role is recommended vocabulary, not gate-enforced.

## Verification Layers

1. **Generic content audit** — every tag instance in the genericized dictionary is world-agnostic (no character names, no specific CF / INV / M / DA / SF / SREL / STENT ids, no specific location names) → grep the file for the offending patterns (`marla|iker|cuadrilla|centro|gros|irun|gaztelufit|cf_0004|cau_1|soc_1|m_[0-9]|sf_[0-9]|stage_[2-6]_`) returns zero matches in the skill-level file.
2. **Cross-template alignment with predicate-dsl** — `templates/predicate-dsl.md` location-kind, location-id, location-class, and role-matcher examples get the same genericization treatment.
3. **Skill invocation against a non-bound world is coherent** — a hypothetical storylet-pool-authoring invocation against a fantasy world (no Marla, no Iker, no Centro) produces tag suggestions that make sense.

## Landed Changes

### 1. Chose genericization option b

This ticket genericized the skill-level dictionary in place. The previous world-bound dictionary was not relocated because no user-identified world slug was supplied and the ticket's owned invariant was the skill-level shared-vocabulary contract.

### 2. Genericized `tone-theme-tag-dictionary.md`

In `templates/tone-theme-tag-dictionary.md`:

- preserved the family-taxonomy structure for `tone_tags` and `theme_tags`;
- replaced world-bound tag instances with generic family-member examples;
- added "Authoring a per-world dictionary" with the `worlds/<slug>/templates/tone-theme-tag-dictionary.md` extension convention;
- reframed convergence as combined skill-level family convergence plus optional per-world instance convergence.

### 3. Genericized predicate-DSL location examples

In `templates/predicate-dsl.md`, the location-kind, location-id, location-class, and role-matcher examples now use generic world-local vocabulary instead of bound-world place names or character names.

### 4. Updated same-seam triage status

`docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` now records STPOOL-007 as completed and archived and notes that per-world relocation was intentionally not performed.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/tone-theme-tag-dictionary.md` (modify; substantial rewrite)
- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify; location-class example genericization)
- `docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` (modify; same-seam status truthing)

## Out of Scope

- Actually relocating the existing world-bound dictionary to `worlds/<bound-world>/templates/` — the user would need to identify which world this is bound to, and whether that world bundle wants the dictionary. That's a separate, user-driven follow-up.
- Editing Phase 5 diversity-axis thresholds (`tone_tags` ≤40%, `theme_tags` ≤50%) — those remain valid at the family axis as well as the instance axis.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -iE "marla|iker|cuadrilla|centro|gros|irun|gaztelufit|cf_0004|cau_[12]|soc_[12]|aes_[12]|dis_1|ont_2|m_[0-9]_|sf_[0-9]+|stage_[2-6]_" .claude/skills/storylet-pool-authoring/templates/tone-theme-tag-dictionary.md` returns zero matches.
2. The genericized dictionary still has discoverable family headings and per-family tag families.
3. `templates/predicate-dsl.md`'s location-kind / location-class example values either (a) are stripped of world-bound instances OR (b) carry an explicit per-world-customization disclaimer.

### Invariants

1. The skill-level `tone-theme-tag-dictionary.md` is world-agnostic; world-bound vocabulary lives in per-world artifacts.
2. The Phase 5 tone/theme distribution-analysis semantics still operate on the genericized dictionary (family-level thresholds remain valid).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. The grep from Acceptance Criteria test 1.
2. Visual inspection of the genericized file: family-structure preserved, world-bound instances stripped, new "Authoring a per-world dictionary" section added.
3. A hypothetical mental walk through invoking `storylet-pool-authoring` against a non-Marla/Iker world to confirm the dictionary's guidance makes sense.

## Outcome

Completion date: 2026-05-12

Implemented option b, genericize-in-place. The skill-level tone/theme dictionary is now world-agnostic, still carries stable tone/theme family examples, and documents where per-world extensions belong. Predicate DSL location examples were also genericized so the prompt no longer suggests bound-world location values as universal examples. The audit triage record was updated to reflect the landed status and the non-relocation boundary.

## Verification Result

1. `grep -iE "marla|iker|cuadrilla|centro|gros|irun|gaztelufit|cf_0004|cau_[12]|soc_[12]|aes_[12]|dis_1|ont_2|m_[0-9]_|sf_[0-9]+|stage_[2-6]_" .claude/skills/storylet-pool-authoring/templates/tone-theme-tag-dictionary.md` returned zero matches.
2. Manual review confirmed `tone-theme-tag-dictionary.md` preserves discoverable `tone_tags` / `theme_tags` family headings, generic per-family examples, the "When to invent a new tag" section, and the new "Authoring a per-world dictionary" section.
3. Manual review confirmed `templates/predicate-dsl.md` location-kind, location-id, location-class, and role-matcher examples are generic and world-local rather than bound to the intake world.
4. Manual non-bound-world walkthrough: a fantasy, science-fiction, or historical world can use the skill-level dictionary without receiving character-name, location-name, or world-record-specific tag suggestions; per-world tags can be added under `worlds/<slug>/templates/tone-theme-tag-dictionary.md`.

## Deviations

- The previous bound-world dictionary was not moved to a `worlds/<slug>/templates/` path. That remains out of scope until the user identifies the target world bundle and wants the old tag set preserved as world content.
