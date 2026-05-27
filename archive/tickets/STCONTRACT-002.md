# STCONTRACT-002: Reconcile shared-contract §7a "high-urgency" prose with the validator's per-class high-priority criteria

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §7a (contract prose), `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 0 (§7a authoring instructions), `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (§7a authoring instructions), and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (validator-diagnostic wording). Documentation-only; no code/schema changes.
**Deps**: None.

## Problem

At intake, the shared story-state contract §7a said: "Every high-urgency active record on the parent `PG.state_snapshot` appears in exactly one row." Read literally, this meant only records whose schema has an `urgency` field with value `"high"`. But the `active_pressure_handling_discipline` validator in `tools/validators/src/structural/page-plan-active-pressure.ts` (`isHighUrgency`) uses class-specific criteria that vary the field per class:

- **STPLAN**: `plan_status ∈ {active, blocked, suspended}` + `current_step` has content
- **STEMO**: `intensity ∈ {high, extreme}` + `behavioral_pressure` non-empty
- **CLK**: `status = active` + `value` at or above any threshold
- **THR**: `status = active` + `urgency = high`
- **STSEC**: `status = partially_revealed` OR `reveal_records` non-empty
- **STQ**: `status = complicated` + `salience = high`
- **OBL**: `status ∈ {open, escalated}` + `urgency = high`
- **CNSQ**: `status ∈ {pending, escalated}` + `urgency = high`

The umbrella term in the historical validator diagnostic ("high-urgency active record") did not match the actual per-class criteria. Authors reading §7a literally could exclude STEMO records that the validator considers high-priority — STEMO-3 (grief, intensity high) and STEMO-4 (dread, intensity high) were both flagged as omitted from the §7a table even though `urgency` is not a STEMO field.

This was a documentation/contract gap, not a code bug. The validator's class-specific criteria are defensible, and the contract prose now matches them.

## Assumption Reassessment (2026-05-27)

