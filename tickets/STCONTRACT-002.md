# STCONTRACT-002: Reconcile shared-contract §7a "high-urgency" prose with the validator's per-class high-priority criteria

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §7a (contract prose), `.claude/skills/branching-story-turn-cycle/SKILL.md` (§7a authoring instructions if they restate the criterion), and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (or equivalent — if it documents which records belong in §7a). Documentation-only; no code/schema changes.
**Deps**: None.

## Problem

The shared story-state contract §7a says: "Every high-urgency active record on the parent `PG.state_snapshot` appears in exactly one row." Read literally, this means only records whose schema has an `urgency` field with value `"high"`. But the `active_pressure_handling_discipline` validator at `tools/validators/src/structural/page-plan-active-pressure.ts:75-113` (`isHighUrgency`) uses class-specific criteria that vary the field per class:

- **STPLAN**: `plan_status ∈ {active, blocked, suspended}` + `current_step` has content
- **STEMO**: `intensity ∈ {high, extreme}` + `behavioral_pressure` non-empty
- **CLK**: `status = active` + `value` at or above any threshold
- **THR**: `status = active` + `urgency = high`
- **STSEC**: `status = partially_revealed` OR `reveal_records` non-empty
- **STQ**: `status = complicated` + `salience = high`
- **OBL**: `status ∈ {open, escalated}` + `urgency = high`
- **CNSQ**: `status ∈ {pending, escalated}` + `urgency = high`

The umbrella term in the validator's error message ("high-urgency active record") doesn't match the actual per-class criteria. Authors reading §7a literally (as I did at `red-bunny` PG-7) will exclude STEMO records that the validator considers high-priority — STEMO-3 (grief, intensity high) and STEMO-4 (dread, intensity high) were both flagged as omitted from the §7a table even though `urgency` is not a STEMO field.

This is a documentation/contract gap, not a code bug. The validator's class-specific criteria are defensible; the contract prose just needs to match.

## Assumption Reassessment (2026-05-27)

1. The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §7a uses the phrase "high-urgency active record" without enumerating per-class criteria. The validator `tools/validators/src/structural/page-plan-active-pressure.ts:75-113` (`isHighUrgency`) is the authoritative selector and uses class-specific criteria that match the per-class schema (STEMO has `intensity`, STQ has `salience`, OBL/CNSQ/THR have `urgency`, STPLAN has `plan_status`, CLK has `value` vs. `thresholds`, STSEC has `status` + `reveal_records`).
2. The class-specific criteria are correct and worth preserving — they map each class's actual schema fields to the right "actively pressuring" semantics. A field-uniform "urgency" approach would force schema changes across multiple classes to add a redundant `urgency` field.
3. Cross-skill boundary: the contract §7a is consumed by every PG-authoring skill (`branching-story-bootstrap`, `branching-story-turn-cycle`). The validator is consumed at dry-run by the patch engine. Both must agree on which records belong in the §7a table.
4. Adjacent contradictions: §7a's table-row vocabulary ("Disposition" closed set: `selected | deferred | rejected`) is unchanged and correct. The contract's listing of `STPLAN | STEMO | CLK | STSEC | STQ` etc. as Phase 0 due-driver classes elsewhere in the contract is unchanged. Only the "high-urgency" wording in the §7a table-coverage rule is misleading.
5. No FOUNDATIONS-aligned enforcement surface change. This is contract prose alignment with existing validator behavior.

## Architecture Check

1. Cleaner than alternatives. Option A (add a uniform `urgency` field to every record class) is a much larger schema change with no real benefit — the per-class field choices already encode the right semantics. Option B (this ticket: update the contract prose to match validator behavior) is the smallest change that resolves the gap. Option C (rename the validator and its error code to remove "urgency") is cosmetic and doesn't help authors reading the contract.
2. No backwards-compatibility aliasing/shims introduced. Contract prose change only; no code changes; no schema changes; existing fixtures unaffected.

## Verification Layers

