# SPEC23STOSTACON-003: Clean PG schema + add nested validation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-page.schema.json`, affected tests under `tools/validators/tests/`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

`tools/validators/src/schemas/story-page.schema.json` carries two stale required fields the post-SPEC23STOSTACON-001 contract explicitly forbids: `prose_status` (enum `pending | rendered | superseded`) and `deferred_validation_trace`. Contract §4.2 line 139 states: "There is no `prose_status` field." Contract §4.2 lines 128-136 specify `validation_trace` (no `deferred_` prefix; one PASS entry per shared hard gate with a one-line rationale). The stale fields trace back to a pre-rebuild PG lifecycle model that has been replaced by the plan-authority boundary (FOUNDATIONS §Story Bundles §4a — rendered prose is informational, not a lifecycle stage).

Concurrently, the page schema is missing nested validation for three blocks that the post-SPEC23STOSTACON-001 contract specifies with closed enums: `state_snapshot.entity_status` (3 nested enums for `life | agency | location`), `state_snapshot.unresolved_mystery_claims[].status` (5-value enum), and `state_snapshot.visible_affordances[].action_families[]` (20-value shared `action_family` taxonomy). Without nested validation, a malformed PG record (e.g., `life: "incapacitated"` which post-SPEC23STOSTACON-001 has moved to agency) would pass schema validation and surface only at retrieval-time failure.

This ticket performs both edits atomically — removing the stale fields and updating the affected tests, then adding the nested validation in the same diff — because partial completion (stale fields removed but new validation absent) would leave the schema in a regressed state.

## Assumption Reassessment (2026-05-13)

