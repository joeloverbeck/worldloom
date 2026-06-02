# SPEC111MANSTOSTU-005: Confirm silent-error cleanup complete (regression guard)

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — manual-story-studio web error surfacing plus static regression guard. No backend or canon-pipeline impact.
**Deps**: None

## Problem

Per SPEC-111 §2 item 4 / AC#6: SPEC-105 removed the 7 explicit `.catch(() => {})` swallows in Dashboard and MomentComposer. This ticket confirms zero such swallows remain anywhere in `tools/manual-story-studio/web/src/`, confirms the surviving `catch {}` blocks are legitimate error-body fallbacks (not swallows), and keeps AC#6 as a regression guard. The active cleanup landed with SPEC-105 — this ticket does not re-do it (Rule 6 attribution).

## Assumption Reassessment (2026-06-02)

1. Codebase: a grep at reassessment time (2026-06-02) found **zero** exact `.catch(() => {})` in `tools/manual-story-studio/web/src/`, and the `readErrorBody` `catch {}` blocks at `web/src/api/manuscript.ts:11`, `web/src/api/segments.ts:16`, and `web/src/api/prompts.ts:38` return typed fallback messages. A broader live `.catch(() => { ... })` sweep did expose same-seam silent fallbacks in `BeatTemplates.tsx`, `CastAndProfiles.tsx`, `Records.tsx`, and `EditContract.tsx`; this ticket owns surfacing those errors instead of leaving failure indistinguishable from empty or absent state. `Dashboard.tsx` mostly surfaces fetch errors via `*Error` state + Retry button; the manuscript read remains the intentional absent-vs-failed optional read distinction from SPEC-105.
2. Specs/docs: SPEC-111 §2 item 4 (reframed by reassessment M3 from active cleanup to confirmatory sweep + regression guard) + AC#6.
3. Cross-artifact boundary under audit: `archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` landed the `.catch(() => {})` cleanup — this ticket is the regression guard, not a re-implementation (Rule 6 No Silent Retcons: the cleanup is attributed to SPEC-105, not silently absorbed).
4. FOUNDATIONS §Soft Canon / Local Truth (must be explicit and validated; cf. SPEC-111 §5 and the source report §16 "absence-as-empty" finding): silent-error swallowing turns corruption into silence; this guard confirms the surfacing discipline holds across the frontend.

## Architecture Check

1. The exact `.catch(() => {})` cleanup already landed (SPEC-105); the value added here is both a standing regression guard and same-seam cleanup for broader silent promise fallbacks found by live reassessment. Genuine list/detail fetch failures are replaced with surfaced error state instead of empty arrays or null detail.
2. No backwards-compatibility shims; the legitimate `readErrorBody` `catch {}` blocks are left intact (they are not swallows).

## Verification Layers

1. Zero `.catch(() => {})` in `web/src/` → codebase grep-proof (AC#6).
2. Surviving `catch {}` blocks are legitimate fallbacks, not swallows → manual review of the 3 `api/*.ts` sites.
3. Broader `.catch(() => { ... })` fallbacks no longer turn failed fetches into empty/null UI → code review plus grep-proof.

## What to Change

### 1. Run the confirmatory sweep

`grep -rn "catch(() => {})" tools/manual-story-studio/web/src/` → expect zero. Confirm the `api/*.ts` `catch {}` blocks are `readErrorBody` fallbacks and that pages surface fetch errors (no silent empty-list-on-failure).

### 2. Fix any genuine swallow found (else no production change)

If the sweep surfaces a genuine silent swallow, replace it with a surfaced error state. Live reassessment found same-seam fallbacks in list/detail pages, so this ticket now owns those small production fixes.

### 3. (Recommended) add a regression-guard test

Add a backend test that greps `web/src` for `.catch(() => {})` and asserts zero matches, so AC#6 stays enforced over time.

## Files to Touch

- `tools/manual-story-studio/test/read/no-silent-catch.test.ts` (new) — optional regression guard asserting zero `.catch(() => {})` in `web/src`.
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditContract.tsx` (modify)

## Out of Scope

- Re-doing SPEC-105's `.catch(() => {})` cleanup (already landed).
- The legitimate `readErrorBody` `catch {}` blocks (not swallows).
- Backend error handling; any broad refactor of error states.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "catch(() => {})" tools/manual-story-studio/web/src/` returns zero matches.
2. If the regression-guard test is added: `cd tools/manual-story-studio && npm test` is green.
3. List/detail page fetch failures in the touched pages render explicit error messages rather than empty/null states.

### Invariants

1. No `.catch(() => {})` pattern exists anywhere in `tools/manual-story-studio/web/src/`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/no-silent-catch.test.ts` — regression guard asserting zero exact `.catch(() => {})` in `web/src`.

### Commands

1. `grep -rn "catch(() => {})" tools/manual-story-studio/web/src/`
2. `cd tools/manual-story-studio && npm test` (if the regression-guard test is added).

## Landed Changes (2026-06-02)

1. Added `tools/manual-story-studio/test/read/no-silent-catch.test.ts`, a compiled backend static guard that walks `web/src` and fails if the exact `.catch(() => {})` silent-swallow pattern appears.
2. Replaced silent promise fallbacks in `BeatTemplates.tsx`, `CastAndProfiles.tsx`, `Records.tsx`, and `EditContract.tsx` with explicit load-error state and visible `role="alert"` messages.
3. Left the three `readErrorBody` `catch {}` fallback blocks intact because they return typed error text, and left Dashboard manuscript's optional absent/read-failed distinction as historical SPEC-105 behavior.

## Verification Result (2026-06-02)

PASS — `rg -n -F ".catch(() => {})" tools/manual-story-studio/web/src` returned no matches; exit code 1 is the expected no-match proof.

PASS — `rg -n -C 2 "\\.catch\\(\\(\\) => \\{" tools/manual-story-studio/web/src` now shows only Dashboard's intentional manuscript optional-read fallback; the newly touched list/detail pages no longer use zero-argument promise catches.

PASS — `cd tools/manual-story-studio && npm test` passed: backend build, 446 backend/static tests including the new guard, and web `tsc --noEmit`.

## Outcome

Completed on 2026-06-02. SPEC-111 AC#6 now has a checked regression guard for the original `.catch(() => {})` swallow pattern, and the live same-seam silent empty/null fallbacks found during reassessment now surface explicit frontend errors. This preserves SPEC-105 attribution for the original seven-site cleanup while extending the cockpit's no-silent-error discipline to adjacent list/detail surfaces.

Deviation from the original plan: the ticket was drafted as a confirmatory no-production-change sweep, but live reassessment found genuine silent promise fallbacks in four pages. Those were corrected under the ticket's own "fix any genuine swallow found" clause.
