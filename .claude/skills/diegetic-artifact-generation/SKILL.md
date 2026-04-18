---
name: diegetic-artifact-generation
description: "Use when generating an in-world text or artifact situated inside an existing worldloom world — chronicle, sermon, travelogue, herbal, cult tract, legal decree, funerary inscription, manual, letter, folk tale, fragmentary myth, prison confession, scholarly dispute, battle song, or any other diegetic text whose author, date, place, audience, and relation to truth are world-embedded. Produces: a diegetic artifact file at worlds/<world-slug>/diegetic-artifacts/<da-slug>.md (hybrid YAML frontmatter + markdown body) plus an auto-updated diegetic-artifacts/INDEX.md. Mutates: only worlds/<world-slug>/diegetic-artifacts/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, MYSTERY_RESERVE.md, OPEN_QUESTIONS.md) is unreadable."
    required: true
  - name: brief_path
    description: "Path to a markdown brief (typically under briefs/, but any path is accepted) containing the artifact's required inputs: artifact_type, date, place, author identity, audience, communicative_purpose, desired_relation_to_truth. Optional inputs: canon_facts_accessible (defaults to author's derived epistemic horizon), taboo_censorship_conditions (defaults to author's ideological environment + INSTITUTIONS taboos), desired_length, emotional_tone, rhetorical_style, ornament_level, mystery_seeding_intent, contradiction_target. Phase 0 runs a targeted gap-filler if any HARD input is unresolved; SOFT inputs are defaulted-and-noted."
    required: true
  - name: character_path
    description: "Optional path to an existing character dossier (e.g., worlds/animalia/characters/vespera-nightwhisper.md). If provided, Phase 0 lifts Author Reality Construction fields from the dossier's frontmatter and prose body, filling any gaps via world-state-consistent generation. If absent, Phase 0 generates a world-embedded author from scratch using the brief + loaded world files. Pre-flight verifies the path resolves inside worlds/<world-slug>/characters/ — cross-world or out-of-tree author references are rejected."
    required: false
---

# Diegetic Artifact Generation

Generates an in-world text or artifact situated inside an existing worldloom world: reads the world's kernel, invariants, institutions, everyday life, canon ledger, and mystery reserve; constructs a world-embedded author (lifted from an optional character dossier or generated from brief + world state); produces a persistent artifact file whose claims, voice, texture, and knowledge are provably consistent with the loaded canon, with an explicit Mystery Reserve firewall preventing accidental resolution of protected mysteries.

<HARD-GATE>
Do NOT write any file — artifact file or INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, and no artifact file already exists at worlds/<world-slug>/diegetic-artifacts/<da-slug>.md; (b) Phase 7 Canon Safety Check passes with zero unrepaired violations across invariant conformance, mystery-reserve firewall, distribution/scope conformance, and the diegetic-specific checks (no silent canon creation, no restricted-knowledge leakage to the wrong narrator, no local-as-global overgeneralization unless the author would plausibly make that mistake, no untagged intentional contradiction); (c) Phase 8 Validation and Rejection Tests pass with zero failures; (d) the user has explicitly approved the Phase 9 deliverable summary (full artifact frontmatter + artifact body text + Canon Safety Check trace + repair sub-passes that fired + target write paths). This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify all 13 mandatory
                  files readable — docs/FOUNDATIONS.md + 12 world files;
                  allocate next DA-NNNN; check <da-slug>.md absent;
                  load all 13 mandatory files + the skill's frontmatter
                  template; read brief_path; read character_path if provided)
      |
      v
Phase 0: Normalize Brief + Author Reality Construction
          (parse brief; classify HARD/SOFT input resolution;
           interview on unresolved HARD inputs; default-and-note SOFT;
           lift Author from character_path if provided, glean gaps from
           dossier + world state; else generate world-embedded Author
           from brief + world state;
           detect whether MAGIC_OR_TECH_SYSTEMS.md must be selectively loaded;
           bind author to INSTITUTIONS / PEOPLES / GEOGRAPHY entities)
      |
      v
Phase 1: Epistemic Horizon          (author's known firsthand / inferable /
                                     secondhand / wrong / concealable /
                                     impossible-to-verify — tagged per claim)
      |
      v
Phase 2: Genre Convention Pass      (apply artifact_type's in-world conventions;
                                     select genre-appropriate voice scaffolding)
      |
      v
Phase 3: Claim Selection            (build claim list; tag each with canon truth
                                     status / narrator believed status / source /
                                     contradiction risk / direct-implied-symbolic)
      |
      v
Phase 4: Material and Social        (embed in world texture: local measurements,
         Texture                     proper names, food, tools, honorifics, legal
                                     phrases, body metaphors, writing surfaces,
                                     calendrical markers, class-marker diction)
      |
      v
Phase 5: Bias and Distortion Pass   (author's omissions, overstatements,
                                     moralizations, unthinkables, audience-shaped
                                     pressures, institutions to flatter or fear)
      |
      v
Phase 6: Draft Artifact Text        (compose the artifact body honoring Phases
                                     1-5 — the text as it would exist in-world)
      |
      v
Phase 7: Canon Safety Check
         7a: Invariant conformance          (vs INVARIANTS.md)
         7b: Mystery Reserve firewall       (vs MYSTERY_RESERVE.md; explicit list)
         7c: Distribution/scope conformance (vs CANON_LEDGER.md; author access +
                                             claim scope)
         7d: Diegetic Safety Sub-Check      (no silent canon creation, no
                                             restricted-knowledge leakage, no
                                             local-as-global, no untagged
                                             contradiction)
         7e: Truth Discipline Sub-Check     (World-Truth + Narrator-Truth)
         --any fail--> Phase 7f Repair Sub-Pass
                       (retag / rescope / move / remove / add embedding /
                        --unrepairable--> loop to Phase 0)
      |
      v
