---
name: character-generation
description: "Use when generating a character situated inside an existing worldloom world — protagonist, side character, faction leader, townsfolk, scholar, cultist, mercenary, laborer, or narrator for diegetic artifacts. Produces: a character dossier at worlds/<world-slug>/characters/<char-slug>.md (hybrid YAML frontmatter + markdown prose) plus an auto-updated characters/INDEX.md. Mutates: only worlds/<world-slug>/characters/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, MYSTERY_RESERVE.md, OPEN_QUESTIONS.md) is unreadable."
    required: true
  - name: character_brief_path
    description: "Path to a markdown file containing the required inputs (current_location, place_of_origin, date, species, age band, social position, profession, kinship situation, religious/ideological environment, major local pressures, intended narrative role) and optional inputs (central contradiction, desired emotional tone, desired arc type, taboo/limit themes to avoid). If place_of_origin is unspecified, it defaults to current_location; it may be recorded as 'deliberately withheld' when origin is non-narratively-active. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Character Generation

Generates a character dossier situated inside an existing worldloom world: reads the world's kernel, invariants, peoples, geography, institutions, economy, everyday life, timeline, canon ledger, and mystery reserve; produces a persistent character file whose abilities, beliefs, and knowledge are provably consistent with the loaded canon, with an explicit Mystery Reserve firewall preventing forbidden-answer leakage.

<HARD-GATE>
Do NOT write any file — character dossier, INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, and no character dossier already exists at worlds/<world-slug>/characters/<char-slug>.md; (b) Phase 7 Canon Safety Check passes with zero unrepaired violations across invariant conformance, mystery-reserve firewall, and distribution/scope conformance; (c) Phase 8 Validation and Rejection Tests pass with zero failures; (d) the user has explicitly approved the Phase 9 deliverable summary (full dossier + Canon Safety Check trace + repair sub-passes that fired + target write paths). This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify all 13 mandatory
                  files readable — docs/FOUNDATIONS.md + 12 world files;
                  allocate next CHAR-NNNN; check <char-slug>.md absent;
                  load all 13 mandatory files)
      |
      v
Phase 0: Normalize Character Brief (parse character_brief_path OR interview;
          detect whether MAGIC_OR_TECH_SYSTEMS.md must be selectively loaded;
          bind required inputs to world entities — current_location +
          optional place_of_origin -> GEOGRAPHY regions,
          species -> PEOPLES_AND_SPECIES cluster, profession -> INSTITUTIONS link)
      |
      v
Phase 1: Material Reality          (food, shelter, injuries, possessions,
                                    access, mobility, debts, embodiment, climate)
      |
      v
Phase 2: Institutional Embedding   (family, law, religion, employer, military,
                                    debt, taboos, literacy, inheritance)
      |
      v
Phase 3: Epistemic Position        (known firsthand / by rumor / cannot know /
                                    wrongly believes; vocabulary; missing categories)
      |
      v
Phase 4: Goal and Pressure         (short-term goal, long-term desire,
         Construction                obligation, social fear, private shame,
                                    external pressure, internal contradiction)
      |
      v
Phase 5: Capability Validation     (per skill: how learned / cost / teacher /
                                    unusual-or-ordinary / body-class-place shape)
      |
      v
Phase 6: Voice and Perception      (metaphors, education, rhythm, taboo words,
                                    noticing patterns, species/body perception)
      |
      v
Phase 7: Canon Safety Check
         7a: Invariant conformance          (vs INVARIANTS.md)
         7b: Mystery Reserve firewall       (vs MYSTERY_RESERVE.md; explicit list)
         7c: Distribution/scope conformance (vs CANON_LEDGER.md distribution blocks)
         --any fail--> Phase 7d Repair Sub-Pass
                       (narrow / rescope / reclassify as rumor / add cost
                        / --unrepairable--> loop to Phase 0)
      |
      v
Phase 8: Validation and Rejection Tests
         --any fail--> loop to responsible phase
      |
    pass
      |
      v
Phase 9: Commit (HARD-GATE approval --> atomic write of
          worlds/<slug>/characters/<char-slug>.md
          + worlds/<slug>/characters/INDEX.md update)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, and no dossier exists at the target character slug.

