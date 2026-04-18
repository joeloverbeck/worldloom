# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Worldloom is a **prose-and-YAML worldbuilding pipeline**, not a software project. There is no build, no lint, no test runner, no package manager. The "code" is the skills in `.claude/skills/` and the authored content they produce under `worlds/<world-slug>/`. Every workflow runs through Claude Code skills.

If you're looking for a way to "run" or "test" this project: the skills themselves are the runtime. Invoke them via the `Skill` tool (or their `/<slug>` slash command). The output is files on disk — read them to verify.

## Authoritative Source of Truth

`docs/FOUNDATIONS.md` is the **non-negotiable design contract** for the entire project. Every skill cites it. It defines:

- **Canon Layers**: hard / derived / soft / contested / mystery-reserve — facts must be classified
- **Mandatory world files** (13 per world): `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `OPEN_QUESTIONS.md`, `MYSTERY_RESERVE.md`, `CANON_LEDGER.md`
- **Canon Fact Record schema** (`CF-NNNN` entries in `CANON_LEDGER.md`) and **Change Log Entry schema** (`CH-NNNN`)
- **Seven Validation Rules** (No Floating Facts / No Pure Cosmetics / No Specialness Inflation / No Globalization by Accident / No Consequence Evasion / No Silent Retcons / Preserve Mystery Deliberately)
- **Tooling Recommendation**: agents must receive current Kernel + Invariants + relevant CF records + affected domain files + open contradictions + mystery reserve entries before acting. Non-negotiable.

Before taking any canon-affecting action, load FOUNDATIONS.md. The skills do this automatically in their pre-flight checks.

## Repository Layout

```
docs/FOUNDATIONS.md        ← project-wide design contract (read-only in normal flow)
docs/plans/                ← design docs output by the brainstorm skill
.claude/skills/<slug>/     ← runnable skills; each has SKILL.md + optional templates/
brainstorming/             ← user-authored proposals for new skills / pipelines
briefs/                    ← user-authored briefs feeding content-generation skills (gitignored)
worlds/<world-slug>/       ← generated world bundles (gitignored; user-specific content)
  ├── <13 mandatory .md files>
  ├── characters/          ← character dossiers + INDEX.md
  ├── diegetic-artifacts/  ← in-world texts + INDEX.md
  └── adjudications/       ← PA-NNNN-<verdict>.md canon-addition records
