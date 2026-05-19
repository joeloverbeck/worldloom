# SPEC50STPSTECHC-004: Correct trigger_predicates field-name drift (4 production + 5 test sites)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (parser), `tools/validators` (validator + helper + fixtures), `branching-story-health-audit` skill. Corrective of SPEC-49.
**Deps**: None

## Problem

The STPLAN schema defines fallback predicates at `fallback_steps[].trigger_predicates[]` (`story-plan.schema.json:81,84`, a required field). Four production sites and five test fixtures instead read/construct the non-existent path `fallback_steps[].trigger_condition.predicates[]`. Production effects: `plan_fallback_predicate_ref` edges silently never emit; fallback-predicate validation is a no-op; `fallbackTriggerRecordIds` returns empty; the `stplan-long-blocked-no-fallback` health check never fires. The five test fixtures share the same wrong field name, which is why the drift shipped green through SPEC-49 — the suite never exercises the real schema shape, and the schema's `trigger_predicates` requirement is never enforced against these fixtures.

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

## What to Change

### 1. Production sites

- `atomic.ts:898` — read `fallback_steps[].trigger_predicates[]` directly (no `trigger_condition` nesting).
- `stplan-utils.ts:170` (`fallbackTriggerRecordIds`) — read `trigger_predicates` off each fallback step.
- `stplan-predicate-references.ts:46-47` — read `trigger_predicates`; fix the diagnostic path string from `fallback_steps[${stepIndex}].trigger_condition.predicates` to `fallback_steps[${stepIndex}].trigger_predicates`.
- `branching-story-health-audit/SKILL.md:305` — change the `stplan-long-blocked-no-fallback` description to `trigger_predicates[]`.

### 2. New schema-validated fixture (B.5)

Add a STPLAN with non-empty `fallback_steps[].trigger_predicates[]` referencing a real record; the fixture MUST be schema-validated so a future field-name drift fails the schema gate, not merely a hand-written assertion.

### 3. Correct existing fixtures (B.6)

Change the five drifted fixtures to `trigger_predicates`; re-confirm intended behavior (assertions may flip from "no fallback edges" to "produces fallback edges").

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/validators/src/structural/stplan-utils.ts` (modify)
- `tools/validators/src/structural/stplan-predicate-references.ts` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `tools/validators/tests/structural/stplan-predicate-references.test.ts` (modify)
- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (modify)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify)
- new schema-validated STPLAN-fallback fixture (validators tests) (new)

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
3. `grep -rn "trigger_condition" tools/ .claude/skills/ | grep -v node_modules | grep -v /dist/` — expect no fallback-path matches.
