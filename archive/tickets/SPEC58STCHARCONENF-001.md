# SPEC58STCHARCONENF-001: Accept STCHAR in state-delta class integrity

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`state_delta_class_integrity` structural validator); no impact on existing validators.
**Deps**: None

## Problem

At intake, lawful STCHAR lifecycle deltas failed `state_delta_class_integrity` because the validator's allowed-class set and node-type mapping both omitted `STCHAR`, even though the authoritative shared contract states the state-delta class set includes STCHAR. This was contract-to-enforcement drift left by SPEC-56/57 (SPEC-58 C1).

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/structural/state-delta-class-integrity.ts` (~lines 12–60): `STATE_DELTA_CLASSES` omits `STCHAR`, and `STORY_RECORD_NODE_TYPES` omits `story_character_authority_record`. Confirmed by spot-check grep (no `STCHAR` match in the file) this session.
2. `.claude/skills/_shared-templates/story-state-contract.md:216` — *"`SE.state_delta.create[]`, `supersede[]`, and `close[]` accept the same lifecycle-managed story-state class set, including `STCHAR` … the event schema and `state_delta_class_integrity` validator must move together with this contract."* The validator currently lags the contract.
3. Cross-artifact boundary: the `SE.state_delta` class set is shared between the SE JSON schema, this validator, and the shared contract. Live reassessment confirmed `tools/validators/src/schemas/story-event.schema.json` already permits `STCHAR` in `state_delta.create[]`, `supersede[]`, and `close[]`; this ticket brought the structural validator into line with the other two surfaces.
4. FOUNDATIONS Rule 1 (No Floating Facts) / §Story Bundles §6.1 (Story-Local Character Authority): lawful STCHAR lifecycle records must be validatable as grounded story state. Mis-rejecting them undercuts STCHAR's role as the runtime authority class.
5. Canon Safety surface: `state-delta-class-integrity.ts` is a structural validator under `tools/validators/src/structural/` that gates story-record writes at engine pre-apply. The change is additive (accept STCHAR) and weakens no Mystery Reserve firewall — unknown/non-lifecycle classes still fail; Rule 7 enforcement is untouched.
6. Package proof boundary: `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`, so focused proof used a fresh build plus direct compiled structural test before the full package suite.

## Architecture Check

1. Adds STCHAR to the existing allowed-class set and node-type map — the minimal, idiomatic fix that aligns enforcement to the already-authoritative contract; no parallel code path introduced.
2. No backwards-compatibility aliasing/shims — STCHAR is added directly to the canonical sets.

## Verification Layers

1. Lawful STCHAR `create`/`supersede`/`close` delta passes `state_delta_class_integrity` → codebase test (`state-delta-class-integrity.test.ts`).
2. An unknown/non-lifecycle class still fails → codebase test (negative case).
3. STCHAR supersession integrity remains caught by `stchar_supersession_integrity` → FOUNDATIONS alignment check + existing validator (unchanged).

## Landed Changes

### 1. Added STCHAR to the allowed class set

Added `"STCHAR"` to `STATE_DELTA_CLASSES` in `state-delta-class-integrity.ts`.

### 2. Added the node-type mapping

Added `story_character_authority_record` to `STORY_RECORD_NODE_TYPES` so the class-to-node-type resolution covers STCHAR.

## Files to Touch

- `tools/validators/src/structural/state-delta-class-integrity.ts` (modify)
- `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (modify)

## Out of Scope

- C2/C3/C4 changes (separate tickets).
- The SE JSON schema (already permits STCHAR in `state_delta`).
- Mystery Reserve firewall logic.

## Acceptance Criteria

### Tests That Must Pass

1. `SE.state_delta.create` / `supersede` / `close` referencing a `STCHAR-<n>` id passes `state_delta_class_integrity`.
2. An unknown class in a state delta still fails.
3. `npm test` from `tools/validators` passes (full validator suite).

### Invariants

1. Only lifecycle-managed story-state classes (now including STCHAR) are accepted in `SE.state_delta.*`.
2. The validator's class set matches the shared story-state contract §state_delta.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-delta-class-integrity.test.ts` — add positive STCHAR create/supersede/close cases and a negative unknown-class case.

### Commands

1. From `tools/validators`: `npm run build`.
2. From `tools/validators`: `node --test dist/tests/structural/state-delta-class-integrity.test.js`.
3. From `tools/validators`: `npm test`.

## Outcome

Completed: 2026-05-21

The structural validator now accepts `STCHAR` as a lifecycle-managed `SE.state_delta.create[]`, `supersede[]`, and `close[]` class, and indexes `story_character_authority_record` records as resolvable state-delta targets. The focused structural test now covers resolved STCHAR create/supersede/close references, while the existing class-drift and unresolved-id tests continue to prove rejection behavior.

## Verification Result

1. `npm run build` from `tools/validators` — PASS; TypeScript compiled and refreshed `dist/`.
2. `node --test dist/tests/structural/state-delta-class-integrity.test.js` from `tools/validators` — PASS after correcting the new STCHAR fixture to use the live hybrid `stories/<story>/story-characters/STCHAR-<n>.md` path shape; 8 tests passed.
3. `npm test` from `tools/validators` — PASS; package script rebuilt and ran 777 tests with 777 passing.

## Deviations

- The drafted source change was accurate. The only implementation-time correction was test-fixture shape: STCHAR authority records are hybrid story-character files, so the focused test uses `stories/<story>/story-characters/STCHAR-<n>.md` rather than an `_source/` YAML path.
