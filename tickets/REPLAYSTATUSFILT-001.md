# REPLAYSTATUSFILT-001: snapshot_replay_equality must filter inactive-status records from expected active_records

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/_helpers/state-snapshot-replay.ts` (`replayActiveRecords` signature/behavior change); `tools/validators/src/structural/snapshot-replay-equality.ts` (call-site adjustment to thread the record body lookup); validator tests in `tools/validators/test/structural/`.
**Deps**: None

## Problem

Two validators currently disagree on what `PG.state_snapshot.active_records[<class>]` should contain when a turn's `SE.state_delta.create[]` adds a record whose body carries an inactive lifecycle status:

- `state_snapshot_integrity` (at `tools/validators/src/structural/state-snapshot-integrity.ts:273-307`) **rejects** records with inactive lifecycle status from `active_records[<class>]`. The allowed active statuses per `allowedActiveStatuses` (lines 315-330) are: `CLK` ∈ `{active, paused, fired}`; `STSEC` ∈ `{hidden, partially_revealed}`; `STQ` ∈ `{open, complicated}`; `STPLAN` ∈ `{active, blocked, suspended, revised}`; `STEMO` ∈ `{active, suppressed, dissociated}`. Records whose lifecycle status falls outside these sets (e.g., `CLK.status: resolved`, `STQ.status: answered`, `STSEC.status: revealed`) raise `state_snapshot_integrity.inactive_active_record`.
- `snapshot_replay_equality` (at `tools/validators/src/structural/snapshot-replay-equality.ts:227` consuming `replayActiveRecords` at `tools/validators/src/_helpers/state-snapshot-replay.ts:62-95`) **requires** every record in `SE.state_delta.create[]` to appear in `PG.state_snapshot.active_records[<class>]`, regardless of the record's lifecycle status. The replay algorithm unconditionally appends `state_delta.create[]` entries to the next snapshot.

Contradictory expectations: when the turn creates a CLK with `status: resolved` (or any inactive lifecycle status across the five classes), one validator demands inclusion in the snapshot and the other demands exclusion. The author has no lawful way to express "this record exists on disk and was lawfully created by this turn, but is in an inactive lifecycle state and therefore not in active_records." The shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` Output table lists `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` ops as the prescribed path for "advances/resolves an active pressure clock" (and the parallel for STSEC / STQ); the `branching-story-turn-cycle` SKILL.md likewise documents superseding into a resolved-status record as the canonical lifecycle. But the validator pair makes this path unreachable.

