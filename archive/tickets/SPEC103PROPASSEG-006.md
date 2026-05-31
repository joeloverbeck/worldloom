# SPEC103PROPASSEG-006: Deterministic manuscript.md compiler

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/manuscript/compile.ts` + paired test under `tools/manual-story-studio/test/manuscript/compile.test.ts`. Introduces a new `src/manuscript/` subdirectory under the manual-story-studio package.
**Deps**: archive/tickets/SPEC103PROPASSEG-001.md

## Problem

SPEC-103 §2 item 4 + §7 AC#5 require a deterministic compiler that reads `manual-story.yaml` `segment_order`, reads each segment's `segments/SEG-<n>.md` body in order, concatenates them with one blank line between segments, optionally prepends each segment's `## <title>` heading from the sidecar when `manuscript.include_segment_titles: true`, and writes the result to `<manualStoryRoot>/manuscript.md`. Determinism is the key test surface: fixture segments → byte-identical `manuscript.md` across N runs. The compiler is idempotent and side-effect-free beyond the one `manuscript.md` write (no records read or written).

## Assumption Reassessment (2026-05-31)

1. `manual-story.yaml` `segment_order: string[]` field exists at `tools/manual-story-studio/src/schema/manual-story.ts:94` and is the source of truth for ordering (per SPEC-103 §3 Key decisions: *"`manual-story.yaml` `segment_order` is the source of truth for segment ordering. The manuscript compiler reads it; the filesystem listing of `segments/*.md` is not authoritative."*). The `manuscript.include_segment_titles` flag at `src/schema/manual-story.ts:76` defaults to `false` (per `src/write/manual-story-metadata.ts:85`). The new `manuscript.allow_reorder` field from ticket 001 governs the UI affordance only — the compiler reads `segment_order` regardless and does not honor any reorder flag at compile time.
2. SPEC-103 §2 item 4 (compiler spec), §3 Key decisions ("Deterministic compilation, not incremental"; "`manual-story.yaml` `segment_order` is the source of truth"; "first-rebuild on an empty `segment_order` writes an empty `manuscript.md`. This is acceptable"), §7 AC#5 (byte-identical compile across runs), §4 Create includes `src/manuscript/compile.ts`.
3. Cross-skill boundary: compiler is consumed by ticket 004's save flow (when `compile_on_segment_save: true`) and by ticket 009's manuscript routes (POST rebuild). It reads only `manual-story.yaml` + `segments/SEG-<n>.md` + `segments/SEG-<n>.yaml`; it does NOT read any record file under `records/`. The output `manuscript.md` is consumed by ticket 007's `readManuscript` + ticket 013's Manuscript page.
4. FOUNDATIONS §9 Prose Length Discipline: manuscript word count is advisory (per SPEC-103 §3 Key decisions); no floor / ceiling / quota at compile time. FOUNDATIONS §Canonical Storage Layer engine-only-write: `manuscript.md` is written via the SPEC-100 sandbox under `<manualStoryRoot>/manuscript.md`, outside `_source/`. The compiler must respect the sandbox even though `manuscript.md` is the only file it writes — the write path resolves through the sandbox helper to enforce the realpath boundary.

## Architecture Check

1. Full-recompile (read all segments + write the whole file every time) is the right shape for MVP per SPEC-103 §3 Key decisions: *"if manuscripts grow large enough that recompile latency becomes annoying, optional incremental compile is M6"*. Avoids incremental-state bookkeeping that would complicate determinism — every compile produces the same output for the same inputs.
2. No backwards-compatibility aliasing — net-new compiler module; no prior manuscript-compile code.

## Verification Layers

1. Byte-identical output across runs (same fixture `manual-story.yaml` + `segments/*.md` + `segments/*.yaml` → byte-equivalent `manuscript.md` across N invocations) → unit test
2. `include_segment_titles: true` prepends `## <title>` heading before each segment body; `false` omits → unit test (two fixtures, one per flag value)
3. Empty `segment_order` → writes empty `manuscript.md` (legitimate state per SPEC-103 §8 Risks) → unit test
4. Filesystem-listing ordering of `segments/*.md` is NOT authoritative; `segment_order` is the only source → unit test (fixture with segments whose filesystem-listing order differs from `segment_order`; compiler honors `segment_order`)
5. Compiler reads zero record files under `records/` and writes only `manuscript.md` → unit test (`records/` directory `fs.statSync` mtime unchanged; no file under `records/` accessed)

