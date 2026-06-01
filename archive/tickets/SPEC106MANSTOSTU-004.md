# SPEC106MANSTOSTU-004: Remove lint_override clipboard-override path (frontend) + onCopy/onSave early returns

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend: `web/src/pages/PromptPreview.tsx`, `web/src/api/prompts.ts`, `web/src/types/manual-story.ts`.
**Deps**: archive/tickets/SPEC106MANSTOSTU-003.md

## Problem

At intake, `web/src/pages/PromptPreview.tsx` constructed a `lint_override` body field on save when soft findings were present and the author clicked through a confirm dialog (`window.confirm(... save anyway?)`), and forwarded it via `savePrompt(...)`. Per SPEC-106 §2.3 and §3 *Disabled-button is the primary guard; early return is defense-in-depth*, this construction is now removed: the disabled buttons remain the primary UI guard, supplemented by early-return defense-in-depth at the top of `onCopy` and `onSave` against programmatic clicks (future tests, keyboard shortcuts that bypass the disabled state). The frontend's `savePrompt` request type no longer declares `lint_override?` on the input. The frontend's duplicate `PromptRunSidecar.lint_override?` field is marked legacy (read-tolerant, write-omitted) mirroring the backend type from `archive/tickets/SPEC106MANSTOSTU-003.md`.

## Assumption Reassessment (2026-06-01)

1. At intake, `web/src/pages/PromptPreview.tsx` constructed `lint_override`, declared `disabled={lint.blockingForCopy}` on Copy, and declared `disabled={lint.blockingForCopy || submitting}` on Save. `web/src/api/prompts.ts` declared `lint_override?` on the `savePrompt` input intersection type. `web/src/types/manual-story.ts` declared `PromptRunSidecar.lint_override?`. `web/src/components/LintBadge.tsx` consumed `lint.findings` tier-agnostically — no lint_override-specific code path.
2. Spec: `specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` §2.3 + §3 *Disabled-button is the primary guard; early return is defense-in-depth* + §4 *Files to touch* — the ticket's line citations matched the codebase at intake.
3. Cross-skill boundary: the web ↔ backend save-request shape. The `savePrompt` request's `lint_override?` field is the channel `archive/tickets/SPEC106MANSTOSTU-003.md` closes on the backend; this ticket closes the symmetric frontend send. Both must land for the path to be fully gone; landing order is 003 → 004 to keep the type system clean between the two diffs.
4. FOUNDATIONS: §Tooling Recommendation (least-agency LLM packets, "agents never operate on prose alone"). The disabled-button primary guard + early-return defense-in-depth are the realization of the least-agency principle at the prompt-clipboard boundary: the UI denies the copy/save action when any hard finding fires, and the handler's early-return guards against programmatic-click bypasses (future tests, keyboard shortcuts). Together they make the clipboard a deterministic write surface in the same sense FOUNDATIONS expects for canon-write surfaces.
5. Schema extension: frontend `PromptRunSidecar.lint_override?` (type at `web/src/types/manual-story.ts:288-296`) transitions from read-and-write to read-tolerant + write-omitted (mirrors backend treatment in `archive/tickets/SPEC106MANSTOSTU-003.md`). Consumers of the type in the frontend: `PromptPreview.tsx` (no longer constructs it after this ticket), `web/src/api/prompts.ts` (`getPrompt` returns `{ markdown; sidecar: PromptRunSidecar }`, but no caller inspects `sidecar.lint_override`). Backward compatibility preserved: legacy on-disk sidecars carrying the field still parse into the type cleanly.
6. Rename/remove blast radius: `lint_override` clipboard-override path removal. Frontend pipeline grep (`grep -rn "lint_override\|copied_anyway" tools/manual-story-studio/web/`) returns matches only at the three Files-to-Touch paths above; no other web/component path consults the field.

## Architecture Check

