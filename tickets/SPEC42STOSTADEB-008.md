# SPEC42STOSTADEB-008: Shared validators — state-snapshot / replay / branch-isolation / observer-firewall extensions for CLK/STSEC/STQ

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends 4 existing structural validators to handle the 3 new record classes in their cross-class validation logic; no new validators introduced; no existing per-class validator logic altered
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md

## Problem

Four existing structural validators (`state_snapshot_integrity`, `snapshot_replay_equality`, `branch_isolation`, `observer_firewall`) enumerate the current 12 story-bundle record classes in their cross-class validation logic. Without extension, they will silently ignore CLK/STSEC/STQ records in PG.state_snapshot.active_records[], allowing stale entries to persist (state_snapshot_integrity), replay non-determinism for clock-tick / secret-reveal / STQ-status transitions (snapshot_replay_equality), sibling-branch CLK/STSEC/STQ leakage into target snapshots (branch_isolation), and storylet preconditioning on hidden CLK/STSEC for actors with no access route (observer_firewall). This ticket extends each of the four shared validators to recognize the three new classes in their cross-class enumerations.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): all 4 existing validator files exist (`tools/validators/src/structural/state-snapshot-integrity.ts`, `tools/validators/src/structural/snapshot-replay-equality.ts`, `tools/validators/src/structural/branch-isolation.ts`, `tools/validators/src/structural/observer-firewall.ts`); verified in SPEC-42 brainstorm agent reports as the canonical cross-class validators at `tools/validators/src/public/registry.ts:39-64`. Each validator enumerates the current 12 active-record classes in its logic; the extension pattern is to add CLK/STSEC/STQ to the enumeration alongside existing classes.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators §Shared section: `state_snapshot_integrity` (handles new CLK/STSEC/STQ slots in PG.state_snapshot.active_records[]); `snapshot_replay_equality` (replays CLK ticks, STSEC reveals, STQ status transitions deterministically); plus the spec's §FOUNDATIONS Alignment row for Rule 4 names `branch_isolation` as needing extension and §6b row names `observer_firewall` as needing extension. All four are extended in this ticket.
3. Cross-skill / cross-tool shared boundary: these 4 validators are the **cross-class structural defenses** that protect every PG commit. Their extensions compose with the per-class validators from SPEC42STOSTADEB-005 / -006 / -007 — per-class validators enforce per-record invariants; these shared validators enforce cross-record invariants (snapshot integrity, replay determinism, branch isolation, observer-firewall integration). The shared file `tools/validators/src/public/registry.ts` is also touched by -005 / -006 / -007 with non-overlapping additions; no semantic conflict.
4. FOUNDATIONS §Rule 4 (No Globalization by Accident) motivates the `branch_isolation` extension: all three new classes are branch-scoped (each carries `created_at_page`); `branch_isolation` extends to enforce no sibling-branch CLK/STSEC/STQ references in PG snapshots — preserving the per-branch scope guarantee per SPEC-42 §FOUNDATIONS Alignment Rule 4 row.
5. HARD-GATE validator surface: all 4 extended validators continue to run at engine pre-apply on every story-bundle commit. Extension preserves their gate status; just expands the class coverage. Mystery Reserve firewall: not directly touched (these are cross-class structural validators; Mystery Reserve firewall is enforced by `rule7_mystery_reserve_preservation` + `secret_mystery_firewall_compliance` from -006). Hook 3 path-pattern coverage: unchanged.

## Architecture Check

1. **Cross-class extension as one cohesive ticket**: all 4 validators share the same extension pattern (add CLK/STSEC/STQ to their class-enumeration). Bundling them keeps the cross-class structural-defense extension reviewable as a unit — reviewers see the 4 validator extensions in one diff and verify consistency across them.
2. **No new validators introduced**: this ticket extends existing validators only. The structural-validator registry contract is unchanged at the validator-list level.
3. **Mirrors the canonical 12-class enumeration pattern**: each validator's existing enumeration adds 3 new entries in the same shape. No new validation logic categories; just additive enumeration.
4. **`state_snapshot_integrity` integrates with SPEC42STOSTADEB-001 / -002 / -003's PG.state_snapshot.active_records extension**: the per-class foundation tickets add CLK/STSEC/STQ to the schema enum (`tools/validators/src/schemas/story-page.schema.json`); this ticket adds the validator-side enforcement that those new enum entries are populated coherently.

## Verification Layers

1. `state_snapshot_integrity` flags a `PG.state_snapshot.active_records[CLK]` listing a CLK whose `status: resolved` precedes this snapshot → validator test
2. `state_snapshot_integrity` flags `active_records[STSEC]` listing a STSEC whose `status: revealed` already happened → validator test
3. `state_snapshot_integrity` flags `active_records[STQ]` listing a STQ whose `status: answered | paid_off | abandoned | superseded` → validator test
4. `snapshot_replay_equality` reproduces CLK value progression deterministically across a branch path with mixed tick directions → validator test
5. `snapshot_replay_equality` reproduces STSEC reveal events deterministically (status: hidden → partially_revealed → revealed) → validator test
6. `snapshot_replay_equality` reproduces STQ status transitions deterministically (open → complicated → answered) → validator test
7. `branch_isolation` flags sibling-branch CLK/STSEC/STQ references in target snapshot's `active_records[]` → validator test
8. `observer_firewall` flags storylet preconditioning on a hidden CLK / STSEC / STQ for an actor with no access route → validator test (composes with -005 / -006 / -007 predicates: `clock_at_least` / `secret_unrevealed` / `story_question_open` must respect visibility/holders/audience_visibility fields)

