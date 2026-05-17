# SPEC42STOSTADEB-015: End-to-end verification capstone for CLK/STSEC/STQ

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: No new production code; introduces an integration test exercising every prior implementation ticket end-to-end against a fixture story bundle. Per the spec-to-tickets §Spec-Integration Ticket Shape, this is a single trailing ticket whose acceptance criteria enumerate the spec's §Verification bullets as test sub-cases
**Deps**: SPEC42STOSTADEB-014

## Problem

After all 14 upstream tickets (SPEC42STOSTADEB-001 through -014) have landed, the spec's §Verification section enumerates per-layer verifications (schema-level, validator-level, MCP-level, skill-level, backwards-compatibility) that need to compose end-to-end on a representative fixture bundle. Per-ticket tests verify their own surface; this capstone verifies the surfaces compose — a CLK can be created via patch-engine ops, indexed by world-index, retrieved via MCP, used in a turn-cycle SE.state_delta, surfaced in a page-plan §10b section, and audited for stalled-clock detection by health-audit — all in one end-to-end flow against a temp-copy of a fixture world. The capstone is the integration boundary that catches cross-ticket gaps that per-ticket tests miss.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): all package test surfaces exist (`tools/validators/tests`, `tools/patch-engine/tests`, `tools/world-mcp/tests`, `tools/world-index/tests`); fixture-world copying via `fs.cpSync` is the canonical pattern (verified in §Spec-Integration Ticket Shape worked example). The capstone follows the established `cpSync to temp root` pattern so the real `worlds/<slug>/` tree is never touched.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Verification section (schema-level + validator-level + MCP-level + skill-level + backwards-compatibility — 5 sub-categories, ~15 individual bullets). Each spec §Verification bullet becomes a test sub-case in this capstone.
3. Cross-skill / cross-tool shared boundary: this capstone exercises every Skill Category 2c story-pipeline skill that consumes the new classes (bootstrap, turn-cycle, prose-attach, commitment-block-authoring, health-audit), every machine-layer surface (validators, patch-engine, world-mcp, world-index), and the docs surfaces (contract, CLAUDE.md). The transitive-head dep on -014 (the docs ticket) composes all upstream surfaces — when -014's docs describe the post-implementation state and grep-proofs pass, all upstream tickets have shipped.

## Architecture Check

1. **Transitive-head dep per §Spec-Integration Ticket Shape**: depending on only -014 keeps the dep list short; the DAG already records the full upstream chain (014 → 001/002/003/005/006/007; 005/006/007 → 001/002/003; etc.). Listing every upstream ticket would duplicate the DAG without information gain.
2. **Fixture-world copy via fs.cpSync**: the test never mutates the real `worlds/<slug>/` tree. cpSync to a temp root at test start; teardown removes the temp root.
3. **Re-enumerated expected counts, not hardcoded**: per §Spec-Integration Ticket Shape — hardcoded counts become stale as canon grows; re-enumeration stays valid over time. The capstone computes expected counts from the fixture at test start.
4. **One assertion per spec §Verification bullet**: each bullet becomes its own test sub-case; the spec's §Verification section IS the capstone's test matrix.
5. **No wall-clock perf assertion**: SPEC-42 §Verification does not name a performance gate; this capstone omits a perf assertion (no aspirational target to enforce).

## Verification Layers

1. Schema-level: each new schema JSON validates a representative record cleanly (positive + negative tests per validator) — fixture bundle includes valid + invalid CLK/STSEC/STQ records; capstone runs validators on each
2. Validator-level: `clock_terminal_debt_integrity` / `critical_secret_clue_coverage_when_revealed` / `story_question_payoff_integrity` / `snapshot_replay_equality` / `state_snapshot_integrity` PASS on positive fixtures and FAIL on negative fixtures — capstone enumerates each spec §Validator-level bullet as a sub-test
3. MCP-level: `mcp__worldloom__get_record(record_id="CLK-1", story_slug=...)` returns full body; `list_records(record_type="pressure_clock_record")` enumerates; `allocate_next_id(id_class="CLK")` returns next integer; `get_context_packet` includes new classes — capstone enumerates each spec §MCP-level bullet
4. Skill-level: `branching-story-bootstrap` on a deadline-flavored premise emits a seed CLK; `branching-story-turn-cycle` on an SE crossing a CLK threshold materializes the threshold's effects in SE.state_delta; `branching-story-health-audit structural` mode detects stalled clock + under-supported revelation + dropped setup; `commitment-block-authoring direct_batch` mode includes the 14-target coverage; `branching-story-prose-attach` flags clock-tick-omitted prose — capstone enumerates each spec §Skill-level bullet
5. Backwards-compatibility: existing bundles WITHOUT CLK/STSEC/STQ records pass all validators with no warnings; `branching-story-health-audit` does not flag absence; `branching-story-turn-cycle` advances bundles without new-class records without surfacing related plan sections — capstone enumerates each spec §Backwards-compat bullet

