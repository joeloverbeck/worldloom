# STOEXPFIX-001: Skip atomic-logical world files in story-explorer drift detection

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/index-status.ts` (read-only behavior, no new public surface)
**Deps**: none

## Problem

At intake, after running `npm exec --prefix tools/story-explorer -- world-index sync <world-slug> --quiet`, the Story Explorer UI continued to display `11 file(s) drifted. Run \`npm exec --prefix tools/story-explorer -- world-index sync <world-slug> --quiet\` to refresh indexed reads.` on every story-bundle list page for any SPEC-13 atomic-mode world (observed against `erotica-world`, 11 drifted files reported).

The historical "11 drifted files" were exactly the eleven entries in `ATOMIC_LOGICAL_WORLD_FILES` (`tools/world-index/src/parse/atomic.ts:16-28`): `CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `PEOPLES_AND_SPECIES.md`, `TIMELINE.md`. These are synthetic anchors for `domain_file` nodes created by `createAtomicLogicalFileResults`; for atomic-mode worlds they are written into the `file_versions` table but never exist on disk by design. Before this ticket, the drift detector in `tools/story-explorer/src/read/index-status.ts` flagged any `file_versions` row whose physical path was missing as drifted, so the warning fired on every page load regardless of how recently `world-index sync` ran.

That degraded the index-status signal — operators learned to ignore the banner because it was always shown — and silently weakened the "indexed reads are fresh" contract that consumers of `resolveIndexStatus` (notably `readIndexedRecord`, `listPageRecords`) depend on to choose the indexed read path over the slower / less safe raw-read fallback.

## Assumption Reassessment (2026-05-26)

1. At intake, `tools/story-explorer/src/read/index-status.ts` (`driftedFiles`) called `existsSync(path.join(worldDir, row.file_path))` for every `file_versions` row and reported any missing path as drifted. YAML files were intentionally skipped for hash comparison, but the missing-file branch fired for every row regardless of file type. The completed implementation now checks `ATOMIC_LOGICAL_WORLD_FILE_SET` before the existence test.
2. `ATOMIC_LOGICAL_WORLD_FILES` is already re-exported as a public surface at `tools/world-index/src/public/types.ts:44` (`export { ATOMIC_LOGICAL_WORLD_FILES } from "../parse/atomic.js";`); the existing package.json `"./public/types"` export entry surfaces it for downstream consumers. The import path `@worldloom/world-index/public/types` already exists and is suitable for story-explorer to depend on; no new public surface is introduced.
3. Shared boundary under audit: the `file_versions` table contract between `world-index sync` (writer) and story-explorer `resolveIndexStatus` (reader). `world-index` upserts an entry for every indexed file including synthetic atomic-logical files; before this ticket, the reader treated absence-on-disk as drift. This ticket teaches the reader to recognize the synthetic-anchor case explicitly via the same `ATOMIC_LOGICAL_WORLD_FILES` constant the writer uses.
4. FOUNDATIONS §Canonical Storage Layer (`docs/FOUNDATIONS.md:578`) is the principle under audit: the retired root-level markdown files do not exist on machine-layer-enabled worlds. The completed drift detector now treats those synthetic anchors as expected rows instead of missing physical files.
5. Adjacent contradictions exposed: none. The drift detector's hash comparison branch is unaffected; the YAML-skip branch is unaffected. Only the missing-file branch gained the synthetic-anchor exclusion.
6. Baseline before the active source edit: `cd tools/story-explorer && npm run build:backend` passed; `cd tools/story-explorer && node --test dist/test/index-status.test.js` passed with 9 tests. Same-package files already carried pre-existing dirty remedy-command and README/web-test changes; this ticket only owns the atomic-logical skip and the two focused `index-status` regression tests.

## Architecture Check

1. The landed fix uses the existing `ATOMIC_LOGICAL_WORLD_FILES` constant — the same source-of-truth the writer side uses — so the reader and writer cannot drift apart silently. Alternative approaches (hard-coding the eleven filenames in story-explorer; introducing a new "synthetic" boolean column on `file_versions`; adding a heuristic on file extension) all introduce duplication or schema surface changes; reusing the existing public constant is the smallest and most coherent fix.
2. No backwards-compatibility shims or aliasing introduced. The change is a single guard inside `driftedFiles` plus one import.

## Verification Layers

1. `driftedFiles` skips rows whose `file_path` ∈ `ATOMIC_LOGICAL_WORLD_FILES` -> codebase grep-proof (`tools/story-explorer/src/read/index-status.ts`)
2. `resolveIndexStatus` reports `kind: "fresh"` for an indexed atomic-mode-style fixture whose `file_versions` rows are exactly `ATOMIC_LOGICAL_WORLD_FILES` and whose physical root markdown files are absent -> targeted unit test
3. FOUNDATIONS §Canonical Storage Layer alignment (synthetic logical files do not exist on disk by design) -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md:578`)
4. Existing drift detection still flags genuinely-modified and genuinely-missing physical markdown files -> targeted unit tests exercising the hash-mismatch and missing-file branches