## What to Change

### 1. `state_snapshot_integrity` extension

Modify `tools/validators/src/structural/state-snapshot-integrity.ts`: extend the class-enumeration handling for `PG.state_snapshot.active_records[]` to include CLK/STSEC/STQ. The validator must:
- For each `active_records[CLK]` entry, verify the CLK record's `status ∈ {active, paused, fired}` (not resolved/abandoned/superseded) at this snapshot
- For each `active_records[STSEC]` entry, verify the STSEC's `status ∈ {hidden, partially_revealed}` (not revealed/disproven/abandoned)
- For each `active_records[STQ]` entry, verify the STQ's `status ∈ {open, complicated}` (not answered/paid_off/abandoned/inherited/superseded)
- Existing 12-class enumeration unchanged; new entries follow the same pattern

### 2. `snapshot_replay_equality` extension

Modify `tools/validators/src/structural/snapshot-replay-equality.ts`: extend the replay logic to handle CLK tick history (deterministically reconstructs CLK.value across the branch path by replaying tick_history[] entries in event order), STSEC reveal events (deterministically transitions STSEC.status across the branch path), and STQ status transitions (deterministically reconstructs STQ.status across the branch path). Existing replay logic for the 12 current classes unchanged.

### 3. `branch_isolation` extension

Modify `tools/validators/src/structural/branch-isolation.ts`: extend the cross-branch reference scan to flag sibling-branch CLK/STSEC/STQ references in the target snapshot's `active_records[]` or any field that holds record references (`linked_records[]`, `source_records[]`, `payoff_of`, etc.). The validator must enforce that all referenced records belong to the current branch's ancestor path. Existing 12-class enumeration extended.

### 4. `observer_firewall` extension

Modify `tools/validators/src/structural/observer-firewall.ts`: extend the observer-firewall logic to handle the visibility fields of the three new classes:
- `CLK.visibility: hidden | holder_specific | public | factional` — storylet preconditioning on a hidden CLK requires the acting actor to be in the CLK's holder set (or have factional access)
- `STSEC.holders[]` — storylet preconditioning on a hidden STSEC requires the actor to be in STSEC.holders[]
- `STQ.audience_visibility: hidden | implied | explicit` — storylet preconditioning on an STQ marked hidden requires the actor to have access to the source_records[] grounding (this is the audience-vs-character firewall integration)

Existing 12-class enumeration unchanged.

## Files to Touch

- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — class enumeration extension)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — replay logic extension)
- `tools/validators/src/structural/branch-isolation.ts` (modify — cross-branch reference scan extension)
- `tools/validators/src/structural/observer-firewall.ts` (modify — visibility-field handling extension)

## Out of Scope

- CLK/STSEC/STQ per-class validators — owned by SPEC42STOSTADEB-005 / -006 / -007
- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- MCP retrieval surface extensions — owned by SPEC42STOSTADEB-004
- Skill integrations — owned by SPEC42STOSTADEB-009 through -013
- Predicate DSL extensions — owned by SPEC42STOSTADEB-005 / -006 / -007 (per-class)
- Validator registry registrations — owned by SPEC42STOSTADEB-005 / -006 / -007 (per-class new validators); this ticket extends existing registered validators only

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 4 extended validators PASS on positive fixtures (CLK/STSEC/STQ records correctly listed in active_records; replay determinism preserved; branch isolation respected; observer firewall respected) and FAIL on negative fixtures (stale active_records entries; non-deterministic replay; sibling-branch references; hidden-record preconditioning by unauthorized actors)
2. `npm test --prefix tools/validators` (regression) — existing 12-class enumeration logic still passes for STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA/STSTAT records

### Invariants

1. The 4 shared validators continue to run at engine pre-apply on every story-bundle commit
2. Class enumeration grows from 12 to 15 in each validator's cross-class scan logic; no class is dropped or renamed
3. No new validators introduced; the structural-validator registry's validator-list is unchanged
4. Replay determinism is preserved across CLK/STSEC/STQ state transitions per the snapshot_replay_equality validator
5. Branch isolation extends to the 3 new classes — sibling-branch references HARD-REJECTed in target snapshots
6. Observer firewall extends to the 3 new classes — hidden-record preconditioning by unauthorized actors HARD-REJECTed

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify) — extend with CLK/STSEC/STQ stale-entry test cases
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — extend with CLK tick replay, STSEC reveal replay, STQ status transition replay test cases
3. `tools/validators/tests/structural/branch-isolation.test.ts` (modify) — extend with sibling-branch CLK/STSEC/STQ reference test cases
4. `tools/validators/tests/structural/observer-firewall.test.ts` (modify) — extend with hidden-CLK/STSEC/STQ unauthorized-preconditioning test cases

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with cross-class extension coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
