---
name: branching-story-bootstrap
description: "Use when starting a new branching story bundle inside an existing worldloom world — a premise + a selected cast (drawn from the world's characters/INDEX.md) + tone and content constraints. Produces: a story bundle at worlds/<world-slug>/stories/<story-slug>/ — STORY_KERNEL.md + atomic-YAML causal-engine ledgers under _source/ (entities, facts, events, obligations, threads, intentions, storylets, branches, pages, choices, plus story-local relationships, locations, objects, consequences, artifacts) + the rendered root page (PG-0001) and its first 4-6 generated choices + a seed storylet pool. Mutates: only worlds/<world-slug>/stories/<story-slug>/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/<world-subdir>/*.yaml record); writes worlds/<world-slug>/stories/INDEX.md on first invocation per world (idempotent append on subsequent runs)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: story_slug
    description: "Kebab-case slug for the new story bundle. Pre-flight aborts if worlds/<world-slug>/stories/<story-slug>/ already exists — this skill never overwrites an existing bundle."
    required: true
  - name: premise_path
    description: "Path to a markdown file containing the user's premise (genre, tonal register, intended scale, opening situation, implied threads/obligations/cast tensions). Required unless `premise` is provided inline."
    required: false
  - name: premise
    description: "Inline premise text. Required unless `premise_path` is provided. If both are provided, `premise_path` wins."
    required: false
  - name: cast_bind_list
    description: "Comma-separated list of CHAR-NNNN ids drawn from worlds/<world-slug>/characters/INDEX.md. Pre-flight verifies every id exists. At least one CHAR is required; the protagonist must be among them."
    required: true
  - name: intended_scale
    description: "One of: one_shot | chapter | arc | open_ended. Recorded in STORY_KERNEL.md and used by Phase 6 storylet-pool sizing."
    required: true
  - name: tone_constraints
    description: "Free-form prose hints. Optional."
    required: false
  - name: themes
    description: "Comma-separated theme tags. Optional."
    required: false
  - name: content_intensity_baseline
    description: "One of: tame | mature | explicit. Default: mature. Routing tag for storylet/page selection — never a censor (the content_policy block is NC-21 by skill contract)."
    required: false
  - name: pov_mode
    description: "One of: single | rotating | omniscient. Default: single."
    required: false
  - name: language_register
    description: "Register hints (formal / colloquial / mixed). Optional."
    required: false
  - name: seed_threads
    description: "User-named active narrative threads to install at bootstrap. Optional — Phase 5 derives threads from premise if absent."
    required: false
  - name: seed_obligations
    description: "User-named promises to install at bootstrap. Optional — Phase 5 derives from premise if absent."
    required: false
  - name: storylet_pool_seed_size
    description: "Number of seed storylets in Phase 6. Default: computed from `intended_scale` + state complexity (see `references/phase-6-storylet-pool-seed.md` §Computing target_pool_size). Setting this argument explicitly overrides the formula."
    required: false
  - name: epe_card_filter
    description: "Comma-separated EPE-NNNN ids from worlds/<world-slug>/pressure-events/ to consume as initial thread / obligation seeds. Optional."
    required: false
  - name: execution_mode
    description: "One of: authoring (default) | interactive_runtime | batch_generation. Recorded on STORY_KERNEL.md as execution_mode_default for downstream runtime page-cycle. Bootstrap is always an authorial act regardless of mode — HARD-GATE always fires."
    required: false
---

# Branching Story Bootstrap

Bootstraps a new branching story bundle inside an existing worldloom world from a user premise + a selected cast + tone and content constraints, producing a fully initialized story directory with causal-engine ledgers, a rendered root page (PG-0001), 4-6 initial choices, and a scale-aware seed storylet pool.

