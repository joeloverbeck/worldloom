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

Generates an in-world text or artifact situated inside an existing worldloom world. Pre-flight loads seed-relevant world state via `mcp__worldloom__get_context_packet(task_type='diegetic_artifact_generation', ...)` and whole-class Phase 7 firewall bodies via `mcp__worldloom__list_records(..., include_full_body=true)`; the artifact write routes through `submit_patch_plan` carrying a single `append_diegetic_artifact_record` op; an explicit Mystery Reserve firewall and a diegetic-to-world firewall prevent silent canon creation and forbidden-answer leakage.

<HARD-GATE>
Do NOT call `mcp__worldloom__submit_patch_plan` and do NOT `Edit` `diegetic-artifacts/INDEX.md` until: (a) pre-flight resolves `worlds/<world-slug>/`, allocates the next `DA-<integer>` via `mcp__worldloom__allocate_next_id`, and confirms no artifact already exists at the target slug; (b) Phase 7 Canon Safety Check passes with zero unrepaired violations across invariant conformance, Mystery Reserve firewall, distribution/scope conformance, the four diegetic-safety rules, and the World-Truth + Narrator-Truth discipline checks; (c) Phase 8 Validation and Rejection Tests record PASS with a one-line rationale for every test; (d) the user has explicitly approved the Phase 9 deliverable summary (full frontmatter + artifact body + Canon Safety Check Trace + Phase 7f canon-safety repairs that fired + Phase 6 chronology-coherence revisions that fired + target write paths) and the skill has issued an `approval_token` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token. The gate is absolute under Auto Mode — invoking the skill is not approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id DA; get_context_packet for seed-relevant world state;
            list_records full-body INV / M for Phase 7 firewall coverage;
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
Phase 8: Validation and Rejection Tests (12 tests)
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

