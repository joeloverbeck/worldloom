# SPEC103PROPASSEG-007: Read modules — segments + manuscript

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/read/segments.ts` and `tools/manual-story-studio/src/read/manuscript.ts` under the existing `src/read/` directory.
**Deps**: archive/tickets/SPEC103PROPASSEG-001.md

## Problem

SPEC-103 §4 Create enumerates two read modules: `src/read/segments.ts` (list segments + read individual sidecar + read body) and `src/read/manuscript.ts` (read the compiled `manuscript.md` body). These are pure read helpers consumed by HTTP routes (008, 009, 010) and tested transitively through those routes' tests. The existing read layer at `tools/manual-story-studio/src/read/records.ts:81-88` already enumerates `segment_order` for the ref validator; the new `read/segments.ts` provides the dedicated typed segment-listing + sidecar-reading surface segments routes consume directly.

## Assumption Reassessment (2026-05-31)

1. Existing `tools/manual-story-studio/src/read/records.ts:81-88,166` already reads `segment_order` from `manual-story.yaml` to populate the known-segments set consumed by the ref validator (`tools/manual-story-studio/src/validate/refs.ts:71` registers `caused_by_segment: { kind: "segment", nullable: true }`). The new `read/segments.ts` provides a dedicated typed listing + individual-sidecar surface (parallel to the existing `src/read/manual-stories.ts` and `src/read/manual-story-metadata.ts` for their respective domains) without duplicating the ref validator's enumeration logic. The new `read/manuscript.ts` provides the parallel surface for the compiled manuscript file produced by ticket 006.
2. SPEC-103 §4 Create enumerates both `src/read/segments.ts` and `src/read/manuscript.ts`. SPEC-103 §2 item 7 (Manuscript view: "Full compiled `manuscript.md` rendered as Markdown" + "Segment list sidebar") and §2 item 8 (Prompt History view: "links to the segments produced from this prompt") describe the consumer-side intent both read modules support.
3. Cross-skill boundary: `read/segments.ts` is consumed by ticket 008 (segments routes) for GET /segments (list) + GET /segments/:id (single body + sidecar) endpoints; by ticket 010 (prompts route extension) for the `linked_segments` computation that scans segment sidecars for matching `prompt_id`. `read/manuscript.ts` is consumed by ticket 009 (manuscript routes) for GET /manuscript. Both modules reuse the existing `src/read/records.ts` pattern (parse YAML via `yaml` package + return typed result) without duplicating the existing read layer's helpers.

## Architecture Check

1. Two small read modules under `src/read/` parallel the existing organization (`records.ts`, `manual-stories.ts`, `worlds.ts`, `manual-story-metadata.ts`) — read surface organized by domain (segments / manuscript / records / etc.) rather than by HTTP route. Keeps the read layer's responsibility separation crisp and avoids forcing the segments-reading and manuscript-reading helpers into existing files where they don't belong semantically.
2. No backwards-compatibility aliasing — net-new modules; the existing read layer is unchanged.

## Verification Layers

1. `read/segments.ts` exports `listSegments` returning typed `SegmentListEntry[]` from a manual-story root → covered by ticket 008's segments-routes test (GET list)
2. `read/segments.ts` exports `readSegmentSidecar` reading a single `SegmentSidecar` by SEG-N or returning `null` for missing → covered by ticket 008's segments-routes test (GET single 200/404)
3. `read/segments.ts` exports `readSegmentBody` reading a single segment's prose body string or returning `null` → covered by ticket 008's segments-routes test
4. `read/manuscript.ts` exports `readManuscript` reading the compiled `manuscript.md` body string + metrics or returning `null` for missing → covered by ticket 009's manuscript-routes test

## Landed Changes

### 1. Created src/read/segments.ts

Added `tools/manual-story-studio/src/read/segments.ts` with:

- `listSegments({ manualStoryRoot })`: scans `segments/SEG-<n>.yaml`, parses valid sidecars, returns `{ id, title, created_at, updated_at, word_count }` entries sorted by numeric `SEG-N` suffix.
- `readSegmentSidecar({ manualStoryRoot, segmentId })`: returns the parsed `SegmentSidecar` for a valid `SEG-N` id or `null` when the id/file is missing or unreadable.
- `readSegmentBody({ manualStoryRoot, segmentId })`: returns the segment Markdown body for a valid `SEG-N` id or `null` when the id/file is missing or unreadable.

The module imports only read APIs from `node:fs` and the YAML parser; it performs no writes.

### 2. Created src/read/manuscript.ts

Added `tools/manual-story-studio/src/read/manuscript.ts` with `readManuscript({ manualStoryRoot })`, returning `{ manuscript_path, body, byte_count, word_count }` for `manuscript.md` or `null` when the file is not yet compiled or cannot be read. `word_count` uses the same advisory whitespace-split semantics as the SPEC-103 segment/manuscript surface.

## Files to Touch

- `tools/manual-story-studio/src/read/segments.ts` (new)
- `tools/manual-story-studio/src/read/manuscript.ts` (new)

## Out of Scope

- HTTP routes wrapping these reads (covered by tickets 008, 009)
- Frontend API clients (covered by tickets 011, 013)
- Behavioral tests dedicated to these read modules (covered indirectly by route tests in 008, 009 — dedicated unit tests would duplicate coverage without adding behavioral assertions beyond what the route tests exercise)
- Any modification to existing `src/read/records.ts` (its `segment_order` enumeration for the ref validator stays as-is)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` — TypeScript compilation succeeds with the new read modules
2. `cd tools/manual-story-studio && npm test` — full suite still green (read modules covered indirectly by route tests at tickets 008, 009)

