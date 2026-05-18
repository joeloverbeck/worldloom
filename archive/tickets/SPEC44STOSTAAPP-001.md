# SPEC44STOSTAAPP-001: Phase 1 schema corrections — state_delta pattern, PageAffordance $defs, SREL duplicate-axis severity

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `story-event.schema.json` state_delta id pattern expands; `story-page.schema.json` extracts `$defs.PageAffordance`; `relationship-introduction-grounding-integrity.ts` raises `srel_intro_duplicate_axis` severity warn → fail.
**Deps**: None

## Problem

At intake, three independent schema-correctness defects blocked downstream work in this spec batch and were mechanically safe to land first:

1. **`story-event.schema.json` `state_delta` regex omitted STSTAT, CLK, STSEC, STQ**. Before this ticket, the pattern rejected four classes the patch-engine actively creates via `create_ststat_record`, `create_clk_record`, `create_stsec_record`, `create_stq_record` (and supersedes via `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record`). The landed schema now accepts those prefixes in `SE.state_delta.create/supersede/close`.

2. **`story-page.schema.json` `visible_affordances` was inline, blocking page-affordance integrity validator authoring.** The landed schema now exposes the same shape as reusable `$defs.PageAffordance` and keeps the original location as a `$ref`.

3. **`srel_intro_duplicate_axis` validator emitted warn-level only.** The landed validator now emits `severity: "fail"` for duplicate active SREL axes without supersession.

## Assumption Reassessment (2026-05-18)

1. Before this ticket, `tools/validators/src/schemas/story-event.schema.json` lines 90-104 carried the narrower `state_delta.create/supersede/close` pattern. The omitted classes (STSTAT, CLK, STSEC, STQ) all appear in `tools/patch-engine/src/ops/create-story-record.ts` `StoryRecordOperationKind`.
2. Before this ticket, `tools/validators/src/schemas/story-page.schema.json` lines 106-153 held the inline `visible_affordances` schema. The landed schema preserves the same `additionalProperties: false` posture and the same 20-value `action_families` list under `$defs.PageAffordance`.
3. **Cross-boundary surface under audit**: the `story-event.schema.json` is consumed by `tools/validators/src/structural/record-schema-compliance-story-event.test.ts` and (indirectly) by the patch-engine's pre-apply validation pipeline; `story-page.schema.json` now exposes `$defs.PageAffordance` for the new `page-affordance-integrity.ts` validator owned by ticket SPEC44STOSTAAPP-006. Both schemas live under `tools/validators/src/schemas/` and follow the same `additionalProperties: false` posture for root objects.
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) — every field in every story-bundle record schema must be load-bearing; the state_delta omission renders four engine-produced classes unreachable from the schema's validation surface, which is the inverse of load-bearing fidelity. The schema must validate what the engine produces.
5. **Canon Safety surface touched**: `relationship-introduction-grounding-integrity.ts` is a structural validator under `tools/validators/src/structural/` per the per-ticket-type granularity rule; modifying its severity from `warn` to `fail` upgrades a Canon Safety surface (story-state-validator gate). The change does NOT weaken the Mystery Reserve firewall — duplicate active SREL with same participants/axis/direction is a story-state-internal invariant, not a mystery-resolution surface.

## Architecture Check

1. **State_delta pattern expansion is a strict superset.** Adding STSTAT/CLK/STSEC/STQ to the regex restores schema fidelity to the engine's actual op vocabulary. No prior consumers depended on the absence of these classes; the omission was an oversight.
2. **`$defs.PageAffordance` extraction is byte-equivalent.** The inline object's content moves to `$defs.PageAffordance` and the original site becomes `{ "$ref": "#/$defs/PageAffordance" }`. JSON Schema semantics are identical; downstream validators see no change in behavior. The extraction is purely a refactoring to enable ticket 006's validator to consume the shape.
3. **Severity upgrade preserves the existing validator code path.** Only the duplicate-axis verdict severity changed from `"warn"` to `"fail"`; the detection logic, fixture coverage, and verdict shape are unchanged. The fixture test now asserts the fail severity.

No backwards-compatibility shims, aliases, or fallback paths introduced.

## Verification Layers

1. **State_delta pattern includes 4 added classes** → schema validation: synthetic SE record with `state_delta.create: [STSTAT-1, CLK-1, STSEC-1, STQ-1]` validates clean.
2. **`$defs.PageAffordance` is byte-equivalent to the prior inline shape** → schema validation: pre-existing affordance fixtures continue to pass `record-schema-compliance-story-page` test without behavioral change.
3. **`srel_intro_duplicate_axis` emits fail severity** → codebase grep-proof: `grep -n 'severity.*"fail".*srel_intro_duplicate_axis' tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` returns the upgraded line; fixture test asserts `verdict.severity === "fail"` for the duplicate-axis case.

## Landed Changes

