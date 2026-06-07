# MSSREMOVE-006: Repo-wide residue sweep and removal closeout

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — verification-only; asserts the final zero-residue state across all live surfaces. May make small follow-up edits if the sweep surfaces a missed reference.
**Deps**: MSSREMOVE-001, -002, -003, -004, -005 (this is the closing gate — land after the others)

## Problem

After the package, CI, docs, skill prose, reports, and produced data are removed, a single authoritative sweep must prove that no Manual Story Studio trace remains on any **live** surface, and must explicitly account for the surfaces intentionally retained (archives and the dated manifest snapshot).

## Assumption Reassessment (2026-06-07)

1. Intentionally-retained surfaces (these WILL still match `manual-story` and are excluded from the residue sweep):
   - `archive/specs/` — ~26 MSS specs (SPEC-100..124 + MSSUX-004)
   - `archive/tickets/` — ~200 MSS tickets (`MANSTOSTUFIX-*`, `MSSUX-*`, `SPEC1xxMANSTOSTU-*`)
   - `archive/specs/IMPLEMENTATION-ORDER-*.md` — dated snapshots (mixed MSS + non-MSS rows; left intact)
   - `reports/manifest_2026-06-03.txt` — dated repo-wide file snapshot (retained per MSSREMOVE-005)
   - This ticket family itself (`tickets/MSSREMOVE-*.md`) names the package by necessity.
2. The decision to retain archives is recorded in `docs/triage/2026-06-07-manual-story-studio-removal-triage.md`; the sweep's exclusion list must match that record.
3. Any match outside the retained set after siblings land is a missed reference and must be removed (or, if it is a newly-introduced retained artifact, added to the exclusion list with rationale).

## Architecture Check

1. A single exclusion-scoped grep is the authoritative completion proof; encoding the exclusion list in the acceptance command makes the retained-vs-removed boundary auditable from the command itself.
2. No new tooling is introduced for the sweep — plain `grep` with `--exclude-dir`/`--exclude` is sufficient.

## Verification Layers

1. Zero live residue -> the exclusion-scoped repo-wide grep (below) returns nothing.
2. Retained surfaces intact -> `archive/` MSS files and `reports/manifest_2026-06-03.txt` still present.
3. Package fully gone -> `test ! -d tools/manual-story-studio` and `test ! -f .github/workflows/ci-manual-story-studio.yml`.

## What to Change

### 1. Run the authoritative residue sweep

Execute the sweep command (Acceptance Criteria #1). If it surfaces any match outside the retained set, remove that reference and re-run until clean.

### 2. Confirm the retained set is intentional

Verify the only remaining `manual-story` matches are under `archive/`, in `reports/manifest_2026-06-03.txt`, and in this `tickets/MSSREMOVE-*` family — matching the triage decision record.

## Files to Touch

- (verification-only; any file the sweep flags as a missed reference — none expected if siblings landed correctly)

## Out of Scope

- Re-deleting or editing the intentionally-retained archives and manifest snapshot.

## Acceptance Criteria

### Tests That Must Pass

1. Authoritative sweep returns nothing:
   `grep -rn "manual-story" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive --exclude-dir=dist --exclude=manifest_2026-06-03.txt | grep -v "tickets/MSSREMOVE-" && echo FAIL || echo OK`
2. `test ! -d tools/manual-story-studio && test ! -f .github/workflows/ci-manual-story-studio.yml && echo OK`
3. Retained surfaces present: `ls archive/specs/SPEC-100-manual-story-studio-package-boundary.md reports/manifest_2026-06-03.txt >/dev/null && echo OK`

### Invariants

1. No live (non-archive, non-snapshot) surface references Manual Story Studio.
2. The intentionally-retained archive history and dated manifest snapshot remain untouched.

## Test Plan

### New/Modified Tests

1. `None — closeout/verification ticket; the sweep command is the test.`

### Commands

1. `grep -rn "manual-story" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive --exclude-dir=dist --exclude=manifest_2026-06-03.txt | grep -v "tickets/MSSREMOVE-"`
2. `test ! -d tools/manual-story-studio && test ! -f .github/workflows/ci-manual-story-studio.yml && echo "package + CI removed"`
