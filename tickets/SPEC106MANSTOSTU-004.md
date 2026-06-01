# SPEC106MANSTOSTU-004: Remove lint_override clipboard-override path (frontend) + onCopy/onSave early returns

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend: `web/src/pages/PromptPreview.tsx`, `web/src/api/prompts.ts`, `web/src/types/manual-story.ts`.
**Deps**: archive/tickets/SPEC106MANSTOSTU-003.md

## Problem

`web/src/pages/PromptPreview.tsx` (lines 89-126) constructs a `lint_override` body field on save when soft findings are present and the author clicks through a confirm dialog (`window.confirm(... save anyway?)`), and forwards it via `savePrompt(...)`. Per SPEC-106 §2.3 and §3 *Disabled-button is the primary guard; early return is defense-in-depth*, this construction must be removed: the disabled-button at line 154 (`disabled={lint.blockingForCopy}`) and line 160 (Save) is the primary UI guard, supplemented by an early-return defense-in-depth at the top of `onCopy` and `onSave` against programmatic clicks (future tests, keyboard shortcuts that bypass the disabled state). The frontend's `savePrompt` request type at `web/src/api/prompts.ts:71-79` declares `lint_override?` on the input; it must drop the field in lockstep so the type-system enforces the removal. The frontend's duplicate `PromptRunSidecar.lint_override?` field at `web/src/types/manual-story.ts:288-296` is marked legacy (read-tolerant, write-omitted) mirroring the backend type from `archive/tickets/SPEC106MANSTOSTU-003.md`.

## Assumption Reassessment (2026-06-01)

1. Codebase: `web/src/pages/PromptPreview.tsx` lines 94-112 construct `lint_override`; line 154 declares `disabled={lint.blockingForCopy}` on Copy; line 160 declares `disabled={lint.blockingForCopy || submitting}` on Save. `web/src/api/prompts.ts:71-79` declares `lint_override?` on the `savePrompt` input intersection type. `web/src/types/manual-story.ts:288-296` declares `PromptRunSidecar.lint_override?`. `web/src/components/LintBadge.tsx` consumes `lint.findings` tier-agnostically (split into `hardFindings`/`softFindings` at lines 19-20) — no lint_override-specific code path.
2. Spec: `specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` §2.3 + §3 *Disabled-button is the primary guard; early return is defense-in-depth* + §4 *Files to touch* — line citations match the codebase exactly.
3. Cross-skill boundary: the web ↔ backend save-request shape. The `savePrompt` request's `lint_override?` field is the channel `archive/tickets/SPEC106MANSTOSTU-003.md` closes on the backend; this ticket closes the symmetric frontend send. Both must land for the path to be fully gone; landing order is 003 → 004 to keep the type system clean between the two diffs.
4. FOUNDATIONS: §Tooling Recommendation (least-agency LLM packets, "agents never operate on prose alone"). The disabled-button primary guard + early-return defense-in-depth are the realization of the least-agency principle at the prompt-clipboard boundary: the UI denies the copy/save action when any hard finding fires, and the handler's early-return guards against programmatic-click bypasses (future tests, keyboard shortcuts). Together they make the clipboard a deterministic write surface in the same sense FOUNDATIONS expects for canon-write surfaces.
5. Schema extension: frontend `PromptRunSidecar.lint_override?` (type at `web/src/types/manual-story.ts:288-296`) transitions from read-and-write to read-tolerant + write-omitted (mirrors backend treatment in `archive/tickets/SPEC106MANSTOSTU-003.md`). Consumers of the type in the frontend: `PromptPreview.tsx` (no longer constructs it after this ticket), `web/src/api/prompts.ts` (`getPrompt` returns `{ markdown; sidecar: PromptRunSidecar }`, but no caller inspects `sidecar.lint_override`). Backward compatibility preserved: legacy on-disk sidecars carrying the field still parse into the type cleanly.
6. Rename/remove blast radius: `lint_override` clipboard-override path removal. Frontend pipeline grep (`grep -rn "lint_override\|copied_anyway" tools/manual-story-studio/web/`) returns matches only at the three Files-to-Touch paths above; no other web/component path consults the field.

## Architecture Check

1. Disabled-button is the primary guard (lines 154 / 160 — `disabled={lint.blockingForCopy}` / `disabled={lint.blockingForCopy || submitting}`); the early return at the top of `onCopy` and `onSave` is defense-in-depth against programmatic clicks (e.g., a future test or keyboard shortcut that fires the handler bypassing the disabled state). Two layers, one invariant.
2. No backwards-compatibility shims: `lint_override` is removed from both the construction (PromptPreview body) AND the send-type (`savePrompt` input); the `PromptRunSidecar.lint_override?` field stays optional on the type purely for read-tolerance of legacy on-disk sidecars. No alias paths introduced.

