# WMCP-016: Remove or prove parity for plan_story_state_maintenance active-record class copy

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/plan-story-state-maintenance.ts`, likely `tools/validators/src/public/index.ts` or a package-local parity test, and focused `tools/world-mcp` tests.
**Deps**: `archive/tickets/PGMAP-002.md`

## Problem

`archive/tickets/PGMAP-002.md` preserved the current full-map `PG.state_snapshot.active_records` contract and audited the consumers. During post-ticket review, one adjacent drift risk remained: `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` carries its own local `ACTIVE_RECORDS_CLASSES` tuple, byte-identical today to `tools/validators/src/_helpers/state-snapshot-replay.ts`, and uses it to replay maintenance PG snapshots.

The local copy is not a current behavior bug, but it weakens the active-record contract handoff. If the validator helper's class list changes later, `plan_story_state_maintenance` can silently emit a maintenance PG with a different full-map shape unless the two surfaces consume one source or have an explicit parity test.

## Assumption Reassessment (2026-05-29)

1. **World-mcp producer check.** `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` defines a local `ACTIVE_RECORDS_CLASSES` list and uses it in `activeRecordsClassOf` and `replayActiveRecords` to create the maintenance PG `state_snapshot.active_records`.
2. **Validator authority check.** `tools/validators/src/_helpers/state-snapshot-replay.ts` defines the active validator helper `ACTIVE_RECORDS_CLASSES`, `OPTIONAL_ACTIVE_RECORDS_CLASSES`, `activeRecordsClassOf`, and `replayActiveRecords`; PGMAP-002 treated this helper plus shared story-state contract §4.2 as the authoritative validator/source-contract surface.
3. **Shared boundary under audit.** The `PG.state_snapshot.active_records` class vocabulary used by validators and by `plan_story_state_maintenance`'s generated maintenance PG.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §5b requires story-bundle record fields to be load-bearing. A duplicated class vocabulary is acceptable only if it cannot drift silently from the validation/audit surface that makes the full map load-bearing.
5. **Package dependency state.** `tools/world-mcp/package.json` already depends on `@worldloom/validators`, but `tools/validators/src/public/index.ts` does not currently export `ACTIVE_RECORDS_CLASSES` or replay helpers. Directly importing `src/_helpers/...` across package boundaries would create a private-source coupling unless the active implementation deliberately chooses a same-repo source import and proves it.

## Architecture Check

1. Prefer a single public producer surface when practical: export the active-record class tuple, and optionally the replay helper, from `@worldloom/validators` public API, then have `plan_story_state_maintenance` consume that public surface. If a public export is too wide for this small cleanup, add a focused parity test that fails when the two lists diverge.
2. No backwards-compatibility aliasing/shims should be introduced. This is a drift-prevention cleanup; it must not change emitted maintenance patch-plan behavior.

## Verification Layers

1. World-mcp maintenance PG emits the same full active-record map -> focused `plan-story-state-maintenance` test or new parity assertion.
2. Validator and world-mcp active-record class lists cannot drift silently -> public import proof or parity test comparing the exact tuple.
3. Package boundary remains clean -> `tools/validators` and `tools/world-mcp` builds pass, with no private unexported package dependency unless explicitly justified in reassessment.

## What to Change

### 1. Choose the coupling shape

Either export the active-record tuple/replay helper from `@worldloom/validators` public API and consume it in `plan-story-state-maintenance`, or keep the local tuple but add a focused world-mcp test that compares it to the validator tuple through an intentional import path.

### 2. Preserve emitted behavior

Do not change the maintenance helper's patch-plan shape, operation order, or state-delta semantics. The maintenance PG must still include a full `state_snapshot.active_records` map after replaying the parent snapshot plus maintenance SE delta.

### 3. Prove parity

Update focused tests so a future class-list change fails loudly unless both validator and world-mcp maintenance surfaces move together.

## Files to Touch

- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (modify or inspect)
- `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` (modify or add focused parity coverage)
- `tools/validators/src/public/index.ts` (modify only if choosing a public export)
- `tools/validators/tests/**` (modify only if public export coverage is needed)
- `tickets/WMCP-016.md` (modify closeout/reassessment)

## Out of Scope

- Changing the active-record class vocabulary.
- Changing `compatibility_drift`, `active_records_full_shape`, or hard replay validator behavior.
- Editing live story-bundle `_source/` records or migrating historical pages.

## Acceptance Criteria

### Tests That Must Pass

1. A focused test or import-level assertion proves `plan_story_state_maintenance` uses the same active-record class set as the validators helper.
2. Existing maintenance-helper tests still prove the emitted maintenance PG includes replayed `SREL`, `STPLAN`, and `STEMO` active records.
3. Package builds for the changed producer/consumer packages pass.

### Invariants

1. `plan_story_state_maintenance` emits the same patch-plan shape and active-record replay semantics as before this cleanup.
2. Future active-record vocabulary changes cannot silently leave the maintenance helper on a stale class list.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` — add or update parity coverage for the maintenance helper's active-record class list / emitted full-map shape.
2. `tools/validators/tests/**` — only if a new public export requires focused public-surface coverage.

### Commands

1. `npm run build` from `tools/validators` if the validators public API is changed.
2. `npm run build` from `tools/world-mcp`.
3. `node --test dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp`.