<HARD-GATE>
Do NOT write any file under `worlds/<world-slug>/stories/<story-slug>/` and do NOT `Edit` `worlds/<world-slug>/stories/INDEX.md` until: (a) Pre-flight resolves `worlds/<world-slug>/`, allocates the next `STORY-NNN` via `mcp__worldloom__allocate_next_id`, verifies `worlds/<world-slug>/stories/<story-slug>/` does not already exist, validates every `CHAR-NNNN` in `cast_bind_list` against `worlds/<world-slug>/characters/INDEX.md`, loads `docs/FOUNDATIONS.md` into working context (the Validation Rules that govern Phase 4 firewall + INV audit, Phase 5 obligation discipline, and Phase 9 storylet-diversity / consequence-capacity gates all live there; CLAUDE.md §Non-Negotiables explicitly forbids skipping this load), and confirms the content_policy block is loaded for downstream prompt assembly; (b) Phase 4 Mystery Firewall + Invariant Audit passes with zero `forbidden`-status M resolutions and zero unresolvable INV tensions; (c) Phase 9 Validation Gates record PASS with a one-line rationale for every gate (mystery firewall, invariant compatibility, content policy presence, ID uniqueness, branch path consistency, cast intention coverage, obligation salience, epistemic class declared, storylet diversity, prose ledger consistency, choice consequence-capacity, state_snapshot completeness, recursive reference closure), AND Phase 9.5's 10 discipline checks record PASS with a one-line rationale; (d) the user has explicitly approved the Phase 10 deliverable summary (designing principle, cast/threads/mysteries-in-play summary, opening prose preview, CHC labels, firewall verdicts, target write paths). The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable.
</HARD-GATE>

## Process Flow

```
Pre-flight (resolve worlds/<world-slug>/; allocate STORY-NNN via
            allocate_next_id; slug-collision
            check on stories/<story-slug>/; validate cast_bind_list
            against characters/INDEX.md; load content_policy block;
            assemble retrieval load — context_packet for premise-relevant
            world state + whole-class M-record load + whole-class
            INV-record load)
      |
      v
Phase 1: Premise Normalization        (genre/tonal register, designing
                                       principle, central dramatic question,
                                       POV mode, content_intensity baseline,
                                       implied threads/obligations/cast
                                       tensions/locations/period)
      |
      v
Phase 2: Cast Binding                 (mirror each CHAR into STENT-NNNN;
                                       create initial STINT-0001 per major
                                       (bare-numeric id; stent_id points to
                                       the story entity this snapshot drives;
                                       world_character_id is the world CHAR
                                       anchor or null for story-only cast);
                                       story-only entities)
      |
      v
Phase 3: World-Fact Import            (import CFs touching cast/location/
                                       period as SF-NNNN with derived_from_cf,
                                       certainty, known_by, epistemic_class;
                                       create premise-specific SFs with
                                       canon_relation: not_applicable)
      |
      v
Phase 4: Mystery Firewall +           (declare mysteries_in_play[] in
         Invariant Audit               STORY_KERNEL; hard reject
                                       forbidden-status M resolutions;
                                       run premise + threads + obligations
                                       against every INV record;
                                       hard reject unresolvable tensions)
      |
      v
Phase 5: Initial Threads +            (2-5 THR-NNNN — main + relationship +
         Obligations                   optional threat/mystery-edge/subthread;
                                       initial OBL-NNNN per thread with
                                       salience + urgency + ≥2 payoff_modes;
                                       initialize consequences ledger)
      |
      v
Phase 6: Storylet Pool Seed           (delegated to storylet-pool-authoring
                                       seed mode with focus_area:
                                       bootstrap_mix and
                                       parent_skill_invocation: true and
                                       pre-allocated target_slt_ids[];
                                       returns approved SLTs with final ids
                                       in memory)
      |
      v
Phase 7: Root Page Render             (select PG-0001 storylet;
                                       assemble LLM prompt with content_policy
                                       verbatim + world context + story
                                       kernel + prose craft contract verbatim +
                                       selected storylet + cast + state context;
                                       render prose; post-render prose critic
                                       (7 axes against the contract) + cross-
                                       check; up to 3 re-prompts shared budget)
      |
      v
Phase 7.5: Visible Affordance         (parse rendered PG-0001 prose for
           Extraction                  visible objects/actors/locations/
                                       tensions; map each to state id;
                                       ungrounded → re-prompt Phase 7;
                                       grounded → feed to Phase 8 as
                                       additional anchors)
      |
      v
Phase 8: Initial Choice Generation    (4-6 CHC-NNNN — main thread engagement,
                                       relationship engagement, OBL
                                       engagement, less-obvious path,
                                       diversification; consequence-capacity
                                       check)
      |
      v
Phase 9: Validation Gates             (12 gates — see HARD-GATE; each PASS
         (Canon Safety Check phase)    with one-line rationale; FAIL routes
                                       to responsible phase)
      |
      v
Phase 9.5: Bootstrap Discipline       (10 soft-required-field checks
           Validator                    outside the FOUNDATIONS-anchored
                                        12-gate set; PASS-with-rationale
                                        into discipline_validation_trace;
                                        FAIL routes to responsible phase)
      |
      v
Phase 10: HARD-GATE Approval          (deliverable summary: designing
                                       principle + cast/threads/
                                       mysteries-in-play + opening prose
                                       preview + CHC labels + firewall
                                       verdicts + target paths;
                                       --user options-->
                                       ACCEPT / REVISE-narrow /
                                       REVISE-re-render / REVISE-different
                                       opening / REJECT)
      |
   accept
      |
      v
Phase 11: Commit / Engine Submit      (create
                                       stories/<story-slug>/ tree;
                                       write markdown root/prose/index files
                                       directly; submit all
                                       _source/<class>/<ID>.yaml records
                                       through the patch engine,
                                       pages-prose/PG-0001.md,
                                       stories/<story-slug>/INDEX.md;
                                       append/create
                                       stories/INDEX.md per-world index;
                                       NO git commit)
```

