# SPEC50STPSTECHC-004: Correct trigger_predicates field-name drift (4 production + 5 test sites)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (parser), `tools/validators` (validator + helper + fixtures), `branching-story-health-audit` skill. Corrective of SPEC-49.
**Deps**: None

## Problem

Before this ticket, the STPLAN schema defined fallback predicates at `fallback_steps[].trigger_predicates[]` (`story-plan.schema.json:81,84`, a required field), but four production sites and five test fixtures read/constructed the non-existent path `fallback_steps[].trigger_condition.predicates[]`. Production effects were: `plan_fallback_predicate_ref` edges silently never emitted; fallback-predicate validation was a no-op; `fallbackTriggerRecordIds` returned empty; the `stplan-long-blocked-no-fallback` health check never fired. The five test fixtures shared the same wrong field name, which is why the drift shipped green through SPEC-49 — the suite did not exercise the real schema shape, and the schema's `trigger_predicates` requirement was not enforced against these fixtures.

## Assumption Reassessment (2026-05-19)

1. Codebase: the canonical path is `story-plan.schema.json:81,84` (`trigger_predicates`, required). Four production drift sites: `tools/world-index/src/parse/atomic.ts:898`; `tools/validators/src/structural/stplan-utils.ts:170` (`fallbackTriggerRecordIds`); `tools/validators/src/structural/stplan-predicate-references.ts:46-47`; `.claude/skills/branching-story-health-audit/SKILL.md:305`. Five test fixtures: `tools/validators/tests/structural/stplan-predicate-references.test.ts:72,95`; `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts:95,354`; `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts:51`; `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts:134`. `current_step.success_condition.predicates[]` is a real, correctly-referenced path — leave it untouched. Verified this session via `grep -rn trigger_condition`.
2. Specs/contract: SPEC-49 referenced `trigger_condition.predicates[]` consistently (key decision #3; B.4; C.1), so the drift landed through SPEC-49 across both code and fixtures; SPEC-50 §B is the corrective extension.
3. Cross-artifact boundary: the corrected field name spans `tools/world-index` (parser), `tools/validators` (validator + helper + fixtures), and the health-audit skill; all nine sites must change together or the suite breaks.
4. HARD-GATE / Canon Safety surface: `stplan-predicate-references.ts` and `stplan-utils.ts` are structural validators under `tools/validators/src/structural/` that resolve story-record references at pre-apply; the correction restores their intended enforcement (fallback predicate references are validated, not silently skipped) — strengthening, not weakening, the surface. No Mystery Reserve firewall interaction.
5. Field-rename blast radius: `grep -rn trigger_condition tools/ .claude/skills/` (excl. node_modules/dist) returns exactly the nine sites in item 1 — four production + five test fixtures. No other consumer reads the drifted path.

## Architecture Check

1. A single coherent field-name correction applied at every site; splitting it would leave the suite in a broken or still-masked state (correcting production code without fixtures breaks tests; correcting fixtures without code breaks tests). They must land as one reviewable diff.
2. No shim — the drifted path is removed, not aliased.

## Verification Layers

1. `plan_fallback_predicate_ref` edges emit for a STPLAN with `trigger_predicates[]` -> world-index parser test.
2. `stplan-predicate-references` flags an unresolvable fallback predicate -> validator dry-run on the new fixture.
3. `fallbackTriggerRecordIds` returns the referenced ids -> unit test.
4. Zero remaining `trigger_condition.predicates` references -> `grep -rn "trigger_condition" tools/ .claude/skills/` returns no fallback-path matches.

## Landed Changes

### 1. Production sites

- `atomic.ts` reads `fallback_steps[].trigger_predicates[]` directly (no `trigger_condition` nesting).
- `stplan-utils.ts` (`fallbackTriggerRecordIds`) reads `trigger_predicates` off each fallback step.
- `stplan-predicate-references.ts` reads `trigger_predicates` and reports diagnostic paths as `fallback_steps[${stepIndex}].trigger_predicates`.
- `branching-story-health-audit/SKILL.md` describes `stplan-long-blocked-no-fallback` fallback evaluation in terms of `trigger_predicates[]`.

### 2. New schema-validated fixture (B.5)

Added schema regression coverage in `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts`: a STPLAN with non-empty `fallback_steps[].trigger_predicates[]` validates, while the legacy `trigger_condition` shape is rejected by the required `trigger_predicates` gate.

### 3. Correct existing fixtures (B.6)

Changed the five drifted fixtures to `trigger_predicates`; existing assertions now exercise the real schema shape and continue to produce fallback edges / fallback predicate verdicts.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/validators/src/structural/stplan-utils.ts` (modify)
- `tools/validators/src/structural/stplan-predicate-references.ts` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `tools/validators/tests/structural/stplan-predicate-references.test.ts` (modify)
- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (modify)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify)
- `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` (modify — schema-validated fallback regression)
- `docs/MACHINE-FACING-LAYER.md` (modify — current edge-contract row repaired during post-ticket review)
- `archive/specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` (modify — Phase B implementation note added during post-ticket review)

## Out of Scope

- `current_step.success_condition.predicates[]` (already correct).
- Any new edge type or new validator beyond the field-name correction.

## Acceptance Criteria

### Tests That Must Pass

1. A STPLAN with `fallback_steps[].trigger_predicates[]` produces `plan_fallback_predicate_ref` edges.
2. `stplan-predicate-references` flags an unresolvable fallback predicate reference.
3. `fallbackTriggerRecordIds` returns the referenced ids.
4. `npm test --prefix tools/validators` and `npm test --prefix tools/world-index` both green.

### Invariants

1. No `fallback_steps[].trigger_condition.predicates` reference remains anywhere in `tools/` or `.claude/skills/`.
2. The new fixture is schema-validated against `story-plan.schema.json`.

## Test Plan

### New/Modified Tests

1. new STPLAN-fallback fixture (schema-validated) — proves fallback-predicate edges/validation/resolution work.
2. five existing drifted fixtures corrected — re-confirm intended behavior post-correction.

### Commands

1. `npm run build --prefix tools/validators && npm run build --prefix tools/world-index`
2. `npm test --prefix tools/validators && npm test --prefix tools/world-index`
3. `rg -n 'trigger_condition\\.predicates|trigger_condition:' tools/ .claude/skills/ -g '!**/node_modules/**' -g '!**/dist/**'` — only the intentional legacy-shape rejection fixture remains.

## Outcome

Completed on 2026-05-20. The STPLAN fallback predicate contract now uses the schema-canonical `fallback_steps[].trigger_predicates[]` path across world-index edge extraction, validators helper/diagnostic logic, the health-audit skill, the named SPEC-47/SPEC-49 fixtures, and the current machine-facing edge-contract row. No compatibility shim was added for `trigger_condition`.

## Verification Result

1. `npm run build` from `tools/world-index` — PASS.
2. `node --test dist/tests/parse/atomic-edges-for-story-plan.test.js dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js` from `tools/world-index` — PASS (3 tests).
3. `npm run build` from `tools/validators` — PASS.
4. `node --test dist/tests/structural/stplan-predicate-references.test.js dist/tests/schemas/story-plan-schema-fixtures.test.js dist/tests/integration/spec49-stplan-stemo-hardening.test.js` from `tools/validators` — PASS (18 tests) after correcting the new schema test to assert the actual Ajv rejection signal.
5. `npm test` from `tools/world-index` — PASS (119 tests).
6. `npm test` from `tools/validators` — PASS (671 tests).
7. `rg -n "trigger_condition|trigger_predicates|fallbackTriggerRecordIds|plan_fallback_predicate_ref" tools/world-index/src/parse/atomic.ts tools/validators/src/structural/stplan-utils.ts tools/validators/src/structural/stplan-predicate-references.ts .claude/skills/branching-story-health-audit/SKILL.md tools/validators/tests/structural/stplan-predicate-references.test.ts tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` confirmed production and positive fixtures use `trigger_predicates`; the only remaining `trigger_condition` mention in touched test surfaces is the intentional legacy-shape rejection case in `story-plan-schema-fixtures.test.ts`.

## Deviations

- The drafted "new fixture" landed as an added schema-fixture test case in the existing `story-plan-schema-fixtures.test.ts`, not as a new fixture file. The same file now proves both acceptance of `trigger_predicates` and rejection of the legacy `trigger_condition` shape.
- A literal `trigger_condition` string remains in the schema rejection fixture by design. The operational stale path `fallback_steps[].trigger_condition.predicates[]` was removed from production, positive fixtures, and skill guidance.
- Post-ticket review added the SPEC-50 Phase B implementation note and repaired `docs/MACHINE-FACING-LAYER.md`; no source/test rerun was needed for those prose-only handoff repairs beyond hygiene and stale-anchor checks.