archive/                   ← superseded brainstorming docs and plans
```

`briefs/*` and `worlds/*` are **gitignored** (see `.gitignore`): each user maintains their own content. Only the pipeline (skills, foundations, docs) is version-controlled.

## Skill Architecture

Skills divide into two categories, and this distinction is load-bearing:

**Canon-mutating skills** (write to world-level files; must have a `<HARD-GATE>` block requiring explicit user approval of a Phase N deliverable summary before any write):
- `create-base-world` — bootstraps a new world's 13 mandatory files + genesis `CH-0001`. Refuses to overwrite an existing world directory.
- `canon-addition` — evaluates a proposed canon fact; on accept, appends `CF-NNNN` to `CANON_LEDGER.md`, logs `CH-NNNN`, patches affected domain files, and writes an adjudication record. On non-accept, writes only the adjudication record. Append-only — the only way to change an accepted fact is another run producing an explicit retcon entry.

**Canon-reading skills** (read world state; write only under sub-directories of `worlds/<slug>/` — never mutate `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`, or any other world-level file):
- `character-generation` — writes `worlds/<slug>/characters/<char-slug>.md` + updates `characters/INDEX.md`. Enforces a Mystery Reserve firewall and CF distribution conformance.
- `diegetic-artifact-generation` — writes `worlds/<slug>/diegetic-artifacts/<da-slug>.md` + updates `diegetic-artifacts/INDEX.md`. Same canon-safety posture as character-generation.

**Meta skills** (operate on the pipeline itself, not on worlds):
- `brainstorm` — confidence-driven interview producing a design doc at `docs/plans/`. Classifies topics as canon-related / tooling-adjacent / non-implementation; loads FOUNDATIONS.md when canon-related.
- `skill-creator` — turns a `brainstorming/*.md` proposal into `.claude/skills/<slug>/SKILL.md` + templates. Structurally enforces FOUNDATIONS alignment at generation time.
- `skill-audit`, `skill-consolidate` — maintenance on existing skills.

## The HARD-GATE Discipline

Every canon-mutating or content-generating skill begins with a `<HARD-GATE>` block. These gates are **absolute under Auto Mode**. Invoking a skill is not approval of its deliverable. The pattern:

1. Pre-flight check (verify prerequisites, allocate IDs, load required world state)
2. Analysis phases (numbered — each named in the skill)
3. Validation / Rejection Tests (numbered — each must record PASS with rationale)
4. Present deliverable summary to user
5. **Wait for explicit user approval** before any `Write` or `Edit` to `worlds/<slug>/`
6. On approval, write files in the skill's prescribed order (sequencing matters — e.g., canon-addition writes domain files → adjudication record → `CANON_LEDGER.md` last, so partial-failure state is detectable and recoverable)
7. Never `git commit` — writes land in the working tree; the user reviews and commits

When a skill's phase prescribes an order, follow it. The order encodes partial-failure recovery semantics.

## ID Allocation Conventions

IDs are append-only and allocated at pre-flight by scanning the existing ledger / directory:

- `CF-NNNN` — Canon Fact Records in `CANON_LEDGER.md`
- `CH-NNNN` — Change Log Entries in the change log section of `CANON_LEDGER.md` (`CH-0001` is always the genesis entry)
- `PA-NNNN` — adjudication records under `worlds/<slug>/adjudications/`
- `CHAR-NNNN` — character dossiers (stored in the dossier's frontmatter `character_id`; filenames use kebab-case slugs)
- `DA-NNNN` — diegetic artifacts (same pattern as characters)

Never reuse or overwrite an ID. If a pre-flight allocation would collide, abort and ask the user to resolve.

## Common Workflows

- **Start a new world**: invoke `/create-base-world` with a `world_name` and optional `premise_path` (a markdown brief under `briefs/`). Produces the full 13-file bundle at `worlds/<slug>/`.
- **Add a canon fact to an existing world**: invoke `/canon-addition` with a `world_slug` and a `proposal_path` markdown file. Produces a verdict; on accept, extends the ledger and patches domain files.
- **Generate a character**: invoke `/character-generation` with a `world_slug` and a `character_brief_path`. Never mutates world-level canon.
- **Generate an in-world text**: invoke `/diegetic-artifact-generation` with a `world_slug`, a `brief_path`, and optionally a `character_path` to lift an existing narrator.
- **Explore a new pipeline before building it**: invoke `/brainstorm` with a request. Writes a design doc to `docs/plans/`.
- **Turn a brainstorming doc into a skill**: invoke `/skill-creator` with the `brainstorming/*.md` path.

## Non-Negotiables When Working Here

- **Never bypass a HARD-GATE.** If you think the gate is in the way, you are about to make a mistake. Auto Mode does not override gates.
- **Never write canon-level files from a canon-reading skill.** Character dossiers, diegetic artifacts, and adjudications live in sub-directories for a reason — the separation is what keeps Rule 6 (No Silent Retcons) enforceable.
- **Never delete or overwrite an existing `worlds/<slug>/` file.** The ledger is append-only; existing dossiers and artifacts are treated as committed state. To change an accepted canon fact, run `canon-addition` again with an explicit retcon proposal.
- **Never skip FOUNDATIONS.md.** If a workflow's pre-flight doesn't explicitly load it, the workflow is incomplete — stop and add the load before proceeding.
- **Validation test PASS entries require a one-line rationale.** A bare "PASS" without justification is treated as FAIL per the skills' own contracts.
- **Do not `git commit` from inside a skill.** Writes land in the working tree; the user reviews the diff and commits.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root, not the main repo root.