1. At intake, the shared contract `.claude/skills/_shared-templates/story-state-contract.md` §7a used the phrase "high-urgency active record" without enumerating per-class criteria. The validator `tools/validators/src/structural/page-plan-active-pressure.ts:75-113` (`isHighUrgency`) is the authoritative selector and uses class-specific criteria that match the per-class schema (STEMO has `intensity`, STQ has `salience`, OBL/CNSQ/THR have `urgency`, STPLAN has `plan_status`, CLK has `value` vs. `thresholds`, STSEC has `status` + `reveal_records`).
2. The class-specific criteria are correct and worth preserving — they map each class's actual schema fields to the right "actively pressuring" semantics. A field-uniform "urgency" approach would force schema changes across multiple classes to add a redundant `urgency` field.
3. Cross-skill boundary: the contract §7a is consumed by every PG-authoring skill (`branching-story-bootstrap`, `branching-story-turn-cycle`). The validator is consumed at dry-run by the patch engine. Both must agree on which records belong in the §7a table.
4. Adjacent contradictions: §7a's table-row vocabulary ("Disposition" closed set: `selected | deferred | rejected`) is unchanged and correct. The contract's listing of `STPLAN | STEMO | CLK | STSEC | STQ` etc. as Phase 0 due-driver classes elsewhere in the contract is unchanged. The misleading "high-urgency" wording in the §7a table-coverage rule was the owned repair surface.
5. No FOUNDATIONS-aligned enforcement surface change. This ticket aligned contract prose with existing validator behavior.
6. Live checkout command drift: there is no root `package.json`, `pnpm-workspace.yaml`, or root `pnpm -F @worldloom/validators` workspace command. The validators package owns its own `npm test` script under `tools/validators/`, and the drafted filter form does not narrow the Node test run in this package. The truthful proof is package-local `npm test -- --test-name-pattern active_pressure_handling_discipline`, recorded as a broad validators package run because the script still executed the full compiled suite.
7. Consuming-reference drift: live grep found the criterion restated in `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, while `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` carries only diagnostic wording for `high_urgency_active_record_unhandled`. Both are same-seam documentation surfaces. `branching-story-bootstrap` only says §7a is omitted for `story_start` or follows the shared table shape; it does not duplicate the per-class inclusion criterion.
8. HARD-GATE discipline was read because this prose documents a pre-apply structural validation surface. The change does not alter HARD-GATE approval flow, validator behavior, approval-token behavior, or `validation_trace` semantics.

## Architecture Check

1. Cleaner than alternatives. Option A (add a uniform `urgency` field to every record class) is a much larger schema change with no real benefit — the per-class field choices already encode the right semantics. Option B (this ticket: update the contract prose to match validator behavior) is the smallest change that resolves the gap. Option C (rename the validator and its error code to remove "urgency") is cosmetic and doesn't help authors reading the contract.
2. No backwards-compatibility aliasing/shims introduced. Contract prose change only; no code changes; no schema changes; existing fixtures unaffected.

## Verification Layers

1. Contract prose explicitly enumerates per-class high-priority criteria → manual review (the updated §7a section matches the validator's `isHighUrgency` per-class table).
2. Authors reading §7a literally include every record class the validator considers high-priority → manual review of shared contract + consuming skill references.
3. Existing validator behavior remains unchanged and already accepts one high-priority record from each covered class when all are dispositioned → package-local validators test run.

## Landed Changes

### 1. Shared contract §7a wording (`.claude/skills/_shared-templates/story-state-contract.md`)

Replaced the field-uniform high-urgency wording with the class-specific actively-pressuring contract:

> Every actively-pressuring record on the parent `PG.state_snapshot` appears in exactly one row. The class-specific criteria for "actively-pressuring" are:
>
> | Class | Criterion |
> |---|---|
> | STPLAN | `plan_status` is `active`, `blocked`, or `suspended`, and `current_step` has content |
> | STEMO | `intensity` is `high` or `extreme`, and `behavioral_pressure` is non-empty |
> | CLK | `status = active`, and `value` is at or above any `thresholds[].at` value |
> | THR | `status = active` AND `urgency = high` |
> | STSEC | `status = partially_revealed` OR `reveal_records` non-empty |
> | STQ | `status = complicated` AND `salience = high` |
> | OBL | `status` is `open` or `escalated`, and `urgency = high` |
> | CNSQ | `status` is `pending` or `escalated`, and `urgency = high` |
>
> The `active_pressure_handling_discipline` structural validator enforces this set; the table reproduces its per-class criteria for authoring reference.

### 2. Skill-side authoring instructions

Updated `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` to use the shared-contract vocabulary and cross-reference the §7a criteria table rather than duplicating the table. `branching-story-bootstrap` was inspected and did not restate the per-class inclusion criterion.

### 3. Validator error message wording (not landed)

The validator code and diagnostic code name remain unchanged in this ticket. The code's historical `high_urgency_active_record_unhandled` identifier is treated as an implementation label; operator-facing prose now explains that it means the class-specific actively-pressuring set.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §7a prose + new per-class criteria table)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 0 cross-references the shared criteria)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify — §7a cross-references the shared criteria)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — diagnostic wording clarifies the class-specific actively-pressuring set)
- `archive/tickets/STCONTRACT-002.md` (modify — closeout and proof-command truthing)

## Out of Scope

- Schema changes to add a uniform `urgency` field across classes.
- Changes to the validator's per-class criteria (the criteria are correct; only the contract prose needs alignment).
- Changes to the `Disposition` closed set (`selected | deferred | rejected`) or the `Reason / expiry` cell shape.
- Changes to the Phase 0 due-driver evaluation logic in `branching-story-turn-cycle` — that's a separate selection process; this ticket only touches the §7a table-coverage rule.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local `npm test -- --test-name-pattern active_pressure_handling_discipline` from `tools/validators/` passes. This is recorded as a broad validators package run because the package script still executes the full compiled suite.
2. A new author reading §7a in isolation, without reading the validator source, would correctly include STEMO records of high or extreme intensity (plus `behavioral_pressure` non-empty) in the §7a disposition table. Validated by manual review of the shared contract and consuming references.

### Invariants

1. The contract prose and the validator's `isHighUrgency` selection logic agree on which active records belong in §7a.
2. The per-class criteria table in the contract matches the per-class branches in `isHighUrgency` at `tools/validators/src/structural/page-plan-active-pressure.ts:75-113`. Any future change to one MUST be mirrored in the other.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is manual review of the contract prose alignment with the validator code, plus the existing test coverage of active_pressure_handling_discipline at tools/validators/tests/structural/active-pressure-handling-discipline.test.ts.`