## Output

### Story bundle structure (staged commit - engine YAML transaction + sequenced markdown writes)

```
worlds/<world-slug>/stories/<story-slug>/
├── STORY_KERNEL.md
├── _source/
│   ├── entities/             ← STENT-NNNN.yaml
│   ├── facts/                ← SF-NNNN.yaml (epistemic_class declared)
│   ├── events/               ← SE-NNNN.yaml
│   ├── obligations/          ← OBL-NNNN.yaml
│   ├── consequences/         ← CNSQ-NNNN.yaml (NOT emitted at default bootstrap; .gitkeep preserves directory; runtime page-cycle JIT-creates)
│   ├── threads/              ← THR-NNNN.yaml
│   ├── relationships/        ← SREL-NNNN.yaml
│   ├── intentions/           ← STINT-NNNN.yaml (bare-numeric id per the patch engine's `^STINT-\d{4}$` contract; per-character semantics carried via the record's `stent_id` field, with `world_character_id` as the optional world CHAR anchor; legacy bundles may contain suffixed-id files like `STINT-0001-iker.yaml` predating this convention — those remain valid only for those bundles, new bundles MUST use bare-numeric ids per the engine regex)
│   ├── storylets/            ← SLT-NNNN.yaml (provenance.origin=bootstrap_seed)
│   ├── locations/            ← STLOC-NNNN.yaml
│   ├── objects/              ← STOBJ-NNNN.yaml
│   ├── artifacts/            ← DA-NNNN.yaml (story-local; distinct from world DA)
│   ├── branches/             ← BR-0001.yaml
│   ├── pages/                ← PG-0001.yaml
│   └── choices/              ← CHC-NNNN.yaml
├── pages-prose/              ← PG-0001.md
└── INDEX.md
```

### Per-world index (idempotent)

`worlds/<world-slug>/stories/INDEX.md` — created on first invocation per world; appended/replaced thereafter. One line per story bundle in the form:

```
- [STORY-NNN] <story-slug> — <designing-principle one-liner> | cast: CHAR-NNNN, CHAR-NNNN | mysteries_in_play: M-N, M-N | execution_mode: <mode> | created: <iso8601>
```

### No canon-file mutations

This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted. If the user later wants to promote a story-local SF / STENT / DA to world canon, that is a separate `story-fact-promotion-to-canon` run — not this skill's responsibility.

### Record schemas

Inlined in this skill's templates and backed by story-bundle patch-engine ops / record-schema validators for `_source/<class>/*.yaml` records:

