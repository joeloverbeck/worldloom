# SPEC106MANSTOSTU-003: Remove lint_override write-path (backend) + retire SPEC-102 capstone AC #9

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` write module (`src/write/prompts.ts`), HTTP route (`src/server/routes/prompts.ts`), prompt-types module (`src/prompt/types.ts`), and three test surfaces (`test/write/prompts.test.ts`, `test/server/prompts-routes.test.ts`, `test/capstone-spec102.test.ts`).
**Deps**: None

## Problem

`lint_override` is the SPEC-102 audit-trail breadcrumb that records "the author clicked through a soft-tier warning and copied/saved anyway." Once `archive/tickets/SPEC106MANSTOSTU-001.md` promotes the four leakage rules to hard tier, the override is reachable only for the qualitatively-different quality warnings the spec defers to SPEC-111 — and the four currently-soft rules become unreachable through it. Per SPEC-106 §2.4 and §3 *No deprecation period for `lint_override`*, the write-side construction must be removed: new sidecars never carry the field. Read-side stays tolerant (legacy on-disk sidecars that carry the field continue to parse). Three backend file edits land together to keep the type, route, and write layer self-consistent; three test-surface edits invert existing override-persistence assertions into regression guards; the archived SPEC-102 capstone's AC #9 (`test/capstone-spec102.test.ts:329`) is rewritten as a regression guard naming SPEC-106 as the retcon source per Rule 6 attribution.

## Assumption Reassessment (2026-06-01)

1. Codebase: backend `lint_override` consumers enumerated via `grep -rn 'lint_override\|copied_anyway' tools/manual-story-studio/`:
   - `tools/manual-story-studio/src/write/prompts.ts:31-34` (`WritePromptInput.lint_override?`) and lines 67-69 (sidecar write conditional).
   - `tools/manual-story-studio/src/server/routes/prompts.ts:8` (header comment), lines 58-63 (`SaveBody.lint_override?` field), line 324 (lint-blocking guard `if (result.lint.blockingForCopy && !body.lint_override)`), lines 330-334 (branched `writePrompt` call).
   - `tools/manual-story-studio/src/prompt/types.ts:64-67` (`PromptRunSidecar.lint_override?`).
   - Three test files: `test/write/prompts.test.ts:138`, `test/server/prompts-routes.test.ts:207`, `test/capstone-spec102.test.ts:329`. The same grep finds frontend consumers (`web/src/pages/PromptPreview.tsx`, `web/src/api/prompts.ts`, `web/src/types/manual-story.ts`) — covered by `SPEC106MANSTOSTU-004`.
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

## What to Change

### 1. `tools/manual-story-studio/src/write/prompts.ts` — remove `WritePromptInput.lint_override?` and sidecar write

Drop the optional `lint_override` field from `WritePromptInput` (currently lines 31-34). Drop the conditional sidecar write at lines 67-69 (`if (input.lint_override) { sidecar.lint_override = input.lint_override; }`). Update the module's header comment at line 6 to reflect that the sidecar no longer carries `lint_override` (replace "and an optional lint_override" with a SPEC-106 deprecation note).

### 2. `tools/manual-story-studio/src/server/routes/prompts.ts` — simplify guard + drop `SaveBody.lint_override?`

- Line 8: update the header comment that mentions "lint_override for soft-finding saves" to reflect SPEC-106 removal (write-only path retirement).
- Lines 58-63: drop the `SaveBody` interface's `lint_override?` field declaration. `SaveBody` becomes `interface SaveBody extends ComposeBody {}` — if the interface body becomes empty, retain the named interface to preserve the call-site type assertion (`request.body ?? {}) as SaveBody`) without churn.
- Line 324: simplify `if (result.lint.blockingForCopy && !body.lint_override)` → `if (result.lint.blockingForCopy)`.
- Lines 330-334: simplify the branched `writePrompt` call to a single shape: `const saved = writePrompt({ root, composeResult: result });`. The conditional is gone with the field.

### 3. `tools/manual-story-studio/src/prompt/types.ts` — mark `PromptRunSidecar.lint_override?` legacy

Add a one-line comment above the `lint_override?` field at lines 64-67 naming SPEC-106 as the deprecation source, e.g. `/** @deprecated SPEC-106: write-omitted; read-tolerant for legacy sidecars only. */`. The field itself stays optional and is parsed silently on read.

### 4. `tools/manual-story-studio/test/write/prompts.test.ts` — invert the line-138 round-trip test

Replace the existing "lint_override field round-trips when provided" test at line 138 with a regression guard. Two acceptable shapes:
- **Preferred**: delete the test entirely once `WritePromptInput.lint_override` is removed from the type — the test no longer compiles. The `assert.equal(onDisk.lint_override, undefined)` half of the *previous* sibling test (per the dist build, "sidecar carries all 8 mandatory fields, omits lint_override when not supplied") already covers the regression guard.
- **Alternative**: rewrite the body to attempt to pass `lint_override` through some other channel (e.g., a YAML-injection test) and assert the on-disk sidecar does NOT carry the field. The preferred shape is simpler.

The choice between delete-vs-rewrite is implementer judgment; the contract is "no test asserts `lint_override` round-trips on write." Add a one-line retcon comment naming SPEC-106 at the retirement site.

### 5. `tools/manual-story-studio/test/server/prompts-routes.test.ts` — invert the line-207 route test

Rewrite "POST /prompts with `lint_override` persists the override into the sidecar" at line 207. The new assertion: a POST `/prompts` request carrying a `lint_override` body field either returns 201 with a sidecar that omits the field on disk (silent drop, the simpler shape — `SaveBody` no longer typed for the field, so it's parsed into `request.body` as unknown JSON and ignored), OR rejects with a typed error if the implementer prefers strict-input validation at the route. Either shape satisfies SPEC-106 §2.4. The preferred shape is silent-drop (matches the on-disk schema's read-tolerance discipline). Add a one-line retcon comment naming SPEC-106.

### 6. `tools/manual-story-studio/test/capstone-spec102.test.ts` — rewrite AC #9 line 329 as regression guard

Rewrite the test body at line 329 ("AC #9 — savePrompt with lint_override persists the override into the sidecar") as a regression guard: invoke `composePrompt` + `writePrompt` with a fixture that previously triggered `lint_override` carriage, and assert the on-disk sidecar has no `lint_override` field. Add a one-line retcon comment at the test naming SPEC-106 as the retirement source per Rule 6 (the test name itself may keep the "AC #9 —" prefix as a SPEC-102 traceability anchor, with the body's assertion inverted).

## Files to Touch

- `tools/manual-story-studio/src/write/prompts.ts` (modify)
- `tools/manual-story-studio/src/server/routes/prompts.ts` (modify)
- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/test/write/prompts.test.ts` (modify)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec102.test.ts` (modify)

## Out of Scope

- Frontend `lint_override` removal (`PromptPreview.tsx`, `web/src/api/prompts.ts`, `web/src/types/manual-story.ts`) — covered by `SPEC106MANSTOSTU-004`.
- On-disk migration of existing legacy sidecars that carry `lint_override` — explicitly out of scope per SPEC-106 §3 *No deprecation period for `lint_override`* (read-tolerant type handles them).
- Tier flips for the four leakage rules — covered by `archive/tickets/SPEC106MANSTOSTU-001.md`.
- The `recent_segment_required_but_unavailable` rule — covered by `archive/tickets/SPEC106MANSTOSTU-002.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "lint_override" tools/manual-story-studio/src/write/prompts.ts` returns zero matches.
2. `grep -n "copied_anyway" tools/manual-story-studio/src/write/prompts.ts` returns zero matches.
3. `grep -n "body.lint_override" tools/manual-story-studio/src/server/routes/prompts.ts` returns zero matches.
4. `grep -rn "lint_override" tools/manual-story-studio/src/` returns matches only on the legacy-tolerant comment + optional-field declaration in `src/prompt/types.ts`.
5. The rewritten AC #9 test in `test/capstone-spec102.test.ts` asserts the on-disk sidecar omits `lint_override` after a write that previously carried it.
6. `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. New sidecar writes never include the `lint_override` field.
2. `PromptRunSidecar.lint_override?` remains an optional field on the type so legacy on-disk sidecars parse without error.
3. The route's lint-blocking guard predicate is exactly `if (result.lint.blockingForCopy)` — no override-acceptance branch.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/prompts.test.ts` (modify) — retire or invert the line-138 round-trip test per the §4 implementer-judgment choice; the contract is "no test asserts `lint_override` round-trips on write."
2. `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify) — invert the line-207 route-persistence test into a regression guard.
3. `tools/manual-story-studio/test/capstone-spec102.test.ts` (modify) — rewrite AC #9 line 329 as a regression guard; add Rule-6 retcon comment naming SPEC-106.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `grep -rn "lint_override" tools/manual-story-studio/src/` (audit the surviving references; the legacy-tolerant type field is the only expected match)
3. The package's `npm test` is the correct verification boundary — backend build + node --test + web tsc cover the entire change surface; the web step stays green because this ticket touches no frontend code (frontend removal is `SPEC106MANSTOSTU-004`).
