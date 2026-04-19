# Phase 0: Normalize Brief + Author Reality Construction

## Phase 0a: Brief Normalization

Parse `brief_path`. Extract the 7 HARD inputs and 8 SOFT inputs. For each HARD input unresolved after parsing: run a targeted gap-filler interview (one question per unresolved HARD input, in priority order: `artifact_type`, `date`, `place`, `author` identity, `audience`, `communicative_purpose`, `desired_relation_to_truth`). Abort Phase 0 if any HARD input remains unresolved after interview.

For each SOFT input unresolved after parsing:
- `canon_facts_accessible` → default to derivation from the author's Phase 0b epistemic horizon. Note in `notes`: "canon_facts_accessible derived from author epistemic horizon."
- `taboo_censorship_conditions` → default to author's ideological environment + `INSTITUTIONS.md` taboo system. Note in `notes`: "taboo_censorship_conditions derived from author ideological environment + INSTITUTIONS.md."
- Remaining SOFT inputs → unspecified is acceptable; recorded as `null` in frontmatter.

Bind each HARD input to specific world entities: `date` → a point/era in `TIMELINE.md`; `place` → a `GEOGRAPHY.md` region/settlement; `audience` → an `INSTITUTIONS.md` stratum, `EVERYDAY_LIFE.md` demographic, or `PEOPLES_AND_SPECIES.md` cluster; `communicative_purpose` → a function legible within the world's genre contract (legitimize / warn / memorialize / instruct / accuse / propitiate / narrate / contest). An input bound to "the public" is not bound; a `charter-era temple laity` is bound.

**Local-scope settlement naming**: If the brief specifies a settlement (city, town, village) absent from `GEOGRAPHY.md`, check `OPEN_QUESTIONS.md` §Place and Polity Naming. If settlement naming is deferred there for local resolution (standard for most worldloom worlds at genesis), bind the new settlement-name to the nearest-matching `GEOGRAPHY.md` climate/culture band — for example, "Brinewick, a sprawling canal-fed city in the Temperate Canal Heartland band" — record the local-scope resolution in frontmatter `notes`, and treat it as Phase 7d.1-permitted local-scope naming. No larger-scope canon is created by the artifact. If `OPEN_QUESTIONS.md` does NOT defer settlement naming (a rare case in mature worlds with committed place rosters), abort to user interview.

**Title generation when absent**: If the brief omits a title, generate one consistent with Phase 2's genre conventions (journal-byline form for travelogues; liturgical incipit for sermons; issuing-body formula for decrees; inscription-formula for funerary objects; entry-head practical-register for herbals and manuals; etc.) AND Phase 0b's author voice register. Record `title` in frontmatter. Operator-invented titles are permitted at Phase 0 close; the slug derives from the invented title via Pre-flight step 8's kebab-case rule. Prefer a short-form slug (5–8 words max) drawn from the title's headline portion; do not include subtitles in the slug.

**Conditional world-file load**: load `MAGIC_OR_TECH_SYSTEMS.md` per the trigger conditions in `references/preflight-and-prerequisites.md` § Selectively loaded.

## Phase 0b: Author Reality Construction

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
