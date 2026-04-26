# Phases 1–2: Person Registry + Essence Profiles

## Phase 1: Build Canonical Person Registry

Construct a single registry of all person-like entities. For each entry track:

- `source_type` — `dossier` / `artifact-author` / `artifact-speaker` / `artifact-annotator` / `artifact-correspondent` / `artifact-scribe` / `artifact-censor` / `artifact-patron` / `artifact-copyist` / `historical-salient-PA` / `offstage-gravity`
- `occupancy_strength` — `hard` / `soft` / `ambient`
- `scope`
- `living_dead_mythologized_uncertain`
- `has_stable_voice_worldview_position`

Phase 1 sources: `characters/INDEX.md` + every dossier (frontmatter + body-section headers); `diegetic-artifacts/INDEX.md` + every artifact frontmatter (author / speaker / annotator / correspondent / scribe / censor / patron / copyist metadata; bodies are NOT loaded at Phase 1); `adjudications/PA-NNNN-accept*.md` frontmatter for historically-salient figures canonized via `canon-addition`. Use `find_named_entities` to surface registry-occupying personas the artifact frontmatter names if any are not already in the dossier set.

**Rule**: A sermon writer with a clear ideology, access pattern, and speech register occupies a niche even without a formal dossier. Registry inclusion is determined by narrative-gravity, not by file-existence.

**Mandatory critic pass**: Continuity Archivist (recorded in each card's `critic_pass_trace.phase_1_archivist`).

**FOUNDATIONS cross-ref**: Canon Layers §Soft / Contested — artifact-author personas are contested-canon voices; the registry tracks their position without promoting them to hard canon.

## Phase 2: Derive Existing Character Essence Profiles

For every registry entry, produce a 7-layer essence profile:

1. **world-position** — region / settlement / institution / household
2. **function** — what role they serve in the story-world economy of attention
3. **pressure** — what world pressure(s) they sit inside
4. **access** — who and what they can reach; what is closed to them
5. **epistemic** — what they can know vs cannot know
6. **thematic** — what they refract about the world
7. **voice** — social language / idiolect / metaphor sources

Plus per-entry metadata:

- `attention_weight` — `lead` / `recurring` / `local` / `historical` / `artifact-only`
- `depth_class` — `emblematic` / `elastic` / `round`
- `institutional_embedding_checklist` — household-kin-clan / law / religion / employer-guild-lord-state / debt / taboo / education-apprenticeship / inheritance / policing-violence
- `artifact_affordance` — what artifacts could plausibly bear their voice
- `likely_story_scale` — `intimate` / `local` / `regional` / `transregional`
- `nearest_mirrors_or_foils`

**Capability Validation per registry entry**: for each capability the dossier or artifact body asserts, record `how_learned` / `cost` / `enabling_institution` / `ordinary_or_unusual` / `bodily_or_species_constraints`.

For mature dossiers exceeding Read token limits, use selective-reading: grep `^## ` to locate body-section headers and `Read` with `offset`/`limit` for the four minimum sections (Institutional Embedding + Voice and Perception + Capabilities + Epistemic Position). Other sections load only if a specific Phase 4 nearest-occupant comparison requires deeper context.

**Rule**: Compare future proposals against formalized essence profiles only — never against vague impressions.

**Mandatory critic pass**: Character Essence Extractor.

**FOUNDATIONS cross-refs**: Rule 2 (institutional embedding checklist required); Ontology Categories — the essence profile attaches each registry entry to declared categories so Phase 7 capability classification can reuse the binding.
