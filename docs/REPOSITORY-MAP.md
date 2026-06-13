# Repository Map

How this repository is organized. Only the pipeline (skills, foundations, docs, tools) is version-controlled; each user maintains their own `briefs/` and `worlds/` content.

```
docs/FOUNDATIONS.md              ← project-wide design contract (read-only in normal flow)
docs/WORKFLOWS.md                ← how to invoke each skill
docs/HARD-GATE-DISCIPLINE.md     ← HARD-GATE execution pattern and partial-failure semantics
docs/MACHINE-FACING-LAYER.md     ← retrieval / patch-engine / validator contract
docs/CONTEXT-PACKET-CONTRACT.md  ← context-packet assembly contract
docs/ID-ALLOCATION.md            ← ID conventions and the per-class registry
docs/plans/                      ← design docs output by the brainstorm skill
.claude/skills/<slug>/           ← runnable skills; each has SKILL.md + optional templates/references/
.agents/skills/<slug>/           ← Codex-side implementation skills (implement-ticket, etc.)
tools/                           ← machine-facing layer (compiled dist/ gitignored)
  ├── world-index/               ← SQLite-backed index builder + CLI
  ├── world-mcp/                 ← retrieval MCP server + context packets
  ├── patch-engine/              ← deterministic patch applier
  ├── validators/                ← executable Rule 1-7 + structural validators
  └── hooks/                     ← Claude Code hooks
.claude/settings.json            ← local hook configuration (Claude Code only)
brainstorming/                   ← user-authored proposals for new skills / pipelines
briefs/                          ← user-authored briefs feeding content-generation skills (gitignored; .gitkeep preserved)
worlds/<world-slug>/             ← generated world bundles (gitignored; folder preserved)
  ├── WORLD_KERNEL.md            ← primary-authored narrative summary (only narrative root file)
  ├── ONTOLOGY.md                ← primary-authored (Categories + Relation Types + Notes); Named Entity Registry atomized to _source/entities/
  ├── _source/                   ← canonical atomic-YAML storage (SPEC-13); tracked in git
  │   ├── canon/                 ← CF-<integer>.yaml (one file per Canon Fact Record)
  │   ├── change-log/            ← CH-<integer>.yaml
  │   ├── invariants/            ← <ID>.yaml (ONT-N, CAU-N, SOC-N, AES-N, DIS-N)
  │   ├── mystery-reserve/       ← M-<integer>.yaml
  │   ├── open-questions/        ← OQ-<integer>.yaml
  │   ├── entities/              ← ENT-<integer>.yaml (named entity registry)
  │   ├── everyday-life/         ← SEC-ELF-<integer>.yaml (per-H2-section records)
  │   ├── institutions/          ← SEC-INS-<integer>.yaml
  │   ├── magic-or-tech-systems/ ← SEC-MTS-<integer>.yaml
  │   ├── geography/             ← SEC-GEO-<integer>.yaml
  │   ├── economy-and-resources/ ← SEC-ECR-<integer>.yaml
  │   ├── peoples-and-species/   ← SEC-PAS-<integer>.yaml
  │   └── timeline/              ← SEC-TML-<integer>.yaml (per-historical-Layer records)
  ├── _index/world.db            ← derived index artifact (gitignored)
  ├── characters/                ← CHAR-<integer> hybrid YAML-frontmatter + prose body per file + INDEX.md
  ├── diegetic-artifacts/        ← DA-<integer> hybrid files + INDEX.md
  ├── proposals/                 ← PR-<integer> proposal cards + batches/BATCH-<integer> manifests
  ├── audits/                    ← AU-<integer> audit reports + retcon-proposal sub-dirs
  ├── adjudications/             ← PA-<integer>-<verdict>.md canon-addition records
  ├── pressure-events/           ← EPE base cards + EPE-*.proposal.md sidecars + batches/
  ├── character-proposals/       ← NCP-<integer> cards + batches/NCB-<integer> manifests
  └── stories/<story-slug>/      ← branching-story bundles (per-bundle layout below)
       ├── STORY_KERNEL.md        ← primary-authored narrative root for the bundle
       ├── _source/               ← atomic-YAML story-bundle records (23 subdirs: entities/STENT, status/STSTAT, intentions/STINT, facts/SF, beliefs/BEL, events/SE, obligations/OBL, consequences/CNSQ, threads/THR, clocks/CLK, secrets/STSEC, story-questions/STQ, plans/STPLAN, emotions/STEMO, relationships/SREL, locations/STLOC, objects/STOBJ, artifacts/DA, branches/BR, pages/PG, choices/CHC, storylets/SLT, scenes/SCN) — schemas canonical at `.claude/skills/_shared-templates/story-state-contract.md` §4
       ├── pages-prose-plans/     ← legacy PG-<integer> page prose plans (read-only compatibility)
       ├── pages-prose/           ← legacy rendered page prose; supplied externally (manual or LLM)
       ├── pages-prose-receipts/  ← legacy PG-<integer>.yaml prose-validation receipts
       ├── scene-prose-plans/     ← SCN-<integer> scene-range prose plans over committed PG ranges
       ├── scene-prose/           ← rendered scene prose; supplied externally
       ├── scene-prose-receipts/  ← SCN-<integer>.yaml scene-range prose-validation receipts
       ├── storylet-batches/      ← SLB-<integer> batch manifests
       ├── story-promotions/      ← SP-<integer>-proposal-package.yaml + SP-<integer>.md / SP-<integer>-closeout.md ledgers
       ├── audits/                ← SAU-<integer>-<date>.md reports + SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-*.md
       └── INDEX.md
archive/                         ← superseded brainstorming docs and plans
world-proposals/                 ← root-level NWP-<integer> cards + batches/NWB-<integer> manifests
```

EPE base cards are allocator-tracked but intentionally not retrieval-indexed; they are file-scanned until canonized via `EPE-*.proposal.md` sidecars.

## Skill surface

Skills are runnable workflows under `.claude/skills/<slug>/` (each with a `SKILL.md`). Their descriptions are injected into the model's context every session by the harness, so this map does not duplicate them — invoke a skill and read its `SKILL.md` for behavior, or see `docs/WORKFLOWS.md` for invocation arguments and expected outputs.

Skills divide into three load-bearing categories by write surface, and this distinction is what keeps the canon-safety rules (see `CLAUDE.md` / `AGENTS.md` §Write boundaries) enforceable:

- **Canon-mutating** — write world-level records under `_source/` via the patch engine; all begin with a `<HARD-GATE>` requiring explicit user approval (e.g. `create-base-world`, `canon-addition`).
- **Canon-reading / story-pipeline** — read world and story state; write only to scoped subdirectories (`characters/`, `diegetic-artifacts/`, `proposals/`, `audits/`, `adjudications/`, `stories/<slug>/`) and route any world or story `_source/*.yaml` mutation through the patch engine. Story-pipeline examples include `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-scene-plan`, and `branching-story-scene-prose-attach`; they never mutate `WORLD_KERNEL.md`, `ONTOLOGY.md`, or world-canon `_source/*.yaml` records directly.
- **Meta** — operate on the pipeline, not on worlds (`brainstorm`, `skill-creator`, `skill-audit`, `skill-consolidate`, `skill-extract-references`).

For the machine-facing retrieval and mutation contract that sits beside the skill prose, see `docs/MACHINE-FACING-LAYER.md`.
