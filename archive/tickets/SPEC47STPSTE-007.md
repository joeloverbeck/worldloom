# SPEC47STPSTE-007: Extend shared validators (ACTIVE_RECORDS_CLASSES + 5 validators) for STPLAN/STEMO recognition

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `ACTIVE_RECORDS_CLASSES` constant + 5 named shared validators to recognize STPLAN and STEMO as valid active-record classes
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`, `archive/tickets/SPEC47STPSTE-009.md`

## Problem

SPEC-47's new STPLAN and STEMO record classes need recognition across the validator framework's shared infrastructure that operates over the closed set of active record classes (state-snapshot replay, active-records full-shape validation, state-delta class integrity, snapshot replay equality, mid-story record introduction grounding, observer firewall). Without these extensions, the validator chain treats STPLAN/STEMO records as unknown classes and either rejects them at the active-records-full-shape gate or silently misses them at replay/firewall checks. Per SPEC-47 §Approach §B D-B3, all 5 listed shared validators plus the `ACTIVE_RECORDS_CLASSES` central constant need extension; `archive/tickets/SPEC47STPSTE-009.md`'s parser extension (D-B5) is consumed here via D-B6 (midstory-record-introduction-grounding consumes the extended parser).

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified the 9 shared validator/helper files exist at HEAD per the pre-Write verification: `tools/validators/src/_helpers/state-snapshot-replay.ts` (ACTIVE_RECORDS_CLASSES central constant), `tools/validators/src/structural/active-records-full-shape.ts`, `tools/validators/src/structural/state-delta-class-integrity.ts`, `tools/validators/src/structural/snapshot-replay-equality.ts`, `tools/validators/src/structural/midstory-record-introduction-grounding.ts`, `tools/validators/src/structural/observer-firewall.ts`, `tools/validators/src/structural/state-snapshot-integrity.ts`, `tools/validators/src/structural/compatibility-drift.ts`, and `tools/validators/src/structural/utils.ts`. The latter three are transitive shared surfaces: state-snapshot-integrity and compatibility-drift import ACTIVE_RECORDS_CLASSES, while utils controls structural query/schema/authority recognition for story record node types.
2. Verified SPEC-47 §Approach §B D-B3 lists 5 shared validators explicitly (`active_records_full_shape`, `state_delta_class_integrity`, `snapshot_replay_equality`, `midstory_record_introduction_grounding`, `observer_firewall`); D-B6 extends `midstory-record-introduction-grounding.ts` to consume `archive/tickets/SPEC47STPSTE-009.md`'s extended parser. In practice, the ACTIVE_RECORDS_CLASSES central constant lives at `tools/validators/src/_helpers/state-snapshot-replay.ts`; extending the constant cascades through any validator that imports from it (per worldloom convention, ~2-4 additional files transitively reference the constant beyond the 5 named).
3. Cross-skill boundary under audit: the shared validators are the validator-framework's class-recognition surface; extending ACTIVE_RECORDS_CLASSES + the 5 named validators + their transitive consumers (state-snapshot-integrity, compatibility-drift) ensures STPLAN/STEMO records appear in `PG.state_snapshot.active_records` correctly, are subject to state-delta class integrity at SE events, replay deterministically per snapshot_replay_equality, are recognized by midstory-record-introduction-grounding's tag-class enum (consumed via the extended parser from `archive/tickets/SPEC47STPSTE-009.md`), and have their belief_basis/appraisal_basis accessible-to-holder check enforced by observer_firewall.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — extending ACTIVE_RECORDS_CLASSES and the snapshot-replay machinery preserves the per-page replayability invariant: every cumulative-state reconstruction from SE state-deltas yields the same `PG.state_snapshot.active_records`, including STPLAN/STEMO entries. Without this extension, replay would non-deterministically include or exclude STPLAN/STEMO records depending on whether the validator codepath happened to handle them.
5. Shared validator extensions land in `tools/validators/src/structural/` and `tools/validators/src/_helpers/` — per the §Step 6.2(c) per-ticket-type granularity rule for item 5: these are structural validators that gate story-bundle record writes at engine pre-apply time (Canon Safety surface). HARD-GATE discipline preserved: extensions only add STPLAN/STEMO to the recognized-class enum; no canon-safety bypass introduced.

## Architecture Check

1. ACTIVE_RECORDS_CLASSES is the single-source-of-truth for "which record classes participate in active-state replay"; extending it once and letting transitive consumers re-import is preferable to per-validator class-list literals (which would drift silently). Following the established convention from SPEC-42's CLK/STSEC/STQ additions keeps the validator framework consistent.
2. No backwards-compatibility aliasing/shims introduced — additions only. Existing classes' validator behavior is unchanged.

## Verification Layers

1. ACTIVE_RECORDS_CLASSES includes STPLAN and STEMO → codebase grep-proof `grep -A 30 "ACTIVE_RECORDS_CLASSES" tools/validators/src/_helpers/state-snapshot-replay.ts` includes both class strings
2. Each of the 5 named shared validators recognizes STPLAN/STEMO without throwing "unknown class" errors → schema validation via per-validator test against representative fixtures
3. midstory-record-introduction-grounding.ts consumes `archive/tickets/SPEC47STPSTE-009.md`'s extended parser (recognizes `intro:STPLAN(...)` and `intro:STEMO(...)` tags) → integration test against fixture SE records with the new tags
4. observer-firewall.ts treats STPLAN.belief_basis and STEMO.appraisal_basis as legitimate access-route inputs → schema validation per the observer-firewall contract
5. state-snapshot-integrity.ts and compatibility-drift.ts (transitive consumers of ACTIVE_RECORDS_CLASSES) continue to behave correctly after the class-enum extension → existing test suites pass

## What to Change

### 1. Extend `ACTIVE_RECORDS_CLASSES` at `tools/validators/src/_helpers/state-snapshot-replay.ts`

Add `"STPLAN"` and `"STEMO"` to the central prefix constant. Reassessment corrected the draft wording here: the live `ACTIVE_RECORDS_CLASSES` contract is keyed by active-record prefixes (`STENT`, `STINT`, etc.), not world-index node-type names. The structural query/schema/authority registry in `tools/validators/src/structural/utils.ts` separately carries the node-type names `story_plan_record` and `story_emotion_record`.

### 2. Extend 5 named shared validators

- `active-records-full-shape.ts` — recognize STPLAN and STEMO entries in `PG.state_snapshot.active_records` (enum extension only; the full-shape schema for each class is enforced by ticket 005/006's per-class schema-compliance validators).
- `state-delta-class-integrity.ts` — recognize STPLAN/STEMO in the create/supersede/close vocabulary at SE events.
- `snapshot-replay-equality.ts` — walk STPLAN/STEMO records during deterministic replay (cumulative state at each PG snapshot must include both classes).
- `midstory-record-introduction-grounding.ts` — recognize `intro:STPLAN(...)` and `intro:STEMO(...)` tag-class values; consume `archive/tickets/SPEC47STPSTE-009.md`'s extended parser (`MIDSTORY_TRIGGERS_STPLAN` + `MIDSTORY_TRIGGERS_STEMO` + extended `MIDSTORY_TRIGGERS_BY_CLASS` map) per SPEC-47 D-B6.
- `observer-firewall.ts` — treat STPLAN.belief_basis[] and STEMO.appraisal_basis[] as access-route inputs (a plan/emotion-driven move can be grounded by the holder having access to one of the cited BELs).

### 3. Verify transitive consumers continue to behave correctly

`state-snapshot-integrity.ts` and `compatibility-drift.ts` import from `_helpers/state-snapshot-replay.ts`; the ACTIVE_RECORDS_CLASSES extension cascades automatically. Verify each consumer's tests still pass with the extended class list.

## Files to Touch

- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify) — ACTIVE_RECORDS_CLASSES extension
- `tools/validators/src/structural/active-records-full-shape.ts` (modify)
- `tools/validators/src/structural/state-delta-class-integrity.ts` (modify)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify)
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify) — class-enum extension + parser-consumption update per D-B6
- `tools/validators/src/structural/observer-firewall.ts` (modify)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify, if needed) — verify transitive consumer behavior; modify only if test failures surface
- `tools/validators/src/structural/compatibility-drift.ts` (modify, if needed) — same caveat
- `tools/validators/src/structural/utils.ts` (modify) — structural query/schema/authority registry for `story_plan_record`
- `tools/validators/tests/structural/active-records-full-shape.test.ts` (modify)
- `tools/validators/tests/structural/compatibility-drift.test.ts` (modify)
- `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (modify)
- `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` (modify) — expected optional-absence count now includes STPLAN/STEMO

