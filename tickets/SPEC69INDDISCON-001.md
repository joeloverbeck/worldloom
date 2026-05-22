# SPEC69INDDISCON-001: Generalize `index_disk_consistency` surface model for slug-named surfaces

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends the `index_disk_consistency` structural validator (`tools/validators/src/structural/index-disk-consistency.ts`); no impact on the existing four ID-prefixed surfaces (proposals/audits/pressure-events/character-proposals), which stay byte-identical.
**Deps**: None

## Problem

`index_disk_consistency` diffs each per-world surface's `INDEX.md` against on-disk artifacts and indexed records, emitting `index_disk_drift`. Its `INDEX_SURFACES` registry covers only four **ID-prefixed** proposal surfaces. Two per-world surfaces with producer-maintained indexes — `characters/` (`character_record`, maintained by `character-generation`) and `diegetic-artifacts/` (`diegetic_artifact_record`, maintained by `diegetic-artifact-generation`) — are uncovered, so stale or orphaned rows in those navigation indexes drift undetected and misdirect operators and skills. Both surfaces are **slug-named** (`<char-slug>.md`, `<da-slug>.md`), so they cannot reuse the validator's ID-prefix matching. (Per SPEC-69, `adjudications/` is explicitly out of scope — see Out of Scope.)

## Assumption Reassessment (2026-05-22)

1. **Codebase**: `tools/validators/src/structural/index-disk-consistency.ts` gates membership on `surface.filePattern` at **three** sites, not two: `parseIndexEntries` (line 148, index-link gate `surface.filePattern.test(normalized.slice(...))`), `diskArtifactsFor` (line 164, on-disk gate), and `syntheticRecord` (line 177, nodeId regex `^(?:PR|AU|EPE|NCP)-\d+`). The `indexedRecords` filter (lines 60-64) matches on `node_type` + path-prefix only and is genuinely naming-agnostic. `IndexSurface` is `{ name, directory, nodeType, filePattern }`. Confirmed against the file at reassessment 2026-05-22.
2. **Spec/docs**: SPEC-69 §2.1 (the corrected three-site enumeration) and FOUNDATIONS.md §Canonical Storage Layer (the `characters/`/`diegetic-artifacts/` INDEX surfaces are the human/tool navigation layer over engine-routed hybrid artifacts). Node-types `character_record` / `diegetic_artifact_record` confirmed present in `tools/validators/src/structural/utils.ts`.
3. **Cross-artifact boundary**: `index_disk_consistency` is a `structuralValidator` run in the patch-engine **pre-apply gate** (`tools/validators/src/public/index.ts` `validatePatchPlan`, `run_mode: "pre-apply"`; wired via `tools/world-mcp/src/tools/submit-patch-plan.ts`). Extending coverage extends the set of surfaces whose drift can block a patch plan at `fail` severity. The shared contract is the `IndexSurface` model and the `Verdict` shape — both must stay stable for the existing four surfaces.
4. **FOUNDATIONS principle (Rule 5 + §Canonical Storage Layer)**: Rule 5 (No Consequence Evasion) — the second-order effect of new coverage is that `characters/`/`diegetic-artifacts/` INDEX drift now hard-blocks canon/hybrid writes pre-apply. SPEC-69 §6 routes that consequence to the pre-merge remediation gate (SPEC69INDDISCON-002). This ticket must not weaken the existing four surfaces' detection.
5. **Canon Safety surface**: the validator runs at engine pre-apply time. The change is purely additive navigation-surface coverage — it reads `INDEX.md` links vs disk artifacts vs indexed records and emits drift verdicts. It performs no Mystery Reserve read, no `M-<integer>` resolution, and no canon mutation; the Mystery Reserve firewall is untouched (FOUNDATIONS §Rule 7). Confirm at implementation that the slug-mode predicate adds no path that could suppress an existing-surface drift verdict.

## Architecture Check

1. Generalizing the surface model so disk membership, index-link membership, and synthetic-id derivation are separable from the ID-prefix assumption is cleaner than special-casing slug surfaces inline at each of the three call sites: it localizes the "how does this surface decide membership" decision to the `IndexSurface` declaration and keeps `parseIndexEntries` / `diskArtifactsFor` / `syntheticRecord` reading a single predicate. The existing four surfaces keep an explicit `idPattern`; absence of one (or an explicit `mode` discriminator) selects slug-mode — the implementing diff chooses the lower-churn shape.
2. No backwards-compatibility shim: the existing four surfaces are re-expressed in the generalized model with identical behavior (same `filePattern` semantics), not aliased. There is no dual code path retained "for safety."

## Verification Layers

