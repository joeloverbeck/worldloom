# SPEC59STCHARAUTFID-004: `stchar_bound_stent_reciprocity` validator

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new structural validator in `tools/validators` registered in `structuralValidators`; no impact on existing validators (additive registry entry). Reads STENT and STCHAR records; mutates nothing.
**Deps**: None

## Problem

Only the one-way `STENT.bound_stchar_id → STCHAR` resolution is checked (by the existing `stchar_resolves` validator); the reciprocal `STCHAR.bound_stent_ids[] → STENT` direction is unverified, so a binding can be declared on one side without the other pointing back. SPEC-59 §2.4 adds `stchar_bound_stent_reciprocity` to enforce both directions.

## Assumption Reassessment (2026-05-21)

1. At intake, `STENT` carried `bound_stchar_id: STCHAR-<integer> | null` (null only when `role_in_story` is exactly `[background]`); `STCHAR` carried `bound_stent_ids: [STENT-<integer>]` (per `.claude/skills/_shared-templates/story-record-schemas.md`). The existing one-way validator was `tools/validators/src/structural/stchar-resolves.ts` (checks `STENT.bound_stchar_id` → STCHAR and `active_records.STCHAR` → STCHAR, no reciprocal). `role_in_story` includes the value `background`. This ticket added `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts`. `tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` assert the updated registry / pre-apply validator counts; `tools/validators/README.md` carries the package validator count and structural inventory and moved with the new registry entry.
2. SPEC-59 §2.4 is the source deliverable; §3 lists fixtures (matched pair → pass; one-way binding → fail in both directions).
3. Cross-artifact boundary: the binding contract spans two record classes — `STENT.bound_stchar_id` (singular) and `STCHAR.bound_stent_ids` (array). The validator asserts both directions; "non-background" is determined by `STENT.role_in_story != [background]`.
4. FOUNDATIONS §6.1 Story-Local Character Authority motivates this ticket: STCHAR is the binding operational authority for a story entity, so the STENT↔STCHAR binding must be reciprocal and consistent — a one-way binding leaves the authority relationship ambiguous.
5. Canon Safety surface: new structural validator under `tools/validators/src/structural/` gating story-bundle binding integrity at validate-time / Hook 5. Read-only; mutates nothing; resolves no Mystery Reserve entry. Complements (does not replace) the existing one-way `stchar_resolves`.

## Architecture Check

1. A dedicated reciprocity validator is cleaner than extending `stchar_resolves` (which has a single, well-scoped one-way responsibility) — keeping the reciprocal check separate preserves single responsibility and lets the failure messages name the missing direction precisely.
2. No backwards-compatibility shim: both directions are hard `fail` checks; the validator reads records directly (it does not depend on SPEC-60's forthcoming `stchar_bound_stent` world-index edge, though it may consume that edge later).

## Verification Layers

1. A non-background `STENT.bound_stchar_id` that is absent from that STCHAR's `bound_stent_ids[]` fails -> schema validation (one-way fixture).
2. A `STCHAR.bound_stent_ids[]` entry that resolves to an STENT whose `bound_stchar_id` does not point back fails -> schema validation (one-way fixture, reverse direction).
3. A matched reciprocal pair passes -> pass fixture.
4. Validator registered in `structuralValidators` and named in `tests/structural/registry.test.ts` -> codebase grep-proof.

## Landed Changes

### 1. New validator module

Created `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts` exporting `Validator` named `stchar_bound_stent_reciprocity`, `severity_mode: "fail"`. `run`:
- for every non-background `STENT` (`role_in_story != [background]`) with a `bound_stchar_id`, assert that STCHAR's `bound_stent_ids[]` contains the STENT;
- for every `STCHAR.bound_stent_ids[]` entry, assert the referenced STENT's `bound_stchar_id` points back to that STCHAR.

It emits one fail verdict per unreciprocated binding, naming the missing direction.

### 2. Register in the structural registry

Added the import + array entry in `tools/validators/src/public/registry.ts`; added the name to the ordered list in `tools/validators/tests/structural/registry.test.ts`; updated package inventory and capstone/pre-apply validator-count assertions.

### 3. Test fixtures

Added inline structural test fixtures matching the existing STCHAR validator test style: matched pair (pass), STENT→STCHAR with no back-reference (fail), STCHAR→STENT with no back-reference (fail), and background STENT exemption (pass).

## Files to Touch

- `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — import + `structuralValidators` array entry
- `tools/validators/tests/structural/registry.test.ts` (modify) — add name to the ordered `deepEqual` name list
- `tools/validators/tests/structural/stchar-bound-stent-reciprocity.test.ts` (new) — validator unit tests
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — structural/mechanized validator count assertion
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — pre-apply STCHAR validator execution-count assertion
- `tools/validators/README.md` (modify) — structural validator count/inventory update

## Out of Scope

- The one-way `stchar_resolves` validator (unchanged).
- SPEC-60's world-index `stchar_bound_stent` edge extraction (separate spec, parallel).
- The `background`-role exemption logic beyond reading `role_in_story` (no role-enum changes).

## Acceptance Criteria

### Tests That Must Pass

1. A one-way binding (either direction) produces a `severity_mode: "fail"` verdict.
2. A matched reciprocal pair passes.
3. `npm test --prefix tools/validators` passes, including `tests/structural/registry.test.ts` (name list now includes `stchar_bound_stent_reciprocity`).

### Invariants

1. Both directions of the STENT↔STCHAR binding are checked; a binding is valid only when each side references the other.
2. Background-role STENTs (with `bound_stchar_id: null`) are exempt; the validator mutates no records and resolves no Mystery Reserve entry.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-bound-stent-reciprocity.test.ts` — inline fixture-driven fail/pass cases per §3.
2. `tools/validators/tests/structural/registry.test.ts` — extend the ordered name-list assertion.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — update the mechanized validator-count assertion.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — update the clean pre-apply STCHAR validator execution-count assertion.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`

## Outcome

Completed: 2026-05-21.

Implemented the read-only `stchar_bound_stent_reciprocity` structural validator and registered it with the validators package. The validator enforces both sides of the story-local `STENT` to `STCHAR` binding: non-background STENT records must be listed by their bound STCHAR, and every STCHAR `bound_stent_ids[]` entry must point at an STENT whose `bound_stchar_id` points back.

The implementation also updated the validator inventory and registry/pre-apply count assertions that changed when the new validator was registered. No world content was mutated.

## Verification Result

Passed:

1. `npm run build --prefix tools/validators`
2. From `tools/validators`: `node --test dist/tests/structural/stchar-bound-stent-reciprocity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js`
3. From `tools/validators`: `node --test dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/stchar-bound-stent-reciprocity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js`
4. `npm test --prefix tools/validators` — 799 tests passed.

## Deviations

- The drafted separate fixture-directory wording was narrowed to inline structural test fixtures, matching the existing STCHAR validator test style.
- Full-suite verification exposed same-seam registry/pre-apply count assertions in `spec04-verification.test.ts` and `validate-patch-plan.test.ts`; those proof surfaces were updated and rerun.