## Verification Layers

1. `lint_override` construction is gone → codebase grep: `grep -n "lint_override" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches; `grep -n "copied_anyway" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches.
2. Save-request type drops the field → codebase grep: `grep -n "lint_override" tools/manual-story-studio/web/src/api/prompts.ts` returns zero matches.
3. Sidecar type stays read-tolerant → codebase grep: `grep -B1 "lint_override" tools/manual-story-studio/web/src/types/manual-story.ts` returns the legacy-comment + optional-field declaration.
4. Primary UI guard intact → codebase grep: `grep -n "disabled={lint.blockingForCopy" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns the Copy + Save disabled clauses unchanged.
5. Early-return defense-in-depth landed → codebase grep: `grep -n "if (lint.blockingForCopy)" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns one match inside `onCopy` and one inside `onSave`.
6. Frontend compiles → `cd tools/manual-story-studio/web && npm test` (which is `tsc -p tsconfig.json --noEmit` per `web/package.json:7`) is green. This is the sub-assertion from SPEC-106 §2.7 (typecheck-only verification), folded into this ticket's acceptance.

## What to Change

### 1. `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` — remove `lint_override` construction; add early returns

- Lines 94-112: remove the `lint_override` local variable declaration, the `window.confirm(...)` branch, and the `...(lint_override ? { lint_override } : {})` spread in the `savePrompt(...)` call. After the edit, `onSave` calls `savePrompt(worldSlug!, msSlug!, { ...composeInput! })` directly when `lint.cleanForCopy === true`; when `lint.blockingForCopy === true` the early return below fires first.
- Top of `onCopy` (after the `try` and before the clipboard write): add `if (lint.blockingForCopy) return;` (defense-in-depth against programmatic clicks).
- Top of `onSave` (after the `setSubmitting(true)`/`setStatusMessage(null)`/`setErrorMessage(null)` block, before the `try`): add `if (lint.blockingForCopy) { setSubmitting(false); return; }` — the `setSubmitting(false)` is needed because the `try`/`finally` was the previous reset path. Alternatively, move the early return *before* the `setSubmitting(true)` so the submit-state never flips; the implementer chooses the cleaner shape.
- Remove the `PromptLintFinding` type import on line 9 if no remaining `lint_override`-related code references the type; keep it if it's still consumed by the `findings.some((f) => ...)` shape elsewhere in this file (currently it is not; verify at implementation).

### 2. `tools/manual-story-studio/web/src/api/prompts.ts` — drop `lint_override?` from `savePrompt` input

Drop the `lint_override?` field from the `savePrompt(...)` input intersection type at lines 71-79. The new signature: `input: PromptComposeRequestInput` (drop the intersection entirely). Remove the now-unused `PromptLintFinding` import on line 4 if no other export consumes it (the `SavePromptOutcome.findings: PromptLintFinding[]` at line 67 still references it for the `lint_blocks_save` 409 reply shape, so the import stays).

### 3. `tools/manual-story-studio/web/src/types/manual-story.ts` — mark `PromptRunSidecar.lint_override?` legacy

Add a one-line comment above the `lint_override?` field declaration at lines 292-295 naming SPEC-106 as the deprecation source, e.g. `/** @deprecated SPEC-106: write-omitted; read-tolerant for legacy sidecars only. */`. The field itself stays optional and parses silently on read; this mirrors the backend treatment in `archive/tickets/SPEC106MANSTOSTU-003.md`.

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

1. `None — sub-assertion ticket; verification is typecheck-only per SPEC-106 §2.7 ("Frontend test (typecheck-only level) — the removal of lint_override construction at PromptPreview.tsx:94-112 must compile cleanly under the package's existing tsc --noEmit web test step"). Acceptance is grep-proofs + tsc --noEmit. Existing backend tests under tools/manual-story-studio/test/ stay green (this ticket does not modify backend code).`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm test`
3. The package-level `npm test` and the web-specific `npm test` are both run because the frontend has no test framework in place (the web's `npm test` is `tsc -p tsconfig.json --noEmit` per `web/package.json:7`); the typecheck IS the verification surface, and the package-level command additionally re-checks backend tests stay green under no backend changes.