1. Existing four ID-prefixed surfaces unchanged → codebase grep-proof (`INDEX_SURFACES` still lists proposals/audits/pressure-events/character-proposals with their `^PR|AU|EPE|NCP` patterns) + regression test green.
2. Slug-named surfaces detect both drift directions → skill/validator test (new fixtures: artifact-missing-from-index, index-entry-missing-on-disk, fully-consistent) exercising all three predicate sites.
3. Slug-named index links are NOT filtered out by `parseIndexEntries` → validator test asserting a `[label](slug.md)` link is parsed and matched for a slug-mode surface (the line-148 fix).
4. Compatibility-mode inheritance is automatic → command verification (`world-validate --compatibility <world>` now evaluates `characters/`/`diegetic-artifacts/`) — see Acceptance Criteria; §2.2 is a no-code-change verification assertion (validator already in `COMPATIBILITY_VALIDATORS`).

## What to Change

### 1. Generalize the `IndexSurface` membership model

Extend `IndexSurface` so each surface declares either an `idPattern` (ID-prefixed surfaces) or a slug-named mode whose membership predicate is "any `*.md` except `INDEX.md`". Re-express the existing four surfaces with an explicit `idPattern` (or `mode` discriminator) so their behavior is byte-identical.

### 2. Thread the predicate through all three sites

- `parseIndexEntries` (line 148): replace the `surface.filePattern.test(...)` index-link filter with the surface membership predicate so slug-named `[label](slug.md)` links are retained.
- `diskArtifactsFor` (line 164): replace the on-disk `surface.filePattern.test(entry.name)` gate with the membership predicate ("any `*.md` except `INDEX.md`" for slug-mode).
- `syntheticRecord` (line 177): for slug-mode, derive the nodeId from the file basename (or frontmatter `artifact_id`/`character_id` if cheaply available) instead of the `^(?:PR|AU|EPE|NCP)-\d+` regex. Record matching is by `file_path`, so this only affects drift-message labeling.

### 3. Register the two new surfaces

Add `characters` → `character_record` and `diegetic-artifacts` → `diegetic_artifact_record` to `INDEX_SURFACES` in slug-mode.

### 4. Fixtures + regression

Add fixtures per new surface (artifact-missing-from-index, index-entry-missing-on-disk, fully-consistent) following the existing `mkdtempSync` in-test fixture pattern; both fixtures are slug-named so they exercise the non-ID predicate. Keep the existing four surfaces' fixtures green and add an assertion that the index-link gate still rejects malformed/foreign links for ID-prefixed surfaces after the generalization.

## Files to Touch

- `tools/validators/src/structural/index-disk-consistency.ts` (modify)
- `tools/validators/tests/structural/index-disk-consistency.test.ts` (modify)

## Out of Scope

- `adjudications/` coverage — dropped at reassessment (no maintained `adjudications/INDEX.md`, no producing skill; adding it would block `canon-addition` pre-apply). Deferred to a future index-production + coverage spec per SPEC-69 §4.
- `world-proposals/INDEX.md` / `LINEAGE.md` (repo-root, outside the per-world `worldRootFrom` harness) and `batches/` sub-directory index rows.
- CLI / registry changes (compatibility-mode inheritance is automatic).
- Any change to the existing four ID-prefixed surfaces' detection behavior.
- Remediating real-world INDEX drift (owned by SPEC69INDDISCON-002).

## Acceptance Criteria

### Tests That Must Pass

1. New slug-surface fixtures for `characters/` and `diegetic-artifacts/` produce `index_disk_drift` (`artifact_missing_from_index`) when an artifact is on disk but missing its INDEX row, and `index_disk_drift` (`index_entry_missing_on_disk`) when an INDEX row has no disk file; a fully-consistent fixture produces no verdict.
2. A slug-named `[label](slug.md)` INDEX link is parsed and matched (regression-proof for the line-148 fix) — a fully-consistent slug surface must NOT report every artifact as missing-from-index.
3. `npm --prefix tools/validators test` passes (build + full test suite green, including unchanged ID-prefixed-surface fixtures).

### Invariants

1. The existing four ID-prefixed surfaces' drift detection is unchanged (same patterns, same verdicts).
2. The validator performs no canon read/write and no Mystery Reserve resolution — it remains a navigation-consistency check.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/index-disk-consistency.test.ts` (modify) — add slug-surface fixtures (both drift directions + consistent) for `characters/` and `diegetic-artifacts/`; add the line-148 slug-link-retained assertion; keep ID-prefixed-surface regression cases.

### Commands

1. `npm --prefix tools/validators run build` — compile the generalized surface model.
2. `npm --prefix tools/validators test` — full validator suite (build + `node --test`), the correct verification boundary because the validator's behavior is exercised entirely through its own test module and the existing-surface regression cases live in the same file.
