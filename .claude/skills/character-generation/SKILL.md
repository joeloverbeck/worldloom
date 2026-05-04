---
name: character-generation
description: "Use when generating a character situated inside an existing worldloom world — protagonist, side character, faction leader, townsfolk, scholar, cultist, mercenary, laborer, or narrator for diegetic artifacts. Produces: a character dossier at worlds/<world-slug>/characters/<char-slug>.md (hybrid YAML frontmatter + markdown prose) plus a maintained characters/INDEX.md. Mutates: only worlds/<world-slug>/characters/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/ atomic record)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: character_brief_path
    description: "Path to a markdown file containing the required inputs (current_location, place_of_origin, date, species, age_band, social_position, profession, kinship_situation, religious_ideological_environment, major_local_pressures, intended_narrative_role) and optional inputs (central contradiction, desired emotional tone, desired arc type, taboo/limit themes to avoid). If place_of_origin is unspecified or names a real-world or otherwise-out-of-stage location, Phase 0 applies the three-part test in references/phase-0-normalize-brief.md. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Character Generation

Generates a character dossier situated inside an existing worldloom world. Pre-flight loads seed-relevant world state via `mcp__worldloom__get_context_packet(task_type='character_generation', ...)` and whole-class Phase 7 firewall bodies via `mcp__worldloom__list_records(..., include_full_body=true)`; the dossier write routes through `submit_patch_plan` carrying a single `append_character_record` op; an explicit Mystery Reserve firewall prevents forbidden-answer leakage.

<HARD-GATE>
Do NOT call `mcp__worldloom__submit_patch_plan` and do NOT `Edit` `characters/INDEX.md` until: (a) pre-flight resolves `worlds/<world-slug>/`, allocates the next `CHAR-NNNN` via `mcp__worldloom__allocate_next_id`, and confirms no dossier already exists at the target slug; (b) Phase 7 Canon Safety Check passes with zero unrepaired violations across invariant conformance, Mystery Reserve firewall, and distribution/scope conformance; (c) Phase 8 Validation and Rejection Tests record PASS with one-line rationale for every test; (d) the user has explicitly approved the Phase 9 deliverable summary (full dossier + Canon Safety Check Trace + Phase 7d repairs that fired + target write paths) and the skill has issued an `approval_token` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token. The gate is absolute under Auto Mode — invoking the skill is not approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id CHAR; get_context_packet for seed-relevant world state;
            list_records full-body INV / M for Phase 7 firewall coverage;
            slug-collision check on worlds/<slug>/characters/<char-slug>.md;
            continuity-preservation read on existing dossiers naming
            the proposed character)
      |
      v
Phase 0:  Normalize Character Brief (parse character_brief_path OR interview;
          bind required inputs to world entities — current_location +
          optional place_of_origin to ENT/SEC-GEO entries, species to
          SEC-PAS cluster, profession to SEC-INS link)
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
         Construction               obligation, social fear, private shame,
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
         7a: Invariant conformance          (vs INV records)
         7b: Mystery Reserve firewall       (vs M-N records; explicit list)
         7c: Distribution/scope conformance (vs CF distribution blocks)
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
Phase 9: Commit (HARD-GATE approval -->
          submit_patch_plan(plan, approval_token) carrying
          append_character_record op for <char-slug>.md;
          then skill-managed Edit of characters/INDEX.md)