Concrete observed failure at `red-bunny` PG-3 turn-cycle (2026-05-26): the turn superseded `CLK-1` with `CLK-2 status: resolved` and `resolution_event: SE-3` per the SKILL.md prescription. `snapshot_replay_equality` demanded `CLK-2` in `active_records.CLK`; `state_snapshot_integrity` rejected it. The workaround was to weaken the lifecycle status from `resolved` to `paused` — semantically acceptable for that case (Jon's action paused rather than resolved the observation window), but a brittle workaround that doesn't generalize to genuine resolutions of `STQ` (answered), `STSEC` (revealed), or `STPLAN` (fulfilled).

## Assumption Reassessment (2026-05-26)

1. `replayActiveRecords` at `tools/validators/src/_helpers/state-snapshot-replay.ts:62-95` currently takes `parentActiveRecords` and `delta` only; it has no record-map argument and therefore cannot consult the new records' bodies for their lifecycle status. The function unconditionally appends every `delta.create[]` entry whose class is in `ACTIVE_RECORDS_CLASSES`. The fix requires threading a record-body lookup (the same `recordMap.byId` the call-site at `snapshot-replay-equality.ts:227` already builds) into the replay function.
2. `allowedActiveStatuses` at `state-snapshot-integrity.ts:315-330` is the canonical mapping of `recordClass → Set<active-status string>`. Currently only `state_snapshot_integrity` consumes it. After this ticket, `replayActiveRecords` consults the same mapping to keep the two validators internally consistent. The mapping should be promoted into a shared `_helpers` module so both consumers import the same source of truth; do NOT duplicate the switch statement.
3. Cross-skill / cross-artifact boundary: this ticket touches the validator-shared contract between `snapshot_replay_equality` and `state_snapshot_integrity`. The shared resource is the `allowedActiveStatuses` mapping plus the `replayActiveRecords` algorithm; promoting `allowedActiveStatuses` to `_helpers` plus extending `replayActiveRecords` to consult it is the minimal change that makes the two validators agree. No story-skill `SKILL.md` is impacted; the lifecycle-supersession patterns documented in `branching-story-turn-cycle` SKILL.md become reachable after this ticket without prose changes there.
4. `docs/FOUNDATIONS.md` does not directly govern validator-pair internal consistency or lifecycle-status filtering — these are below the contract level. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism, lines 654-658) governs the field set in story-bundle record schemas; the `status` field on `CLK` / `STSEC` / `STQ` / `STPLAN` / `STEMO` is load-bearing precisely because lifecycle status is consumed by validators and replay. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary, lines 618-622) confirms the PG snapshot is the fork primitive — implication: the snapshot must be internally consistent and reflect only currently-active state, otherwise downstream turn-cycles reading the snapshot inherit broken state. This ticket aligns the validator with §4a's implicit completeness invariant.
5. FOUNDATIONS principle restated: §4a names PG snapshots as the fork primitive. A fork primitive that contains records with inactive lifecycle status mis-represents the bundle's active state to subsequent turn-cycles. The validator pair currently demands an internally inconsistent snapshot when the turn creates an inactive-status record; the fix aligns the validators so that the snapshot reflects only currently-active records, matching the semantic the SKILL.md prescribes.
6. Schema extension classification: this ticket does NOT extend any story-bundle record schema. The `status` field on `CLK` / `STSEC` / `STQ` / `STPLAN` / `STEMO` is unchanged. The fix is a validator semantic alignment plus a small refactor to promote `allowedActiveStatuses` into a shared module.
7. Adjacent contradictions surfaced: the `state_delta_class_integrity` validator (separately) governs which classes are permitted in `state_delta.create/supersede/close[]`. It is not affected by this change; it does not consult lifecycle status. Confirm by grep before editing (`grep -n "status" tools/validators/src/structural/state-delta-class-integrity.ts` → no lifecycle-status references).
8. Greppable blast radius: `replayActiveRecords` is exported from `state-snapshot-replay.ts` and imported by `snapshot-replay-equality.ts` only (`grep -rn "replayActiveRecords" tools/validators/src/`). The function signature change is contained to one call site within the validators package. `allowedActiveStatuses` is currently a private function in `state-snapshot-integrity.ts`; promoting it to `_helpers` requires updating one import (in `state-snapshot-integrity.ts`) plus one new import (in `state-snapshot-replay.ts`).

## Architecture Check

1. Cleaner than alternatives because (a) it makes two validators consult the SAME source of truth for "what is an active lifecycle status" (the promoted `allowedActiveStatuses` helper) rather than each carrying its own implicit rule, (b) it makes the SKILL.md-prescribed supersession-to-resolved-status pattern actually reachable, removing the brittle workaround of weakening `resolved` to `paused` just to keep the validators happy, and (c) it aligns the PG snapshot's semantic content with FOUNDATIONS §4a's fork-primitive invariant (the snapshot reflects currently-active state). The alternative (let `snapshot_replay_equality` continue to demand inactive-status records in active_records and weaken `state_snapshot_integrity` to accept them) silently breaks the SKILL.md's documented lifecycle semantics by making `active_records` no longer mean "currently active."
2. No backwards-compatibility shim introduced. The `replayActiveRecords` function signature widens to accept a record-map argument; the call-site in `snapshot-replay-equality.ts` is updated to thread the existing `recordMap.byId` parameter. Pre-existing PG snapshots that were already validated under the old pair-of-rules (no inactive-status records present) continue to validate unchanged.

## Verification Layers

1. FOUNDATIONS §4a fork-primitive invariant served → FOUNDATIONS alignment check (§Story Bundles §4a lines 618-622 cited; the PG snapshot must reflect currently-active records for downstream turn-cycles to safely fork from it).
2. `replayActiveRecords` consults `allowedActiveStatuses` → schema validation (a unit test invokes `replayActiveRecords` with a synthetic delta that creates a CLK with `status: resolved`; the returned `active_records.CLK` excludes the resolved CLK).
3. `state_snapshot_integrity` and `snapshot_replay_equality` agree on the same expected snapshot → schema validation (a unit test runs both validators against a single PG envelope whose SE creates a CLK with `status: resolved`; both validators PASS with `active_records.CLK = []`).
4. Existing active-status records continue to round-trip → schema validation (regression test: a CLK with `status: active` continues to appear in the replayed `active_records.CLK`; same for STEMO, STQ, STPLAN, STSEC active-status values).
5. Skill-prescribed supersession pattern reachable end-to-end → skill dry-run (re-build the `red-bunny` PG-3 envelope with `CLK-2 status: resolved` and `resolution_event: SE-3`; both `snapshot_replay_equality` and `state_snapshot_integrity` pass against `active_records.CLK = []`).
6. No regression on `replayUnresolvedMysteryClaims` or other replay helpers → codebase grep-proof (`grep -rn "replayActiveRecords\|replayStateSnapshot\|replayUnresolvedMysteryClaims" tools/validators/src/` confirms only the one call site needed updating; other replay helpers are unaffected).