## Landed Changes

### 1. Import the public constant

`tools/story-explorer/src/read/index-status.ts` imports the public constant:

```typescript
import { ATOMIC_LOGICAL_WORLD_FILES } from "@worldloom/world-index/public/types";
```

### 2. Guard the missing-file branch

In `driftedFiles`, before the `existsSync` check, rows whose `file_path` is a synthetic atomic-logical file are skipped:

```typescript
for (const row of rows) {
  if (ATOMIC_LOGICAL_WORLD_FILE_SET.has(row.file_path)) {
    continue;
  }
  const absolutePath = path.join(worldDir, row.file_path);
  if (!existsSync(absolutePath)) {
    drifted.push(row.file_path);
    continue;
  }
  // ... unchanged hash-comparison branch
}
```

### 3. Test coverage

`tools/story-explorer/test/index-status.test.ts` now seeds `file_versions` rows for each entry in `ATOMIC_LOGICAL_WORLD_FILES` against a temp world and asserts `resolveIndexStatus(...).kind === "fresh"`; the synthetic rows do not cause a `"stale"` verdict. The file also now asserts a genuinely missing physical markdown file still surfaces as drift, while the existing hash-mismatch test still covers modified markdown drift.

## Files to Touch

- `tools/story-explorer/src/read/index-status.ts` (modify)
- `tools/story-explorer/test/index-status.test.ts` (modify)

## Out of Scope

- Any changes to `world-index` write-side behavior. The synthetic `file_versions` rows for `ATOMIC_LOGICAL_WORLD_FILES` continue to exist; they anchor `domain_file` nodes consumed by retrieval-side queries.
- Behavior for legacy (non-atomic) worlds. Legacy worlds physically contain `CANON_LEDGER.md` etc., so the existence check still validates real drift — this fix only short-circuits the synthetic-anchor case, never the real-file case.
- Broader changes to drift-detection UX (banner copy, batching of warnings, per-file display). The banner copy is correct when drift is actually present; this fix removes the false-positive trigger only.
- STCHAR raw-read mapping fix — that ships in STOEXPFIX-002.

## Acceptance Criteria

### Tests That Must Pass

1. New `tools/story-explorer/test/index-status.test.ts` case: seeding `file_versions` rows for every `ATOMIC_LOGICAL_WORLD_FILES` entry against a temp atomic-mode world yields `kind: "fresh"` (or `"empty"` when `nodeCount === 0`), never `"stale"`.
2. Existing `tools/story-explorer/test/index-status.test.ts` cases covering genuine drift (hash mismatch on a modified markdown file; missing physical file for a real indexed path) still produce `kind: "stale"`.
3. `cd tools/story-explorer && npm test` passes.

### Invariants

1. `driftedFiles` MUST NOT report any `ATOMIC_LOGICAL_WORLD_FILES` entry as drifted, for any world, ever.
2. `driftedFiles` MUST continue to report genuinely missing physical files and hash-mismatched non-YAML files as drifted.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/index-status.test.ts` — extend with the synthetic-anchor regression case and a genuine-drift positive case to lock both branches.

### Commands

1. `cd tools/story-explorer && npm run build:backend`
2. `cd tools/story-explorer && node --test dist/test/index-status.test.js`
3. `cd tools/story-explorer && npm test`

## Outcome

`resolveIndexStatus` now skips synthetic atomic logical world-file anchors before checking for physical disk existence, using `ATOMIC_LOGICAL_WORLD_FILES` from `@worldloom/world-index/public/types`. Synthetic `file_versions` rows for retired root markdown files no longer make atomic-mode worlds stale, while real missing or hash-mismatched markdown files still produce `kind: "stale"`.

## Verification Result

1. `cd tools/story-explorer && npm run build:backend` — passed before and after the source edit.
2. `cd tools/story-explorer && node --test dist/test/index-status.test.js` — passed after the source edit with 11 tests, including `resolveIndexStatus ignores missing atomic logical file anchors` and `resolveIndexStatus returns stale for missing physical markdown files`.
3. `cd tools/story-explorer && npm test` — passed; backend `node:test` reported 80 tests passing, and web Vitest reported 76 files / 184 tests passing. The run emitted existing React Router future-flag warnings and the expected jsdom error-boundary stderr from the error-boundary a11y test; the command exited 0.
4. Manual code review confirmed FOUNDATIONS §Canonical Storage Layer alignment: retired root markdown files are not physical files on machine-layer-enabled worlds, and the reader now treats their synthetic index rows accordingly.

## Deviations

1. The drafted live `erotica-world` manual smoke was not run. The accepted proof uses temp indexed fixtures plus the full package test suite so this ticket does not mutate checkout-local private world `_index/` state.
2. `tools/story-explorer/src/read/index-status.ts` and `tools/story-explorer/test/index-status.test.ts` already had pre-existing same-seam remedy-command edits when this run began. This ticket owns the `ATOMIC_LOGICAL_WORLD_FILES` skip guard and the two focused drift-regression tests; the pre-existing remedy-command hunks were preserved.