- STORY_KERNEL.md → `templates/story-kernel.md`
- STENT-NNNN, SF-NNNN, SE-NNNN, OBL-NNNN, CNSQ-NNNN, THR-NNNN, SREL-NNNN, STINT-NNNN, STLOC-NNNN, STOBJ-NNNN, BR-NNNN, PG-NNNN, CHC-NNNN → `templates/story-records.yaml` (one document per record class with required+optional field enumeration and example values)
- SLT-NNNN → `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (bootstrap delegates Phase 6 to storylet-pool-authoring and writes the returned records in Phase 11)
- DA-NNNN (story-local) → derived from world-level DA frontmatter shape with `story_id` field added; documented in `templates/story-records.yaml`.
- Per-bundle INDEX.md → `templates/story-bundle-index.md`
- Content policy block (NC-21 verbatim) → `templates/content-policy.txt`

## Procedure

1. **Pre-flight + World-State Prerequisites.** Run preconditions and load all world-state inputs. Load `references/pre-flight-and-prerequisites.md`. Abort the bootstrap on any precondition failure (missing world, slug collision, missing CHAR, missing EPE, etc.).
2. **Phases 1-3: Premise Normalization, Cast Binding, World-Fact Import.** Convert the premise into a design brief, mirror the cast into STENT/STINT records, and import relevant world CFs as story-local SFs with declared `epistemic_class`. Load `references/phases-1-3-premise-cast-facts.md`.
3. **Phase 4: Mystery Firewall + Invariant Audit.** Hard-reject any `forbidden`-status M resolution; audit premise + cast + sketched threads/obligations against every INV's `break_conditions`. Load `references/phase-4-firewall-and-invariant-audit.md`.
4. **Phase 5: Initial Threads + Obligations.** Emit 2-5 THR records, initial OBL records per thread (Rule 5 halt: salience + urgency + ≥2 payoff_modes mandatory), and initialize the consequences ledger. Load `references/phase-5-threads-and-obligations.md`.
5. **Phase 6: Storylet Pool Seed.** Compute `target_pool_size`, pre-allocate `target_slt_ids[]`, then delegate to `storylet-pool-authoring` (`mode: seed`, `focus_area: bootstrap_mix`, `parent_skill_invocation: true`, `target_slt_ids[]`); the sub-routine returns approved SLT records with final ids in memory for Phase 11 to write. Load `references/phase-6-storylet-pool-seed.md`.
6. **Phase 7: Root Page Render.** Select the PG-0001 storylet, assemble the content_policy-first LLM prompt with the Prose Craft Contract embedded, render the opening prose, run the deterministic post-LLM cross-check, and emit page-cycle-compatible PG-0001 + BR-0001 + SE-0001 records into the working buffer. Load `references/phase-7-root-page-render.md`.
7. **Phase 7.5: Visible Affordance Extraction.** Parse the Phase 7 prose buffer for visible affordances; map each to a state id; route ungrounded affordances back to Phase 7 as re-prompt triggers; feed the Visible Affordance Map to Phase 8. Load `references/phase-7-5-visible-affordance-extraction.md`.
8. **Phase 8: Initial Choice Generation.** Delegate to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) with `PG-0001.state_snapshot`, the selected root storylet's `choice_templates`, and the Phase 7.5 Visible Affordance Map as anchors; emit 4-6 CHC records satisfying the diversification + consequence-capacity contract; populate `PG-0001.emitted_choices`. Load `references/phase-8-choice-generation.md`.
9. **Phase 9: Validation Gates (Canon Safety Check phase).** Run all 12 gates; each must record PASS with a one-line rationale into `STORY_KERNEL.md.validation_trace`. Any FAIL halts and routes to the responsible phase. Load `references/phase-9-validation-gates.md`.
9.5. **Phase 9.5: Bootstrap Discipline Validator.** Run all 10 discipline checks; each must record PASS with a one-line rationale into `STORY_KERNEL.md.discipline_validation_trace`. Any FAIL halts and routes to the responsible upstream phase. Load `references/phase-9-5-bootstrap-discipline-validator.md`.
10. **Phase 10: HARD-GATE Approval.** Inline below.
11. **Phase 11: Commit / Engine Submit.** Inline below.

## Phase 10: HARD-GATE Approval

Present the deliverable summary to the user:

```
PROPOSED STORY BUNDLE: <story_slug> in <world_slug>

STORY-NNN: STORY-<allocated id>
Designing principle: <one sentence>
Cast: <list of STENT with role_in_story>
Mysteries in play: <list of M-NNNN with status + future_resolution_safety>
Threads: <list of THR with type + status + current_pressure>
Initial obligations: <count by salience tier>
Storylet pool: <count> seed storylets covering <shapes>

OPENING PROSE PREVIEW:
<first ~300 words of PG-0001.md from the working buffer>