### Optional
- `character_brief_path` — filesystem path — markdown brief containing the required inputs (current_location, place_of_origin, date, species, age band, social position, profession, kinship situation, religious/ideological environment, major local pressures, intended narrative role) and optional inputs (central contradiction, desired emotional tone, desired arc type, taboo/limit themes to avoid). If `place_of_origin` is unspecified, it defaults to `current_location` or may be recorded as "deliberately withheld" in `notes` when origin is non-narratively-active. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

- **Character dossier** at `worlds/<world-slug>/characters/<char-slug>.md` — hybrid YAML frontmatter (structured lookups: `character_id`, `slug`, `name`, `species`, `age_band`, `place_of_origin`, `current_location`, `date`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, `world_consistency`, `source_basis`, `notes`) + markdown body (prose sections: Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace). Matches `templates/character-dossier.md`.
- **INDEX.md update** at `worlds/<world-slug>/characters/INDEX.md` — one line per character in the form `- [<name>](<slug>.md) — <age_band> <species> <social_position> / <profession>, <current_location>`, re-sorted alphabetically by slug on every write. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. No Canon Fact Record emitted. No Change Log Entry emitted. If the user later wants to canonize a specific NPC at the world level, that is a separate `canon-addition` run.

## World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

### Mandatory — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Rule 2 at Phases 1/2/5; Rule 3 at Phase 5; Rule 4 at Phase 7c; Rule 7 at Phase 7b; Canon Layers at Phase 7; Ontology Categories at Phase 5).
- `worlds/<world-slug>/WORLD_KERNEL.md` — genre/tonal/chronotope contract (Phase 0 input validation against world identity; Phase 6 voice register calibration).
- `worlds/<world-slug>/INVARIANTS.md` — Phase 7a invariant conformance (every capability, belief, and knowledge claim tested).
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 5 capability classification (each skill attaches to declared ontology categories).
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 1 embodiment (body plan, diet, senses, vulnerability, lifespan, social density) + Phase 6 species/body perception effects.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 1 material reality (terrain, climate, choke points, disease ecologies, food baselines → body, food, mobility, injury profile).
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 2 institutional embedding (family, law, religion, employer, military, guild, landholding, education, recordkeeping — the proposal's structural anchor).
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 1 (food, possessions, access restrictions, debts) + Phase 2 (employer/guild/lord relations).
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 1 + Phase 3 (the ordinary-life backdrop this character inhabits or departs from; vocabulary/categories available to ordinary people in this region/class/species cluster).
- `worlds/<world-slug>/TIMELINE.md` — Phase 3 (what history the character lived through or learned about; what residues remain in their region).
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 5 (capability facts and their `distribution` blocks) + Phase 7c (distribution/scope conformance check). **Note on mature worlds**: this file may exceed the Read tool's token limit. Prescribed pattern when it does: grep for `^id:` (or equivalent CF-index marker) to enumerate CF IDs, then Read by line-range for the CFs relevant to the character's capabilities and brief. Do not attempt a single full Read when the size warning triggers — selective reading is the expected mode once enough CFs accumulate.
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 7b firewall (non-negotiable — each entry's `disallowed cheap answers` and `what is unknown` blocks are the literal test material).
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 3 (so the character does not "know" things the world has deliberately not yet decided).

### Selectively loaded
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 5, loaded only if Phase 0 detects the character's inputs or generated capabilities touch magical or technological systems. Skipped otherwise to avoid context bloat on ordinary-laborer characters.

### Pre-flight
- `worlds/<world-slug>/characters/` directory listing — for `CHAR-NNNN` allocation and slug-collision check. Read `INDEX.md` if present. Directory created at Phase 9 commit time if absent.
- `character_brief_path` contents (if provided) — read once at Phase 0.

### Abort conditions
- `worlds/<world-slug>/` missing → abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- Any of the 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) missing or unreadable → abort naming the specific file.
- `worlds/<world-slug>/characters/<char-slug>.md` already exists → abort: "Character slug collision — supply a different in-world name. This skill never overwrites an existing dossier."

## Pre-flight Check

1. Verify `worlds/<world-slug>/` exists. If absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
2. Verify all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) listed in World-State Prerequisites are readable. If any is missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` into working context.
4. Load the 12 mandatory world files.
5. Scan `worlds/<world-slug>/characters/` for the highest existing `CHAR-NNNN` by grepping `^character_id:` across dossier frontmatters (filenames encode slugs, not IDs, so a grep over dossier files is required — directory listing alone is not sufficient). Allocate `next_char_id = highest + 1`. If the directory does not exist or contains no dossiers, `next_char_id = CHAR-0001`.
6. Derive `<char-slug>` from the character's intended in-world name (kebab-case, lowercase, punctuation-stripped). If the character name is not yet known, defer slug derivation to the end of Phase 0.
7. If `worlds/<world-slug>/characters/<char-slug>.md` already exists, abort: "Character slug collision — supply a different in-world name. This skill never overwrites an existing dossier."

## Phase 0: Normalize Character Brief

Parse `character_brief_path` if provided; otherwise interview the user. Extract:

**Required inputs** (abort Phase 0 if any remain unresolved after interview):
- `current_location` — bound to a specific region or settlement in `GEOGRAPHY.md`; where the character is at the dossier's recorded `date`
- `place_of_origin` — bound to a `GEOGRAPHY.md` region or settlement. If unspecified in the brief, defaults to `current_location`; may be recorded as "deliberately withheld" in the dossier `notes` when origin is a non-narratively-active element (e.g., a character who has severed ties with their origin town and treats it as outside the narrative)
- `date` — resolved against the world's chronotope and `TIMELINE.md`
- `species` — bound to a cluster in `PEOPLES_AND_SPECIES.md`
- `age_band` — free-form but must be plausible for the species's lifespan per PEOPLES
- `social_position` — bound to an institutional stratum in `INSTITUTIONS.md`
- `profession` / livelihood — bound to an institution or trade in `INSTITUTIONS.md` / `ECONOMY_AND_RESOURCES.md`
- `kinship_situation` — per the kinship logic in `INSTITUTIONS.md` (family/clan/household) and `EVERYDAY_LIFE.md` (ordinary kinship norms)
- `religious_ideological_environment` — bound to an institution, cult, or folk practice named in `INSTITUTIONS.md` or `EVERYDAY_LIFE.md`
- `major_local_pressures` — cross-referenced against `GEOGRAPHY.md` (ecological), `ECONOMY_AND_RESOURCES.md` (scarcity), `INSTITUTIONS.md` (political), and `TIMELINE.md` (historical residues)
- `intended_narrative_role` — free-form (protagonist / witness / antagonist / foil / narrator for diegetic artifact / background texture)

**Optional inputs** (recorded in dossier `notes` if provided):
- central contradiction
- desired emotional tone
- desired arc type
- taboo or limit themes to avoid

**Conditional world-file load**: if any declared input touches magical or technological capability (checked against `MAGIC_OR_TECH_SYSTEMS.md` system names, `ONTOLOGY.md` magic-practice / technology categories, or `CANON_LEDGER.md` capability CFs), load `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` into working context. Skip otherwise.

**Slug derivation** (if not yet done at Pre-flight): kebab-case the character's in-world name. Re-run the slug-collision check from Pre-flight step 7.

**Rule**: Never advance to Phase 1 with an unresolved required input or an input that cannot be bound to a specific entity in the loaded world files. A "generic farmer" cannot exist; "a third-generation bondmaid in the Marsh Courts" can.

**FOUNDATIONS cross-ref**: Tooling Recommendation (Phase 0 is the binding step between user intent and loaded world state — non-negotiable for every subsequent phase's coherence).

## Phase 1: Material Reality

Define the character's body-in-world, per the proposal's phase 0 enumeration:
- what this character eats (against regional food baselines in `GEOGRAPHY.md` and class-stratified diet in `EVERYDAY_LIFE.md`)
- where they sleep (housing per region/class in `EVERYDAY_LIFE.md`)
- what injures them most often (common injuries per class/region in `EVERYDAY_LIFE.md` + hazards in `GEOGRAPHY.md`)
- what they own (possessions plausible for their social position, per `ECONOMY_AND_RESOURCES.md`)
- what they cannot legally or materially access (restrictions per `INSTITUTIONS.md` law/guild + `ECONOMY_AND_RESOURCES.md` scarcity/distribution)
- how far they can travel (mobility range per chronotope in `WORLD_KERNEL.md` + transport infrastructure in `GEOGRAPHY.md` / `INSTITUTIONS.md`)
- what they owe and to whom (debt + obligation per `INSTITUTIONS.md` and `ECONOMY_AND_RESOURCES.md`)
- what bodily capacities or limits their species gives them (per `PEOPLES_AND_SPECIES.md` embodiment block)
- what local climate and terrain do to them (per `GEOGRAPHY.md`)

**Rule**: A character with no material reality is a floating point of view. Every fact in this phase must cite the specific loaded file and section (or named clause) that grounds it. Section-level citation suffices — line numbers are discouraged because they rot as world files evolve.

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) — this phase establishes that the character's body, food, shelter, and mobility are produced by the world's material constraints, not chosen as flavor.

## Phase 2: Institutional Embedding

Specify the character's relation to every institutional axis present in `INSTITUTIONS.md` (skip axes that do not apply in this region/class/species):
- family / clan / household
- law
- religious authority
- employer / guild / lord / state
- military obligation
- debt (routed from Phase 1 where relevant)
- local taboo system (per `INSTITUTIONS.md` or `EVERYDAY_LIFE.md`)
- literacy / schooling (per `EVERYDAY_LIFE.md` education access by class/region)
- inheritance (per the kinship logic in `INSTITUTIONS.md`)

**Rule** (from proposal): A character without institutional embedding is usually just a modern individual in costume.

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) — institutional relation is how worlds press on people; a character not pressed by institutions is cosmetic.

## Phase 3: Epistemic Position

Define, for this specific character at this specific date:
- what the character knows firsthand (witnessed, experienced, handled)
- what they know only by rumor (heard from neighbors, priests, travelers, merchants)
- what they cannot know (spatially, institutionally, or epistemically out of reach — cross-reference `OPEN_QUESTIONS.md` and any `MYSTERY_RESERVE.md` entries whose `what is unknown` block overlaps their epistemic surface)
- what they firmly believe but are wrong about (folk theories, propaganda, inherited superstitions — `INSTITUTIONS.md` religious/ideological blocks + `EVERYDAY_LIFE.md` common beliefs)
- what words they have for major world phenomena (their vocabulary, per `EVERYDAY_LIFE.md` language/slang by region/class)
- what categories they lack entirely (concepts foreign to their class/region/education)

**Rule**: The character's epistemic position is a firewall against later Rule 7 failures. If Phase 3 has them "knowing" anything listed in `MYSTERY_RESERVE.md`'s `disallowed cheap answers`, that must be caught here rather than at Phase 7b — the earlier the catch, the cheaper the repair.

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
- what did it cost? (time, money, body, social standing, exile, secrecy — per `ECONOMY_AND_RESOURCES.md` or `INSTITUTIONS.md` training access)
- who taught them? (named institution, guild, master, elder, or cult — or explicit "no one, they worked it out," with a stated cost for that self-teaching)
- what institution enabled or blocked this? (per `INSTITUTIONS.md`)
- why is this unusual or ordinary? (against `EVERYDAY_LIFE.md` baseline for their region/class/species)
- how do body, class, and place shape competence? (per `PEOPLES_AND_SPECIES.md` embodiment + `GEOGRAPHY.md` regional effects)

Cross-reference every capability against `CANON_LEDGER.md` — if a capability matches an existing CF's `who_can_do_it`, verify the character fits that group. If not, the capability must either be reclassified (to rumor, failed attempt, or folk imitation) or the character must have a Phase 2 institutional embedding that justifies the exception. Exceptions are recorded in `world_consistency.distribution_exceptions`. Record each CF-id consulted into `world_consistency.canon_facts_consulted` regardless of whether it produced an exception — the list is the audit trail of which ledger entries informed the capability check, accumulated across Phase 5 and Phase 7c.

**Rule** (from proposal): Reject characters whose abilities bypass the world model.

**FOUNDATIONS cross-refs**: Rule 3 (No Specialness Inflation) — every capability meets a stabilizer (cost, teacher, institutional access); Rule 4 (No Globalization by Accident) — capabilities conform to CF distribution blocks or justify exceptions. Rule 4's hard enforcement is at Phase 7c; Phase 5 is the first-pass check.

## Phase 6: Voice and Perception

Define:
- preferred metaphors (drawn from their labor, region, religion, or species-embodiment)
- education level (per Phase 2 literacy/schooling)
- rhythm of speech (formal / vernacular / terse / florid — per class/region/religion in `EVERYDAY_LIFE.md` language patterns)
- taboo words (what they will not say, and why — per `INSTITUTIONS.md` taboo system)
- what they notice first in a room (shaped by profession, fear, and embodiment — a reed-weaver sees fiber and damp; a priest sees ritual impurity)
- what they overlook (what their class/profession/ideology makes invisible to them)
- how their species/body affects perception (per `PEOPLES_AND_SPECIES.md` senses block)

**Rule**: Voice is a function of embedding. A character whose voice does not differ from another character in the same world but different class/region/species has failed this phase.

**FOUNDATIONS cross-ref**: World Kernel §Tonal Contract — Phase 6 is where the character's voice is calibrated against the world's tonal register (grim / comic / tragic / lyrical / pulp / mythic).

## Phase 7: Canon Safety Check

The three sub-phases are independent checks with independent failure modes. All three must be run; failure on any triggers Phase 7d Repair Sub-Pass.

### Phase 7a: Invariant Conformance

For every capability, belief, knowledge claim, material-reality fact, and perception trait generated in Phases 1-6, test against every invariant in `INVARIANTS.md`. For each invariant tested, record the result into `world_consistency.invariants_respected` as the invariant id.

Fail triggers (send to Phase 7d):
- direct violation of an ontological invariant (e.g., character "remembers a past life" in a no-resurrection world)
- violation of a causal invariant (e.g., character uses magic without any cost in a magic-always-exacts-a-cost world)
- violation of a distribution invariant (e.g., character has literacy in an elite-literacy world without an institutional embedding that grants it)
- violation of a social invariant (e.g., character holds a role their species/class is forbidden from in this world)
- violation of an aesthetic/thematic invariant (e.g., character's voice undermines the tonal contract — "clean heroism" in a heroism-is-costly world)

**Rule**: Never silently narrow or drop an invariant. A failed conformance goes to Phase 7d for repair, not to a quiet downgrade.

**FOUNDATIONS cross-ref**: Invariants §full schema — every invariant's `break conditions` and `revision difficulty` fields guide whether Phase 7d can repair or must loop to Phase 0.

### Phase 7b: Mystery Reserve Firewall

For every entry in `MYSTERY_RESERVE.md`, check whether its `what is unknown` block overlaps the character's `known_firsthand`, `known_by_rumor`, or `wrongly_believes` fields from Phase 3. **Record every checked entry's id into `world_consistency.mystery_reserve_firewall`, regardless of whether overlap was found** — the firewall list is a proof-of-check audit trail, not an overlap register. Document the overlap-or-no-overlap status per entry in the Canon Safety Check Trace prose.

For each entry where overlap IS found:

- the character MAY hold a folk-belief or rumor *about* the mystery (recorded in `known_by_rumor` or `wrongly_believes`). **Permitted content**: the MR entry's listed `common in-world interpretations` ARE allowed in these fields — they are contested-canon folk theories the world itself tracks. Only items in the MR entry's `disallowed cheap answers` list are forbidden.
- the character MUST NOT "know" the mystery's forbidden answer (i.e., no entry in `known_firsthand` or `wrongly_believes` may match any item in the mystery's `disallowed cheap answers` list).

Fail triggers (send to Phase 7d):
- character's `known_firsthand` contains content that answers a Mystery Reserve entry's `what is unknown`
- character's `wrongly_believes` contains a statement matching any `disallowed cheap answers` item (even as "they are wrong about it" — this still commits the forbidden answer to canon-adjacent text)

**Rule**: The firewall list is the audit trail. An empty `world_consistency.mystery_reserve_firewall` when `MYSTERY_RESERVE.md` has entries fails Phase 8 Test 5 — silent firewall means no firewall. Recording every checked entry (including no-overlap entries, with that status noted in the trace prose) is the only correct behavior.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — this sub-phase IS the Rule 7 audit point for canon-reading artifacts.

### Phase 7c: Distribution/Scope Conformance

For every capability listed in the character's `capabilities` block, look up matching Canon Fact Records in `CANON_LEDGER.md` (matching by type: capability / technology / magic practice / artifact). For each match:

- if the character belongs to a group named in `distribution.who_can_do_it`, pass.
- if the character belongs to a group named in `distribution.who_cannot_easily_do_it`, fail unless Phase 2 institutional embedding explicitly justifies the exception (e.g., "daughter of a smuggler initiated into the craft at age eight, against her clan's taboo"). Exceptions are recorded in `world_consistency.distribution_exceptions` with the form `<CF-id>: <justification citing Phase 2 embedding>`.
- if no CF covers the capability, the capability is at ordinary-person scope and passes, UNLESS `EVERYDAY_LIFE.md` establishes that ordinary people in this region/class/species do not have this capability — in which case, fail and route to Phase 7d.

Fail triggers (send to Phase 7d):
- character has a capability listed in a CF's `who_cannot_easily_do_it` without a justified exception.
- character has a capability that `EVERYDAY_LIFE.md` places outside their class/region/species baseline without a stated training or initiation path in Phase 5.
- distribution exception exists but does not cite a Phase 2 institutional embedding (hand-wave exception).

**Rule**: No capability may silently universalize. Every exception is traceable to a specific institutional embedding. Record each CF-id consulted at this sub-phase into `world_consistency.canon_facts_consulted` (continuing the accumulation begun at Phase 5); the list combines Phase 5 and Phase 7c consultations.

**FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident) — this sub-phase IS the Rule 4 hard gate for characters.

### Phase 7d: Repair Sub-Pass

If any of 7a/7b/7c fails, attempt repair in order of least destructive:
1. **Narrow the trait** — reduce capability scope, add bottlenecks, add costs.
2. **Reclassify the knowledge** — move a `known_firsthand` item to `known_by_rumor`, or move a `wrongly_believes` item to "holds no strong view."
3. **Add a stabilizer** — state why the exception does not universalize (secrecy, taboo, rare training, bodily cost, short window of access).
4. **Add institutional embedding** — retroactively bind the trait to a specific `INSTITUTIONS.md` entity that justifies the exception (must be plausible for Phase 2 relations, not invented from thin air).
5. **Loop back to Phase 0** — if no repair preserves the user's intent without violating canon, abort to Phase 0 and ask the user to revise the brief. The failure reason is surfaced verbatim.

Every repair applied is recorded in the dossier's `notes` field with the form `Phase 7d repair: <trait> — <repair type> — <justification>`.

**Rule**: Repairs must preserve the user's Phase 0 narrative intent wherever possible. A repair that strips the character of their dramatic function is equivalent to a loop-to-Phase-0.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation) — every applied stabilizer must name a concrete mechanism; "they just don't use it much" fails.

## Phase 8: Validation and Rejection Tests

Run all 9 tests below and record each as PASS / FAIL with a one-line rationale into the dossier's Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS.

1. **(Rule 2, Phase 0)** Every required input resolves to a specific named entity in a loaded world file — no "generic" bindings.
2. **(Rule 2, Phase 1)** Every material-reality fact in the dossier cites a loaded file and section (or named clause).
3. **(Rule 3, Phase 5)** Every capability has populated `how_learned`, `cost_to_acquire`, `teachers_institutions` (or explicit self-teaching with stated cost), `unusual_or_ordinary`, and `body_class_place_shape`. No hand-wave stabilizers.
4. **(Rule 4, Phase 7c)** Every capability either fits a matching CF's `who_can_do_it`, or has a `world_consistency.distribution_exceptions` entry citing a Phase 2 institutional embedding.
5. **(Rule 7, Phase 7b)** `world_consistency.mystery_reserve_firewall` lists every MYSTERY_RESERVE entry that was checked at Phase 7b (regardless of overlap), with the overlap-or-no-overlap status documented in the Canon Safety Check Trace prose. A non-empty MYSTERY_RESERVE with an empty firewall list fails this test — silent firewall means no firewall.
6. **(Rule 7, Phase 3 + Phase 7b)** The character's `known_firsthand` and `wrongly_believes` fields contain no content matching any MYSTERY_RESERVE `disallowed cheap answers` item.
7. **(Phase 7a)** `world_consistency.invariants_respected` lists every invariant tested against the character. No invariant may be silently skipped.
8. **(Phase 2 coverage)** Every institutional axis present in `INSTITUTIONS.md` for this region/class/species has a stated character relation in the dossier — even if the relation is "none, and here is why." No silent gaps.
9. **(Schema completeness)** No dossier field listed in `templates/character-dossier.md` is left as TODO, placeholder, or empty where the schema requires content.

Recording format per test (one row of the Canon Safety Check Trace section):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded trace is what the user reads at Phase 9 HARD-GATE; absent or undocumented validation breaks the audit trail.

## Phase 9: Commit

Present the deliverable summary to the user:
1. Full character dossier (frontmatter + markdown body)
2. Canon Safety Check Trace (9 test results with rationales)
3. Phase 7d repair sub-passes that fired (if any), each framed as "preserved: <user intent> / sacrificed: <what was narrowed or reclassified>"
4. `world_consistency` audit fields: `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`
5. Target write paths: `worlds/<world-slug>/characters/<char-slug>.md` and `worlds/<world-slug>/characters/INDEX.md`

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and abort (no file written).

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity, and a deterministic order makes partial-state recovery tractable:

1. **Character dossier first**. Write `worlds/<world-slug>/characters/<char-slug>.md`. Set `source_basis.user_approved: true` immediately before this write — this is the moment of artifact commitment.
2. **INDEX.md second**. Read existing `worlds/<world-slug>/characters/INDEX.md` (create with header `# Characters — <World-Slug-TitleCased>` followed by one blank line if absent), append or replace the character's line in the form `- [<name>](<slug>.md) — <age_band> <species> <social_position> / <profession>, <current_location>`, re-sort alphabetically by slug, write back.