Phase 8: Validation and Rejection Tests (11 tests)
         --any fail--> loop to responsible phase
      |
    pass
      |
      v
Phase 9: Commit (HARD-GATE approval --> atomic write of
          worlds/<slug>/diegetic-artifacts/<da-slug>.md
          + worlds/<slug>/diegetic-artifacts/INDEX.md update)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, and no artifact exists at the derived target slug.
- `brief_path` — filesystem path — markdown brief specifying the artifact's **HARD inputs** (`artifact_type`, `date`, `place`, `author`, `audience`, `communicative_purpose`, `desired_relation_to_truth`) and optionally its **SOFT inputs** (`canon_facts_accessible`, `taboo_censorship_conditions`, `desired_length`, `emotional_tone`, `rhetorical_style`, `ornament_level`, `mystery_seeding_intent`, `contradiction_target`). Phase 0 aborts if any HARD input remains unresolved after targeted gap-filler. SOFT inputs are defaulted-and-noted: `canon_facts_accessible` derives from the author's epistemic horizon (profession + institution + place + date); `taboo_censorship_conditions` derives from the author's ideological environment + `INSTITUTIONS.md` taboo system.

### Optional
- `character_path` — filesystem path — existing character dossier. If provided, Phase 0 lifts Author Reality Construction fields from the dossier's frontmatter (`species`, `age_band`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`) and prose body (literacy level, political dependency, bodily limits, mobility, archive access, rumor access, speech register, blind spots — mined from Institutional Embedding, Epistemic Position, Voice and Perception sections). Gaps are filled by gleaning from the loaded world state, not invented freely. If absent, Phase 0 generates a world-embedded author from scratch. Pre-flight verifies the path resolves inside `worlds/<world-slug>/characters/` — cross-world or out-of-tree author references are rejected.

## Output

