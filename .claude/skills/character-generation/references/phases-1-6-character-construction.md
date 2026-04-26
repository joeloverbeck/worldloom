# Phases 1-6: Character Construction

These six phases build the character dossier from normalized inputs: material body, institutional embedding, epistemic position, goals and pressures, capabilities, and voice. Each phase cites the loaded world files it draws from and the FOUNDATIONS rule it enforces.

## Phase 1: Material Reality

Define the character's body-in-world, per the proposal's phase 0 enumeration:
- what this character eats (against regional food baselines in SEC-GEO records and class-stratified diet in SEC-ELF records)
- where they sleep (housing per region/class in SEC-ELF records)
- what injures them most often (common injuries per class/region in SEC-ELF + hazards in SEC-GEO)
- what they own (possessions plausible for their social position, per SEC-ECR records)
- what they cannot legally or materially access (restrictions per SEC-INS law/guild + SEC-ECR scarcity/distribution)
- how far they can travel (mobility range per chronotope in `WORLD_KERNEL.md` + transport infrastructure in SEC-GEO / SEC-INS)
- what they owe and to whom (debt + obligation per SEC-INS and SEC-ECR)
- what bodily capacities or limits their species gives them (per SEC-PAS embodiment blocks)
- what local climate and terrain do to them (per SEC-GEO)

**Rule**: A character with no material reality is a floating point of view. Every fact in this phase must cite the specific record (SEC-id, CF-id, ENT-id, or `WORLD_KERNEL.md` clause) that grounds it. Record-level citation suffices — line numbers are discouraged because YAML records evolve.

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) — this phase establishes that the character's body, food, shelter, and mobility are produced by the world's material constraints, not chosen as flavor.

## Phase 2: Institutional Embedding

Specify the character's relation to every institutional axis present in the SEC-INS records (skip axes that do not apply in this region/class/species):
- family / clan / household
- law
- religious authority
- employer / guild / lord / state
- military obligation
- debt (routed from Phase 1 where relevant)
- local taboo system (per SEC-INS or SEC-ELF)
- literacy / schooling (per SEC-ELF education access by class/region)
- inheritance (per the kinship logic in SEC-INS)

**Rule** (from proposal): A character without institutional embedding is usually just a modern individual in costume.

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) — institutional relation is how worlds press on people; a character not pressed by institutions is cosmetic.

## Phase 3: Epistemic Position

Define, for this specific character at this specific date:
- what the character knows firsthand (witnessed, experienced, handled)
- what they know only by rumor (heard from neighbors, priests, travelers, merchants)
- what they cannot know (spatially, institutionally, or epistemically out of reach — cross-reference OQ-NNNN records and any M-NNNN records whose `what_is_unknown` block overlaps their epistemic surface)
- what they firmly believe but are wrong about (folk theories, propaganda, inherited superstitions — SEC-INS religious/ideological blocks + SEC-ELF common beliefs)
- what words they have for major world phenomena (their vocabulary, per SEC-ELF language/slang by region/class)
- what categories they lack entirely (concepts foreign to their class/region/education)

**Rule**: The character's epistemic position is a firewall against later Rule 7 failures. If Phase 3 has them "knowing" anything listed in any M-NNNN record's `disallowed_cheap_answers`, that must be caught here rather than at Phase 7b — the earlier the catch, the cheaper the repair.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — Phase 3 is the first of two Rule 7 enforcement points; Phase 7b is the second (audit-and-firewall).

## Phase 4: Goal and Pressure Construction

Generate for the character:
- short-term goal (scope: days to months)
- long-term desire (scope: years to lifetime)
- unavoidable obligation (institutional, familial, ritual, or material)
- social fear (what loss of status / exposure / rejection they most dread)
- private shame (what they would most want no one to know)
- external pressure (what the world is currently doing to them, per Phase 0 `major_local_pressures`)
- internal contradiction (duty vs appetite / ritual purity vs survival / species loyalty vs intimacy across species / fear of corruption vs relic profit / law vs kinship / ambition vs bodily limit / piety vs evidence / local identity vs imperial utility — draw from the proposal's rubric; extend with world-specific tensions from `WORLD_KERNEL.md` core pressures)

**Rule**: Pressures must be world-produced, not abstract. An "ambitious" character means nothing; "ambitious-despite-the-debt-seal-on-her-household" is pressure.

**FOUNDATIONS cross-ref**: World Kernel §Core Pressures — the character's tensions should instantiate the world's core pressures at individual scale.

## Phase 5: Capability Validation

For every skill, craft, knowledge, or ability declared in Phases 0-4 or added here, answer:
- how did they learn this? (self-taught / apprenticeship / family inheritance / institutional training / accident / initiation)
- what did it cost? (time, money, body, social standing, exile, secrecy — per SEC-ECR or SEC-INS training access)
- who taught them? (named institution, guild, master, elder, or cult — or explicit "no one, they worked it out," with a stated cost for that self-teaching)
- what institution enabled or blocked this? (per SEC-INS)
- why is this unusual or ordinary? (against SEC-ELF baseline for their region/class/species)
- how do body, class, and place shape competence? (per SEC-PAS embodiment + SEC-GEO regional effects)

Cross-reference every capability against the relevant capability CFs — retrieve via `mcp__worldloom__search_nodes(node_type='canon_fact', filters={domain: <capability domain>})` and `get_record(cf_id)` for each match. If a capability matches an existing CF's `distribution.who_can_do_it`, verify the character fits that group. If not, the capability must either be reclassified (to rumor, failed attempt, or folk imitation) or the character must have a Phase 2 institutional embedding that justifies the exception. Exceptions are recorded in `world_consistency.distribution_exceptions`. Record each CF-id consulted into `world_consistency.canon_facts_consulted` regardless of whether it produced an exception — the list is the audit trail of which CFs informed the capability check, accumulated across Phase 5 and Phase 7c.

**Rule** (from proposal): Reject characters whose abilities bypass the world model.

**FOUNDATIONS cross-refs**: Rule 3 (No Specialness Inflation) — every capability meets a stabilizer (cost, teacher, institutional access); Rule 4 (No Globalization by Accident) — capabilities conform to CF distribution blocks or justify exceptions. Rule 4's hard enforcement is at Phase 7c; Phase 5 is the first-pass check.

## Phase 6: Voice and Perception

Define:
- preferred metaphors (drawn from their labor, region, religion, or species-embodiment)
- education level (per Phase 2 literacy/schooling)
- rhythm of speech (formal / vernacular / terse / florid — per class/region/religion in SEC-ELF language patterns)
- taboo words (what they will not say, and why — per SEC-INS taboo system)
- what they notice first in a room (shaped by profession, fear, and embodiment — a reed-weaver sees fiber and damp; a priest sees ritual impurity)
- what they overlook (what their class/profession/ideology makes invisible to them)
- how their species/body affects perception (per SEC-PAS senses blocks)

**Rule**: Voice is a function of embedding. A character whose voice does not differ from another character in the same world but different class/region/species has failed this phase.

**FOUNDATIONS cross-ref**: World Kernel §Tonal Contract — Phase 6 is where the character's voice is calibrated against the world's tonal register (grim / comic / tragic / lyrical / pulp / mythic).
