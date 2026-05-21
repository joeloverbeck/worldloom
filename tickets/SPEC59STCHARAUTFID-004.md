# SPEC59STCHARAUTFID-004: `stchar_bound_stent_reciprocity` validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new structural validator in `tools/validators` registered in `structuralValidators`; no impact on existing validators (additive registry entry). Reads STENT and STCHAR records; mutates nothing.
**Deps**: None

## Problem

Only the one-way `STENT.bound_stchar_id → STCHAR` resolution is checked (by the existing `stchar_resolves` validator); the reciprocal `STCHAR.bound_stent_ids[] → STENT` direction is unverified, so a binding can be declared on one side without the other pointing back. SPEC-59 §2.4 adds `stchar_bound_stent_reciprocity` to enforce both directions.

## Assumption Reassessment (2026-05-21)

1. `STENT` carries `bound_stchar_id: STCHAR-<integer> | null` (null only when `role_in_story` is exactly `[background]`); `STCHAR` carries `bound_stent_ids: [STENT-<integer>]` (per `.claude/skills/_shared-templates/story-record-schemas.md`). The existing one-way validator is `tools/validators/src/structural/stchar-resolves.ts` (checks `STENT.bound_stchar_id` → STCHAR and `active_records.STCHAR` → STCHAR, no reciprocal). `role_in_story` includes the value `background`. No file `stchar-bound-stent-reciprocity.ts` exists yet. `tests/structural/registry.test.ts` asserts the ordered `structuralValidators` name list.
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

## What to Change

### 1. New validator module

Create `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts` exporting `Validator` named `stchar_bound_stent_reciprocity`, `severity_mode: "fail"`. `run`:
- for every non-background `STENT` (`role_in_story != [background]`) with a `bound_stchar_id`, assert that STCHAR's `bound_stent_ids[]` contains the STENT;
- for every `STCHAR.bound_stent_ids[]` entry, assert the referenced STENT's `bound_stchar_id` points back to that STCHAR.

Emit one fail verdict per unreciprocated binding, naming the missing direction.

### 2. Register in the structural registry

Import + array entry in `tools/validators/src/public/registry.ts`; add the name to the ordered list in `tools/validators/tests/structural/registry.test.ts`.

### 3. Fixtures

Add fixtures under `tools/validators/tests/fixtures/`: matched pair (pass), STENT→STCHAR with no back-reference (fail), STCHAR→STENT with no back-reference (fail).

## Files to Touch

- `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — import + `structuralValidators` array entry
- `tools/validators/tests/structural/registry.test.ts` (modify) — add name to the ordered `deepEqual` name list
- `tools/validators/tests/fixtures/` — new reciprocity fixtures (new)
- `tools/validators/tests/structural/stchar-bound-stent-reciprocity.test.ts` (new) — validator unit tests

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

1. `tools/validators/tests/structural/stchar-bound-stent-reciprocity.test.ts` — fixture-driven fail/pass cases per §3.
2. `tools/validators/tests/structural/registry.test.ts` — extend the ordered name-list assertion.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