```

## Output

- **Character dossier** at `worlds/<world-slug>/characters/<char-slug>.md` — hybrid YAML frontmatter + markdown body. Frontmatter carries `character_id`, `slug`, `name`, `species`, `age_band`, `place_of_origin`, `current_location`, `date`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, `world_consistency` (with `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`, `continuity_checked_with` — each array's entries MUST be bare ids matching the engine's strict patterns: `^CF-[0-9]{4}$` for `canon_facts_consulted`, `^(ONT|CAU|DIS|SOC|AES)-[0-9]+$` for `invariants_respected`, `^M-[0-9]+$` for `mystery_reserve_firewall`, `^CHAR-[0-9]{4}$` for `continuity_checked_with`; `distribution_exceptions` is free-form strings of form `<CF-id>: <justification>`. Descriptive prose belongs in the Canon Safety Check Trace body section, not in these arrays — `record_schema_compliance` will reject mixed-format entries), `source_basis`, `notes`. Body sections: Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace. Matches `templates/character-dossier.md`. Engine validates the frontmatter against `record_schema_compliance` post-write.
- **INDEX.md update** at `worlds/<world-slug>/characters/INDEX.md` — one line per character in the form `- [<name>](<slug>.md) — <age_band> <species> <social_position> / <profession>, <current_location>`, re-sorted alphabetically by slug on every write. Created if absent. **Field-style guidance**: prefer short forms in the placeholder fields — `<age_band>` renders as a compact form (bare numeric age for adult bands, e.g., `18` / `34` / `47`; short noun for non-numeric bands, e.g., `elderly` / `child` / `teen`); `<species>` is the bare species name (`human`, `Basque-cluster human`, `goblin`); `<social_position>` and `<profession>` are short noun phrases; `<current_location>` is settlement plus optional district in parens. Long descriptive context belongs in the dossier frontmatter, not in the INDEX line. The INDEX is for scanning; the dossier is for reading. Worked example: `- [Iker Aguirre](iker-aguirre.md) — 18 human working-class Donostia local / secondary-school student, Donostia (Gros)`.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. No CF, CH, INV, M, OQ, ENT, or SEC record is emitted. If the user later wants to canonize a specific NPC at the world level, that is a separate `canon-addition` run.

## World-State Prerequisites

`docs/FOUNDATIONS.md` plus the world-state slice the brief touches load via `mcp__worldloom__get_context_packet(task_type='character_generation', seed_nodes=[<brief-derived seed nodes>], token_budget=18000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. Whole-class Phase 7 firewall coverage loads separately via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` for every INV body and `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` for every M body; `mcp__worldloom__get_firewall_content(world_slug)` remains the equivalent M-only projection shortcut when full M bodies are not needed. **`seed_nodes` accept canonical node ids only** — `entity:<slug>` for named entities, bare `CF-NNNN` / `M-NNNN` / `OQ-NNNN` / `SEC-XXX-NNN` / invariant ids (`ONT-N`, `CAU-N`, `DIS-N`, `SOC-N`, `AES-N`) for records — not display names; resolve display names from the brief via `mcp__worldloom__find_named_entities(names)` BEFORE the first packet call to obtain the canonical `entity:<slug>` ids (a `seed_nodes=['<display-name>']` form returns `node_not_found` because no graph node carries the bare display name as an id). The assembler also enforces `task_header.harness_ceiling_chars` (default 60000 serialized JSON characters) with a `task_header.envelope_overhead_reserve_chars` reserve (default 4000) before returning inline. **If the packet returns `delivery_status='persisted_with_summary'`** (full packet persisted, inline summary returned) OR returns `packet_incomplete_required_classes` OR returns successfully but with non-empty `truncation_summary.dropped_layers`, do not silently proceed: apply the fallback procedure in `references/world-state-prerequisites.md` §Context-packet-too-large fallback (reduce `seed_nodes` and retry; use inline `governing_summary`; batched `get_records` for known CF / M / INV id sets; `get_persisted_packet_slice` for structured persisted-packet recovery; singular `get_record` only for one-off or iterative follow-up). The packet delivers Kernel + seed-relevant CF parsed records + seed-touched priority SEC parsed records + named-entity neighbors + section context with completeness guarantees; whole-class INV/M firewall bodies come from the `list_records(... include_full_body=true)` loads above. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read. For specific record sets beyond the packet's parsed projections, use `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)`; use `mcp__worldloom__get_record(record_id)` for one-off retrieval. For domain-filtered CF lookups during Phase 5 / 7c, use `mcp__worldloom__search_nodes(node_type='canon_fact_record', filters=...)`. For named-entity binding during Phase 0 (resolve current_location / place_of_origin / institution names), use `mcp__worldloom__find_named_entities(names)` followed by `get_neighbors` for the resolved nodes. ONTOLOGY categories load via `Read worlds/<slug>/ONTOLOGY.md` (primary-authored, unchanged by SPEC-13).

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first.

## Procedure

**Reference-load discipline**: each phase below directs you to `Load references/<phase>.md.`. This is **required, not advisory** — Read each phase-reference file via the Read tool before composing that phase's output. The Procedure §§ below are load-bearing summaries; the references contain the decision-rules for edge cases the summaries omit (Phase 0 slug-derivation rules, Phases 1-6 capability-stabilizer enumeration, Phase 7c distribution-exception edge cases, Phase 8 test rationales). Skipping a phase's reference risks producing wrong output on edge cases the SKILL.md body summarizes-but-omits. The same discipline applies to the §Governance load at the end.

### 1. Pre-flight

Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate the next character id: `mcp__worldloom__allocate_next_id(world_slug, 'CHAR')` → `CHAR-NNNN`. Load the context packet plus the whole-class INV / M Phase 7 firewall sets (per §World-State Prerequisites). Read `worlds/<slug>/ONTOLOGY.md` and `worlds/<slug>/WORLD_KERNEL.md` directly — both remain primary-authored at the world root.

Derive `<char-slug>` from the character's intended in-world name per the slug convention in `references/phase-0-normalize-brief.md` §Slug derivation (kebab-case, lowercase, punctuation-stripped; personal-name-first for epithets; match existing-dossier precedent in `characters/`). If the name is not yet known, defer slug derivation to the end of Phase 0.

If `worlds/<world-slug>/characters/<char-slug>.md` already exists, abort: "Character slug collision — supply a different in-world name. This skill never overwrites an existing dossier."

**Continuity-preservation read.** If the brief or interview names any existing characters — detected via `mcp__worldloom__find_named_entities(names, node_type_filter=['character_record'])` plus a quick scan of `characters/INDEX.md` for slug references — read those dossiers' frontmatter and `notes` blocks. **Slug-to-CHAR-id resolution recipe.** `find_named_entities` returns `entity:<slug>` ids in `canonical_matches[]`, NOT CHAR-NNNN ids; the `get_record('CHAR-NNNN', ...)` projection-first call below requires the CHAR-id as input. To bridge the gap: (1) extract the canonical slug from each `entity_id` (e.g., `entity:ane-arrieta` → `ane-arrieta`); (2) obtain the slug↔CHAR-id mapping by EITHER (a) calling `mcp__worldloom__list_records(world_slug, record_type='character_record', include_full_body=true)` once at Pre-flight to enumerate every `{character_id, slug, name}` triple in the world (cheap one-call enumeration; preferred when 3+ characters need lookup or when continuity-read scope is unclear), OR (b) `Read worlds/<slug>/characters/<existing-slug>.md` with `limit=10` to extract the `character_id:` frontmatter line per dossier (preferred for one-or-two-character lookups). Do NOT guess CHAR-id from alphabetical INDEX.md ordering — IDs are by allocation order, not slug order. **Projection-first**: with CHAR-NNNN obtained, prefer `mcp__worldloom__get_record('CHAR-NNNN', section_path='frontmatter')` plus `section_path='body.Likely Story Hooks'` per `references/world-state-prerequisites.md` §Hybrid files — established protagonist-tier dossiers commonly cross the Read tool's token limit, which `get_record` projection avoids. Direct `Read` of the dossier file is the fallback for pre-CORRIDOR-004 worlds where hybrid-record retrieval is unavailable. Record the consulted CHAR-ids into the new character's draft `world_consistency.continuity_checked_with`. Commitments recorded in an existing dossier's `notes`, `source_basis`, or `Likely Story Hooks` about the new character (e.g., "silver-split already honored," "operation was CF-0006 extraction not CF-0021 creation," "Rill is seventeen") are continuity constraints that Phase 1-6 work must not contradict without explicit user acknowledgment at Phase 9. If no existing dossiers name this character, `continuity_checked_with = []`.

### 2. Phase 0: Normalize Character Brief

Load `references/phase-0-normalize-brief.md`. Parse `character_brief_path` if provided; otherwise interview the user. Bind required inputs to named entities resolved through `find_named_entities` + `get_neighbors`, apply the three-part `place_of_origin` test when needed, derive the slug, and honor any continuity constraints loaded at the Pre-flight continuity read.

### 3. Phases 1-6: Character Construction

Load `references/phases-1-6-character-construction.md`. Build the dossier body across the six phases: Phase 1 Material Reality, Phase 2 Institutional Embedding, Phase 3 Epistemic Position, Phase 4 Goal and Pressure Construction, Phase 5 Capability Validation, Phase 6 Voice and Perception. Each phase cites the world-state nodes it draws from (CFs, INVs, SEC records, ENT records, M entries); every capability is first-pass-checked against capability CF distribution blocks at Phase 5.

### 4. Phase 7: Canon Safety Check

Load `references/phase-7-canon-safety-check.md`. Run all three sub-phases — 7a invariant conformance (against every INV record retrieved via `list_records(record_type='invariant_record', include_full_body=true)`), 7b Mystery Reserve firewall (M records retrieved via `list_records(record_type='mystery_record', include_full_body=true)` or `get_firewall_content(world_slug)`, recording every checked M-id into `world_consistency.mystery_reserve_firewall`), 7c distribution/scope conformance against capability CFs. Any failure routes to Phase 7d Repair Sub-Pass; unrepairable failures loop back to Phase 0.

### 5. Phase 8: Validation and Rejection Tests

Load `references/phase-8-validation-tests.md`. Run all 10 tests and record each as PASS / FAIL with a one-line rationale into the dossier's Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS with rationale.

### 6. Phase 9: Commit

Present the deliverable summary to the user:
1. Full character dossier — inline the frontmatter and a section-by-section summary of the body; if the body exceeds ~10KB, point the user to the working file path (e.g., `/tmp/<char-slug>-body.md`) for full review rather than inlining the entire body. The HARD-GATE response is summary-plus-pointer, not literal-full-content. **Per-section summary format**: one or two sentences per body section, each named as a bolded subhead matching the body's heading exactly (e.g., `**Material Reality** — …`) and citing the load-bearing world-state record ids (CFs / INVs / M / SEC / ENT / OQ) the section draws from. Do NOT inline full prose; a reader who wants full text can grep the working file by the bolded heading. **Oversize-frontmatter fallback**: if the assembled frontmatter exceeds ~10KB serialized (typical when `world_consistency` arrays are densely populated or `notes` carries multi-pass repair history), inline the always-required-inline subset (`character_id`, `slug`, `name`, `species`, `age_band`, `place_of_origin`, `current_location`, `date`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `intended_narrative_role`, the five `world_consistency` arrays, `source_basis`, `notes`) plus a pointer to the persisted plan envelope path (e.g., `/tmp/<plan-id>.json` carrying the full `payload.char_record`) for the larger fields (`major_local_pressures`). The HARD-GATE response is summary-plus-pointer for oversize frontmatter, not literal-full-content — but the always-required-inline subset is the audit surface the user reviews to decide HARD-GATE approval and must never be pushed behind the pointer.
2. Canon Safety Check Trace (10 test results with rationales)
3. Phase 7d repair sub-passes that fired (if any), each framed as "preserved: <user intent> / sacrificed: <what was narrowed or reclassified>"
4. `world_consistency` audit fields: `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`, `continuity_checked_with`
5. Continuity-constraint summary (if the Pre-flight continuity-preservation read loaded any existing dossiers): one line per dossier consulted, naming the CHAR-id and the specific commitments honored. If any Phase 1-6 work would have required contradicting a constraint, list it here as a named continuity-conflict item for user adjudication.
6. Target write paths: `worlds/<world-slug>/characters/<char-slug>.md` and `worlds/<world-slug>/characters/INDEX.md`

**HARD-GATE fires here**: no patch plan submits and no INDEX.md edit happens until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and abort (no file written).

On approval, set `source_basis.user_approved: true`, then commit in two engine-aware steps:

1. **Engine-routed dossier write.** Before assembly, call `mcp__worldloom__describe_envelope_schema(op_kind='append_character_record')` once to confirm the current envelope schema and payload-shape contract — this surfaces strict-pattern enforcement on `world_consistency` arrays, the `payload.{char_record, body_markdown, filename}` discipline, and the `expected_id_allocations.char_ids: ["CHAR-NNNN"]` requirement. Then assemble a single-op patch plan: `append_character_record` with `payload.char_record` carrying the full frontmatter, `payload.body_markdown` carrying the prose body, `target_file: "characters/<char-slug>.md"`, `payload.filename: "<char-slug>.md"`. **YAML→JSON conversion**: when working from a draft markdown file (YAML frontmatter + markdown body), parse the frontmatter YAML to a JSON object before embedding in `payload.char_record` — the schema requires a parsed object, not a YAML string. A small Node helper using `require('yaml').parse()` on the frontmatter region is the typical idiom for >50KB envelopes (where the CLI submit path is mandatory and inline construction in the assistant message is impractical). **YAML colon-space pitfall**: long unquoted frontmatter scalars containing `: ` (colon followed by space) — common in Phase 0 binding-justification register (e.g., `field: Value (per brief: "..."` or `field: Value (per CF-NNNN: ...)`) — fail strict YAML parsing as `BLOCK_AS_IMPLICIT_KEY: Nested mappings are not allowed in compact mappings`. To avoid this, either (a) write the draft frontmatter using double-quoted strings or `>-` / `|` block-scalar form for any value containing `: `, OR (b) skip YAML parsing and construct `char_record` directly as a JS object literal in the build helper (the `body_markdown` still comes from the draft via the second `---` split). Option (b) is the typical fallback when the draft already exists with unquoted scalars. Persist the plan envelope (e.g., `/tmp/<plan-id>.json`); invoke the canonical signer (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token); call `mcp__worldloom__submit_patch_plan(plan, approval_token)`. **Submit-path selection by envelope size**: for dossier envelopes >50KB (typical of full-prose dossiers — Rill's was 108KB; production dossiers routinely exceed the MCP transport's inline limit), submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass) for full equivalence guarantees. The engine atomically writes the hybrid file at the resolved path and validates the frontmatter against `record_schema_compliance`. **Failure-mode response**: on `approval_expired`, re-sign and resubmit; on `approval_replayed`, do NOT resubmit (the prior submit already applied). On `index_stale`, the engine detected that the world index has diverged from on-disk content, typically because a direct-`Edit` to hybrid-file frontmatter was not followed by an index sync. The response's `detail.divergent_files[].file_path` names the divergent files. Run `node tools/world-index/dist/src/cli.js sync <world-slug>` to refresh the index, then resubmit the patch plan with the same approval token if it has not expired. On `validator_failed`, inspect `detail.verdicts[].location.file`: if the cited file is the new dossier, the schema violation is in this skill's output — fix and resubmit; **if the cited file is unrelated existing world state (any path other than the new dossier), pause and escalate to the user — the canon-reading skill must not silently modify other canon-adjacent files. Hook 3 does not block hybrid-file frontmatter edits, so the discipline is prescriptive.** After any user-authorized direct-`Edit` to any indexed canon record — atomic `_source/<subdir>/*.yaml` files OR hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (both surfaces are under `record_schema_compliance` validator scope) — run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting; the validator runs against the indexed world state, not against on-disk content. Atomic `_source/` direct-Edits are normally Hook-3-blocked, so this case applies specifically when the user bypasses Hook 3 to fix pre-existing world-state issues surfaced by the engine's pre-apply validators (e.g., a pre-existing schema violation in an unrelated mystery-reserve or canon record cited at `validator_failed.detail.verdicts[].location.file`). INDEX.md edits do not require sync (not under validator scope).
2. **INDEX.md update.** `Read` existing `worlds/<world-slug>/characters/INDEX.md` (create with header `# Characters — <World-Slug-TitleCased>` followed by one blank line if absent), append or replace the character's line in the form `- [<name>](<slug>.md) — <age_band> <species> <social_position> / <profession>, <current_location>` (see §Output for field-style guidance — prefer short forms in INDEX placeholder fields, with long descriptive context in the dossier frontmatter), re-sort alphabetically by slug, write back via direct `Edit` (Hook 3's hybrid-file allowlist permits `characters/INDEX.md`).

The dossier-first ordering means a partial-failure state has a dossier without an index entry — easy to detect (grep INDEX.md for the slug). **Recovery is manual**: because the Pre-flight slug-collision abort stops any re-run, re-running the skill with the same slug will NOT update the index. To recover, the operator must either (a) manually append the character's INDEX.md line in the format above, or (b) delete the orphaned dossier and re-run from Phase 0. The inverse partial-failure state (index entry pointing to a non-existent dossier) requires the same manual approach.

Report all written paths. Do NOT commit to git.

## Governance

Load `references/governance-and-foundations.md` for the Validation Rules This Skill Upholds (Rule 2 / 3 / 4 / 7 phase citations), the complete FOUNDATIONS Alignment table, the Record Schemas with nested-field enumeration, and the full Guardrails list.

## Hard Rules

- **HARD-GATE is absolute** (see top of file). No `submit_patch_plan` and no `Edit` of `characters/INDEX.md` until Phase 7 + Phase 8 pass clean and the user approves the Phase 9 deliverable. Auto Mode does not override — skill invocation is not deliverable approval.
- **Engine-only writes for the dossier file.** The new `<char-slug>.md` lands via `append_character_record` through `submit_patch_plan`. Direct `Write` to `worlds/<slug>/characters/<char-slug>.md` is forbidden; the engine performs the atomic write and the schema check.
- **Never write world-level canon records.** This skill never emits CF / CH / INV / M / OQ / ENT / SEC records. Direct `Edit` / `Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. Full canon-file list in `references/governance-and-foundations.md` §Full Guardrails.
- **Never overwrite an existing dossier.** Pre-flight slug-collision aborts; the engine's `file_already_exists` check is a second backstop. The character ledger is append-only by construction.
- **Phase 3 + Phase 7b are the two Rule 7 enforcement points.** A future phase that exposes the character to Mystery Reserve content must either extend the firewall audit or be explicitly classified as out-of-scope (documented in `notes`).
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A character dossier is not committed until every capability has a stabilizer, every belief has a provenance, every piece of forbidden-answer knowledge has been firewalled, every institutional axis has a stated relation, and the user has approved the complete deliverable — and once committed (the engine atomically writes the hybrid file under the engine's `file_already_exists` backstop), the dossier is treated as existing character state that this skill will refuse to overwrite.
