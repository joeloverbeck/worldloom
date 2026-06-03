# SPEC123MANSTOSTU-002: Rename field `current_handoff_summary` → `handoff_summary` (incl. prompt-payload cascade)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` schema + web types + prompt-payload layer; no impact on any other tool/package.
**Deps**: archive/tickets/SPEC123MANSTOSTU-001.md

## Problem

SPEC-123 §2 item 7 renames the one clearly-justified working-set field, `current_handoff_summary` → `handoff_summary` (report §30), while keeping `must_not_reveal` and deferring all other field changes. The field exists as **two independent declarations**: the `PromptWorkingSet` schema field (renamed file `src/schema/prompt-working-set.ts` after 001, plus `web/src/types/manual-story.ts`) AND an independent prompt-payload field at `src/prompt/types.ts` (consumed at `src/prompt/compose.ts` and `src/prompt/sections/section-3-current-situation.ts`). Renaming only the schema field would leave the prompt-payload layer named `current_handoff_summary` — the exact split-brain SPEC-123 exists to remove — and the package's primary grep gate (AC#1's `current_context` pattern) does **not** match the token `current_handoff_summary`. This ticket renames the field across both declarations and adds AC#7 as the dedicated grep guard. (Reassessment Issue I2.)

## Assumption Reassessment (2026-06-03)

1. `current_handoff_summary` has two independent declarations in code: (a) the working-set schema field at `src/schema/current-context.ts:13` (renamed to `src/schema/prompt-working-set.ts` by 001) + `web/src/types/manual-story.ts:110`; (b) the prompt-payload field at `src/prompt/types.ts:34` (`current_handoff_summary?: string | null`), consumed at `src/prompt/compose.ts:370` (payload key, mapped from the schema field) and `src/prompt/sections/section-3-current-situation.ts:66`. Renaming the schema field (a) is compiler-forced onto its readers; declaration (b) is a separate type and is **not** compiler-forced by (a)'s rename. UI consumers `web/src/pages/EditCurrentContext.tsx` (→ `EditPromptWorkingSet.tsx` after 001) and `web/src/components/CurrentStatePanel.tsx` read the schema field.
2. SPEC-123 §2 item 7 + AC#4 + AC#7 (added at reassessment); source report `reports/manual-story-studio-fifth-iteration.md` §30. AC#1's pattern (`current_context`) does not match `current_handoff_summary` — confirmed — so AC#7 (`grep -rn "current_handoff_summary" … returns zero`) is the only grep guard for this rename.
3. Shared boundary under audit: the two independent field declarations (schema field vs prompt-payload field) that must rename in lockstep; `compose.ts:370` is the seam mapping one to the other.
4. FOUNDATIONS: `manual-story-studio` is canon-fenced; the field rename touches no `_source/` or canon surface — the working-set file is a freely-editable author sidecar (Mutable local truth; §Canonical Storage Layer / Hook 3 N/A). Rule 6 (No Silent Retcons): renaming an existing field of existing code — the retcon justification is end-to-end name coherence with no shim, per SPEC-123 §3.
5. (was template item 7 — field-rename blast radius) `grep -rn "current_handoff_summary"` across `tools/manual-story-studio` enumerates the blast radius: schema field, `web/src/types/manual-story.ts`, the prompt-payload layer (`prompt/types.ts`, `compose.ts`, `section-3-current-situation.ts`), the web edit/display components, and any test literal asserting the field key. Zero consumers exist outside the package. `must_not_reveal` is explicitly NOT renamed.

## Architecture Check

1. Renaming both declarations in lockstep is cleaner than renaming only the schema field: it keeps the assembled-prompt layer's field name consistent with the source, completing the coherence SPEC-123 targets. Adding AC#7 as an explicit grep guard is cleaner than relying on manual inspection, since the token escapes AC#1's pattern.
2. No backwards-compatibility aliasing/shims are introduced — the old field name is removed outright.

## Verification Layers

