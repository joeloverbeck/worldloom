# SPEC35STOPIPEIG-008: Refresh test fixtures for retired schema fields and padded IDs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — test fixture refresh plus `recursive_reference_closure` PG input traversal
**Deps**: `archive/specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D8

## Problem

At intake, several story-pipeline test fixtures encoded retired schema fields and/or padded IDs that contradicted the current story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4 and FOUNDATIONS-002 (`docs/FOUNDATIONS.md:552–559`):

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:65` — `world_ent_id` (retired; current is `bound_char_id`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:79` — `derived_from_cf` (retired; current is `derived_from`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:123` — numeric `urgency: 5` (current is `low | medium | high`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:159` — `storylet_realized` (retired; no replacement in PG schema)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:160` — `chosen_choice_id` (retired; current is `input.choice_id`)
- `tools/validators/tests/structural/observer-firewall.test.ts` — the draft named this as padded/retired-field fallout, but live reassessment found ticket 001 had already refreshed it to the current field shape
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts:346` — `storylet_realized`
- `tools/validators/tests/structural/recursive-reference-closure.test.ts:311` and `:331` — `storylet_realized`
- `tools/validators/tests/integration/validate-patch-plan.test.ts:523` — `storylet_realized` in a Shape B page fixture, surfaced by the final retired-field sweep

The rot allowed tests to pass while contracts had moved on, and it masked SPEC-34 D1's padded-`PG-0001` literal bug (`archive/tickets/SPEC35STOPIPEIG-002.md`) from CI detection. The completed sweep refreshed the live fixture/consumer set and replaced recursive-reference closure's retired `PG.storylet_realized` page-root traversal with current `PG.input.choice_id` / `PG.input.resolved_event_id` traversal.

## Assumption Reassessment (2026-05-16)

1. Live retired-field sweep found current hits in `tools/world-mcp/tests/tools/story-bundle-fixture.ts`, `tools/validators/tests/structural/snapshot-replay-equality.test.ts`, `tools/validators/tests/structural/recursive-reference-closure.test.ts`, and the additional integration fixture `tools/validators/tests/integration/validate-patch-plan.test.ts`. `tools/validators/tests/structural/observer-firewall.test.ts` was already current from `archive/tickets/SPEC35STOPIPEIG-001.md` and required no edit.
2. The current schema for each field is:
   - STENT: `bound_char_id` (not `world_ent_id`) per shared story-state contract §4.5.1
   - SF: `derived_from` (not `derived_from_cf`) per shared story-state contract §4
   - OBL/CNSQ/THR/STINT urgency: `low | medium | high` string enum (not numeric) per shared story-state contract §4
   - PG: `input.choice_id` (not `chosen_choice_id`); `input.resolved_event_id` per shared story-state contract §4.2
   - PG: no `storylet_realized` field (retired entirely)
3. Cross-skill boundary under audit: the fixture-file convention used across story-pipeline test files. Each fixture serves multiple structural validators (`observer-firewall.test.ts`, `branch-isolation.test.ts`, `snapshot-replay-equality.test.ts`, `recursive-reference-closure.test.ts`) and the MCP context-packet test (`get-context-packet.story-pipeline.test.ts` consumes `story-bundle-fixture.ts`). Refreshing the fixtures is bounded test-side work but the cross-file consumer set determines the sweep scope.
4. FOUNDATIONS-002 (per `docs/FOUNDATIONS.md:552-559`) motivates this ticket via the unpadded-ID convention. The retired-field issues are not principle-rooted but contract-rooted (the shared story-state contract is authoritative); both classes of rot are addressed in one sweep.
5. This ticket refreshed fixture fields across the live consumer set: `tools/world-mcp/tests/tools/story-bundle-fixture.ts` plus its story-bundle consumer tests, `tools/validators/tests/structural/snapshot-replay-equality.test.ts`, `tools/validators/tests/structural/recursive-reference-closure.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`. Final sweep at landing: `rg -n 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized|urgency:\s*[0-9]+' tools/validators/tests tools/world-mcp/tests tools/validators/src/structural/recursive-reference-closure.ts` returned zero matches.
6. Same-seam production fallout: `recursive_reference_closure` still traversed retired `PG.storylet_realized`. The current PG schema carries selected page input under `input.choice_id` and `input.resolved_event_id`, so the validator traversal moved to those current fields instead of preserving a retired root.
7. Broad padded-ID discovery over all package tests remains too broad for active acceptance: many unrelated fixtures intentionally use padded IDs. The landed padded-ID proof is scoped to the refreshed story-bundle fixture and its direct consumers.

## Architecture Check

1. A single-pass sweep across the live retired-field and fixture-owned padded-ID surface was structurally cleaner than per-file tickets: the fixtures were independent but the mappings were uniform. Alternative considered: split by package (one ticket for `tools/validators/tests/`, another for `tools/world-mcp/tests/`) — rejected because a reviewer benefits from seeing the full sweep at once.
2. No backwards-compatibility aliasing introduced. The fixture refresh replaces retired field names with current ones wholesale; any test that depended on a retired field name as a structural assertion is rewritten to use the current name (or removed if the field is fully retired with no replacement, e.g., `storylet_realized`).

## Verification Layers

1. Retired field and numeric urgency hits are gone from current test/validator surfaces → grep-proof: `rg -n 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized|urgency:\s*[0-9]+' tools/validators/tests tools/world-mcp/tests tools/validators/src/structural/recursive-reference-closure.ts` returns zero matches.
2. Fixture-owned padded-ID patterns were removed from the refreshed story-bundle fixture and its consumers; remaining padded IDs in broader package tests are unrelated fixture families or explicit legacy/rejection coverage.
3. Urgency assignments use the string enum → included in the retired-field/numeric-urgency grep-proof above.
4. Full validator + MCP test suites green → `npm test` in `tools/validators/` AND `tools/world-mcp/`.

## Landed Changes

### 1. Sweep `tools/world-mcp/tests/tools/story-bundle-fixture.ts`

- Line 65: `world_ent_id: entity:marla-kern` → `bound_char_id: CHAR-1`, with current STENT identity fields.
- Line 79: `derived_from_cf:` → `derived_from:`.
- Line 123: `urgency: 5` → `urgency: high`.
- Lines 159–160: removed `storylet_realized` and replaced `chosen_choice_id` with `input.choice_id` / `input.resolved_event_id`.
- Refreshed the story-bundle fixture's owned IDs and direct consumer assertions to unpadded forms such as `PG-1`, `SF-1`, `STENT-2`, and `SLT-21`.

### 2. Preserve `tools/validators/tests/structural/observer-firewall.test.ts`

- Live reassessment found no retired-field hits in this file; it was already current after `archive/tickets/SPEC35STOPIPEIG-001.md`.

### 3. Sweep `tools/validators/tests/structural/snapshot-replay-equality.test.ts`

- Line 346: removed `storylet_realized` from the legacy page fixture.

### 4. Sweep `tools/validators/tests/structural/recursive-reference-closure.test.ts`

- Line 311: replaced `storylet_realized: "SLT-0099"` with a current-schema `input.choice_id: "CHC-0099"` branch-leak fixture.
- Line 331: expected `reference_path` now uses `input.choice_id`.

### 5. Sweep `tools/validators/tests/integration/validate-patch-plan.test.ts`

- Removed the additional `storylet_realized` Shape B page fixture hit surfaced by the live sweep.

### 6. Update `recursive_reference_closure`

- Replaced retired `page.storylet_realized` traversal with current `page.input.choice_id` and `page.input.resolved_event_id` traversal.

### 7. Cross-fixture sweep verification

The final sweep used `rg -n 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized|urgency:\s*[0-9]+' tools/validators/tests tools/world-mcp/tests tools/validators/src/structural/recursive-reference-closure.ts` and returned zero matches. The additional `validate-patch-plan` hit discovered by that sweep was absorbed before closeout.

### 8. Verification step

After all sweeps, both package suites were rerun: `npm test` in `tools/validators/` and `npm test` in `tools/world-mcp/` passed.

## Files to Touch

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (modify — same unpadded-ID test-fixture cleanup)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/find-named-entities.story-local.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify — direct fixture ID consumer)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — direct fixture ID consumer)

