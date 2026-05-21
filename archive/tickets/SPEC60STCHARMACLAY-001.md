# SPEC60STCHARMACLAY-001: World-index extracts record refs from structured predicate args

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` atomic parser (`storyRefsInRecordArrayField` predicate-arg extraction); emits additional `storylet_predicate_ref` / plan-predicate edges. No new edge type; no impact on existing string-form edges.
**Deps**: None

## Problem

At intake, `storyRefsInRecordArrayField` (`tools/world-index/src/parse/atomic.ts`) extracted record IDs only from the stringified `pred` field. In the canonical structured predicate DSL form, `pred` is just the predicate *name* (e.g., `"record_active"`) and the record ID lives in a separate argument field (`{ pred: "record_active", record: "STCHAR-1" }`). As a result, **structured** predicates emitted no `storylet_predicate_ref` / plan-predicate edge — any record ref carried in a structured predicate arg (SF, STSEC, STCHAR, OBL, etc.) was dropped from the world-index edge graph. This was a general (class-agnostic) extraction gap; STCHAR was one beneficiary.

## Assumption Reassessment (2026-05-21)

1. At intake, `storyRefsInRecordArrayField` was at `tools/world-index/src/parse/atomic.ts:1422`, and the loop read only `storyRefsInString(stringField(item, "pred"))`. It is invoked for SLT preconditions (lines 794/798, `["preconditions"]` hard/soft) and STPLAN predicates (lines 1037 `["current_step","success_condition"]`, 1045 `trigger_predicates`), so one fix to the helper covers both edge sources. The landed helper still reuses `storyRefsInString` and `pushStoryEdgeIfReference` remains unchanged at the call sites.
2. The authoritative predicate-arg grammar is `PREDICATE_ARG_SCHEMAS` in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:148-191`. The record-ref-bearing arg fields vary by predicate — `record` (`record_active`/`record_age`), `holder` (`plan_*`/`emotion_*`), `belief_id` (`belief_record`), and `obligation`/`consequence`/`thread`/`clock`/`secret`/`question`/`intention`/`object`/`artifact`/`entity`/`from`/`to` for the remaining predicates. Combinators: `not` wraps a singular `predicate`, `all`/`any` wrap a plural `predicates` list (verified lines 188-190). The spec's earlier hand-list (`record`, `holder`, `target`) was wrong — no predicate declares a `target` field (that was the extraction loop variable) — and incomplete; reassess-spec corrected §2.1 to a field-name-agnostic value scan.
3. **Cross-package boundary under audit**: `tools/world-index` is a standalone parser and may not import sibling tool packages. `PREDICATE_ARG_SCHEMAS` lives in `tools/validators` — it is the *reference* grammar, not an import target. The fix must NOT add a `tools/validators` import to `world-index`; instead scan arg values field-name-agnostically (regex match via the existing `storyRefsInString` record-ID pattern) so no cross-package dependency is introduced. The grammar is cited for test-fixture coverage, not linked.
4. **§Machine-Facing Layer (FOUNDATIONS)**: the World Index's typed edges are part of the "LLM agents should never operate on prose alone" retrieval surface — a record ref that produces no edge is invisible to `get_neighbors` / `find_impacted_fragments` / context-packet edge projection. Completing structured-arg extraction restores the typed-edge completeness this principle requires. The fix is additive (new edges only); no existing edge semantics change.

## Architecture Check

1. A field-name-agnostic value scan (scan every string-valued arg of each predicate object for record-ID patterns, recurse into `predicate` + `predicates`) is cleaner and more robust than a hand-listed field set: it cannot drift as the predicate DSL gains predicates, it mirrors `storyRefsInString`'s existing regex-on-string behavior, and it avoids a cross-package import of `PREDICATE_ARG_SCHEMAS`.
2. No backwards-compatibility shim: the string-form path (`storyRefsInString(stringField(item, "pred"))`) is retained unchanged for any legacy string-encoded predicate; the structured scan is layered alongside it, not as an alias.

## Verification Layers

