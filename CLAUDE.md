# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Worldloom is a **prose-and-YAML worldbuilding pipeline**, not a software project. There is no build, lint, or test runner — the "code" is the skills in `.claude/skills/` and the content they produce under `worlds/<world-slug>/`. Every workflow runs through Claude Code skills; invoke them via the `Skill` tool (or `/<slug>` slash command). Output is files on disk — read them to verify.

## Authoritative Source of Truth

`docs/FOUNDATIONS.md` is the **non-negotiable design contract**. It defines Canon Layers (hard / derived / soft / contested / mystery-reserve), the thirteen mandatory world concerns and their storage form (see §Mandatory World Files for the atomic-source classification per SPEC-13), the Canon Fact Record (`CF-NNNN`) and Change Log Entry (`CH-NNNN`) schemas, the Seven Validation Rules, and the §Canonical Storage Layer contract. Skills load it automatically in their pre-flight checks; if a workflow doesn't, the workflow is incomplete.

## Repository Layout

```
docs/FOUNDATIONS.md              ← project-wide design contract (read-only in normal flow)
docs/WORKFLOWS.md                ← how to invoke each skill
docs/HARD-GATE-DISCIPLINE.md     ← HARD-GATE execution pattern and partial-failure semantics
docs/plans/                      ← design docs output by the brainstorm skill
.claude/skills/<slug>/           ← runnable skills; each has SKILL.md + optional templates/references/
tools/                           ← machine-facing layer (compiled dist/ gitignored)
  ├── world-index/               ← SQLite-backed index builder + CLI
  ├── world-mcp/                 ← retrieval MCP server + context packets
  ├── patch-engine/              ← deterministic patch applier
  ├── validators/                ← executable Rule 1-7 + structural validators
  └── hooks/                     ← Claude Code hooks
.claude/settings.json            ← local hook configuration
brainstorming/                   ← user-authored proposals for new skills / pipelines
briefs/                          ← user-authored briefs feeding content-generation skills (contents gitignored; folder preserved via .gitkeep)
worlds/<world-slug>/             ← generated world bundles (contents gitignored; folder preserved)
  ├── WORLD_KERNEL.md            ← primary-authored narrative summary (only narrative root file)
  ├── ONTOLOGY.md                ← primary-authored (Categories + Relation Types + Notes); Named Entity Registry atomized to _source/entities/
  ├── _source/                   ← canonical atomic-YAML storage (SPEC-13); tracked in git
  │   ├── canon/                 ← CF-NNNN.yaml (one file per Canon Fact Record)
  │   ├── change-log/            ← CH-NNNN.yaml
  │   ├── invariants/            ← <ID>.yaml (ONT-N, CAU-N, SOC-N, AES-N, DIS-N)
  │   ├── mystery-reserve/       ← M-NNNN.yaml
  │   ├── open-questions/        ← OQ-NNNN.yaml
  │   ├── entities/              ← ENT-NNNN.yaml (named entity registry)
  │   ├── everyday-life/         ← SEC-ELF-NNN.yaml (per-H2-section records)
  │   ├── institutions/          ← SEC-INS-NNN.yaml
  │   ├── magic-or-tech-systems/ ← SEC-MTS-NNN.yaml
  │   ├── geography/             ← SEC-GEO-NNN.yaml
  │   ├── economy-and-resources/ ← SEC-ECR-NNN.yaml
  │   ├── peoples-and-species/   ← SEC-PAS-NNN.yaml
  │   └── timeline/              ← SEC-TML-NNN.yaml (per-historical-Layer records)
  ├── _index/world.db            ← derived index artifact (gitignored)
  ├── characters/                ← CHAR-NNNN hybrid YAML-frontmatter + prose body per file + INDEX.md
  ├── diegetic-artifacts/        ← DA-NNNN hybrid files + INDEX.md
  ├── proposals/                 ← PR-NNNN proposal cards + batches/BATCH-NNNN manifests
  ├── audits/                    ← AU-NNNN audit reports + retcon-proposal sub-dirs
  └── adjudications/             ← PA-NNNN-<verdict>.md canon-addition records
archive/                         ← superseded brainstorming docs and plans
```

Only the pipeline (skills, foundations, docs) is version-controlled. Each user maintains their own `briefs/` and `worlds/` content.

## Skill Architecture

Skills divide into three categories, and these distinctions are load-bearing.

