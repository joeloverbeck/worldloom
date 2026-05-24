# SPEC79CHCREM-001: Drop `associated_commitment_block` from story-choice schema + shared contract + schema-shape assertions

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-choice.schema.json` (story-choice JSON schema); `.claude/skills/_shared-templates/story-record-schemas.md` (CHC §4.5.12 contract); three schema-shape assertion tests (`tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts`, `tools/world-mcp/tests/tools/get-record-schema.test.ts`).
**Deps**: None

## Problem

At intake, `CHC.associated_commitment_block` was a non-load-bearing field on the story-choice schema. Its mere presence tempted turn-cycle into locking onto a stale SLT named at CHC-emission time even when a now-grown live pool would yield a better selection. Per FOUNDATIONS §Story Bundles §5b's load-bearing test, the field's CHC-resolution purpose is already covered by `PG.input.choice_id` plus the per-page CHC-id uniqueness invariant. This ticket removed the field from the schema and the shared contract, and updated the three schema-shape assertion tests that pin the schema's `required[]` and `properties` lists byte-exactly.

## Assumption Reassessment (2026-05-24)

1. At intake, `tools/validators/src/schemas/story-choice.schema.json` carried `"associated_commitment_block"` in `required[]` and in a property definition. `additionalProperties: false` was present and remains.
2. Confirmed SPEC-79 §3.1 + §3.2 are the authoritative spec sections; the reassessment session resolved Q1=(a), Q2=(a), Q3=(a) all approved.
3. Cross-skill boundary: this ticket's schema change is consumed by every downstream validator (covered in 002, 003), the world-index parser (004), bootstrap (005), turn-cycle reference files (006), the audit (007), the docs (008), the Red Kiln fixture (009), and 4 remaining test fixtures (010). The atomic-landing discipline per spec §10 enforces ordering via Deps.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): *"Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline."* Once the resolver moves to `PG.input.choice_id` (handled in 002), the field's absence breaks none of those surfaces.
5. Removal blast radius (was template item 7): the field appears in 4 source files (this ticket + 002 + 003 + 004's targets), 6 skill/doc files (005-008), and 11 test files. This ticket covers the schema + shared contract + 3 schema-assertion tests; the remaining surfaces are owned by sibling tickets via the Deps chain.
6. Implementation-time broad proof correction: after this ticket's schema removal, `cd tools/validators && npm test` rebuilt and ran but failed because sibling-owned validator/fixture surfaces still carried `associated_commitment_block`. The direct owned failures were expected staged-family fallout and were assigned to SPEC79CHCREM-002, SPEC79CHCREM-003, and archive/tickets/SPEC79CHCREM-010.md. This ticket's accepted proof is the focused validators schema/fixture test pair plus the world-mcp schema-discovery test.

## Architecture Check

1. Removal is cleaner than the iteration-1 R1 `CHC.late_bound: bool` alternative path (which would itself be a temptation surface suggesting some authorial benefit to NOT being late-bound) and cleaner than the iteration-2 SPEC-79 `binding` object (which would re-introduce the temptation through the back door via `binding.mode: exact_slt`). The straightforward removal makes branch-safe live-global-pool behavior the unconditional default.
2. No backwards-compatibility aliasing/shims introduced. The schema's `additionalProperties: false` means any post-landing CHC carrying the field will fail validation immediately, which is the intended discipline per spec §10's atomic-landing requirement.

## Verification Layers

1. Schema rejects CHCs carrying `associated_commitment_block` on this ticket's owned surfaces → codebase grep-proof + schema validation: the focused validators schema/fixture test pair proves the new `required[]` / `properties` lists byte-exactly and the broader validators run showed remaining sibling-owned legacy fixtures now fail with `additionalProperties`.
2. Schema accepts CHCs without the field → codebase grep-proof + schema validation: the focused validators schema/fixture test pair passes.
3. Shared contract template documents the post-removal shape → manual review of `_shared-templates/story-record-schemas.md` §4.5.12 (the canonical CHC schema entry consumed by bootstrap and turn-cycle skill prose).
4. Cross-package consumer (world-mcp's get-record-schema test) reports the new schema shape correctly → codebase grep-proof: the test's `assert.ok(properties.associated_commitment_block)` line is removed.

## Landed Changes

### 1. `tools/validators/src/schemas/story-choice.schema.json`

- Removed `"associated_commitment_block"` from the `required[]` array. The new required list is `["id", "story_id", "created_at_page", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "grounded_in"]` (8 fields, down from 9).
- Removed the `"associated_commitment_block"` property definition.
- `additionalProperties: false` remains.

### 2. `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12

- Removed the `associated_commitment_block: SLT-<integer> | null*` line from the CHC schema entry.
- Added a one-line FOUNDATIONS-aligned note immediately below the CHC schema block: *"CHCs do not name a specific SLT. Selection happens at resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records."*

### 3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`

