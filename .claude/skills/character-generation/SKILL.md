---
name: character-generation
description: "Use when generating a character situated inside an existing worldloom world — protagonist, side character, faction leader, townsfolk, scholar, cultist, mercenary, laborer, or narrator for diegetic artifacts. Produces: a character dossier at worlds/<world-slug>/characters/<char-slug>.md (hybrid YAML frontmatter + markdown prose) plus an auto-updated characters/INDEX.md. Mutates: only worlds/<world-slug>/characters/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, MYSTERY_RESERVE.md, OPEN_QUESTIONS.md) is unreadable."
    required: true
  - name: character_brief_path
    description: "Path to a markdown file containing the required inputs (current_location, place_of_origin, date, species, age band, social position, profession, kinship situation, religious/ideological environment, major local pressures, intended narrative role) and optional inputs (central contradiction, desired emotional tone, desired arc type, taboo/limit themes to avoid). If place_of_origin is unspecified, Phase 0 applies a two-part test: default to current_location when the silence is incidental (character self-concept would plausibly include origin detail); record as 'deliberately withheld' when origin is non-narratively-active (brief AND self-concept both silent, or explicit severance). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
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
- `character_brief_path` — filesystem path — markdown brief containing the required inputs (current_location, place_of_origin, date, species, age band, social position, profession, kinship situation, religious/ideological environment, major local pressures, intended narrative role) and optional inputs (central contradiction, desired emotional tone, desired arc type, taboo/limit themes to avoid). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler. For `place_of_origin` handling when the brief is silent, see `references/phase-0-normalize-brief.md` (two-part test distinguishing incidental silence from non-narratively-active origin).

## Output

- **Character dossier** at `worlds/<world-slug>/characters/<char-slug>.md` — hybrid YAML frontmatter (structured lookups: `character_id`, `slug`, `name`, `species`, `age_band`, `place_of_origin`, `current_location`, `date`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, `world_consistency`, `source_basis`, `notes`) + markdown body (prose sections: Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace). Matches `templates/character-dossier.md`. Full field enumeration in `references/governance-and-foundations.md` §Record Schemas.
- **INDEX.md update** at `worlds/<world-slug>/characters/INDEX.md` — one line per character in the form `- [<name>](<slug>.md) — <age_band> <species> <social_position> / <profession>, <current_location>`, re-sorted alphabetically by slug on every write. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. No Canon Fact Record emitted. No Change Log Entry emitted. If the user later wants to canonize a specific NPC at the world level, that is a separate `canon-addition` run.

## Procedure

### 1. Pre-flight Check

Load `references/world-state-prerequisites.md` for the full file-load contract, mature-file reading pattern, and abort conditions. Then run the following verifications in order:

