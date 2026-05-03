# Tone & Theme Tag Dictionary — Storylet Pool Authoring

Recommended-but-non-binding tag vocabulary for storylet `tone_tags` and `theme_tags`. Convergence on this dictionary across batches enables cross-batch tag-distribution analysis (Phase 5 §Tone distribution and §Theme distribution) and cross-pool tag-search reproducibility. Free-form tags remain allowed; the dictionary is guidance, not gate enforcement.

This file is inlined into Phase 3's LLM prompt alongside `templates/predicate-dsl.md` as recommended vocabulary. The LLM should prefer dictionary tags when applicable and only invent tags when no dictionary entry captures the storylet's specific register.

## Why this matters

Each batch's Phase 5 diversity audit checks per-tag distribution thresholds (`tone_tags` ≤40% per axis, `theme_tags` ≤50% per axis). Without a shared vocabulary, each batch invents its own tags ad hoc, producing tag fragmentation across the pool's lifetime: SLB-0001 tags `tell_surfacing` while SLB-0002 tags `register_slipping` for the same beat, defeating cross-batch tag analysis. A canonical dictionary keeps tags semantically aligned so:

- `branching-story-page-cycle` Phase 4 selection's tone-distribution scoring sees consistent signal across the pool;
- `branching-story-health-audit` repetition-detection scans see consistent tag families;
- pool-lifetime tag-distribution analysis (across multiple batches) is meaningful rather than dominated by synonym-fragmentation noise.

## Tag families — `tone_tags`

### POV register family — captures whose perceptual frame the storylet operates inside

- `working_class_pov` — POV character is working-class; surface details read through scarcity / labor / household economics
- `wealthy_outsider_pov` — POV character is wealthy / non-local; surface details read through commodity / mobility / register
- `rural_pov` — POV character grounded in non-urban register
- `urban_pov` — POV character grounded in dense-urban register
- `migrant_pov` — POV character in transit / between geographies / linguistic register-switching
- `child_pov` — POV character is a minor; surface details read through youth-perception filters
- `elderly_pov` — POV character is significantly older than the surrounding cast; surface details carry generational weight
- `outsider_to_subculture_pov` — POV character is partial to a subculture (cuadrilla, profession, faith) without full membership
- `insider_to_subculture_pov` — POV character is fully embedded in a subculture; reads its codes as ordinary

### Emotional charge family — captures the storylet's affective register

- `restrained` — affect is held below visible surface; reader infers
- `charged` — affect is operationally present, audible / visible to other characters
- `gentle` — soft register; tenderness rather than tension
- `tense` — high affect, forward-leaning
- `ardent` — intense desire / commitment register
- `possessive` — claiming-against-rivals affect register
- `secretive` — affect concealed for plot reasons
- `ironic` — surface affect diverges from underlying state (dramatic irony)
- `tragic` — affect is loss-shaped / mourning-shaped
- `dread` — anticipatory negative affect
- `dread_inside_desire` — desire register carrying simultaneous threat (recurring undercurrent in erotica/thriller)
- `charged_quiet` — quiet surface, charged interior
- `charged_threshold` — affect at the moment of decision / commitment
- `charged_observation` — observation register that itself carries affect
- `charged_eavesdropping` — observation-without-being-observed register

### Structural beat family — captures where in the storylet's arc the beat sits

- `threshold` — moment of decision / commitment / first-time-doing-X
- `aftermath` — after-the-event affect (next page, hours later, days later)
- `confrontation` — face-to-face naming of conflict
- `disclosure` — handing of a previously-concealed fact
- `pre_disclosure` — buildup to a coming disclosure beat
- `imprint_carrying` — POV character holds residue from a prior event
- `eight_second_window` — micro-time decisions where the choice is made and unmade in seconds
- `cumulative_realization` — POV character integrates several prior beats into a new understanding
- `frame_inverting` — what was assumed becomes unassumable
- `dramatic_irony_collapsing` — reader's prior dramatic irony collapses into the POV character's awareness
- `dramatic_irony_pivoting` — dramatic irony rotates rather than resolves

### Class / cultural register family — captures social / institutional register

