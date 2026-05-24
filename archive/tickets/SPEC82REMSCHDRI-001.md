# SPEC82REMSCHDRI-001: STQ active-pressure helper repair + test-fixture parallel update

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/page-plan-active-pressure.ts` (shared helper consumed by `active_pressure_handling_discipline` and `page_plan_turn_driver_consistency` validators); `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (existing test fixture).
**Deps**: None

## Problem

At intake, `tools/validators/src/structural/page-plan-active-pressure.ts:102` read `parsed.payoff_due` to determine whether an STQ record should escalate to active high-urgency pressure:

```ts
if (recordClass === "STQ") {
  return stringValue(parsed.status) === "complicated" && stringValue(parsed.payoff_due) === "true";
}
```

At intake, `tools/validators/src/schemas/story-question.schema.json` did not declare a `payoff_due` field — STQ fields were `id, story_id, created_at_page, supersedes, setup_kind, question_or_setup, salience, audience_visibility, source_event, source_records, payoff_of, status, answer_event, answer_records, abandonment_rationale`, with `additionalProperties: false`. The branch's `stringValue(parsed.payoff_due) === "true"` test could never return true on a schema-valid STQ. STQ records therefore could never escalate to "active high-urgency pressure" in either consuming validator through the parsed-record predicate. This was dead code that silently disabled STQ as an escalatable active-pressure class — page plans did not have to dispose of "complicated" STQ records per the active-pressure handling discipline.

The dead-branch fix has two parallel sites that must land in the same commit. Site (i) is the helper itself. Site (ii) is the existing test fixture at `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts:157-160`, which constructs an STQ-1 record with `status: "complicated"` and `payoff_due: "true"` to exercise the dead branch — line 10's `HIGH_IDS` array expects STQ-1 in the active-high-urgency set; line 20 maps STQ-1 to a non-resolution disposition rationale. Without the parallel test-fixture update, the helper repair would break the test (STQ-1 drops out of the active set; the test's `HIGH_IDS` expectation fails).

## Assumption Reassessment (2026-05-24)

1. At intake, `tools/validators/src/structural/page-plan-active-pressure.ts:102` read `parsed.payoff_due` — verified at grep time during SPEC-82 reassessment; the historical line text was `return stringValue(parsed.status) === "complicated" && stringValue(parsed.payoff_due) === "true";`. `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` set `payoff_due: "true"` on STQ-1; `HIGH_IDS` included STQ-1; the disposition map included STQ-1. Both sites were the only `payoff_due` references in `tools/validators/src/` and `tools/validators/tests/` before implementation.
2. SPEC-82 §3.1 §Repair Sites (i) + (ii) prescribe the parallel update; §3.1 §Acceptance enumerates the post-repair invariants; §6 §Validation Test 1 broadens grep scope to both `tools/validators/src/` AND `tools/validators/tests/` so verification catches both sites; §7 Implementation Notes explicitly states the two sites MUST land in the same commit.
3. Cross-skill / cross-artifact boundary under audit: the validator-framework boundary at `tools/validators/src/structural/`. The page-plan-active-pressure helper is imported by `active-pressure-handling-discipline.ts:15` and `page-plan-turn-driver-consistency.ts:14`; both consuming validators are registered in `tools/validators/src/public/registry.ts`. The shared contract: the helper's record-class-specific "is this active high-urgency pressure?" predicate must reference only fields declared in the corresponding record-class JSON schema (no phantom-field reads).
4. FOUNDATIONS principle under audit: §Story Bundles §5c (Present Causal State, Not Narrative Shape). STQ records carry story-questions whose `salience` and `status` reflect present causal state. An STQ in `complicated` state with `salience: "high"` is a present-causal-state pressure that page plans must dispose of, parallel to THR's `urgency === "high"` (lines 95-97 of the same helper) and OBL/CNSQ's `urgency === "high"` (lines 104-110). Restoring STQ as escalatable active-pressure restores §5c-aligned semantics; the prior dead-branch state silently exempted STQ from the active-pressure handling discipline.
5. HARD-GATE / Canon Safety surface under audit: `page-plan-active-pressure.ts` is a structural-validator helper under `tools/validators/src/structural/`. Its return value drives `active_pressure_handling_discipline` and `page_plan_turn_driver_consistency`, both of which gate page-plan commits at the validator-framework pre-apply layer. The change does not weaken the Mystery Reserve firewall — STQ records are story-questions, not Mystery Reserve `M-<integer>` entries; the helper's predicate change is orthogonal to MR enforcement. The change does not weaken canon-write ordering — the predicate fires at validator time, not at patch-engine commit time.
6. Implementation-time focused proof exposed same-seam test fixture drift: the STQ fixture path used `stories/test-story/_source/questions/STQ-1.yaml`, while `isStructuralAuthorityRecord` accepts story-question records only at `stories/<story>/_source/story-questions/STQ-<n>.yaml`. The test fixture path was corrected so the positive and negative STQ cases exercise the parsed record rather than the missing-record fallback.