## What to Change

### 1. Capstone integration test (new file)

Create `tools/validators/tests/integration/spec42-end-to-end.test.ts` (or analogous path under one of the four packages — pick the package whose integration test harness fits best; world-mcp or validators is recommended given the cross-cutting nature). The test:

a. **Fixture setup**: `fs.cpSync` an existing fixture world (e.g., `worlds/<test-fixture>/`) to a temp root. The fixture bundle has at least one CLK, one STSEC, one STQ — plus a baseline bundle without any new-class records for backwards-compatibility tests.

b. **Re-enumerated count baselines**: at test start, count the fixture's CLK records, STSEC records, STQ records via `mcp__worldloom__list_records`. Use these counts as the test's expected baselines (not hardcoded).

c. **Schema-level sub-tests**: load each new schema, validate representative positive + negative fixtures, assert pass/fail per the spec §Verification Schema-level bullets.

d. **Validator-level sub-tests**: invoke each new validator (`clock_terminal_debt_integrity`, `critical_secret_clue_coverage_when_revealed`, `story_question_payoff_integrity`, etc.) on positive + negative fixtures and assert pass/fail per the spec §Verification Validator-level bullets.

e. **MCP-level sub-tests**: invoke each MCP tool against the fixture bundle and assert the new classes are reachable per the spec §Verification MCP-level bullets.

f. **Skill-level sub-tests**: invoke each consuming skill (bootstrap, turn-cycle, health-audit, commitment-block-authoring, prose-attach) on appropriate fixture inputs and assert the new-class integration works per the spec §Verification Skill-level bullets.

g. **Backwards-compatibility sub-tests**: on the baseline bundle without any new-class records, assert all validators pass with no warnings; health-audit does not flag absence; turn-cycle advances without new-class plan sections.

h. **Teardown**: remove the temp root.

## Files to Touch

- `tools/validators/tests/integration/spec42-end-to-end.test.ts` (new — or analogous path under one of the four packages' integration-test directories)
- Optional: a fixture-world directory under `tools/validators/tests/fixtures/spec42-fixture-world/` (or analogous path) containing the seed CLK / STSEC / STQ records the test bundle starts from — alternatively, the capstone can construct the fixture programmatically at test start

## Out of Scope

- Per-package tests (each upstream ticket owns its own per-package tests; capstone is the cross-package integration only)
- Wall-clock performance assertions (SPEC-42 names no perf gate)
- Production code changes (this is a test-only ticket)
- Documentation updates (owned by SPEC42STOSTADEB-014)

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` (or whichever package hosts the capstone) — the new integration test passes all ~15 spec §Verification sub-cases
2. Every spec §Verification bullet (schema-level + validator-level + MCP-level + skill-level + backwards-compat) maps to a corresponding sub-case in the capstone test
3. Test fixture-world copy never mutates the real `worlds/<slug>/` tree (verified by checking that the real fixture path is unchanged after test execution)
4. Re-enumerated counts at test start (not hardcoded) — verified by code review

### Invariants

1. The capstone is the single end-to-end integration boundary for SPEC-42; no other ticket exercises all surfaces simultaneously
2. Fixture-world isolation: real `worlds/` tree never mutated; cpSync + temp root + teardown
3. Re-enumerated counts (not hardcoded) — capstone remains valid as canon grows
4. One sub-case per spec §Verification bullet — the spec's verification matrix IS the capstone's test matrix

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec42-end-to-end.test.ts` (new — or analogous path) — the single capstone integration test enumerated above

### Commands

1. `npm test --prefix tools/validators` (or whichever package hosts the capstone) — runs the capstone end-to-end
2. The capstone IS the full-pipeline verification command — no further command needed; the spec's §Verification matrix is satisfied by this test passing