- `class_register` — class asymmetry visible / operational
- `class_landing_in_body` — class asymmetry felt physically by POV
- `class_in_numbers` — class asymmetry registers as a specific number
- `centro_register` — Centro-luxury hospitality / residential register
- `gros_working_class_pov` — Gros / working-class neighborhood register
- `irun_border_register` — Irún / border / transit register
- `cf_0004_grammar_engaging` — CF-0004 service-class discretion grammar visible / operational
- `cuadrilla_register` — Basque close-friend-group register
- `family_register` — kin-group register (parents, siblings, extended)
- `peer_life_register` — middling-distance peer / not-yet-defined-relationship register
- `held_life_register` — POV character's pre-existing life architecture (cuadrilla + family + routine)
- `staged_life_register` — antagonist's engineered scene-architecture
- `linguistic_layering` — multiple linguistic registers operating simultaneously
- `code_switching` — POV character moves between linguistic registers within the storylet

### Temporal / spatial register family — captures when / where the beat is set

- `gold_hour` — late-afternoon to early-evening light register
- `dusk` — twilight register
- `late_night` — post-midnight register
- `morning` — early-day register
- `weekend_register` — non-work-day register (slow, family-adjacent)
- `weekday_register` — work-day register (transit, school, routine)
- `interior` — POV character alone / in solo space
- `public` — POV character in a public-visible scene
- `clandestine` — POV character in a hidden / secret scene
- `transit` — POV character in motion (Topo, walk, bike)

### Narrative-mechanic family — captures the storylet's structural function

- `register_inverting` — surface relationship between elements inverts within the storylet
- `register_collapsing` — multi-layer register breaks down into single layer
- `register_holding` — register persists through pressure
- `register_under_pressure` — register tested but not yet broken
- `geometric_inversion` — predator/quarry or other role-pair inverts
- `predator_quarry_inverting` — specific role-inversion of pursuer/pursued
- `surveillance_register_returning` — DA/CF surveillance pattern surfaces in-scene
- `proximity_pursuit` — CAU-1 instantiation (proximity compounds desire)
- `cau_1_register` — invariant CAU-1 visibly engaged
- `cau_2_register` — invariant CAU-2 visibly engaged (secrecy compounds)

## Tag families — `theme_tags`

### Mystery-and-secret family — captures storylet's relationship to OBL secrets

- `marla_hidden_register_legible_to_iker` — secret register becomes partially visible to POV
- `surveillance_artifact_discovery` — physical artifact of surveillance found
- `us_backstory_leak` — backstory leaks via external channel
- `sf_0007_payoff_literal` — anatomy disclosure runs literal_fulfillment route
- `engineered_chance_visible` — staged-as-chance frame becomes visible
- `dramatic_irony_collapsing` — reader's dramatic irony collapses into POV awareness
- `epistemic_asymmetry_collapsing` — knowledge asymmetry between cast members narrows
- `staged_register_unverifiable` — antagonist's stage-craft leaves traces that resist evidence

### Class / DIS family — captures DIS-1 / DIS-2 invariant engagement

- `dis_1_made_concrete` — DIS-1 housing-class asymmetry concretized
- `dis_1_at_centro_acquisition_layer` — class asymmetry at the property-acquisition layer (M-1 brushing surface)
- `material_asymmetry_beat` — specific number / brand / price registers asymmetry
- `class_cross_at_centro_hospitality` — class asymmetry concretized at hospitality venue
- `class_geography_inverted` — spatial register flips (POV's neighborhood vs antagonist's)
- `iker_home_register_inversion` — antagonist enters POV's geography
- `marla_inside_discretion_infrastructure` — antagonist embedded in CF-0004 register
- `marla_native_register_versus_calibrated_register` — antagonist's two registers visible

### Held-life family — captures POV's pre-existing life architecture

- `held_life_pressure` — held-life architecture pressured but intact
- `held_life_eroding` — held-life architecture beginning to fray
- `held_life_intact_but_pressured` — explicit held-life pressure without erosion
- `held_life_intersecting_engineered_life` — held-life and antagonist's plan collide
- `cuadrilla_disclosure_pressure` — cuadrilla-internal disclosure register engages
- `marla_displacement_compounding` — antagonist's Stage 5 displacement plan visibly engages
- `marla_displacement_invisible_but_real` — Stage 5 displacement engages without POV recognition
- `weekend_rituals_changing` — weekend register reorganizes around antagonist
- `three_year_routine_cracking` — long-tenure routine breaks for first time

