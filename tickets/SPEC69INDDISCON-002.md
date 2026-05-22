# SPEC69INDDISCON-002: Pre-merge real-world INDEX drift remediation sweep

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — data remediation only; edits the directly-editable hybrid-subdir navigation indexes (`characters/INDEX.md`, `diegetic-artifacts/INDEX.md`) on existing worlds. No skill, tool, hook, or validator code changes.
**Deps**: SPEC69INDDISCON-001

## Problem

`index_disk_consistency` runs in the patch-engine pre-apply gate at `fail` severity with global scope (it evaluates every covered surface regardless of which surface a patch touches). Once SPEC69INDDISCON-001 extends coverage to `characters/` and `diegetic-artifacts/`, any pre-existing drift in those navigation indexes — an artifact on disk missing its INDEX row, or an INDEX row pointing at a missing file — would `fail` the next canon/hybrid write on that world world-wide. SPEC-69 §6 therefore requires a pre-merge sweep that **remediates** (not merely reports) all surfaced drift before the new coverage lands. The sweep may be a no-op if the generation skills have kept the indexes consistent.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: the new coverage from SPEC69INDDISCON-001 is exercised via `node tools/validators/dist/src/cli/world-validate.js <world-slug> --compatibility` (positional[0] = world slug; `--compatibility` flag confirmed in `tools/validators/src/cli/_helpers.ts` `COMPATIBILITY_VALIDATORS`, `world-validate` CLI at `tools/validators/src/cli/world-validate.ts`). Real worlds present: `worlds/animalia/`, `worlds/erotica-world/`, each with `characters/INDEX.md` and `diegetic-artifacts/INDEX.md` on disk (confirmed 2026-05-22).
2. **Spec/docs**: SPEC-69 §6 ("pre-merge real-world drift remediation (required, not report-only)") and CLAUDE.md §Write Boundaries — the `INDEX.md` files of hybrid sub-directories (`characters/`, `diegetic-artifacts/`) are **directly editable** (not engine-only `_source/` records, not Hook-3-blocked). `canon-addition`'s engine-envelope note confirms `INDEX.md` edits do not require an index sync (not under `record_schema_compliance` validator scope).
3. **Cross-artifact boundary**: `characters/INDEX.md` is maintained by `character-generation` and `diegetic-artifacts/INDEX.md` by `diegetic-artifact-generation`. This ticket reconciles their on-disk state, not their generation logic — any drift found is an existing inconsistency between a prior skill run and disk, remediated by editing the index rows, not by re-running the skills.
4. **FOUNDATIONS principle (Rule 5 + §Canonical Storage Layer)**: this ticket is the Rule 5 (No Consequence Evasion) discharge for SPEC-69 — the second-order effect of pre-apply `fail`/global-scope coverage is that unremediated drift blocks writes; the sweep closes it. §Canonical Storage Layer: INDEX surfaces are the navigation layer and must stay faithful to disk.

## Architecture Check

1. A standalone remediation sweep keeps the data-correctness diff (world `INDEX.md` edits) reviewable separately from the validator code change (SPEC69INDDISCON-001), and makes the required pre-merge gate an explicit, auditable unit rather than an implicit assumption buried in the code ticket's acceptance criteria.
2. No backwards-compatibility shim — drift is corrected at the source (the INDEX rows), not masked by a validator carve-out or a severity downgrade.

## Verification Layers

1. No covered-surface drift remains on any real world → command verification (`world-validate --compatibility <world>` reports zero `index_disk_drift` for `characters/`/`diegetic-artifacts/` on every world).
2. Remediation edited only navigation indexes, not canon → codebase grep-proof (the diff touches only `*/characters/INDEX.md` and `*/diegetic-artifacts/INDEX.md`; no `_source/` path, no artifact `.md` body).
3. Single-layer note: this ticket has no new automated test — its proof surface is the post-001 `--compatibility` run over real worlds, which is a command-based verification, not a unit test. Additional layer mapping is not applicable because the deliverable is data reconciliation gated by an existing validator.

## What to Change

### 1. Run the coverage over every real world

After SPEC69INDDISCON-001 is built, run `world-validate --compatibility` against each world under `worlds/` and collect all `index_disk_drift` verdicts scoped to `characters/` and `diegetic-artifacts/`.

### 2. Remediate each surfaced drift

For each `artifact_missing_from_index` verdict, add the missing row to the surface's `INDEX.md` following the existing row format (`[label](slug.md) — <descriptor>`). For each `index_entry_missing_on_disk` verdict, remove the stale row (or restore the artifact if its absence is the actual error — escalate to the user if ambiguous). If no drift is surfaced, record the clean sweep result; no edit is required.

## Files to Touch

- `worlds/animalia/characters/INDEX.md` (modify — only if drift surfaced)
- `worlds/animalia/diegetic-artifacts/INDEX.md` (modify — only if drift surfaced)
- `worlds/erotica-world/characters/INDEX.md` (modify — only if drift surfaced)
- `worlds/erotica-world/diegetic-artifacts/INDEX.md` (modify — only if drift surfaced)

## Out of Scope

- Validator / CLI code changes (owned by SPEC69INDDISCON-001).
- `adjudications/` indexes (out of scope per SPEC-69 §4).
- `_source/` records, artifact `.md` bodies, `WORLD_KERNEL.md`, `ONTOLOGY.md` — no canon mutation.
- Re-running `character-generation` / `diegetic-artifact-generation`; this ticket reconciles index rows directly.
- Adding new worlds or new surfaces to the sweep beyond `characters/`/`diegetic-artifacts/`.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js animalia --compatibility` reports zero `index_disk_drift` for the `characters/` and `diegetic-artifacts/` surfaces.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --compatibility` reports zero `index_disk_drift` for the `characters/` and `diegetic-artifacts/` surfaces.
3. The remediation diff touches only `characters/INDEX.md` / `diegetic-artifacts/INDEX.md` files (grep-proof: no `_source/` path and no artifact-body `.md` in the diff).

### Invariants

1. No `_source/` record, artifact body, or world-root authored file is modified by this ticket.
2. After remediation, every covered-surface `INDEX.md` row resolves to an on-disk artifact and every on-disk artifact has exactly one INDEX row.

## Test Plan

### New/Modified Tests

1. `None — data-remediation ticket; verification is command-based (the post-001 `world-validate --compatibility` sweep) and the validator coverage that proves the invariant is delivered and tested by SPEC69INDDISCON-001.`

### Commands

1. `npm --prefix tools/validators run build` — ensure the SPEC69INDDISCON-001 coverage is compiled before the sweep.
2. `for w in animalia erotica-world; do node tools/validators/dist/src/cli/world-validate.js "$w" --compatibility; done` — full-pipeline verification: zero covered-surface drift across all real worlds.
