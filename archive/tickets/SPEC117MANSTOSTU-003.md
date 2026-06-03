# SPEC117MANSTOSTU-003: Post-Segment Workbench backend route + payload test

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` introduces `src/server/routes/post-segment-workbench.ts` and registers it in `src/server/http.ts`. No impact on existing routes; no canon-mediation surface (package is canon-fenced per SPEC-100).
**Deps**: None

## Problem

The post-segment UX needs a backend payload that gives the workbench (a) the accepted segment + its sidecar context for the left pane and (b) a "records that touch this segment" candidate pile computed from the **broad** referrer scanner (not the narrow `refs.characters` count the deleted checklist used). This ticket adds the GET route for a segment ID; the frontend page consumes it in SPEC117MANSTOSTU-004.

## Assumption Reassessment (2026-06-03)

1. The broad referrer scanner already exists and is exported: `scanReferences(manualStoryRoot, targetId): ReadResult<ReferrerEntry[]>` at `src/read/records.ts:129`, covering `STRING_FIELDS`/`PAIR_FIELDS`/`LIST_FIELDS` (`holder/between/owed_by/subject/held_by/refs.*`). The sidecar reader is `readSegmentSidecar` / `readSegmentBody` at `src/read/segments.ts:54/:77`. Routes register in `src/server/http.ts` via `register*Routes(server, { repoRoot })`. Confirmed by grep at reassessment + decomposition time.
2. Per the spec (SPEC-117 §2 item 2 left pane + item 3 broad scan + §4 Create `routes/post-segment-workbench.ts`), the route returns accepted segment + sidecar included-records + broad-referrer candidates for a segment ID. The spec's "expose the scanner" is a no-op (already exported) — the work is consuming it here.
3. **Cross-artifact boundary under audit**: this route reuses `scanReferences` (owned by `src/read/records.ts`) and the sidecar readers (`src/read/segments.ts`); it registers a new route in the shared `src/server/http.ts` registration surface. `scanReferences` resolves referrers of a single **target ID**, so the route iterates the segment's involved cast/locations/records and unions the results — no change to `scanReferences` itself.
4. **FOUNDATIONS principle** (Rule 5 No Consequence Evasion / Prose-state separation): the payload performs **no** diff/inference of what changed in the prose — it is a referrer-based candidate pile, not a state delta. Using the broad scan (not the narrow cast-only count) means the candidate surface reflects real references, so the author is not silently misled about what touches the segment (the spec's No-Silent-Retcons-mirrored FND row).

## Architecture Check

1. A dedicated GET route keyed by segment ID keeps the workbench payload assembly server-side and reuses the already-tested `scanReferences` rather than re-implementing referrer logic in the frontend. Iterating involved cast and unioning in the route (vs. N frontend round-trips) keeps the candidate pile a single deterministic response.
2. No backwards-compatibility alias/shim: this is a new route; it does not reshape or alias any existing segment route.

## Verification Layers

1. Route returns broad-referrer candidates → test (`test/post-segment-workbench.test.ts`): a record referenced via `holder`/`between`/`held_by` (not `refs.characters`) appears in the candidate pile; a `refs.characters`-only check would have missed it.
2. Route performs no inference → test: payload has no diff/state-delta field; only accepted-segment context + sidecar included-records + referrer candidates.
3. No `last_reviewed_after_segment` is read or written by the route → codebase grep-proof on `routes/post-segment-workbench.ts`.
4. Route registered → codebase grep-proof on `src/server/http.ts` (`registerPostSegmentWorkbench*` present).

## Landed Changes

### 1. New route module

Added `src/server/routes/post-segment-workbench.ts` exporting `registerPostSegmentWorkbenchReadRoute(server, { repoRoot })` with `GET /api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId/post-segment-workbench`. The handler reads the accepted segment body + sidecar, iterates the segment ID plus sidecar included characters/records through `scanReferences`, and returns a deduped candidate list with record class, id, title, active state, target IDs, and fields. The payload includes accepted prose, title, prompt ID, moment directive, word count, last paragraph, sidecar included-record summary, and the honest no-inference reminder.

### 2. Register the route

Imported and called the new read-route registration in `src/server/http.ts` alongside the existing segment read routes.

### 3. Payload test

Added `test/post-segment-workbench.test.ts` proving the broad-scan candidate pile with a `beliefs.holder` record that a narrow `refs.characters` scan would miss, the no-inference reminder, absence of stale payload keys, read-only behavior for fixture files, and malformed segment-id rejection.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts` (new)
- `tools/manual-story-studio/test/post-segment-workbench.test.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify)

## Out of Scope

- The frontend workbench page — SPEC117MANSTOSTU-004.
- Removing the checklist surface — archive/tickets/SPEC117MANSTOSTU-002.md.
- Any inference of what changed from the prose (the rail is a referrer-based candidate pile, not a diff — spec §Out of scope).
- Any "mark reviewed" affordance (spec §Out of scope).

## Acceptance Criteria

### Tests That Must Pass

1. `test/post-segment-workbench.test.ts`: a record B referencing involved record/cast A via `holder` (not `refs.characters`) appears in the candidate pile; the test asserts a narrow-scan-only result would have missed B.
2. The route reads/writes no `last_reviewed_after_segment` and returns no `checklist_payload`; the payload contains no inferred state delta.
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. The candidate pile uses the same field coverage as delete-safety (`scanReferences`), not the narrow `refs.characters` scan.
2. The route is read-only with respect to record state — it computes candidates, it never writes records or current-context.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/post-segment-workbench.test.ts` — broad-scan candidate-pile assertion + no-inference + no-`last_reviewed` assertions (rationale: proves §2 item 3's broad-scan requirement and the prose/state firewall at the payload layer).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. `node --test "dist/test/post-segment-workbench.test.js"` (run from `tools/manual-story-studio` after `npm run build:backend`; narrower boundary targeting just this route's payload test)

## Outcome

The backend workbench payload route is registered and read-only. It returns the accepted segment context plus `touched_records`, a deterministic candidate list built from the existing broad `scanReferences` coverage. The payload does not include inferred state-delta fields or stale checklist/review fields.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — PASS; backend build plus 86 compiled Node test files passed, including `dist/test/post-segment-workbench.test.js`.
2. `cd tools/manual-story-studio && npm test` — PASS; backend build, 488 backend tests, and web TypeScript check passed.
3. `rg -n "last_reviewed_after_segment|checklist_payload" tools/manual-story-studio/src/server/routes/post-segment-workbench.ts tools/manual-story-studio/test/post-segment-workbench.test.ts` — no matches.
4. `git diff --check` — PASS.

## Deviations

The route also includes the segment ID itself as a scan target, in addition to sidecar included characters/records. This keeps `caused_by_segment` referrers visible in the same candidate rail while preserving the spec-required sidecar target scan.
