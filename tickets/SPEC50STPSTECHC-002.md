# SPEC50STPSTECHC-002: CHC.grounded_in accepts STSTAT

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (story-choice schema + CHC-grounding validators), shared contract docs.
**Deps**: None

## Problem

`CHC.grounded_in.records[]` (`tools/validators/src/schemas/story-choice.schema.json:66`) allows `STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA|STPLAN|STEMO|CLK|STSEC|STQ|STINT|SF` — SPEC-49 A.2 expanded this set but omitted `STSTAT`. `STSTAT` lives in `PG.state_snapshot.active_records`, drives the `entity_status` SLT predicate, and determines life / agency / location — the constraints that make a choice available, forbidden, risky, or transformed. A status-constrained choice currently cannot cite the status record that constrains it. This is a residual omission in SPEC-49's own expansion logic, not a deliberate rejection.

## Assumption Reassessment (2026-05-19)

1. Codebase: `story-choice.schema.json:66` regex confirmed to omit `STSTAT`; CHC-grounding reference resolution / observer-access is enforced not by a single "CHC-grounding validator" but across `tools/validators/src/structural/recursive-reference-closure.ts`, `tools/validators/src/structural/observer-firewall.ts`, and `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (verified this session — no file named `chc-grounding*`).
2. Specs/contract: the CHC schema section lives in `.claude/skills/_shared-templates/story-record-schemas.md`; SPEC-49 A.2.2 established the per-class rationale-line format there.
3. Cross-artifact boundary: the schema regex, the contract mirror, and whichever structural/rule validators enumerate the grounded_in class set must agree on STSTAT membership.
4. FOUNDATIONS §Story Bundles §5 (Rule 1, No Floating Facts at story scope): a status-grounded choice must be able to cite the `STSTAT` record that grounds it; without STSTAT in `grounded_in`, status-constrained choices are floating relative to their grounding record.
5. HARD-GATE / Canon Safety surface: this ticket modifies CHC-grounding structural/rule validators (`recursive-reference-closure.ts`, `observer-firewall.ts`, `rule_chc_grounded_in_artifact_accessible.ts`) which gate story-bundle record writes at pre-apply. Confirm the STSTAT extension preserves branch-locality and observer-access checks (a dead/captive/offstage STSTAT must still fail observer-access where appropriate); it does not touch the Mystery Reserve firewall.
6. Schema extension: extends the `story-choice` record schema's `grounded_in.records[]` class set. Consumers: the three validators named in item 1 plus page-plan §13 authoring. Additive-only.

## Architecture Check

1. Additive regex extension that completes SPEC-49 A.2's expansion; the alternative (leaving STSTAT ungroundable) forces status-constrained choices to either omit grounding or ground in a proxy record, both worse.
2. No shim — existing CHC records are unaffected.

## Verification Layers

1. STSTAT accepted in `grounded_in.records[]` -> schema validation against a STSTAT-grounded CHC fixture.
2. Branch-locality / active-record / observer-access checks cover STSTAT -> validator dry-run (a CHC grounded in a non-active or branch-foreign STSTAT must fail).
3. Rule 1 grounding completeness -> FOUNDATIONS alignment check.

## What to Change

### 1. story-choice schema regex

Add `STSTAT` to the `grounded_in.records[]` pattern at line 66.

### 2. Contract mirror

Add STSTAT to the CHC schema section in `story-record-schemas.md` with the one-line rationale: choices whose availability, prohibition, risk, or transformation turns on life / agency / location status must cite the `STSTAT` record.

### 3. Validator coverage

In `recursive-reference-closure.ts` / `observer-firewall.ts` / `rule_chc_grounded_in_artifact_accessible.ts` (whichever enumerate the grounded_in class set), extend branch-locality / active-record / observer-access handling to include STSTAT.

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify, if it enumerates the class set)
- `tools/validators/src/structural/observer-firewall.ts` (modify, if it enumerates the class set)
- `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (modify, if it enumerates the class set)
- `tools/validators/tests/` CHC-grounded-in-STSTAT fixture (new or modify)

## Out of Scope

- `SE.state_delta` STPLAN/STEMO (SPEC50STPSTECHC-001).
- The CHC↔SLT eligibility-source grounding validator (SPEC50STPSTECHC-009).
- Any pool-level salience / pressure-distribution check.

## Acceptance Criteria

### Tests That Must Pass

1. A CHC grounded in an active branch-local STSTAT validates.
2. A CHC grounded in a non-active or branch-foreign STSTAT fails the branch-locality / active-record check.
3. `npm test --prefix tools/validators` green.

### Invariants

1. `CHC.grounded_in.records[]` accepts every class present in `PG.state_snapshot.active_records` that can materially constrain a choice — STSTAT now included.
2. Observer-access and branch-locality discipline applies uniformly to STSTAT grounding.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/` — CHC fixture grounded in STSTAT (positive + negative branch-locality cases).

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
