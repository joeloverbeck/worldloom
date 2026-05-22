# SPEC-69 — `index_disk_consistency` Coverage Extension to Slug-Named Hybrid Surfaces

**Status:** DRAFT
**Date:** 2026-05-22
**Classification:** canon-related (extends a structural validator over canon-pipeline navigation surfaces; the validator gates patch plans pre-apply, so coverage is bounded to surfaces with producer-maintained indexes)
**Source:** `archive/reports/world-system-consolidation-second-iteration.md` Fault 6 / §12.6 — **corrected** at triage against `main` (the validator already exists; this extends its surface coverage rather than adding a new validator). Reassessment 2026-05-22 further **narrowed** the surface set: triage F6 named `adjudications/`, `characters/`, `diegetic-artifacts/`; reassessment dropped `adjudications/` (see §4).
**Depends on:** none — independent of SPEC-68
**Companion:** `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`

**Implementation note (2026-05-22):** `archive/tickets/SPEC69INDDISCON-001.md` landed the validator coverage extension for `characters/` and `diegetic-artifacts/` through the existing `index_disk_consistency` structural validator. The required real-world INDEX remediation remains active in `tickets/SPEC69INDDISCON-002.md`.

**Blocker note (2026-05-22):** `tickets/SPEC69INDDISCON-002.md` could not run in this worktree because `worlds/` contains only `.gitkeep`; the real `worlds/animalia/` and `worlds/erotica-world/` content required for the remediation sweep is absent.

## 1. Context

The report proposes a **new** `index_surface_consistency` validator. Verified against `main`: the
validator already exists as `index_disk_consistency`
(`tools/validators/src/structural/index-disk-consistency.ts`, in the registry and in the
`--compatibility` subset — see
`archive/specs/SPEC-64-world-system-compatibility-and-artifact-maturity-validation.md`). It diffs each
surface's `INDEX.md` (parsed markdown links) against on-disk artifacts and indexed records, emitting
`index_disk_drift`. The validator runs in the patch-engine **pre-apply gate** (`validatePatchPlan`,
`run_mode: "pre-apply"`) at severity **`fail`**, incrementally at `fail`, and under full-world /
`--compatibility` runs at `warn`.

The genuine finding is a **coverage gap**: `INDEX_SURFACES` (lines 27–32) lists only four
ID-prefixed proposal surfaces:

```
proposals (PR)  ·  audits (AU)  ·  pressure-events (EPE)  ·  character-proposals (NCP)
```

Two uncovered per-world surfaces with **producer-maintained** `INDEX.md` files are in scope for this
extension:

| Surface | node_type (verified `utils.ts`) | Filename convention | Index maintained by |
|---|---|---|---|
| `characters/` | `character_record` | `<char-slug>.md` (**slug-named**) | `character-generation` |
| `diegetic-artifacts/` | `diegetic_artifact_record` | `<da-slug>.md` (**slug-named**) | `diegetic-artifact-generation` |

(`adjudications/` was considered but dropped at reassessment — it has no maintained `INDEX.md` and no
producing skill; see §4.)

The slug-named surfaces are the design crux the report glossed: the current validator gates disk
membership on `surface.filePattern.test(entry.name)` (line 164), gates index-link membership on the same
`filePattern` (`parseIndexEntries`, line 148), and derives synthetic-record ids from a
`^(?:PR|AU|EPE|NCP)-\d+` regex (line 177). All three assume **ID-prefixed filenames**. `characters/` and
`diegetic-artifacts/` files are slug-named, so a `^CHAR-\d+` / `^DA-\d+` `filePattern` would match nothing.

## 2. Changes

Single file: `tools/validators/src/structural/index-disk-consistency.ts`.

### 2.1 Add the slug-named surfaces (requires a membership predicate)

`characters/` and `diegetic-artifacts/` cannot reuse ID-prefix matching. Generalize the surface model so
disk membership, index-link membership, and synthetic-id derivation are separable from ID-prefix
assumptions:

- Extend `IndexSurface` so a surface declares either an `idPattern` (existing ID-prefixed surfaces) **or**
  a slug-named mode whose membership predicate is "any `*.md` except `INDEX.md`". The slug-mode predicate
  must be threaded through the **three** sites that currently assume ID-prefixed filenames:
  - **`parseIndexEntries` line 148** — the index-link gate `surface.filePattern.test(...)`. (An earlier
    draft of this spec claimed `parseIndexEntries` was "already naming-agnostic"; that was wrong — it
    filters index links by `filePattern`. Confirmed against real worlds: `characters/INDEX.md` and
    `diegetic-artifacts/INDEX.md` use standard `[label](slug.md)` links that parse correctly but would be
    filtered out by an ID-only pattern, making the index read empty and every artifact report as
    missing-from-index — a `fail`-severity false drift in the pre-apply gate.)
  - **`diskArtifactsFor` line 164** — the on-disk membership gate.
  - **`syntheticRecord` line 177** — the nodeId derivation; for slug-named surfaces fall back to the file
    basename (or frontmatter `artifact_id` / `character_id` if cheaply available). Record matching is by
    `file_path`, not node id, so this fallback only affects drift-message labeling — drift messages still
    name the path.
- The `indexedRecords` filter (node_type + path-prefix, lines 60–64) **is** genuinely naming-agnostic and
  needs no change.
- Add `characters` → `character_record` and `diegetic-artifacts` → `diegetic_artifact_record`.

