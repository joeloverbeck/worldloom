---
name: diegetic-artifact-generation
description: "Use when generating an in-world text or artifact situated inside an existing worldloom world — chronicle, sermon, travelogue, herbal, cult tract, legal decree, funerary inscription, manual, letter, folk tale, fragmentary myth, prison confession, scholarly dispute, battle song, or any other diegetic text whose author, date, place, audience, and relation to truth are world-embedded. Produces: a diegetic artifact file at worlds/<world-slug>/diegetic-artifacts/<da-slug>.md (hybrid YAML frontmatter + markdown body) plus an auto-updated diegetic-artifacts/INDEX.md. Mutates: only worlds/<world-slug>/diegetic-artifacts/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/ atomic record)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: brief_path
    description: "Path to a markdown brief containing the artifact's HARD inputs (artifact_type, date, place, author identity, audience, communicative_purpose, desired_relation_to_truth) and optional SOFT inputs (canon_facts_accessible, taboo_censorship_conditions, desired_length, emotional_tone, rhetorical_style, ornament_level, mystery_seeding_intent, contradiction_target). Phase 0 runs a targeted gap-filler if any HARD input is unresolved; SOFT inputs are defaulted-and-noted."
    required: true
  - name: character_path
    description: "Optional path to an existing character dossier (e.g., worlds/animalia/characters/vespera-nightwhisper.md). If provided, Phase 0 lifts Author Reality Construction fields from the dossier's frontmatter and prose body, filling any gaps via world-state-consistent generation. If absent, Phase 0 generates a world-embedded author from scratch using the brief + retrieved world state. Pre-flight verifies the path resolves inside worlds/<world-slug>/characters/ — cross-world or out-of-tree author references are rejected."
    required: false
---

# Diegetic Artifact Generation

Generates an in-world text or artifact situated inside an existing worldloom world. Pre-flight loads world state via `mcp__worldloom__get_context_packet(task_type='diegetic_artifact_generation', ...)`; the artifact write routes through `submit_patch_plan` carrying a single `append_diegetic_artifact_record` op; an explicit Mystery Reserve firewall and a diegetic-to-world firewall prevent silent canon creation and forbidden-answer leakage.

<HARD-GATE>
Do NOT call `mcp__worldloom__submit_patch_plan` and do NOT `Edit` `diegetic-artifacts/INDEX.md` until: (a) pre-flight resolves `worlds/<world-slug>/`, allocates the next `DA-NNNN` via `mcp__worldloom__allocate_next_id`, and confirms no artifact already exists at the target slug; (b) Phase 7 Canon Safety Check passes with zero unrepaired violations across invariant conformance, Mystery Reserve firewall, distribution/scope conformance, the four diegetic-safety rules, and the World-Truth + Narrator-Truth discipline checks; (c) Phase 8 Validation and Rejection Tests record PASS with a one-line rationale for every test; (d) the user has explicitly approved the Phase 9 deliverable summary (full frontmatter + artifact body + Canon Safety Check Trace + Phase 7f repairs that fired + target write paths) and the skill has issued an `approval_token` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token. The gate is absolute under Auto Mode — invoking the skill is not approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id DA; get_context_packet for world state;
            slug-collision check on worlds/<slug>/diegetic-artifacts/<da-slug>.md;
            optional character_path read for Author lift)
      |
      v
Phase 0: Normalize Brief + Author Reality Construction
          (parse brief; classify HARD/SOFT input resolution;
           interview on unresolved HARD inputs; default-and-note SOFT;
           lift Author from character_path if provided, glean gaps from
           dossier + retrieved world state; else generate world-embedded
           Author from brief + world state;
           selectively expand the packet with SEC-MTS records if magic-
           or-tech-adjacent; bind author to ENT / SEC-INS / SEC-PAS /
           SEC-GEO entries; construct cast-at-artifact-scope per Phase 0c)
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
         7a: Invariant conformance          (vs INV records)
         7b: Mystery Reserve firewall       (vs M records; explicit list)
         7c: Distribution/scope conformance (vs CF distribution blocks; author
                                             access + claim scope)
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
Phase 9: Commit (HARD-GATE approval -->
          submit_patch_plan(plan, approval_token) carrying
          append_diegetic_artifact_record op for <da-slug>.md;
          then skill-managed Edit of diegetic-artifacts/INDEX.md)
