# SPEC122MANSTOSTU-002: Rename `touched_records` → `linked_record_candidates` + reword rail heading

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` backend route + web frontend + tests. No schema/canon change.
**Deps**: None

## Problem

The post-segment workbench's candidate payload field is named `touched_records` and the rail heading reads "Records that touch this segment" (`PostSegmentWorkbench.tsx:351-352`). But the candidate logic is a deterministic referrer/link scan over the segment ID, included cast, and included records (`post-segment-workbench.ts:71-82,182-189`) — it surfaces records *linked to the prompt*, not records *touched by the prose*. "Touched" implies inferred prose effects the app does not and must not compute. Renaming the payload key to `linked_record_candidates` and the heading to "Records linked to this segment's prompt" makes the name say what the computation actually is, keeping the author's mental model aligned with the prose/state boundary. The rename is a client↔server contract and must land in lockstep across the backend route, the frontend type/consumer, and both test consumers.

## Assumption Reassessment (2026-06-03)

1. The payload key `touched_records` was produced at `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts:206` and consumed in the frontend at `web/src/pages/PostSegmentWorkbench.tsx` (`WorkbenchPayload` and grouped candidate read). The rail heading + `aria-label` were in the post-workbench rail. The scan logic (`uniqueTargets`, `scanReferences`, `buildCandidates`) is correct and is NOT changed by this ticket — only the name/heading.
2. Spec SPEC-122 §2 item 2 + §4 + §8 specify the lockstep rename and the heading reword; §8 warns a half-rename compiles on the unchanged side but breaks the workbench rail at runtime.
3. Cross-artifact boundary under audit: the client↔server payload contract for the post-segment-workbench GET route. Backend route key and every frontend/test consumer must rename together — a half-rename leaves the frontend reading a key the backend no longer sends (empty rail).
4. FOUNDATIONS principle motivating this ticket: the prose/state boundary (product invariant; §Tooling Recommendation analogue) — "linked," not "touched," because the candidate set is provably link-derived, not prose-derived. Truthful naming is the Rule-6-analogue here.
5. Rename blast radius (was template item 7) — `grep -rn "touched_records" tools/ .claude/ docs/ specs/ --include=*.ts --include=*.tsx` (excluding `dist/`): code consumers are `src/server/routes/post-segment-workbench.ts:206`, `web/src/pages/PostSegmentWorkbench.tsx:44,213`, `test/post-segment-workbench.test.ts:146,167`, `test/acceptance/one-real-story.test.ts:325,333,343,352`. All four code files are in Files to Touch. The `docs/triage/2026-06-03-…-triage.md`, `specs/SPEC-122…md`, and `specs/IMPLEMENTATION-ORDER.md` matches are descriptive (they record/describe the rename) and are intentionally NOT renamed.

## Architecture Check

1. The name should describe the computation. "linked_record_candidates" / "Records linked to this segment's prompt" matches the deterministic referrer scan; "touched" implied prose-effect inference the app does not perform.
2. No backwards-compatibility alias: the old key is removed, not dual-emitted. The lockstep rename is the clean end-state; a compatibility shim emitting both keys would re-introduce the ambiguity the rename removes.

## Verification Layers

1. No surviving `touched_records` in code -> codebase grep-proof: `grep -rn "touched_records" tools/manual-story-studio --include=*.ts --include=*.tsx` returns zero hits outside `dist/`.
2. Payload key is `linked_record_candidates` end-to-end (no empty rail) -> backend+frontend grep-proof + `cd tools/manual-story-studio && npm test` (the acceptance test exercises the GET route end-to-end).
3. Rail heading reads "Records linked to this segment's prompt" -> codebase grep-proof: `grep -rni "records that touch this segment" tools/manual-story-studio/web/src` returns nothing.

## What to Change

### 1. Backend payload key

In `post-segment-workbench.ts`, rename the returned payload key `touched_records` → `linked_record_candidates` (`:206`).

### 2. Frontend type + consumer + heading

In `PostSegmentWorkbench.tsx`: rename the `WorkbenchPayload` field `touched_records` → `linked_record_candidates` (`:44`) and its read site (`:213`); change the rail heading and `aria-label` from "Records that touch this segment" → "Records linked to this segment's prompt" (`:351-352`); update "candidate" framing to "linked record" wording where it appears in the rail.

### 3. Test consumers (lockstep)

In `test/post-segment-workbench.test.ts` (`:146`, `:167`) and `test/acceptance/one-real-story.test.ts` (`:325`, `:333`, `:343`, `:352`): rename `touched_records` → `linked_record_candidates` in all payload assertions. Keep the broad-scanner regression assertion (it tests the unchanged scan).

## Files to Touch

- `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts` (modify)
- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` (modify)
- `tools/manual-story-studio/test/post-segment-workbench.test.ts` (modify)
- `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` (modify)