1. Contract prose explicitly enumerates per-class high-priority criteria → manual review (the updated §7a section matches the validator's `isHighUrgency` per-class table).
2. Authors reading §7a literally include every record class the validator considers high-priority → skill dry-run (synthetic PG plan with one of each class at the validator's high-priority threshold; assert `active_pressure_handling_discipline` returns 0 fails when all are dispositioned).

## What to Change

### 1. Shared contract §7a wording (`.claude/skills/_shared-templates/story-state-contract.md`)

Replace the sentence "Every high-urgency active record on the parent `PG.state_snapshot` appears in exactly one row" with:

> Every actively-pressuring record on the parent `PG.state_snapshot` appears in exactly one row. The class-specific criteria for "actively-pressuring" are:
>
> | Class | Criterion |
> |---|---|
> | STPLAN | `plan_status ∈ {active, blocked, suspended}` AND `current_step` has content |
> | STEMO | `intensity ∈ {high, extreme}` AND `behavioral_pressure` non-empty |
> | CLK | `status = active` AND `value` at or above any `threshold.at` |
> | THR | `status = active` AND `urgency = high` |
> | STSEC | `status = partially_revealed` OR `reveal_records` non-empty |
> | STQ | `status = complicated` AND `salience = high` |
> | OBL | `status ∈ {open, escalated}` AND `urgency = high` |
> | CNSQ | `status ∈ {pending, escalated}` AND `urgency = high` |
>
> The `active_pressure_handling_discipline` structural validator enforces this set; the table reproduces its per-class criteria for authoring reference.

### 2. Skill-side authoring instructions

Grep `.claude/skills/branching-story-turn-cycle/SKILL.md` and `references/*.md` (and `branching-story-bootstrap/SKILL.md` if it documents §7a) for any restatement of the "high-urgency" criterion. Replace with a cross-reference to the contract's per-class table rather than duplicating the table — single source of truth.

### 3. Validator error message wording (optional, nice-to-have)

Optionally update the `active_pressure_handling_discipline` error message at `tools/validators/src/structural/page-plan-active-pressure.ts:106` from "omits high-urgency active ${record.id} from the 7a Active-pressure disposition table" to "omits actively-pressuring ${record.id} (class ${recordClass}) from the 7a Active-pressure disposition table." This is a cosmetic message change; non-blocking for this ticket but should land together for vocabulary consistency. If chosen, update the corresponding test fixtures' expected-message strings.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §7a prose + new per-class criteria table)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify if it restates the criterion — cross-reference instead of restating)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify if it restates the criterion — cross-reference instead)
- `.claude/skills/branching-story-bootstrap/SKILL.md` and `references/*.md` (modify if any restate the criterion)
- `tools/validators/src/structural/page-plan-active-pressure.ts` (optional, modify error message + test fixtures)

## Out of Scope

- Schema changes to add a uniform `urgency` field across classes.
- Changes to the validator's per-class criteria (the criteria are correct; only the contract prose needs alignment).
- Changes to the `Disposition` closed set (`selected | deferred | rejected`) or the `Reason / expiry` cell shape.
- Changes to the Phase 0 due-driver evaluation logic in `branching-story-turn-cycle` — that's a separate selection process; this ticket only touches the §7a table-coverage rule.

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm -F @worldloom/validators test` continues to pass (no code change unless the optional error-message update is included; in that case fixtures need updating in lockstep).
2. A new author reading §7a in isolation, without reading the validator source, would correctly include STEMO records of high or extreme intensity (plus behavioral_pressure non-empty) in the §7a disposition table. (Validated by manual reading and ideally by a follow-up skill dry-run.)

### Invariants

1. The contract prose and the validator's `isHighUrgency` selection logic agree on which active records belong in §7a.
2. The per-class criteria table in the contract matches the per-class branches in `isHighUrgency` at `tools/validators/src/structural/page-plan-active-pressure.ts:75-113`. Any future change to one MUST be mirrored in the other; consider adding a code comment on `isHighUrgency` pointing at the contract section.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is manual review of the contract prose alignment with the validator code, plus the existing test coverage of active_pressure_handling_discipline at tools/validators/tests/structural/active-pressure-handling-discipline.test.ts.`

### Commands

1. `diff` the contract §7a table against the validator's `isHighUrgency` branches manually — verify each row matches a branch and vice versa.
2. `pnpm -F @worldloom/validators test -- --filter active-pressure-handling-discipline` — confirm existing fixtures still pass (no code change unless the optional error-message refresh is included).
3. After landing, retry a small synthetic page plan with one of each high-priority class dispositioned and verify the validator returns zero fails.
