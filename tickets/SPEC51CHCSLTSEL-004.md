# SPEC51CHCSLTSEL-004: World-index CHC affordance-ordinal field fix

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — corrects `tools/world-index/src/parse/atomic.ts`'s `edgesForChoice` to anchor `choice_affordance_ordinal` edges on the schema-correct field; corrects + schema-validates two masking parser fixtures.
**Deps**: None

## Problem

`edgesForChoice` (`tools/world-index/src/parse/atomic.ts:716`) reads a non-schema field `parent_page_id` to anchor the `choice_affordance_ordinal` edge, but the `CHC` schema (`tools/validators/src/schemas/story-choice.schema.json`) has no such field — it uses `created_at_page` with `additionalProperties: false`. SPEC-50 C.1 (`SPEC50STPSTECHC-005`) introduced `edgesForChoice` reading the wrong field, and two parser fixtures mask the bug by injecting the illegal `parent_page_id`. A schema-conformant `CHC` therefore produces affordance-ordinal edges anchored to the `CHC` node id instead of its creating page, so affordance-grounded choices are not queryable by page. This ticket fixes the field read and makes the masking fixtures schema-conformant + schema-validated (SPEC-51 §Approach C).

## Assumption Reassessment (2026-05-20)

1. `tools/world-index/src/parse/atomic.ts:716` reads `parent_page_id` for the `choice_affordance_ordinal` parent anchor (verified). `tools/validators/src/schemas/story-choice.schema.json` requires `created_at_page` and sets `additionalProperties: false` (verified) — so a real CHC never carries `parent_page_id`, and the edge falls back to the CHC node id. The masking fixtures are `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts:16` and `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (both inject `parent_page_id`; neither is schema-validated). The edge target keeps the SPEC-50 form `<page-node-id>#affordance:<ordinal>` — only the source field changes.
2. SPEC-51 §Approach C.1/C.2; this is a corrective fix to a SPEC-50 regression (`SPEC50STPSTECHC-005`), not a new feature.
3. Cross-artifact boundary under audit: the world-index parser edge depends on the `CHC` JSON-schema field name owned by `tools/validators`. The fix re-aligns the parser to the schema; routing one fixture through `story-choice.schema.json` validation makes a future field-name drift fail the schema gate (the absence of fixture schema-validation is what masked this regression).
4. FOUNDATIONS principles motivating this ticket: Rule 1 No Floating Facts (affordance-ordinal grounding becomes queryable against the real creating page rather than floating on the wrong anchor) and §Tooling Recommendation (the index edge resolves to the correct page node so retrieval/audits can query affordance-grounded choices by page). Restate before trusting the spec narrative: the fix restores queryability the regression silently broke.

## Architecture Check

1. Reading `created_at_page` (the actual schema field) instead of `parent_page_id` (a non-field) is the correct anchor; schema-validating at least one fixture converts the silent-masking failure mode into a gated one. Cleaner than special-casing the non-field.
2. No backwards-compatibility shim: the wrong field read is replaced, not aliased; no fallback to `parent_page_id` is retained.

## Verification Layers

1. `edgesForChoice` anchors on `created_at_page` -> codebase grep-proof (`parent_page_id` no longer read in `edgesForChoice`).
2. Schema-conformant CHC produces page-anchored affordance-ordinal edges -> parser test with a `created_at_page` fixture validated against `story-choice.schema.json`.
3. A fixture carrying the old `parent_page_id` fails schema validation -> negative schema-validation assertion (Rule 1 / §Tooling alignment: the masking path is now gated).

## What to Change

### 1. Fix the field read

In `tools/world-index/src/parse/atomic.ts` `edgesForChoice`, read `created_at_page` instead of `parent_page_id` for the `choice_affordance_ordinal` parent anchor. Keep the edge-target form `<page-node-id>#affordance:<ordinal>`.

### 2. Correct + schema-validate the fixtures

Replace `parent_page_id` with `created_at_page` in `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` and `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`. Route the CHC fixture through `story-choice.schema.json` validation in at least one test so a future field-name drift fails the schema gate.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify)

## Out of Scope

- Any change to the `CHC` schema itself (the schema is correct; the parser was wrong).
- The edge-target string form (unchanged from SPEC-50).
- The trace validator (002), MCP parity (003), skill prose (005).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-index` — a schema-conformant CHC (with `created_at_page`, validated against `story-choice.schema.json`) produces `choice_affordance_ordinal` edges anchored to the page node; corrected fixtures still assert the intended edge set.
2. Grep-proof: `grep -n "parent_page_id" tools/world-index/src/parse/atomic.ts` returns zero matches in `edgesForChoice`.
3. A fixture carrying the old `parent_page_id` fails `story-choice.schema.json` validation (negative assertion).

### Invariants

1. `choice_affordance_ordinal` edges anchor on the CHC's creating page (`created_at_page`), never on the CHC node id.
2. World-index parser fixtures for CHC are schema-conformant — no illegal fields under `additionalProperties: false`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify) — `created_at_page` fixture; page-anchored edge assertion.
2. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify) — `created_at_page` fixture; schema-validated.

### Commands

1. `npm test --prefix tools/world-index`
2. `npm run build --prefix tools/world-index`
3. Narrow boundary: world-index-package-only — the fix is parser-local; the `CHC` schema (owned by `tools/validators`) is read for fixture validation, not modified.