- **Diegetic artifact file** at `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` — hybrid YAML frontmatter + markdown body.
  - **Frontmatter fields** (the authoritative schema is `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` — the field names and shapes in the Phase 9 write MUST match the template exactly): `artifact_id` (DA-NNNN), `slug`, `title`, `artifact_type`, `author`, `author_character_id` (CHAR-NNNN if `character_path` was used; else null), `date`, `place`, `audience`, `communicative_purpose`, `desired_relation_to_truth`, the 8 SOFT-input frontmatter fields (`canon_facts_accessible`, `taboo_censorship_conditions`, `desired_length`, `emotional_tone`, `rhetorical_style`, `ornament_level`, `mystery_seeding_intent`, `contradiction_target` — null is acceptable when unspecified; derivation source recorded in `notes` when defaulted), `genre_conventions` (`honors`, `breaks`), `author_profile` (the 15 Phase 0b fields: `species`, `age_band`, `sex_or_gender`, `class`, `literacy`, `profession`, `religious_ideological_environment`, `political_dependency`, `bodily_limits`, `mobility`, `archive_access`, `rumor_access`, `speech_register`, `likely_blind_spots`, `trauma_history_if_relevant` — the last two nullable when not narratively relevant, nullity must be deliberate), `epistemic_horizon` (`direct_knowledge`, `inferred_knowledge`, `secondhand_knowledge`, `wrongly_believed`, `concealable`, `impossible_knowledge`), `claim_map` (list of `{claim, canon_status, narrator_belief, source, contradiction_risk, mode, cf_id, mr_id, repair_trace}`), `canon_links` (list of CF-ids the artifact touches), `cannot_know` (explicit list of MR entries and CAU-3-style restricted items this narrator cannot know), `world_consistency` (`canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`), `source_basis` (`world_slug`, `brief_path`, `character_path` or null, `generated_date`, `user_approved`), `notes`.
  - **Markdown body sections**: the **artifact text itself** (the in-world content, in the author's voice, with Phase 5 distortions baked in — NOT annotated), followed by a Canon Safety Check Trace section (Phase 7a-7e results + Phase 8 test results). Clearly demarcated — trace is for the maintainer, not the in-world reader. Matches `templates/diegetic-artifact.md`.

- **INDEX.md update** at `worlds/<world-slug>/diegetic-artifacts/INDEX.md` — one line per artifact: `- [<title>](<slug>.md) — <artifact_type>, <date>, <author>, <place>`, re-sorted alphabetically by slug on every write. Created if absent with header `# Diegetic Artifacts — <World-Slug-TitleCased>` + blank line.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. **No Canon Fact Record emitted. No Change Log Entry emitted.** The artifact's claims are *contested canon* (FOUNDATIONS §Canon Layers) at their strongest — an in-world voice, not a world-level truth. If the user later wants a claim from the artifact canonized at the world level, that is a separate `canon-addition` run whose proposal may cite the artifact by DA-id.

## World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

### Mandatory — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Canon Layers at Phase 3 claim-status tagging; Rule 2 at Phase 4 texture; Rule 4 at Phase 7c; Rule 7 at Phases 1, 3, 7b; Canon Fact Record Schema at Phase 3 canon_status binding).
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 2 genre-convention calibration against world tonal contract; Phase 6 voice register; Phase 7e truth-discipline.
- `worlds/<world-slug>/INVARIANTS.md` — Phase 7a invariant conformance (every claim in artifact body and claim_map tested; author's asserted capabilities and knowledge tested).
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 3 claim classification; Phase 7a invariant-type mapping.
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 0 author species binding; Phase 6 species-inflected voice; Phase 2 species-specific genre conventions.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 0 place binding; Phase 4 local texture; Phase 1 what the author could plausibly have travelled to and witnessed.
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 0 author institutional embedding; Phase 2 institutional-authorship conventions; Phase 5 "institution the author must flatter or fear"; Phase 7d diegetic-safety institutional-claim conformance.
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 0 author material dependencies; Phase 4 texture (prices, commodities, scarcity diction); Phase 1 livelihood-exposed knowledge.
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 1 author's epistemic surface; Phase 4 texture; Phase 3 common-knowledge baseline.
- `worlds/<world-slug>/TIMELINE.md` — Phase 0 date binding; Phase 1 lifetime-vs-inherited-tradition split; Phase 3 present-vs-historical-vs-legendary; Phase 7e narrator-truth chronology check.
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 3 claim_map canon_status tagging; Phase 7c distribution/scope conformance. **Note on mature worlds**: this file may exceed the Read tool's token limit. Prescribed pattern when it does: grep for `^id:` to enumerate CF IDs, then Read by line-range for the CFs relevant to the artifact's claims and the author's capabilities. Do not attempt a single full Read when the size warning triggers.
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 1 author `impossible_knowledge` derivation; Phase 7b firewall (non-negotiable — each entry's `disallowed cheap answers` and `what is unknown` blocks are the literal test material against artifact body, claim_map, and `wrongly_believed`).
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 1 (artifact does not "know" things the world has deliberately not yet decided); Phase 7d check that artifact does not silently resolve an open question by assertion.

### Selectively loaded
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 0, loaded only if the brief's `artifact_type` is magic-or-tech-adjacent (grimoire fragment, relic manual, alchemical treatise, ward-inscription commentary, technical specification) OR the author's profession/institution touches magical or technological systems OR the audience does OR claim selection at Phase 3 produces claims in those domains. Skipped otherwise to avoid context bloat on ordinary-register artifacts.

### Pre-flight
- `worlds/<world-slug>/diegetic-artifacts/` directory listing — for `DA-NNNN` allocation and slug-collision check. Read `INDEX.md` if present. Directory created at Phase 9 commit time if absent.
- `brief_path` contents — read once at Phase 0.
- `character_path` contents (if provided) — read once at Phase 0. Path must resolve inside `worlds/<world-slug>/characters/`; cross-world or out-of-tree paths are rejected.

### Abort conditions
- `worlds/<world-slug>/` missing → abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- Any of the 13 mandatory files missing or unreadable → abort naming the specific file.
- `brief_path` missing or unreadable → abort naming the path.
- `character_path` provided but outside `worlds/<world-slug>/characters/` → abort: "character_path must resolve inside the same world. Cross-world author references are rejected to prevent canon leakage."
- `character_path` provided but target dossier does not exist → abort naming the path.
- `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists → abort: "Artifact slug collision — supply a different title. This skill never overwrites an existing artifact."

## Pre-flight Check

1. Verify `worlds/<world-slug>/` exists. If absent, abort.
2. Verify all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) readable. If any missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` and `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` into working context. The template is the authoritative frontmatter schema — every field name and shape in the Phase 9 write MUST match it exactly. Reading the template here prevents schema drift at Phase 9.
4. Load the 12 mandatory world files.
5. Verify `brief_path` exists and is readable. Abort naming the path if not.
6. If `character_path` provided: verify it resolves inside `worlds/<world-slug>/characters/` AND the target dossier exists. Abort per the cross-world / missing-dossier rules.
7. Scan `worlds/<world-slug>/diegetic-artifacts/` for the highest existing `DA-NNNN` by grepping `^artifact_id:` across artifact frontmatters. Allocate `next_artifact_id = highest + 1`. If directory does not exist or contains no artifacts, `next_artifact_id = DA-0001`.
8. Parse `brief_path` for the artifact title. Derive `<da-slug>` (kebab-case, lowercase, punctuation-stripped). If title is not yet known from the brief, defer slug derivation to end of Phase 0.
9. If `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists, abort: "Artifact slug collision — supply a different title."

## Phase 0: Normalize Brief + Author Reality Construction

### 0a: Brief Normalization

Parse `brief_path`. Extract the 7 HARD inputs and 8 SOFT inputs. For each HARD input unresolved after parsing: run a targeted gap-filler interview (one question per unresolved HARD input, in priority order: `artifact_type`, `date`, `place`, `author` identity, `audience`, `communicative_purpose`, `desired_relation_to_truth`). Abort Phase 0 if any HARD input remains unresolved after interview.

For each SOFT input unresolved after parsing:
- `canon_facts_accessible` → default to derivation from the author's Phase 0b epistemic horizon. Note in `notes`: "canon_facts_accessible derived from author epistemic horizon."
- `taboo_censorship_conditions` → default to author's ideological environment + `INSTITUTIONS.md` taboo system. Note in `notes`: "taboo_censorship_conditions derived from author ideological environment + INSTITUTIONS.md."
- Remaining SOFT inputs → unspecified is acceptable; recorded as `null` in frontmatter.

Bind each HARD input to specific world entities: `date` → a point/era in `TIMELINE.md`; `place` → a `GEOGRAPHY.md` region/settlement; `audience` → an `INSTITUTIONS.md` stratum, `EVERYDAY_LIFE.md` demographic, or `PEOPLES_AND_SPECIES.md` cluster; `communicative_purpose` → a function legible within the world's genre contract (legitimize / warn / memorialize / instruct / accuse / propitiate / narrate / contest). An input bound to "the public" is not bound; a `charter-era temple laity` is bound.

**Local-scope settlement naming**: If the brief specifies a settlement (city, town, village) absent from `GEOGRAPHY.md`, check `OPEN_QUESTIONS.md` §Place and Polity Naming. If settlement naming is deferred there for local resolution (standard for most worldloom worlds at genesis), bind the new settlement-name to the nearest-matching `GEOGRAPHY.md` climate/culture band — for example, "Brinewick, a sprawling canal-fed city in the Temperate Canal Heartland band" — record the local-scope resolution in frontmatter `notes`, and treat it as Phase 7d.1-permitted local-scope naming. No larger-scope canon is created by the artifact. If `OPEN_QUESTIONS.md` does NOT defer settlement naming (a rare case in mature worlds with committed place rosters), abort to user interview.

**Title generation when absent**: If the brief omits a title, generate one consistent with Phase 2's genre conventions (journal-byline form for travelogues; liturgical incipit for sermons; issuing-body formula for decrees; inscription-formula for funerary objects; entry-head practical-register for herbals and manuals; etc.) AND Phase 0b's author voice register. Record `title` in frontmatter. Operator-invented titles are permitted at Phase 0 close; the slug derives from the invented title via Pre-flight step 8's kebab-case rule. Prefer a short-form slug (5–8 words max) drawn from the title's headline portion; do not include subtitles in the slug.

**Conditional world-file load**: load `MAGIC_OR_TECH_SYSTEMS.md` per the trigger conditions in World-State Prerequisites § Selectively loaded.

### 0b: Author Reality Construction

If `character_path` provided: lift the following fields from the dossier, in priority order (dossier → world-gleaning fallback for gaps):

| Author field | Source in dossier |
|---|---|
| species | frontmatter `species` |
| age_band | frontmatter `age_band` |
| sex/gender | prose body if stated, `notes` field, else null |
| class | frontmatter `social_position` |
| literacy | Institutional Embedding §Literacy / schooling |
| profession | frontmatter `profession` |
| religious_ideological_environment | frontmatter `religious_ideological_environment` |
| political_dependency | Institutional Embedding §Employer / guild / lord / state |
| bodily_limits | Material Reality (species embodiment + age + condition) |
| mobility | Material Reality §mobility |
| archive_access | Epistemic Position §known firsthand + §known by rumor |
| rumor_access | Epistemic Position §known by rumor |
| speech_register | Voice and Perception §rhythm of speech + §metaphors |
| likely_blind_spots | Voice and Perception §what they overlook |
| trauma_history_if_relevant | Contradictions and Tensions §private shame / central contradiction |

Record `author_character_id` in frontmatter.

**Chronology coherence (when artifact date differs from dossier-present)**: If the artifact date precedes or succeeds the character's dossier-present (the dossier typically captures a narrative-relevant moment; the artifact may be a letter, travelogue, chronicle, or testimony from an earlier or later point in the character's life), audit the dossier's life-events for temporal coherence — specifically: private-myth crises, formative incidents, named relationships, trauma markers, and institutional affiliations that may not yet exist or may be in a different state at artifact-date. The character dossier remains authoritative for events at its marked present; the artifact must not retroject later dossier facts into earlier character experience, nor invent earlier character capabilities that the dossier's life-history doesn't support. Record any chronology-fix (incident swapped for an earlier plausible analog; relationship framed as prior-stage; trauma marker absent because not yet acquired) in frontmatter `notes` under a "Chronology coherence" line.

If `character_path` NOT provided: generate each author field from brief + world state. Every generated field must cite the world file it sources from. "A temple-charter scholar" is not an author; "a third-generation cultist-turned-scribe in the Port Serekh temple charter, age 47, literate in trade-tongue and ritual script, dependent on the charter for patronage" is. Set `author_character_id: null`.

**Rule (from proposal Phase 0)**: No omniscient artifact authors unless the artifact itself is a divine or impossible object and the world permits that. If the brief specifies an impossible-object artifact, verify permission against `INVARIANTS.md` and `WORLD_KERNEL.md` — if the world's genre contract forbids divine voice, abort with "world does not permit impossible-object authorship; revise the artifact_type or the author."

**Slug derivation** (if not yet done at Pre-flight step 8): kebab-case the artifact title. Re-run the collision check.

**FOUNDATIONS cross-ref**: Tooling Recommendation (Phase 0 is the binding step — every subsequent phase depends on author + artifact being bound to world state).

## Phase 1: Epistemic Horizon

For the bound Author at the bound date/place, determine what they can:
- **know directly** (witnessed, experienced, handled — cross-reference `TIMELINE.md` events within lifetime; `GEOGRAPHY.md` places within mobility; `EVERYDAY_LIFE.md` practices within class/region/profession)
- **infer plausibly** (from training, literacy, access)
- **repeat secondhand** (rumor, sermon, merchant gossip, bardic transmission)
- **get wrong** (folk theories; inherited propaganda; professional blind spots — cross-reference `INSTITUTIONS.md` religious/ideological material, `EVERYDAY_LIFE.md` common beliefs)
- **intentionally conceal** (given `political_dependency`, `desired_relation_to_truth`, `taboo_censorship_conditions`)
- **never know** (cross-reference `MYSTERY_RESERVE.md` `what is unknown` blocks; `OPEN_QUESTIONS.md` items; CAU-3-style restricted vocabulary)

Each candidate claim for the artifact body must be tagged with ONE of these six statuses:
- `witnessed`
- `learned_from_authority`
- `inherited_tradition`
- `common_rumor`
- `contested_scholarship`
- `impossible_for_narrator_to_verify`

**Rule (from proposal)**: This phase prevents lore-dumping. A narrator who "knows" everything the author-Claude knows is an omniscient voice in costume.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — Phase 1's `never_know` list is the first Rule 7 enforcement point; Phase 7b is the audit gate.

## Phase 2: Genre Convention Pass

Apply the in-world conventions of the bound `artifact_type`. The proposal enumerates conventions for chronicle, sermon, travelogue, herbal, myth. For any artifact_type not in the proposal's enumeration, derive conventions from the world's own tradition:
- Which `INSTITUTIONS.md` bodies produce this artifact type (temple, guild, court, school, itinerant performer, prison, private correspondence)?
- What `EVERYDAY_LIFE.md` practices establish its conventional form (length, register, rhetorical moves, permitted topics, material support)?
- What tonal register does `WORLD_KERNEL.md` permit for this institutional producer (grim / comic / tragic / lyrical / pulp / mythic)?

Record conventions in frontmatter `genre_conventions` as a list of the specific moves this artifact will honor or deliberately break. A deliberate break must be justified in `notes` by the author's motive.

**Rule**: Conventions are constraints, not suggestions. An artifact that ignores its genre's conventional moves reads as anachronistic pastiche. An artifact that slavishly honors them reads as genre exercise. The craft is calibrated deviation.

**FOUNDATIONS cross-ref**: World Kernel §Tonal Contract.

## Phase 3: Claim Selection

Build the artifact's claim list. For each claim, record:

| Field | Values |
|---|---|
| `claim` | the assertion, in the author's voice (not paraphrased neutrally) |
| `canon_status` | `canonically_true` \| `canonically_false` \| `partially_true` \| `contested` \| `mystery_adjacent` \| `prohibited_for_this_artifact` |
| `narrator_belief` | `true` \| `false` \| `uncertain` \| `performed_belief` |
| `source` | one of the six Phase 1 tags |
| `contradiction_risk` | `none` \| `soft` \| `hard` |
| `mode` | `direct` \| `implied` \| `symbolic` |
| `cf_id` | singular CF-id string; required when `canon_status: canonically_true`; must resolve in `CANON_LEDGER.md`; null otherwise |
| `mr_id` | singular MR-id string; required when `canon_status: mystery_adjacent`; must resolve in `MYSTERY_RESERVE.md`; null otherwise |
| `repair_trace` | null by default; populated by Phase 7f with `{repair_type, reason}` when the claim is retagged, rescoped, moved, or removed |

Every claim with `canon_status: canonically_true` must populate `cf_id` with a CF-id from `CANON_LEDGER.md`. Every claim with `canon_status: mystery_adjacent` must populate `mr_id` with an MR-id from `MYSTERY_RESERVE.md`. Every claim repaired at Phase 7f must record the repair under `repair_trace`. Every claim tagged `prohibited_for_this_artifact` is **removed from the artifact body** — it stays in the record as an audit trail of what was considered and rejected.

**Rule (from proposal Phase 3)**: The `truth_status` taxonomy is the firewall against Rule 7 failures by commission. A claim that would resolve a mystery must be tagged `prohibited_for_this_artifact` here, not caught at Phase 7b.

**FOUNDATIONS cross-refs**: Canon Layers (each claim's `canon_status` maps to a layer); Canon Fact Record Schema (CF references must be real); Rule 7 (prohibited claims are pre-filtered, not post-filtered).

## Phase 4: Material and Social Texture

Embed the artifact in world texture. For the author's place + class + profession + era, select texture details from `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, and `PEOPLES_AND_SPECIES.md`:

- local measurements (currency, weight, distance, time — per the world's own units, not generic)
- proper names (places, persons, institutions, rituals — drawn from world files, not invented freely)
- food, weather, tools, animals
- ritual gestures, insults, honorifics, legal phrases
- body metaphors (inflected by author's species per `PEOPLES_AND_SPECIES.md`)
- architecture, writing surfaces, smells, stains, fabrics
- local calendrical markers
- class markers in diction

**Rule (from proposal)**: Do not add texture randomly. Texture should imply the world. Each texture element must cite its source file and the world-embedded reason it belongs.

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) — this phase IS the Rule 2 enforcement point for the artifact body.

## Phase 5: Bias and Distortion Pass

Apply the author's worldview pressure. For the bound Author, populate:
- **omissions**: what they won't mention
- **overstatements**: what they exaggerate
- **moralizations**: what they frame as good/bad
- **unthinkables**: what they cannot imagine otherwise
- **audience pressures**: what their audience expects, fears, rewards, punishes
- **institutional pressures**: which `INSTITUTIONS.md` body they must flatter or fear

These do not appear as editor's notes — they are **baked into the composition**. An omission is text-that-isn't-there; an overstatement is a phrase calibrated to the bias, not annotated; a moralization is a sentence the author writes believing it is true.

**Rule (from proposal)**: This is where the text becomes alive.

**FOUNDATIONS cross-refs**: Canon Layers §Contested Canon; World Kernel §Core Pressures.

## Phase 6: Draft Artifact Text

Compose the artifact body honoring Phases 1-5. The text as it would exist in-world — in the author's voice, in the genre's register, with Phase 4's texture embedded, Phase 5's distortions baked, and Phase 3's claims made (with prohibited claims absent).

The body must be **continuous in-world prose** (or continuous in-world verse / list / inscription / letter, as appropriate to the artifact_type). No editorial framing. No scare quotes around claims the narrator believes. No parenthetical "(this is of course false)" notes. The artifact IS the text — audit trails are for the frontmatter and the trace, not the body.

Length honors SOFT input `desired_length` if specified; otherwise a length natural to the artifact_type.

**Rule**: If the artifact body reads like a world-wiki summary, Phase 6 has failed. Diegetic texts are voices from within; they are not encyclopedia entries in disguise.

**FOUNDATIONS cross-ref**: Canon Layers §Contested Canon.

## Phase 7: Canon Safety Check

Five independent sub-checks. All must run; failure on any triggers Phase 7f Repair Sub-Pass.

### Phase 7a: Invariant Conformance

For every claim in the artifact body and `claim_map`, and every asserted capability or knowledge of the Author, test against every invariant in `INVARIANTS.md`. Record each tested invariant's id into `world_consistency.invariants_respected`.

Fail triggers (send to Phase 7f):
- an objective claim (i.e., `canon_status: canonically_true` or `partially_true` with a direct-assertion mode) that breaks an ontological / causal / distribution / social / aesthetic invariant.
- an Author capability or knowledge claim that breaks an invariant.

**Permitted**: a claim tagged `canonically_false` or `contested` may describe invariant-violating content — a false folk theory is valid diegetic material because the world tracks it as a false belief. The invariant is broken when the narrator is *right and world-level-objective* about something the world forbids, not when the narrator is merely wrong.

**Also permitted (narrator-register performance)**: a narrator writing in a register a thematic invariant permits but discourages from mainstream application is NOT an invariant breach when tagged as performer-inflation. Worked example: AES-1 (heroism paid in coin and scars, not glory) explicitly permits the *existence* of romanticizing war-songs but marks them as sung mostly by those who never fought. An ambitious veteran writing romantic war-prose for audience-attraction is therefore exercising a permitted-but-discouraged register, not breaching AES-1 — provided each self-inflating claim in the body is tagged in `claim_map` as `canon_status: partially_true` with `narrator_belief: true` or `performed_belief`. The same pattern applies to other thematic invariants: a narrator mystifying an ordinary job in a low-magic world (AES-3-register performer-inflation of contested wonder), a narrator performing devotion in a performatively pious register (religious-invariant register performance), etc. Tag the inflation and the invariant holds; leave it untagged and Phase 7d.4 (no untagged intentional contradiction) fails.

### Phase 7b: Mystery Reserve Firewall

For every entry in `MYSTERY_RESERVE.md`, check overlap with the artifact body + `claim_map` + `epistemic_horizon.direct_knowledge` + `epistemic_horizon.inferred_knowledge` + `epistemic_horizon.wrongly_believed`. **Record every checked entry's id into `world_consistency.mystery_reserve_firewall`, regardless of overlap** — the firewall list is a proof-of-check audit trail.

For each entry where overlap IS found:
- the artifact MAY reference the mystery's `common in-world interpretations` (contested-canon folk theories the world itself tracks).
- the artifact MUST NOT assert, even as narrator error, any item from the mystery's `disallowed cheap answers`. A narrator holding a forbidden answer as `wrongly_believed` is still a commitment of the forbidden answer to text and fails this check.

Fail triggers (send to Phase 7f):
- artifact body contains a sentence that answers an MR entry's `what is unknown`.
- `claim_map` contains a claim whose content matches a `disallowed cheap answers` item, at any `narrator_belief` value.
- `epistemic_horizon.wrongly_believed` contains a `disallowed cheap answers` item.

### Phase 7c: Distribution/Scope Conformance

For every capability the artifact attributes to its Author, look up matching CFs in `CANON_LEDGER.md`. Apply the three-case rule:
- Author fits `distribution.who_can_do_it` → pass.
- Author fits `distribution.who_cannot_easily_do_it` → fail unless Phase 0b institutional embedding justifies the exception (recorded in `world_consistency.distribution_exceptions`).
- No matching CF → pass at ordinary-person scope, UNLESS `EVERYDAY_LIFE.md` places the capability outside the Author's class/region/species baseline without Phase 0b training path.

For every **world-fact claim** in the artifact body that carries a distribution block in the matching CF:
- the Author must have plausible access to that fact per Phase 1 `archive_access` / `rumor_access` — a claim's `source` tag must be consistent with the CF's distribution.
- an artifact cannot *assert* as `direct` / `canonically_true` a fact whose CF places the author outside `who_can_do_it`. The author may assert it as `secondhand` / `partially_true` / `contested` — distribution applies to *access*, not to *speaking about*.

Record each CF-id consulted into `world_consistency.canon_facts_consulted`.

### Phase 7d: Diegetic Safety Sub-Check

Four rules lifted from proposal Phase 7:

1. **No silent canon creation**: the artifact body must not introduce named entities, places, institutions, rituals, or facts absent from the loaded world files UNLESS they are bounded to the author's personal scope (e.g., a named grandmother in a letter; a local tavern nickname in a travelogue). Larger-scope silent introductions (a new god, a new polity, a new ritual-system, a new species cluster) fail this check.
2. **No restricted-knowledge leakage**: restricted vocabulary (e.g., guild-internal ward-inscription terms under CAU-3-style invariants) must not appear in the artifact body unless Phase 0b gave the Author institutional access to it.
3. **No local-as-global by accident**: a local custom stated in soft-canon scope must not be asserted as universal, UNLESS the Author would plausibly make that mistake given their mobility and epistemic horizon. If so, the overgeneralization is tagged `narrator_belief: true, canon_status: partially_true` in `claim_map` and permitted. An unmarked overgeneralization fails.
4. **No untagged intentional contradiction**: if the artifact deliberately contradicts current canon (e.g., propaganda asserting a king is divine in a no-divine-rulers world), the contradiction must be tagged in `claim_map` with `canon_status: canonically_false, narrator_belief: performed_belief` or `true`. An unmarked contradiction fails.

Fail triggers → Phase 7f. Each trigger names which of the four rules failed.

### Phase 7e: Truth Discipline Sub-Check

Two tests from proposal Phase 6:

1. **World-Truth Check**: does any claim with `mode: direct` and `canon_status: canonically_true` correspond to a CF in `CANON_LEDGER.md`? If a direct-assertion claim is tagged `canonically_true` but cites no CF, it is either untagged canon-creation (routes to 7d.1) or a miscategorization (routes to re-tagging).
2. **Narrator-Truth Check**: given Author + date + place + audience, would this person plausibly *say* each claim the way it appears? A sentence's register, vocabulary, and rhetorical move must be reachable from the Author's Phase 0b profile.

Fail triggers → Phase 7f.

### Phase 7f: Repair Sub-Pass

If any of 7a/7b/7c/7d/7e fails, attempt repair in order of least destructive:
1. **Retag the claim** — move a `mode: direct` to `mode: implied` or `symbolic`; move `canonically_true` to `partially_true` or `contested`; move `narrator_belief: true` to `performed_belief` for propagandistic texts.
2. **Rescope the claim** — narrow a universal assertion to the author's local scope.
3. **Move the claim to another field** — a forbidden `direct_knowledge` item may move to `secondhand_knowledge` with a named source; a forbidden `wrongly_believed` item may be removed entirely.
4. **Remove the claim** — strip the sentence; record in `claim_map` as `prohibited_for_this_artifact` with the repair reason.
5. **Add institutional embedding to the Author** — if a capability exception is needed and a plausible institution exists, retroactively bind the Author to it. Must be plausible for Phase 0b, not invented from thin air.
6. **Loop back to Phase 0** — if no repair preserves the brief's intent without canon violation, abort to Phase 0 and ask the user to revise the brief.

Every repair applied is recorded in `notes` with the form `Phase 7f repair: <claim or field> — <repair type> — <justification>`.

**Rule**: Repairs preserve the brief's `communicative_purpose` and `desired_relation_to_truth` wherever possible. A repair that strips the artifact's rhetorical function is equivalent to a loop-to-Phase-0.

## Phase 8: Validation and Rejection Tests

Run all 11 tests. Each recorded as PASS / FAIL with one-line rationale into Canon Safety Check Trace. Any FAIL halts and loops back to the originating phase.

1. **(Rule 2, Phase 0)** Every HARD input binds to a specific named world entity — no "generic" bindings. SOFT defaults explicitly noted.
2. **(Rule 2, Phase 4)** Every texture element in the artifact body cites its source file and world-embedded reason. No decorative texture.
3. **(Phase 0b)** Author Reality Construction has no null fields among the 15 mandatory author-profile fields (trauma_history_if_relevant and sex/gender may be null when not relevant, but the null must be deliberate).
4. **(Phase 1)** Every candidate claim considered for the artifact has one of the six source tags. No untagged claims.
5. **(Rule 7, Phase 7b)** `world_consistency.mystery_reserve_firewall` lists every MR entry checked, overlap or not. Empty firewall list when MYSTERY_RESERVE has entries fails.
6. **(Rule 7, Phase 3 + 7b)** Artifact body, `claim_map`, and `epistemic_horizon.wrongly_believed` contain no content matching any MR `disallowed cheap answers` item.
7. **(Phase 7a)** `world_consistency.invariants_respected` lists every invariant tested. No invariant silently skipped.
8. **(Rule 4, Phase 7c)** Every attributed Author capability fits a matching CF's `who_can_do_it` or has an entry in `world_consistency.distribution_exceptions` citing Phase 0b embedding. Every world-fact claim in the body respects its CF's distribution on access.
9. **(Phase 7d, 4 rules)** The four diegetic-safety rules each pass.
10. **(Phase 7e)** World-Truth and Narrator-Truth both pass.
11. **(Schema completeness)** No frontmatter field in `templates/diegetic-artifact.md` is left as TODO, placeholder, or empty where schema requires content. The markdown body contains a non-empty artifact text AND a populated Canon Safety Check Trace section.

Recording format per test:

```
- Test N (Rule R / Phase P / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL.

## Phase 9: Commit

Present deliverable summary:
1. Full frontmatter.
2. Artifact body text (the in-world text).
3. Canon Safety Check Trace (Phase 7a-7e results + Phase 8 11-test results with rationales).
4. Phase 7f repair sub-passes that fired (if any), each framed as "preserved: <brief intent> / sacrificed: <what was retagged, rescoped, moved, or removed>".
5. `world_consistency` audit fields: `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`.
6. Target write paths.

**HARD-GATE fires here**: no file is written until user explicitly approves. User may (a) approve, (b) request revisions (loop to named phase), (c) reject and abort.

On approval, write in order:
1. **Artifact file first**: `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md`. Set `source_basis.user_approved: true` immediately before this write.
2. **INDEX.md second**: Read existing `worlds/<world-slug>/diegetic-artifacts/INDEX.md` (create with header `# Diegetic Artifacts — <World-Slug-TitleCased>` + blank line if absent), append or replace this artifact's line in the form `- [<title>](<slug>.md) — <artifact_type>, <date>, <author>, <place>`, re-sort by slug, write back.

Partial-failure state (artifact written without index update) is detectable by grepping INDEX.md for the slug. Recovery is manual: operator either appends the INDEX line by hand, or deletes the orphaned artifact and re-runs the skill from Phase 0. Pre-flight step 9 aborts on an existing artifact file, so re-running with the same slug will NOT regenerate the index.

Report written paths.

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 0 (every HARD input must bind to a specific named world entity; "generic" bindings rejected) + Phase 4 (every texture element cites source file and world-embedded reason; decorative texture fails) + Phase 8 Tests 1 + 2. A diegetic artifact whose details could be dropped into any world has failed Rule 2.

- **Rule 3: No Specialness Inflation** — Phase 7c (Author capabilities that fit a CF's `who_cannot_easily_do_it` need a stabilizer-cited Phase 0b institutional embedding) + Phase 7f (repairs must name concrete mechanisms — "the author just happens to know the guild's inner vocabulary" fails). Enforcement is narrower than in `character-generation` because a diegetic artifact rarely declares long capability lists; fires mostly when artifact content presumes specialist Author access.

- **Rule 4: No Globalization by Accident** — Phase 7c (world-fact claims' CF distribution + Author access conformance; a claim cannot be asserted as direct + canonically_true by an author the CF places outside `who_can_do_it`) + Phase 7d.3 (no local-as-global UNLESS the author would plausibly make that mistake, in which case the overgeneralization is tagged and permitted) + Phase 8 Test 8. Rule 4 has two enforcement points — one on Author access, one on claim scope — because a text can fail Rule 4 two different ways.

- **Rule 7: Preserve Mystery Deliberately** — Phase 1 (`never_know` list derived from `MYSTERY_RESERVE.md` + `OPEN_QUESTIONS.md` + CAU-3-style restricted vocabulary) + Phase 3 (`prohibited_for_this_artifact` pre-filtering — Rule 7 enforced by commission prevention, not post-hoc detection) + Phase 7b (firewall audit against every MR entry, overlap or not; body + claim_map + three epistemic_horizon fields all tested) + Phase 8 Tests 5 + 6. This skill has more Rule 7 enforcement points than any other canon-reading skill because a text is the primary vector for forbidden-answer leakage. **Maintainer note**: Phases 1 / 3 / 7b are the three Rule 7 enforcement points; if a future phase is added that exposes the artifact to Mystery Reserve content, that phase must either extend the firewall audit or be explicitly classified out-of-scope in `notes`.

## Record Schemas

- **Diegetic Artifact File** → `templates/diegetic-artifact.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields listed in Output § Diegetic artifact file. Markdown body: the artifact text as in-world prose + a demarcated Canon Safety Check Trace section.

No Canon Fact Record and no Change Log Entry are emitted (rationale in Output § Diegetic artifact file). If the user later wants an artifact claim canonized, that runs through `canon-addition`, whose proposal may cite `DA-<id>` and a specific `claim_map` entry.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | docs/FOUNDATIONS.md + 12 mandatory world files + `templates/diegetic-artifact.md` loaded before any phase; MAGIC_OR_TECH_SYSTEMS.md selectively loaded at Phase 0 |
| Canon Layers §Hard / Soft / Contested | Phase 3 | Every claim tagged with `canon_status` mapping to a layer; `canonically_true` claims must cite a CF; `contested` claims are the artifact's natural register; `partially_true` is available for plausible author overgeneralizations |
| Canon Layers §Contested Canon | Output + Phase 6 | The artifact body is declared contested canon by class; "No canon-file mutations" paragraph states this inline so future readers cannot mistake artifact claims for world-level truth |
| Canon Layers §Mystery Reserve | Phases 1, 3, 7b | Never_know derivation + prohibited pre-filter + firewall audit; three-layer Rule 7 enforcement |
| Invariants §full schema | Phase 7a | Every invariant tested against artifact body and Author capabilities; invariant-breaking FALSE claims permitted (narrator error), invariant-breaking OBJECTIVE-DIRECT claims forbidden |
| Ontology Categories | Phase 3 | Every claim attaches to declared ontology categories so canon_status is resolvable against the ledger's typed facts |
| Canon Fact Record Schema | Phase 3, 7c | CF references in claim_map must resolve in CANON_LEDGER.md; CF distribution blocks are the literal test material at Phase 7c |
| Rule 2 (No Pure Cosmetics) | Phases 0, 4, 8 | Input binding + texture citation + Tests 1-2 |
| Rule 3 (No Specialness Inflation) | Phases 7c, 7f | Author capability exceptions need stabilizers; repair moves cannot hand-wave |
| Rule 4 (No Globalization by Accident) | Phases 7c, 7d.3, 8 | Author access distribution + claim scope enforcement + narrator-plausible overgeneralization gate + Test 8 |
| Rules 5, 6, and Change Control Policy | N/A | Not applicable — this is a canon-reading skill: no canon mutation (Rule 5 second-order consequences out-of-scope), no retcons (Rule 6, no Change Log Entry emitted), no Change Log Entries. Future canonization of an artifact claim runs through `canon-addition`, which handles consequence propagation, retcon discipline, and Change Log emission |
| Rule 7 (Preserve Mystery Deliberately) | Phases 1, 3, 7b, 8 | Never_know derivation + prohibited pre-filter + firewall audit + Tests 5-6 |
| World Kernel §Genre + Tonal Contract | Phases 2, 6 | Genre convention derivation tied to world-tradition institutions + voice calibration against tonal register |

## Guardrails

### Scope of operation
- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `brief_path` / `character_path`. Repo-root writes are forbidden. Writes are confined to `worlds/<world-slug>/diegetic-artifacts/`; the canon-file list this skill never writes to is in Output § Diegetic artifact file.
- This skill **never writes to the `characters/` sibling directory**. An artifact may reference an existing character (via `character_path`) but does not create, modify, or annotate character dossiers. If Phase 0b's author-generation reveals a character worth committing as a reusable dossier, that is a separate `character-generation` run whose input brief may cite the artifact.
- **Cross-world `character_path` is rejected at pre-flight.** A character from `worlds/foo/characters/` cannot author an artifact in `worlds/bar/`. Canon leakage across worlds is a pre-flight abort, not a runtime check.

### Artifact identity
- Never overwrites an existing artifact. Pre-flight collision aborts. Once committed, diegetic artifacts are treated as existing diegetic state.

### Process discipline
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root.
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.

## Final Rule

A diegetic artifact is not committed until the Author is bound to the world, every claim has a truth-status tag and a source provenance, every forbidden answer has been firewalled, every asserted capability or world-fact claim respects its Canon Fact Record's distribution, the text reads as a voice from within the world rather than an encyclopedia entry in disguise, and the user has approved the complete deliverable — and once committed, the artifact is treated as existing diegetic state that this skill will refuse to overwrite.
