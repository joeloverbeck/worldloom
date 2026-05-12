# Tone & Theme Tag Dictionary - Storylet Pool Authoring

Recommended-but-non-binding tag vocabulary for storylet `tone_tags` and `theme_tags`. Convergence on this dictionary across batches enables cross-batch tag-distribution analysis (Phase 5 Tone distribution and Theme distribution) and cross-pool tag-search reproducibility. Free-form tags remain allowed; the dictionary is guidance, not gate enforcement.

This file is inlined into Phase 3's LLM prompt alongside `templates/predicate-dsl.md` as recommended vocabulary. The LLM should prefer dictionary tags when applicable and only invent tags when no dictionary entry captures the storylet's specific register.

## Why this matters

Each batch's Phase 5 diversity audit checks per-tag distribution thresholds (`tone_tags` <=40% per axis, `theme_tags` <=50% per axis). Without a shared vocabulary, each batch invents its own tags ad hoc, producing tag fragmentation across the pool's lifetime: one batch tags a concealed clue as `secret_surfacing` while another tags the same beat as `hidden_truth_emerging`, defeating cross-batch tag analysis. A canonical dictionary keeps tags semantically aligned so:

- `branching-story-page-cycle` Phase 4 selection's tone-distribution scoring sees consistent signal across the pool;
- `branching-story-health-audit` repetition-detection scans see consistent tag families;
- pool-lifetime tag-distribution analysis across multiple batches is meaningful rather than dominated by synonym-fragmentation noise.

## Tag families - `tone_tags`

### POV register family - captures whose perceptual frame the storylet operates inside

- `working_class_pov` - POV character reads the scene through scarcity, labor, or household economics
- `elite_pov` - POV character reads the scene through rank, privilege, status, or institutional access
- `rural_pov` - POV character is grounded in non-urban lifeways or spatial assumptions
- `urban_pov` - POV character is grounded in dense-urban systems, movement, or social proximity
- `migrant_pov` - POV character is in transit, displaced, or moving between social/geographic registers
- `child_pov` - POV character's perception is shaped by youth, dependency, or partial comprehension
- `elder_pov` - POV character's perception carries generational memory or long-horizon comparison
- `outsider_to_subculture_pov` - POV character is near a subculture without full fluency in its codes
- `insider_to_subculture_pov` - POV character is embedded in a subculture and reads its codes as ordinary

### Emotional charge family - captures the storylet's affective register

- `restrained` - affect is held below the visible surface
- `charged` - affect is operationally present and legible to others
- `gentle` - soft register; tenderness matters more than pressure
- `tense` - forward-leaning pressure, discomfort, or anticipation
- `ardent` - intense desire, commitment, devotion, or hunger
- `possessive` - claiming, territoriality, or rivalry shapes the beat
- `secretive` - affect is concealed because disclosure would change the scene
- `ironic` - surface affect diverges from underlying state
- `tragic` - affect is loss-shaped, mourning-shaped, or consequence-heavy
- `dread` - anticipatory negative affect drives the scene
- `desire_under_threat` - desire register carries simultaneous risk or danger
- `quietly_charged` - quiet surface, charged interior
- `threshold_charge` - affect peaks at a decision point
- `charged_observation` - watching or noticing is itself emotionally loaded
- `unseen_witness` - observation without being observed shapes the beat

### Structural beat family - captures where in the storylet's arc the beat sits

- `threshold` - moment of decision, commitment, entry, or refusal
- `aftermath` - immediate or delayed residue after an event
- `confrontation` - conflict is named face-to-face or role-to-role
- `disclosure` - a concealed fact, motive, identity, or cost is handed over
- `pre_disclosure` - buildup toward a likely disclosure beat
- `imprint_carrying` - POV carries residue from a prior scene into this one
- `micro_choice_window` - a compressed decision window shapes the outcome
- `cumulative_realization` - several prior beats integrate into a new understanding
- `frame_inverting` - an assumed frame becomes untenable
- `dramatic_irony_collapsing` - reader knowledge catches up to character knowledge
- `dramatic_irony_pivoting` - reader knowledge changes meaning without fully resolving

### Social / cultural register family - captures social, institutional, or group code

