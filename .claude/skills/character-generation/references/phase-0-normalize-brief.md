# Phase 0: Normalize Character Brief

Parse `character_brief_path` if provided; otherwise interview the user. Extract:

**Required inputs** (abort Phase 0 if any remain unresolved after interview):
- `current_location` — bound to a specific ENT-NNNN region or settlement (resolved via `find_named_entities` + `get_neighbors` against SEC-GEO context); where the character is at the dossier's recorded `date`
- `place_of_origin` — bound to an ENT region or settlement. Default-resolution test when the brief does not commit one: (a) **default to `current_location`** when the brief is silent AND the character's self-concept would plausibly include origin detail (parents, home-town, birth-village) that the author has simply not yet specified — i.e., the silence is incidental; (b) **record as "deliberately withheld" in the dossier `notes`** when EITHER the brief does not commit an origin AND the character's self-concept does not reference one (the character treats origin as outside the narrative frame), OR the brief explicitly notes the character has severed origin ties. The two-part test disambiguates the silence-plus-self-concept case from the silence-alone case; applying (a) when (b) fits produces a false origin-claim, and applying (b) when (a) fits loses a small but real piece of character grounding
- `date` — resolved against the world's chronotope (`WORLD_KERNEL.md`) and SEC-TML records
- `species` — bound to a cluster named in SEC-PAS records
- `age_band` — free-form but must be plausible for the species's lifespan per SEC-PAS
- `social_position` — bound to an institutional stratum in SEC-INS
- `profession` / livelihood — bound to an institution or trade in SEC-INS / SEC-ECR
- `kinship_situation` — per the kinship logic in SEC-INS (family/clan/household) and SEC-ELF (ordinary kinship norms)
- `religious_ideological_environment` — bound to an institution, cult, or folk practice named in SEC-INS or SEC-ELF
- `major_local_pressures` — cross-referenced against SEC-GEO (ecological), SEC-ECR (scarcity), SEC-INS (political), and SEC-TML (historical residues)
- `intended_narrative_role` — free-form (protagonist / witness / antagonist / foil / narrator for diegetic artifact / background texture)

**Optional inputs** (recorded in dossier `notes` if provided):
- central contradiction
- desired emotional tone
- desired arc type
- taboo or limit themes to avoid

**Conditional context-packet expansion**: if any declared input touches magical or technological capability (checked against `ONTOLOGY.md` magic-practice / technology categories or capability CFs in the packet), expand retrieval via `mcp__worldloom__search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` and `get_record(sec_id)` for each relevant SEC-MTS record. Skip otherwise to avoid context bloat on ordinary-laborer characters.

**Slug derivation** (if not yet done at Pre-flight): kebab-case the character's in-world name (lowercase, punctuation-stripped). When the character's name contains a nickname, epithet, or professional sobriquet (a quoted nickname in the brief, a professional byname, a title-as-name), default to **personal-name-first** kebab-case — e.g., `melissa-threadscar` rather than `threadscar-melissa`; `vespera-nightwhisper` rather than `nightwhisper-vespera`. If the world's existing `characters/` directory uses a different convention, match precedent; the convention must be stable within a world for INDEX.md alphabetic ordering to remain semantically coherent over time. If no existing dossiers exist yet, personal-name-first is the default. Re-run the slug-collision check from the Pre-flight final step.

**Rule**: Never advance to Phase 1 with an unresolved required input or an input that cannot be bound to a specific entity in the loaded world files. A "generic farmer" cannot exist; "a third-generation bondmaid in the Marsh Courts" can.

**Rule (continuity)**: If the Pre-flight continuity-preservation read loaded existing-dossier continuity constraints (commitments about the new character recorded in other dossiers' `notes`, `source_basis`, or `Likely Story Hooks`), those constraints are non-negotiable for Phases 1-6. Examples from prior sessions: a silver-split already recorded as "honored" in another dossier cannot be re-opened here; an operation another dossier classifies as CF-0006 extraction cannot be re-classified here as CF-0021 crafter-attempt; a referenced character's age or species-cluster cannot be contradicted. If Phase 1-6 work would require contradicting a constraint, escalate to the user at Phase 9 as a named continuity-conflict item — do not silently override.

**FOUNDATIONS cross-ref**: Tooling Recommendation (Phase 0 is the binding step between user intent and loaded world state — non-negotiable for every subsequent phase's coherence).