1. Disabled-button is the primary guard (`disabled={lint.blockingForCopy}` / `disabled={lint.blockingForCopy || submitting}`); the early return at the top of `onCopy` and `onSave` is defense-in-depth against programmatic clicks (e.g., a future test or keyboard shortcut that fires the handler bypassing the disabled state). Two layers, one invariant.
2. No backwards-compatibility shims: `lint_override` is removed from both the construction (PromptPreview body) AND the send-type (`savePrompt` input); the `PromptRunSidecar.lint_override?` field stays optional on the type purely for read-tolerance of legacy on-disk sidecars. No alias paths introduced.

## Verification Layers

1. `lint_override` construction is gone → codebase grep: `grep -n "lint_override" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches; `grep -n "copied_anyway" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches.
2. Save-request type drops the field → codebase grep: `grep -n "lint_override" tools/manual-story-studio/web/src/api/prompts.ts` returns zero matches.
3. Sidecar type stays read-tolerant → codebase grep: `grep -B1 "lint_override" tools/manual-story-studio/web/src/types/manual-story.ts` returns the legacy-comment + optional-field declaration.
4. Primary UI guard intact → codebase grep: `grep -n "disabled={lint.blockingForCopy" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns the Copy + Save disabled clauses unchanged.
5. Early-return defense-in-depth landed → codebase grep: `grep -n "if (lint.blockingForCopy)" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns one match inside `onCopy` and one inside `onSave`.
6. Frontend compiles → `cd tools/manual-story-studio/web && npm test` (which is `tsc -p tsconfig.json --noEmit` per `web/package.json:7`) is green. This is the sub-assertion from SPEC-106 §2.7 (typecheck-only verification), folded into this ticket's acceptance.

## Landed Changes

### 1. `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` — remove `lint_override` construction; add early returns

- Removed the `lint_override` local variable declaration, the `window.confirm(...)` branch, and the `...(lint_override ? { lint_override } : {})` spread in the `savePrompt(...)` call. `onSave` now calls `savePrompt(worldSlug!, msSlug!, { ...composeInput! })` directly after the blocking-lint guard.
- Added `if (lint.blockingForCopy) return;` at the top of `onCopy` as defense-in-depth against programmatic clicks.
- Added `if (lint.blockingForCopy) return;` at the top of `onSave` before `setSubmitting(true)`, so the submit state never flips on a blocked programmatic call.
- Removed the now-unused `PromptLintFinding` type import from this file.

### 2. `tools/manual-story-studio/web/src/api/prompts.ts` — drop `lint_override?` from `savePrompt` input

Dropped the `lint_override?` field from the `savePrompt(...)` input intersection type. The signature is now `input: PromptComposeRequestInput`. The `PromptLintFinding` import stays because `SavePromptOutcome.findings: PromptLintFinding[]` still references it for the `lint_blocks_save` 409 reply shape.

### 3. `tools/manual-story-studio/web/src/types/manual-story.ts` — mark `PromptRunSidecar.lint_override?` legacy

Added a one-line comment above the `lint_override?` field declaration naming SPEC-106 as the deprecation source. The field itself stays optional and parses silently on read; this mirrors the backend treatment in `archive/tickets/SPEC106MANSTOSTU-003.md`.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` (modify)
- `tools/manual-story-studio/web/src/api/prompts.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)

## Out of Scope

- Backend `lint_override` removal (`src/write/prompts.ts`, `src/server/routes/prompts.ts`, `src/prompt/types.ts`) — covered by `archive/tickets/SPEC106MANSTOSTU-003.md`.
- A new "lint history" view for debugging — explicitly out of scope per SPEC-106 §2 Out of scope.
- Frontend health banner integration — SPEC-105 (already landed; archived).
- New soft-tier quality affordances (in-banner prompt-too-long / weak-directive / too-many-records UX) — deferred to SPEC-111.
- Tier flips for the four leakage rules — covered by `archive/tickets/SPEC106MANSTOSTU-001.md`.
- The `recent_segment_required_but_unavailable` rule — covered by `archive/tickets/SPEC106MANSTOSTU-002.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "lint_override" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches.
2. `grep -n "copied_anyway" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches.
3. `grep -n "lint_override" tools/manual-story-studio/web/src/api/prompts.ts` returns zero matches.
4. `grep -n "disabled={lint.blockingForCopy" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns the two existing disabled clauses (Copy + Save) unchanged.
5. `grep -n "if (lint.blockingForCopy)" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns one match inside `onCopy` and one inside `onSave` (the early-return defense-in-depth).
6. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) is green.
7. `cd tools/manual-story-studio && npm test` is green end-to-end (backend + web typecheck both pass).

