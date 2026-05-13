# SPEC23STOSTACON-005: Add SE.event_kind enum to story-event schema

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-event.schema.json`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

`tools/validators/src/schemas/story-event.schema.json` is a minimal 11-line shell that validates only `id` (pattern `^SE-[0-9]{4}$`) and `story_id`. It does not enforce the `event_kind` enum defined in the story-state contract §4.3 line 148. Post-SPEC23STOSTACON-001 the contract specifies a 7-value `event_kind` enum (`story_start | selected_choice | write_in_attempt | system_repair | audit_repair | prose_attach | promotion_closeout`) — dropping the legacy `world_block` (redundant with `outcome_route`) and splitting `repair` into `system_repair` and `audit_repair` for diagnostic clarity. Without schema-level enum enforcement, malformed SE records carrying a stale `event_kind: "world_block"` or `event_kind: "repair"` would pass schema validation and only fail later at retrieval or audit time.

## Assumption Reassessment (2026-05-13)

1. Current schema state verified: `tools/validators/src/schemas/story-event.schema.json` lines 1-11; required = `["id", "story_id"]`; properties block validates only `id` + `story_id` patterns; `additionalProperties: true` (line 10) means `event_kind` is allowed unconstrained.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.3 line 148 (post-SPEC23STOSTACON-001) specifies the 7-value enum; `outcome_route` separately retains `world_block` per line 151 (the value is moved from event_kind to outcome_route only — not deleted entirely).
3. Cross-artifact boundary under audit: SE schema is consumed by the validator pipeline + tests; SE records are emitted by `branching-story-bootstrap` (event_kind: story_start), `branching-story-turn-cycle` (selected_choice / write_in_attempt / system_repair / audit_repair), `branching-story-prose-attach` (prose_attach), `branching-story-health-audit` (audit_repair semantics in remediation), `story-promotion-closeout` (promotion_closeout). The schema enum is the boundary the consumers depend on.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts). The contract specifies a closed enum; without schema enforcement, the enum is documentation only, not a load-bearing constraint. Adding the enum makes SE.event_kind a fully load-bearing field.
5. Schema extension classification (menu item 6 per `tickets/_TEMPLATE.md`): adding an enum constraint to an `additionalProperties: true` minimal schema is **additive** for valid post-SPEC23STOSTACON-001 records. It is breaking for any hypothetical legacy SE record carrying `event_kind: "world_block"` or `event_kind: "repair"` — but no such records exist (zero pre-existing story bundles verified).

## Architecture Check

1. Schema enforcement of closed enums is cleaner than runtime-only enforcement: the validator pipeline catches malformed `event_kind` values at patch-plan dry-run time (before the record lands), rather than at audit time when consequences have propagated.
2. No backwards-compatibility shim: `world_block` and `repair` are not aliased; spec §Key design decisions line 28 + §Deliverables line 72 explicitly require the trim. `world_block` survives at `outcome_route` (different field) where it remains semantically distinct.

## Verification Layers

1. Schema's `event_kind.enum` has 7 values per contract §4.3 → schema validation: `jq '.properties.event_kind.enum | length' tools/validators/src/schemas/story-event.schema.json` returns 7.
2. Stale values absent: `jq '.properties.event_kind.enum | tostring | test("world_block|^repair$")' tools/validators/src/schemas/story-event.schema.json` returns `false` (neither `world_block` nor bare `repair` in the enum).
3. New values present: `system_repair`, `audit_repair`, `prose_attach`, `promotion_closeout` all in the enum → comprehensive grep.
4. Validator package builds + tests pass → `cd tools/validators && npm run build && npm test`.

## What to Change

### 1. Add `event_kind` property + enum to story-event schema

Update `tools/validators/src/schemas/story-event.schema.json`:
- Add `"event_kind"` to the `required` array (line 5); resulting required: `["id", "story_id", "event_kind"]`.
- Add `event_kind` property in the `properties` block:
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
- Preserve `additionalProperties: true` so SE records can carry `actor`, `targets`, `outcome_route`, `world_logic_rationale`, `state_delta`, `promotion_claims`, `parent_page_id`, `created_at_page` without each being individually schema-validated. (Adding nested validation for the rest of the SE shape is out of scope; this ticket targets only `event_kind`.)

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)

## Out of Scope

- Adding nested validation for SE's other fields (`outcome_route`, `state_delta`, `promotion_claims`, etc.) — that work is candidate for a follow-up SE-fullsize-schema ticket if needed.
- Updating skill prose to reflect the split `system_repair` / `audit_repair` semantics — SPEC23STOSTACON-009.
- Contract amendment — `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. SE record with `event_kind: "story_start"` PASSes schema validation.
3. SE record with `event_kind: "world_block"` FAILs schema validation.
4. SE record with `event_kind: "system_repair"` PASSes; with `event_kind: "audit_repair"` PASSes.
5. SE record without `event_kind` field FAILs (because it is now required).

### Invariants

1. SE.event_kind values are restricted to the 7 contract-canonical strings. Adding a new value requires amending the contract first (FOUNDATIONS §Story Bundles §5b discipline).
2. `outcome_route: "world_block"` (a different field, contract §4.3 line 151 + §6 action routing) remains a valid value — the trim is on `event_kind` only, not on `outcome_route`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (path discovered at implementation; create if absent following the pattern of `record-schema-compliance-story-page.test.ts`) — fixtures: (a) PASS for each of the 7 valid event_kind values; (b) FAIL for `event_kind: "world_block"`; (c) FAIL for missing `event_kind`.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `jq '.properties.event_kind.enum | length' tools/validators/src/schemas/story-event.schema.json` returns 7.
3. `jq -r '.required[]' tools/validators/src/schemas/story-event.schema.json` returns set including `event_kind`.