## Out of Scope

- The candidate scanning logic (`:71-82`, `:182-189`) — correct and unchanged; only its name/presentation change.
- Reason-line human phrasing and cardification of segment-meta cast/records (SPEC122MANSTOSTU-003).
- The R1 prose-seeding removal (archive/tickets/SPEC122MANSTOSTU-001.md).
- Renaming `touched_records` mentions in `docs/` or `specs/` (descriptive references; intentionally retained).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "touched_records" tools/manual-story-studio --include=*.ts --include=*.tsx` returns zero hits outside `dist/`.
2. `grep -rni "records that touch this segment" tools/manual-story-studio/web/src` returns nothing.
3. `cd tools/manual-story-studio && npm test` is green (backend + web + acceptance).

### Invariants

1. The payload key is renamed in lockstep — no consumer reads a key the producer no longer emits.
2. The deterministic referrer/link scan is behaviorally unchanged.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/post-segment-workbench.test.ts` — rename payload-key assertions.
2. `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` — rename end-to-end payload-key assertions (this file reads `body.touched_records`; after the rename the old key is `undefined` and `.some(...)` throws if not updated).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend` (backend route + acceptance)
2. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck catches the frontend half of the lockstep)
3. `cd tools/manual-story-studio && npm test` (full pipeline)

## Outcome

Completed: 2026-06-03

Renamed the post-segment workbench payload key from `touched_records` to `linked_record_candidates` in `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts`, `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx`, `tools/manual-story-studio/test/post-segment-workbench.test.ts`, and `tools/manual-story-studio/test/acceptance/one-real-story.test.ts`. The deterministic scan logic was left unchanged; only the payload name and consuming assertions moved.

Updated the post-segment rail heading and `aria-label` to `Records linked to this segment's prompt`, changed the empty state to `No linked records.`, and changed the empty detail prompt to `Select a linked record or create a new post-segment record.` This removes the user-facing "touch" framing from the current web source.

Verification:

1. `rg -n "touched_records" tools/manual-story-studio --glob '*.{ts,tsx}' --glob '!dist/**'` returned no matches.
2. `rg -ni "records that touch this segment" tools/manual-story-studio/web/src` returned no matches.
3. `rg -n "linked_record_candidates|Records linked to this segment's prompt|No linked records|Select a linked record" tools/manual-story-studio/src tools/manual-story-studio/web/src tools/manual-story-studio/test --glob '*.{ts,tsx}' --glob '!dist/**'` found the expected producer, frontend consumer/wording, and test consumers.
4. `cd tools/manual-story-studio && npm run test:backend` passed.
5. `cd tools/manual-story-studio && npm --prefix web test` passed.
6. `cd tools/manual-story-studio && npm test` passed: backend build, 490 backend tests, and web typecheck all green.
7. `git diff --check -- tools/manual-story-studio/src/server/routes/post-segment-workbench.ts tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx tools/manual-story-studio/test/post-segment-workbench.test.ts tools/manual-story-studio/test/acceptance/one-real-story.test.ts archive/tickets/SPEC122MANSTOSTU-002.md` passed.

Deviations:

- None.
