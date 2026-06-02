# SPEC111MANSTOSTU-005: Confirm silent-error cleanup complete (regression guard)

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — confirmatory sweep; no production change expected. Optionally adds one regression-guard test.
**Deps**: None

## Problem

Per SPEC-111 §2 item 4 / AC#6: SPEC-105 removed the 7 explicit `.catch(() => {})` swallows in Dashboard and MomentComposer. This ticket confirms zero such swallows remain anywhere in `tools/manual-story-studio/web/src/`, confirms the surviving `catch {}` blocks are legitimate error-body fallbacks (not swallows), and keeps AC#6 as a regression guard. The active cleanup landed with SPEC-105 — this ticket does not re-do it (Rule 6 attribution).

## Assumption Reassessment (2026-06-02)

1. Codebase: a grep at reassessment time (2026-06-02) found **zero** `.catch(() => {})` in `tools/manual-story-studio/web/src/`; the surviving `catch {}` blocks at `web/src/api/manuscript.ts:11`, `web/src/api/segments.ts:16`, and `web/src/api/prompts.ts:38` are `readErrorBody` fallbacks that return a typed message (not silent swallows); `Dashboard.tsx` already surfaces every fetch error via an `*Error` state + Retry button.
2. Specs/docs: SPEC-111 §2 item 4 (reframed by reassessment M3 from active cleanup to confirmatory sweep + regression guard) + AC#6.
3. Cross-artifact boundary under audit: `archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` landed the `.catch(() => {})` cleanup — this ticket is the regression guard, not a re-implementation (Rule 6 No Silent Retcons: the cleanup is attributed to SPEC-105, not silently absorbed).
4. FOUNDATIONS §Soft Canon / Local Truth (must be explicit and validated; cf. SPEC-111 §5 and the source report §16 "absence-as-empty" finding): silent-error swallowing turns corruption into silence; this guard confirms the surfacing discipline holds across the frontend.

## Architecture Check

1. A confirmatory sweep with no expected production change is the correct shape because the work already landed (SPEC-105); the value added is a standing regression guard so the swallow pattern cannot silently return. If the sweep finds a genuine swallow (`try {} catch {}` dropping an error, a swallowed rejection, or `?? []` after a failed fetch), it is replaced with a surfaced error state.
2. No backwards-compatibility shims; the legitimate `readErrorBody` `catch {}` blocks are left intact (they are not swallows).

## Verification Layers

1. Zero `.catch(() => {})` in `web/src/` → codebase grep-proof (AC#6).
2. Surviving `catch {}` blocks are legitimate fallbacks, not swallows → manual review of the 3 `api/*.ts` sites.

## What to Change

### 1. Run the confirmatory sweep

`grep -rn "catch(() => {})" tools/manual-story-studio/web/src/` → expect zero. Confirm the `api/*.ts` `catch {}` blocks are `readErrorBody` fallbacks and that pages surface fetch errors (no silent empty-list-on-failure).

### 2. Fix any genuine swallow found (else no production change)

If the sweep surfaces a genuine silent swallow, replace it with a surfaced error state. None is expected.

### 3. (Recommended) add a regression-guard test

Add a backend test that greps `web/src` for `.catch(() => {})` and asserts zero matches, so AC#6 stays enforced over time.

## Files to Touch

- `tools/manual-story-studio/test/read/no-silent-catch.test.ts` (new) — optional regression guard asserting zero `.catch(() => {})` in `web/src`.
- (No `web/src` production file is expected to change; modify one only if the sweep finds a genuine swallow.)

## Out of Scope

- Re-doing SPEC-105's `.catch(() => {})` cleanup (already landed).
- The legitimate `readErrorBody` `catch {}` blocks (not swallows).
- Backend error handling; any broad refactor of error states.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "catch(() => {})" tools/manual-story-studio/web/src/` returns zero matches.
2. If the regression-guard test is added: `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. No `.catch(() => {})` pattern exists anywhere in `tools/manual-story-studio/web/src/`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/no-silent-catch.test.ts` — regression guard asserting zero `.catch(() => {})` in `web/src`. (Or `None — confirmatory sweep; verification is the AC#6 grep` if the guard test is not added.)

### Commands

1. `grep -rn "catch(() => {})" tools/manual-story-studio/web/src/`
2. `cd tools/manual-story-studio && npm test` (if the regression-guard test is added).