### Commands

1. Manually compare the contract §7a table against the validator's `isHighUrgency` branches — verify each row matches a branch and vice versa.
2. `npm test -- --test-name-pattern active_pressure_handling_discipline` from `tools/validators/` — confirm existing fixtures still pass. This package script rebuilds first and currently runs the full compiled test suite despite the test-name pattern.
3. `if rg -n 'high-urgency active record|high-urgency records|active high-urgency|high-urgency record' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-bootstrap; then exit 1; fi` — confirms current operational prose no longer uses the stale literal high-urgency-active-record wording.

## Outcome

Completed. The shared story-state contract §7a now defines "actively-pressuring" with an explicit class-by-class table that matches `isHighUrgency`: STPLAN, STEMO, CLK, THR, STSEC, STQ, OBL, and CNSQ each use their real schema fields rather than a uniform `urgency` field. The turn-cycle Phase 0 instructions and §7a page-plan reference now cite that shared table, and the Phase 9 validator-diagnostic reference explains that `high_urgency_active_record_unhandled` is a historical code name for the class-specific actively-pressuring set.

No validator code or schema behavior changed.

## Verification Result

1. Manual review — PASS. The §7a criteria table in `.claude/skills/_shared-templates/story-state-contract.md` matches every branch in `tools/validators/src/structural/page-plan-active-pressure.ts` `isHighUrgency`, including STEMO `intensity` + `behavioral_pressure`, STQ `salience`, CLK threshold comparison, and OBL/CNSQ/THR `urgency`.
2. Stale-anchor grep — PASS. `if rg -n 'high-urgency active record|high-urgency records|active high-urgency|high-urgency record' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-bootstrap; then exit 1; fi` returned no matches.
3. Table presence grep — PASS. `rg -n 'Active-pressure disposition appears|Class \| Criterion|STPLAN \||STEMO \||CLK \||THR \||STSEC \||STQ \||OBL \||CNSQ \||structural validator enforces this set' .claude/skills/_shared-templates/story-state-contract.md` showed the new §7a table and validator-reference sentence.
4. Validators package proof — PASS. From `tools/validators/`, `npm test -- --test-name-pattern active_pressure_handling_discipline` rebuilt the package and passed the compiled suite: 1094 pass, 0 fail. The command's test-name pattern did not narrow the package run, so this is recorded as a broad package proof.
5. Diff hygiene — PASS. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md archive/tickets/STCONTRACT-002.md` reported no whitespace errors.

## Deviations

1. The drafted `pnpm -F @worldloom/validators test -- --filter active-pressure-handling-discipline` command was not runnable in this checkout because there is no root `package.json` / `pnpm-workspace.yaml`. It was replaced with the package-local validators command from `tools/validators/`.
2. The package-local `--test-name-pattern` command did not narrow the Node test run; it still executed the full compiled validators suite. This is stronger than the intended focused proof but noisier, so it is recorded as broad package proof.
3. The optional validator diagnostic-message code change was not landed. Operator-facing prose now clarifies that the historical `high_urgency_active_record_unhandled` diagnostic code name maps to the class-specific actively-pressuring set.
