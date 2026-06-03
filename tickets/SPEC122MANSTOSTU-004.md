# SPEC122MANSTOSTU-004: Paste Prose placeholder — "Paste accepted prose"

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend (`PasteProse.tsx`); one-line placeholder string. No backend/schema change.
**Deps**: None

## Problem

The Paste Prose textarea placeholder reads "Paste or draft the next manuscript segment here." (`PasteProse.tsx:115`). The "or draft" phrasing blurs Manual Story Studio's prose/state boundary — Manual Studio is not a prose editor; the author pastes prose **accepted** from the external LLM, written outside the app. The placeholder should say "Paste accepted prose" to keep the boundary clear at the prose-acceptance surface.

## Assumption Reassessment (2026-06-03)

1. The placeholder string is at `tools/manual-story-studio/web/src/pages/PasteProse.tsx:115` (`placeholder="Paste or draft the next manuscript segment here."`). Verified the exact string is present and unique.
2. Spec SPEC-122 §2 item 4 + §1 item 4 specify the change: "Paste accepted prose" (or "Paste the accepted prose for the next segment here."); "or draft" blurs the boundary.
3. Cross-artifact boundary under audit: the prose-acceptance surface (`PasteProse`) is where externally-accepted prose enters Manual Studio. The placeholder is the author-facing statement of that boundary; "accepted" (not "draft") asserts the external-LLM-outside-app discipline.
4. FOUNDATIONS principle motivating this ticket: the prose/state boundary (product invariant; §Tooling Recommendation analogue) — Manual Studio saves accepted prose; it does not author prose. The placeholder language must not imply in-app drafting.

## Architecture Check

1. A one-line copy change that aligns the author-facing language with the established prose-acceptance discipline; no logic change.
2. No backwards-compatibility concern — pure string replacement.

## Verification Layers

1. Placeholder no longer says "or draft" -> codebase grep-proof: `grep -rni "paste or draft" tools/manual-story-studio/web/src` returns nothing.
2. Placeholder reads "Paste accepted prose" -> codebase grep-proof: the new string is present at `PasteProse.tsx:115`. (Single-layer ticket: a one-line copy change has no cross-skill invariant to map; the grep-proof is the complete verification surface.)

## What to Change

### 1. Placeholder string

In `PasteProse.tsx:115`, replace `placeholder="Paste or draft the next manuscript segment here."` with `placeholder="Paste the accepted prose for the next segment here."`.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (modify)

## Out of Scope

- Any change to the textarea behavior, the paste/save flow, or other PasteProse copy.
- The rest of SPEC-122 (R1 seeding removal, R2 rename/cardify) — separate tickets.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rni "paste or draft" tools/manual-story-studio/web/src` returns nothing.
2. The new placeholder string is present at `PasteProse.tsx:115`.
3. `cd tools/manual-story-studio && npm --prefix web test` is green (web typecheck).

### Invariants

1. The placeholder language never implies in-app prose drafting; Manual Studio pastes accepted prose only.

## Test Plan

### New/Modified Tests

1. `None — one-line placeholder copy change; verification is grep-based and the existing web typecheck (`npm --prefix web test`) covers compilation.`

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck)
2. `cd tools/manual-story-studio && npm test` (full pipeline)