1. Current schema state verified: `tools/validators/src/schemas/story-page.schema.json` lines 5, 19-32 declare `prose_status` and `deferred_validation_trace` as required. Tests at `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` lines 19, 20, 36, 37 use these fields; tests at `tools/validators/tests/integration/validate-patch-plan.test.ts` lines 467, 489 also use `prose_status`.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.2 line 139 ("There is no `prose_status` field"); contract `entity_status` block at lines 102-106 post-SPEC23STOSTACON-001 carries the new 3-enum sets; `unresolved_mystery_claims[].status` at line 116 carries the 5-value set; `visible_affordances[].action_families` at line 112 references the shared `action_family` taxonomy.
3. Cross-artifact boundary under audit: page-schema is consumed by validator pipeline + tests; removing required fields without updating consumers produces hard-failures. Boundary: schema's required[] list and properties[] block; consumers are tests + `tools/validators/src/structural/` indexed-record loaders that read `prose_status` / `deferred_validation_trace`.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts). The post-SPEC23STOSTACON-001 contract drops `prose_status` because the field has no load-bearing consumer in the rebuilt skill family (prose attachment is opt-in via `branching-story-prose-attach` `emit_attach_event` flag, not via a PG lifecycle column). The nested-enum additions make the contract's PG sub-paths load-bearing through schema validation.
5. Skill / tool / hook / validator field rename or removal (menu item 7 per `tickets/_TEMPLATE.md`): `prose_status` and `deferred_validation_trace` are removed. Blast radius grep: `grep -rnE "prose_status|deferred_validation_trace" tools/ .claude/skills/ | grep -v "/dist/"` returns matches in `tools/validators/src/schemas/story-page.schema.json` (the schema itself) + `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (lines 19, 20, 36, 37) + `tools/validators/tests/integration/validate-patch-plan.test.ts` (lines 467, 489). No production-code consumers outside the schema; all blast radius is in tests, fixed in this ticket.
6. Adjacent contradictions: (a) The current schema's `prose_path` property at lines 9-13 documents "null when prose_status != 'rendered'" — this prose_path field is not in the contract's PG block lines 76-137 either; verify whether to retain (the contract has `rendered_prose.path` at line 125 — different path naming). Retain prose_path-equivalent under the contract's `rendered_prose.path` sub-structure. (b) `validation_trace` per contract §4.2 lines 128-136 has 8 named sub-keys (one per hard gate); the schema currently doesn't validate these — out of scope for this ticket (leave additionalProperties: true on validation_trace; gate-trace validation can land in a follow-up if needed).

## Architecture Check

1. Atomic stale-field removal + nested-validation addition is cleaner than two sequential tickets: the same `properties` block is touched, and partial completion leaves the schema in a regressed state (stale fields gone but new validation absent → no enforcement at all on the field surfaces the contract specifies as closed). One ticket avoids the regression window.
2. No backwards-compatibility shim: `prose_status` and `deferred_validation_trace` are deleted from the schema and from tests without aliasing. Spec §Risks §138 + empty `worlds/erotica-world/stories/` directory means no production PG records carry these fields.

## Verification Layers

1. Schema's `required[]` no longer lists `prose_status` or `deferred_validation_trace` → schema validation: `jq -r '.required[]' tools/validators/src/schemas/story-page.schema.json` returns set excluding the two fields.
2. Schema's `properties` no longer defines `prose_status` or `deferred_validation_trace` → schema validation: `jq '.properties | has("prose_status") or has("deferred_validation_trace")' tools/validators/src/schemas/story-page.schema.json` returns `false`.
3. Schema's `properties.state_snapshot.properties.entity_status` validates the 3 sub-enums (life / agency / location) per contract §4.2 lines 102-106 → schema validation: `jq '.properties.state_snapshot.properties.entity_status' tools/validators/src/schemas/story-page.schema.json` returns the nested enum structure.
4. Schema's `properties.state_snapshot.properties.unresolved_mystery_claims.items.properties.status.enum` has 5 values per contract line 116 → schema validation: `jq '.properties.state_snapshot.properties.unresolved_mystery_claims.items.properties.status.enum | length' tools/validators/src/schemas/story-page.schema.json` returns 5.
5. Schema's `properties.state_snapshot.properties.visible_affordances.items.properties.action_families.items.enum` has 20 values per shared taxonomy → schema validation: same `jq` pattern returns 20.
6. Affected tests pass against the new schema → `cd tools/validators && npm test`.

## What to Change

### 1. Remove stale fields from `tools/validators/src/schemas/story-page.schema.json`

- Drop `"prose_status"` and `"deferred_validation_trace"` from the `required` array at line 5; resulting required becomes `["id", "story_id", "prose_plan_path"]` (or whichever subset survives — confirm against contract §4.2 starred fields).
- Drop the `"prose_status"` and `"deferred_validation_trace"` properties from the `properties` block at lines 19-32.
- The `prose_path` property at lines 9-13 stays (the contract has `rendered_prose.path` for the same role); update its `description` to remove the dangling "null when prose_status != 'rendered'" reference. Recommended new description: `"Relative path to rendered prose; null until prose is attached via branching-story-prose-attach."`.

### 2. Add nested validation for `state_snapshot.entity_status`

Add property `state_snapshot` to the schema's `properties` block. Its sub-structure validates `entity_status` as an object whose values are objects with required `[life, agency, location]`:
- `life` enum: `["alive", "dead", "unknown"]`.
- `agency` enum: `["free", "constrained", "coerced", "captive", "incapacitated", "unconscious", "dead", "unknown"]`.
- `location`: `oneOf` between `{ type: "string", pattern: "^STLOC-[0-9]{4}$" }` and `{ enum: ["unknown", "concealed", "offstage"] }`.

Use `additionalProperties: true` at the entity_status level (entity ids are dynamic STENT-NNNN keys).

### 3. Add nested validation for `state_snapshot.unresolved_mystery_claims[].status`

Add `state_snapshot.unresolved_mystery_claims` as an array; items are objects with required `[mystery_id, authority, status]`:
- `mystery_id`: `{ type: "string", pattern: "^M-[0-9]{4}$" }`.
- `authority` enum: `["apparent", "branch_local_counterfactual", "canon_candidate"]`.
- `status` enum: `["preserved", "clue_added", "narrowed", "apparent_resolution", "held_for_promotion"]` (5 values per contract line 116 post-SPEC23STOSTACON-001).

### 4. Add nested validation for `state_snapshot.visible_affordances[].action_families[]`

Add `state_snapshot.visible_affordances` as an array; items are objects with required `[ordinal, label, grounded_in, available_to, action_families]`:
- `ordinal`: integer ≥ 0.
- `label`: `{ type: "string", minLength: 1 }`.
- `grounded_in`: array of record-id strings (STLOC / STOBJ patterns).
- `available_to`: array of STENT-id strings.
- `action_families`: array; items are `enum` over the shared 20-value `action_family` taxonomy from SPEC23STOSTACON-001.

### 5. Update affected tests

- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` lines 19-37: remove `prose_status` and `deferred_validation_trace` from test fixtures; if tests are exercising those fields' enum constraints specifically, replace with equivalent tests against the new `state_snapshot.entity_status` enum constraints.
- `tools/validators/tests/integration/validate-patch-plan.test.ts` lines 467, 489: remove `prose_status = "pending"` assignments; PG records constructed by these tests should match the post-SPEC23STOSTACON-001 contract shape.

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- Validation of `validation_trace` sub-keys (the 8 hard-gate PASS-with-rationale entries per contract §4.2 lines 128-136) — leave `additionalProperties: true` on `validation_trace`; gate-trace schema validation is a candidate follow-up if MR-firewall enforcement requires it.
- Adding required nested validation for the full PG `state_snapshot` (active_records, continuation block, plan, rendered_prose, emitted_choices) — out of scope; this ticket targets the three blocks the SPEC-23 reassessment specifically called out.
- Removing the schema's `additionalProperties: true` at the top level — would break round-tripping of PG records carrying author-supplied notes; out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `jq -r '.required[]' tools/validators/src/schemas/story-page.schema.json | grep -E "(prose_status|deferred_validation_trace)"` returns no matches.
3. `jq '.properties | has("prose_status") or has("deferred_validation_trace")' tools/validators/src/schemas/story-page.schema.json` returns `false`.
4. `jq '.properties.state_snapshot.properties.entity_status' tools/validators/src/schemas/story-page.schema.json` returns a non-null object.
5. `jq '.properties.state_snapshot.properties.unresolved_mystery_claims.items.properties.status.enum | length' tools/validators/src/schemas/story-page.schema.json` returns 5.
6. `jq '.properties.state_snapshot.properties.visible_affordances.items.properties.action_families.items.enum | length' tools/validators/src/schemas/story-page.schema.json` returns 20.

### Invariants

1. PG records carrying `prose_status` or `deferred_validation_trace` keys produce a schema-validation FAIL (additionalProperties at the top-level remains `true`, so the keys are allowed; but the `required` constraint no longer demands them — the assertion is that consumers don't depend on them).
2. The schema's `state_snapshot.entity_status.<STENT-id>.life | agency | location` enums are strictly the post-SPEC23STOSTACON-001 sets — adding `"missing"` to life (a dropped value) produces schema FAIL.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — drop `prose_status` + `deferred_validation_trace` test fixtures; add a fixture exercising the new nested enum validation (PG record with valid `state_snapshot.entity_status` PASSes; PG record with `life: "missing"` FAILs).
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — drop `prose_status` assignments from test fixtures; ensure existing patch-plan integration coverage still passes against the cleaned schema.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `grep -rnE "prose_status|deferred_validation_trace" tools/ | grep -v "/dist/"` returns no matches (schema + tests cleaned).
3. `jq '.properties.state_snapshot.properties' tools/validators/src/schemas/story-page.schema.json` returns the three nested-validation blocks (entity_status, unresolved_mystery_claims, visible_affordances).