## Out of Scope

- Broader production-code cleanup outside the same retired-field validation seam.
- Changes to schema files (`tools/validators/src/schemas/`) — the schemas are authoritative; fixtures must match them.
- New test cases beyond `archive/tickets/SPEC35STOPIPEIG-001.md` and `archive/tickets/SPEC35STOPIPEIG-002.md`'s coordinated fixtures.
- Removing or archiving tests — only refreshing fixture data; tests that fail due to load-bearing retired-field dependencies are rewritten in place.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized|urgency:\s*[0-9]+' tools/validators/tests tools/world-mcp/tests tools/validators/src/structural/recursive-reference-closure.ts` returns ZERO matches.
2. Fixture-owned urgency assignments use the string enum.
3. Direct story-bundle fixture/consumer padded-ID discovery shows no stale fixture-owned padded IDs; remaining padded IDs are unrelated tests or intentionally separate fixtures.
4. `npm test` in `tools/validators/` returns green.
5. `npm test` in `tools/world-mcp/` returns green.

### Invariants

1. Test fixtures encode the current story-state contract field set, not retired fields.
2. Test fixtures use unpadded IDs unless the test explicitly verifies padded-ID rejection.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` and direct story-bundle consumer tests (modify — fixture refresh).
2. `tools/validators/src/structural/recursive-reference-closure.ts` and `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — replace retired page-field traversal with current PG input traversal).
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — drop `storylet_realized`).
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — drop `storylet_realized`).