**Canon-mutating** (write to world-level records under `_source/`; all begin with a `<HARD-GATE>` block requiring explicit user approval before any write):
- `create-base-world` — bootstraps a new world's full `_source/` tree + WORLD_KERNEL.md + ONTOLOGY.md + genesis `CF-0001` and `CH-0001` records. Refuses to overwrite an existing world directory. Emits atomic `_source/` form directly (post-SPEC-13).
- `canon-addition` — evaluates a proposed canon fact. On accept: creates a new `_source/canon/CF-NNNN.yaml` record, a new `_source/change-log/CH-NNNN.yaml` record, appends extensions to affected invariant / mystery / open-question / section records, auto-updates `touched_by_cf[]` on affected sections, writes an adjudication. On non-accept: writes only the adjudication record. Append-only — the only way to change an accepted fact is another run producing an explicit retcon entry with retcon attestation.

**Canon-reading** (read world state; write only under sub-directories of `worlds/<slug>/` — never mutate `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/*.yaml` record):
- `character-generation` — writes `characters/<char-slug>.md` + updates `characters/INDEX.md`. Enforces a Mystery Reserve firewall and CF distribution conformance.
- `diegetic-artifact-generation` — writes `diegetic-artifacts/<da-slug>.md` + updates `diegetic-artifacts/INDEX.md`. Same canon-safety posture.
- `propose-new-canon-facts` — writes `proposals/PR-NNNN-*.md` + `proposals/batches/BATCH-NNNN.md` + updates `proposals/INDEX.md`. Each card's path is directly consumable as `canon-addition`'s `proposal_path`.
- `canon-facts-from-diegetic-artifacts` — same output surface, but mines an existing diegetic artifact. Enforces a Diegetic-to-World laundering firewall; contradictions with existing canon are segregated and handed off to `continuity-audit`, not emitted as cards.
- `continuity-audit` — writes `audits/AU-NNNN-<date>.md` + optional `audits/AU-NNNN/retcon-proposals/RP-NNNN-*.md` + updates `audits/INDEX.md`.

**Meta** (operate on the pipeline, not on worlds):
- `brainstorm` — confidence-driven interview producing a design doc at `docs/plans/`.
- `skill-creator` — turns a `brainstorming/*.md` proposal into `.claude/skills/<slug>/SKILL.md` + templates. Structurally enforces FOUNDATIONS alignment at generation time.
- `skill-audit`, `skill-consolidate`, `skill-extract-references` — maintenance on existing skills.

### Machine-facing layer integration

The three skill categories remain load-bearing, but the machine-facing retrieval and mutation contract sits beside the human-facing skill prose. Post-SPEC-13, canonical storage is atomic YAML under `_source/`; the machine layer reads and writes atomic records directly.