- **Diegetic artifact file** at `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` — hybrid YAML frontmatter + markdown body. Frontmatter fields enumerated in `templates/diegetic-artifact.md` (the authoritative schema; the field names and shapes in the Phase 9 write MUST match the template exactly): `artifact_id` (DA-<integer>), `slug`, `title`, `artifact_type`, `statement_of_existence`, `author`, `author_character_id` (CHAR-<integer> if `character_path` was used; else null), `date`, `place`, `audience`, `communicative_purpose`, `desired_relation_to_truth`, `world_relation`, the 8 SOFT-input fields, `genre_conventions`, `author_profile` (15 Phase 0b fields), `epistemic_horizon`, `claim_map`, `canon_links`, `cannot_know`, `world_consistency`, `source_basis`, `notes`. Body sections: the **artifact text itself** (the in-world content, in the author's voice, with Phase 5 distortions baked in — NOT annotated), followed by a clearly demarcated **Canon Safety Check Trace** section (Phase 7a-7e results + Phase 8 12-test results). Engine validates the frontmatter against `record_schema_compliance` post-write.
- **INDEX.md update** at `worlds/<world-slug>/diegetic-artifacts/INDEX.md` — one line per artifact in the form `- [<title>](<slug>.md) — <artifact_type>, <date>, <author>, <place>`, re-sorted alphabetically by slug on every write. Created with header `# Diegetic Artifacts — <World-Slug-TitleCased>` + blank line if absent. **Field-style guidance**: prefer short forms in the four placeholder fields — `<artifact_type>` is the bare type (`chapter`, `travelogue`, `after-action report`); `<date>` is a short anchor (`Year 412`, `Layer 4`, `~2 yrs before CHAR-<integer> dossier-present`); for date-range artifacts (journal, diary, ledger, chronicle), use a compact range (`2026-04-18 to 2026-05-01`) or a window-anchor (`spring 2026`) — keep the field under ~25 chars regardless of form; `<author>` is the byline name only; `<place>` is the bare place name. Long descriptive context belongs in the artifact's frontmatter `statement_of_existence`, not in the INDEX line. The INDEX is for scanning; the artifact is for reading.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. **No CF / CH / INV / M / OQ / ENT / SEC record is emitted.** The artifact's claims are in-world assertions, not canon; the artifact may exist as a world artifact and may cite or distort accepted CFs, but its statements become world truth only if a later `canon-addition` accepts a CF about their existence, circulation, belief, disputed status, or truth. If the user later wants a claim from the artifact canonized at the world level, that runs through `canon-addition` (or `canon-facts-from-diegetic-artifacts` to mine the artifact for proposal cards first), whose proposal may cite the artifact by DA-id.

## World-State Prerequisites

`docs/FOUNDATIONS.md` plus the world-state slice the brief touches load via `mcp__worldloom__get_context_packet(task_type='diegetic_artifact_generation', seed_nodes=[<brief-derived seed nodes>], token_budget=10000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. Whole-class Phase 7 firewall coverage loads separately via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` for every INV body and `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` for every M body; `mcp__worldloom__get_firewall_content(world_slug)` remains the equivalent M-only projection shortcut when full M bodies are not needed. **`seed_nodes` accept canonical node ids only** — `entity:<slug>` for named entities, bare `CF-<integer>` / `M-<integer>` / `OQ-<integer>` / `SEC-XXX-<integer>` / invariant ids (`ONT-N`, `CAU-N`, `DIS-N`, `SOC-N`, `AES-N`) for records — not display names; resolve display names from the brief via `mcp__worldloom__find_named_entities(names)` BEFORE the first packet call to obtain the canonical `entity:<slug>` ids (a `seed_nodes=['<display-name>']` form returns `node_not_found` because no graph node carries the bare display name as an id). The assembler also enforces `task_header.harness_ceiling_chars` (default 60000 serialized JSON characters) with a `task_header.envelope_overhead_reserve_chars` reserve (default 4000) before returning inline. The packet delivers Kernel + seed-relevant CFs + named-entity neighbors + section context with completeness guarantees; whole-class INV/M firewall bodies come from the `list_records(... include_full_body=true)` loads above. **If the packet returns `delivery_status='persisted_with_summary'`** (full packet persisted, inline summary returned), returns `packet_incomplete_required_classes`, or has non-empty `truncation_summary.dropped_layers`, do not silently proceed: apply the fallback procedure in `references/world-state-prerequisites.md` §Context-packet-too-large fallback (reduce `seed_nodes` and retry when `response.details.retry_with.token_budget` is present; use inline `governing_summary`; batched `get_records` for known CF / M / INV id sets; `get_persisted_packet_slice` for structured persisted-packet recovery; singular `get_record` only for one-off or iterative follow-up; dossier-trace shortcut when `character_path` is provided). **Two key disciplines from that fallback procedure that the SKILL.md surface must surface explicitly so they are not lost when the operator follows the SKILL.md alone**: (a) STEP ORDERING — apply Step 1 (reduce `seed_nodes` and retry only when `response.details.retry_with.token_budget` is present; otherwise follow `response.details.fallback_advice`) BEFORE Step 2 (inline `governing_summary` + targeted `get_records` / `get_persisted_packet_slice` / dossier-trace shortcut); going directly to Step 2 without first attempting the seed reduction can mask the case where a slimmer seed set fits inline. (b) AUDIT-TRAIL LINE — when the fallback fires, record in the artifact's frontmatter `notes` field a one-line `Context-packet fallback: <which steps fired and what each recovered>` (e.g., `Context-packet fallback: Step 2 fired — packet returned persisted_with_summary; governing_summary plus batched get_records and dossier-trace shortcut from CHAR-<integer>.world_consistency recovered cited CF / M / INV coverage`). The Phase 9 deliverable's full-frontmatter inline is what surfaces this line for HARD-GATE review. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read. For specific record sets, use `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)`; use `mcp__worldloom__get_record(record_id)` for one-off retrieval. For domain-filtered CF lookups during Phase 3 / 7c, use `mcp__worldloom__search_nodes(node_type='canon_fact', filters=...)`. For named-entity binding during Phase 0 (resolve place / institution / audience names), use `mcp__worldloom__find_named_entities(names)` followed by `get_neighbors`. ONTOLOGY categories load via `Read worlds/<slug>/ONTOLOGY.md`; the world's tonal contract via `Read worlds/<slug>/WORLD_KERNEL.md` — both remain primary-authored at the world root.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first.

## Procedure

**Reference-load discipline**: each phase below directs you to `Load references/<phase>.md.`. This is **required, not advisory** — Read each phase-reference file via the Read tool before composing that phase's output. The Procedure §§ below are load-bearing summaries; the references contain the decision-rules for edge cases the summaries omit (Phase 0c cast-scoping rules, Phase 1 source-tag handling for `character_path` lifts, Phase 7c distribution-exception edge cases, Phase 8 Test 12 contested-canon adaptive-but-wrong flagging rules, etc.). Skipping a phase's reference risks producing wrong output on edge cases the SKILL.md body summarizes-but-omits. The same discipline applies to the §Governance load at the end.

### 1. Pre-flight

Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate the next artifact id: `mcp__worldloom__allocate_next_id(world_slug, 'DA')` → `DA-<integer>`. Load the context packet plus the whole-class INV / M Phase 7 firewall sets (per §World-State Prerequisites). Read `worlds/<slug>/ONTOLOGY.md` and `worlds/<slug>/WORLD_KERNEL.md` directly. Read the template `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` to anchor the frontmatter schema for the Phase 9 write.

Read `brief_path` once. If `character_path` is provided, verify it resolves inside `worlds/<world-slug>/characters/` (cross-world paths are rejected to prevent canon leakage) AND the target dossier exists; abort naming the path if either condition fails. Read the dossier; if it exceeds the Read tool's token limit, choose strategy by phase need: (1) **selective-read by structural anchors** (`^## `, `^character_id:`, frontmatter section heads) when only specific dossier sections are needed (Phase 1 epistemic-horizon transfer; Phase 7b/7c lookup of `wrongly_believes` / `cannot_know` / capability records); (2) **chunked offset+limit reads** (200–300 lines per chunk, advancing through the file) when full-dossier coverage is needed (Phase 0 15-field author lift; Phase 7c capability-gating audit across the dossier's full Capabilities section). Use (1) for targeted retrieval and (2) for exhaustive coverage; the choice is per-phase, not per-skill-invocation.