1. Verify `worlds/<world-slug>/` exists. If absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
2. Verify all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) listed in world-state-prerequisites are readable. If any is missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` into working context.
4. Load the 12 mandatory world files.
5. Scan `worlds/<world-slug>/characters/` for the highest existing `CHAR-NNNN` by grepping `^character_id:` across dossier frontmatters (filenames encode slugs, not IDs, so a grep over dossier files is required — directory listing alone is not sufficient). Allocate `next_char_id = highest + 1`. If the directory does not exist or contains no dossiers, `next_char_id = CHAR-0001`.
6. **Continuity-preservation read**. If the provided `character_brief_path` or the Phase 0 interview names any existing characters — detected by grepping the brief for the dossier slugs present in `characters/INDEX.md` and for any proper-noun names appearing in existing dossiers' frontmatter `name:` fields — read those dossiers' frontmatter and `notes` blocks into working context. Record the set of CHAR-ids read into the new character's draft `world_consistency.continuity_checked_with` list. Any commitments recorded in an existing dossier's `notes`, `source_basis`, or `Likely Story Hooks` about the new character (e.g., "silver-split already honored," "operation was CF-0006 extraction not CF-0021 creation," "Rill is seventeen") are continuity constraints that Phase 1-6 work must not contradict without explicit user acknowledgment at Phase 9. If the directory does not exist or contains no dossiers, `continuity_checked_with = []` and this step is a no-op.
7. Derive `<char-slug>` from the character's intended in-world name, per the slug convention in `references/phase-0-normalize-brief.md` §Slug derivation (kebab-case, lowercase, punctuation-stripped; personal-name-first for epithets; match existing-dossier precedent in `characters/`). If the character name is not yet known, defer slug derivation to the end of Phase 0.
8. If `worlds/<world-slug>/characters/<char-slug>.md` already exists, abort: "Character slug collision — supply a different in-world name. This skill never overwrites an existing dossier."

### 2. Phase 0: Normalize Character Brief

Load `references/phase-0-normalize-brief.md`. Parse `character_brief_path` if provided; otherwise interview the user. Bind required inputs to named entities in the loaded world files, apply the two-part `place_of_origin` test when needed, conditionally load `MAGIC_OR_TECH_SYSTEMS.md`, derive the slug, and honor any continuity constraints loaded at the Pre-flight continuity read.

### 3. Phases 1-6: Character Construction

Load `references/phases-1-6-character-construction.md`. Build the dossier body across the six phases: Phase 1 Material Reality, Phase 2 Institutional Embedding, Phase 3 Epistemic Position, Phase 4 Goal and Pressure Construction, Phase 5 Capability Validation, Phase 6 Voice and Perception. Each phase cites the world files it draws from; every capability is first-pass-checked against `CANON_LEDGER.md` distribution blocks at Phase 5.

### 4. Phase 7: Canon Safety Check

Load `references/phase-7-canon-safety-check.md`. Run all three sub-phases — 7a invariant conformance, 7b Mystery Reserve firewall (recording every checked MR entry into `world_consistency.mystery_reserve_firewall`), 7c distribution/scope conformance against `CANON_LEDGER.md`. Any failure routes to Phase 7d Repair Sub-Pass; unrepairable failures loop back to Phase 0.

### 5. Phase 8: Validation and Rejection Tests

Load `references/phase-8-validation-tests.md`. Run all 9 tests and record each as PASS / FAIL with a one-line rationale into the dossier's Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS with rationale.

### 6. Phase 9: Commit

Present the deliverable summary to the user:
1. Full character dossier (frontmatter + markdown body)
2. Canon Safety Check Trace (9 test results with rationales)
3. Phase 7d repair sub-passes that fired (if any), each framed as "preserved: <user intent> / sacrificed: <what was narrowed or reclassified>"
4. `world_consistency` audit fields: `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`, `continuity_checked_with`
5. Continuity-constraint summary (if the Pre-flight continuity-preservation read loaded any existing dossiers): one line per dossier consulted, naming the CHAR-id and the specific commitments honored (e.g., "CHAR-0001 Vespera Nightwhisper: 12 Kiln Lane framed as CF-0006 extraction; silver-split already honored; Rill age 17"). If any Phase 1-6 work would have required contradicting a constraint, list it here as a named continuity-conflict item for user adjudication.
6. Target write paths: `worlds/<world-slug>/characters/<char-slug>.md` and `worlds/<world-slug>/characters/INDEX.md`

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and abort (no file written).

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity, and a deterministic order makes partial-state recovery tractable:

1. **Character dossier first**. Write `worlds/<world-slug>/characters/<char-slug>.md`. Set `source_basis.user_approved: true` immediately before this write — this is the moment of artifact commitment.
2. **INDEX.md second**. Read existing `worlds/<world-slug>/characters/INDEX.md` (create with header `# Characters — <World-Slug-TitleCased>` followed by one blank line if absent), append or replace the character's line in the form `- [<name>](<slug>.md) — <age_band> <species> <social_position> / <profession>, <current_location>`, re-sort alphabetically by slug, write back.

The "dossier-first" sequencing means a partial-failure state has a dossier without an index entry — easy to detect (grep INDEX.md for the slug). **Recovery is manual**, not automatic: because the Pre-flight slug-collision abort stops any re-run, re-running the skill with the same slug will NOT update the index. To recover, the operator must either (a) manually append the character's INDEX.md line in the format above, or (b) delete the orphaned dossier and re-run the skill from Phase 0 to regenerate both files. The inverse partial-failure state — an index entry pointing to a non-existent dossier — is harder to detect in future runs and requires the same manual approach (delete the orphaned index line, or create the missing dossier by hand).

Report all written paths. Do NOT commit to git.

## Governance

Load `references/governance-and-foundations.md` for the Validation Rules This Skill Upholds (Rule 2 / 3 / 4 / 7 phase citations), the complete FOUNDATIONS Alignment table, the Record Schemas with nested-field enumeration, and the full Guardrails list.

## Hard Rules

- **HARD-GATE is absolute** (see top of file). No `Write` or `Edit` to `worlds/<world-slug>/characters/` until Phase 7 + Phase 8 pass clean and the user approves the Phase 9 deliverable. Auto Mode does not override — skill invocation is not deliverable approval.
- **Never write world-level canon files.** All writes confined to `worlds/<world-slug>/characters/`. Full canon-file list in `references/governance-and-foundations.md` §Full Guardrails.
- **Never overwrite an existing dossier.** Pre-flight slug-collision aborts; the ledger of committed characters is append-only by construction.
- **Phase 3 + Phase 7b are the two Rule 7 enforcement points.** A future phase that exposes the character to Mystery Reserve content must either extend the firewall audit or be explicitly classified as out-of-scope (documented in `notes`).
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A character dossier is not committed until every capability has a stabilizer, every belief has a provenance, every piece of forbidden-answer knowledge has been firewalled, every institutional axis has a stated relation, and the user has approved the complete deliverable — and once committed, the dossier is treated as existing character state that this skill will refuse to overwrite.