### Invariants

1. Read modules perform zero file writes — only `node:fs` read APIs are imported (no `writeFileSync` / `appendFileSync` / `mkdirSync` / etc.).
2. Missing files (segment doesn't exist, manuscript not yet compiled) return `null` cleanly rather than throwing; HTTP routes can then return 404 to clients without try/catch wrappers.
3. `listSegments` returns entries sorted by numeric suffix (SEG-1, SEG-2, ..., SEG-9, SEG-10), not lexicographic — guards against the SEG-10 < SEG-9 lexicographic pitfall.

## Test Plan

### New/Modified Tests

1. None — read modules' behavior is covered transitively by ticket 008 (segments-routes test exercises `listSegments` + `readSegmentSidecar` + `readSegmentBody` via GET endpoints) and ticket 009 (manuscript-routes test exercises `readManuscript` via GET endpoint). Dedicated read-module tests would duplicate coverage without adding behavioral assertions beyond what the route tests exercise.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — type-check the new modules
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (read modules exercised indirectly via 008 + 009 tests once those land)

## Outcome

Completed 2026-05-31. Added the SPEC-103 read helpers for segment sidecars/prose bodies and compiled manuscript display. The implementation keeps the ticket's read-only invariant: both new modules import only `existsSync`, `readdirSync`, `readFileSync`, and `statSync` from `node:fs`; no write APIs are present.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS; backend TypeScript compilation succeeded with the new read modules.
2. `cd tools/manual-story-studio && npm test` — PASS; backend build succeeded, `node --test "dist/test/**/*.test.js"` reported 258 passing subtests, and `npm --prefix web test` completed successfully.
3. Manual review of `tools/manual-story-studio/src/read/segments.ts` and `tools/manual-story-studio/src/read/manuscript.ts` — PASS; missing segment/manuscript files return `null`, list ordering is numeric by `SEG-N` suffix, and the modules do not import write-capable `fs` APIs.

## Deviations

- Dedicated read-module unit tests were not added, matching the ticket's original out-of-scope boundary. The modules are type-checked now and will be exercised transitively by the route tests in tickets 008 and 009.