### Reader-expectation family — captures OBL-0001 reader-expectation engagement

- `iker_pursuit_engaging` — POV begins pursuing antagonist
- `imprint_carrying` — POV holds prior-encounter imprint
- `body_knowing_before_mind` — POV's body integrates beat before mind articulates
- `marla_seed_landing` — antagonist's Stage 4 gentleness-as-seed lands
- `central_dramatic_question_engaged` — arc question (whole/broken/transformed) explicitly engages

### Agency family — captures POV's agency arc

- `iker_agency_emerging` — POV begins acting from articulated want rather than reaction
- `central_dramatic_question_engaged` — arc question explicitly engages (paired with reader-expectation)
- `marla_register_under_pressure` — antagonist's stage-craft pressured by POV agency

### Theme-stage family — captures DA-0001 stage-progression mapping

- `stage_2_engineered_first_contact` — DA-0001 Stage 2 register
- `stage_3_register_engaging` — Stage 3 (let second meeting be his idea)
- `stage_4_buildup` — Stage 4 (loft / gentleness-as-seed) buildup
- `stage_4_disclosure_runtime` — Stage 4 disclosure event
- `stage_5_register_engaging` — Stage 5 (displacement) register
- `stage_6_ironic_pre_figure` — Stage 6 perfect-confession ironically pre-figured
- `marla_stage_3_register_engaging` — antagonist's Stage 3 specifically (subset of stage_3_register_engaging)

### Mystery-edge family — captures M-NNNN brushing without resolution

- `m_1_property_gating_brushed_not_resolved` — M-1 brushed; no old-family coordination claimed
- `m_2_locked_rooms_brushed_not_resolved` — M-2 brushed; no specific room-content claimed
- `m_3_substrate_untouched` — M-3 firewall holds (saturation never source-attributed)
- `m_4_variant_untouched` — M-4 firewall holds (variant prevalence never source-attributed)
- `m_4_referenced_no_cause_proposed` — M-4 instantiated in narrative without proposing cause for prevalence (legal at SLT-0026 / SLT-0027 disclosure-aftermath route)

### Invariant-instantiation family — captures invariant engagement

- `ont_2_bodily_substrate_exception_instantiated` — ONT-2 bodily-substrate exception engaged in-scene
- `cau_1_register` — CAU-1 instantiated
- `cau_2_register` — CAU-2 instantiated
- `aes_1_register` — AES-1 instantiated (every surface charged)
- `aes_2_register` — AES-2 instantiated (taboo desire as recurring undercurrent)
- `dis_1_register` — DIS-1 instantiated (class asymmetry)
- `soc_1_register_ambient` — SOC-1 ambient (Catholic-residual + secular-permissive register)
- `soc_2_legal_frame_holding` — SOC-2 legal frame visible (consent law + abuse-of-authority)

## When to invent a new tag

The dictionary is non-exhaustive. Invent a new tag when:

1. **No dictionary entry captures the specific register** — the closest dictionary tag would lose semantic precision (e.g., a specific theme like `surveillance_archive_breach` may not yet have a dictionary entry; coin one rather than dilute `surveillance_artifact_discovery`).
2. **The new tag captures a recurring pattern** — if you find yourself wanting to coin the same tag in multiple seeds, the recurring pattern is itself a candidate for dictionary inclusion in a future revision.
3. **The new tag is more precise than the dictionary's** — a dictionary tag may be too coarse for the specific beat (e.g., `dramatic_irony_collapsing` may not capture a specific pivot — coin `dramatic_irony_partial_collapse` or similar).

**Avoid**:
- Inventing synonyms for existing dictionary entries (`tell_revealing` when the dictionary has `tell_surfacing`)
- Inventing batch-internal tags that only one storylet uses
- Inventing tags whose meaning only the immediate authoring context can decode

When in doubt, prefer the closest dictionary tag plus a more specific tag, rather than coining a single new tag that combines multiple registers.

## Convergence target

Across the pool's lifetime, target ≥80% of `tone_tags` and `theme_tags` drawn from this dictionary. The remaining ≤20% can be batch-specific or storylet-specific tags that capture registers the dictionary doesn't yet cover. When the ≤20% buffer regularly exceeds 20% in practice, the dictionary itself should be revised — convergence failure is a dictionary-coverage gap, not a tag-discipline failure.
