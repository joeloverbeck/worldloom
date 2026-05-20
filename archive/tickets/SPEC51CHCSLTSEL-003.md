# SPEC51CHCSLTSEL-003: MCP STPLAN/STEMO list/schema parity + drift guard

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp`'s shared story-bundle node-type registry plus `list_records` and `get_record_schema` supported-type allowlists/maps to cover `story_plan_record` / `story_emotion_record`; adds a meta-test reconciling `list_records` against all story-bundle node types and `get_record_schema` against schema-backed story-bundle node types.
**Deps**: None

## Problem

At intake, `list_records` and `get_record_schema` omitted `story_plan_record` and `story_emotion_record` from their hand-maintained per-tool allowlists. Reassessment also found `tools/world-mcp/src/tools/_shared.ts` `STORY_BUNDLE_NODE_TYPES` omitted both types, even though the world-index canonical registry and context-packet reader already handled them. The machine layer therefore contradicted SPEC-50 E.2's targeted-retrieval discipline: a story skill could read an STPLAN/STEMO summary in a context packet but could not list those records or discover their schema through the documented MCP surfaces. This ticket adds the two node types to the shared story-bundle registry, both tools, and a drift guard.

## Assumption Reassessment (2026-05-20)

1. `tools/world-mcp/src/tools/list-records.ts` declared `SUPPORTED_LIST_RECORD_TYPES` + `RECORD_TYPE_TO_NODE_TYPE` without the two story node types. `tools/world-mcp/src/tools/get-record-schema.ts` declared `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` + `NODE_TYPE_TO_SCHEMA_FILE` with the same omission. Reassessment corrected a draft assumption: `tools/world-mcp/src/tools/_shared.ts` `STORY_BUNDLE_NODE_TYPES` also omitted both types, which meant `list_records` would not treat them as story-scoped even if the per-tool allowlist was extended. The schema files `tools/validators/src/schemas/story-plan.schema.json` and `story-emotion.schema.json` exist for the schema-file map. The error-response surfaces (`supported_record_types`, `supported_node_types`) reflect the allowlists automatically — no extra wiring.
2. SPEC-51 §Approach B.1/B.2 + §Risks "B drift guard scope" (the meta-test reconciles only these two parity allowlists; other per-tool allowlists are out of scope).
3. Cross-artifact boundary under audit: `tools/world-index` parser/node types, `tools/world-mcp` shared story-bundle registry, and the two MCP tool allowlists must agree for schema-backed STPLAN/STEMO retrieval. The drift guard makes the list-records-vs-registry relationship tested for every story-bundle node type and the get-record-schema-vs-registry relationship tested for story-bundle node types that have validator schema files. Schema-less story-bundle surfaces (`audit_record_story`, `promotion_record`, `storylet_batch_manifest`, `remediation_storylet_proposal_card`) remain intentionally excluded from `get_record_schema`.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation (Index + Targeted Retrieval). Restate before trusting the spec narrative: B surfaces *existing* records through the *documented* retrieval surfaces — it adds no new packet projection and inverts no Index+Follow-Up contract (SPEC-50 E.2 rejected packet *enrichment*; allowlist parity is not enrichment).

## Architecture Check

1. Adding the two node types to the allowlists + maps is the minimal additive change; referencing the canonical registry in a meta-test converts the per-tool-allowlist failure mode (silent omission of a new class) into a caught regression. Cleaner than maintaining three hand-synced lists by hope.
2. No backwards-compatibility shim: the additions are additive; existing supported types and callers are untouched.

## Verification Layers

1. `list_records(record_type="story_plan_record"|"story_emotion_record")` returns rows -> world-mcp tool test.
2. `get_record_schema(node_type="story_plan_record"|"story_emotion_record")` returns each schema -> world-mcp tool test.
3. Story-slug scoping disambiguates duplicate IDs across stories -> tool test.
4. Allowlist-vs-registry drift guard -> meta-test fails if `list_records` drops a `STORY_BUNDLE_NODE_TYPES` member or if `get_record_schema` drops a schema-backed `STORY_BUNDLE_NODE_TYPES` member (FOUNDATIONS §Tooling Recommendation: the documented retrieval surface stays complete where a retrieval/schema surface exists).

## What to Change

### 1. Extend the shared story-bundle registry and `list_records`

Added `story_plan_record` and `story_emotion_record` to `STORY_BUNDLE_NODE_TYPES` in `tools/world-mcp/src/tools/_shared.ts`, then to `SUPPORTED_LIST_RECORD_TYPES` and `RECORD_TYPE_TO_NODE_TYPE` in `tools/world-mcp/src/tools/list-records.ts`.

### 2. Extend `get_record_schema`

Added both node types to `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and mapped them to `story-plan.schema.json` / `story-emotion.schema.json` in `NODE_TYPE_TO_SCHEMA_FILE` in `tools/world-mcp/src/tools/get-record-schema.ts`.

