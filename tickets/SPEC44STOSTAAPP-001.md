# SPEC44STOSTAAPP-001: Phase 1 schema corrections — state_delta pattern, PageAffordance $defs, SREL duplicate-axis severity

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `story-event.schema.json` state_delta id pattern expands; `story-page.schema.json` extracts `$defs.PageAffordance`; `relationship-introduction-grounding-integrity.ts` raises `srel_intro_duplicate_axis` severity warn → fail.
**Deps**: None

## Problem

Three independent schema-correctness defects block downstream work in this spec batch and are mechanically safe to land first:

1. **`story-event.schema.json` `state_delta` regex omits STSTAT, CLK, STSEC, STQ**. The current pattern `^(STENT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$` at lines 96-104 rejects four classes the patch-engine actively creates via `create_ststat_record`, `create_clk_record`, `create_stsec_record`, `create_stq_record` (and supersedes via `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record`). Any correctly-formed `SE.state_delta.create/supersede/close` referencing these classes fails schema validation today.

2. **`story-page.schema.json` `visible_affordances` is inline, blocking page-affordance integrity validator authoring.** The component lives at lines 106-153 as an unnamed inline object schema with `additionalProperties: false`; the new `page_affordance_integrity` validator (ticket 006) needs to consume it as a reusable `$defs.PageAffordance` reference so the integrity check and the schema definition stay in lockstep.

3. **`srel_intro_duplicate_axis` validator emits warn-level only.** `relationship-introduction-grounding-integrity.ts:92-93` defines the code with `severity: "warn"`; SPEC-44 §Approach Phase 1 step 3 calls for the upgrade to `fail` because the duplicate-active-SREL invariant (no two active SREL records with same participants + axis + direction) is a schema-minimalism invariant that should reject at gate time rather than advise.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/schemas/story-event.schema.json` lines 90-104 carry the current `state_delta.create/supersede/close` pattern; verified via direct read in SPEC-44 brainstorm verification agent. The omitted classes (STSTAT, CLK, STSEC, STQ) all appear in `tools/patch-engine/src/ops/create-story-record.ts:21-44` `StoryRecordOperationKind`.
2. `tools/validators/src/schemas/story-page.schema.json` lines 106-153 hold the inline `visible_affordances` schema; verified via direct read. The schema has `additionalProperties: false` and an enumerated `action_families` list (20 values: move/evade/pursue/perceive/investigate/communicate/persuade/negotiate/bond/oppose/harm/protect/control/transfer/use/make_change/ritual_protocol/recover/wait/decide).
3. **Cross-boundary surface under audit**: the `story-event.schema.json` is consumed by `tools/validators/src/structural/record-schema-compliance-story-event.test.ts` and (indirectly) by the patch-engine's pre-apply validation pipeline; `story-page.schema.json` will be consumed by the new `page-affordance-integrity.ts` validator (ticket 006) via the `$defs.PageAffordance` extraction. Both schemas live under `tools/validators/src/schemas/` and follow the same `additionalProperties: false` posture for root objects.
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) — every field in every story-bundle record schema must be load-bearing; the state_delta omission renders four engine-produced classes unreachable from the schema's validation surface, which is the inverse of load-bearing fidelity. The schema must validate what the engine produces.
5. **Canon Safety surface touched**: `relationship-introduction-grounding-integrity.ts` is a structural validator under `tools/validators/src/structural/` per the per-ticket-type granularity rule; modifying its severity from `warn` to `fail` upgrades a Canon Safety surface (story-state-validator gate). The change does NOT weaken the Mystery Reserve firewall — duplicate active SREL with same participants/axis/direction is a story-state-internal invariant, not a mystery-resolution surface.

## Architecture Check

1. **State_delta pattern expansion is a strict superset.** Adding STSTAT/CLK/STSEC/STQ to the regex restores schema fidelity to the engine's actual op vocabulary. No prior consumers depended on the absence of these classes; the omission was an oversight.
2. **`$defs.PageAffordance` extraction is byte-equivalent.** The inline object's content moves to `$defs.PageAffordance` and the original site becomes `{ "$ref": "#/$defs/PageAffordance" }`. JSON Schema semantics are identical; downstream validators see no change in behavior. The extraction is purely a refactoring to enable ticket 006's validator to consume the shape.
3. **Severity upgrade preserves the existing validator code path.** Only the `severity` field literal flips from `"warn"` to `"fail"` at line 92; the detection logic, fixture coverage, and verdict shape are unchanged. The fixture test (`relationship-introduction-grounding-integrity.test.ts`) needs its severity-expectation assertion updated.

No backwards-compatibility shims, aliases, or fallback paths introduced.

## Verification Layers

1. **State_delta pattern includes 4 added classes** → schema validation: synthetic SE record with `state_delta.create: [STSTAT-1, CLK-1, STSEC-1, STQ-1]` validates clean.
2. **`$defs.PageAffordance` is byte-equivalent to the prior inline shape** → schema validation: pre-existing affordance fixtures continue to pass `record-schema-compliance-story-page` test without behavioral change.
3. **`srel_intro_duplicate_axis` emits fail severity** → codebase grep-proof: `grep -n 'severity.*"fail".*srel_intro_duplicate_axis' tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` returns the upgraded line; fixture test asserts `verdict.severity === "fail"` for the duplicate-axis case.

## What to Change

### 1. `story-event.schema.json` state_delta id pattern

Update lines 96-104. Current pattern (3 identical entries for create/supersede/close):

```
^(STENT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$
```

becomes:

```
^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$
```

Added classes inserted in canonical class-listing order from the story-state contract (STSTAT after STENT, CLK after THR, STSEC after CLK, STQ after STSEC).

### 2. `story-page.schema.json` `$defs.PageAffordance` extraction

Add a top-level `$defs` key (if not present) and move the inline `visible_affordances.items` object schema (lines 109-152) into `$defs.PageAffordance`. Replace the original site with `{ "$ref": "#/$defs/PageAffordance" }`. Preserve all fields verbatim: `ordinal` (integer, minimum 0), `label` (string, minLength 1), `grounded_in` (array of STLOC/STOBJ ids), `available_to` (array of STENT ids), `action_families` (array of the 20-value enum), `additionalProperties: false`.

### 3. `relationship-introduction-grounding-integrity.ts` severity upgrade

At line 92, change `severity: "warn",` to `severity: "fail",` for the `srel_intro_duplicate_axis` verdict. No other changes to the validator file.

### 4. Test fixture updates

- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts`: add a positive-path fixture exercising `state_delta.create: [STSTAT-1, CLK-1, STSEC-1, STQ-1]`. Verify the fixture passes after the schema pattern expansion.
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts`: update any assertion that expects `severity: "warn"` for the duplicate-axis case to expect `severity: "fail"`. If a fixture file is `srel-duplicate-axis-*.yaml`, no fixture content change is needed — only the test expectation flips.

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

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — add positive-path assertion for the 4 newly-permitted classes in `state_delta`.
2. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` — update duplicate-axis expectation from `warn` to `fail`.

### Commands

1. `npm test --prefix tools/validators -- record-schema-compliance-story-event` — targeted schema test.
2. `npm test --prefix tools/validators -- relationship-introduction-grounding-integrity` — targeted severity-upgrade test.
3. `npm test --prefix tools/validators` — full validator suite regression check (ensures `$defs.PageAffordance` extraction doesn't break any pre-existing story-page consumer).
