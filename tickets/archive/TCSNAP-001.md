# TCSNAP-001: Operator CLI to compute a turn-cycle PG `state_snapshot.active_records` from parent + state_delta

**Status**: DONE
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new operator CLI under `tools/world-mcp/src/cli/` reusing `replayActiveRecords` from `@worldloom/validators` (`tools/validators/src/_helpers/state-snapshot-replay.ts`); consumed by `branching-story-turn-cycle` (and usable by `branching-story-bootstrap`).
**Deps**: None.

## Problem

In `branching-story-turn-cycle` Phase 6, the author hand-computes `PG.state_snapshot.active_records` as `parent.active_records + state_delta.create − state_delta.supersede − state_delta.close`, **including** the non-obvious inactive-status exclusion (a supersession-create whose lifecycle status is inactive — e.g. `CLK status: resolved`, `STQ status: answered`, `STEMO status: settled` — is created but must be omitted from `active_records`). This is the single most error-prone hand-computation in the turn: an omission or a wrongly-included inactive successor is only caught at dry-run by `snapshot_replay_equality`, forcing an edit→recompute-hash→re-validate loop.

The deterministic logic already exists and is tested: `replayActiveRecords(parentActiveRecords, delta, recordsById)` (`tools/validators/src/_helpers/state-snapshot-replay.ts:64`) computes exactly this map, applying the inactive-status exclusion via `allowedActiveStatuses` / `lifecycleStatus` (lines ~90–99). It is consumed by `snapshot-replay-equality.ts:227` (pre-apply validation). But **no operator CLI exposes it**, so turn-cycle authors reimplement it by hand instead of deriving it deterministically — the same gap that `compute-pg-hashes` was created to close for the state hash. (Correction 2026-05-29: the helper is also **not exported** from the `@worldloom/validators` public surface — only `ACTIVE_RECORDS_CLASSES` is — so any consumer must first export it.)

