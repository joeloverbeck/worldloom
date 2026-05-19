# SPEC50STPSTECHC-008: Fix STEMO contradictory-affect table to valid enum + meta-test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-health-audit` skill; validators test (enum-membership meta-test). Corrective.
**Deps**: None

## Problem

At intake, the closed `contradictory_affect_pairs` lookup table for the `stemo-contradictory-stack` health check (`.claude/skills/branching-story-health-audit/SKILL.md:312-317`) used `affection`, `hatred`, `trust`, `betrayal-anger`, `despair`, `love` — only `grief`/`joy` was a member of the current `STEMO.affect_kind` enum (`tools/validators/src/schemas/story-emotion.schema.json:27-49`: `fear, anxiety, anger, disgust, grief, shame, guilt, humiliation, hope, relief, joy, awe, tenderness, desire, envy, contempt, confusion, dread, null`). The other four pairs were unreachable, so the check was dead for them.

## Assumption Reassessment (2026-05-19)

1. Codebase: the table is at `branching-story-health-audit/SKILL.md:312-317`; the current `affect_kind` enum is at `story-emotion.schema.json:27-49`. Confirmed `affection`/`hatred`/`trust`/`betrayal-anger`/`despair`/`love` are NOT in the enum; `grief`/`joy` are. Verified this session.
2. Specs/contract: SPEC-50 §D.1; SPEC-49 established the "intentionally small table; expand only with sample-story evidence" discipline.
3. Cross-artifact boundary: the health-audit skill's lookup table and the `story-emotion.schema.json` `affect_kind` enum must agree; a meta-test enforces the agreement so the table cannot drift from the enum again.
4. Reassessment 2026-05-20: `branching-story-health-audit` is a prose workflow skill, and no executable health-audit dry-run runner exists in the repo. The behavioral WARN/non-WARN proof is therefore narrowed to manual contract review of the existing `stemo-contradictory-stack` WARN wording plus an automated enum-membership/meta-test over the table.
5. Broad-suite proof-surface fallout 2026-05-20: `npm test --prefix tools/validators` exposed a stale SPEC-47 integration assertion still expecting 56 story-edge types. `archive/tickets/SPEC50STPSTECHC-006.md` records that the live story-bundle edge registry moved to 65, so this run truths the validators-side SPEC-47 count assertion to the current registry as package proof upkeep; it does not change edge extraction behavior.

## Architecture Check

1. Rewriting the four invalid pairs to enum-valid opponent-process equivalents restores the check's teeth; the meta-test is the cheapest guard against future enum/table drift (the same drift class that left the table dead).
2. No shim — invalid affect labels are replaced, not aliased.

## Verification Layers

1. Every `a`/`b` value in the table is a member of the `affect_kind` enum -> meta-test (enum-membership assertion).
2. The table remains a WARN-only retrospective health-audit lookup, with `same_target_required` preserved for same-target pairs -> manual review of `branching-story-health-audit` Phase 2k prose plus focused test assertions on the parsed table.

## Landed Changes

### 1. Rewrote the contradictory-affect table (D.1)

Retained `{ grief, joy, same_target_required: false }`. Replaced the four invalid pairs with enum-valid opponent-process equivalents: `{ tenderness, contempt, same_target_required: true }`, `{ hope, dread, same_target_required: true }`, `{ relief, anxiety, same_target_required: true }`, and `{ desire, disgust, same_target_required: true }`. The table remains intentionally small and WARN-only.

### 2. Enum-membership meta-test

Added a SPEC-50 D.1 test to the SPEC-49 STPLAN/STEMO capstone that parses the health-audit YAML table and asserts every `a` / `b` value is a member of `story-emotion.schema.json`'s `affect_kind` enum.

### 3. Broad-suite proof-surface truthing

Updated the validators-side SPEC-47 integration edge-count assertion from 56 to 65 to match the live story-bundle edge registry after archived SPEC50STPSTECHC-006.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (modify — enum-membership meta-test)
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modify — stale broad-suite edge-count proof truthing to 65)

## Out of Scope

- Active-state-underuse warnings (SPEC50STPSTECHC-011).
- Expanding the table beyond the corrective rewrite (sample-story evidence required).

## Acceptance Criteria

### Tests That Must Pass

1. Meta-test: every `contradictory_affect_pairs` value ∈ `affect_kind` enum.
2. The parsed table includes the enum-valid `tenderness`/`contempt` pair with `same_target_required: true` and preserves `grief`/`joy` with `same_target_required: false`.
3. `npm test --prefix tools/validators` green.

### Invariants

1. The contradictory-affect table contains only `affect_kind` enum members.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` — enum-membership meta-test for the contradictory-affect table.
2. `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` — stale edge-count proof updated to the current 65-edge registry.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`

## Outcome

Completed: 2026-05-20

- `branching-story-health-audit` now lists only enum-valid contradictory affect pairs for `stemo-contradictory-stack`.
- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` now guards the health-audit table against future `STEMO.affect_kind` drift by parsing the YAML block and checking it against `story-emotion.schema.json`.
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` now expects the current 65-entry story-edge registry, matching the SPEC50STPSTECHC-006 completion state.

## Verification Result

- `npm run build --prefix tools/validators` before source edits — PASS.
- `node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js dist/tests/schemas/story-emotion-schema-fixtures.test.js` in `tools/validators` before source edits — PASS, 9 tests.
- `npm run build --prefix tools/validators` after implementation initially failed on TypeScript narrowing in the new test helper; fixed before accepting proof.
- `node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js` in `tools/validators` — PASS, 5 tests including `SPEC-50 D.1: health-audit contradictory affect table stays inside STEMO enum`.
- `npm test --prefix tools/validators` initially failed on stale SPEC-47 edge-count proof (`65 !== 56`); this ticket truthed the count to the archived SPEC50STPSTECHC-006 65-edge contract.
- `npm test --prefix tools/validators` after proof-surface truthing — PASS, 672 tests.

## Deviations

- The drafted health-audit dry-run proof was replaced with manual review plus automated table/schema meta-test because no executable `branching-story-health-audit` dry-run runner exists in the repo.
- Broad validators verification refreshed ignored package artifacts under `tools/validators/dist/`; ignored `node_modules/` remains present. Existing ignored `tools/world-index/dist/` and `tools/world-index/node_modules/` remain unrelated carryover from prior SPEC-50 runs.