## Architecture Check

1. The fix substitutes one schema-declared field (`salience`) for one undeclared field (`payoff_due`); the predicate's structure (`status === "complicated" && <severity> === "high"`) is preserved, only the severity-field name changes. The substitution preserves the helper's parallel structure with THR (`urgency === "high"`) and OBL/CNSQ (`urgency === "high"`) — STQ's `salience` enum (`low | medium | high`, per `story-question.schema.json` line 28) is the natural analog of the other classes' `urgency` enum.
2. No backwards-compatibility shims or alias paths introduced. The dead `payoff_due` reference is removed outright; no fallback path to the old field is retained. The schema's `additionalProperties: false` would reject an STQ that carried `payoff_due`, so no production STQ data depends on the old field.

## Verification Layers

1. **Invariant: helper references only schema-declared STQ fields.** → codebase grep-proof: `grep -n "parsed\.[a-z_]*" tools/validators/src/structural/page-plan-active-pressure.ts` line 102 returns `parsed.status` and `parsed.salience` only; `grep -rn "payoff_due" tools/validators/` returns zero matches after the repair.
2. **Invariant: existing test fixture preserves its `HIGH_IDS` expectation.** → test execution: `(cd tools/validators && npm test)` passes with the updated fixture (STQ-1 in `HIGH_IDS` after substitution).
3. **Invariant: STQ-as-escalatable-active-pressure semantic parallels other debt classes.** → FOUNDATIONS alignment check: §Story Bundles §5c — STQ joins THR / OBL / CNSQ as a present-causal-state pressure the page plan must dispose of.
4. **Invariant: new negative-case test asserts `salience: "medium"` does NOT register.** → test execution: new test case in `active-pressure-handling-discipline.test.ts` asserts an STQ with `status: "complicated"` and `salience: "medium"` fails the active-high-urgency predicate.

## Landed Changes

### 1. Replaced dead-branch in `page-plan-active-pressure.ts`

Replaced the historical predicate:

```ts
if (recordClass === "STQ") {
  return stringValue(parsed.status) === "complicated" && stringValue(parsed.payoff_due) === "true";
}
```

with:

```ts
if (recordClass === "STQ") {
  return stringValue(parsed.status) === "complicated" && stringValue(parsed.salience) === "high";
}
```

### 2. Updated existing test fixture in `active-pressure-handling-discipline.test.ts`

Replaced the historical STQ fixture:

```ts
storyRecord("story_question_record", "STQ-1", "questions", {
  status: "complicated",
  payoff_due: "true"
}),
```

with:

```ts
storyRecord("story_question_record", "STQ-1", "questions", {
  status: "complicated",
  salience: "high"
}),
```

with the live authority subdirectory:

```ts
storyRecord("story_question_record", "STQ-1", "story-questions", {
  status: "complicated",
  salience: "high"
}),
```

`HIGH_IDS` and the disposition map remain unchanged — the substitution preserves the test's intent that STQ-1 registers as active high-urgency pressure. The fixture path was corrected from `_source/questions/STQ-1.yaml` to `_source/story-questions/STQ-1.yaml` so the parsed STQ record is visible to the structural validator.

