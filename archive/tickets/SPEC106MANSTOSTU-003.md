# SPEC106MANSTOSTU-003: Remove lint_override write-path (backend) + retire SPEC-102 capstone AC #9

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` write module (`src/write/prompts.ts`), HTTP route (`src/server/routes/prompts.ts`), prompt-types module (`src/prompt/types.ts`), and three test surfaces (`test/write/prompts.test.ts`, `test/server/prompts-routes.test.ts`, `test/capstone-spec102.test.ts`).
**Deps**: None

## Problem

At intake, `lint_override` was the SPEC-102 audit-trail breadcrumb that recorded "the author clicked through a soft-tier warning and copied/saved anyway." Once `archive/tickets/SPEC106MANSTOSTU-001.md` promoted the four leakage rules to hard tier, the override was reachable only for the qualitatively-different quality warnings the spec defers to SPEC-111 — and the four previously-soft rules became unreachable through it. Per SPEC-106 §2.4 and §3 *No deprecation period for `lint_override`*, the write-side construction is now removed: new sidecars never carry the field. Read-side stays tolerant (legacy on-disk sidecars that carry the field continue to parse). Three backend file edits landed together to keep the type, route, and write layer self-consistent; three test-surface edits invert existing override-persistence assertions into regression guards; the archived SPEC-102 capstone's AC #9 (`test/capstone-spec102.test.ts`) is rewritten as a regression guard naming SPEC-106 as the retcon source per Rule 6 attribution.

## Assumption Reassessment (2026-06-01)

1. At intake, backend `lint_override` consumers were enumerated via `grep -rn 'lint_override\|copied_anyway' tools/manual-story-studio/`:
   - `tools/manual-story-studio/src/write/prompts.ts:31-34` (`WritePromptInput.lint_override?`) and lines 67-69 (sidecar write conditional).
   - `tools/manual-story-studio/src/server/routes/prompts.ts:8` (header comment), lines 58-63 (`SaveBody.lint_override?` field), line 324 (lint-blocking guard `if (result.lint.blockingForCopy && !body.lint_override)`), lines 330-334 (branched `writePrompt` call).
   - `tools/manual-story-studio/src/prompt/types.ts:64-67` (`PromptRunSidecar.lint_override?`).
   - Three test files: `test/write/prompts.test.ts:138`, `test/server/prompts-routes.test.ts:207`, `test/capstone-spec102.test.ts:329`. The same grep finds frontend consumers (`web/src/pages/PromptPreview.tsx`, `web/src/api/prompts.ts`, `web/src/types/manual-story.ts`) — covered by `archive/tickets/SPEC106MANSTOSTU-004.md`.
2. Spec: `specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` §2.4 + §4 *Files to touch* (`src/write/prompts.ts`, `src/server/routes/prompts.ts:8/59-62/324/331-332`, `src/prompt/types.ts` legacy mark) + §2 Out-of-Scope retirement clause for AC #9.
3. Cross-skill boundary: the prompt-write contract between `composePrompt` → `lintPrompt` → `writePrompt` and the HTTP route layer's lint-blocking guard. `lint_override` was the override-acceptance channel that decoupled "save despite soft findings" from the hard-block. With hard tier promotion the channel is dead; removal is in lockstep with the guard simplification.
4. FOUNDATIONS: Rule 6 (No Silent Retcons). The archived SPEC-102 capstone AC #9 ("savePrompt with lint_override persists the override into the sidecar") asserted the override path's correctness; SPEC-106 retires it by inverting the assertion. The retirement is attributed inline at the rewritten test with a one-line comment naming SPEC-106 as the retcon source per Rule 6, preserving the SPEC-102 capstone surface as a Rule-6 traceability anchor rather than silently disappearing the test.
5. Schema extension: `PromptRunSidecar.lint_override?` (type at `src/prompt/types.ts:60-68`) transitions from read-and-write to read-tolerant + write-omitted. Consumers of the schema: only the listing/get routes which deserialize the YAML into `PromptRunSidecar` but never inspect `lint_override` for behavior (`grep -n "sidecar.lint_override" tools/manual-story-studio/src/` returns zero matches — the field has no behavioral consumer). Backward compatibility preserved: existing on-disk sidecars that carry the field continue to parse cleanly under the optional-field type.
6. Rename/remove blast radius: `lint_override` write-path removal. Pipeline grep (`grep -rn lint_override .claude/skills/ docs/ specs/`) returns matches only in `specs/SPEC-106-...` (this spec) — no skill or docs reference. Archived SPEC-102 capstone AC #9 ("savePrompt with lint_override persists the override into the sidecar") at `tools/manual-story-studio/test/capstone-spec102.test.ts:329` retires inline as a regression guard per SPEC-106 §Out of Scope (see item 4 above for the Rule-6 attribution discipline).

## Architecture Check

1. The removal is write-side only; read tolerance preserves legacy on-disk sidecars from any prompt the author saved via the override path before SPEC-106. No on-disk migration is needed because nothing in the package reads `lint_override` for behavior — it is purely an audit-trail breadcrumb.
2. Removing the override-acceptance branch from the route's lint-blocking guard (`!body.lint_override` half drops) simplifies the gate to its essential predicate (`if (result.lint.blockingForCopy)`); the simplification lands in lockstep with `SaveBody.lint_override?` field removal so the type system enforces that no code path remains that consults the field. No backwards-compatibility shims or alias paths introduced.

## Verification Layers

1. `lint_override` is gone from the write path → codebase grep: `grep -n "lint_override" tools/manual-story-studio/src/write/prompts.ts` returns zero matches; `grep -n "copied_anyway" tools/manual-story-studio/src/write/prompts.ts` returns zero matches.
2. `lint_override` is gone from the route's accept/branch surface → codebase grep: `grep -n "body.lint_override" tools/manual-story-studio/src/server/routes/prompts.ts` returns zero matches.
3. Type-side legacy mark intact → codebase grep: `grep -B1 "lint_override" tools/manual-story-studio/src/prompt/types.ts` returns the legacy-read-tolerant comment immediately above the optional field.
4. Existing test surface inversions pass → `cd tools/manual-story-studio && npm test` runs the rewritten `test/write/prompts.test.ts:138`, `test/server/prompts-routes.test.ts:207`, and `test/capstone-spec102.test.ts:329` assertions and expects each to confirm the override path is gone.
5. Rule-6 retcon attribution → codebase grep: `grep -n "SPEC-106" tools/manual-story-studio/test/capstone-spec102.test.ts` returns the retirement-attribution comment alongside the rewritten AC #9 assertion.

## Landed Changes

### 1. `tools/manual-story-studio/src/write/prompts.ts` — remove `WritePromptInput.lint_override?` and sidecar write

Dropped the optional `lint_override` field from `WritePromptInput`. Dropped the conditional sidecar write. Updated the module header comment to reflect that the sidecar no longer carries the old override field, without leaving a `lint_override` grep hit in the write module.

### 2. `tools/manual-story-studio/src/server/routes/prompts.ts` — simplify guard + drop `SaveBody.lint_override?`

- Updated the route header comment to remove the override write-path promise.
- Dropped the `SaveBody` interface's `lint_override?` field declaration. `SaveBody` remains as `interface SaveBody extends ComposeBody {}` to preserve the call-site type assertion without churn.
- Simplified `if (result.lint.blockingForCopy && !body.lint_override)` to `if (result.lint.blockingForCopy)`.
- Simplified the branched `writePrompt` call to a single shape: `const saved = writePrompt({ root, composeResult: result });`. The conditional is gone with the field.

### 3. `tools/manual-story-studio/src/prompt/types.ts` — mark `PromptRunSidecar.lint_override?` legacy

Added a one-line comment above the `lint_override?` field naming SPEC-106 as the deprecation source. The field itself stays optional and is parsed silently on read.

### 4. `tools/manual-story-studio/test/write/prompts.test.ts` — invert the line-138 round-trip test

Deleted the old "lint_override field round-trips when provided" test once `WritePromptInput.lint_override` was removed from the type. The sibling sidecar-field test is now named as the regression guard and carries a SPEC-106 comment before asserting `onDisk.lint_override` is `undefined`.

### 5. `tools/manual-story-studio/test/server/prompts-routes.test.ts` — invert the line-207 route test

Rewrote "POST /prompts with `lint_override` persists the override into the sidecar" as "POST /prompts ignores lint_override and still blocks hard findings." A POST carrying a `lint_override` body field now returns `409 lint_blocks_save` when the composed result has hard findings, and no sidecar is written.

### 6. `tools/manual-story-studio/test/capstone-spec102.test.ts` — rewrite AC #9 line 329 as regression guard

Rewrote the AC #9 body as a regression guard: invoke `composePrompt` + `writePrompt`, then assert the on-disk sidecar has no `lint_override` field. Added a one-line retcon comment naming SPEC-106 as the retirement source per Rule 6.

## Files to Touch

- `tools/manual-story-studio/src/write/prompts.ts` (modify)
- `tools/manual-story-studio/src/server/routes/prompts.ts` (modify)
- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/test/write/prompts.test.ts` (modify)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec102.test.ts` (modify)

## Out of Scope

- Frontend `lint_override` removal (`PromptPreview.tsx`, `web/src/api/prompts.ts`, `web/src/types/manual-story.ts`) — covered by `archive/tickets/SPEC106MANSTOSTU-004.md`.
- On-disk migration of existing legacy sidecars that carry `lint_override` — explicitly out of scope per SPEC-106 §3 *No deprecation period for `lint_override`* (read-tolerant type handles them).
- Tier flips for the four leakage rules — covered by `archive/tickets/SPEC106MANSTOSTU-001.md`.
- The `recent_segment_required_but_unavailable` rule — covered by `archive/tickets/SPEC106MANSTOSTU-002.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "lint_override" tools/manual-story-studio/src/write/prompts.ts` returns zero matches.
2. `grep -n "copied_anyway" tools/manual-story-studio/src/write/prompts.ts` returns zero matches.
3. `grep -n "body.lint_override" tools/manual-story-studio/src/server/routes/prompts.ts` returns zero matches.
4. `grep -rn "lint_override" tools/manual-story-studio/src/` returns matches only on the optional legacy field declaration in `src/prompt/types.ts`; `grep -B1 "lint_override" tools/manual-story-studio/src/prompt/types.ts` returns the legacy-tolerant comment immediately above it.
5. The rewritten AC #9 test in `test/capstone-spec102.test.ts` asserts the on-disk sidecar omits `lint_override` after a write that previously carried it.
6. `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. New sidecar writes never include the `lint_override` field.
2. `PromptRunSidecar.lint_override?` remains an optional field on the type so legacy on-disk sidecars parse without error.
3. The route's lint-blocking guard predicate is exactly `if (result.lint.blockingForCopy)` — no override-acceptance branch.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/prompts.test.ts` (modify) — deleted the old round-trip test and retained the sibling omission assertion as the regression guard; no test asserts `lint_override` round-trips on write.
2. `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify) — invert the line-207 route-persistence test into a hard-block regression guard.
3. `tools/manual-story-studio/test/capstone-spec102.test.ts` (modify) — rewrite AC #9 line 329 as a regression guard; add Rule-6 retcon comment naming SPEC-106.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend`
2. `cd tools/manual-story-studio && node --test dist/test/write/prompts.test.js dist/test/server/prompts-routes.test.js dist/test/capstone-spec102.test.js`
3. `grep -n "lint_override" tools/manual-story-studio/src/write/prompts.ts || true`
4. `grep -n "copied_anyway" tools/manual-story-studio/src/write/prompts.ts || true`
5. `grep -n "body.lint_override" tools/manual-story-studio/src/server/routes/prompts.ts || true`
6. `grep -rn "lint_override" tools/manual-story-studio/src/ || true`
7. `grep -n "SPEC-106" tools/manual-story-studio/test/capstone-spec102.test.ts`
8. `cd tools/manual-story-studio && npm test`
9. The package's `npm test` is the correct verification boundary — backend build + node --test + web tsc cover the entire change surface; the web step stayed green because this ticket touches no frontend code (frontend removal is `archive/tickets/SPEC106MANSTOSTU-004.md`).

