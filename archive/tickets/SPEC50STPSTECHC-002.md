# SPEC50STPSTECHC-002: CHC.grounded_in accepts STSTAT

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (story-choice schema + CHC-grounding validators), shared contract docs.
**Deps**: None

## Problem

At intake, `CHC.grounded_in.records[]` (`tools/validators/src/schemas/story-choice.schema.json`) allowed `STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA|STPLAN|STEMO|CLK|STSEC|STQ|STINT|SF` and omitted `STSTAT`. `STSTAT` lives in `PG.state_snapshot.active_records`, drives the `entity_status` SLT predicate, and determines life / agency / location — the constraints that make a choice available, forbidden, risky, or transformed. A status-constrained choice could not cite the status record that constrained it. This was a residual omission in SPEC-49's own expansion logic, not a deliberate rejection.

## Assumption Reassessment (2026-05-20)

1. Codebase: `story-choice.schema.json` omitted `STSTAT` before this ticket; CHC-grounding reference resolution / observer-access is enforced not by a single "CHC-grounding validator" but across `tools/validators/src/structural/recursive-reference-closure.ts`, `tools/validators/src/structural/observer-firewall.ts`, and the DA-specific `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (verified this session — no file named `chc-grounding*`).
2. Specs/contract: the CHC schema section lives in `.claude/skills/_shared-templates/story-record-schemas.md`; SPEC-49 A.2.2 established the per-class rationale-line format there.
3. Cross-artifact boundary: the schema regex, the contract mirror, and whichever structural/rule validators enumerate the grounded_in class set must agree on STSTAT membership.
4. FOUNDATIONS §Story Bundles §5 (Rule 1, No Floating Facts at story scope): a status-grounded choice must be able to cite the `STSTAT` record that grounds it; without STSTAT in `grounded_in`, status-constrained choices are floating relative to their grounding record.
5. HARD-GATE / Canon Safety surface: this ticket modifies CHC-grounding schema/structural validator surfaces that feed story-bundle record validation. The final STSTAT extension preserves active-record branch-locality through `recursive-reference-closure.ts` and observer-access through `observer-firewall.ts` (actor's own status or a BEL-recorded access route); it does not touch the Mystery Reserve firewall.
6. Schema extension: extends the `story-choice` record schema's `grounded_in.records[]` class set. Consumers: the three validators named in item 1 plus page-plan §13 authoring. Additive-only.
7. Live correction: `recursive-reference-closure.ts` already treated `STSTAT` as story-local and already checked `CHC.grounded_in.records[]` against `PG.state_snapshot.active_records` generically, so it needed only an explicit regression test for inactive `STSTAT`. `rule_chc_grounded_in_artifact_accessible.ts` is DA-specific and does not enumerate the CHC class set, so it remained unchanged.

## Architecture Check

1. Additive regex extension that completes SPEC-49 A.2's expansion; the alternative (leaving STSTAT ungroundable) forces status-constrained choices to either omit grounding or ground in a proxy record, both worse.
2. No shim — existing CHC records are unaffected.

## Verification Layers

1. STSTAT accepted in `grounded_in.records[]` -> schema validation against a STSTAT-grounded CHC fixture.
2. Branch-locality / active-record / observer-access checks cover STSTAT -> validator dry-run (a CHC grounded in a non-active or branch-foreign STSTAT must fail).
3. Rule 1 grounding completeness -> FOUNDATIONS alignment check.

## Landed Changes

### 1. story-choice schema regex

Added `STSTAT` to the `grounded_in.records[]` pattern.

### 2. Contract mirror

Added `STSTAT` to the CHC schema section in `story-record-schemas.md` with the one-line rationale: choices whose availability, prohibition, risk, or transformation turns on life / agency / location status must cite the `STSTAT` record.

### 3. Validator coverage

Kept `recursive-reference-closure.ts` production logic unchanged because it already checks all `grounded_in.records[]` entries against active records; added explicit inactive-`STSTAT` proof. Extended `observer-firewall.ts` so status grounding is allowed for the actor's own `STSTAT` or through a BEL access route, and rejected otherwise. Left `rule_chc_grounded_in_artifact_accessible.ts` unchanged because it is DA-specific, not a general class-set validator.

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/src/structural/observer-firewall.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)

## Out of Scope

- `SE.state_delta` STPLAN/STEMO (archive/tickets/SPEC50STPSTECHC-001.md).
- The CHC↔SLT eligibility-source grounding validator (archive/tickets/SPEC50STPSTECHC-009.md).
- Any pool-level salience / pressure-distribution check.

## Acceptance Criteria

### Tests That Must Pass

1. A CHC grounded in an active branch-local STSTAT validates.
2. A CHC grounded in an inactive STSTAT fails the active-record check.
3. A CHC grounded in another actor's STSTAT without an access route fails observer-access; the actor's own STSTAT and BEL-access-routed STSTAT cases pass.
4. `npm test` green from `tools/validators`.

### Invariants

1. `CHC.grounded_in.records[]` accepts every class present in `PG.state_snapshot.active_records` that can materially constrain a choice — STSTAT now included.
2. Observer-access and branch-locality discipline applies uniformly to STSTAT grounding.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` — CHC fixture grounded in STSTAT validates through `record_schema_compliance`.
2. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — inactive STSTAT grounding fails the active-record check.
3. `tools/validators/tests/structural/observer-firewall.test.ts` — actor-owned status and BEL-routed status pass; another actor's status without an access route fails.

### Commands

1. `npm run build` from `tools/validators`
2. `node --test dist/tests/structural/record-schema-compliance-story-choice.test.js dist/tests/structural/observer-firewall.test.js dist/tests/structural/recursive-reference-closure.test.js` from `tools/validators`
3. `npm test` from `tools/validators`

## Outcome

Completed: 2026-05-20.

`CHC.grounded_in.records[]` now accepts `STSTAT` in the JSON Schema and shared story-record schema mirror. `observer_firewall` now treats STSTAT grounding as actor-visible when it names the acting entity's own status or when the actor has a BEL access route to the status record, and rejects another actor's status without an access route. `recursive_reference_closure` already enforced active-record membership generically, so this ticket added explicit STSTAT coverage rather than changing that production logic.

## Verification Result

1. `npm run build` from `tools/validators` — PASS.
2. `node --test dist/tests/structural/record-schema-compliance-story-choice.test.js dist/tests/structural/observer-firewall.test.js dist/tests/structural/recursive-reference-closure.test.js` from `tools/validators` — PASS, 44 tests.
3. `npm test` from `tools/validators` — PASS, 667 tests.

## Deviations

- `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` was inspected but left unchanged. It enforces DA-specific active-artifact accessibility and does not enumerate the `CHC.grounded_in.records[]` class set.
- The drafted command form `npm test --prefix tools/validators` was replaced with package-root `npm test` after confirming `tools/validators/package.json` owns the build/test scripts.
