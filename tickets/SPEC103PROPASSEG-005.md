# SPEC103PROPASSEG-005: State Update Checklist module — pure function returning 12-class review payload

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/state-update-checklist.ts` (pure-function module at package root) + paired test under `tools/manual-story-studio/test/state-update-checklist.test.ts`.
**Deps**: 001

## Problem

SPEC-103 §2 item 6 requires a State Update Checklist that lists 12 record classes (statuses, emotions, beliefs, relationships, objects, plans, clocks, secrets, questions, consequences, obligations, threads) the author should review after each segment save, with per-class counts of records referencing the involved cast members. The checklist payload is computed at save time and returned in the save response (per SPEC-103 §2 item 2: "Return the new segment ID, sidecar, and a State Update Checklist payload"). Per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary, Manual Studio cannot have changed records by paste alone — the checklist NEVER asserts state changed; it prompts the author to review.

## Assumption Reassessment (2026-05-31)

1. `MANUAL_RECORD_CLASSES` at `tools/manual-story-studio/src/schema/manual-story.ts:181-200` enumerates 18 classes. SPEC-103 §2 item 6 + §3 Key decisions specify the 12-class subset for the checklist (excluding `cast`, `entities`, `locations`, `facts`, `intentions`, `artifacts` — author-curated background per §3 Key decisions item 4 rationale). The existing record reader at `tools/manual-story-studio/src/read/records.ts` supports per-class enumeration of records (verify the exact `listRecords` export name and signature at implementation time).
2. SPEC-103 §2 item 6 (12-class enumeration intent), §3 Key decisions item 4 (per-class exclusion rationale — included classes reflect state most likely to shift inside a beat cluster), §7 AC#6 ("State Update Checklist appears post-save, lists 12 review classes, never asserts state changed").
3. Cross-skill boundary: the checklist payload's shape is consumed by ticket 004's save flow (returns it in the save response) and by ticket 012's StateUpdateChecklist frontend component (renders it). The 12-class list comes from a local constant in this module; per-class counts come from `tools/manual-story-studio/src/read/records.ts`'s per-class reader. The Records screen filter integration (per spec §2 item 6: each class has a "Review N records" button opening the Records screen filtered to that class with the involved cast pre-filtered) lives in ticket 012; this module produces only the typed payload, not the navigation handlers.

## Architecture Check

1. Pure-function module at package root (not under `src/write/` or `src/read/`) keeps the checklist as a non-mutating, non-side-effecting computation — it reads existing records and produces a typed payload; it never writes. Its placement at the package root rather than in `src/read/` reflects that it's a higher-level aggregator over the read layer (consuming `listRecords` rather than being one of the primitive read modules).
2. No backwards-compatibility aliasing or shim — net-new module; no prior checklist code exists.

## Verification Layers

1. `state-update-checklist.ts` exports `buildStateUpdateChecklist` returning a payload with exactly 12 entries → codebase grep-proof + unit test
2. Per-class counts reflect records actually referencing the involved cast (fixture with `mchar-A` + `mchar-B` referenced by specific records → per-class count matches the set intersection) → unit test
3. Function performs zero file writes — pure read + compute → unit test (filesystem inspection assertion before/after)
4. `disclaimer` field carries the literal SPEC-required text (`"Review these categories manually. Manual Story Studio has not changed any records."`) → unit test

## What to Change

### 1. Create src/state-update-checklist.ts

In `tools/manual-story-studio/src/state-update-checklist.ts`, implement:

```typescript
import {
  type ManualRecordClass,
  type SegmentSidecar,
} from "./schema/manual-story.js";
import { listRecords } from "./read/records.js"; // verify exact export name at impl time

// 12 of the 18 manual record classes (excludes cast, entities, locations,
// facts, intentions, artifacts per SPEC-103 §3 Key decisions item 4 — those
// are author-curated background rarely re-reviewed per segment; included
// classes reflect state most likely to shift inside a beat cluster).
export const CHECKLIST_REVIEW_CLASSES: readonly ManualRecordClass[] = [
  "statuses",
  "emotions",
  "beliefs",
  "relationships",
  "objects",
  "plans",
  "clocks",
  "secrets",
  "questions",
  "consequences",
  "obligations",
  "threads",
] as const;

export const CHECKLIST_DISCLAIMER =
  "Review these categories manually. Manual Story Studio has not changed any records.";

export interface StateUpdateChecklistEntry {
  record_class: ManualRecordClass;
  total_records: number;
  cast_referencing_count: number;
}

export interface StateUpdateChecklistPayload {
  segment_id: string;
  involved_cast: string[]; // [mchar-*] from the saved segment's included_record_summary.characters
  entries: StateUpdateChecklistEntry[]; // exactly CHECKLIST_REVIEW_CLASSES.length
  disclaimer: string; // literal CHECKLIST_DISCLAIMER
}

export interface BuildChecklistOptions {
  manualStoryRoot: string;
  sidecar: SegmentSidecar;
}

export function buildStateUpdateChecklist(
  options: BuildChecklistOptions,
): StateUpdateChecklistPayload {
  // 1. Derive involved_cast = sidecar.included_record_summary.characters
  // 2. For each class in CHECKLIST_REVIEW_CLASSES:
  //    a. Call listRecords(manualStoryRoot, class) → all records of that class
  //    b. total_records = records.length
  //    c. cast_referencing_count = records whose refs.characters intersects involved_cast
  // 3. Return { segment_id, involved_cast, entries, disclaimer: CHECKLIST_DISCLAIMER }
}
```

If `listRecords`'s actual export differs (different name or signature in `src/read/records.ts`), adapt the call shape — the contract this ticket owns is the typed payload, not a specific reader invocation.

### 2. Create test/state-update-checklist.test.ts

Per the existing test convention (`fs.cpSync` fixture to temp dir; `node:test` runner), cover:

- Returns exactly 12 entries (`entries.length === CHECKLIST_REVIEW_CLASSES.length`)
- `entries[i].record_class` matches `CHECKLIST_REVIEW_CLASSES[i]` in order
- Per-class count correctness: fixture with 2 cast members (`mchar-A` + `mchar-B`) + 3 beliefs referencing `mchar-A` + 1 belief referencing `mchar-B` + 2 beliefs referencing neither cast → `entries[beliefs].cast_referencing_count === 4`; `entries[beliefs].total_records === 6`
- `disclaimer` field exactly equals `CHECKLIST_DISCLAIMER` literal (the SPEC-required string)
- Function performs no file writes (fixture directory `fs.statSync` mtime + size unchanged before / after call)

## Files to Touch

- `tools/manual-story-studio/src/state-update-checklist.ts` (new)
- `tools/manual-story-studio/test/state-update-checklist.test.ts` (new)

## Out of Scope

- Frontend rendering of the checklist (covered by ticket 012 — StateUpdateChecklist component)
- Save flow returning the payload in HTTP responses (covered by ticket 004 + ticket 008 — save calls this module and HTTP route returns the payload)
- Records screen filter integration via "Review N records" buttons (covered by ticket 012; the navigation is button-driven from the rendered checklist; this module produces only the typed payload)
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