### 1. `story-event.schema.json` state_delta id pattern

Updated all three `state_delta` id patterns to:

```
^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$
```

Added classes are inserted in canonical class-listing order from the story-state contract (STSTAT after STENT, CLK after THR, STSEC after CLK, STQ after STSEC).

### 2. `story-page.schema.json` `$defs.PageAffordance` extraction

Added top-level `$defs.PageAffordance`, moved the prior inline `visible_affordances.items` object schema into it, and replaced the original site with `{ "$ref": "#/$defs/PageAffordance" }`. The moved shape preserves `ordinal`, `label`, `grounded_in`, `available_to`, `action_families`, and `additionalProperties: false`.

### 3. `relationship-introduction-grounding-integrity.ts` severity upgrade

Changed the duplicate-axis verdict to `severity: "fail"`. No detection logic changed.

### 4. Test fixture updates

- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts`: added a positive-path fixture exercising STSTAT/CLK/STSEC/STQ in `state_delta.create/supersede/close`.
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts`: updated the duplicate-axis test name and severity assertion from `warn` to `fail`.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify)
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (modify)

## Out of Scope

- The new `state_delta_class_integrity` validator that backstops the schema fix (ticket SPEC44STOSTAAPP-004).
- The new `page_affordance_integrity` validator that consumes `$defs.PageAffordance` (ticket SPEC44STOSTAAPP-006).
- Any change to `story-page.schema.json` `active_records` shape (deferred to Wave 3 per SPEC-44 Out of Scope; ticket SPEC44STOSTAAPP-008 ships a `warn`-level diagnostic bridge).
- Adding `STSTAT-1` through other class fixtures to any patch-engine test — patch-engine ops route through `create_*_record` and don't author state_delta directly.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- record-schema-compliance-story-event` passes, including a new positive-path assertion that `state_delta.create: [STSTAT-1, CLK-1, STSEC-1, STQ-1]` validates clean.
2. `npm test --prefix tools/validators -- relationship-introduction-grounding-integrity` passes, with the duplicate-axis case asserting `severity: "fail"`.
3. `npm test --prefix tools/validators -- record-schema-compliance-story-page` passes (regression: `$defs.PageAffordance` extraction is byte-equivalent).
4. `npm run build --prefix tools/validators` succeeds (TypeScript compilation of the modified validator file).

### Invariants

1. `story-event.schema.json` `state_delta.create/supersede/close` regex permits the same 20 story-bundle class prefixes the patch-engine produces.
2. `story-page.schema.json` `visible_affordances.items` resolves (via `$ref`) to a `$defs.PageAffordance` whose property shape is byte-equivalent to the prior inline schema.
3. `srel_intro_duplicate_axis` verdicts emit `severity: "fail"`; no `"warn"` severity remains in the validator's emitted code path.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — added positive-path assertion for the 4 newly-permitted classes in `state_delta`.
2. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` — updated duplicate-axis expectation from `warn` to `fail`.

### Commands

1. `npm test --prefix tools/validators -- record-schema-compliance-story-event` — targeted schema test.
2. `npm test --prefix tools/validators -- relationship-introduction-grounding-integrity` — targeted severity-upgrade test.
3. `npm test --prefix tools/validators` — full validator suite regression check (ensures `$defs.PageAffordance` extraction doesn't break any pre-existing story-page consumer).

## Outcome

Completed 2026-05-18.

- `story-event.schema.json` now accepts STSTAT, CLK, STSEC, and STQ ids in all three `state_delta` arrays.
- `story-page.schema.json` now exposes the `visible_affordances.items` shape through `$defs.PageAffordance` while preserving the prior validation behavior.
- `relationship_introduction_grounding_integrity` now treats duplicate active SREL axes without supersession as `fail`.
- Tests were updated for the new accepted SE state-delta prefixes and the fail-level duplicate-axis verdict.

## Verification Result

- `npm test --prefix tools/validators -- record-schema-compliance-story-event` passed on 2026-05-18. The package script rebuilt first and ran the compiled validator suite; result: 505 tests passed.
- `npm test --prefix tools/validators -- relationship-introduction-grounding-integrity` passed on 2026-05-18. The package script rebuilt first and ran the compiled validator suite; result: 505 tests passed.
- `npm test --prefix tools/validators -- record-schema-compliance-story-page` passed on 2026-05-18. The package script rebuilt first and ran the compiled validator suite; result: 505 tests passed.
- `npm test --prefix tools/validators` passed on 2026-05-18; result: 505 tests passed.
- `npm run build --prefix tools/validators` passed on 2026-05-18.

## Deviations

- The `tools/validators` `npm test` script does not narrow to only the named test file when an extra argument is supplied; it runs `node --test dist/tests/**/*.test.js <argument>`, which still executed the full compiled suite successfully. This is stronger than the intended focused proof but less targeted than the command label suggests.
