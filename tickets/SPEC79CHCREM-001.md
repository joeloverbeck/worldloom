# SPEC79CHCREM-001: Drop `associated_commitment_block` from story-choice schema + shared contract + schema-shape assertions

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-choice.schema.json` (story-choice JSON schema); `.claude/skills/_shared-templates/story-record-schemas.md` (CHC §4.5.12 contract); three schema-shape assertion tests (`tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts`, `tools/world-mcp/tests/tools/get-record-schema.test.ts`).
**Deps**: None

## Problem

`CHC.associated_commitment_block` is a non-load-bearing field on the story-choice schema. Its mere presence tempts turn-cycle into locking onto a stale SLT named at CHC-emission time even when a now-grown live pool would yield a better selection. Per FOUNDATIONS §Story Bundles §5b's load-bearing test, the field's CHC-resolution purpose is already covered by `PG.input.choice_id` plus the per-page CHC-id uniqueness invariant. This ticket removes the field from the schema and the shared contract, and updates the three schema-shape assertion tests that pin the schema's `required[]` and `properties` lists byte-exactly.

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/validators/src/schemas/story-choice.schema.json` carries `"associated_commitment_block"` at line 13 in `required[]` and the property definition at lines 54-57. `additionalProperties: false` is set at line 79 and remains.
2. Confirmed SPEC-79 §3.1 + §3.2 are the authoritative spec sections; the reassessment session resolved Q1=(a), Q2=(a), Q3=(a) all approved.
3. Cross-skill boundary: this ticket's schema change is consumed by every downstream validator (covered in 002, 003), the world-index parser (004), bootstrap (005), turn-cycle reference files (006), the audit (007), the docs (008), the Red Kiln fixture (009), and 4 remaining test fixtures (010). The atomic-landing discipline per spec §10 enforces ordering via Deps.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): *"Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline."* Once the resolver moves to `PG.input.choice_id` (handled in 002), the field's absence breaks none of those surfaces.
5. Removal blast radius (was template item 7): the field appears in 4 source files (this ticket + 002 + 003 + 004's targets), 6 skill/doc files (005-008), and 11 test files. This ticket covers the schema + shared contract + 3 schema-assertion tests; the remaining surfaces are owned by sibling tickets via the Deps chain.

## Architecture Check

1. Removal is cleaner than the iteration-1 R1 `CHC.late_bound: bool` alternative path (which would itself be a temptation surface suggesting some authorial benefit to NOT being late-bound) and cleaner than the iteration-2 SPEC-79 `binding` object (which would re-introduce the temptation through the back door via `binding.mode: exact_slt`). The straightforward removal makes branch-safe live-global-pool behavior the unconditional default.
2. No backwards-compatibility aliasing/shims introduced. The schema's `additionalProperties: false` means any post-landing CHC carrying the field will fail validation immediately, which is the intended discipline per spec §10's atomic-landing requirement.

## Verification Layers

1. Schema rejects CHCs carrying `associated_commitment_block` → codebase grep-proof + schema validation: `cd tools/validators && npm test` runs `record_schema_compliance` against the test fixtures and the schema-shape assertions verify the new `required[]` / `properties` lists byte-exactly.
2. Schema accepts CHCs without the field → codebase grep-proof + schema validation: same test suite.
3. Shared contract template documents the post-removal shape → manual review of `_shared-templates/story-record-schemas.md` §4.5.12 (the canonical CHC schema entry consumed by bootstrap and turn-cycle skill prose).
4. Cross-package consumer (world-mcp's get-record-schema test) reports the new schema shape correctly → codebase grep-proof: the test's `assert.ok(properties.associated_commitment_block)` line is removed.

## What to Change

### 1. `tools/validators/src/schemas/story-choice.schema.json`

- Remove `"associated_commitment_block"` from the `required[]` array at line 13. The new required list reads `["id", "story_id", "created_at_page", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "grounded_in"]` (8 fields, down from 9).
- Remove the `"associated_commitment_block"` property definition at lines 54-57 (the 4-line block with `type: ["string", "null"]` and `pattern: "^SLT-(0|[1-9][0-9]*)$"`).
- `additionalProperties: false` at line 79 remains.

### 2. `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12

- Remove the `associated_commitment_block: SLT-<integer> | null*   # SLT id if known, null if turn-cycle will JIT` line from the CHC schema entry.
- Add a one-line FOUNDATIONS-aligned note immediately below the CHC schema block: *"CHCs do not name a specific SLT. Selection happens at resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records."*

### 3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`

- Update the `required[]` assertion at line 81 to drop `"associated_commitment_block"` so it matches the new schema's 8-field required list.
- Update the `properties[]` assertion at line 82 to drop `"associated_commitment_block"` so it matches the new schema's property set.
- Drop the `associated_commitment_block: null,` key from the CHC test fixtures at lines 310 and 460 (these fixtures otherwise carry the field as a placeholder; removing the key makes them schema-conformant).

### 4. `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts`

- Drop the `associated_commitment_block: null,` key from the CHC test fixture at line 18.

### 5. `tools/world-mcp/tests/tools/get-record-schema.test.ts`

- Drop `"associated_commitment_block"` from the expected required-array assertion at line 299.
- Remove the `assert.ok(properties.associated_commitment_block)` line at line 306 (the assertion that the property is present in the schema-discovery response).

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)

## Out of Scope

- The validator behavior change (handled in 002).
- The rule_choice_set_noncollapse axis reduction (handled in 003).
- The world-index edge-class removal (handled in 004).
- Skill-side documentation updates (handled in 005, 006, 007).
- The docs/MACHINE-FACING-LAYER.md row deletion (handled in 008).
- Fixture repairs (handled in 009, 010).
- Capstone end-to-end validation (handled in 011).
- Adding a `CHC.late_bound: bool` flag (rejected per spec §7).
- Adding a `binding` object replacing the scalar (rejected per spec §7).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` runs to completion with zero new failures. The `record_schema_compliance` validator passes against any CHC fixture that lacks `associated_commitment_block`; it fails predictably (with the standard `additionalProperties: false` error) against any CHC fixture that includes the field.
2. `cd tools/validators && npm test -- --test-name-pattern='contract-schema-roundtrip'` passes; the schema-shape assertion matches the new 8-field `required[]` and the new properties set.
3. `cd tools/validators && npm test -- --test-name-pattern='record-schema-compliance-story-choice'` passes against the updated fixture.
4. `cd tools/world-mcp && npm test -- --test-name-pattern='get-record-schema'` passes; the schema-discovery response no longer surfaces the property.

### Invariants

1. The story-choice schema's `additionalProperties: false` constraint structurally rejects any CHC carrying `associated_commitment_block` after this ticket lands.
2. The shared contract template at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12 documents the post-removal CHC shape as the canonical reference for bootstrap and turn-cycle skill prose.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — updated `required[]` and `properties` assertions to match the new schema shape; CHC fixtures at lines 310, 460 drop the key.
2. `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` — updated CHC fixture at line 18 drops the key.
3. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — updated schema-shape assertions at lines 299, 306.

### Commands

1. `cd tools/validators && npm test`
2. `cd tools/world-mcp && npm test`
3. `grep -n "associated_commitment_block" tools/validators/src/schemas/story-choice.schema.json` returns zero matches.
