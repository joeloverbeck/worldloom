# SPEC50STPSTECHC-001: SE.state_delta accepts STPLAN/STEMO

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (story-event schema), shared contract docs, validators schema-compliance test, and active SPEC-50 implementation note. No impact on patch-engine ops (already support `create_stplan_record`/`create_stemo_record`).
**Deps**: None

## Problem

At intake, `SE.state_delta.create`, `SE.state_delta.supersede`, and `SE.state_delta.close` used a record-class regex that omitted `STPLAN` and `STEMO` (`tools/validators/src/schemas/story-event.schema.json:294-305`). Yet `STPLAN`/`STEMO` were accepted by `PG.state_snapshot.active_records` (story-page.schema.json:67-68, landed by SPEC-49 A.1), by the patch engine (`create_stplan_record`/`create_stemo_record`), by the SLT predicate DSL, and by `CHC.grounded_in` (SPEC-49 A.2). A record class that can be created by the engine, listed in a page snapshot, and grounded by a choice, but cannot be created/superseded/closed by the committing event, is internally inconsistent at the replay layer and violates FOUNDATIONS §Story Bundles §5a ("each block's `effects.*` mirrors `SE.state_delta` (`create | supersede | close`)").

## Assumption Reassessment (2026-05-20)

1. Codebase: before this ticket, the three `state_delta` item-pattern regexes in `tools/validators/src/schemas/story-event.schema.json` omitted `STPLAN`/`STEMO` from `create`, `supersede`, and `close`; this ticket adds both classes to all three arrays.
2. Codebase: `tools/validators/src/structural/state-delta-class-integrity.ts` already listed `STPLAN` and `STEMO`, and replay/integration tests already exercised STPLAN/STEMO deltas, so the live remaining delta was JSON Schema and prose-contract parity rather than a new structural-validator implementation.
3. Specs/contract: `.claude/skills/_shared-templates/story-state-contract.md` §5a now states that `SE.state_delta.create/supersede/close` include `STPLAN`/`STEMO`; `.claude/skills/_shared-templates/story-record-schemas.md` now mirrors the class-set note on the `state_delta` fields.
4. Cross-artifact boundary: the JSON schema, shared contract §5a, schema-doc mirror, and `record_schema_compliance` regression test now agree on the `state_delta` class set.
5. FOUNDATIONS §Story Bundles §5a — `SLT.effects.*` mirrors `SE.state_delta`; this ticket closes the mirror-invariant break for STPLAN/STEMO. The fix does not change the mirror; it makes the mirror hold for two classes already present everywhere else.
6. Schema extension: extends the `story-event` record schema's `state_delta` class set. Consumers: the `state_delta_class_integrity` and `record_schema_compliance` structural validators. Additive-only — no currently-valid event record becomes invalid.

## Architecture Check

1. Purely additive regex extension; the alternative (a separate STPLAN/STEMO state-delta path) would fork the mirror that §5a requires be uniform. Adding the two classes to the existing arrays is the minimal change that restores the invariant.
2. No backwards-compatibility shim — existing events are unaffected; the change only widens what is accepted.

## Verification Layers

1. STPLAN/STEMO accepted in `state_delta.create/supersede/close` -> schema validation through the updated `record_schema_compliance` fixture.
2. `state_delta_class_integrity` already carries the same STPLAN/STEMO class set -> codebase grep-proof plus existing validators package regression run.
3. §5a mirror holds (SLT.effects ⇔ SE.state_delta class set) -> FOUNDATIONS alignment check comparing the two class regexes.
4. Pre-existing event fixtures still validate -> regression run (additive-only proof).

## What to Change

### 1. story-event schema regexes

Add `STPLAN` and `STEMO` to the item-pattern alternation for `state_delta.create`, `state_delta.supersede`, and `state_delta.close`.

### 2. Shared contract + schema-doc mirror

Mirror the class-set change in `story-state-contract.md` §5a (`SE.state_delta`) and `story-record-schemas.md`, with a one-line note that STPLAN/STEMO are now lifecycle-managed via `SE.state_delta` (mirror parity with `SLT.effects`).

### 3. Regression fixtures

Extend the existing `record_schema_compliance` story-event state-delta regression so one fixture event creates, supersedes, and closes STPLAN/STEMO records alongside the prior accepted classes. The existing `state_delta_class_integrity` and replay coverage already exercised STPLAN/STEMO at the structural layer, so no new structural-validator fixture was required.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify)
- `specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` (modify — dated implementation note)

## Out of Scope

- `CHC.grounded_in` STSTAT (SPEC50STPSTECHC-002).
- `SE.commitment.alias_bindings` (SPEC50STPSTECHC-003).
- Any new record class or new patch-engine op.

## Acceptance Criteria

### Tests That Must Pass

1. A fixture event creating/superseding/closing STPLAN and STEMO validates through `record_schema_compliance`.
2. A control event using the prior class set still validates through the same regression fixture (additive-only proof).
3. `npm test --prefix tools/validators` green.

### Invariants

1. `SE.state_delta.create/supersede/close` accepts `STPLAN` and `STEMO`, so the §5a mirror no longer excludes lifecycle-managed plan/emotion records that `SLT.effects` can name.
2. No existing event record is invalidated by the change.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — extends the story-event schema-compliance fixture to exercise STPLAN/STEMO state_delta create/supersede/close.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`

## Outcome

Completed: 2026-05-20.

The story-event JSON Schema now accepts `STPLAN` and `STEMO` in `SE.state_delta.create[]`, `SE.state_delta.supersede[]`, and `SE.state_delta.close[]`. The shared story-state contract and schema-doc mirror now state the same lifecycle-managed class-set parity, including STPLAN/STEMO. The existing story-event `record_schema_compliance` regression now covers STPLAN/STEMO create/supersede/close alongside the prior accepted state-delta classes.

## Verification Result

- `npm run build --prefix tools/validators` — passed.
- `npm test --prefix tools/validators` — passed, 663 tests.

## Deviations

- The structural validator did not need implementation work: live reassessment found `state_delta_class_integrity` already included `STPLAN` and `STEMO`. This ticket therefore closed the remaining JSON Schema, schema-compliance regression, shared-template, and spec-note parity gap.
- The regression used the existing story-event schema-compliance fixture rather than creating separate fixture files; that directly proves the JSON Schema acceptance gap this ticket owned.