This is an ergonomics-and-solidity improvement, not a correctness gap: `snapshot_replay_equality` already guarantees the committed snapshot is correct. The value is shifting derivation of the deterministic field from by-hand to by-tool, eliminating a class of authoring iterations.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/_helpers/state-snapshot-replay.ts:64` exports `replayActiveRecords(parentActiveRecords: Record<string, readonly string[]>, delta: StateDelta, recordsById: StoryRecordMap): Record<ActiveRecordsClass, string[]>`. It seeds from parent active records, drops `supersede ∪ close`, and adds `create` ids whose lifecycle status is in the class's active set. Confirmed by direct read.
2. No CLI under `tools/world-mcp/dist/src/cli/` emits a PG snapshot (`ls | grep snapshot|replay` → none). The existing deterministic-helper CLI precedent is `tools/world-mcp/src/cli/compute-pg-hashes.js` (per `branching-story-turn-cycle/references/phase-9-validation-gates.md`). Confirmed.
3. Cross-skill boundary under audit: the `active_records` replay contract shared by `snapshot-replay-equality` (validation), `plan-story-state-maintenance` (maintenance planning), and now this CLI (authoring). All three must call the **same** `replayActiveRecords` — the CLI must not reimplement the rule, or the three surfaces could drift. The CLI is a thin wrapper, exactly as `compute-pg-hashes` wraps `computePgStateHash`. **Correction (2026-05-29):** this drift was found to ALREADY EXIST. `tools/world-mcp/src/tools/plan-story-state-maintenance.ts:161` carried its own divergent local `replayActiveRecords` that omitted the inactive-status exclusion and took no `recordsById`, so a maintenance plan creating an inactive-status STEMO/STPLAN successor would emit a snapshot the canonical validator rejects. Per author approval, this ticket also unifies that surface onto the exported shared helper (passing `recordsById` built from the plan's created record bodies), making Assumption #3's "all three call the same helper" true rather than aspirational.
4. FOUNDATIONS principle restated: §Tooling Recommendation (machine-facing determinism — the canonical hash/replay computations must come from one shared implementation, never hand-rolled). This CLI extends that principle from the state hash (already tooled) to the active-records replay (currently hand-computed). It does not touch Canon Layers, Validation Rules, or the Mystery Reserve firewall.
5. Schema/data-contract impact: none. This reads existing records and emits a computed projection; it introduces no new field, op, or schema change, and is purely additive (a new CLI). No consumer of any schema changes.
6. Adjacent contradiction classification: none uncovered. `entity_status` is derived from active `STSTAT` rather than by `replayActiveRecords`; whether the CLI also emits `entity_status` is an optional convenience (see Out of Scope), not a contradiction.

## Architecture Check

1. Cleaner than the status quo (hand-computation re-checked only at dry-run) and cleaner than a turn-cycle-only inline reimplementation: a thin CLI over the **existing** `replayActiveRecords` keeps a single source of truth for the replay rule across the validator, the maintenance planner, and the authoring aid — so the authoring aid cannot disagree with the validator that will later gate the commit.
2. No backwards-compatibility aliasing/shims: it wraps the canonical helper; it does not fork or re-encode the rule. If the helper's inactive-status logic evolves, the CLI inherits it automatically.

## Verification Layers

1. Invariant: the CLI's `active_records` output equals what `snapshot_replay_equality` will expect for the same parent+delta → skill dry-run (compute snapshot via CLI, paste into the PG, and confirm `snapshot_replay_equality` passes with zero diff) + unit test asserting CLI output == `replayActiveRecords` direct call on a fixture.
2. Invariant: the inactive-status exclusion is honored (a created-but-resolved CLK/answered STQ/settled STEMO is omitted) → unit test with a delta that creates an inactive-status successor, asserting it is absent from the output.
3. Invariant: single-source-of-truth — the CLI calls `replayActiveRecords`, not a copy → codebase grep-proof (CLI imports the helper symbol; no local re-implementation of drop/add logic).

## What to Change

### 1. Add a `compute-pg-snapshot` operator CLI

Add `tools/world-mcp/src/cli/compute-pg-snapshot.ts` (+ built `dist` artifact), modeled on `compute-pg-hashes.ts`. Input: the patch-plan envelope JSON path (already persisted by the turn-cycle flow) — it carries `parent_page_id` and the create/supersede/close record bodies. The CLI reads the parent PG's `state_snapshot.active_records` from disk (resolving world root by `--world-root` / `WORLDLOOM_ROOT` / cwd auto-discovery, matching the other CLIs), builds the `recordsById` map from the envelope's create payloads (so lifecycle status of new records is available), calls `replayActiveRecords`, and emits the computed `active_records` map to stdout as JSON. The author diffs it against the drafted `PG.state_snapshot.active_records`.

### 2. Reference it in the turn-cycle Phase 6 guidance

In `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md`, add a step pointing authors to run `compute-pg-snapshot` to derive `active_records` deterministically before drafting the snapshot, naming it as the authoring analogue of `compute-pg-hashes` (which Phase 9 already prescribes). Note the inactive-status exclusion is handled by the tool so authors do not reason it by hand.

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-snapshot.ts` (new) + corresponding `dist` build output
- `tools/world-mcp/tests/cli/compute-pg-snapshot.test.ts` (new)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)

## Out of Scope

- Computing `visible_affordances` (authorial, not deterministic) and `validation_trace` (authored per-gate).
- Computing `entity_status` and `unresolved_mystery_claims` — may be added as an optional convenience in a follow-up, but the primary, highest-error-risk target is `active_records`. If included, `entity_status` must derive from active `STSTAT` and `unresolved_mystery_claims` from `projectUnresolvedMysteryClaims` (same file), not be re-implemented.
- Any change to `replayActiveRecords` itself or to `snapshot_replay_equality`.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-mcp/dist/src/cli/compute-pg-snapshot.js <envelope.json>` emits an `active_records` map that, when stamped into the PG record, makes `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <envelope.json>` pass `snapshot_replay_equality` with zero diff (verified against the committed PG-5 / red-bunny envelope as a regression fixture).
2. Unit test: CLI output equals `replayActiveRecords` invoked directly on the same parent+delta fixture.
3. Unit test: a delta creating an inactive-status successor (e.g. a `CLK` with `status: resolved`) yields output that omits that id from the `CLK` list.

### Invariants

1. The CLI produces byte-identical `active_records` to what `snapshot_replay_equality` expects for the same inputs (single source of truth).
2. The CLI is read-only and world-root-resolved like the sibling `compute-pg-hashes` / `validate-patch-plan` CLIs.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/compute-pg-snapshot.test.ts` — output-equals-helper, inactive-status exclusion, and a red-bunny PG-5 regression fixture.

### Commands

1. `npm --prefix tools/world-mcp run build && npm --prefix tools/world-mcp test` (build + CLI unit tests; run from the package dir per the validators/world-mcp cwd requirement).
2. `node tools/world-mcp/dist/src/cli/compute-pg-snapshot.js /tmp/<plan>.json` then `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<plan>.json` (end-to-end: computed snapshot passes `snapshot_replay_equality`).