### Commands

1. `cd tools/validators && npm test` — full validator suite.
2. `cd tools/world-mcp && npm test` — full MCP suite.
3. `rg -n 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized|urgency:\s*[0-9]+' tools/validators/tests tools/world-mcp/tests tools/validators/src/structural/recursive-reference-closure.ts` — sweep verification command; expected zero matches.

## Outcome

Completed: 2026-05-16.

The story-bundle fixture now uses current STENT/SF/PG fields, string urgency, and unpadded fixture-owned IDs. Direct world-mcp story-bundle consumer assertions were updated to the refreshed IDs. Validator fixtures dropped retired `storylet_realized`, including the additional `validate-patch-plan` integration fixture found during the live sweep. `recursive_reference_closure` now follows current `PG.input.choice_id` and `PG.input.resolved_event_id` references instead of the retired page-root `storylet_realized` field.

## Verification Result

- Baseline before edits: `npm test` in `tools/validators/` passed 304 tests; `npm test` in `tools/world-mcp/` passed 370 tests.
- `rg -n 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized|urgency:\s*[0-9]+' tools/validators/tests tools/world-mcp/tests tools/validators/src/structural/recursive-reference-closure.ts` returned zero matches.
- `npm run build` in `tools/validators/` passed.
- `npm run build` in `tools/world-mcp/` passed.
- Focused validators proof passed: `node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/integration/validate-patch-plan.test.js` passed 55 tests.
- Focused world-mcp story-bundle proof passed: `node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js dist/tests/tools/get-record.story-bundle.test.js dist/tests/tools/list-records.story-bundle.test.js dist/tests/tools/get-neighbors.story-bundle.test.js dist/tests/tools/search-nodes.story-bundle.test.js dist/tests/tools/find-named-entities.story-local.test.js dist/tests/tools/find-impacted-fragments.story-bundle.test.js dist/tests/context-packet/story-bundle-budget.test.js` passed 28 tests.
- Final `npm test` in `tools/validators/` passed 304 tests.
- Final `npm test` in `tools/world-mcp/` passed 370 tests.

## Deviations

- `observer-firewall.test.ts` required no edit because `archive/tickets/SPEC35STOPIPEIG-001.md` had already refreshed it.
- The retired-field sweep found an additional `storylet_realized` hit in `tools/validators/tests/integration/validate-patch-plan.test.ts`; it was absorbed as same-seam fixture fallout.
- The ticket changed one production validator because live reassessment found `recursive_reference_closure` still traversed the retired `PG.storylet_realized` field. This was necessary for the fixture refresh to be truthful against the current PG schema.
- Broad padded-ID greps over all package tests remain discovery-only because many unrelated fixtures intentionally use padded examples. The landed padded-ID refresh is scoped to the story-bundle fixture and its direct consumers.
