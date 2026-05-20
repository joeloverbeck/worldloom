# Phases 6–9: Seed Generation, Character Engine, Epistemic Filter, Voice

## Phase 6: Generate Proposal Seeds

Generate 3X–5X seeds before selection. Draw from the 16 baseline high-yield families:

1. institution insider
2. institution dissenter
3. ordinary-life witness
4. boundary broker
5. taboo technician
6. gatekeeper
7. black-market adapter
8. pressure enforcer
9. pressure sufferer with unusual clarity
10. archive-memory carrier
11. ideological misinterpreter
12. regional mirror
13. species-body specialist
14. artifact-native author
15. historical residue carrier
16. scale bridge

Each seed is tagged with `diagnosis_target` (which Phase 5 probe it addresses), `proposal_family`, `depth_class_hint`, `story_scale_hint`.

**Rule**: Prefer seeds that reveal existing world pressure over seeds that merely add eccentricity.

Also generate mutation directions from the shared protagonist-grade families when they are world-valid and inside user taboo limits:

1. self-mythologizer
2. shame-defender
3. corrupted caretaker
4. sincere fanatic
5. failed prodigy
6. beloved institutional monster
7. pathetic gatekeeper
8. bodily taboo carrier
9. erotic or status transgressor
10. impossible witness
11. humiliated expert
12. dangerous innocent
13. obsolete loyalist
14. contaminating saint

These are mutation prompts, not surface archetypes. Each candidate still needs Rule 2 grounding in a modeled pressure and may not become "special" without cost, bottleneck, secrecy, taboo, distribution limit, or institutional mechanism.

**Floor semantics**: The 3X–5X count is a PRE-MERGE floor — the raw seed-generation output before Phase 6 pre-shortlist merges (redundant-candidate consolidation), Phase 7–9 engine rejections, Phase 10 canon-gate rejections, or Phase 12 trigger rejections reduce the active shortlist. If the post-rejection shortlist at Phase 11 entry falls below 3X (but at or above X — the requested batch size), continue; the max-min selection operates on the reduced shortlist without regeneration. Loop back to Phase 6 for regeneration ONLY if the post-rejection shortlist falls below X itself (cannot fill the requested batch size) OR if the remaining candidates fail to cover the Phase 13 composition slots adequately (empty slots must be diagnostic signals, not forced fills).

## Phase 7: Build Character Engine per Seed

Load `.claude/skills/_shared-references/protagonist-grade-character-engine.md` before building the engine. For each seed, specify the canonical `protagonist_grade_engine` block:

- `world_produced_wound`
- `active_appetite`
- `self_mythology`
- `irreconcilable_contradiction`
- `pressure_behavior` with `cornered`, `tempted`, `humiliated`, `offered_power`, `protecting_attachment`
- `relational_charge[]` entries with `target_or_relation_type`, `need`, `resentment_or_fear`, `likely_harm_or_betrayal`
- `moral_psychological_edge`
- `signature_scene_behaviors[]`
- `voice_under_pressure`
- `cannot_be_swapped_out_because`

Preserve the old engine information by consolidating it into the shared block:

- `private_appetite` -> `active_appetite`
- `private_shame` -> `world_produced_wound` plus `self_mythology`
- `central_contradiction` -> `irreconcilable_contradiction`
- `public_mask` -> `self_mythology` and `voice_under_pressure`
- `external_pressure` / `unavoidable_obligation` -> `pressure_behavior`
- `relation_to_law_taboo_debt` -> `relational_charge` and `moral_psychological_edge`
- `repeated_forced_choice` -> `irreconcilable_contradiction` plus `pressure_behavior`

Keep these working notes per seed even when the final NCP card records the consolidated engine: `short_term_goal`, `long_term_desire`, `unavoidable_obligation`, `external_pressure`, `capability_path`, `cost_of_competence`, and `repeated_forced_choice`.

**Forced-Choice Rule**: Every strong proposal must answer "What choice does this person get forced into again and again by the world?" Draw from:

- duty-vs-appetite
- loyalty-vs-evidence
- kinship-vs-law
- purity-vs-survival
- ambition-vs-bodily-limit
- profit-vs-contamination
- belief-vs-observed-reality
- local-belonging-vs-mobility
- secrecy-vs-intimacy

Or name a world-specific tension from `WORLD_KERNEL.md` core pressures.

**Rule**: A proposal without repeatable choice pressure and a populated protagonist-grade engine is a biography fragment, not a character niche.

**FOUNDATIONS cross-refs**: Rule 2 (world-produced pressures); Rule 3 (`capability_path` has `cost_of_competence`); World Kernel §Core Pressures.

## Phase 8: Build Epistemic and Perceptual Filter

Define per seed:

- `known_firsthand` / `known_by_rumor` / `cannot_know` / `wrongly_believes`
- `vocabulary_for_major_phenomena`
- `missing_categories`
- `notices_first` / `scans_for_under_stress` / `consistently_overlooks`
- `shame-trade-training-trauma-visibility`
- `body-species-sensory-emphasis`

**Rule**: "Notices first" and "overlooks" arise from body, work, fear, and environment — never random flavor.

**Rule (Rule 7 first gate)**: No item in `known_firsthand` or `wrongly_believes` may match any MR entry's `disallowed cheap answers`. This is the cheap early catch before the formal Phase 10b firewall.

**Mandatory critic pass**: Epistemic / Focalization Critic.

**FOUNDATIONS cross-ref**: Rule 7 (first of two enforcement points; Phase 10b is the formal-audit point).

## Phase 9: Build Voice Signature

Define per seed across five levels:

1. **Social language** — class / region / age-generation / profession-jargon / religious-ideological / politeness / honorific / swearing logic.
2. **Idiolect** — favorite words / sentence shapes / compression-vs-ramble / assertive-vs-hedged / literal-vs-figurative / clipped-vs-musical / interruption / repair / pacing.
3. **Metaphor sources** — which domains the character draws from (weather / animals / ritual / machinery / bureaucracy / farming / trade / sickness / warfare / family / navigation / craft labor) AND which never appear AND which words/ideas are avoided on purpose.
4. **Pressure speech** — how they sound lying / persuading / threatening / teaching / begging / grieving / hiding-ignorance / performing-status / writing-formally / writing-privately.
5. **Oral / written split** — if literate, distinguish speech-voice / formal-writing / intimate-prayer / public-testimony.

**Voice Rules**: no accent-spelling as primary differentiator; no writer-voice across all characters; no catchphrase-only voice.

**Mandatory voice tests per seed**: swap test / motive test / mode test / quote test / artifact-author test.

**Rule**: No two final proposals share the same voice family unless deliberate contrast within the same institution or kin group is the explicit point.

**Mandatory critic passes**: Sociolinguistic Voice Critic + Artifact Authorship Critic.

**FOUNDATIONS cross-ref**: World Kernel §Tonal Contract.
