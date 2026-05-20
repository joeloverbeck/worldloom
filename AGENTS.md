# AGENTS.md

## What This Repo Is

Worldloom is a prose-and-YAML worldbuilding pipeline backed by a TypeScript tools layer under `tools/` (each package ships its own `npm run build` / `npm test`). The important artifacts are:

- repository workflow definitions under `.claude/skills/`
- durable project rules under `docs/`
- machine-facing tools under `tools/` (world-index, world-mcp, patch-engine, validators, hooks)
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

Treat world-level canon as a high-trust surface. In normal flow, the world-level canon files — `WORLD_KERNEL.md`, `ONTOLOGY.md`, and the atomic canon records under `_source/` (`_source/canon/CF-<n>.yaml`, `_source/change-log/CH-<n>.yaml`, `_source/invariants/<ID>.yaml`, and the other `_source/` record classes) — should only be changed by canon-mutating workflows designed for that purpose, and the `_source/` records only through the patch engine.

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
