# SPEC25STOCOHHAR-001: STSTAT record class — machine layer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new `tools/validators/src/schemas/story-status.schema.json`; modifies validator, patch-engine, world-index, and world-mcp story-record registries for `STSTAT`; amends `.claude/skills/_shared-templates/story-state-contract.md`.
**Deps**: None

## Problem

`entity_status` (life / agency / location) on `PG.state_snapshot` is authored directly and has no record backing it. `SE.state_delta` carries only record-ID lists, so a death, captivity, or movement can silently fail to propagate across a page boundary or a fork — `snapshot-replay-equality.ts` explicitly excludes `entity_status` from replay because it is "not reconstructible from state_delta alone." This ticket lands the machine-layer foundation for a new `STSTAT` story-bundle record class so a later ticket (SPEC25STOCOHHAR-002) can make `entity_status` a replayable derived projection. Without a record class, there is nothing for the patch engine to allocate / write or the validator to schema-check.

## Assumption Reassessment (2026-05-14)

1. `tools/patch-engine/src/ops/create-story-record.ts` registers 15 `create_*_record` story ops, each with a config of `{allocationKey, idPattern, nodeType, sourceDir}` (verified: union type lines 22-36, op-name array lines 44-58, config block from line 65). STSTAT follows the same pattern: `allocationKey: "ststat_ids"`, pattern `^STSTAT-[0-9]+$`, `nodeType: "story_status_record"`, `sourceDir: "status"` (records land at `_source/status/STSTAT-<integer>.yaml`). `tools/patch-engine/src/envelope/schema.ts` carries a parallel operation-kind enum (story ops lines 74-88) and an `OperationBase<"create_*_record", StoryRecordPayload>` union (lines 211-221).
2. SPEC-25 D1 prescribes contract §4.5.13 (new), §3 record-class inventory (additional classes 12→13, total 16→17), and the §4 preamble count. Verified: the contract's §4.5 currently ends at §4.5.12 `CHC` (line 522) and the §4 preamble (line 63) reads "All 16 story-bundle record classes listed in §3."
3. Cross-artifact boundary under audit: the story-bundle record-creation contract spanning `.claude/skills/_shared-templates/story-state-contract.md` §4.5 ↔ `tools/validators/src/schemas/story-*.schema.json` ↔ `create-story-record.ts` op registry ↔ `envelope/schema.ts` op-kind enum ↔ `get-record-schema.ts` node-type map ↔ `allocate-next-id.ts` id-class registry ↔ `RECORD_TYPE_TO_SCHEMA` / `STRUCTURAL_NODE_TYPES` in `utils.ts` ↔ pre-apply overlay and ID-allocation race maps ↔ world-index story-source parsing and MCP retrieval/list vocabularies. STSTAT must appear consistently across all of these or the patch engine / allocator / `record_schema_compliance` / index-backed retrieval will reject or silently skip it.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope): every story-bundle record schema field must be load-bearing. Restated before trusting the spec: STSTAT's fields are all load-bearing — `life` / `agency` / `location` feed the `entity_status` replay projection (SPEC25STOCOHHAR-002), `derived_from` carries the `[SE]` causal chain that `snapshot_replay_equality` already enforces for record-based snapshots, `supersedes` carries the supersession chain, and `id` / `story_id` / `created_at_page` / `entity` are structural. No nice-to-have field is added.
5. Mismatch + correction (Issue 1, dispositioned **expand-scope-in-place** 2026-05-14): SPEC-25 D1 §Validator states `record_schema_compliance` "picks up the new schema automatically." It does not — `tools/validators/src/structural/record-schema-compliance.ts:232` iterates the explicit `RECORD_TYPE_TO_SCHEMA` map defined at `tools/validators/src/structural/utils.ts:69`. Without adding `story_status_record: "story-status"` there, STSTAT records are silently never schema-validated. This ticket's Files to Touch includes `utils.ts`; the spec narrative is not edited, the decomposition is sized against the registration the codebase actually requires.
6. Mismatch + correction (Issue 2, dispositioned **required same-seam fallout** 2026-05-14): live code also keeps explicit story-bundle registries in `tools/validators/src/_helpers/index-access.ts` (pre-apply overlay), `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`, `tools/patch-engine/src/commit/order.ts`, `tools/patch-engine/src/commit/temp-file.ts`, `tools/patch-engine/src/apply.ts`, `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/schema/types.ts`, `tools/world-index/src/commands/shared.ts`, `tools/world-index/src/enumerate.ts`, `tools/world-mcp/src/tools/_shared.ts`, and `tools/world-mcp/src/tools/list-records.ts`. These are absorbed into this ticket because they are the same machine-layer registry seam: without them a submitted or indexed `STSTAT` file would not remain first-class across validate/submit/index/retrieval.

