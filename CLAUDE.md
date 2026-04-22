# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Worldloom is a **prose-and-YAML worldbuilding pipeline**, not a software project. There is no build, lint, or test runner — the "code" is the skills in `.claude/skills/` and the content they produce under `worlds/<world-slug>/`. Every workflow runs through Claude Code skills; invoke them via the `Skill` tool (or `/<slug>` slash command). Output is files on disk — read them to verify.

## Authoritative Source of Truth

`docs/FOUNDATIONS.md` is the **non-negotiable design contract**. It defines Canon Layers (hard / derived / soft / contested / mystery-reserve), the 13 mandatory world files, the Canon Fact Record (`CF-NNNN`) and Change Log Entry (`CH-NNNN`) schemas, and the Seven Validation Rules. Skills load it automatically in their pre-flight checks; if a workflow doesn't, the workflow is incomplete.

## Repository Layout

```
docs/FOUNDATIONS.md              ← project-wide design contract (read-only in normal flow)
docs/WORKFLOWS.md                ← how to invoke each skill
docs/HARD-GATE-DISCIPLINE.md     ← HARD-GATE execution pattern and partial-failure semantics
docs/plans/                      ← design docs output by the brainstorm skill
.claude/skills/<slug>/           ← runnable skills; each has SKILL.md + optional templates/references/
brainstorming/                   ← user-authored proposals for new skills / pipelines
briefs/                          ← user-authored briefs feeding content-generation skills (contents gitignored; folder preserved via .gitkeep)
worlds/<world-slug>/             ← generated world bundles (contents gitignored; folder preserved)
  ├── <13 mandatory .md files>
  ├── characters/                ← character dossiers + INDEX.md
  ├── diegetic-artifacts/        ← in-world texts + INDEX.md
  ├── proposals/                 ← PR-NNNN proposal cards + batches/BATCH-NNNN manifests
  ├── audits/                    ← AU-NNNN audit reports + retcon-proposal sub-dirs
  └── adjudications/             ← PA-NNNN-<verdict>.md canon-addition records
archive/                         ← superseded brainstorming docs and plans
```

Only the pipeline (skills, foundations, docs) is version-controlled. Each user maintains their own `briefs/` and `worlds/` content.

## Skill Architecture

Skills divide into three categories, and these distinctions are load-bearing.

**Canon-mutating** (write to world-level files; all begin with a `<HARD-GATE>` block requiring explicit user approval before any write):
- `create-base-world` — bootstraps a new world's 13 mandatory files + genesis `CH-0001`. Refuses to overwrite an existing world directory.
- `canon-addition` — evaluates a proposed canon fact. On accept: appends `CF-NNNN` to `CANON_LEDGER.md`, logs `CH-NNNN`, patches affected domain files, writes an adjudication. On non-accept: writes only the adjudication record. Append-only — the only way to change an accepted fact is another run producing an explicit retcon entry.

**Canon-reading** (read world state; write only under sub-directories of `worlds/<slug>/` — never mutate `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`, or any other world-level file):
- `character-generation` — writes `characters/<char-slug>.md` + updates `characters/INDEX.md`. Enforces a Mystery Reserve firewall and CF distribution conformance.
- `diegetic-artifact-generation` — writes `diegetic-artifacts/<da-slug>.md` + updates `diegetic-artifacts/INDEX.md`. Same canon-safety posture.
- `propose-new-canon-facts` — writes `proposals/PR-NNNN-*.md` + `proposals/batches/BATCH-NNNN.md` + updates `proposals/INDEX.md`. Each card's path is directly consumable as `canon-addition`'s `proposal_path`.
- `canon-facts-from-diegetic-artifacts` — same output surface, but mines an existing diegetic artifact. Enforces a Diegetic-to-World laundering firewall; contradictions with existing canon are segregated and handed off to `continuity-audit`, not emitted as cards.
- `continuity-audit` — writes `audits/AU-NNNN-<date>.md` + optional `audits/AU-NNNN/retcon-proposals/RP-NNNN-*.md` + updates `audits/INDEX.md`.

**Meta** (operate on the pipeline, not on worlds):
- `brainstorm` — confidence-driven interview producing a design doc at `docs/plans/`.
- `skill-creator` — turns a `brainstorming/*.md` proposal into `.claude/skills/<slug>/SKILL.md` + templates. Structurally enforces FOUNDATIONS alignment at generation time.
- `skill-audit`, `skill-consolidate`, `skill-extract-references` — maintenance on existing skills.

## HARD-GATE Discipline

Every canon-mutating or content-generating skill begins with a `<HARD-GATE>` block. Gates are **absolute under Auto Mode** — invoking a skill is not approval of its deliverable. See `docs/HARD-GATE-DISCIPLINE.md` for the execution pattern, partial-failure semantics, and why write order matters.

## ID Allocation Conventions

IDs are append-only, allocated at pre-flight by scanning the existing ledger or directory. Never reuse or overwrite an ID; if a pre-flight allocation would collide, abort and ask the user to resolve.

- `CF-NNNN` — Canon Fact Records (in `CANON_LEDGER.md`)
- `CH-NNNN` — Change Log Entries (in `CANON_LEDGER.md`; `CH-0001` is always the genesis entry)
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

- **Never bypass a HARD-GATE.** If you think the gate is in the way, you are about to make a mistake. Auto Mode does not override gates.
- **Never write world-level canon files from a canon-reading skill.** Character dossiers, diegetic artifacts, proposals, audits, and adjudications live in sub-directories for a reason — the separation is what keeps Rule 6 (No Silent Retcons) enforceable.
- **Never delete or overwrite an existing `worlds/<slug>/` file.** The ledger is append-only; existing dossiers, artifacts, proposals, and audit records are treated as committed state. To change an accepted canon fact, run `canon-addition` again with an explicit retcon proposal.
- **Never skip FOUNDATIONS.md.** If a workflow's pre-flight doesn't explicitly load it, the workflow is incomplete — stop and add the load before proceeding.
- **Validation test PASS entries require a one-line rationale.** A bare "PASS" without justification is treated as FAIL per the skills' own contracts.
- **Do not `git commit` from inside a skill.** Writes land in the working tree; the user reviews the diff and commits.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root, not the main repo root.
