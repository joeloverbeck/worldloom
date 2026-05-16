# SPEC35STOPIPEIG-008: Refresh test fixtures for retired schema fields and padded IDs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — test fixtures only
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D8

## Problem

Four test files encode retired schema fields and/or padded IDs that contradict the current story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4 and FOUNDATIONS-002 (`docs/FOUNDATIONS.md:552–559`):

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:65` — `world_ent_id` (retired; current is `bound_char_id`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:79` — `derived_from_cf` (retired; current is `derived_from`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:123` — numeric `urgency: 5` (current is `low | medium | high`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:159` — `storylet_realized` (retired; no replacement in PG schema)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:160` — `chosen_choice_id` (retired; current is `input.choice_id`)
- `tools/validators/tests/structural/observer-firewall.test.ts` — padded IDs and same retired fields (per brainstorm parallel-agent verification)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts:346` — `storylet_realized`
- `tools/validators/tests/structural/recursive-reference-closure.test.ts:311` and `:331` — `storylet_realized`

The rot allows tests to pass while contracts have moved on, and it masked SPEC-34 D1's padded-`PG-0001` literal bug (SPEC35STOPIPEIG-002) from CI detection. The sweep covers all 4 files in one operation.

## Assumption Reassessment (2026-05-16)

1. All 4 files exist and contain the retired-field rot at the cited line numbers. Verified at Step 2 (`ls -la` confirmed file presence and sizes; brainstorm parallel-agent verification cited the line numbers).
2. The current schema for each field is:
   - STENT: `bound_char_id` (not `world_ent_id`) per shared story-state contract §4.5.1
   - SF: `derived_from` (not `derived_from_cf`) per shared story-state contract §4
   - OBL/CNSQ/THR/STINT urgency: `low | medium | high` string enum (not numeric) per shared story-state contract §4
   - PG: `input.choice_id` (not `chosen_choice_id`); `input.resolved_event_id` per shared story-state contract §4.2
   - PG: no `storylet_realized` field (retired entirely)
3. Cross-skill boundary under audit: the fixture-file convention used across story-pipeline test files. Each fixture serves multiple structural validators (`observer-firewall.test.ts`, `branch-isolation.test.ts`, `snapshot-replay-equality.test.ts`, `recursive-reference-closure.test.ts`) and the MCP context-packet test (`get-context-packet.story-pipeline.test.ts` consumes `story-bundle-fixture.ts`). Refreshing the fixtures is bounded test-side work but the cross-file consumer set determines the sweep scope.
4. FOUNDATIONS-002 (per `docs/FOUNDATIONS.md:552-559`) motivates this ticket via the unpadded-ID convention. The retired-field issues are not principle-rooted but contract-rooted (the shared story-state contract is authoritative); both classes of rot are addressed in one sweep.
5. This ticket renames fixture fields across multiple test files — sweep blast radius per area: `tools/world-mcp/tests/` 1 file (`story-bundle-fixture.ts`); `tools/validators/tests/structural/` 3 files (`observer-firewall.test.ts`, `snapshot-replay-equality.test.ts`, `recursive-reference-closure.test.ts`); `tools/validators/tests/integration/` to be re-verified during implementation if the integration tests consume any of these fixtures. Final sweep at landing: `grep -rE 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized' tools/validators/tests/ tools/world-mcp/tests/` returns zero matches.

## Architecture Check

1. A single-pass sweep across all 4 files is structurally cleaner than per-file tickets: the fixtures are independent but the renames are uniform (same retired→current mappings); per-file decomposition would multiply ceremony without aiding review. Alternative considered: split by package (one ticket for `tools/validators/tests/`, another for `tools/world-mcp/tests/`) — rejected because the field-name mappings are identical and a reviewer benefits from seeing the full sweep at once.
2. No backwards-compatibility aliasing introduced. The fixture refresh replaces retired field names with current ones wholesale; any test that depended on a retired field name as a structural assertion is rewritten to use the current name (or removed if the field is fully retired with no replacement, e.g., `storylet_realized`).

## Verification Layers

1. All 4 named files have zero retired-field hits after the sweep → grep-proof: `grep -rE 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized' tools/validators/tests/ tools/world-mcp/tests/` returns zero matches.
2. Padded-ID patterns removed (or limited to tests that explicitly verify padded-ID rejection) → grep-proof: `grep -rE '\-0001|\-0002|\-0010' tools/validators/tests/ tools/world-mcp/tests/ | grep -v 'reject'` returns minimal matches (operator inspects the remaining to confirm intentionality).
3. Urgency assignments use the string enum → grep-proof: `grep -rnE 'urgency:\s*[0-9]+' tools/validators/tests/ tools/world-mcp/tests/` returns zero matches.
4. Full validator + MCP test suites green → `npm test` in `tools/validators/` AND `tools/world-mcp/`.

## What to Change

### 1. Sweep `tools/world-mcp/tests/tools/story-bundle-fixture.ts`

- Line 65: `world_ent_id: entity:marla-kern` → `bound_char_id: CHAR-<integer>` (use the appropriate CHAR id for the fixture's intent; consult the contract's STENT schema if unsure).
- Line 79: `derived_from_cf:` → `derived_from:`.
- Line 123: `urgency: 5` → `urgency: low | medium | high` (pick the level matching the test's intent — a `5` likely maps to `high` if numeric severity was the scale).
- Lines 159–160: remove `storylet_realized: SLT-0021` and `chosen_choice_id: CHC-0001`; replace `chosen_choice_id` with `input.choice_id: CHC-<unpadded>` if the test's assertion depends on the field's presence.
- All padded IDs (`-0001`, `-0010`, `-0021`, etc.) → unpadded (`-1`, `-10`, `-21`).

### 2. Sweep `tools/validators/tests/structural/observer-firewall.test.ts`

- Replace all padded IDs (`PG-0001`, `CHC-0001`, etc.) with unpadded equivalents.
- Replace retired field references (`world_ent_id`, `derived_from_cf`, `chosen_choice_id`, `storylet_realized`) per the mapping above.
- Preserve the existing test assertions; only the fixture data changes (unless a test's assertion was tied to a retired field name's presence — in which case the assertion is also updated to match the current schema).
- Coordinate with `archive/tickets/SPEC35STOPIPEIG-001.md`: the new fixture added by 001 is already in current-schema form; this ticket only refreshes pre-existing fixtures.

### 3. Sweep `tools/validators/tests/structural/snapshot-replay-equality.test.ts`

- Line 346 (and any other site found via in-file grep): remove `storylet_realized` references; restructure the test if the assertion depended on its presence (most likely the test asserts replay equality on the field set; the field's removal means the test's expected snapshot drops the entry).

### 4. Sweep `tools/validators/tests/structural/recursive-reference-closure.test.ts`

- Line 311: `storylet_realized: "SLT-0099"` → remove (or replace with whatever current-schema field the test was probing; consult the test's intent).
- Line 331: `reference_path: "storylet_realized"` → remove (the path the test traversed no longer exists on PG records).

### 5. Cross-fixture sweep verification

After editing the 4 named files, run `grep -rE 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized' tools/validators/tests/ tools/world-mcp/tests/` and confirm zero matches. Any residue beyond the 4 named files lands in the same ticket — the authoring-time site-enumeration discipline mandates a full sweep before close.

### 6. Verification step

After all sweeps, re-run `npm test` in BOTH `tools/validators/` AND `tools/world-mcp/`. Any test that fails due to a load-bearing retired-field dependency needs rewriting; operator judgment at refresh time.

## Files to Touch

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify — coordinate with `archive/tickets/SPEC35STOPIPEIG-001.md`'s new test fixture)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- Any additional files surfaced by the verification-step grep (operator-judgment; same sweep)

## Out of Scope

- Changes to production code (validators, MCP tools) — fixture refresh only.
- Changes to schema files (`tools/validators/src/schemas/`) — the schemas are authoritative; fixtures must match them.
- New test cases beyond `archive/tickets/SPEC35STOPIPEIG-001.md` and SPEC35STOPIPEIG-002's coordinated fixtures.
- Removing or archiving tests — only refreshing fixture data; tests that fail due to load-bearing retired-field dependencies are rewritten in place.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rE 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized' tools/validators/tests/ tools/world-mcp/tests/` returns ZERO matches.
2. `grep -rnE 'urgency:\s*[0-9]+' tools/validators/tests/ tools/world-mcp/tests/` returns ZERO matches.
3. `grep -rE '\-0001' tools/validators/tests/ tools/world-mcp/tests/ | grep -v reject` returns minimal matches (operator inspects remaining to confirm intentionality).
4. `npm test` in `tools/validators/` returns green.
5. `npm test` in `tools/world-mcp/` returns green.

### Invariants

1. Test fixtures encode the current story-state contract field set, not retired fields.
2. Test fixtures use unpadded IDs unless the test explicitly verifies padded-ID rejection.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — fixture refresh).
2. `tools/validators/tests/structural/observer-firewall.test.ts` (modify — coordinate with `archive/tickets/SPEC35STOPIPEIG-001.md`).
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — drop `storylet_realized`).
4. `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — drop `storylet_realized`).

### Commands

1. `cd tools/validators && npm test` — full validator suite.
2. `cd tools/world-mcp && npm test` — full MCP suite.
3. `grep -rE 'world_ent_id|derived_from_cf|chosen_choice_id|storylet_realized' tools/validators/tests/ tools/world-mcp/tests/` — sweep verification command; expected zero matches.
4. `grep -rnE 'urgency:\s*[0-9]+' tools/validators/tests/ tools/world-mcp/tests/` — urgency-format verification; expected zero matches.
