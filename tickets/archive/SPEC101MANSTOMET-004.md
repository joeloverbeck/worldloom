# SPEC101MANSTOMET-004: ID allocator for Manual Studio records

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/write/id-allocator.ts`.
**Deps**: None

## Problem

Every Manual Studio record CRUD-create needs a fresh ID inside the POST handler. The allocator must scan the per-class directory, find the highest existing integer suffix for the class prefix (e.g., `mbel-*`), and return `max + 1`. Two correctness properties are load-bearing: (1) determinism — creating N records of class X yields prefix-1 through prefix-N when starting from empty; (2) gap preservation — after hard-delete of `mbel-3`, the next allocation returns `mbel-4` (the gap is preserved, not filled), matching SPEC-101 §7 AC #3. Reusing deleted IDs would silently overwrite the meaning of any external reference (segment notes, prompt history, future references) that still cited the deleted ID; gap preservation is the discipline against that latent class of bugs.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/write/` exists with `sandbox.ts` from SPEC-100 (verified via `ls tools/manual-story-studio/src/write/`); this ticket adds `id-allocator.ts` alongside. The allocator does NOT depend on the schema types module (SPEC101MANSTOMET-001) — it scans the filesystem and parses integers from filenames; it can land in parallel with the schema foundation ticket.
2. SPEC-101 §3 Key decisions records the allocator contract: *"ID allocation is per-class, per-manual-story, append-only natural integer suffix. Allocator at `tools/manual-story-studio/src/write/id-allocator.ts` scans the class directory, computes `max(existing_numeric_suffix) + 1`, and reserves the next ID inside the POST handler."* SPEC-101 §7 AC #3 names the determinism + gap-preservation test contract.
3. Cross-artifact boundary under audit: `id-allocator.ts` becomes a dependency of `src/write/records.ts` (SPEC101MANSTOMET-006) — the write layer invokes the allocator at CRUD-create time. The allocator's contract is purely filesystem-scan; it does NOT consume the schema types or the validators. The sandbox boundary (`sandbox.ts` from SPEC-100) wraps the actual write call; the allocator runs BEFORE the sandbox check (the allocated path is then passed through the sandbox).
4. FOUNDATIONS principle motivating this ticket: **FOUNDATIONS-002 unpadded natural-integer suffix convention** (per `docs/FOUNDATIONS.md §Canonical Storage Layer` and `docs/ID-ALLOCATION.md §Allocation discipline`). Although Manual Studio IDs are not allocated via `mcp__worldloom__allocate_next_id` (per `docs/ID-ALLOCATION.md §Manual-story-scoped`, added during in-session reassess-spec), the per-class append-only integer-suffix discipline is the same — `M-1` not `M-0001`, scan-and-increment not scan-and-fill, never reuse deleted IDs. The local allocator implements the convention's spirit at the non-canon authoring surface.

## Architecture Check

1. Filesystem-scan-on-each-allocation (rather than caching the last-allocated ID per class) is correct for a single-server local writing cockpit: race conditions are not a meaningful concern (per SPEC-101 §3), and scan cost is O(records-in-class) which scales fine for manual-story scale (typical class size <100). Caching would add invalidation complexity for zero scale benefit.
2. No backwards-compatibility shims. SPEC-100 introduced no ID allocator; this is the first ID-allocation surface in the package.

## Verification Layers

1. Empty class directory yields `<prefix>-1` → codebase grep-proof + test fixture.
2. Class with [1, 2, 3] yields `<prefix>-4` → test fixture.
3. Class with gap [1, 3, 5] yields `<prefix>-6` (gap preserved) → test fixture, matches SPEC-101 §7 AC #3.
4. Multiple classes allocate independently → test asserts `mbel-*` and `mrel-*` increment separately.
5. Non-numeric filename in class directory is skipped without throwing → test fixture introduces a stray `README.md` in the class directory; allocator ignores it.

## What to Change

### 1. Create `tools/manual-story-studio/src/write/id-allocator.ts`

Module exports:

