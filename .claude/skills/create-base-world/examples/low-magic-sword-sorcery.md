# Example: Low-Magic Sword & Sorcery World

Shows the two user-visible surfaces of `create-base-world`: (1) a `premise_path` file the user prepares, (2) the normalized design brief Phase 0 produces from it. Phases 1–16 are automated internally and are not reproduced here.

---

## Input: premise_path contents

The user invokes:

```
/create-base-world "Ashen Dunes" ./briefs/ashen-dunes.md
```

Where `./briefs/ashen-dunes.md` contains:

```markdown
# Ashen Dunes — premise brief

## Premise
I want a low-magic, sword & sorcery fantasy world populated by humans
and many sentient animal-humanoids. Civilization is fragmented — no
empire has ever unified the continent, and the great city-states
rise and fall in generations rather than centuries.

## Genre
Sword & sorcery. Not epic destiny fantasy.

## Target mood / tone
Grim but not grimdark. Hard-bitten, sardonic, working-class. Heroes
are unreliable. Wonder is rare and unsettling when it appears.

## Realism vs mythic
Lived experience is realistic — bodies get tired, wounds fester,
winters kill. Cosmology can be mythic in the deep background.

## Intended use case
Anthology world — short fiction and possibly an RPG setting.

## Exclusions / dislikes
- No chosen-one destiny plots
- No magical schools or academies
- No gods acting directly on the world stage
- No sentient monster races that are just humans in a funny skin

## Inspirations
Howard's Hyborian Age. Leiber's Lankhmar. Gemmell's Drenai at their
least heroic. Wolfe's Book of the New Sun for ruin-depth.

## Anti-inspirations
Tolkien. D&D default settings. Anything where magic is treated as
a solved profession.

## Desired mystery level
High. I want questions the world never fully answers.

## Ethical red lines
No slavery played for laughs. No sexual violence as set dressing.
Species differences should not map cleanly to real-world race politics.
```

---

## Output: Phase 0 normalized design brief

Phase 0 produces this structured brief before advancing to Phase 1. Later phases cite it.

```yaml
world_name: "Ashen Dunes"
world_slug: "ashen-dunes"

genre_identity:
  primary: sword_and_sorcery
  not: [epic_fantasy, chosen_one_narrative, high_fantasy]

implied_baseline_reality:
  lived_experience: realistic
  cosmology: mythic_permitted_in_background
  civilization_scale: fragmented_city_states

intended_ontological_departures:
  - multiple_sentient_species_as_ordinary_world_structure
  - low_magic_present_but_rare_and_unsettling
  - gods_may_exist_but_act_only_indirectly

power_fantasy_level: low
  rationale: "heroes are unreliable, wonder is rare, sardonic working-class tone"

social_density: high
  rationale: "anthology world needs many populated niches to sustain short fiction"

violence_level: high
  rationale: "grim but not grimdark; hard-bitten register"

cosmological_scale:
  deep_time: vast
  lived_scale: local_and_provincial
  ruin_depth: deep

likely_focal_conflicts:
  - frontier_contact_between_species
  - prejudice_and_integration
  - trade_across_fragmented_polities
  - bodily_difference_and_uneven_civilization
  - memory_of_fallen_city_states

user_excitement_signals:
  - sentient_animal_humanoids_treated_as_ordinary
  - deep_ruin_time_a_la_wolfe
  - howard_leiber_gemmell_tonal_register

user_prohibitions:
  narrative_structure:
    - no_chosen_one_destinies
    - no_magical_schools_or_academies
  ontological:
    - no_gods_acting_directly
    - no_monster_races_that_are_humans_in_a_funny_skin
  ethical_red_lines:
    - no_slavery_played_for_laughs
    - no_sexual_violence_as_set_dressing
    - species_difference_must_not_map_cleanly_to_real_world_race_politics

intended_use_case: anthology_world
  secondary: rpg_setting

inspirations:
  tonal: [howard_hyborian_age, leiber_lankhmar, gemmell_drenai_least_heroic]
  structural: [wolfe_book_of_the_new_sun_for_ruin_depth]

anti_inspirations: [tolkien, dnd_default_settings]

desired_mystery_level: high
  rationale: "user explicitly wants questions the world never fully answers — feeds Phase 13 Mystery Reserve aggressively"

implied_derived_commitments:
  - magic_must_not_trivialize_ordinary_danger   # from premise + tonal register
  - civilization_must_be_structurally_fragmented # from premise
  - extraordinary_capabilities_must_be_civilization_poor  # from sword_and_sorcery + low_magic
  - the_past_must_be_legible_in_ruins           # from Wolfe inspiration + ruin_depth
```

---

## Why Phase 0 matters

Later phases read this brief like a contract:

- **Phase 3 (Invariants)** will enforce `no_gods_acting_directly` as an *ontological invariant* and `magic_must_not_trivialize_ordinary_danger` as a *causal invariant*.
- **Phase 5 (Ontological Systems)** will refuse any species design that reduces to "humans in a funny skin" (user prohibition + Rule 2).
- **Phase 11 (Equilibrium Explanation)** will be asked to justify why the continent has remained fragmented — a derived commitment the brief elevated.
- **Phase 13 (Mystery Reserve)** will be pushed toward the "high" end — more forbidden mysteries, deeper ruin-depth questions.
- **Phase 15 (Validation)** will reject any species that ended up cosmetic, any magic without cost, any geography that fails to force fragmentation.

A thin or vague brief will produce a thin Phase 0 extraction, which will fail Phase 15 downstream. Writing the brief well is leverage.