- Updated the `required[]` assertion to drop `"associated_commitment_block"` so it matches the new schema's 8-field required list.
- Updated the `properties[]` assertion to drop `"associated_commitment_block"` so it matches the new schema's property set.
- Dropped the `associated_commitment_block: null,` key from the two CHC test fixtures in this file.

### 4. `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts`

- Dropped the `associated_commitment_block: null,` key from the CHC test fixture.

### 5. `tools/world-mcp/tests/tools/get-record-schema.test.ts`

- Dropped `"associated_commitment_block"` from the expected required-array assertion.
- Removed the assertion that the property is present in the schema-discovery response.

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

1. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/record-schema-compliance-story-choice.test.js` passes after `npm test` has rebuilt the package; the schema-shape assertion matches the new 8-field `required[]` and the new properties set, and the updated CHC fixture passes.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js` passes after the package build; the schema-discovery response no longer surfaces the property.
3. `rg -n "associated_commitment_block" tools/validators/src/schemas/story-choice.schema.json tools/validators/tests/structural/contract-schema-roundtrip.test.ts tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts tools/world-mcp/tests/tools/get-record-schema.test.ts .claude/skills/_shared-templates/story-record-schemas.md` returns no matches.
4. The broader `cd tools/validators && npm test` lane is expected to stay red until sibling tickets repair the remaining consumers/fixtures; see `## Deviations`.

### Invariants

1. The story-choice schema's `additionalProperties: false` constraint structurally rejects any CHC carrying `associated_commitment_block` after this ticket lands.
2. The shared contract template at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12 documents the post-removal CHC shape as the canonical reference for bootstrap and turn-cycle skill prose.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — updated `required[]` and `properties` assertions to match the new schema shape; CHC fixtures drop the key.
2. `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` — updated CHC fixture drops the key.
3. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — updated schema-shape assertions.

### Commands

1. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/record-schema-compliance-story-choice.test.js`
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`
3. `rg -n "associated_commitment_block" tools/validators/src/schemas/story-choice.schema.json tools/validators/tests/structural/contract-schema-roundtrip.test.ts tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts tools/world-mcp/tests/tools/get-record-schema.test.ts .claude/skills/_shared-templates/story-record-schemas.md` returns zero matches.

## Outcome

Completed: 2026-05-24

The story-choice JSON Schema no longer requires or defines `associated_commitment_block`, while `additionalProperties: false` remains in place so any CHC still carrying the retired field is rejected. The shared CHC contract no longer lists the field and now states that CHCs do not name a specific SLT; selection happens at resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records.

The three schema-shape assertion surfaces named by the ticket were updated: validators contract roundtrip, validators record-schema-compliance CHC fixture, and world-mcp get-record-schema schema-discovery assertions.

## Verification Result

1. `rg -n "associated_commitment_block" tools/validators/src/schemas/story-choice.schema.json tools/validators/tests/structural/contract-schema-roundtrip.test.ts tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts tools/world-mcp/tests/tools/get-record-schema.test.ts .claude/skills/_shared-templates/story-record-schemas.md` returned no matches.
2. `git diff --check -- tools/validators/src/schemas/story-choice.schema.json .claude/skills/_shared-templates/story-record-schemas.md tools/validators/tests/structural/contract-schema-roundtrip.test.ts tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts tools/world-mcp/tests/tools/get-record-schema.test.ts .codex/run-state/implement-spec-tickets.json` passed.
3. `cd tools/validators && npm test` rebuilt the package, then exited 1 with 1010 passing tests and 2 failing tests. The failures are expected staged-family fallout from remaining sibling-owned `associated_commitment_block` consumers/fixtures, not this ticket's named schema-shape surfaces.
4. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/record-schema-compliance-story-choice.test.js` passed: 6 tests, 0 failures.
5. `cd tools/world-mcp && npm test -- --test-name-pattern='getRecordSchema returns story-choice schema metadata'` rebuilt and ran the package suite; the wrapper did not narrow the run, but the full world-mcp suite passed: 435 tests, 0 failures.
6. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js` passed: 10 tests, 0 failures.

## Deviations

The ticket's drafted broad `cd tools/validators && npm test` acceptance gate was too broad for the staged SPEC-79 family. After this ticket removes the field from the schema, the broader validators suite correctly reports `record_schema_compliance.additionalProperties` failures for sibling-owned stale CHC fixtures/consumers that still carry `associated_commitment_block`. Those surfaces are not fixed here:

- SPEC79CHCREM-002 owns `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` and its regression fixtures.
- SPEC79CHCREM-003 owns `tools/validators/src/rules/rule_choice_set_noncollapse.ts` and its rule fixture.
- archive/tickets/SPEC79CHCREM-010.md completed the remaining non-behavioral fixture-key drops in `tools/validators/tests/integration/spec34-integration.test.ts`, `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`, `tools/validators/tests/structural/stchar-structural-validators.test.ts`, and `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`.