- **`allocateNextId(manualStoryRoot: string, classDir: string, prefix: string): string`** — entry point.
  - Reads `<manualStoryRoot>/records/<classDir>/`; if missing, returns `<prefix>-1`.
  - Lists files matching `^<prefix>-(\d+)\.yaml$` regex (ignores `README.md`, dotfiles, non-matching names).
  - Extracts the integer suffix from each match; returns `<prefix>-<max+1>` (or `<prefix>-1` if empty).
  - Does NOT create the file on disk; returns the ID string only. The write layer creates the file after the schema + ref validators pass.

- **`allocateNextIdForClass(manualStoryRoot: string, recordClass: ManualRecordClass): string`** — convenience wrapper that looks up `(classDir, prefix)` from `MANUAL_RECORD_CLASS_PREFIXES` (SPEC101MANSTOMET-001) and delegates to `allocateNextId`.

### 2. Filename pattern discipline

The regex `^<prefix>-(\d+)\.yaml$` is strict: it matches `mbel-3.yaml` but not `mbel-3.yml`, `Mbel-3.yaml`, `mbel-3.txt`, `mbel-3-foo.yaml`, or `mbel-foo.yaml`. Strict matching is the structural guard against accidental ID-namespace pollution. If a future class needs a slug suffix (parallel to `SAU-1-2026-05-13.md`), this allocator's regex is the explicit single point that needs widening — discoverable via grep.

### 3. Tests

Create `tools/manual-story-studio/test/write/id-allocator.test.ts` covering:

- **Empty directory**: assert `allocateNextId(tmpRoot, "beliefs", "mbel") === "mbel-1"`.
- **Sequential**: fixture `mbel-1.yaml`, `mbel-2.yaml`, `mbel-3.yaml`; assert returns `mbel-4`.
- **Gap preservation**: fixture `mbel-1.yaml`, `mbel-3.yaml`, `mbel-5.yaml` (gap at 2 and 4); assert returns `mbel-6` (NOT `mbel-2` — gaps preserved).
- **Multi-class independence**: fixture `beliefs/mbel-3.yaml` and `relationships/mrel-2.yaml`; assert `mbel-*` allocates to `mbel-4` and `mrel-*` allocates to `mrel-3`.
- **Stray files ignored**: fixture `beliefs/mbel-3.yaml` + `beliefs/README.md` + `beliefs/.DS_Store`; assert returns `mbel-4` (non-matching files ignored).
- **Missing class directory**: assert `allocateNextId(tmpRoot, "newClass", "mnew") === "mnew-1"` (no directory yet; treats as empty).
- **`allocateNextIdForClass` convenience**: assert `allocateNextIdForClass(tmpRoot, "beliefs") === "mbel-1"` from empty.

## Files to Touch

- `tools/manual-story-studio/src/write/id-allocator.ts` (new)
- `tools/manual-story-studio/test/write/id-allocator.test.ts` (new)

## Out of Scope

- Reservation / locking against concurrent allocations — out of scope per SPEC-101 §3 ("The allocator is single-server (Manual Studio backend serves one client); race conditions are not a meaningful concern").
- ID assignment for `mtemplate-*` beat templates — SPEC-104.
- Cross-manual-story shared ID coordination — M6 deferral per SPEC-101 §8 Risks.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including the new `test/write/id-allocator.test.ts` (SPEC-101 AC #3: deterministic allocation, gap preservation).
2. `cd tools/manual-story-studio && npm run build:backend` succeeds.
3. `grep -n "max" tools/manual-story-studio/src/write/id-allocator.ts` confirms the `max + 1` algorithm is present (not e.g., `length + 1` which would be wrong under gaps).

### Invariants

1. The allocator never reuses a deleted ID — gap preservation is the load-bearing test (SPEC-101 §7 AC #3 wording).
2. The allocator never throws on missing class directory or stray non-matching files.
3. The regex `^<prefix>-(\d+)\.yaml$` is the single structural pattern; widening it (for future slug suffixes) is a single-grep-discoverable change.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/id-allocator.test.ts` — empty / sequential / gap-preservation / multi-class / stray-files / missing-directory / convenience-wrapper tests.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test dist/test/write/id-allocator.test.js` (after `npm run build:backend`)