## Architecture Check

1. A dedicated `STSTAT` class — rather than extending `STENT` with life / agency / location — keeps `STENT` as stable identity (`display_name` / `bound_char_id` / `role_in_story`) and gives status records clean `derived_from: [SE]` causal chaining, per SPEC-25 §Key design decisions. The machine layer treats STSTAT identically to the other 15 story ops, so no special-casing is introduced.
2. No backwards-compatibility aliasing / shims: STSTAT is a greenfield class (zero production story bundles per SPEC-25 §Problem), registered uniformly across the live machine-layer surfaces. The legacy `cast_change` op that once carried entity-status payloads is not reintroduced.

## Verification Layers

1. A `create_ststat_record` op round-trips through the patch engine -> patch-engine test: the op allocates `STSTAT-1` and writes `_source/status/STSTAT-1.yaml`.
2. The STSTAT schema is registered for validation -> codebase grep-proof: `story_status_record` present in `RECORD_TYPE_TO_SCHEMA` (`utils.ts`) and in `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` + the schema-file map (`get-record-schema.ts`).
3. STSTAT id allocation is story-scoped -> world-mcp test: `allocate_next_id(world, "STSTAT", story_slug)` returns `STSTAT-<n>` and rejects calls without `story_slug`.
4. Contract ↔ schema field parity -> schema validation: `story-status.schema.json` field list mirrors contract §4.5.13 exactly, `additionalProperties: false`.

## Landed Changes

### 1. Story-state contract — new §4.5.13 + §3 + §4 preamble

Add §4.5.13 `STSTAT` schema (the YAML field block from SPEC-25 D1: `id`, `story_id`, `created_at_page`, `supersedes` default null, `entity`, `life` enum, `agency` enum, `location`, `derived_from` default []). Add `STSTAT` to the §3 record-class inventory table (additional classes 12→13; total 16→17). Update the §4 preamble count line ("All 16 story-bundle record classes" → 17).

### 2. New JSON schema — story-status.schema.json

Create `tools/validators/src/schemas/story-status.schema.json` (JSON Schema 2020-12, `additionalProperties: false`) mirroring §4.5.13: `id`, `story_id`, `created_at_page`, `supersedes` (STSTAT-ref | null, default null), `entity` (STENT-ref), `life` (`alive | dead | unknown`), `agency` (`free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown`), `location` (STLOC-ref | `unknown` | `concealed` | `offstage`), `derived_from` (array, default []). Required: `id`, `story_id`, `created_at_page`, `entity`, `life`, `agency`, `location`.

### 3. Validator registration

Add `story_status_record: "story-status"` to `RECORD_TYPE_TO_SCHEMA` in `tools/validators/src/structural/utils.ts`.

### 4. MCP get-record-schema

Add `story_status_record` to `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and `story_status_record: "story-status.schema.json"` to the schema-file map in `tools/world-mcp/src/tools/get-record-schema.ts`.

### 5. Allocator

Register `STSTAT` in `tools/world-mcp/src/tools/allocate-next-id.ts`: add to `ID_CLASS_FORMATS` (`^STSTAT-[0-9]+$`) and to `STORY_SCOPED_ID_CLASS_DIRECTORIES` (`STSTAT: "status"`).

### 6. Patch engine — envelope schema + IdAllocations

Add `create_ststat_record` to the operation-kind enum in `tools/patch-engine/src/envelope/schema.ts` and to the `OperationBase<"create_ststat_record", StoryRecordPayload>` union. Add `ststat_ids` to the `IdAllocations` type in the same envelope schema module.

### 7. Patch engine — op registry

Register `create_ststat_record` in `tools/patch-engine/src/ops/create-story-record.ts`: union-type member, op-name array entry, and config entry `{allocationKey: "ststat_ids", idPattern: /^STSTAT-[0-9]+$/, nodeType: "story_status_record", sourceDir: "status"}`.

### 8. describe_envelope_schema

Surface the `create_ststat_record` op payload shape in `tools/world-mcp/src/tools/describe-envelope-schema.ts`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §3, §4 preamble, new §4.5.13)
- `tools/validators/src/schemas/story-status.schema.json` (new)
- `tools/validators/src/structural/utils.ts` (modify — `RECORD_TYPE_TO_SCHEMA`)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/src/tools/get-record.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/README.md` (modify — schema/id/list-record surface prose)
- `docs/MACHINE-FACING-LAYER.md` (modify — schema/id/list-record surface prose)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify)
- `tools/patch-engine/README.md` (modify — operation-vocabulary example)
- `tools/validators/src/_helpers/index-access.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/commands/shared.ts` (modify)
- `tools/world-index/src/enumerate.ts` (modify)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-status.test.ts` (new)
- `tools/world-index/tests/atomic-source-input.test.ts` (modify)
- `tools/world-index/tests/enumerate.test.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)