- **Pre-flight**: `mcp__worldloom__allocate_next_id` replaces manual grep-and-scan allocation (extends across all record classes: CF, CH, INV per-category, M, OQ, ENT, SEC per-file-class, PA, CHAR, DA, PR, BATCH, AU, RP); `mcp__worldloom__get_context_packet` replaces eager multi-file loading.
- **Localization**: `mcp__worldloom__search_nodes`, `get_record`, `get_neighbors`, `find_named_entities`, `find_impacted_fragments`, `find_sections_touched_by` localize relevant world state via per-record retrieval, with scoped-reference middle tier between canonical entity retrieval and lexical evidence fallback for source-local names.
- **Mutations**: `mcp__worldloom__submit_patch_plan` is the Phase 2 write path. Ops are record-ID-addressed: `create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`, `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, plus hybrid-file ops (`append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`).
- **Validation**: `tools/validators/` turns Rules 1 through 7 and structural checks (including `record_schema_compliance` and `touched_by_cf_completeness`) into executable gates; `world-validate` is the CLI surface.

Meta skills (`brainstorm`, `skill-creator`, `skill-audit`, `skill-consolidate`, `skill-extract-references`) remain outside the world-index / patch-engine mutation path unless they are explicitly operating on those tool packages themselves.

## HARD-GATE Discipline

Every canon-mutating or content-generating skill begins with a `<HARD-GATE>` block. Gates are **absolute under Auto Mode** — invoking a skill is not approval of its deliverable. See `docs/HARD-GATE-DISCIPLINE.md` for the execution pattern, partial-failure semantics, and why write order matters.

## ID Allocation Conventions

IDs are append-only. On machine-layer-enabled workflows, allocate at pre-flight via `mcp__worldloom__allocate_next_id(world_slug, id_class)`, which scans the indexed world state for the highest id of that class and returns the next. Allocation is per-class-directory post-SPEC-13 (one file = one record = trivial scan). Never reuse or overwrite an ID; if allocation would collide (concurrent plan), the patch engine's pre-apply validation detects and aborts.

- `CF-NNNN` — Canon Fact Records (`worlds/<slug>/_source/canon/CF-NNNN.yaml`)
- `CH-NNNN` — Change Log Entries (`worlds/<slug>/_source/change-log/CH-NNNN.yaml`; `CH-0001` is always the genesis entry)
- `<INV-ID>` — Invariants (`worlds/<slug>/_source/invariants/<ID>.yaml`) — IDs follow category convention: `ONT-N` (ontological), `CAU-N` (causal), `DIS-N` (distribution), `SOC-N` (social), `AES-N` (aesthetic/thematic). New worlds use category-prefix + 1-based counter per category.
- `M-NNNN` — Mystery Reserve entries (`worlds/<slug>/_source/mystery-reserve/M-NNNN.yaml`)
- `OQ-NNNN` — Open Questions (`worlds/<slug>/_source/open-questions/OQ-NNNN.yaml`)
- `ENT-NNNN` — Named Entities (`worlds/<slug>/_source/entities/ENT-NNNN.yaml`)
- `SEC-<PREFIX>-NNN` — Prose Sections (`worlds/<slug>/_source/<file-subdir>/SEC-<PREFIX>-NNN.yaml`); prefix per file class: `ELF` (everyday life), `INS` (institutions), `MTS` (magic or tech systems), `GEO` (geography), `ECR` (economy and resources), `PAS` (peoples and species), `TML` (timeline)
- `PA-NNNN` — adjudication records (`worlds/<slug>/adjudications/`)
- `CHAR-NNNN` — character dossiers (stored in the dossier's frontmatter `character_id`; filenames use kebab-case slugs)
- `DA-NNNN` — diegetic artifacts (same pattern as characters)
- `PR-NNNN` — proposal cards (`worlds/<slug>/proposals/`)
- `BATCH-NNNN` — proposal batch manifests (`worlds/<slug>/proposals/batches/`)
- `AU-NNNN` — audit reports (`worlds/<slug>/audits/`)
- `RP-NNNN` — retcon-proposal cards (emitted by `continuity-audit` under its audit sub-directory)

## Common Workflows

See `docs/WORKFLOWS.md` for how to invoke each skill with arguments and expected outputs.

## Non-Negotiables When Working Here

- **Never bypass a HARD-GATE.** Structurally enforced for canon-mutating skills by Hook 3 (blocks raw `Edit`/`Write` on `_source/<subdir>/*.yaml` so canon records cannot land outside the engine) combined with approval-token discipline (`mcp__worldloom__submit_patch_plan` rejects plans without a valid signed token bound to the exact bytes the user approved). The prose non-negotiable remains authoritative everywhere mechanism is absent: skills under development, worlds without an index, repositories without `.claude/settings.json` hooks wired, or any flow Hook 3 doesn't cover (notably hybrid-file artifacts, where engine routing is prescriptive discipline rather than hook-enforced). Auto Mode does not override gates.
- **Never bypass the patch engine for `_source/` writes.** Post-SPEC-13, `worlds/<slug>/_source/<subdir>/*.yaml` files are engine-only surfaces — Hook 3 structurally blocks raw `Edit`/`Write` on them. Hybrid per-file artifacts under `characters/`, `diegetic-artifacts/`, and `adjudications/` are also engine-routed by skill prescription (via `append_character_record` / `append_diegetic_artifact_record` / `append_adjudication_record`); Hook 3 does not block them, so the prescription is the discipline. `WORLD_KERNEL.md`, `ONTOLOGY.md`, `_source/<subdir>/README.md` files, `proposals/`, `audits/`, and the `INDEX.md` files of hybrid sub-directories remain directly editable.
- **Never read `_source/` subdirectories in bulk.** Use `mcp__worldloom__get_record(record_id)` / `get_context_packet(task_type, seed_nodes, token_budget)` / `find_sections_touched_by(cf_id)` / other typed retrieval tools. Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The `ALLOW_FULL_READ` override exists for human-driven review sessions, not for skill convenience.
- **Never write world-level canon records from a canon-reading skill.** Character dossiers, diegetic artifacts, proposals, audits, and adjudications live in their own sub-directories — the separation is what keeps Rule 6 (No Silent Retcons) enforceable. Only canon-mutating skills may create / update `_source/` records via the patch engine.
- **Never delete or overwrite an existing atomic record.** `_source/*.yaml` files are append-only in structural fields (mutation happens in `notes`, `modification_history[]`, `extensions[]`); existing dossiers, artifacts, proposals, and audit records are treated as committed state. To change an accepted canon fact, run `canon-addition` again with an explicit retcon proposal + retcon attestation on the patch op.
- **Never skip FOUNDATIONS.md.** If a workflow's pre-flight doesn't explicitly load it, the workflow is incomplete — stop and add the load before proceeding. Post-SPEC-13, FOUNDATIONS.md §Canonical Storage Layer + §Mandatory World Files (atomic-source classification) are authoritative alongside Rules 1-7 and the CF schema.
- **Validation test PASS entries require a one-line rationale.** A bare "PASS" without justification is treated as FAIL per the skills' own contracts.
- **Do not `git commit` from inside a skill.** Writes land in the working tree; the user reviews the diff and commits.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root, not the main repo root.