### 3. Drift-guard meta-test

Added a meta-test asserting `list_records` supports every `STORY_BUNDLE_NODE_TYPES` member and `get_record_schema` supports every schema-backed `STORY_BUNDLE_NODE_TYPES` member while intentionally rejecting schema-less story-bundle node types.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify — add the two-type list cases)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — add the two-type schema cases)
- `tools/world-mcp/tests/tools/story-node-type-parity.test.ts` (new — the allowlist-vs-registry drift guard)

## Out of Scope

- Any new MCP packet surface or context-packet enrichment (SPEC-50 E.2 rejected; §5b).
- Other per-tool allowlists beyond these two (§Risks "B drift guard scope").
- The trace validator (002), world-index edge fix (004), skill prose (005).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test` from `tools/world-mcp` — `list_records` and `get_record_schema` return rows/schema for both story node types; story-slug scoping remains enforced by the story-bundle list path.
2. `node --test dist/tests/tools/list-records.story-bundle.test.js dist/tests/tools/get-record-schema.test.js dist/tests/tools/story-node-type-parity.test.js` from `tools/world-mcp` — focused proof for list/schema additions and the drift guard.
3. `npm run build` from `tools/world-mcp` — type-checks with the extended registries, allowlists, and maps.

### Invariants

1. `list_records` remains a superset of `STORY_BUNDLE_NODE_TYPES`, and `get_record_schema` remains complete for schema-backed story-bundle node types (enforced by the meta-test).
2. The additions are additive — no existing supported type or caller behavior changes.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify) — list cases for both story node types through the story-scoped path.
2. `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify) — schema-return cases for both node types.
3. `tools/world-mcp/tests/tools/story-node-type-parity.test.ts` (new) — `list_records` covers all story-bundle node types; `get_record_schema` covers schema-backed story-bundle node types.

### Commands

1. From `tools/world-mcp`: `npm test`
2. From `tools/world-mcp`: `npm run build`
3. Narrow boundary: world-mcp-package-only — `list_records`/`get_record_schema` are world-mcp surfaces; the canonical registry is read, not modified.

## Outcome

Completed 2026-05-20.

`story_plan_record` and `story_emotion_record` are now first-class story-bundle node types in `tools/world-mcp/src/tools/_shared.ts`. `list_records` can list both classes through the story-scoped path, and `get_record_schema` can return `story-plan.schema.json` / `story-emotion.schema.json` with source paths and required-field metadata. The new parity test protects against future drift by comparing `list_records` to the full story-bundle registry and `get_record_schema` to the schema-backed subset of that registry.

## Verification Result

1. Pre-edit baseline from `tools/world-mcp`: `npm test` — PASS, 407 tests passed.
2. `npm run build` from `tools/world-mcp` — PASS after implementation.
3. First focused run from `tools/world-mcp`: `node --test dist/tests/tools/list-records.story-bundle.test.js dist/tests/tools/get-record-schema.test.js dist/tests/tools/story-node-type-parity.test.js` — FAIL, exposed two reassessment corrections: `_shared.ts` needed STPLAN/STEMO for story-scoped list behavior, and `get_record_schema` parity must exclude story-bundle node types with no validator schema file.
4. Focused rerun from `tools/world-mcp`: `node --test dist/tests/tools/list-records.story-bundle.test.js dist/tests/tools/get-record-schema.test.js dist/tests/tools/story-node-type-parity.test.js` — PASS, 21 tests passed.
5. Final package proof from `tools/world-mcp`: `npm test` — PASS, 410 tests passed.

## Deviations

- The draft said `STORY_BUNDLE_NODE_TYPES` already included both STPLAN/STEMO node types; live reassessment found it did not, so `_shared.ts` was added to the owned file set.
- The drafted drift guard described both tool allowlists as supersets of `STORY_BUNDLE_NODE_TYPES`. The implemented guard keeps `list_records` as the full story-bundle superset and scopes `get_record_schema` to schema-backed story-bundle node types because `audit_record_story`, `promotion_record`, `storylet_batch_manifest`, and `remediation_storylet_proposal_card` have no validator schema files in the live checkout.
