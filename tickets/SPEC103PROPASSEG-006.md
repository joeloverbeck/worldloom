# SPEC103PROPASSEG-006: Deterministic manuscript.md compiler

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/manuscript/compile.ts` + paired test under `tools/manual-story-studio/test/manuscript/compile.test.ts`. Introduces a new `src/manuscript/` subdirectory under the manual-story-studio package.
**Deps**: 001

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

## What to Change

### 1. Create src/manuscript/compile.ts

In `tools/manual-story-studio/src/manuscript/compile.ts`, implement:

```typescript
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

import type {
  ManualStoryMetadata,
  SegmentSidecar,
} from "../schema/manual-story.js";

export interface CompileManuscriptOptions {
  manualStoryRoot: string; // absolute path to the manual story root, resolved via SPEC-100 sandbox
}

export interface CompileManuscriptResult {
  manuscript_path: string;
  segments_compiled: number;
  byte_count: number;
}

export function compileManuscript(
  options: CompileManuscriptOptions,
): CompileManuscriptResult {
  // 1. Read <manualStoryRoot>/manual-story.yaml; parse to ManualStoryMetadata
  // 2. Read metadata.manuscript.include_segment_titles flag
  // 3. For each SEG-<n> in metadata.segment_order (in array order, not fs-listing order):
  //    a. Read segments/SEG-<n>.md (prose body — pure Markdown, no frontmatter)
  //    b. If include_segment_titles, read segments/SEG-<n>.yaml sidecar's title field
  //       and prepend "## <title>\n\n" to the body fragment
  //    c. Accumulate into output buffer with "\n\n" separator between segments
  // 4. Write <manualStoryRoot>/manuscript.md (single write; respects SPEC-100 sandbox)
  // 5. Return CompileManuscriptResult with metrics for caller logging
}
```

The compiler must not consult any directory other than `<manualStoryRoot>` (sandbox boundary). It must not read or write any file under `<manualStoryRoot>/records/` (Plan-Authority Boundary per SPEC-103 §3 + FOUNDATIONS §Story Bundles §4a).

### 2. Create test/manuscript/compile.test.ts

Per the existing test convention (`fs.cpSync` fixture manual story to temp dir; `node:test` runner), cover:

- **Determinism**: fixture with 3 segments → call `compileManuscript` twice → `fs.readFileSync` both times → byte-equality assertion
- **`include_segment_titles: true`**: fixture with `manuscript.include_segment_titles: true` + 3 segments with distinct titles → output contains `## <title-1>\n\n<body-1>\n\n## <title-2>\n\n<body-2>...`
- **`include_segment_titles: false`** (default): fixture with same 3 segments and flag false → output contains `<body-1>\n\n<body-2>\n\n<body-3>` (no headings prepended)
- **Empty `segment_order`**: fixture with `segment_order: []` → `manuscript.md` is written but empty (0 bytes or just whitespace)
- **Ordering source-of-truth**: fixture with `segment_order: [SEG-3, SEG-1, SEG-2]` (out of numeric order on purpose) → output concatenates bodies in `segment_order` order, NOT in filesystem-listing order
- **No record reads / no extraneous writes**: snapshot `records/` directory + `prompts/` directory mtimes before call; verify unchanged after; verify only `manuscript.md` was written (assert via `fs.readdirSync` diff before / after on `<manualStoryRoot>`)

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
