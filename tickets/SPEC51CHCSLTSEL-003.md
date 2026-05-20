# SPEC51CHCSLTSEL-003: MCP STPLAN/STEMO list/schema parity + drift guard

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp`'s `list_records` and `get_record_schema` supported-type allowlists + maps to cover `story_plan_record` / `story_emotion_record`; adds a meta-test reconciling both allowlists against the canonical story-bundle node-type registry.
**Deps**: None

## Problem

`list_records` and `get_record_schema` omit `story_plan_record` and `story_emotion_record` from their hand-maintained per-tool allowlists, even though the canonical registry (`tools/world-index/src/schema/types.ts` `NODE_TYPES`, `tools/world-mcp/src/tools/_shared.ts` `STORY_BUNDLE_NODE_TYPES`) includes them and `get_record`/`get_records`/context-packets already support them. The machine layer thus contradicts SPEC-50 E.2's own targeted-retrieval discipline: a story skill can read an STPLAN/STEMO summary in a context packet but cannot list those records or discover their schema through the documented MCP surfaces. This ticket adds the two node types to both tools and installs a drift guard so a future story-bundle record class cannot be added without surfacing through these surfaces (SPEC-51 §Approach B).

## Assumption Reassessment (2026-05-20)

1. `tools/world-mcp/src/tools/list-records.ts` declares `SUPPORTED_LIST_RECORD_TYPES` (line 21) + `RECORD_TYPE_TO_NODE_TYPE` map (line 115), both omitting the two story node types (verified). `tools/world-mcp/src/tools/get-record-schema.ts` declares `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` (line 13) + `NODE_TYPE_TO_SCHEMA_FILE` map (line 62), same omission (verified). The schema files `tools/validators/src/schemas/story-plan.schema.json` and `story-emotion.schema.json` exist (verified) for the schema-file map. The error-response surfaces (`supported_record_types`, `supported_node_types`) reflect the allowlists automatically (lines 376, 242) — no extra wiring. `STORY_BUNDLE_NODE_TYPES` already includes both types.
2. SPEC-51 §Approach B.1/B.2 + §Risks "B drift guard scope" (the meta-test reconciles only these two parity allowlists; other per-tool allowlists are out of scope).
3. Cross-artifact boundary under audit: the two MCP allowlists are derived-from-but-not-synced-with the canonical `STORY_BUNDLE_NODE_TYPES` registry. The drift guard makes the allowlist-vs-registry relationship a tested invariant rather than a hand-maintained coincidence.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation (Index + Targeted Retrieval). Restate before trusting the spec narrative: B surfaces *existing* records through the *documented* retrieval surfaces — it adds no new packet projection and inverts no Index+Follow-Up contract (SPEC-50 E.2 rejected packet *enrichment*; allowlist parity is not enrichment).

## Architecture Check

1. Adding the two node types to the allowlists + maps is the minimal additive change; referencing the canonical registry in a meta-test converts the per-tool-allowlist failure mode (silent omission of a new class) into a caught regression. Cleaner than maintaining three hand-synced lists by hope.
2. No backwards-compatibility shim: the additions are additive; existing supported types and callers are untouched.

## Verification Layers

1. `list_records(record_type="story_plan_record"|"story_emotion_record")` returns rows -> world-mcp tool test.
2. `get_record_schema(node_type="story_plan_record"|"story_emotion_record")` returns each schema -> world-mcp tool test.
3. Story-slug scoping disambiguates duplicate IDs across stories -> tool test.
4. Allowlist-vs-registry drift guard -> meta-test fails if either allowlist drops a `STORY_BUNDLE_NODE_TYPES` member (FOUNDATIONS §Tooling Recommendation: the documented retrieval surface stays complete).

## What to Change

### 1. Extend `list_records`

Add `story_plan_record` and `story_emotion_record` to `SUPPORTED_LIST_RECORD_TYPES` and `RECORD_TYPE_TO_NODE_TYPE` in `tools/world-mcp/src/tools/list-records.ts`.

### 2. Extend `get_record_schema`

Add both node types to `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and map them to `story-plan.schema.json` / `story-emotion.schema.json` in `NODE_TYPE_TO_SCHEMA_FILE` in `tools/world-mcp/src/tools/get-record-schema.ts`.

### 3. Drift-guard meta-test

Add a meta-test asserting both tools' supported-type allowlists are supersets of `STORY_BUNDLE_NODE_TYPES` (or otherwise reconcile against the canonical registry).

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify — add the two-type list cases)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — add the two-type schema cases)
- `tools/world-mcp/tests/tools/story-node-type-parity.test.ts` (new — the allowlist-vs-registry drift guard)

## Out of Scope

- Any new MCP packet surface or context-packet enrichment (SPEC-50 E.2 rejected; §5b).
- Other per-tool allowlists beyond these two (§Risks "B drift guard scope").
- The trace validator (002), world-index edge fix (004), skill prose (005).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` — `list_records` and `get_record_schema` return rows/schema for both story node types; story-slug scoping disambiguates duplicate IDs.
2. The new drift-guard meta-test fails when a `STORY_BUNDLE_NODE_TYPES` member is removed from either allowlist (verify by a transient deletion in a scratch run, then restore).
3. `npm run build --prefix tools/world-mcp` — type-checks with the extended allowlists + maps.

### Invariants

1. Both allowlists remain supersets of `STORY_BUNDLE_NODE_TYPES` (enforced by the meta-test).
2. The additions are additive — no existing supported type or caller behavior changes.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — list cases for both story node types + story-slug scoping.
2. `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify) — schema-return cases for both node types.
3. `tools/world-mcp/tests/tools/story-node-type-parity.test.ts` (new) — allowlist ⊇ `STORY_BUNDLE_NODE_TYPES` for both tools.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm run build --prefix tools/world-mcp`
3. Narrow boundary: world-mcp-package-only — `list_records`/`get_record_schema` are world-mcp surfaces; the canonical registry is read, not modified.