CHOICES OFFERED:
1. <CHC-NNNN label>
2. <CHC-NNNN label>
...
N+1. (write your own)

FIREWALL VERDICTS:
- Mystery firewall (gate 1): PASS — <rationale>
- Invariant compatibility (gate 2): PASS — <rationale>
- Content policy (gate 3): embedded
- Bootstrap discipline (Phase 9.5): PASS — <rationale>
- Branch isolation (gate 12): structural

TARGET WRITE PATHS:
- worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md
- worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml
  (<count> records across 14 subdirectories)
- worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-0001.md
- worlds/<world-slug>/stories/<story-slug>/INDEX.md
- worlds/<world-slug>/stories/INDEX.md (per-world; create or append)
```

User options:

- **ACCEPT** → proceed to Phase 11.
- **REVISE — narrow** → user adjusts cast / threads / obligations / tone; restart from the affected phase.
- **REVISE — re-render prose** → re-run Phase 7 with constraint feedback inline (re-prompt counter resets).
- **REVISE — different opening storylet** → re-run Phase 7 with a different storylet selection (next-best by score).
- **REJECT** → no writes; halt the bootstrap.

**HARD-GATE fires here**: no file is written until the user explicitly ACCEPTs. Auto Mode does not override.

## Phase 11: Commit / Engine Submit

Directory setup plus a patch-engine transaction for atomic YAML records, followed by direct markdown writes. The phase is a staged commit, not a single all-or-nothing transaction: the engine envelope is atomic for `_source/<class>/*.yaml` records, but the surrounding markdown writes (`STORY_KERNEL.md`, `pages-prose/PG-0001.md`, per-bundle `INDEX.md`, per-world `INDEX.md`) are sequential and recoverable per the partial-failure note below. File order matters — the per-world INDEX.md is the LAST direct write so partial failure leaves the per-world index unmutated:

1. `mkdir -p worlds/<world-slug>/stories/<story-slug>/_source/{entities,facts,events,obligations,consequences,threads,relationships,intentions,storylets,locations,objects,artifacts,branches,pages,choices}` and `worlds/<world-slug>/stories/<story-slug>/pages-prose`. Touch a `.gitkeep` in any `_source/<class>/` subdirectory that does NOT receive a record at this bootstrap (typically `consequences/`, `objects/`, `artifacts/` — runtime page-cycle JIT-creates records here). The `.gitkeep` files preserve the directory tree under `git add` so the runtime page-cycle can JIT-write into the structurally-expected paths without first having to recreate the subdirectories.
2. `Write worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` (premise + content_policy preamble verbatim + designing principle + cast bind list + themes + content_intensity baseline + POV mode + central dramatic question + `mysteries_in_play[]` + `invariants_acknowledged[]` + `execution_mode_default` + `validation_trace` + STORY-NNN frontmatter; template at `templates/story-kernel.md`).
3. Submit one patch-plan envelope containing `create_stent_record`, `create_sf_record`, `create_se_record`, `create_obl_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_br_record`, `create_pg_record`, `create_chc_record`, and `create_slt_record` ops for each default `_source/<class>/<ID>.yaml` record. CNSQ records (`create_cnsq_record`) and story-local diegetic artifact records (`append_story_diegetic_artifact_record`) are emitted ONLY when the premise establishes a pre-PG-0001 consequence or a story-local diegetic artifact present at bootstrap; otherwise omit both those ops and their `expected_id_allocations` keys. Schemas at `templates/story-records.yaml` and the storylet template. **Submit-path convention** — see [`references/engine-envelope-shape.md`](references/engine-envelope-shape.md) for the canonical envelope shape (§1-§3), the `approval_token` signing CLI (§4), validate / submit path selection by envelope size (§5), and failure-mode response codes (§6). Bootstrap envelopes are typically ~75 ops / 100KB-200KB JSON — large enough that the CLI submit path (`node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` after `sign-approval-token.js`) is the default rather than `mcp__worldloom__submit_patch_plan`'s inline path. Use `mcp__worldloom__validate_patch_plan` (or the CLI equivalent) before signing — the validator catches schema and rule errors without mutating state, shortening the diagnose-and-fix loop. **Schema-exemplar tip**: if the world has an existing story bundle under `worlds/<world-slug>/stories/`, reading one record per class from that bundle (e.g., `worlds/<slug>/stories/<existing-bundle>/_source/entities/STENT-0001.yaml`, `.../facts/SF-0001.yaml`, `.../pages/PG-0001.yaml`, etc.) provides complete worked schema examples that complement the abstract `templates/story-records.yaml` reference. Bundle-scoped IDs are independent across bundles, so reading one bundle's record at id N does not conflict with allocating the same id N in the new bundle.
4. `Write worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-0001.md` (the rendered opening prose from Phase 7's working buffer).
5. `Write worlds/<world-slug>/stories/<story-slug>/INDEX.md` (per-bundle index — branches / leaves / threads / mysteries / storylet-shape distribution; template at `templates/story-bundle-index.md`).
6. **Per-world index** at `worlds/<world-slug>/stories/INDEX.md`:
   - If file does not exist: create with header `# Stories — <World-Slug-TitleCased>` followed by one blank line, then the story line.
   - If file exists: read; append the new story's line in the format `- [STORY-NNN] <story-slug> — <designing-principle one-liner> | cast: CHAR-NNNN, CHAR-NNNN | mysteries_in_play: M-N, M-N | execution_mode: <mode> | created: <iso8601>`; re-sort alphabetically by `STORY-NNN`; write back via direct `Edit`.
   - `worlds/<world-slug>/stories/INDEX.md` is NOT under `_source/`, so Hook 3 does not block direct `Write` / `Edit`.

Direct `Write` is forbidden for story-bundle `_source/<class>/*.yaml` records. Hook 3 now covers `worlds/<slug>/stories/<slug>/_source/...`; story YAML writes must route through story-bundle patch-engine ops. `STORY_KERNEL.md`, page prose, per-bundle `INDEX.md`, and `stories/INDEX.md` remain direct markdown writes.

**Partial-failure recovery**: if patch-engine submission fails, no `_source` YAML should land; report the engine error and do not write page prose or indexes. If a later markdown write fails, the user receives the failure with the specific path and instruction to either manually clean up the partial bundle or repair the markdown surface. The per-world INDEX.md write at step 6 is intentionally LAST so a partial bundle never appears in the per-world index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

## Record Schemas

See Output §Record schemas above for the full mapping. This skill emits no Canon Fact Records or Change Log Entries — explicit N/A in the FOUNDATIONS Alignment table at `references/governance-and-foundations.md`.

## FOUNDATIONS Alignment and Guardrails

Full per-Rule mapping and the complete Guardrails list live in `references/governance-and-foundations.md`. Load that reference for any audit-trail inspection. Load-bearing guardrails kept inline:

- **HARD-GATE is absolute** (top of file). No file is written until Phase 9 records 12 PASSes with rationale AND the user explicitly approves the Phase 10 deliverable summary. Auto Mode does not override.
- **Never write world-level canon.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter.
- **Never overwrite an existing story bundle.** Pre-flight slug-collision aborts when `worlds/<world-slug>/stories/<story-slug>/` exists.
- **Story-bundle YAML writes are engine-routed.** Direct `Write` to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` is forbidden by Hook 3 — use `mcp__worldloom__submit_patch_plan` with story-bundle create ops after HARD-GATE approval.
- **Content policy is a contract, not a setting.** The NC-21 block in `templates/content-policy.txt` is embedded verbatim in STORY_KERNEL.md AND prepended to every Phase 7 LLM prompt. `content_intensity_baseline` is a routing tag, never a censor.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews the diff and commits.

## Final Rule

A story bundle is not bootstrapped because PG-0001's prose is rendered. It is bootstrapped only when the causal-engine ledgers are populated (entities, facts with declared epistemic class, events, obligations with ≥2 payoff modes, consequences ledger initialized, threads, relationships, intentions, storylets with shape diversity, locations, objects, branches, pages, choices), the cast has intentions, the storylet pool has shape diversity, the choices have continuation paths, the firewall is intact, the root branch (BR-0001) record exists, the recursive-reference-closure rule is satisfied at PG-0001, and the user has explicitly approved the Phase 10 deliverable. The runtime page-cycle inherits this state — if any of the above is missing, the runtime cannot honor wild user choices coherently, and that is the entire reason this pipeline exists.