## Out of Scope

- Per-class STPLAN validators (12) — covered by ticket 005.
- Per-class STEMO validators (8-9) — covered by ticket 006.
- Tag-grammar parser extension (`midstory-introduction-utils.ts`) — covered by `archive/tickets/SPEC47STPSTE-009.md` (this ticket consumes that ticket's parser exports).
- Predicate-DSL extensions — covered by `archive/tickets/SPEC47STPSTE-008.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -A 22 "export const ACTIVE_RECORDS_CLASSES" tools/validators/src/_helpers/state-snapshot-replay.ts | grep -cE "STPLAN|STEMO"` returns 2.
2. Existing tests for all 5 named shared validators + state-snapshot-integrity + compatibility-drift continue to pass.
3. New integration test: a fixture bundle containing STPLAN + STEMO records exercises all 5 named shared validators without `unknown class` errors; replay equality holds across the bundle.
4. `intro:STPLAN(...)` and `intro:STEMO(...)` tags in SE.world_logic_rationale are accepted by midstory-record-introduction-grounding (consumes `archive/tickets/SPEC47STPSTE-009.md`'s parser exports).

### Invariants

1. The 5 named shared validators preserve their existing checks for the 16+ pre-existing active record classes (STENT, STSTAT, STINT, SF, BEL, etc.) — no regression.
2. ACTIVE_RECORDS_CLASSES is the single source-of-truth for the active-class enum; no per-validator hardcoded class lists are introduced.
3. The observer-firewall's access-route logic correctly treats STPLAN.belief_basis and STEMO.appraisal_basis as legitimate access inputs (per FOUNDATIONS §Story Bundles §6b).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modified) — round-trip: a bundle with STPLAN and STEMO records replays deterministically with both classes in cumulative `PG.state_snapshot.active_records`.
2. `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (modified) — `intro:STPLAN(...)` and `intro:STEMO(...)` tag-class values pass grounding.
3. `tools/validators/tests/structural/observer-firewall.test.ts` (modified) — STPLAN.belief_basis and STEMO.appraisal_basis citing an accessible BEL satisfy firewall; inaccessible STPLAN basis fails.
4. `tools/validators/tests/structural/state-delta-class-integrity.test.ts` / `active-records-full-shape.test.ts` / `compatibility-drift.test.ts` / `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` (modified) — shared class/optional-surface expectations include STPLAN/STEMO.

### Commands

1. From `tools/validators`: `npm test` (full validator package tests pass)
2. From repo root: `node --test tools/validators/dist/tests/structural/compatibility-drift.test.js tools/validators/dist/tests/structural/midstory-record-introduction-grounding.test.js tools/validators/dist/tests/structural/observer-firewall.test.js tools/validators/dist/tests/structural/state-delta-class-integrity.test.js tools/validators/dist/tests/structural/snapshot-replay-equality.test.js tools/validators/dist/tests/structural/active-records-full-shape.test.js` (focused shared-validator proof)

## Outcome

Completed: 2026-05-19

Implemented the shared STPLAN/STEMO recognition seam in `tools/validators`:

- Added `STPLAN` and `STEMO` to `ACTIVE_RECORDS_CLASSES` and `OPTIONAL_ACTIVE_RECORDS_CLASSES`, preserving the live prefix-keyed `PG.state_snapshot.active_records` contract.
- Extended state-delta integrity, snapshot replay, active-record full-shape, compatibility drift, mid-story introduction grounding, observer firewall, state-snapshot integrity, and structural query/schema/authority utilities so STPLAN/STEMO records are recognized and queried consistently.
- Added focused structural coverage for STPLAN/STEMO replay, state-delta resolution, `intro:` grounding, compatibility optional absence, and observer-firewall grounding through accessible plan/emotion belief bases.

Deviations from the draft:

- `ACTIVE_RECORDS_CLASSES` was not updated with `story_plan_record` / `story_emotion_record`; those are node-type names, while the live active-record map uses class prefixes. Node-type recognition was added to `tools/validators/src/structural/utils.ts` instead.
- The full package proof must run from `tools/validators` as `npm test`. The repo-root `npm --prefix tools/validators test` form leaves `process.cwd()` at the repo root, causing CLI tests to look for `dist/src/cli/world-validate.js` in the wrong directory.

## Verification Result

1. From repo root: `grep -A 22 "export const ACTIVE_RECORDS_CLASSES" tools/validators/src/_helpers/state-snapshot-replay.ts | grep -cE "STPLAN|STEMO"` — returned 2.
2. From repo root: `npm --prefix tools/validators run build` — passed.
3. From repo root: `node --test tools/validators/dist/tests/structural/compatibility-drift.test.js tools/validators/dist/tests/structural/midstory-record-introduction-grounding.test.js tools/validators/dist/tests/structural/observer-firewall.test.js tools/validators/dist/tests/structural/state-delta-class-integrity.test.js tools/validators/dist/tests/structural/snapshot-replay-equality.test.js tools/validators/dist/tests/structural/active-records-full-shape.test.js` — passed, 57 tests.
4. From `tools/validators`: `node --test dist/tests/integration/spec43-midstory-introduction.test.js` — passed, 21 tests.
5. From `tools/validators`: `npm test` — passed, 607 tests.