## Outcome

Completed: 2026-06-01.

Changed the Manual Studio backend prompt write path so `WritePromptInput` no longer accepts `lint_override` and `writePrompt` never adds that field to new sidecars. Simplified the save route so hard lint findings always return `409 lint_blocks_save` without consulting request-body override data. Kept `PromptRunSidecar.lint_override?` as a read-tolerant optional legacy field and marked it deprecated for SPEC-106.

Updated the three owned test surfaces: the write-layer sidecar test now asserts the legacy field is omitted, the prompts route test proves request-body `lint_override` does not bypass hard lint blocking and writes no sidecar, and the SPEC-102 capstone AC #9 is retained as a SPEC-106 Rule-6 retirement guard.

## Verification Result

Passed:

1. `cd tools/manual-story-studio && npm run build:backend`
2. `cd tools/manual-story-studio && node --test dist/test/write/prompts.test.js dist/test/server/prompts-routes.test.js dist/test/capstone-spec102.test.js` — 25 tests passed.
3. `grep -n "lint_override" tools/manual-story-studio/src/write/prompts.ts || true` — expected no matches.
4. `grep -n "copied_anyway" tools/manual-story-studio/src/write/prompts.ts || true` — expected no matches.
5. `grep -n "body.lint_override" tools/manual-story-studio/src/server/routes/prompts.ts || true` — expected no matches.
6. `grep -rn "lint_override" tools/manual-story-studio/src/ || true` — only `tools/manual-story-studio/src/prompt/types.ts:65` remained.
7. `grep -n "SPEC-106" tools/manual-story-studio/test/capstone-spec102.test.ts` — returned the AC #9 retirement header/test/comment hits.
8. `cd tools/manual-story-studio && npm test` — backend build, 386 backend tests, and web `tsc --noEmit` passed.

## Deviations

The route regression test uses the stricter allowed shape from this ticket: a request carrying `lint_override` still receives `409 lint_blocks_save` when hard findings are present, and no prompt sidecar is written. The drafted alternative of silently accepting a clean/soft save while dropping the body field was not used because the landed route guard is intentionally `if (result.lint.blockingForCopy)`.
