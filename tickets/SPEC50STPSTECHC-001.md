# SPEC50STPSTECHC-001: SE.state_delta accepts STPLAN/STEMO

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (story-event schema), shared contract docs, validators test fixtures. No impact on patch-engine ops (already support `create_stplan_record`/`create_stemo_record`).
**Deps**: None

## Problem

`SE.state_delta.create`, `SE.state_delta.supersede`, and `SE.state_delta.close` use a record-class regex that omits `STPLAN` and `STEMO` (`tools/validators/src/schemas/story-event.schema.json:294-305`). Yet `STPLAN`/`STEMO` are accepted by `PG.state_snapshot.active_records` (story-page.schema.json:67-68, landed by SPEC-49 A.1), by the patch engine (`create_stplan_record`/`create_stemo_record`), by the SLT predicate DSL, and by `CHC.grounded_in` (SPEC-49 A.2). A record class that can be created by the engine, listed in a page snapshot, and grounded by a choice, but cannot be created/superseded/closed by the committing event, is internally inconsistent at the replay layer and violates FOUNDATIONS §Story Bundles §5a ("each block's `effects.*` mirrors `SE.state_delta` (`create | supersede | close`)").

## Assumption Reassessment (2026-05-19)

1. Codebase: the three `state_delta` item-pattern regexes are at `tools/validators/src/schemas/story-event.schema.json:296` (`create`), `:300` (`supersede`), `:304` (`close`); each reads `^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$` — `STPLAN`/`STEMO` absent. Verified this session.
2. Specs/contract: `.claude/skills/_shared-templates/story-state-contract.md` §4 carries the `SE.state_delta` field list; `.claude/skills/_shared-templates/story-record-schemas.md` carries the schema-doc mirror SPEC-49 A.1.2 updated for PG active_records.
3. Cross-artifact boundary: the JSON schema, the shared contract §4, and the schema-doc mirror must agree on the `state_delta` class set; a new regression fixture exercises create/supersede/close for both classes.
4. FOUNDATIONS §Story Bundles §5a — `SLT.effects.*` mirrors `SE.state_delta`; this ticket closes the mirror-invariant break for STPLAN/STEMO. The fix does not change the mirror; it makes the mirror hold for two classes already present everywhere else.
5. Schema extension: extends the `story-event` record schema's `state_delta` class set. Consumers: the `state_delta_class_integrity` and `record_schema_compliance` structural validators. Additive-only — no currently-valid event record becomes invalid.

## Architecture Check

1. Purely additive regex extension; the alternative (a separate STPLAN/STEMO state-delta path) would fork the mirror that §5a requires be uniform. Adding the two classes to the existing arrays is the minimal change that restores the invariant.
2. No backwards-compatibility shim — existing events are unaffected; the change only widens what is accepted.

## Verification Layers

1. STPLAN/STEMO accepted in `state_delta.create/supersede/close` -> schema validation against the new fixture.
2. `state_delta_class_integrity` agrees with `record_introductions[]` for STPLAN/STEMO -> validator dry-run on the fixture.
3. §5a mirror holds (SLT.effects ⇔ SE.state_delta class set) -> FOUNDATIONS alignment check comparing the two class regexes.
4. Pre-existing event fixtures still validate -> regression run (additive-only proof).

## What to Change

### 1. story-event schema regexes

Add `STPLAN` and `STEMO` to the item-pattern alternation at lines 296, 300, 304.

### 2. Shared contract + schema-doc mirror

Mirror the class-set change in `story-state-contract.md` §4 (`SE.state_delta`) and `story-record-schemas.md`, with a one-line note that STPLAN/STEMO are now lifecycle-managed via `SE.state_delta` (mirror parity with `SLT.effects`).

### 3. Regression fixtures

Add fixtures: an event that creates a STPLAN, supersedes a STPLAN, closes a STPLAN; the same three for STEMO. Assert schema validity + `state_delta_class_integrity`/`record_introductions[]` agreement.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/` story-event state_delta fixture(s) (new or modify)

## Out of Scope

- `CHC.grounded_in` STSTAT (SPEC50STPSTECHC-002).
- `SE.commitment.alias_bindings` (SPEC50STPSTECHC-003).
- Any new record class or new patch-engine op.

## Acceptance Criteria

### Tests That Must Pass

1. A fixture event creating/superseding/closing STPLAN and STEMO validates against `story-event.schema.json`.
2. A control event using the prior class set still validates (additive-only proof).
3. `npm test --prefix tools/validators` green.

### Invariants

1. The `state_delta.create/supersede/close` class set equals the `SLT.effects.create/supersede/close` class set (§5a mirror).
2. No existing event record is invalidated by the change.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/` — story-event fixture exercising STPLAN/STEMO state_delta create/supersede/close, asserting schema validity + class-integrity agreement.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