1. No `current_handoff_summary` token survives anywhere in package code/tests → codebase grep-proof (AC#7).
2. The prompt-payload field renamed in lockstep with the schema field (no asymmetry at `compose.ts:370`) → codebase grep-proof on `prompt/types.ts` + `compose.ts` + `section-3-current-situation.ts`.
3. No behavior change to prompt assembly (the renamed field carries the same value through the same path) → full test suite (`npm test`) green.

## What to Change

### 1. Schema + web-type field rename

- `src/schema/prompt-working-set.ts` (renamed file from 001) — `current_handoff_summary` → `handoff_summary` on the `PromptWorkingSet` interface.
- `web/src/types/manual-story.ts` — `current_handoff_summary` → `handoff_summary`.

### 2. Prompt-payload layer cascade

- `src/prompt/types.ts` — rename the independent `current_handoff_summary?` field → `handoff_summary?`.
- `src/prompt/compose.ts` — rename the payload key at `:370` (the LHS `current_handoff_summary:` set from the working-set field) → `handoff_summary`.
- `src/prompt/sections/section-3-current-situation.ts` — rename the payload-field read (`input.current_handoff_summary` / the `currentHandoff*` locals) → `handoff_summary`.

### 3. Web consumers + tests

- `web/src/components/CurrentStatePanel.tsx`, `web/src/pages/EditPromptWorkingSet.tsx` (renamed from 001) — rename the field reads/writes/error-keys.
- Any test literal asserting the field key (`test/prompt-working-set/*` after 001, `test/prompt/*` working-set fixtures) — rename `current_handoff_summary` → `handoff_summary`.

## Files to Touch

- `tools/manual-story-studio/src/schema/prompt-working-set.ts` (modify — created `(new)` by 001; Deps:001)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/src/prompt/sections/section-3-current-situation.ts` (modify)
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditPromptWorkingSet.tsx` (modify — created `(new)` by 001; Deps:001)
- `tools/manual-story-studio/test/prompt-working-set/*.test.ts` (modify — created `(new)` by 001's test rename; Deps:001; only files asserting the field key)
- `tools/manual-story-studio/test/prompt/{inclusion-ledger,inspector-payload,never-prompt}.test.ts` (modify — only if their `PromptWorkingSet` fixtures set the field key)

## Out of Scope

- All identifier/file/route/filename renames (owned by SPEC123MANSTOSTU-001).
- `must_not_reveal` — explicitly kept (SPEC-123 §2 item 7).
- The `active_secrets_questions` → `active_reveal_controls` rename and any new working-set fields — deferred per SPEC-123 §2.
- Any behavior change to prompt composition, inclusion/exclusion, or health.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "current_handoff_summary" tools/manual-story-studio --include=*.ts --include=*.tsx` returns **zero** hits outside `dist/`. (SPEC-123 AC#7)
2. The field is `handoff_summary` in both `src/schema/prompt-working-set.ts` and `web/src/types/manual-story.ts`, AND in the prompt-payload layer (`src/prompt/types.ts`); `must_not_reveal` is unchanged. (SPEC-123 AC#4)
3. `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. The prompt-payload field and the working-set schema field carry the same name (`handoff_summary`) — no asymmetry survives at the `compose.ts` mapping seam.
2. Prompt assembly produces identical output for an equivalent working set (the rename is name-only; no value or behavior change).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-working-set/*` and `test/prompt/*` — field-key literals updated where the working-set fixtures set `current_handoff_summary`; existing assertions otherwise unchanged.

### Commands

1. `grep -rn "current_handoff_summary" tools/manual-story-studio --include=*.ts --include=*.tsx` (expect zero outside `dist/`)
2. `cd tools/manual-story-studio/web && npm test`
3. `cd tools/manual-story-studio && npm test` — full suite; the correct end-to-end boundary since the field flows through both backend prompt assembly and web typecheck.

## Outcome

Completed: 2026-06-03

What changed:
- Renamed the working-set field `current_handoff_summary` to `handoff_summary` in the backend `PromptWorkingSet` schema, web `PromptWorkingSet` type, prompt payload type, prompt composition mapping, section 3 emitter, web display/edit consumers, fixtures, and tests.
- Kept `must_not_reveal` unchanged.

Deviations:
- The section 3 local variables were renamed from `currentHandoff*` to `handoff*` so the code no longer carries the old field wording.
- One read-test expected-key list was reordered because `handoff_summary` sorts after `current_location`; this was assertion truthing only.

Verification:
- `rg -n "current_handoff_summary" tools/manual-story-studio -g '!dist/**' -g '!web/node_modules/**'` returned zero hits.
- `rg -n "handoff_summary" tools/manual-story-studio/src/schema/prompt-working-set.ts tools/manual-story-studio/web/src/types/manual-story.ts tools/manual-story-studio/src/prompt/types.ts tools/manual-story-studio/src/prompt/compose.ts tools/manual-story-studio/src/prompt/sections/section-3-current-situation.ts` confirmed the schema, web type, and prompt-payload declarations/consumers.
- `rg -n "must_not_reveal" tools/manual-story-studio/src/schema/prompt-working-set.ts tools/manual-story-studio/web/src/types/manual-story.ts tools/manual-story-studio/src/prompt/compose.ts` confirmed the field remains.
- `cd tools/manual-story-studio && npm run test:backend` passed.
- `cd tools/manual-story-studio/web && npm test` passed.
- `cd tools/manual-story-studio && npm test` passed.
- `git diff --check` passed.
