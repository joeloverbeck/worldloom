# SPEC51CHCSLTSEL-004: World-index CHC affordance-ordinal field fix

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — corrects `tools/world-index/src/parse/atomic.ts`'s `edgesForChoice` to anchor `choice_affordance_ordinal` edges on the schema-correct field; corrects two masking parser fixtures and adds a schema-file-backed field-contract assertion.
**Deps**: None

## Problem

At intake, `edgesForChoice` (`tools/world-index/src/parse/atomic.ts`) read a non-schema field `parent_page_id` to anchor the `choice_affordance_ordinal` edge, but the `CHC` schema (`tools/validators/src/schemas/story-choice.schema.json`) has no such field — it uses `created_at_page` with `additionalProperties: false`. SPEC-50 C.1 (`SPEC50STPSTECHC-005`) introduced `edgesForChoice` reading the wrong field, and two parser fixtures masked the bug by injecting the illegal `parent_page_id`. A schema-conformant `CHC` therefore produced affordance-ordinal edges anchored to the `CHC` node id instead of its creating page, so affordance-grounded choices were not queryable by page. This ticket fixed the field read and made the masking fixtures schema-conformant, with a schema-file-backed assertion that the old `parent_page_id` top-level field is rejected by the `story-choice.schema.json` field contract (SPEC-51 §Approach C).

## Assumption Reassessment (2026-05-20)

1. At intake, `tools/world-index/src/parse/atomic.ts` read `parent_page_id` for the `choice_affordance_ordinal` parent anchor. `tools/validators/src/schemas/story-choice.schema.json` requires `created_at_page` and sets `additionalProperties: false` — so a real CHC never carried `parent_page_id`, and the edge fell back to the CHC node id. The masking fixtures were `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` and `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (both injected `parent_page_id`; neither had a schema-file-backed rejection assertion). The landed edge target keeps the SPEC-50 form `<page-node-id>#affordance:<ordinal>` — only the source field changed.
2. SPEC-51 §Approach C.1/C.2; this is a corrective fix to a SPEC-50 regression (`SPEC50STPSTECHC-005`), not a new feature.
3. Cross-artifact boundary under audit: the world-index parser edge depends on the `CHC` JSON-schema field name owned by `tools/validators`. The fix re-aligns the parser to the schema; checking one fixture against `story-choice.schema.json`'s top-level field contract makes this field-name drift fail the test gate (the absence of fixture schema-contract checking is what masked this regression).
4. FOUNDATIONS principles motivating this ticket: Rule 1 No Floating Facts (affordance-ordinal grounding becomes queryable against the real creating page rather than floating on the wrong anchor) and §Tooling Recommendation (the index edge resolves to the correct page node so retrieval/audits can query affordance-grounded choices by page). Restate before trusting the spec narrative: the fix restores queryability the regression silently broke.

## Architecture Check

1. Reading `created_at_page` (the actual schema field) instead of `parent_page_id` (a non-field) is the correct anchor; schema-file-backed field-contract checking for at least one fixture converts the silent-masking failure mode into a gated one. Cleaner than special-casing the non-field.
2. No backwards-compatibility shim: the wrong field read is replaced, not aliased; no fallback to `parent_page_id` is retained.

## Verification Layers

1. `edgesForChoice` anchors on `created_at_page` -> codebase grep-proof (`parent_page_id` no longer read in `edgesForChoice`).
2. Schema-conformant CHC produces page-anchored affordance-ordinal edges -> parser tests with `created_at_page` fixtures.
3. A fixture carrying the old `parent_page_id` fails the `story-choice.schema.json` top-level field contract -> schema-file-backed negative assertion (Rule 1 / §Tooling alignment: the masking path is now gated).

## Landed Changes

### 1. Fix the field read

In `tools/world-index/src/parse/atomic.ts` `edgesForChoice`, the `choice_affordance_ordinal` parent anchor now reads `created_at_page` instead of `parent_page_id`. The edge-target form remains `<page-node-id>#affordance:<ordinal>`.

### 2. Correct + schema-check the fixtures

Replaced `parent_page_id` with `created_at_page` in `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` and `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`. `atomic-story-edge-parity.test.ts` now loads `tools/validators/src/schemas/story-choice.schema.json` and asserts the valid CHC fixture satisfies the schema's top-level required/allowed-field contract while the legacy `parent_page_id` fixture is rejected.

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

1. `npm test --prefix tools/world-index` — a schema-conformant CHC (with `created_at_page`) produces `choice_affordance_ordinal` edges anchored to the page node; corrected fixtures still assert the intended edge set.
2. Grep-proof/manual review: `edgesForChoice` in `tools/world-index/src/parse/atomic.ts` reads `created_at_page`; remaining `parent_page_id` reads in the file belong to page/event parent-page edges, not CHC affordance-ordinal anchoring.
3. `atomic-story-edge-parity.test.ts` proves a fixture carrying the old `parent_page_id` fails the `story-choice.schema.json` top-level field contract (negative assertion).

### Invariants

1. `choice_affordance_ordinal` edges anchor on the CHC's creating page (`created_at_page`), never on the CHC node id.
2. World-index parser fixtures for CHC are schema-conformant — no illegal fields under `additionalProperties: false`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modified) — `created_at_page` fixture; page-anchored edge assertion.
2. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modified) — `created_at_page` fixture; schema-file-backed top-level field-contract assertion.

### Commands

1. `npm run build --prefix tools/world-index`
2. `node --test tools/world-index/dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js tools/world-index/dist/tests/parse/atomic-story-edge-parity.test.js`
3. `npm test --prefix tools/world-index`
4. Narrow boundary: world-index-package-only — the fix is parser-local; the `CHC` schema (owned by `tools/validators`) is read for fixture validation, not modified.

## Outcome

Completed: 2026-05-20.

`edgesForChoice` now anchors `choice_affordance_ordinal` edges through the schema-correct `created_at_page` field. The two masking CHC parser fixtures now use `created_at_page`, and `atomic-story-edge-parity.test.ts` adds a schema-file-backed assertion that the valid fixture satisfies the `story-choice.schema.json` top-level field contract while a legacy `parent_page_id` fixture is rejected.

## Verification Result

1. `npm run build --prefix tools/world-index` — PASS before implementation and PASS after implementation.
2. `node --test tools/world-index/dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js tools/world-index/dist/tests/parse/atomic-story-edge-parity.test.js` — first post-edit run exposed the expected parity-edge update (`created_at_page` replaces the illegal `parent_page` edge for the CHC case); final rerun PASS, 4 tests.
3. `npm test --prefix tools/world-index` — PASS after implementation, 125 tests.
4. Manual grep/review — `edgesForChoice` reads `created_at_page`; remaining `parent_page_id` reads in `tools/world-index/src/parse/atomic.ts` are the existing page/event parent-page edge paths, not the CHC affordance-ordinal path.

## Deviations

- The schema assertion is intentionally scoped to the top-level field contract loaded from `story-choice.schema.json` (`required`, `properties`, and `additionalProperties`) because this ticket's masking regression was the illegal top-level `parent_page_id` field. No full Ajv dependency was added to `tools/world-index`.
- Updating the CHC parity fixture from `parent_page_id` to `created_at_page` changed its generic reference edge from `parent_page` to `created_at_page`; the expected parity edge list was updated to match the schema-correct fixture.