- `class_register` - class asymmetry is visible or operational
- `class_landing_in_body` - class asymmetry is felt physically by the POV
- `class_in_numbers` - price, wage, debt, distance, or count makes status concrete
- `institutional_register` - a formal institution's rules shape the scene
- `kinship_register` - family or household role obligations shape the beat
- `peer_group_register` - peers, friends, colleagues, or cohort norms shape the beat
- `held_life_register` - the POV character's pre-existing routines and bonds matter
- `staged_life_register` - another actor has engineered the scene's social architecture
- `linguistic_layering` - multiple language or register systems operate at once
- `code_switching` - a character moves between social, linguistic, or institutional codes

### Temporal / spatial register family - captures when or where the beat is set

- `gold_hour` - late-afternoon or early-evening light register
- `dusk` - twilight or transition-light register
- `late_night` - post-midnight or exhausted-time register
- `morning` - early-day reset, routine, or exposure register
- `weekend_register` - non-work-day pace, ritual, or social looseness
- `weekday_register` - work-day, school-day, transit, or schedule pressure
- `interior` - enclosed or private space shapes the scene
- `public` - public visibility shapes conduct or risk
- `clandestine` - hidden, unauthorized, or covert space shapes the scene
- `transit` - movement between places is part of the pressure

### Narrative-mechanic family - captures the storylet's structural function

- `register_inverting` - a social or emotional register flips during the scene
- `register_collapsing` - multiple layers collapse into one exposed layer
- `register_holding` - a register persists under pressure
- `register_under_pressure` - a register is tested but not yet broken
- `role_inversion` - pursuer/pursued, teacher/student, host/guest, or similar roles invert
- `pattern_returning` - a prior pattern returns in changed circumstances
- `proximity_pressure` - closeness itself increases stakes
- `secrecy_pressure` - secrecy compounds cost, desire, fear, or obligation

## Tag families - `theme_tags`

### Mystery-and-secret family - captures the storylet's relationship to withheld knowledge

- `hidden_register_becoming_legible` - a concealed pattern becomes partly readable
- `surveillance_artifact_discovery` - a physical or procedural trace of watching is found
- `backstory_leak` - past information leaks through an external channel
- `secret_payoff_literal` - an obligation or secret is paid off literally
- `engineered_chance_visible` - staged-as-chance framing becomes visible
- `epistemic_asymmetry_collapsing` - knowledge asymmetry between characters narrows
- `staged_register_unverifiable` - traces point to staging but resist proof

### Class / material-pressure family - captures resource and status engagement

- `material_asymmetry_concrete` - resource or status asymmetry becomes specific
- `resource_gate_brushed` - access to a place, object, role, or privilege is brushed but not resolved
- `material_asymmetry_beat` - a number, object, brand, distance, or cost registers pressure
- `class_crossing_scene` - characters cross classed space or expectation
- `class_geography_inverted` - social geography reverses or destabilizes expectations
- `power_inside_infrastructure` - power is embedded in ordinary systems rather than spectacle
- `native_register_versus_calibrated_register` - a character's fluent register contrasts with performed adaptation

### Held-life family - captures a character's pre-existing life architecture

- `held_life_pressure` - established routine, bond, or duty is pressured but intact
- `held_life_eroding` - established life architecture begins to fray
- `held_life_intact_but_pressured` - pressure appears without immediate erosion
- `held_life_intersecting_engineered_life` - ordinary life collides with another actor's design
- `group_disclosure_pressure` - a closed group becomes the pressure surface for disclosure
- `displacement_compounding` - one pressure displaces a character from ordinary life in layers
- `displacement_invisible_but_real` - displacement occurs before the POV recognizes it
- `rituals_changing` - recurring practices reorganize around new pressure
- `routine_cracking` - a long-running pattern breaks for the first time

### Reader-expectation family - captures expectation, payoff, and reversal

- `pursuit_engaging` - a character begins actively pursuing a person, answer, object, or goal
- `imprint_carrying` - a prior encounter shapes the current beat
- `body_knowing_before_mind` - embodied reaction precedes articulated understanding
- `seed_landing` - an earlier planted gesture, clue, or offer begins to matter
- `central_dramatic_question_engaged` - the story's core dramatic question becomes active in-scene

### Agency family - captures shifts in a character's capacity to act

