# SPEC65STOSCHCON-002: Close PG.state_snapshot.active_records to its known key set

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (story-page JSON schema + focused structural tests)
**Deps**: None

## Problem

At intake, `PG.state_snapshot.active_records` in `tools/validators/src/schemas/story-page.schema.json` declared all 18 active-state class keys as properties, preserved `required: ["STCHAR"]` per SPEC-58 C4, but allowed unknown keys with `additionalProperties: true`. The open-properties stance let a typo key (e.g. `STEN` for `STENT`, or `FOO`) pass schema validation silently — a silent state-loss vector, since the typo'd records would not be tracked under their intended class. The shared contract (`story-record-schemas.md` §4.2) enumerates exactly the 18 keys, so the schema now rejects anything outside that closed set.

## Assumption Reassessment (2026-05-21)

1. At intake, `tools/validators/src/schemas/story-page.schema.json` declared `active_records` with `required: ["STCHAR"]`, 18 property keys, and `additionalProperties: true`. This ticket changed only that boolean to `false`; the 18 keys and `required: ["STCHAR"]` remain unchanged.
2. `story-record-schemas.md` §4.2 enumerates the canonical 18 active-state keys: `STENT, STCHAR, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, STSTAT, CLK, STSEC, STQ, STPLAN, STEMO`. The schema's existing property set already matches this; only the `additionalProperties` stance drifts.
3. **Cross-artifact boundary under audit**: `story-page.schema.json` is consumed by every state-changing story skill at hard-gate validation and by existing fixtures. The only structural change is rejecting unknown keys; no key is added or removed.
4. **FOUNDATIONS §5b Schema-Minimalism**: keep the closed key set and `required: ["STCHAR"]` unchanged; do **not** make all 18 keys required — empty-required-arrays are author boilerplate with no validation signal. The typo-prevention value comes entirely from `additionalProperties: false`.
5. **Schema modification (additive-vs-breaking)**: `additionalProperties: false` is additive-safe for any snapshot using only the 18 known keys (the universe of lawful keys) and breaking only for snapshots carrying unknown keys — which is exactly the silent-typo case it is meant to catch. The named midstory fixtures were inspected and already use only lawful keys, so no YAML fixture rewrite was needed. The rejection and optional-key proofs landed as inline `record_schema_compliance` structural tests, matching the existing story-page schema test pattern.

## Architecture Check

1. Flipping one boolean (`additionalProperties: true` → `false`) on an already-closed property set is the minimal change that yields typo-prevention; no new validator, no new field, no shared module.
2. No backwards-compatibility shim: unknown keys are rejected outright. Conforming snapshots are unaffected.

## Verification Layers

1. Unknown-key rejection → schema validation (a snapshot with `active_records: { STEN: [], ... }` or `{ FOO: [] }` fails).
2. Optional-key tolerance preserved → schema validation (a snapshot with only `STCHAR` present still passes; `STCHAR` remains required).
3. Single-layer note: this is a pure JSON-schema constraint change; the only proof surface is schema validation against fixtures, so no additional layer mapping applies.

## Landed Changes

### 1. Close the active_records object

In `tools/validators/src/schemas/story-page.schema.json`, the `active_records` object's `additionalProperties` is now `false`. The 18 property keys and `required: ["STCHAR"]` remain unchanged.

### 2. Focused schema proof

`tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` now asserts both sides of the contract: a snapshot with only required `STCHAR` passes, while a snapshot with an unknown `active_records` key fails with `record_schema_compliance.additionalProperties`. The existing midstory YAML fixtures were inspected and already use only the 18 known keys.

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)

## Out of Scope

- Making all 18 active-state keys required (explicitly rejected — boilerplate per §5b).
- The `story-event.schema.json` union narrowings (SPEC65STOSCHCON-001).
- The parity snapshot test (SPEC65STOSCHCON-003).

## Acceptance Criteria

### Tests That Must Pass

1. An `active_records` object with an unknown key (`STEN: []` or `FOO: []`) fails schema validation.
2. An `active_records` object omitting any optional key (only `STCHAR` present) still passes; `STCHAR` remains required.
3. `npm test` from `tools/validators` is green.

### Invariants

1. `active_records` accepts exactly the 18 contract keys and nothing else.
2. `required: ["STCHAR"]` is preserved (SPEC-58 C4 not regressed).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — added inline pass/fail cases for STCHAR-only optional-key tolerance and unknown-key rejection.

### Commands

1. `npm run build` from `tools/validators`
2. `node --test dist/tests/structural/record-schema-compliance-story-page.test.js` from `tools/validators`
3. `npm test` from `tools/validators`

## Outcome

Completed: 2026-05-21

`PG.state_snapshot.active_records` is now a closed object at the JSON Schema layer: only the 18 contract keys are accepted, while `STCHAR` remains the sole required key. No all-key requiredness was introduced, and no registry or new validator was added.

The proof landed in the existing story-page `record_schema_compliance` structural test file rather than in YAML fixture files. The existing midstory introduction fixtures already used only lawful `active_records` keys, so they required inspection but no content rewrite.

## Verification Result

Commands run from `tools/validators` unless otherwise noted:

1. Pre-edit baseline: `npm test` — passed, 823/823 subtests.
2. `npm run build` — passed.
3. `node --test dist/tests/structural/record-schema-compliance-story-page.test.js` — passed, 23/23 subtests.
4. Final broad proof: `npm test` — passed, 825/825 subtests.

## Deviations

- The drafted fixture wording was implemented as inline focused structural tests. Existing story-page schema coverage already uses direct parsed-record fixtures, and the named YAML fixtures did not carry out-of-set `active_records` keys.