The "dossier-first" sequencing means a partial-failure state has a dossier without an index entry — easy to detect (grep INDEX.md for the slug). **Recovery is manual**, not automatic: because Pre-flight step 7 aborts on an existing dossier, re-running the skill with the same slug will NOT update the index. To recover, the operator must either (a) manually append the character's INDEX.md line in the format above, or (b) delete the orphaned dossier and re-run the skill from Phase 0 to regenerate both files. The inverse partial-failure state — an index entry pointing to a non-existent dossier — is harder to detect in future runs and requires the same manual approach (delete the orphaned index line, or create the missing dossier by hand).

Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 1 (every material-reality fact must cite a loaded file) + Phase 2 (institutional embedding required; "modern individual in costume" rejected) + Phase 5 (capabilities grounded in world mechanisms) + Phase 6 (voice shaped by embedding, not chosen as flavor) + Phase 8 Tests 1-2.
- **Rule 3: No Specialness Inflation** — Phase 5 (every capability has `how_learned` / `cost_to_acquire` / `teachers_institutions` / `unusual_or_ordinary` / `body_class_place_shape`) + Phase 7d (repair stabilizers must name concrete mechanisms — no "they just don't use it much") + Phase 8 Test 3.
- **Rule 4: No Globalization by Accident** — Phase 5 (first-pass CF distribution check) + Phase 7c (hard gate: every capability either fits `distribution.who_can_do_it` or has a Phase-2-embedded exception recorded in `world_consistency.distribution_exceptions`) + Phase 8 Tests 4 + 7.
- **Rule 7: Preserve Mystery Deliberately** — Phase 3 (epistemic position includes explicit `cannot know` and `wrongly believes` fields) + Phase 7b (firewall with explicit `world_consistency.mystery_reserve_firewall` audit list) + Phase 8 Tests 5-6 (empty firewall with non-empty Mystery Reserve fails; forbidden-answer leakage into `known_firsthand` or `wrongly_believes` fails).