```

## Output

- **Diegetic artifact file** at `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` — hybrid YAML frontmatter + markdown body. Frontmatter fields enumerated in `templates/diegetic-artifact.md` (the authoritative schema; the field names and shapes in the Phase 9 write MUST match the template exactly): `artifact_id` (DA-NNNN), `slug`, `title`, `artifact_type`, `author`, `author_character_id` (CHAR-NNNN if `character_path` was used; else null), `date`, `place`, `audience`, `communicative_purpose`, `desired_relation_to_truth`, the 8 SOFT-input fields, `genre_conventions`, `author_profile` (15 Phase 0b fields), `epistemic_horizon`, `claim_map`, `canon_links`, `cannot_know`, `world_consistency`, `source_basis`, `notes`. Body sections: the **artifact text itself** (the in-world content, in the author's voice, with Phase 5 distortions baked in — NOT annotated), followed by a clearly demarcated **Canon Safety Check Trace** section (Phase 7a-7e results + Phase 8 11-test results). Engine validates the frontmatter against `record_schema_compliance` post-write.
- **INDEX.md update** at `worlds/<world-slug>/diegetic-artifacts/INDEX.md` — one line per artifact in the form `- [<title>](<slug>.md) — <artifact_type>, <date>, <author>, <place>`, re-sorted alphabetically by slug on every write. Created with header `# Diegetic Artifacts — <World-Slug-TitleCased>` + blank line if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. **No CF / CH / INV / M / OQ / ENT / SEC record is emitted.** The artifact's claims are *contested canon* (FOUNDATIONS §Canon Layers) at their strongest — an in-world voice, not a world-level truth. If the user later wants a claim from the artifact canonized at the world level, that runs through `canon-addition` (or `canon-facts-from-diegetic-artifacts` to mine the artifact for proposal cards first), whose proposal may cite the artifact by DA-id.

## World-State Prerequisites

`docs/FOUNDATIONS.md` plus the world-state slice the brief touches load via `mcp__worldloom__get_context_packet(task_type='diegetic_artifact_generation', seed_nodes=[<brief-derived seed nodes>], token_budget=10000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. The packet delivers Kernel + invariants + relevant CFs + Mystery Reserve entries touching the artifact's claim domain + named-entity neighbors + section context with completeness guarantees. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read. For specific records, use `mcp__worldloom__get_record(record_id)`. For domain-filtered CF lookups during Phase 3 / 7c, use `mcp__worldloom__search_nodes(node_type='canon_fact', filters=...)`. For named-entity binding during Phase 0 (resolve place / institution / audience names), use `mcp__worldloom__find_named_entities(names)` followed by `get_neighbors`. ONTOLOGY categories load via `Read worlds/<slug>/ONTOLOGY.md`; the world's tonal contract via `Read worlds/<slug>/WORLD_KERNEL.md` — both remain primary-authored at the world root.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first.

## Procedure

### 1. Pre-flight

Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate the next artifact id: `mcp__worldloom__allocate_next_id(world_slug, 'DA')` → `DA-NNNN`. Load the context packet (per §World-State Prerequisites). Read `worlds/<slug>/ONTOLOGY.md` and `worlds/<slug>/WORLD_KERNEL.md` directly. Read the template `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` to anchor the frontmatter schema for the Phase 9 write.

Read `brief_path` once. If `character_path` is provided, verify it resolves inside `worlds/<world-slug>/characters/` (cross-world paths are rejected to prevent canon leakage) AND the target dossier exists; abort naming the path if either condition fails. Read the dossier; if it exceeds the Read tool's token limit, apply selective-read by structural anchors (`^## `, `^character_id:`, frontmatter section heads).

