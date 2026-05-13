# SPEC23STOSTACON-005: Add SE.event_kind enum to story-event schema

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-event.schema.json`, validator tests/fixtures, `specs/SPEC-23-story-state-contract-taxonomies.md`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

At intake, `tools/validators/src/schemas/story-event.schema.json` was a minimal 11-line shell that validated only `id` (pattern `^SE-[0-9]{4}$`) and `story_id`. It did not enforce the `event_kind` enum defined in the story-state contract §4.3. Post-SPEC23STOSTACON-001 the contract specifies a 7-value `event_kind` enum (`story_start | selected_choice | write_in_attempt | system_repair | audit_repair | prose_attach | promotion_closeout`) — dropping the legacy `world_block` (redundant with `outcome_route`) and splitting `repair` into `system_repair` and `audit_repair` for diagnostic clarity. Without schema-level enum enforcement, malformed SE records carrying a stale `event_kind: "world_block"` or `event_kind: "repair"` would pass schema validation and only fail later at retrieval or audit time.

## Assumption Reassessment (2026-05-13)

1. Intake schema state verified before implementation: `tools/validators/src/schemas/story-event.schema.json` required = `["id", "story_id"]`; properties block validated only `id` + `story_id` patterns; `additionalProperties: true` meant `event_kind` was allowed unconstrained.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.3 (post-SPEC23STOSTACON-001) specifies the 7-value enum; `outcome_route` separately retains `world_block` (the value is moved from event_kind to outcome_route only — not deleted entirely).
3. Cross-artifact boundary under audit: SE schema is consumed by the validator pipeline + tests; SE records are emitted by `branching-story-bootstrap` (event_kind: story_start), `branching-story-turn-cycle` (selected_choice / write_in_attempt / system_repair / audit_repair), `branching-story-prose-attach` (prose_attach), `branching-story-health-audit` (audit_repair semantics in remediation), `story-promotion-closeout` (promotion_closeout). The schema enum is the boundary the consumers depend on.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts). The contract specifies a closed enum; without schema enforcement, the enum is documentation only, not a load-bearing constraint. Adding the enum makes SE.event_kind a fully load-bearing field.
5. Schema extension classification (menu item 6 per `tickets/_TEMPLATE.md`): adding an enum constraint to an `additionalProperties: true` minimal schema is **additive** for valid post-SPEC23STOSTACON-001 records. It is breaking for any hypothetical legacy SE record carrying `event_kind: "world_block"` or `event_kind: "repair"` — but no such records exist (zero pre-existing story bundles verified).
6. Reassessment correction: making `event_kind` required affects existing validator package fixtures that create otherwise-valid `story_event_record` records for structural and integration proof. Those fixtures are same-seam proof fallout, not sibling scope, and must gain canonical `event_kind` values so the broad validators package lane remains a proof of this schema boundary instead of failing on stale test data.

## Architecture Check

1. Schema enforcement of closed enums is cleaner than runtime-only enforcement: the validator pipeline catches malformed `event_kind` values at patch-plan dry-run time (before the record lands), rather than at audit time when consequences have propagated.
2. No backwards-compatibility shim: `world_block` and `repair` are not aliased; spec §Key design decisions line 28 + §Deliverables line 72 explicitly require the trim. `world_block` survives at `outcome_route` (different field) where it remains semantically distinct.

## Verification Layers

1. Schema's `event_kind.enum` has 7 values per contract §4.3 → schema validation: `jq '.properties.event_kind.enum | length' tools/validators/src/schemas/story-event.schema.json` returns 7.
2. Stale values absent: `jq '.properties.event_kind.enum | tostring | test("world_block|^repair$")' tools/validators/src/schemas/story-event.schema.json` returns `false` (neither `world_block` nor bare `repair` in the enum).
3. New values present: `system_repair`, `audit_repair`, `prose_attach`, `promotion_closeout` all in the enum → comprehensive grep.
4. Validator package builds + tests pass → `cd tools/validators && npm run build`; `cd tools/validators && npm test`.

## Landed Changes

### 1. Added `event_kind` property + enum to story-event schema

Updated `tools/validators/src/schemas/story-event.schema.json`:
- Added `"event_kind"` to the `required` array; resulting required: `["id", "story_id", "event_kind"]`.
- Added `event_kind` property in the `properties` block:
  ```json
  "event_kind": {
    "enum": [
      "story_start",
      "selected_choice",
      "write_in_attempt",
      "system_repair",
      "audit_repair",
      "prose_attach",
      "promotion_closeout"
    ]
  }
  ```
- Preserved `additionalProperties: true` so SE records can carry `actor`, `targets`, `outcome_route`, `world_logic_rationale`, `state_delta`, `promotion_claims`, `parent_page_id`, `created_at_page` without each being individually schema-validated. Adding nested validation for the rest of the SE shape remains out of scope; this ticket targets only `event_kind`.

### 2. Added focused structural tests and refreshed SE fixtures

Added `record-schema-compliance-story-event.test.ts` coverage for every valid event kind, retired value rejection, and missing `event_kind` rejection. Refreshed same-seam valid SE fixtures/helpers in validator structural, rule, CLI, and integration tests with canonical `event_kind: "selected_choice"` values.

### 3. Updated SPEC-23 implementation notes

Added a dated implementation note to `specs/SPEC-23-story-state-contract-taxonomies.md` recording that `SPEC23STOSTACON-005` completed the SE schema update. Historical workstream rows remain as intake/decomposition context.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (new)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/rules/effect_model_replay_safety.test.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `specs/SPEC-23-story-state-contract-taxonomies.md` (modify)

## Out of Scope

- Adding nested validation for SE's other fields (`outcome_route`, `state_delta`, `promotion_claims`, etc.) — that work is candidate for a follow-up SE-fullsize-schema ticket if needed.
- Updating skill prose to reflect the split `system_repair` / `audit_repair` semantics — SPEC23STOSTACON-009.
- Contract amendment — `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` and `cd tools/validators && npm test` — validators build and full test lane pass.
2. SE record with `event_kind: "story_start"` PASSes schema validation.
3. SE record with `event_kind: "world_block"` FAILs schema validation.
4. SE record with `event_kind: "system_repair"` PASSes; with `event_kind: "audit_repair"` PASSes.
5. SE record without `event_kind` field FAILs (because it is now required).

### Invariants

1. SE.event_kind values are restricted to the 7 contract-canonical strings. Adding a new value requires amending the contract first (FOUNDATIONS §Story Bundles §5b discipline).
2. `outcome_route: "world_block"` (a different field, contract §4.3 + §6 action routing) remains a valid value — the trim is on `event_kind` only, not on `outcome_route`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — fixtures: (a) PASS for each of the 7 valid event_kind values; (b) FAIL for `event_kind: "world_block"` and `event_kind: "repair"`; (c) FAIL for missing `event_kind`.
2. Existing validator package tests with valid SE fixtures — canonical `event_kind` values added where the test record is meant to remain schema-valid.

### Commands

1. `cd tools/validators && npm run build` — validators package build.
2. `cd tools/validators && npm test` — full validators test lane.
3. `jq '.properties.event_kind.enum | length' tools/validators/src/schemas/story-event.schema.json` returns 7.
4. `jq '.properties.event_kind.enum | tostring | test("world_block|^repair$")' tools/validators/src/schemas/story-event.schema.json` returns `false`.
5. `jq -r '.required[]' tools/validators/src/schemas/story-event.schema.json` returns set including `event_kind`.

## Outcome

Completed on 2026-05-13. The SE JSON Schema now requires `event_kind` and constrains it to the seven post-SPEC23STOSTACON-001 contract values. Focused structural tests prove all valid values, reject retired `world_block` / `repair`, and reject missing `event_kind`. Existing validator package fixtures that model valid SE records now include canonical `event_kind: "selected_choice"`, and the SPEC-23 implementation notes record this ticket as completed.

## Verification Result

1. `jq '.properties.event_kind.enum | length' tools/validators/src/schemas/story-event.schema.json` — PASS; returned `7`.
2. `jq '.properties.event_kind.enum | tostring | test("world_block|^repair$")' tools/validators/src/schemas/story-event.schema.json` — PASS; returned `false`.
3. `jq -r '.required[]' tools/validators/src/schemas/story-event.schema.json` — PASS; returned `id`, `story_id`, `event_kind`.
4. `rg -n 'system_repair|audit_repair|prose_attach|promotion_closeout' tools/validators/src/schemas/story-event.schema.json` — PASS; all named enum values present.
5. `cd tools/validators && npm run build` — PASS.
6. `cd tools/validators && npm test` — PASS; 194 tests passed, including `record_schema_compliance accepts every contract SE event_kind value`, retired-value rejection, and missing-field rejection.

## Deviations

1. Reassessment added same-seam fixture/helper updates beyond the drafted single schema file because requiring `event_kind` would otherwise make existing valid SE records in the validator package stale.
2. `SPEC23STOSTACON-009` remains the owner for operational skill prose cleanup. Remaining `event_kind: world_block` / `event_kind: repair` mentions in that active ticket are its documented target scope, not active validator-package drift.
3. Pre-existing ignored validator artifacts `tools/validators/dist/` and `tools/validators/node_modules/` were present before package commands; `dist/` was refreshed by `npm run build` / `npm test`, and `node_modules/` was left in place.