1. Structured `{ pred: "record_active", record: "STCHAR-1" }` emits a `storylet_predicate_ref` edge → codebase grep-proof + new parser unit test asserting the edge.
2. Combinator-nested ref (`not[record_active(STCHAR-1)]`, `any[…]`) extracted via recursion into both `predicate` and `predicates` → parser unit test.
3. A non-`record` arg field carrying a record ID (`{ pred: "obligation_open", obligation: "OBL-1" }`) emits an edge → parser unit test.
4. STPLAN success/fallback structured predicate refs index → parser unit test on STPLAN extraction.
5. Existing string-form edges unchanged (no regression) → existing `atomic-edges-for-choice-and-storylet` / `atomic-story-edge-parity` tests still pass.

## Landed Changes

### 1. Generalize `storyRefsInRecordArrayField` predicate-arg extraction

In `tools/world-index/src/parse/atomic.ts`, `storyRefsInRecordArrayField` now delegates each predicate object to `collectStoryRefsFromPredicateRecord`, which:
- scans every string-valued field of the predicate object for record-ID patterns using the existing `storyRefsInString` matcher (field-name-agnostic — no enumerated arg-field list);
- recurses into nested combinator wrappers: the singular `predicate` object (for `not`) and each element of the plural `predicates` array (for `all`/`any`).

### 2. Confirm both call sites benefit

No call-site change was required — SLT `preconditions.hard|soft` and STPLAN `success_condition` / `trigger_predicates` already route through `storyRefsInRecordArrayField`; generalizing the helper covers both.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify) — add structured / combinator / non-`record` SLT-precondition cases
- `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (modify) — add STPLAN structured-predicate case

## Out of Scope

- No new edge type; `storylet_predicate_ref` and the existing plan-predicate edges are reused.
- No `tools/validators` import into `world-index` (package-boundary preserved).
- No change to the string-form extraction path.

## Acceptance Criteria

### Tests That Must Pass

1. New unit cases: `{ pred: "record_active", record: "STCHAR-1" }` and string `record_active(STCHAR-1)` both emit `storylet_predicate_ref`; `not[record_active(STCHAR-1)]` and `any[…]` extract via recursion; `{ pred: "obligation_open", obligation: "OBL-1" }` emits an edge; STPLAN structured success/fallback predicate refs index.
2. Existing `atomic-edges-for-choice-and-storylet.test.ts` and `atomic-story-edge-parity.test.ts` pass unchanged (no regression).
3. `cd tools/world-index && npm run build && npm test`.

### Invariants

1. Every record ID appearing in any predicate-object argument (string or structured, top-level or combinator-nested) of an SLT precondition or STPLAN predicate produces exactly one resolved-reference edge.
2. `tools/world-index` imports no sibling tool package.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` — structured-arg, combinator-nested, and non-`record`-field SLT-precondition extraction cases.
2. `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` — STPLAN structured success/fallback predicate-ref extraction case.

### Commands

1. `cd tools/world-index && npm run build && npm test`
2. `grep -n "storyRefsInRecordArrayField" tools/world-index/src/parse/atomic.ts` — confirm the generalized helper is the single extraction point both call sites use.

## Outcome

Completed on 2026-05-21.

- `tools/world-index/src/parse/atomic.ts` now extracts record refs from every string-valued structured predicate argument and recurses through both `predicate` and `predicates` combinator wrappers.
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` now covers structured `record_active`, `any`, `not`, and non-`record` arg-field extraction on SLT preconditions while preserving the existing string-form edge expectations.
- `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` now covers structured success and fallback predicate refs for STPLAN, including nested combinator extraction and non-`record` arg fields.
- No sibling `tools/validators` import was introduced; the implementation remains field-name-agnostic inside `tools/world-index`.

## Verification Result

- `cd tools/world-index && npm run build` — PASS. TypeScript compiled the changed parser and tests.
- `cd tools/world-index && npm test` — PASS. `127` node:test tests passed, including the updated SLT and STPLAN parser edge tests.
- Manual source review — PASS. `storyRefsInRecordArrayField` remains the shared helper used by the SLT precondition and STPLAN success/fallback call sites.

## Deviations

- The drafted command used `npm run build --prefix tools/world-index && npm test --prefix tools/world-index`; verification was run from the package root as `npm run build` and `npm test`, which is the same package-local build/test lane without root-cwd ambiguity.
