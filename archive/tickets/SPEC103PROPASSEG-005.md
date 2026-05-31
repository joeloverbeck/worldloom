# SPEC103PROPASSEG-005: State Update Checklist module — pure function returning 12-class review payload

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/state-update-checklist.ts` (pure-function module at package root) + paired test under `tools/manual-story-studio/test/state-update-checklist.test.ts`.
**Deps**: archive/tickets/SPEC103PROPASSEG-001.md

## Problem

SPEC-103 §2 item 6 requires a State Update Checklist that lists 12 record classes (statuses, emotions, beliefs, relationships, objects, plans, clocks, secrets, questions, consequences, obligations, threads) the author should review after each segment save, with per-class counts of records referencing the involved cast members. The checklist payload is computed at save time and returned in the save response (per SPEC-103 §2 item 2: "Return the new segment ID, sidecar, and a State Update Checklist payload"). Per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary, Manual Studio cannot have changed records by paste alone — the checklist NEVER asserts state changed; it prompts the author to review.

## Assumption Reassessment (2026-05-31)

1. `MANUAL_RECORD_CLASSES` at `tools/manual-story-studio/src/schema/manual-story.ts` enumerates 18 classes. SPEC-103 §2 item 6 + §3 Key decisions specify the 12-class subset for the checklist (excluding `cast`, `entities`, `locations`, `facts`, `intentions`, `artifacts` — author-curated background per §3 Key decisions item 4 rationale). The existing record reader at `tools/manual-story-studio/src/read/records.ts` exports `listRecords(manualStoryRoot, recordClass, opts?)` for per-class summaries and `readRecord(manualStoryRoot, recordClass, id)` for the full `refs.characters` payload needed by the count.
2. SPEC-103 §2 item 6 (12-class enumeration intent), §3 Key decisions item 4 (per-class exclusion rationale — included classes reflect state most likely to shift inside a beat cluster), §7 AC#6 ("State Update Checklist appears post-save, lists 12 review classes, never asserts state changed").
3. Cross-skill boundary: the checklist payload's shape is consumed by ticket 004's save flow (returns it in the save response) and by `archive/tickets/SPEC103PROPASSEG-012.md`'s StateUpdateChecklist frontend component (renders it). The 12-class list comes from a local constant in this module; per-class counts come from `tools/manual-story-studio/src/read/records.ts`'s per-class reader. The Records screen filter integration (per spec §2 item 6: each class has a "Review N records" button opening the Records screen filtered to that class with the involved cast pre-filtered) lives in `archive/tickets/SPEC103PROPASSEG-012.md`; this module produces only the typed payload, not the navigation handlers.

## Architecture Check

1. Pure-function module at package root (not under `src/write/` or `src/read/`) keeps the checklist as a non-mutating, non-side-effecting computation — it reads existing records and produces a typed payload; it never writes. Its placement at the package root rather than in `src/read/` reflects that it's a higher-level aggregator over the read layer (consuming `listRecords` rather than being one of the primitive read modules).
2. No backwards-compatibility aliasing or shim — net-new module; no prior checklist code exists.

## Verification Layers

1. `state-update-checklist.ts` exports `buildStateUpdateChecklist` returning a payload with exactly 12 entries → codebase grep-proof + unit test
2. Per-class counts reflect records actually referencing the involved cast (fixture with `mchar-A` + `mchar-B` referenced by specific records → per-class count matches the set intersection) → unit test
3. Function performs zero file writes — pure read + compute → unit test (filesystem inspection assertion before/after)
4. `disclaimer` field carries the literal SPEC-required text (`"Review these categories manually. Manual Story Studio has not changed any records."`) → unit test

## Landed Changes

### 1. Created src/state-update-checklist.ts

`tools/manual-story-studio/src/state-update-checklist.ts` now exports:

- `CHECKLIST_REVIEW_CLASSES` with the fixed 12-class review order.
- `CHECKLIST_DISCLAIMER` with the exact SPEC-required text.
- `StateUpdateChecklistEntry`, `StateUpdateChecklistPayload`, and `BuildChecklistOptions`.
- `buildStateUpdateChecklist(options)`, which copies the saved segment sidecar's `included_record_summary.characters`, lists each review class, reads each full record, counts records whose `refs.characters` intersects the involved cast, and returns the payload without writing files.

The function accepts either a raw manual-story root path or a `ManualStoryRoot`, matching the existing package write/read helper ergonomics.

### 2. Created test/state-update-checklist.test.ts

The new test file covers:

- Fixed 12-entry payload and class ordering.
- Per-class count correctness with six belief records, four of which reference the involved cast through `refs.characters`.
- Exact disclaimer text.
- No-write behavior by comparing recursive file snapshots before and after the checklist build.

## Files to Touch

- `tools/manual-story-studio/src/state-update-checklist.ts` (new)
- `tools/manual-story-studio/test/state-update-checklist.test.ts` (new)

## Out of Scope

- Frontend rendering of the checklist (covered by `archive/tickets/SPEC103PROPASSEG-012.md` — StateUpdateChecklist component)
- Save flow returning the payload in HTTP responses (covered by ticket 004 + ticket 008 — save calls this module and HTTP route returns the payload)
- Records screen filter integration via "Review N records" buttons (covered by `archive/tickets/SPEC103PROPASSEG-012.md`; the navigation is button-driven from the rendered checklist; this module produces only the typed payload)
- Persistent checklist log (which classes the author actually reviewed) — M6 deferral per SPEC-103 §2 Out of scope

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/state-update-checklist.test.js"` — checklist module tests pass
2. `cd tools/manual-story-studio && npm test` — full suite still green (no regression in existing record-read coverage)

### Invariants

1. Checklist payload has exactly 12 entries (`CHECKLIST_REVIEW_CLASSES.length`); the class list is a fixed local constant.
2. `disclaimer` field carries the literal `CHECKLIST_DISCLAIMER` text and is never an empty string or any state-change assertion.
3. Function performs zero file writes — pure read + compute. (Per SPEC-103 §3 Key decisions and FOUNDATIONS §Story Bundles §4a: the checklist NEVER asserts that any record changed.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/state-update-checklist.test.ts` (new) — covers entry count, ordering, per-class count correctness, disclaimer text, write-free invariant.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/state-update-checklist.test.js"` — targeted checklist test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes the new test under the chained `node --test "dist/test/**/*.test.js"` invocation)

## Outcome

Completed 2026-05-31. Added the backend State Update Checklist payload module and focused compiled test coverage. The module returns the fixed 12-class review list, copies involved cast from the saved segment sidecar, counts records whose `refs.characters` intersect that cast, and returns the exact non-state-change disclaimer. No Manual Studio records, world canon, story bundles, hooks, validators, MCP, or patch-engine surfaces were changed.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS; backend TypeScript compiled successfully.
2. `cd tools/manual-story-studio && node --test "dist/test/state-update-checklist.test.js"` — PASS; 3 checklist tests passed.
3. `cd tools/manual-story-studio && npm test` — PASS; backend compiled test suite reported 245 passing subtests, then `npm --prefix web test` completed successfully.
4. Manual review against FOUNDATIONS §Story Bundles §4a — PASS; the checklist payload asks for manual review and carries the exact text "Review these categories manually. Manual Story Studio has not changed any records.", so pasted prose is not treated as authoritative state.

## Deviations

- The implementation reads full records with `readRecord` after `listRecords` because `ManualRecordSummary` intentionally omits `refs.characters`; this preserves the ticket's counting contract without widening the read layer.
- The no-write invariant is tested by recursive file snapshot comparison, which is stronger than the drafted mtime/size-only check because it also detects file content changes.