## Record Schemas

- **Character Dossier** → `templates/character-dossier.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields: `character_id`, `slug`, `name`, `species`, `age_band`, `place_of_origin`, `current_location`, `date`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, `world_consistency` (with `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`), `source_basis` (with `world_slug`, `generated_date`, `user_approved`), `notes`. Markdown body sections: Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace.

No Canon Fact Record emitted. No Change Log Entry emitted. This skill does not mutate world-level canon.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | docs/FOUNDATIONS.md + 12 mandatory world files (13 files total) loaded before any phase; MAGIC_OR_TECH_SYSTEMS.md selectively loaded at Phase 0 based on input detection |
| Canon Layers §Hard / Soft / Contested | Phase 7 | Character beliefs classified against their source: hard canon in `known_firsthand` only if observably true; folk beliefs and propaganda routed to `known_by_rumor` or `wrongly_believes`; no character silently promotes contested canon to objective truth |
| Canon Layers §Mystery Reserve | Phase 7b | Explicit firewall with audit list in `world_consistency.mystery_reserve_firewall` |
| Invariants §full schema | Phase 7a | Every invariant tested; `break conditions` and `revision difficulty` fields guide Phase 7d repair paths |
| Ontology Categories | Phase 5 | Every capability attaches to declared ontology categories per `ONTOLOGY.md` |
| Rule 2 (No Pure Cosmetics) | Phases 1, 2, 5, 6, 8 | Material-reality citation requirement + institutional embedding + capability grounding + voice-from-embedding + Tests 1-2 |
| Rule 3 (No Specialness Inflation) | Phases 5, 7d, 8 | Stabilizer-required + no-hand-wave repairs + Test 3 |
| Rule 4 (No Globalization by Accident) | Phases 5, 7c, 8 | First-pass CF check + hard-gate distribution conformance + Tests 4 + 7 |
| Rule 7 (Preserve Mystery Deliberately) | Phases 3, 7b, 8 | Epistemic position with explicit cannot-know + firewall audit + Tests 5-6 |
| World Kernel §Core Pressures | Phase 4 | Character internal contradictions instantiate world core pressures at individual scale |
| World Kernel §Tonal Contract | Phase 6 | Voice calibrated to world tonal register |
| Change Control Policy | N/A | Not applicable — this skill is canon-reading; no Change Log Entry emitted. Future canonization of a specific NPC is handled by `canon-addition`, which emits the Change Log Entry there. |

## Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon files** — not `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. All writes are confined to `worlds/<world-slug>/characters/`.
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `character_brief_path`. Repo-root writes are forbidden.
- If a pre-flight `next_char_id` or `<char-slug>.md` would collide with an existing file, the skill aborts. Never overwrite an existing dossier. Character dossiers, once committed, are treated as existing state.
- This skill **proposes characters; it does not canonize them**. If the user later wants a specific NPC to become world-level hard canon (a named faction leader, a ruler whose existence is a fact the world tracks), that is a separate `canon-addition` run whose proposal cites the existing dossier. The character's existence is *not* hard canon merely by virtue of a dossier existing.
- Phase 3 and Phase 7b are the two Rule 7 enforcement points. If a future maintainer adds a phase between them that exposes the character to Mystery Reserve content, that phase must either extend the firewall audit or be explicitly classified as out-of-scope for Rule 7 (documented in `notes`).
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root (so `worlds/<slug>/characters/` is under the worktree, not the main repo).
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/characters/` until Phase 7 Canon Safety Check passes clean, Phase 8 validation tests pass clean, AND the user approves the Phase 9 deliverable summary. Auto Mode does not override this — skill invocation is not deliverable approval.

## Final Rule

A character dossier is not committed until every capability has a stabilizer, every belief has a provenance, every piece of forbidden-answer knowledge has been firewalled, every institutional axis has a stated relation, and the user has approved the complete deliverable — and once committed, the dossier is treated as existing character state that this skill will refuse to overwrite.