Implementation may keep the existing four surfaces byte-identical by giving them an explicit `idPattern`
and treating the absence of one as slug-mode, or by an explicit `mode` discriminator — the implementing
ticket chooses the lower-churn shape. No behavior change for the existing four surfaces.

### 2.2 Compatibility-mode inheritance

`index_disk_consistency` is already in the `--compatibility` subset (`COMPATIBILITY_VALIDATORS` in
`tools/validators/src/cli/_helpers.ts`; introduced by
`archive/specs/SPEC-64-world-system-compatibility-and-artifact-maturity-validation.md`), so the new
coverage flows into `world-validate --compatibility` automatically. No CLI or registry change.

## 3. Edge cases / reassessment at implementation time

- **Filename conventions confirmed (reassessment 2026-05-22)**: `characters/` and `diegetic-artifacts/`
  files are purely slug-named (`melissa-threadscar.md`, `a-season-on-the-circuit.md`) across
  `worlds/animalia/` and `worlds/erotica-world/`; no ID-prefixed legacy files coexist. The slug-mode "any
  `*.md` except `INDEX.md`" predicate is therefore safe today; no negative-lookahead sidecar exclusion (as
  `pressure-events` uses for `.proposal.md`) is needed for these surfaces — but the implementing ticket
  should re-confirm no `.proposal.md` / draft sidecars have since landed in either directory.
- **`INDEX.md` link format confirmed (reassessment 2026-05-22)**: both surfaces' `INDEX.md` use the
  standard `[label](relative.md)` markdown-link row format that `parseIndexEntries`' `linkPattern` already
  matches; no parser reconciliation is required.
- Severity unchanged: `fail` under pre-apply/incremental, `warn` under full-world (and thus `warn` under
  `--compatibility` full-world runs). Because pre-apply is `fail`-severity and global-scope, see §6 on
  mandatory pre-merge drift remediation.

## 4. Out of Scope

- **`adjudications/`** — **dropped at reassessment (2026-05-22)**, reversing triage F6's inclusion. No
  `adjudications/INDEX.md` exists in any world and no skill produces one (`canon-addition` writes
  `PA-*.md` adjudication records but maintains no index, unlike the slug-named generation skills). Because
  `index_disk_consistency` runs in the patch-engine pre-apply gate at `fail` severity with global scope,
  adding `adjudications/` coverage would emit one `artifact_missing_from_index` per existing PA on every
  world and **block every `canon-addition` submission** until an index were produced. Covering
  `adjudications/` therefore requires first extending `canon-addition` to create/maintain
  `adjudications/INDEX.md` and backfilling existing worlds — out of this single-file validator extension's
  scope. Deferred; revisit as a separate index-production + coverage spec if PA discoverability via an
  index is desired.
- **`world-proposals/INDEX.md` and `world-proposals/LINEAGE.md`** — these live at the **repository root**,
  not under `worlds/<slug>/`, so they are outside this per-world validator's `worldRootFrom` harness.
  Root-level proposal-surface index validation is a separate, lower-value concern; defer.
- `batches/` sub-directory index rows (proposal/character/pressure batches) — not currently indexed as
  surfaces; out of scope.
- Any new validator — this is a coverage extension to an existing one.

## 5. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Canonical Storage Layer (read/navigation discipline) | aligns | `INDEX.md` surfaces are the human/tool navigation layer over engine-routed hybrid artifacts; stale rows misdirect operators and skills. Extending coverage keeps navigation faithful to disk. Because the validator also gates patch plans pre-apply, coverage is deliberately bounded to surfaces with producer-maintained indexes (see §4). |
| §Artifact Authority and Maturity | aligns | Validates that realized-hybrid (`CHAR`/`DA`) artifacts are discoverable without granting them any authority they lack — purely a consistency check. |
| Rule 5 (No Consequence Evasion) | aligns | The pre-apply `fail` / global-scope second-order effect is acknowledged: coverage is bounded to producer-maintained-index surfaces (§4), and §6 mandates pre-merge drift remediation so the extension cannot block the write pipeline. |
| Rule 6 (No Silent Retcons) | N/A (defensive) | Adjacent in spirit (drift detection) but the validator checks navigational consistency, not canon mutation; listed to disclose it is intentionally not in scope as a retcon guard. |

## 6. Testing strategy

- Fixtures per new surface (2 surfaces, both slug-named): (a) artifact on disk, missing INDEX row →
  `index_disk_drift` (`artifact_missing_from_index`); (b) INDEX row with no disk file → `index_disk_drift`
  (`index_entry_missing_on_disk`); (c) fully consistent → no verdict. Both fixtures exercise the non-ID
  (slug) membership predicate across all three predicate sites (`parseIndexEntries`, `diskArtifactsFor`,
  `syntheticRecord`).
- Regression: existing four surfaces' fixtures unchanged and green; assert the index-link gate
  (`parseIndexEntries`) still rejects malformed/foreign links for the ID-prefixed surfaces after the
  predicate generalization.
- **Pre-merge real-world drift remediation (required, not report-only)**: run `world-validate
  --compatibility` over every real world (`worlds/animalia`, `worlds/erotica-world`, …) and **remediate
  all surfaced `characters/` / `diegetic-artifacts/` INDEX drift before completion**. Because the
  validator is `fail`-severity and global-scope in the pre-apply gate, any unremediated drift in a
  newly-covered surface would block the next canon/hybrid write world-wide regardless of which surface
  that write touches.
- `npm run build` + `npm test` in `tools/validators` green before completion.