- `agency_emerging` - a character acts from articulated want rather than reaction
- `agency_contested` - a character's capacity to choose is pressured by another actor or system
- `agency_misdirected` - action is real but aimed at the wrong target or premise
- `agency_cost_named` - the cost of acting becomes explicit
- `control_register_under_pressure` - a controlling actor or system is pressured by another agent

### Progression family - captures broad sequence movement without world-specific stage ids

- `first_contact_engineered` - an initial encounter is arranged or shaped by design
- `second_contact_reframed` - a repeat encounter changes the frame of the first
- `buildup_register` - a scene accumulates pressure toward a later turn
- `runtime_disclosure` - disclosure occurs during the active scene rather than as backstory
- `displacement_register` - a character is moved out of an expected place, role, or routine
- `ironic_prefigure` - a beat foreshadows a later reversal through irony

### Mystery-edge family - captures Mystery Reserve brushing without resolution

- `mystery_brushed_not_resolved` - a Mystery Reserve surface is touched without answer
- `locked_surface_brushed` - an inaccessible room, archive, object, or system is noticed but not opened
- `substrate_untouched` - underlying mechanism remains protected by the firewall
- `variant_pattern_untouched` - pattern variation is observed without cause attribution
- `referenced_no_cause_proposed` - a mystery-relevant fact appears without proposing its origin

### Invariant-instantiation family - captures world-rule engagement

- `ontological_rule_instantiated` - an ontological invariant is engaged in-scene
- `causal_rule_instantiated` - a causal invariant becomes operational
- `aesthetic_rule_instantiated` - an aesthetic invariant shapes the register
- `distribution_rule_instantiated` - access, scarcity, or distribution constraints matter
- `social_rule_instantiated` - social, legal, ritual, or institutional rules visibly hold
- `mystery_firewall_holding` - a storylet approaches a protected mystery without resolving it

## Authoring a per-world dictionary

This skill-level dictionary is intentionally world-agnostic. If a story bundle needs named characters, locations, artifacts, local social categories, or world-specific canon ids in tag names, create a per-world extension such as:

```text
worlds/<slug>/templates/tone-theme-tag-dictionary.md
```

Use the same family headings where possible, then add world-specific tag instances beneath them. A per-world dictionary should:

1. inherit the family structure from this file;
2. define any world-bound or story-bound tags in terms of the relevant world/story records;
3. avoid reintroducing generic synonyms already present here;
4. keep mystery-related tags firewall-safe by describing contact with a mystery surface rather than a resolved answer.

Phase 5 distribution analysis should read both layers when a per-world dictionary exists: the skill-level layer keeps family-level convergence stable across worlds, while the per-world layer preserves instance-level convergence inside that world or story bundle.

## When to invent a new tag

The dictionary is non-exhaustive. Invent a new tag when:

1. **No dictionary entry captures the specific register** - the closest dictionary tag would lose semantic precision.
2. **The new tag captures a recurring pattern** - if you find yourself wanting to coin the same tag in multiple seeds, the recurring pattern is itself a candidate for dictionary inclusion in a future revision.
3. **The new tag is more precise than the dictionary's** - a dictionary tag may be too coarse for the specific beat.

**Avoid**:

- inventing synonyms for existing dictionary entries;
- inventing batch-internal tags that only one storylet uses;
- inventing tags whose meaning only the immediate authoring context can decode;
- encoding record ids, proper names, or local geography into the skill-level dictionary.

When in doubt, prefer the closest dictionary tag plus a more specific tag, rather than coining a single new tag that combines multiple registers.

## Convergence target

Across the pool's lifetime, target >=80% of `tone_tags` and `theme_tags` drawn from the combined dictionary available to the run. For worlds without a per-world dictionary, this skill-level file is the dictionary. For worlds with a per-world extension, aggregate distribution at two levels:

- family-level convergence from this skill-level dictionary, used to keep tone/theme diversity comparable across worlds;
- instance-level convergence from the per-world extension, used to keep local vocabulary stable inside that world or story bundle.

The remaining <=20% can be batch-specific or storylet-specific tags that capture registers neither dictionary covers yet. When the <=20% buffer regularly exceeds 20% in practice, revise the relevant dictionary layer - convergence failure is a dictionary-coverage gap, not a tag-discipline failure.
