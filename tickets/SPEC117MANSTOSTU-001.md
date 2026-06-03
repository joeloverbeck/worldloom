# SPEC117MANSTOSTU-001: Remove `last_reviewed_after_segment` (both schemas + all paths + UI + fixtures)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` (schema, validate, read, route, web types, web components/pages, test fixtures). No impact on world canon or `_source/` (package is canon-fenced per SPEC-100).
**Deps**: archive/tickets/SPEC117MANSTOSTU-002.md

## Problem

`last_reviewed_after_segment` is a review-debt stamp that couples compliance/review status to surfaces that are not review ledgers. The SPEC-117 reassessment established it is declared in **two** independent schemas — `CurrentContext` (the Prompt Working Set selector) and `RecordCommonFields` (a per-record field inherited by every manual record class) — and that removing it restores the working set to a pure deterministic selector and removes a per-record stamp nothing consumes. The field's `current-context.ts` schema comment attributes it to a "SPEC-108 repair precondition," but SPEC-108 is COMPLETED+archived and no code reads the field for repair/health gating (verified during reassessment). This ticket removes both occurrences and the stale comment.

## Assumption Reassessment (2026-06-03)

1. The field exists in two schemas — `CurrentContext` (`src/schema/current-context.ts:16`) and `RecordCommonFields` (`src/schema/manual-story.ts:157`, extended by `ManualCharacterRecord`/`ManualEntityRecord`/`ManualFactRecord`/… ) — plus per-record validation (`src/validate/schema.ts:44` common-field list + `:59` `COMMON_NULLABLE`), current-context validation (`src/validate/current-context.ts:52-53`), the referrer scan (`src/read/records.ts:308`), web types (`web/src/types/manual-story.ts:112,184`), a `RecordForm` input (`web/src/components/RecordForm.tsx:322,648`), the current-context UI input (`web/src/pages/EditCurrentContext.tsx:31,231-235,453-460`), `web/src/pages/SourceBrowser.tsx:66`, and ~27 test fixtures. Confirmed by grep at reassessment time.
2. Per the spec (SPEC-117 §2 item 4 + §6 AC5 + §8 Risks), both occurrences are removed; `last_accepted_segment` is retained (it seeds recent-prose context / workbench navigation).
3. **Shared boundary under audit**: `RecordCommonFields` is the base interface every manual record class extends; removing a field from it changes the validated shape of all record classes. The `current-context` GET/PUT route contract (`src/server/routes/current-context.ts`) is the second shared boundary.
4. **FOUNDATIONS principle** (§Tooling Recommendation — least mechanism): removing the field deletes a compliance mechanism that carried review-debt without knowing what changed; the change reduces mechanism, consistent with the spec's FND alignment row.
5. **Removal blast radius** (was template item 7): the field spans `src/schema/` (2 files), `src/validate/` (2 files), `src/read/records.ts:308`, the read/write/route current-context path, `web/src/types/manual-story.ts` (2 decls), `RecordForm.tsx`, `EditCurrentContext.tsx`, `SourceBrowser.tsx`, and ~27 test fixtures. The stale `current-context.ts` SPEC-108 schema comment is removed with the field. The checklist writer formerly at `StateUpdateChecklist.tsx:60` was deleted by archive/tickets/SPEC117MANSTOSTU-002.md — hence `Deps: archive/tickets/SPEC117MANSTOSTU-002.md`, so this ticket does not leave a dangling reference.

## Architecture Check

1. Removing the field at every layer (schema → validate → read/write/route → web type → UI input → fixtures) keeps the record contract honest: there is no half-removed field that validates in one path and is dropped in another. The reassessment confirmed no runtime consumer gates on the field, so removal carries no behavioral loss.
2. No backwards-compatibility alias/shim: persisted records and current-context files still carrying the field load with it ignored/dropped and round-trip without it (per AC5) — this is graceful unknown-field tolerance, not an alias for the removed field.

## Verification Layers