Derive `<da-slug>` from the artifact title per Phase 0a's slug rule (kebab-case, lowercase, punctuation-stripped, headline-portion 5–8 words). If the title is not yet known from the brief, defer slug derivation to the end of Phase 0.

If `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists, abort: "Artifact slug collision — supply a different title. This skill never overwrites an existing artifact."

### 2. Phase 0: Normalize Brief + Author Reality Construction

Load `references/phase-0-normalize-and-author.md`. Parse the brief's 7 HARD + 8 SOFT inputs; interview on unresolved HARD inputs; default-and-note SOFT inputs; bind HARD inputs to ENT / SEC-GEO / SEC-INS / SEC-PAS / SEC-TML records resolved through `find_named_entities` + `get_neighbors`. Lift the Author's 15-field profile from `character_path` if provided (run the chronology and back-projection audits when artifact-date differs from dossier-present); else generate from brief + retrieved world state with every field citing the record-id it sources from. Selectively expand the packet via `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` if the brief or generated claims touch magic / technology. Construct cast-at-artifact-scope (Phase 0c) for crew, dead comrades, named officials, or other figures the brief under-specifies, at author-personal-scope per Phase 7d.1.

### 3. Phases 1-3: Claim Planning

Load `references/phases-1-3-claim-planning.md`. Build the Author's epistemic horizon (Phase 1: six source tags — `witnessed`, `learned_from_authority`, `inherited_tradition`, `common_rumor`, `contested_scholarship`, `impossible_for_narrator_to_verify` — including dossier-transfer when `character_path` is provided), apply in-world genre conventions (Phase 2), build the tagged claim list (Phase 3: `canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`, `cf_id`, `mr_id`, `repair_trace`).

### 4. Phases 4-6: Text Composition

Load `references/phases-4-6-text-composition.md`. Embed material and social texture citing the SEC records it draws from (Phase 4), apply bias and distortion baked into the composition (Phase 5), draft the artifact body as continuous in-world prose with prohibited claims absent (Phase 6).

### 5. Phase 7: Canon Safety Check

Load `references/phase-7-canon-safety-check.md`. Run all five sub-phases — 7a invariant conformance (against every INV record retrieved into the packet), 7b Mystery Reserve firewall (recording every checked M-id into `world_consistency.mystery_reserve_firewall`, overlap or not), 7c distribution/scope conformance against capability and world-fact CFs, 7d four diegetic-safety rules, 7e World-Truth + Narrator-Truth discipline. Any failure routes to Phase 7f Repair Sub-Pass; unrepairable failures loop back to Phase 0.

### 6. Phase 8: Validation and Rejection Tests

Load `references/phase-8-validation-tests.md`. Run all 11 tests and record each as PASS / FAIL with a one-line rationale into the Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS with rationale.

### 7. Phase 9: Commit

Present the deliverable summary to the user:
1. Full frontmatter
2. Artifact body text (the in-world text)
3. Canon Safety Check Trace (Phase 7a-7e results + Phase 8 11-test results with rationales)
4. Phase 7f repair sub-passes that fired (if any), each framed as "preserved: <brief intent> / sacrificed: <what was retagged, rescoped, moved, or removed>"
5. `world_consistency` audit fields: `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`
6. Target write paths: `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` and `worlds/<world-slug>/diegetic-artifacts/INDEX.md`

**HARD-GATE fires here**: no patch plan submits and no INDEX.md edit happens until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and abort (no file written).

On approval, set `source_basis.user_approved: true`, then commit in two engine-aware steps:

1. **Engine-routed artifact write.** Assemble a single-op patch plan: `append_diegetic_artifact_record` with `payload.da_record` carrying the full frontmatter, `payload.body_markdown` carrying the prose body + Canon Safety Check Trace, `target_file: "diegetic-artifacts/<da-slug>.md"`, `payload.filename: "<da-slug>.md"`. Persist the plan envelope (e.g., `/tmp/<plan-id>.json`); invoke the canonical signer (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token); call `mcp__worldloom__submit_patch_plan(plan, approval_token)`. The engine atomically writes the hybrid file at the resolved path and validates the frontmatter against `record_schema_compliance`. On `approval_expired`, re-sign and resubmit; on `approval_replayed`, do NOT resubmit (the prior submit already applied).
2. **INDEX.md update.** `Read` existing `worlds/<world-slug>/diegetic-artifacts/INDEX.md` (create with header `# Diegetic Artifacts — <World-Slug-TitleCased>` followed by one blank line if absent), append or replace the artifact's line in the form `- [<title>](<slug>.md) — <artifact_type>, <date>, <author>, <place>`, re-sort alphabetically by slug, write back via direct `Edit` (Hook 3's hybrid-file allowlist permits `diegetic-artifacts/INDEX.md`).

