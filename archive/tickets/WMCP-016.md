# WMCP-016: Remove or prove parity for plan_story_state_maintenance active-record class copy

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/public/index.ts`, `tools/world-mcp/src/tools/plan-story-state-maintenance.ts`, and focused `tools/world-mcp` tests.
**Deps**: `archive/tickets/PGMAP-002.md`

## Problem

`archive/tickets/PGMAP-002.md` preserved the current full-map `PG.state_snapshot.active_records` contract and audited the consumers. During post-ticket review, one adjacent drift risk remained: at intake, `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` carried its own local `ACTIVE_RECORDS_CLASSES` tuple, byte-identical to `tools/validators/src/_helpers/state-snapshot-replay.ts`, and used it to replay maintenance PG snapshots.

The intake local copy was not a behavior bug, but it weakened the active-record contract handoff. This ticket removed that drift path by making `plan_story_state_maintenance` consume the validators public tuple and by proving the generated maintenance PG's full-map keys against that tuple.

## Assumption Reassessment (2026-05-29)

1. **World-mcp producer check.** At intake, `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` defined a local `ACTIVE_RECORDS_CLASSES` list and used it in `activeRecordsClassOf` and `replayActiveRecords` to create the maintenance PG `state_snapshot.active_records`.
2. **Validator authority check.** `tools/validators/src/_helpers/state-snapshot-replay.ts` defines the active validator helper `ACTIVE_RECORDS_CLASSES`, `OPTIONAL_ACTIVE_RECORDS_CLASSES`, `activeRecordsClassOf`, and `replayActiveRecords`; PGMAP-002 treated this helper plus shared story-state contract §4.2 as the authoritative validator/source-contract surface.
3. **Shared boundary under audit.** The `PG.state_snapshot.active_records` class vocabulary used by validators and by `plan_story_state_maintenance`'s generated maintenance PG.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §5b requires story-bundle record fields to be load-bearing. A duplicated class vocabulary is acceptable only if it cannot drift silently from the validation/audit surface that makes the full map load-bearing.
5. **Package dependency state.** At intake, `tools/world-mcp/package.json` already depended on `@worldloom/validators`, but `tools/validators/src/public/index.ts` did not export `ACTIVE_RECORDS_CLASSES` or replay helpers. Directly importing `src/_helpers/...` across package boundaries would have created a private-source coupling unless the active implementation deliberately chose a same-repo source import and proved it.
6. **Implementation choice.** The landed change exports `ACTIVE_RECORDS_CLASSES` and `ActiveRecordsClass` through the `@worldloom/validators` public API and imports that tuple in `plan_story_state_maintenance`; it does not export the validator replay helper because the maintenance helper still has local maintenance-specific replay semantics and only needed the shared class vocabulary.
7. **Baseline state.** Before source edits, `npm run build` passed in `tools/validators`, `npm run build` passed in `tools/world-mcp`, and `node --test dist/tests/tools/plan-story-state-maintenance.test.js` passed in `tools/world-mcp` with 4 tests passing.

## Architecture Check

1. The landed design uses a single public producer surface: `@worldloom/validators` exports the active-record class tuple/type, and `plan_story_state_maintenance` consumes that public surface. The validator replay helper remains private because the maintenance helper only needs the shared class vocabulary.
2. No backwards-compatibility aliasing/shims should be introduced. This is a drift-prevention cleanup; it must not change emitted maintenance patch-plan behavior.

## Verification Layers

1. World-mcp maintenance PG emits the same full active-record map -> focused `plan-story-state-maintenance` test asserts emitted active-record keys against the validators public tuple.
2. Validator and world-mcp active-record class lists cannot drift silently -> public import proof through `@worldloom/validators` in the maintenance helper and focused test.
3. Package boundary remains clean -> `tools/validators` and `tools/world-mcp` builds pass, with no private unexported package dependency unless explicitly justified in reassessment.

## Landed Changes

### 1. Public active-record vocabulary

Exported the validator-owned `ACTIVE_RECORDS_CLASSES` tuple and `ActiveRecordsClass` type from `@worldloom/validators`.

### 2. Maintenance helper coupling

Removed the local class tuple from `plan_story_state_maintenance`; the helper now consumes the public validators tuple while preserving its patch-plan shape, operation order, and state-delta semantics.

### 3. Prove parity

Updated the focused maintenance-helper test to assert the generated maintenance PG's `state_snapshot.active_records` keys match the validators public `ACTIVE_RECORDS_CLASSES` tuple.

## Files to Touch

- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (modify or inspect)
- `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` (modify or add focused parity coverage)
- `tools/validators/src/public/index.ts` (modified to export the active-record tuple/type)
- `archive/tickets/WMCP-016.md` (modify closeout/reassessment)

## Out of Scope

- Changing the active-record class vocabulary.
- Changing `compatibility_drift`, `active_records_full_shape`, or hard replay validator behavior.
- Editing live story-bundle `_source/` records or migrating historical pages.

## Acceptance Criteria

### Tests That Must Pass

1. A focused test proves the generated maintenance PG uses the same active-record class set as the validators public tuple.
2. Existing maintenance-helper tests still prove the emitted maintenance PG includes replayed `SREL`, `STPLAN`, and `STEMO` active records.
3. Package builds for the changed producer/consumer packages pass.

### Invariants

1. `plan_story_state_maintenance` emits the same patch-plan shape and active-record replay semantics as before this cleanup.
2. Future active-record vocabulary changes cannot silently leave the maintenance helper on a stale class list.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` — add or update parity coverage for the maintenance helper's active-record class list / emitted full-map shape.

### Commands

1. `npm run build` from `tools/validators`.
2. `npm run build` from `tools/world-mcp`.
3. `node --test dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp`.

## Outcome

Completed: 2026-05-29.

`plan_story_state_maintenance` no longer carries a local active-record class tuple. The validator package now publicly exports the active-record class tuple/type, and the maintenance helper imports that tuple to seed/replay full `PG.state_snapshot.active_records` maps. Emitted maintenance patch-plan behavior is unchanged.

## Verification Result

1. Baseline before edits: `npm run build` from `tools/validators` passed.
2. Baseline before edits: `npm run build` from `tools/world-mcp` passed.
3. Baseline before edits: `node --test dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp` passed: 4 tests, 4 pass.
4. Final: `npm run build` from `tools/validators` passed.
5. Final: `npm run build` from `tools/world-mcp` passed.
6. Final: `node --test dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp` passed: 4 tests, 4 pass. The focused test now asserts the emitted maintenance PG active-record keys match `@worldloom/validators` `ACTIVE_RECORDS_CLASSES`.
7. Package public-surface review: `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md` were inspected for same-seam stale active-record tuple/public-export guidance; no user-facing doc update was required because this change does not alter MCP tool behavior or invocation shape.

## Deviations

The ticket allowed either a public export or a parity-only test. The landed path uses the public validators export, so no private source import or package-local duplicate tuple remains. No validators test file was added because the world-mcp focused test imports the public export and the validators build proves the emitted public declaration surface.