### 3. Added negative-case test in `active-pressure-handling-discipline.test.ts`

Added a test case asserting an STQ with `status: "complicated"` and `salience: "medium"` does NOT register as active high-urgency pressure.

## Files to Touch

- `tools/validators/src/structural/page-plan-active-pressure.ts` (modify) — line 102 dead-branch substitution
- `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (modify) — fixture substitution, authority-path correction, and new negative-case test

## Out of Scope

- Adding `payoff_due` to `story-question.schema.json` as a real field. SPEC-82 §4 explicitly out-of-scopes this; the active-pressure semantic is adequately expressed by `status: "complicated" + salience: "high"`.
- Repairs to other dead-branch field references in `page-plan-active-pressure.ts`. None were surfaced by iteration-2 verification beyond the STQ branch; the helper's other class branches (CLK, THR, STSEC, OBL, CNSQ) all reference schema-declared fields and need no change.
- Changes to other validators that read STQ fields. The repair is bounded to the page-plan-active-pressure helper; the helper's consumers (`active_pressure_handling_discipline`, `page_plan_turn_driver_consistency`) inherit the corrected predicate without needing their own changes.

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/validators && npm test)` — full validator-package test suite passes; the updated `active-pressure-handling-discipline.test.ts` fixture preserves its `HIGH_IDS` expectation that STQ-1 registers as active high-urgency pressure.
2. New negative-case test asserting an STQ with `status: "complicated"` and `salience: "medium"` does NOT register as active high-urgency pressure passes.
3. `grep -rn "payoff_due" tools/validators/` returns zero matches.

### Invariants

1. `page-plan-active-pressure.ts:102` references only fields declared in `tools/validators/src/schemas/story-question.schema.json` (post-repair: `parsed.status` and `parsed.salience` only).
2. STQ records in `complicated` state with `salience: "high"` register as active high-urgency pressure; STQ records with `salience: "medium"` or `salience: "low"` do not. The semantic parallels THR (`urgency === "high"`) and OBL/CNSQ (`urgency === "high"`).
3. The existing test fixture's `HIGH_IDS` array (line 10) and disposition map (line 20) continue to list STQ-1 with the same disposition rationale after the fixture substitution.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (modify) — fixture substitution and authority-path correction preserve the positive-case test's `HIGH_IDS` expectation; new adjacent negative-case test asserts `salience: "medium"` is not escalated.

### Commands

1. `(cd tools/validators && npm test)` — runs the validator package's full test suite via `npm run build && node --test dist/tests/**/*.test.js`; covers both the existing positive-case test (now reading `salience: "high"`) and the new negative-case test.
2. `grep -rn "payoff_due" tools/validators/` — confirms zero matches after the repair; broadened scope vs. SPEC-82's prior `tools/validators/src/`-only scope catches both the helper site and the test-fixture site.

## Outcome

Completed: 2026-05-24

The STQ active-pressure helper now treats `status: "complicated" + salience: "high"` as high-urgency active pressure. The active-pressure handling test fixture now uses `salience: "high"` instead of the removed `payoff_due` field, uses the live `_source/story-questions/` authority path, and includes a negative case proving `salience: "medium"` is not escalated.

## Verification Result

1. `(cd tools/validators && node --test dist/tests/structural/active-pressure-handling-discipline.test.js)` — PASS after rebuild; 8/8 subtests passed, including the existing positive STQ fixture and the new medium-salience negative case.
2. `(cd tools/validators && npm test)` — PASS; package rebuilt and 1012/1012 tests passed.
3. `grep -rn "payoff_due" tools/validators` — PASS by expected no-match exit; no `payoff_due` references remain in validator source, tests, or generated `dist`.

## Deviations

- The implementation also corrected the active-pressure test fixture's STQ path from `_source/questions/STQ-1.yaml` to `_source/story-questions/STQ-1.yaml`. Focused proof showed the old path was outside the structural authority filter, so the positive fixture was not actually exercising the parsed STQ branch.
