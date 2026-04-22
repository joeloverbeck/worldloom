# AGENTS.md

## What This Repo Is

Worldloom is a prose-and-YAML worldbuilding pipeline, not a conventional software project. There is no build, lint, or test runner. The important artifacts are:

- repository workflow definitions under `.claude/skills/`
- durable project rules under `docs/`
- generated world content under `worlds/<world-slug>/`

`briefs/` and `worlds/` content is user-local and gitignored; the repo mainly versions the pipeline and its contracts.

## Authoritative Contract

Read `docs/FOUNDATIONS.md` before making or validating any workflow or world-content change. It is the design contract for:

- canon layers
- required world files
- Canon Fact Record and Change Log schemas
- validation rules

If a workflow or change conflicts with FOUNDATIONS, FOUNDATIONS wins.

## Core Rules

- Never bypass a documented hard gate or approval checkpoint for canon-mutating work.
- Never silently retcon canon. Accepted canon changes must be recorded through the repo’s append-only canon process.
- Never delete or overwrite existing world content as a shortcut. Prefer additive records and explicit retcon flows.
- Never let canon-reading/content-generation flows mutate world-level canon files unless the workflow is explicitly canon-mutating.
- Never allocate IDs by guesswork. Scan existing records first and keep IDs append-only.
- Do not commit from an automated workflow unless the user explicitly asks for it.

## Write Boundaries

Treat world-level canon files as high-trust surfaces. In normal flow, files such as `WORLD_KERNEL.md`, `INVARIANTS.md`, and `CANON_LEDGER.md` should only be changed by canon-mutating workflows designed for that purpose.

Content-generation and audit workflows should write to their scoped subdirectories, such as:

- `characters/`
- `diegetic-artifacts/`
- `proposals/`
- `audits/`
- `adjudications/`

## Where To Look

- `docs/WORKFLOWS.md`: workflow entry points and expected outputs
- `docs/HARD-GATE-DISCIPLINE.md`: hard-gate semantics and partial-failure handling
- `.claude/skills/<slug>/SKILL.md`: workflow-specific instructions and templates

Keep this file lean in future edits. Only add instructions here if they are durable, repo-wide, and worth loading on every query.