## What to Change

### 1. Promote `allowedActiveStatuses` to a shared helper

Move the `allowedActiveStatuses` function from `tools/validators/src/structural/state-snapshot-integrity.ts:315-330` into a new shared module at `tools/validators/src/_helpers/lifecycle-status.ts` (or extend the existing `state-snapshot-replay.ts` if that's the more natural home — implementer's judgment; both options are acceptable). Export it as a named function.

Update `state-snapshot-integrity.ts` to import from the new location. Update `state-snapshot-replay.ts` (or wherever `replayActiveRecords` lives) to import from the same source.

Keep the exact same mapping content; this is a pure code-organization move with no semantic change.

### 2. Extend `replayActiveRecords` to filter by lifecycle status

Current signature at `tools/validators/src/_helpers/state-snapshot-replay.ts:62-95`:

```typescript
export function replayActiveRecords(
  parentActiveRecords: Record<string, readonly string[]>,
  delta: StateDelta
): Record<ActiveRecordsClass, string[]>
```

New signature:

```typescript
export function replayActiveRecords(
  parentActiveRecords: Record<string, readonly string[]>,
  delta: StateDelta,
  recordsById: Map<string, IndexedRecord>
): Record<ActiveRecordsClass, string[]>
```

Behavior change: when adding an id from `delta.create[]` to the new snapshot, look up the record body via `recordsById.get(id)`; if the record's class has a non-empty `allowedActiveStatuses(class)` set, consult the record's lifecycle status (`record.parsed.status` for CLK / STSEC / STQ / STEMO; `record.parsed.plan_status` for STPLAN) and skip the id if the status is not in the allowed-active set. If `recordsById.get(id)` returns undefined (record not yet in the map), the existing fallback is to include the id (preserve current behavior to avoid false negatives during partial-snapshot builds).

Concrete patch shape (replacing lines 82-92):

```typescript
for (const id of delta.create ?? []) {
  const cls = activeRecordsClassOf(id);
  if (cls === null) {
    continue;
  }
  const allowed = allowedActiveStatuses(cls);
  if (allowed.size > 0) {
    const record = recordsById.get(id);
    if (record !== undefined) {
      const status = lifecycleStatus(record.parsed, cls);
      if (status !== undefined && !allowed.has(status)) {
        continue;
      }
    }
  }
  const list = next[cls];
  if (!list.includes(id)) {
    list.push(id);
  }
}
```

Where `lifecycleStatus` is the small helper currently inlined at `state-snapshot-integrity.ts:308-313`; promote it to the same shared `_helpers` module as `allowedActiveStatuses` so both consumers use the same lookup.

### 3. Update the call site

`tools/validators/src/structural/snapshot-replay-equality.ts:227`:

```typescript
const expectedActive = replayActiveRecords(parentActive, delta, recordMap.byId);
```

The existing `recordMap.byId` at the call site is the same shape needed; this is a direct argument-threading change.

Same change to any other call site uncovered by `grep -n "replayActiveRecords" tools/validators/src/` (currently only one).

### 4. Update `replayStateSnapshot` if it also calls `replayActiveRecords`

`replayStateSnapshot` at `state-snapshot-replay.ts` (use `grep -n "replayStateSnapshot" tools/validators/src/_helpers/state-snapshot-replay.ts` to find the function) wraps `replayActiveRecords`. Thread the `recordsById` argument through to it as well. Update its call site at `snapshot-replay-equality.ts:72` accordingly.

### 5. Add unit tests in `tools/validators/test/structural/snapshot-replay-equality.spec.ts` (or its existing equivalent)

Cover six cases:

1. CLK created with `status: active` → included in `active_records.CLK` (existing behavior preserved).
2. CLK created with `status: paused` → included (allowed-active status).
3. CLK created with `status: fired` → included (allowed-active status).
4. CLK created with `status: resolved` → EXCLUDED from `active_records.CLK` (new behavior).
5. CLK created with `status: abandoned` → EXCLUDED (new behavior).
6. STEMO created with `status: settled` → EXCLUDED from `active_records.STEMO` (parallel coverage on STEMO class — confirm the exact inactive enum values by grepping `tools/validators/src/schemas/story-emotion.schema.json` for the `status` enum).