The artifact-first ordering means a partial-failure state has an artifact without an index entry — easy to detect (grep INDEX.md for the slug). **Recovery is manual**: because the Pre-flight slug-collision abort stops any re-run, re-running the skill with the same slug will NOT update the index. To recover, the operator must either (a) manually append the INDEX.md line in the format above, or (b) delete the orphaned artifact and re-run from Phase 0. The inverse partial-failure state (index entry pointing to a non-existent artifact) requires the same manual approach.

Report all written paths. Do NOT commit to git.

## Governance

Load `references/canon-rules-and-foundations.md` for the Validation Rules This Skill Upholds (Rule 2 / 3 / 4 / 7 phase citations), the complete FOUNDATIONS Alignment table, the Record Schemas, and the rationale for the contested-canon posture.

## Hard Rules

- **HARD-GATE is absolute** (see top of file). No `submit_patch_plan` and no `Edit` of `diegetic-artifacts/INDEX.md` until Phase 7 + Phase 8 pass clean and the user approves the Phase 9 deliverable. Auto Mode does not override — skill invocation is not deliverable approval.
- **Engine-only writes for the artifact file.** The new `<da-slug>.md` lands via `append_diegetic_artifact_record` through `submit_patch_plan`. Direct `Write` to `worlds/<slug>/diegetic-artifacts/<da-slug>.md` is forbidden; the engine performs the atomic write and the schema check.
- **Never write world-level canon records.** This skill never emits CF / CH / INV / M / OQ / ENT / SEC records. Direct `Edit` / `Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. The artifact is contested canon — an in-world voice, not world-level truth.
- **Never write to the `characters/` sibling directory.** An artifact may reference an existing character via `character_path` but does not create, modify, or annotate dossiers. If Phase 0b's author-generation reveals a character worth committing as a reusable dossier, that is a separate `character-generation` run.
- **Cross-world `character_path` is rejected at pre-flight.** Canon leakage across worlds is a pre-flight abort, not a runtime check.
- **Never overwrite an existing artifact.** Pre-flight slug-collision aborts; the engine's `file_already_exists` check is the second backstop. The diegetic-artifact ledger is append-only by construction.
- **Phases 1 / 3 / 7b are the three Rule 7 enforcement points.** A future phase that exposes the artifact to Mystery Reserve content must either extend the firewall audit or be explicitly classified out-of-scope (documented in `notes`).
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A diegetic artifact is not committed until the Author is bound to the world, every claim has a truth-status tag and a source provenance, every forbidden answer has been firewalled, every asserted capability or world-fact claim respects its CF distribution, the text reads as a voice from within the world rather than an encyclopedia entry in disguise, and the user has approved the complete deliverable — and once committed (the engine atomically writes the hybrid file under its `file_already_exists` backstop), the artifact is treated as existing diegetic state that this skill will refuse to overwrite.