Derive `<da-slug>` from the artifact title per Phase 0a's slug rule (kebab-case, lowercase, punctuation-stripped, headline-portion 5–8 words). If the title is not yet known from the brief, defer slug derivation to the end of Phase 0.

If `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists, abort: "Artifact slug collision — supply a different title. This skill never overwrites an existing artifact."

### 2. Phase 0: Normalize Brief + Author Reality Construction

Load `references/phase-0-normalize-and-author.md`. Parse the brief's 7 HARD + 8 SOFT inputs; interview on unresolved HARD inputs; default-and-note SOFT inputs; bind HARD inputs to ENT / SEC-GEO / SEC-INS / SEC-PAS / SEC-TML records resolved through `find_named_entities` + `get_neighbors`. Lift the Author's 15-field profile from `character_path` if provided (run the chronology and back-projection audits when artifact-date differs from dossier-present); else generate from brief + retrieved world state with every field citing the record-id it sources from. Selectively expand the packet via `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` if the brief or generated claims touch magic / technology. Construct cast-at-artifact-scope (Phase 0c) for crew, dead comrades, named officials, or other figures the brief under-specifies, at author-personal-scope per Phase 7d.1; record each as a `scoped_references` frontmatter entry with `{name, relation, kind?, aliases?}` shape per `templates/diegetic-artifact.md`. Author-personal-scope only — `scoped_references` is NOT a vehicle for canon-creating new named entities (those go through the engine via `canon-addition`).

### 3. Phases 1-3: Claim Planning

Load `references/phases-1-3-claim-planning.md`. Build the Author's epistemic horizon (Phase 1: six source tags — `witnessed`, `learned_from_authority`, `inherited_tradition`, `common_rumor`, `contested_scholarship`, `impossible_for_narrator_to_verify` — including dossier-transfer when `character_path` is provided), apply in-world genre conventions (Phase 2), build the tagged claim list (Phase 3: `canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`, `adaptive_behavior_preserved_under_wrong_ontology`, `cf_id`, `mr_id`, `repair_trace`).

### 4. Phases 4-6: Text Composition

Load `references/phases-4-6-text-composition.md`. Embed material and social texture citing the SEC records it draws from (Phase 4), apply bias and distortion baked into the composition (Phase 5), draft the artifact body as continuous in-world prose with prohibited claims absent (Phase 6).

### 5. Phase 7: Canon Safety Check

Load `references/phase-7-canon-safety-check.md`. Run all five sub-phases — 7a invariant conformance (against every INV record retrieved via `list_records(record_type='invariant_record', include_full_body=true)`), 7b Mystery Reserve firewall (M records retrieved via `list_records(record_type='mystery_record', include_full_body=true)` or `get_firewall_content(world_slug)`, recording every checked M-id into `world_consistency.mystery_reserve_firewall`, overlap or not), 7c distribution/scope conformance against capability and world-fact CFs, 7d four diegetic-safety rules, 7e World-Truth + Narrator-Truth discipline. Any failure routes to Phase 7f Repair Sub-Pass; unrepairable failures loop back to Phase 0.

### 6. Phase 8: Validation and Rejection Tests

Load `references/phase-8-validation-tests.md`. Run all 12 tests and record each as PASS / FAIL with a one-line rationale into the Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS with rationale.

### 7. Phase 9: Commit

Present the deliverable summary to the user:
1. Full frontmatter — inline complete (it's the metadata audit surface). **Oversize-frontmatter fallback**: if the assembled frontmatter exceeds ~10KB serialized (typical when `author_profile` is dossier-lifted and dense, or when `epistemic_horizon` and `claim_map` are large), inline the always-required-inline subset (`artifact_id`, `slug`, `title`, `artifact_type`, `statement_of_existence`, `author`, `author_character_id`, `date`, `place`, `audience`, `communicative_purpose`, `desired_relation_to_truth`, `world_relation`, the four `world_consistency` arrays, `source_basis`, `notes`) plus a pointer to the persisted plan envelope path (e.g., `/tmp/<plan-id>.json` carrying the full `payload.da_record`) for the larger fields (`author_profile`, `epistemic_horizon`, `claim_map`, `canon_links`, `cannot_know`, `genre_conventions`, `scoped_references`). The HARD-GATE response is summary-plus-pointer for oversize frontmatter, not literal-full-content — but the always-required-inline subset is the audit surface the user reviews to decide HARD-GATE approval and must never be pushed behind the pointer.
2. Artifact body text (the in-world text). If the body exceeds ~10KB, point the user to the working file path (e.g., `/tmp/<da-slug>-body.md`) for full review rather than inlining the entire body, and include a one-or-two-sentence per-genre-section summary in the HARD-GATE response (e.g., for a chronicle: opening / middle-Layer events / closing; for a sermon: text / exegesis / exhortation; for a manual: each procedural section). The HARD-GATE response is summary-plus-pointer for oversize bodies, not literal-full-content.
3. Canon Safety Check Trace (Phase 7a-7e results + Phase 8 12-test results with rationales)
4. Phase 7f canon-safety repair sub-passes that fired (if any), each framed as "preserved: <brief intent> / sacrificed: <what was retagged, rescoped, moved, or removed>"
5. Phase 6 chronology-coherence revisions that fired (if any) — back-projection consequences during composition, categorically distinct from Phase 7f canon-safety repairs; each framed in the same preserved/sacrificed shape (see `references/phase-0-normalize-and-author.md` §Back-projection math for the rule)
6. `world_consistency` audit fields: `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`
7. Target write paths: `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` and `worlds/<world-slug>/diegetic-artifacts/INDEX.md`

**HARD-GATE fires here**: no patch plan submits and no INDEX.md edit happens until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and abort (no file written).

On approval, set `source_basis.user_approved: true`, then commit in two engine-aware steps:

1. **Engine-routed artifact write.** Before assembly, call `mcp__worldloom__describe_envelope_schema(op_kind='append_diegetic_artifact_record')` once to confirm the current envelope schema and payload-shape contract — this surfaces strict-pattern enforcement on `world_consistency` arrays, the `payload.{da_record, body_markdown, filename}` discipline, and the `expected_id_allocations.da_ids: ["DA-<integer>"]` requirement. Then assemble a single-op patch plan: `append_diegetic_artifact_record` with `payload.da_record` carrying the full frontmatter, `payload.body_markdown` carrying the prose body + Canon Safety Check Trace, `target_file: "diegetic-artifacts/<da-slug>.md"`, `payload.filename: "<da-slug>.md"`. Use `verdict: "diegetic_artifact_create"` as the canonical envelope-verdict value for this skill. **YAML→JSON conversion**: when working from a draft markdown file (YAML frontmatter + markdown body), parse the frontmatter YAML to a JSON object before embedding in `payload.da_record` — the schema requires a parsed object, not a YAML string. A small Node helper using `require('yaml').parse()` on the frontmatter region is the typical idiom for >50KB envelopes (where the CLI submit path is mandatory and inline construction in the assistant message is impractical). **YAML colon-space pitfall**: long unquoted frontmatter scalars containing `: ` (colon followed by space) — common in Phase 0 binding-justification register (e.g., `field: Value (per brief: "..."` or `field: Value (per CF-<integer>: ...)`) — fail strict YAML parsing as `BLOCK_AS_IMPLICIT_KEY: Nested mappings are not allowed in compact mappings`. To avoid this, either (a) write the draft frontmatter using double-quoted strings or `>-` / `|` block-scalar form for any value containing `: `, OR (b) skip YAML parsing and construct `da_record` directly as a JS object literal in the build helper (the `body_markdown` still comes from the draft via the second `---` split). Option (b) is the typical fallback when the draft already exists with unquoted scalars. Persist the plan envelope (e.g., `/tmp/<plan-id>.json`); invoke the canonical signer (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token); call `mcp__worldloom__submit_patch_plan(plan, approval_token)`. **Submit-path selection by envelope size**: for artifact envelopes >50KB (typical of full-prose artifacts), submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent - same engine code, same `PatchReceipt`, same failure-mode codes - but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass). The engine atomically writes the hybrid file at the resolved path and validates the frontmatter against `record_schema_compliance`. **Failure-mode response**: on `approval_expired`, re-sign and resubmit; on `approval_replayed`, do NOT resubmit (the prior submit already applied). On `index_stale`, the engine detected that the world index has diverged from on-disk content, typically because a direct-`Edit` to hybrid-file frontmatter was not followed by an index sync. The response's `detail.divergent_files[].file_path` names the divergent files. Run `node tools/world-index/dist/src/cli.js sync <world-slug>` to refresh the index, then resubmit the patch plan with the same approval token if it has not expired. On `validator_failed`, inspect `detail.verdicts[].location.file`: if the cited file is the new artifact, the schema violation is in this skill's output - fix and resubmit; **if the cited file is unrelated existing world state (any path other than the new artifact), pause and escalate to the user - this canon-reading skill must not silently modify other canon-adjacent files. Hook 3 does not block hybrid-file frontmatter edits, so the discipline is prescriptive.** After any user-authorized direct-`Edit` to any indexed canon record — atomic `_source/<subdir>/*.yaml` files OR hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (both surfaces are under `record_schema_compliance` validator scope) — run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting; the validator runs against the indexed world state, not against on-disk content. Atomic `_source/` direct-Edits are normally Hook-3-blocked, so this case applies specifically when the user bypasses Hook 3 to fix pre-existing world-state issues surfaced by the engine's pre-apply validators (e.g., a pre-existing schema violation in an unrelated mystery-reserve or canon record cited at `validator_failed.detail.verdicts[].location.file`). INDEX.md edits do not require sync (not under validator scope). **Warning-level signals.** The CLI submit can also print non-blocking warnings during index sync — most commonly `Warning: skipped schema-failed record <path> ... reason=<code>` lines surfacing pre-existing world-state drift unrelated to the new artifact (e.g., a pre-existing CH record missing its `id` field; a pre-existing story-bundle record whose id violates the class regex; a pre-existing record with stale schema). These do NOT block the patch — the engine returns a successful `PatchReceipt`. They MUST be surfaced in the final report alongside the success message, naming each warning verbatim and the path it cites; they signal pre-existing drift that downstream skills (`continuity-audit`, `world-validate`) should address. The canon-reading skill must NOT silently fix them — fixing unrelated world state from this skill is the same canon-adjacent-modification anti-pattern the `validator_failed` rule above forbids. The `worlds/<slug>/_index/world.db.skipped_records.log` path the CLI prints is the operator's audit trail for which drift the engine flagged across runs.
2. **INDEX.md update.** `Read` existing `worlds/<world-slug>/diegetic-artifacts/INDEX.md` (create with header `# Diegetic Artifacts — <World-Slug-TitleCased>` followed by one blank line if absent), append or replace the artifact's line in the form `- [<title>](<slug>.md) — <artifact_type>, <date>, <author>, <place>` (see §Output for field-style guidance — prefer short forms in INDEX fields, with long descriptive context in frontmatter `statement_of_existence`), re-sort alphabetically by slug, write back via direct `Edit` (Hook 3's hybrid-file allowlist permits `diegetic-artifacts/INDEX.md`).

The artifact-first ordering means a partial-failure state has an artifact without an index entry — easy to detect (grep INDEX.md for the slug). **Recovery is manual**: because the Pre-flight slug-collision abort stops any re-run, re-running the skill with the same slug will NOT update the index. To recover, the operator must either (a) manually append the INDEX.md line in the format above, or (b) delete the orphaned artifact and re-run from Phase 0. The inverse partial-failure state (index entry pointing to a non-existent artifact) requires the same manual approach.

Report all written paths. Do NOT commit to git.

## Governance

Load `references/canon-rules-and-foundations.md` for the Validation Rules This Skill Upholds (Rule 2 / 3 / 4 / 7 phase citations), the complete FOUNDATIONS Alignment table, the Record Schemas, and the rationale for the contested-canon posture.

## Hard Rules

- **HARD-GATE is absolute** (see top of file). No `submit_patch_plan` and no `Edit` of `diegetic-artifacts/INDEX.md` until Phase 7 + Phase 8 pass clean and the user approves the Phase 9 deliverable. Auto Mode does not override — skill invocation is not deliverable approval.
- **Engine-only writes for the artifact file.** The new `<da-slug>.md` lands via `append_diegetic_artifact_record` through `submit_patch_plan`. Direct `Write` to `worlds/<slug>/diegetic-artifacts/<da-slug>.md` is forbidden; the engine performs the atomic write and the schema check.
- **Never write world-level canon records.** This skill never emits CF / CH / INV / M / OQ / ENT / SEC records. Direct `Edit` / `Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. The artifact's claims are in-world assertions, not canon; the artifact may cite, distort, or circulate accepted CFs, but its statements become world truth only through later `canon-addition` acceptance.
- **Never write to the `characters/` sibling directory.** An artifact may reference an existing character via `character_path` but does not create, modify, or annotate dossiers. If Phase 0b's author-generation reveals a character worth committing as a reusable dossier, that is a separate `character-generation` run.
- **Cross-world `character_path` is rejected at pre-flight.** Canon leakage across worlds is a pre-flight abort, not a runtime check.
- **Never overwrite an existing artifact.** Pre-flight slug-collision aborts; the engine's `file_already_exists` check is the second backstop. The diegetic-artifact ledger is append-only by construction.
- **Phases 1 / 3 / 7b are the three Rule 7 enforcement points.** A future phase that exposes the artifact to Mystery Reserve content must either extend the firewall audit or be explicitly classified out-of-scope (documented in `notes`).
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A diegetic artifact is not committed until the Author is bound to the world, every claim has a truth-status tag and a source provenance, every forbidden answer has been firewalled, every asserted capability or world-fact claim respects its CF distribution, the text reads as a voice from within the world rather than an encyclopedia entry in disguise, and the user has approved the complete deliverable — and once committed (the engine atomically writes the hybrid file under its `file_already_exists` backstop), the artifact is treated as existing diegetic state that this skill will refuse to overwrite.
