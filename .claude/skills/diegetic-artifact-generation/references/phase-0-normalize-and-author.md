# Phase 0: Normalize Brief + Author Reality Construction

## Phase 0a: Brief Normalization

Parse `brief_path`. Extract the 7 HARD inputs and 8 SOFT inputs. For each HARD input unresolved after parsing: run a targeted gap-filler interview (one question per unresolved HARD input, in priority order: `artifact_type`, `date`, `place`, `author` identity, `audience`, `communicative_purpose`, `desired_relation_to_truth`). Abort Phase 0 if any HARD input remains unresolved after interview.

For each SOFT input unresolved after parsing:
- `canon_facts_accessible` → default to derivation from the author's Phase 0b epistemic horizon. Note in `notes`: "canon_facts_accessible derived from author epistemic horizon."
- `taboo_censorship_conditions` → default to author's ideological environment + SEC-INS taboo records. Note in `notes`: "taboo_censorship_conditions derived from author ideological environment + SEC-INS taboo records."
- Remaining SOFT inputs → unspecified is acceptable; recorded as `null` in frontmatter.

Bind each HARD input to specific world entities resolved through `find_named_entities` + `get_neighbors` against the context packet: `date` → a point / era / TIMELINE Layer in SEC-TML records; `place` → an ENT region or settlement bound to SEC-GEO; `audience` → a SEC-INS stratum, SEC-ELF demographic, or SEC-PAS cluster; `communicative_purpose` → a function legible within the world's genre contract (legitimize / warn / memorialize / instruct / accuse / propitiate / narrate / contest). An input bound to "the public" is not bound; a `charter-era temple laity` is bound.

**Local-scope settlement naming**: If the brief specifies a settlement (city, town, village) absent from the resolved ENT/SEC-GEO context, check the OQ records (`search_nodes(node_type='open_question_record', filters={topic: 'place_and_polity_naming'})` or scan packet OQs) for any "place and polity naming" deferrals. If settlement naming is deferred there for local resolution (standard for most worldloom worlds at genesis), bind the new settlement-name to the nearest-matching SEC-GEO climate/culture band — for example, "Brinewick, a sprawling canal-fed city in the Temperate Canal Heartland band" — record the local-scope resolution in frontmatter `notes`, and treat it as Phase 7d.1-permitted local-scope naming. No larger-scope canon is created by the artifact. If no OQ defers settlement naming (a rare case in mature worlds with committed place rosters), abort to user interview.

**Title generation when absent**: If the brief omits a title, generate one consistent with Phase 2's genre conventions (journal-byline form for travelogues; liturgical incipit for sermons; issuing-body formula for decrees; inscription-formula for funerary objects; entry-head practical-register for herbals and manuals; etc.) AND Phase 0b's author voice register. Record `title` in frontmatter. Operator-invented titles are permitted at Phase 0 close; the slug derives from the invented title per the kebab-case rule (lowercase, punctuation-stripped). Prefer a short-form slug (5–8 words max) drawn from the title's headline portion; do not include subtitles in the slug.

**Conditional packet expansion**: when the brief's `artifact_type` is magic-or-tech-adjacent, the author's profession/institution touches a magical or technological system, the audience does, or generated claims at Phase 3 produce claims in those domains, expand retrieval via `mcp__worldloom__search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` and `get_record(sec_id)` for each relevant SEC-MTS record. Skipped otherwise to avoid context bloat on ordinary-register artifacts.

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

**Back-projection math (when artifact age or era differs from dossier-present)**: When the brief specifies an age-band or era ("in her early thirties," "during his apprenticeship years," "the summer before the ordination") that differs from the dossier's marked present:

1. **Compute the delta explicitly**: brief-age minus dossier-age (e.g., "artifact-age 32, dossier-age 42, delta = 10 years before dossier-present") OR era-to-era gap (e.g., "artifact-date precedes dossier-present by ~15 years, placing it in late Layer 3 rather than Layer 4").
2. **Cross-reference TIMELINE layers against the delta**: if dossier-present anchors to a specific TIMELINE layer, work out which layer the delta lands in, naming adjacent transitions explicitly (e.g., "late Layer 3 Incident Wave / early Layer 4 transition"; "middle Layer 2 Charter Era, two generations before the Incident Wave opens").
3. **Name the delta in the frontmatter `date` field**: "approximately N years before CHAR-NNNN dossier-present" plus the TIMELINE-layer anchor. This makes the back-projection reconstructable for any future reader without requiring them to re-derive it from two files.
4. **Identify the network-and-events absences**: dossier-later events (operations, apprenticeships, relationship formations) that have not yet occurred at artifact-date; dossier-network members (mentors, apprentices, patrons, adversaries) not yet encountered at artifact-date; dossier-later adjustments (risk aversions, specialty retirements, contract refusals) not yet set in. Record these absences in frontmatter `notes` under "Chronology coherence" so the HARD-GATE deliverable exposes the back-projection reasoning.
5. **Cross-reference against the artifact's network footprint**: any named figure referenced in the artifact body that belongs to a dossier-network-member must pass the delta-gate (the figure's relationship-to-author must be consistent with the stage-at-artifact-date, not with the dossier-present stage).