Add a pair-consistency test: build a PG envelope where SE creates `CLK-X status: resolved`; run both `snapshot_replay_equality` and `state_snapshot_integrity` against the envelope; assert both PASS with `active_records.CLK = []`.

## Files to Touch

- `tools/validators/src/_helpers/lifecycle-status.ts` (new — promoted `allowedActiveStatuses` + `lifecycleStatus` helpers)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — extend `replayActiveRecords` signature; thread `recordsById` through `replayStateSnapshot`)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — pass `recordMap.byId` to `replayActiveRecords` and `replayStateSnapshot`)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — import `allowedActiveStatuses` and `lifecycleStatus` from the new helpers module; remove the local definitions)
- `tools/validators/test/structural/snapshot-replay-equality.spec.ts` (modify or new — add 6 lifecycle-status cases plus 1 pair-consistency test)

## Out of Scope

- Any change to the `status` enum on any record schema. The CLK / STSEC / STQ / STPLAN / STEMO status enums are unchanged.
- Any change to `state_snapshot_integrity`'s lifecycle-status rule. It already correctly rejects inactive-status records from `active_records[]`; this ticket aligns `snapshot_replay_equality` with that rule.
- Any change to the `branching-story-turn-cycle` SKILL.md. After this ticket, the SKILL.md's documented `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` patterns (which already prescribe status transitions to inactive values like `resolved`) become reachable without re-documentation.
- Backfill of any existing bundle whose CLK / STSEC / STQ / STPLAN / STEMO records were authored with the workaround status (e.g., `paused` instead of `resolved`). The workaround stays as-is; the new lifecycle-correct status is available for new authoring.
- Any change to FOUNDATIONS itself. The fix is below the contract level.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test -- snapshot-replay-equality` — all six lifecycle-status cases pass per Change Area 5; the pair-consistency test passes.
2. `cd tools/validators && npm test -- state-snapshot-integrity` — existing tests pass without modification; the `allowedActiveStatuses` import works after the move.
3. `cd tools/validators && npm test` — full validator suite passes (no regression on other replay-dependent validators).
4. Integration regression: re-build a synthetic `red-bunny`-shaped PG envelope with `CLK-2 status: resolved` and `resolution_event: SE-3`; both `snapshot_replay_equality` and `state_snapshot_integrity` PASS with `active_records.CLK = []`.
5. `bash scripts/build-all.sh && bash scripts/check-all.sh` — full-pipeline build + test verification.

### Invariants

1. `snapshot_replay_equality`'s expected `active_records[<class>]` MUST exclude any id from `delta.create[]` whose record body has a lifecycle status not in `allowedActiveStatuses(class)`.
2. `state_snapshot_integrity` and `snapshot_replay_equality` MUST consume the same `allowedActiveStatuses` mapping from the shared helper module (single source of truth).
3. Existing PG snapshots whose `delta.create[]` only adds active-status records continue to validate unchanged (no regression).
4. The shared helper module's exports MUST be the only definition of `allowedActiveStatuses` in `tools/validators/src/`. Grep-proof: `grep -rn "allowedActiveStatuses\|allowed_active_statuses" tools/validators/src/` returns matches only in the helper module and its two consumers.

## Test Plan

### New/Modified Tests

1. `tools/validators/test/structural/snapshot-replay-equality.spec.ts` — six new lifecycle-status cases (Change Area 5); rationale: covers the new behavior across active and inactive status values.
2. `tools/validators/test/structural/snapshot-replay-equality.spec.ts` — one pair-consistency test that runs both validators against a single envelope; rationale: proves the two validators agree on the same expected snapshot after the change.
3. `tools/validators/test/structural/state-snapshot-integrity.spec.ts` — existing tests; rationale: regression confirmation that the import refactor (helper promotion) didn't break the validator's existing behavior.

### Commands

1. `cd tools/validators && npm test -- snapshot-replay-equality` — targeted lifecycle-status test pass.
2. `cd tools/validators && npm test -- state-snapshot-integrity` — regression test pass.
3. `cd tools/validators && npm test` — full validator suite pass.
4. `bash scripts/build-all.sh && bash scripts/check-all.sh` — full-pipeline build + test verification.
5. `grep -rn "allowedActiveStatuses" tools/validators/src/` — confirms single source of truth (matches only in `_helpers/lifecycle-status.ts` + two consumers).
