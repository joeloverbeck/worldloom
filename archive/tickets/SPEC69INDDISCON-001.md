# SPEC69INDDISCON-001: Generalize `index_disk_consistency` surface model for slug-named surfaces

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends the `index_disk_consistency` structural validator (`tools/validators/src/structural/index-disk-consistency.ts`); no impact on the existing four ID-prefixed surfaces (proposals/audits/pressure-events/character-proposals), which stay byte-identical.
**Deps**: None

## Problem

At intake, `index_disk_consistency` diffed each per-world surface's `INDEX.md` against on-disk artifacts and indexed records, emitting `index_disk_drift`, but its `INDEX_SURFACES` registry covered only four **ID-prefixed** proposal surfaces. Two per-world surfaces with producer-maintained indexes — `characters/` (`character_record`, maintained by `character-generation`) and `diegetic-artifacts/` (`diegetic_artifact_record`, maintained by `diegetic-artifact-generation`) — were uncovered, so stale or orphaned rows in those navigation indexes drifted undetected and misdirected operators and skills. Both surfaces are **slug-named** (`<char-slug>.md`, `<da-slug>.md`), so they cannot reuse the validator's ID-prefix matching. (Per SPEC-69, `adjudications/` is explicitly out of scope — see Out of Scope.)

## Assumption Reassessment (2026-05-22)

1. **Codebase**: At intake, `tools/validators/src/structural/index-disk-consistency.ts` gated membership on `surface.filePattern` at **three** sites, not two: `parseIndexEntries`, `diskArtifactsFor`, and `syntheticRecord`'s hard-coded `^(?:PR|AU|EPE|NCP)-\d+` node-id regex. The `indexedRecords` filter matched on `node_type` + path-prefix only and was genuinely naming-agnostic. Implementation generalized `IndexSurface` to ID-prefixed vs slug mode and routes all three sites through the shared surface artifact predicate / per-surface id pattern.
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

## Landed Changes

### 1. Generalize the `IndexSurface` membership model

`IndexSurface` now declares a `mode` (`id-prefixed` or `slug`), with ID-prefixed surfaces carrying explicit `filePattern` and `idPattern` values and slug surfaces accepting any direct `*.md` except `INDEX.md`. The existing four surfaces are re-expressed through `idPrefixedSurface(...)` with the same filename patterns.

### 2. Thread the predicate through all three sites

- `parseIndexEntries` uses the shared membership predicate so slug-named `[label](slug.md)` links are retained.
- `diskArtifactsFor` uses the same predicate for on-disk membership.
- `syntheticRecord` derives ID-prefixed node ids from the surface's explicit `idPattern` and falls back to the basename for slug-mode synthetic records. Record matching remains by `file_path`, so this only affects drift-message labeling.

### 3. Register the two new surfaces

Added `characters` -> `character_record` and `diegetic-artifacts` -> `diegetic_artifact_record` to `INDEX_SURFACES` in slug-mode.

### 4. Fixtures + regression

Added focused structural tests for slug-surface artifact-missing, slug-surface missing-on-disk, fully consistent slug surfaces, and ID-prefixed link filtering after the generalization. The tests use the existing `mkdtempSync` in-test fixture pattern and keep the existing four ID-prefixed cases green.

## Files to Touch

- `tools/validators/src/structural/index-disk-consistency.ts` (modified)
- `tools/validators/tests/structural/index-disk-consistency.test.ts` (modified)
- `archive/specs/SPEC-69-index-disk-consistency-coverage-extension.md` (modified with implementation note)

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
3. `cd tools/validators && npm test` passes (build + full test suite green, including unchanged ID-prefixed-surface fixtures).

### Invariants

1. The existing four ID-prefixed surfaces' drift detection is unchanged (same patterns, same verdicts).
2. The validator performs no canon read/write and no Mystery Reserve resolution — it remains a navigation-consistency check.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/index-disk-consistency.test.ts` (modify) — add slug-surface fixtures (both drift directions + consistent) for `characters/` and `diegetic-artifacts/`; add the line-148 slug-link-retained assertion; keep ID-prefixed-surface regression cases.

### Commands

1. `cd tools/validators && npm run build` — compile the generalized surface model.
2. `node --test tools/validators/dist/tests/structural/index-disk-consistency.test.js` — focused compiled structural coverage for the generalized predicate and slug surfaces.
3. `cd tools/validators && npm test` — full validator suite (build + `node --test`), the correct verification boundary because the validator's behavior is exercised entirely through its own test module and the existing-surface regression cases live in the same file.

## Outcome

Completed: 2026-05-22.

Implemented the SPEC-69 code slice by generalizing `index_disk_consistency` from a single `filePattern` assumption to explicit ID-prefixed vs slug surface modes, then registering `characters/` and `diegetic-artifacts/` as slug-named surfaces. Added focused compiled tests proving both slug drift directions, the fully consistent slug case, and unchanged ID-prefixed link filtering.

SPEC69INDDISCON-002 remains the owner for real-world `characters/INDEX.md` / `diegetic-artifacts/INDEX.md` remediation after this coverage exists.

## Verification Result

1. `cd tools/validators && npm run build` — PASS; TypeScript compiled the generalized surface model.
2. `node --test tools/validators/dist/tests/structural/index-disk-consistency.test.js` — PASS; 8/8 focused tests passed.
3. `cd tools/validators && npm test` — PASS; 877/877 package tests passed.

## Deviations

- The drafted `npm --prefix tools/validators test` command was not the truthful broad proof from the repo root because CLI tests derive `dist/src/cli/world-validate.js` from `process.cwd()`. Running from `tools/validators` is the package-local contract that exercises the same build and test suite successfully.
- The initial build failed before package setup because local `node_modules` were absent; `tools/world-index`, `tools/patch-engine`, and `tools/validators` dependencies/build artifacts were installed or rebuilt as ignored proof artifacts. No package manifest or lockfile change is part of this ticket.