1. Field absent from both schemas → codebase grep-proof (`grep -rn "last_reviewed_after_segment" tools/manual-story-studio/src tools/manual-story-studio/web/src` returns zero outside deliberate removal-note context).
2. Per-record and current-context validation no longer reference the field → codebase grep-proof on `src/validate/schema.ts` + `src/validate/current-context.ts`.
3. Back-compat: a current-context fixture AND a manual-record fixture each carrying the old field load with it dropped and round-trip without it → schema-validation / test (`test/current-context/` round-trip + `test/validate/schema.test.ts`).
4. `last_accepted_segment` retained → codebase grep-proof (still present in `src/schema/current-context.ts`).

## What to Change

### 1. Backend schemas + validation

Remove `last_reviewed_after_segment` from `CurrentContext` (`src/schema/current-context.ts`, including the stale SPEC-108 comment) and from `RecordCommonFields` (`src/schema/manual-story.ts`). Drop it from `src/validate/current-context.ts` (the validated-field entry) and `src/validate/schema.ts` (the common-field list at :44 and `COMMON_NULLABLE` at :59).

### 2. Backend read/write/route

Drop the field from `src/read/current-context.ts` and the current-context write path; remove it from the GET/PUT route in `src/server/routes/current-context.ts`. Remove the `current-context.last_reviewed_after_segment` referrer line in `src/read/records.ts:308` (`collectCurrentContextReferrers`) — `scanReferences` itself is unchanged.

### 3. Web types + UI

Drop both declarations from `web/src/types/manual-story.ts`. Remove the "Last reviewed after segment" input + its `common`-state wiring from `web/src/components/RecordForm.tsx`. Remove the field input from `web/src/pages/EditCurrentContext.tsx`. Remove the field default from `web/src/pages/SourceBrowser.tsx`.

### 4. Test fixtures

Drop `last_reviewed_after_segment` from every test fixture/setup that sets it (~27 files under `test/`), and add a back-compat assertion: a current-context fixture and a record fixture each containing the old field load with it dropped and round-trip without it.

## Files to Touch

- `tools/manual-story-studio/src/schema/current-context.ts` (modify)
- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/src/validate/current-context.ts` (modify)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/src/read/current-context.ts` (modify)
- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/src/server/routes/current-context.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` (modify)
- `tools/manual-story-studio/test/**` — fixtures setting `last_reviewed_after_segment` (~27 files) + a new back-compat round-trip assertion (modify)

## Out of Scope

- Deleting the checklist surface (`state-update-checklist.ts`, `StateUpdateChecklist.tsx`, `checklist_payload`) — archive/tickets/SPEC117MANSTOSTU-002.md.
- The Post-Segment Workbench route/page — SPEC117MANSTOSTU-003 / -004.
- Removing `last_accepted_segment` (explicitly retained).
- Renaming `current-context` to "Prompt Working Set" (report §17 — bundle-deferred, out of scope per spec).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "last_reviewed_after_segment" tools/manual-story-studio/src tools/manual-story-studio/web/src` returns zero matches (field fully removed from production code).
2. A current-context fixture AND a manual-record fixture each containing the old `last_reviewed_after_segment` field load with it dropped and round-trip without it.
3. `cd tools/manual-story-studio && npm test` is green (backend + web typecheck).

### Invariants

1. `last_accepted_segment` remains a `CurrentContext` field and is unaffected.
2. No record class's validated shape requires `last_reviewed_after_segment`; unknown-field tolerance lets pre-existing records load.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/current-context-read.test.ts` / `current-context-write.test.ts` — drop field from fixtures; add back-compat round-trip (old field ignored/dropped).
2. `tools/manual-story-studio/test/validate/schema.test.ts` — update required/nullable common-field-set assertions to exclude the removed field; add record round-trip.
3. `tools/manual-story-studio/test/read/records.test.ts` / `referrers.test.ts` — drop the `last_reviewed_after_segment` referrer expectation.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. `npm --prefix web test` (run from `tools/manual-story-studio`; web typecheck per the repo's root-script convention)
