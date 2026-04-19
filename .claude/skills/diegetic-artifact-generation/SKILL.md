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
           bind author to INSTITUTIONS / PEOPLES / GEOGRAPHY entities;
           construct cast-at-artifact-scope for figures the brief under-
           specifies — author-personal-scope per Phase 7d.1)
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

## Procedure

1. **Pre-flight Check.** Verify `worlds/<world-slug>/` exists, all 13 mandatory files are readable, `brief_path` (and `character_path` if provided) resolve correctly, allocate next `DA-NNNN`, derive `<da-slug>`, check slug-collision, load FOUNDATIONS + template + 12 mandatory world files. Load `references/preflight-and-prerequisites.md` for the file-load manifest (mandatory + selectively-loaded), abort conditions, and the 9 numbered pre-flight steps.

2. **Phase 0: Normalize Brief + Author Reality Construction.** Parse the brief's 7 HARD + 8 SOFT inputs; interview on unresolved HARD inputs; default-and-note SOFT inputs; bind HARD inputs to specific world entities; lift the Author's 15-field profile from `character_path` if provided (else generate from brief + world state with every field citing its world file); selectively load `MAGIC_OR_TECH_SYSTEMS.md` if triggered; construct cast-at-artifact-scope (Phase 0c) for crew, dead comrades, named officials, or other figures the brief under-specifies, at author-personal-scope per Phase 7d.1. Load `references/phase-0-normalize-and-author.md`.

3. **Phases 1-3: Claim Planning.** Build the Author's epistemic horizon (Phase 1: six source tags — `witnessed`, `learned_from_authority`, `inherited_tradition`, `common_rumor`, `contested_scholarship`, `impossible_for_narrator_to_verify`), apply in-world genre conventions (Phase 2), build the tagged claim list (Phase 3: `canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`, `cf_id`, `mr_id`, `repair_trace`). Load `references/phases-1-3-claim-planning.md`.

4. **Phases 4-6: Text Composition.** Embed material and social texture citing source files (Phase 4), apply bias and distortion baked into the composition (Phase 5), draft the artifact body as continuous in-world prose with prohibited claims absent (Phase 6). Load `references/phases-4-6-text-composition.md`.

5. **Phase 7: Canon Safety Check.** Run five independent sub-checks — 7a Invariant Conformance, 7b Mystery Reserve Firewall, 7c Distribution/Scope Conformance, 7d Diegetic Safety (four rules), 7e Truth Discipline (World-Truth + Narrator-Truth). Any fail triggers Phase 7f Repair Sub-Pass (retag / rescope / move / remove / add embedding / loop-to-Phase-0). Load `references/phase-7-canon-safety-check.md`.

6. **Phase 8: Validation and Rejection Tests.** Run all 11 tests, each recorded as PASS / FAIL with a one-line rationale. A PASS without rationale is treated as FAIL. Any FAIL halts and loops back to the originating phase. Load `references/phase-8-validation-tests.md`.

7. **Phase 9: Commit.** Present the deliverable summary to the user:
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

## Canon Alignment

For Validation Rules this skill upholds (Rules 2, 3, 4, 7), Record Schemas, and the full FOUNDATIONS Alignment table, load `references/canon-rules-and-foundations.md`.

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
