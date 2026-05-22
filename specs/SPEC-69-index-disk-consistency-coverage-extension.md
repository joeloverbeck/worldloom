# SPEC-69 — `index_disk_consistency` Coverage Extension to Hybrid & Adjudication Surfaces

**Status:** DRAFT
**Date:** 2026-05-22
**Classification:** canon-related (extends a structural validator over canon-pipeline navigation surfaces; no canon-semantics change)
**Source:** `reports/world-system-consolidation-second-iteration.md` Fault 6 / §12.6 — **corrected** at triage against `main` (the validator already exists; this extends its surface coverage rather than adding a new validator)
**Depends on:** none — independent of SPEC-68
**Companion:** `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`

## 1. Context

The report proposes a **new** `index_surface_consistency` validator. Verified against `main`: the
validator already exists as `index_disk_consistency`
(`tools/validators/src/structural/index-disk-consistency.ts`, in the registry and in the SPEC-64
`--compatibility` subset). It diffs each surface's `INDEX.md` (parsed markdown links) against on-disk
artifacts and indexed records, emitting `index_disk_drift` (fail pre-apply/incremental, warn full-world).

The genuine finding is a **coverage gap**: `INDEX_SURFACES` (lines 27–32) lists only four
ID-prefixed proposal surfaces:

```
proposals (PR)  ·  audits (AU)  ·  pressure-events (EPE)  ·  character-proposals (NCP)
```

Uncovered per-world surfaces with live `INDEX.md` files:

| Surface | node_type (verified `utils.ts`) | Filename convention | Extension fit |
|---|---|---|---|
| `adjudications/` | `adjudication_record` | `PA-<int>-*.md` (ID-prefixed) | clean — same pattern as existing 4 |
| `characters/` | `character_record` | `<char-slug>.md` (**slug-named**) | needs non-ID membership predicate |
| `diegetic-artifacts/` | `diegetic_artifact_record` | `<da-slug>.md` (**slug-named**) | needs non-ID membership predicate |

The slug-named surfaces are the design crux the report glossed: the current validator gates disk
membership on `surface.filePattern.test(entry.name)` (line 164) and derives synthetic-record ids from a
`^(?:PR|AU|EPE|NCP)-\d+` regex (line 177). Both assume **ID-prefixed filenames**. `characters/` and
`diegetic-artifacts/` files are slug-named, so a `^CHAR-\d+` / `^DA-\d+` `filePattern` would match nothing.

## 2. Changes

Single file: `tools/validators/src/structural/index-disk-consistency.ts`.

### 2.1 Add the ID-prefixed surface (clean)

Append to `INDEX_SURFACES`:

- `adjudications` → node_type `adjudication_record`, `filePattern: /^PA-\d+[^/]*\.md$/`.

### 2.2 Add the slug-named surfaces (requires a membership predicate)

`characters/` and `diegetic-artifacts/` cannot reuse ID-prefix matching. Generalize the surface model so
disk membership and synthetic-id derivation are separable from the index-link gate:

- Extend `IndexSurface` so a surface declares either an `idPattern` (existing ID-prefixed surfaces) **or**
  a slug-named mode whose disk predicate is "any `*.md` except `INDEX.md`". The existing
  `indexedRecords` filter (node_type + path-prefix, lines 60–64) and `parseIndexEntries` (markdown-link
  matching, lines 130–154) are already naming-agnostic — only `diskArtifactsFor`'s `filePattern` gate
  (line 164) and `syntheticRecord`'s nodeId regex (line 177) need the new mode.
- For slug-named surfaces, `syntheticRecord` falls back to the file basename (or frontmatter
  `artifact_id`/`character_id` if cheaply available) as the node id — drift messages still name the path.
- Add `characters` → `character_record` and `diegetic-artifacts` → `diegetic_artifact_record`.

Implementation may keep the existing four surfaces byte-identical by giving them an explicit `idPattern`
and treating the absence of one as slug-mode, or by an explicit `mode` discriminator — the implementing
ticket chooses the lower-churn shape. No behavior change for the existing four surfaces.

### 2.3 Compatibility-mode inheritance

`index_disk_consistency` is already in the `--compatibility` subset (SPEC-64), so the new coverage flows
into `world-validate --compatibility` automatically. No CLI or registry change.

## 3. Edge cases / reassessment at implementation time

- **Confirm filename conventions** for `characters/` and `diegetic-artifacts/` against real worlds before
  coding (`SKILL.md` states `<char-slug>.md` / `<da-slug>.md`; verify no ID-prefixed legacy files coexist).
- **Confirm `INDEX.md` link format** in those directories matches the existing markdown-link parser
  (`[label](relative.md)`); if an index uses a different row format, the parser must be reconciled.
- **`adjudications/` index presence** — confirm an `adjudications/INDEX.md` is actually maintained; if no
  index file exists, `parseIndexEntries` returns empty and every PA on disk reports as missing-from-index,
  which is the correct signal (the index should exist) but should be verified as intended.
- Severity unchanged: fail under pre-apply/incremental, warn under full-world (and thus warn under
  `--compatibility` full-world runs).

## 4. Out of Scope

- **`world-proposals/INDEX.md` and `world-proposals/LINEAGE.md`** — these live at the **repository root**,
  not under `worlds/<slug>/`, so they are outside this per-world validator's `worldRootFrom` harness.
  Root-level proposal-surface index validation is a separate, lower-value concern; defer.
- `batches/` sub-directory index rows (proposal/character/pressure batches) — not currently indexed as
  surfaces; out of scope.
- Any new validator — this is a coverage extension to an existing one.

## 5. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Canonical Storage Layer (read/navigation discipline) | aligns | `INDEX.md` surfaces are the human/tool navigation layer over engine-routed hybrid + adjudication artifacts; stale rows misdirect operators and skills. Extending coverage keeps navigation faithful to disk. |
| §Artifact Authority and Maturity | aligns | Validates that realized-hybrid (`CHAR`/`DA`) and adjudication (`PA`) artifacts are discoverable without granting them any authority they lack — purely a consistency check. |
| Rule 6 (No Silent Retcons) | N/A (defensive) | Adjacent in spirit (drift detection) but the validator checks navigational consistency, not canon mutation; listed to disclose it is intentionally not in scope as a retcon guard. |

## 6. Testing strategy

- Fixtures per new surface: (a) artifact on disk, missing INDEX row → `index_disk_drift`
  (`artifact_missing_from_index`); (b) INDEX row with no disk file → `index_disk_drift`
  (`index_entry_missing_on_disk`); (c) fully consistent → no verdict. Include a slug-named DA/CHAR case to
  exercise the non-ID predicate.
- Regression: existing four surfaces' fixtures unchanged and green.
- Run over real worlds (`world-validate --compatibility`) and report any newly-surfaced drift as findings
  (not auto-fixed).
- `npm run build` + `npm test` in `tools/validators` green before completion.