If `character_path` NOT provided: generate each author field from brief + retrieved world state. Every generated field must cite the record-id it sources from (SEC-id, CF-id, ENT-id, M-id). "A temple-charter scholar" is not an author; "a third-generation cultist-turned-scribe in the Port Serekh temple charter, age 47, literate in trade-tongue and ritual script, dependent on the charter for patronage" is. Set `author_character_id: null`.

**Rule (from proposal Phase 0)**: No omniscient artifact authors unless the artifact itself is a divine or impossible object and the world permits that. If the brief specifies an impossible-object artifact, verify permission against the relevant INV records and `WORLD_KERNEL.md` — if the world's genre contract forbids divine voice, abort with "world does not permit impossible-object authorship; revise the artifact_type or the author."

**Slug derivation** (if not yet done at Pre-flight): kebab-case the artifact title. Re-run the collision check.

**FOUNDATIONS cross-ref**: Tooling Recommendation (Phase 0 is the binding step — every subsequent phase depends on author + artifact being bound to world state).

## Phase 0c: Cast Construction at Artifact Scope

The brief may reference named figures OTHER than the author — crew members, dead comrades, named officials, named witnesses, named victims, named adversaries, named recipients — without fully committing their number, identity, or characterization. These figures are author-personal-scope per Phase 7d.1 (the "No silent canon creation" rule's allowance for bounded personal-scope naming: grandmother in a letter, tavern-nickname in a travelogue, dead-comrade named for kin-of-record in an after-action report). They are NOT larger-scope canon; they do NOT create new institutions, species clusters, polities, or rituals.

Phase 0c commits these figures BEFORE draft composition so the HARD-GATE deliverable exposes them for user review, rather than surfacing them only after the full body is drafted.

### Sizing rule — track the brief's numerical anchors literally

- Explicit count: if the brief gives a number, use it.
- "A couple" → 2. "A handful" → 3–5. "Several" → 3–5. "A few" → 2–4. Choose the lower end unless the brief's texture (corridor-seasonal contract, siege-line muster, multi-faction summit) warrants higher.
- Unsized plurals ("other contractors," "the officials," "witnesses from the village") → choose the minimum plausible count consistent with the brief's event-logistics, plus one-line rationale recorded in frontmatter `notes` under "Cast construction."
- When an event's internal arithmetic requires specific counts (a bandit-camp fight, a summit, a duel, a shipwreck crew), work the count out from event-physics (attackers/defenders, chamber sizes, boat sizes, hall capacities, march-order spacing) and record the derivation in `notes`.

### Naming rule — author-personal-scope only

- Species assignments per SEC-PAS clusters (Cluster A / B / C / D proportions should match the artifact's place-and-era per SEC-GEO regional-asymmetry clauses and any DIS-N mythical-species-rare invariant).
- Institutional roles bound to SEC-INS terminology (magistrate's second, posting-clerk senior, senior hunter-officer, charter-defense clergy-witness) rather than inventing new titles. Titled roles are institutional-positions; the person filling them is author-personal-scope.
- Avoid proper-noun faction names, capitalized doctrinal titles, or any naming convention that would convert a bounded-scope figure into a larger-scope recurring entity.
- For dead figures named for kin-of-record or memorial purposes (ARRs, letters, funerary inscriptions), include species + kin-of-record-location (village, waterstation, household) at the minimum level needed for the artifact's procedural function — not biography.

### Record rule — expose the cast in frontmatter

Record each constructed figure in frontmatter `notes` under a "Cast construction" block naming:
- count (with derivation if inferred from brief-anchor),
- names (all author-personal-scope — no proper-noun larger-scope entities),
- species assignments (cluster + specific species per SEC-PAS records) and role/armament/profession bindings (per relevant CF and SEC-INS terminology),
- any notable narrative weight (who dies, who speaks, who witnesses, whose kin receives payout).

The HARD-GATE deliverable summary (Phase 9) exposes the full cast block so the user can review and course-correct before writes commit.

**Rule**: Cast construction is a Phase 0 commitment, not a Phase 6 draft-time improvisation. A cast member named for the first time in the body without a corresponding Phase 0c entry fails Phase 7d.1.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation — cast construction stays at ordinary-stratum unless the brief specifically asks otherwise); Rule 4 (No Globalization by Accident — named figures stay author-personal-scope, never drift into larger-scope canon).