### Invariants

1. The disabled-button is always the primary UI guard; the early-return is always defense-in-depth — both must be present.
2. `PromptRunSidecar.lint_override?` stays optional on the frontend type so legacy on-disk sidecars parse without error.
3. The `savePrompt` request body never carries `lint_override` after this ticket lands.

## Test Plan

### New/Modified Tests

1. `None — sub-assertion ticket; verification is typecheck-only per SPEC-106 §2.7 ("Frontend test (typecheck-only level) — the removal of lint_override construction at PromptPreview.tsx must compile cleanly under the package's existing tsc --noEmit web test step"). Acceptance is grep-proofs + tsc --noEmit. Existing backend tests under tools/manual-story-studio/test/ stayed green (this ticket did not modify backend code).`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm test`
3. `grep -n "lint_override" tools/manual-story-studio/web/src/pages/PromptPreview.tsx || true`
4. `grep -n "copied_anyway" tools/manual-story-studio/web/src/pages/PromptPreview.tsx || true`
5. `grep -n "lint_override" tools/manual-story-studio/web/src/api/prompts.ts || true`
6. `grep -n "disabled={lint.blockingForCopy" tools/manual-story-studio/web/src/pages/PromptPreview.tsx`
7. `grep -n "if (lint.blockingForCopy)" tools/manual-story-studio/web/src/pages/PromptPreview.tsx`
8. `grep -B1 "lint_override" tools/manual-story-studio/web/src/types/manual-story.ts`
9. The package-level `npm test` and the web-specific `npm test` are both run because the frontend has no test framework in place (the web's `npm test` is `tsc -p tsconfig.json --noEmit` per `web/package.json:7`); the typecheck is the verification surface, and the package-level command additionally re-checks backend tests stay green under no backend changes.

## Outcome

Completed: 2026-06-01.

Removed the frontend clipboard/save override path. `PromptPreview` no longer imports `PromptLintFinding`, constructs `lint_override`, asks for a save-anyway confirmation, or sends the field to `savePrompt`. `onCopy` and `onSave` both now return immediately when `lint.blockingForCopy` is true, preserving the disabled buttons as the primary guard and adding the requested handler-level defense-in-depth.

Changed the frontend save API input to `PromptComposeRequestInput` only. Kept `PromptRunSidecar.lint_override?` optional in the frontend type for legacy read tolerance and marked it deprecated for SPEC-106.

## Verification Result

Passed:

1. `cd tools/manual-story-studio/web && npm test` — web `tsc --noEmit` passed.
2. `grep -n "lint_override" tools/manual-story-studio/web/src/pages/PromptPreview.tsx || true` — expected no matches.
3. `grep -n "copied_anyway" tools/manual-story-studio/web/src/pages/PromptPreview.tsx || true` — expected no matches.
4. `grep -n "lint_override" tools/manual-story-studio/web/src/api/prompts.ts || true` — expected no matches.
5. `grep -n "disabled={lint.blockingForCopy" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` — returned the Copy and Save disabled clauses.
6. `grep -n "if (lint.blockingForCopy)" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` — returned one guard in `onCopy` and one in `onSave`.
7. `grep -B1 "lint_override" tools/manual-story-studio/web/src/types/manual-story.ts` — returned the SPEC-106 deprecation comment and optional legacy field.
8. `cd tools/manual-story-studio && npm test` — backend build, 386 backend tests, and web `tsc --noEmit` passed.

## Deviations

None.