## Landed Changes

### 1. Create src/manuscript/compile.ts

`tools/manual-story-studio/src/manuscript/compile.ts` now exports `compileManuscript({ manualStoryRoot })`.

The compiler reads `<manualStoryRoot>/manual-story.yaml`, follows `segment_order` exactly, reads each ordered `segments/SEG-<n>.md` body, optionally reads `segments/SEG-<n>.yaml` for the segment title when `manuscript.include_segment_titles` is `true`, joins segment fragments with one blank line, and writes `<manualStoryRoot>/manuscript.md` through `safeWriteFile`.

The result reports `manuscript_path`, `segments_compiled`, and UTF-8 `byte_count`. The implementation does not consult filesystem ordering for segments and does not read or write record files.

### 2. Create test/manuscript/compile.test.ts

`tools/manual-story-studio/test/manuscript/compile.test.ts` now covers:

- determinism across repeated runs
- `include_segment_titles: true`
- `include_segment_titles: false`
- empty `segment_order`
- `segment_order` as the only ordering source
- no record or prompt directory mutation and only `manuscript.md` added at the manual-story root

## Files to Touch

- `tools/manual-story-studio/src/manuscript/compile.ts` (new — introduces the `src/manuscript/` subdirectory)
- `tools/manual-story-studio/test/manuscript/compile.test.ts` (new — introduces the `test/manuscript/` subdirectory parallel to existing `test/write/`, `test/read/`, etc.)

## Out of Scope

- Incremental compile (M6 deferral per SPEC-103 §3 Key decisions)
- The Rebuild Manuscript HTTP route (covered by ticket 009 — invokes this compiler)
- Manuscript file reading for display (covered by ticket 007 — `readManuscript`)
- Frontend Manuscript view rendering (covered by ticket 013)
- Word-count display (handled by ticket 013 frontend, computed from the read body)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/manuscript/compile.test.js"` — compiler unit tests pass
2. `cd tools/manual-story-studio && npm test` — full suite still green; existing tests unaffected by the new module

### Invariants

1. Compilation is deterministic: same `manual-story.yaml` + `segments/*.md` content → byte-identical `manuscript.md` across N runs (per SPEC-103 §7 AC#5). No wall-clock time, no random ordering.
2. Compiler reads zero record files under `<manualStoryRoot>/records/` and writes no file other than `<manualStoryRoot>/manuscript.md` (per SPEC-103 §3 Key decisions and FOUNDATIONS §Canonical Storage Layer engine-only-write boundary).
3. `segment_order` is the only source of truth for ordering; the filesystem listing of `segments/*.md` is never consulted for ordering decisions.
4. Empty `segment_order` is a legitimate state — the compiler writes an empty `manuscript.md` without error.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/manuscript/compile.test.ts` (new) — covers determinism, `include_segment_titles` toggle (both values), empty segment_order, ordering source-of-truth, no-record-read / no-extraneous-write invariant.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/manuscript/compile.test.js"` — targeted compiler test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification

## Outcome

Completed: 2026-05-31

Implemented the deterministic Manual Story Studio manuscript compiler and its focused test coverage. `compileManuscript` now compiles ordered segment Markdown into `manuscript.md`, optionally prepends sidecar titles, returns compile metrics, and writes only through the manual-story sandbox.

No world canon, story bundles, hooks, validators, MCP, patch-engine, frontend, route, read-module, or segment-save flow surfaces changed.

## Verification Result

1. `npm run build:backend` from `tools/manual-story-studio` before source edits — PASS; baseline backend TypeScript compilation was green.
2. `npm run build:backend` from `tools/manual-story-studio` after source edits — PASS; backend TypeScript compilation succeeded with the new compiler and test file.
3. `node --test "dist/test/manuscript/compile.test.js"` from `tools/manual-story-studio` — PASS; 6 compiler tests passed.
4. `npm test` from `tools/manual-story-studio` — PASS; backend build, 251 backend tests, and web typecheck completed successfully.

## Deviations

- The implementation takes a `ManualStoryRoot` from the existing SPEC-100 sandbox helper rather than a plain string path. This keeps the compiler's write boundary explicit and lets `safeWriteFile` enforce the manual-story sandbox for `manuscript.md`.
