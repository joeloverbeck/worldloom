# AGENTS.md

Guidance for Codex when working in this repository. Keep this file lean — it is read on every query. Only durable, repo-wide instructions worth loading every time belong here; route everything else to `docs/`.

## What This Repo Is

Worldloom is a **prose-and-YAML worldbuilding pipeline backed by a TypeScript tools layer**. The pipeline is the skills in `.codex/skills/` and `.claude/skills/`; the machine layer lives under `tools/<package>/`, each shipping its own `npm run build` / `npm test`. Skill output is files on disk — read them to verify. For the full directory layout, see `docs/REPOSITORY-MAP.md`.

## Authoritative Contract

`docs/FOUNDATIONS.md` is the **non-negotiable design contract** — Canon Layers, the mandatory world concerns and their storage form, the Canon Fact Record (`CF-<integer>`) and Change Log Entry (`CH-<integer>`) schemas, the Seven Validation Rules, and the Canonical Storage Layer contract. Read it before making or validating any workflow or world-content change. If a workflow's pre-flight doesn't load it, the workflow is incomplete. If a change conflicts with FOUNDATIONS, FOUNDATIONS wins.

## Core Rules

- **Never bypass a HARD-GATE.** Every canon-mutating or content-generating skill begins with a `<HARD-GATE>` requiring explicit user approval before any write. Auto Mode never overrides gates. Invoking a skill is not approval of its deliverable.
- **Never bypass the patch engine for `_source/` writes.** `worlds/<slug>/_source/<subdir>/*.yaml` are engine-only surfaces. Hybrid per-file artifacts under `characters/`, `diegetic-artifacts/`, and `adjudications/` are also engine-routed by skill prescription (`append_character_record` / `append_diegetic_artifact_record` / `append_adjudication_record`).
- **Never read `_source/` subdirectories in bulk.** Use typed retrieval (`mcp__worldloom__get_record` / `get_context_packet` / `find_sections_touched_by` / etc.).
- **Never write world-level canon from a canon-reading skill.** Character dossiers, diegetic artifacts, proposals, audits, and adjudications live in their own subdirectories — only canon-mutating skills create or update `_source/` records.
- **Never delete or overwrite an existing atomic record.** `_source/*.yaml` files are append-only in structural fields; mutation happens in `notes`, `modification_history[]`, `extensions[]`. To change an accepted canon fact, run `canon-addition` again with an explicit retcon proposal + retcon attestation.
- **Never allocate IDs by guesswork.** Scan first and keep IDs append-only; see `docs/ID-ALLOCATION.md`.
- **Do not `git commit` from inside a skill.** Writes land in the working tree; the user reviews the diff and commits.
- **Validation test PASS entries require a one-line rationale.** A bare "PASS" is treated as FAIL.
- **Worktree discipline.** If invoked inside a git worktree, all paths resolve from the worktree root.

## Write Boundaries

Treat world-level canon as a high-trust surface. Engine-only (never edit directly): `worlds/<slug>/_source/<subdir>/*.yaml`. Skill-prescribed engine routing (not hook-blocked, but still engine-only by discipline): hybrid files under `characters/`, `diegetic-artifacts/`, `adjudications/`. Directly editable: `WORLD_KERNEL.md`, `ONTOLOGY.md`, `_source/<subdir>/README.md`, `proposals/`, `audits/`, and the `INDEX.md` files of hybrid sub-directories. Content-generation and audit workflows write only to their scoped subdirectories.

## Where To Look

- `docs/REPOSITORY-MAP.md` — directory layout and the canon-mutating / canon-reading / meta skill taxonomy
- `docs/WORKFLOWS.md` — how to invoke each skill, with arguments and expected outputs
- `docs/HARD-GATE-DISCIPLINE.md` — HARD-GATE execution pattern and partial-failure semantics
- `docs/ID-ALLOCATION.md` — ID conventions and the per-class registry
- `docs/MACHINE-FACING-LAYER.md` — retrieval / patch-engine / validator contract
- `docs/CONTEXT-PACKET-CONTRACT.md` — context-packet assembly contract
- `.codex/skills/<slug>/SKILL.md` and `.claude/skills/<slug>/SKILL.md` — workflow-specific instructions and templates

## Harness Notes (Codex)

Codex does **not** run the Claude Code enforcement hooks (those live in `.claude/settings.json` and apply only under Claude Code). Under Codex the Core Rules above — especially "never bypass the patch engine for `_source/` writes" and "never read `_source/` subdirectories in bulk" — are **prescriptive discipline, not mechanically enforced**: honor them by hand. Codex-side implementation skills live under `.codex/skills/` (e.g. `implement-ticket`, which reads this file at pre-flight); read a skill's `SKILL.md` for behavior.