## Out of Scope

- Redefining `entity_status` as a derived projection or touching `snapshot_replay_equality` / `ACTIVE_RECORDS_CLASSES` — SPEC25STOCOHHAR-002.
- Any story-pipeline skill changes (emitting / reading STSTAT) — SPEC25STOCOHHAR-003.
- P0 #5 `BRSTAT` branch-status record and P1 #8 explicit causal-support validator — rejected by SPEC-25 §Out of Scope (structural).
- `STENT` schema changes — SPEC-25 deliberately chose a new class over extending `STENT`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build && npm run test` — a `create_ststat_record` op allocates `STSTAT-1` and writes `worlds/<slug>/stories/<slug>/_source/status/STSTAT-1.yaml`.
2. `cd tools/validators && npm run build && npm run test` — `record_schema_compliance` validates a well-formed `STSTAT` record and rejects one carrying an unknown field (`additionalProperties: false`).
3. `cd tools/world-index && npm run build && npm run test` — `_source/status/STSTAT-*.yaml` indexes as `story_status_record` and the node-type inventory reflects the new class.
4. `cd tools/world-mcp && npm run build && npm run test` — `allocate_next_id` returns a `STSTAT-<n>` id for a story-scoped call (and rejects a call missing `story_slug`); `get_record_schema("story_status_record")` returns the new schema.

### Invariants

1. STSTAT appears consistently across the machine surfaces (contract §4.5.13, `story-status.schema.json`, validator schema/type maps, pre-apply overlay, `get-record-schema` node-type map, allocator registry, patch-engine op/envelope/allocation registries, world-index story-source parser, and MCP retrieval/list vocabularies) — partial registration is a defect.
2. `story-status.schema.json` is `additionalProperties: false` and its field list is a byte-for-byte mirror of contract §4.5.13.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify) — add a `create_ststat_record` case alongside the existing 15 story-op cases.
2. `tools/validators/tests/structural/record-schema-compliance-story-status.test.ts` (new) — a STSTAT valid record + an invalid record (unknown field, missing required field), following the `record-schema-compliance-story-entity.test.ts` pattern.
3. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify) — add a `STSTAT` story-scoped allocation case and a missing-`story_slug` rejection case.
4. `tools/world-mcp/tests/tools/get-record-schema.test.ts` / `describe-envelope-schema.test.ts` / `list-records` coverage as needed — prove STSTAT is exposed through schema discovery and retrieval vocabularies.
5. `tools/world-index` story-bundle indexing tests as needed — prove `_source/status/STSTAT-*.yaml` indexes as `story_status_record`.

### Commands

1. `cd tools/patch-engine && npm run build && npm run test`
2. `cd tools/validators && npm run build && npm run test`
3. `cd tools/world-index && npm run build && npm run test`
4. `cd tools/world-mcp && npm run build && npm run test` — full-pipeline verification across all four touched packages (`npm run build` invokes `tsc`; there is no separate `typecheck` script in any package).

## Outcome

Completed on 2026-05-14. The live seam was wider than the draft's initial file list because STSTAT must be first-class across validator schema dispatch, patch-engine submission/staging/id allocation, world-index parsing/enumeration/node types, and MCP schema/id/list/get-record surfaces. No world-level canon files were changed.

What changed: the `STSTAT` story-bundle record class now has a shared contract schema, JSON schema validation, patch-engine creation path, patch-envelope/id-allocation handling, world-index parsing/enumeration, and world-mcp schema/id/list/get-record exposure.

## Deviations

- The live validator seam did not pick up the schema automatically as the draft spec implied; `story_status_record` had to be registered in the explicit structural schema map and structural-authority path filter.
- Same-seam registry fallout was required across patch-engine, world-index, and world-mcp so submitted, indexed, and retrieved `STSTAT` records remain first-class.
- `tools/world-index` verification required rebuilding before rerunning tests because the package test consumes compiled `dist` output.

## Verification Result

- PASS: `cd tools/world-index && npm run build`
- PASS: `cd tools/world-index && npm run test`
- PASS: `cd tools/patch-engine && npm run test`
- PASS: `cd tools/validators && npm run test`
- PASS: `cd tools/world-mcp && npm run test`
- PASS: `git diff --check`

One intermediate `tools/world-index` test run failed before rebuilding stale `dist`; one intermediate `tools/validators` run failed before adding `story_status_record` to the structural-authority file-path filter; one intermediate `tools/world-mcp` run failed before updating the closed `ID_CLASSES` enum. All were corrected and rerun green.
