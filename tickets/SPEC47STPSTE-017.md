# SPEC47STPSTE-017: Capstone STPLAN/STEMO end-to-end integration test + §5c lint pass + Hook 3 verification + regression sweep

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds capstone integration test exercising every prior SPEC47STPSTE ticket end-to-end against a fixture story bundle; folds T-1 through T-10 from SPEC-47 §Test Plan into per-test-bullet assertions; verifies Hook 3 covers `_source/plans/` + `_source/emotions/` subdirs (per SPEC-47 D-A9, no Hook 3 code change required)
**Deps**: `archive/tickets/SPEC47STPSTE-002.md`, `archive/tickets/SPEC47STPSTE-004.md`, 010, `archive/tickets/SPEC47STPSTE-012.md`, `archive/tickets/SPEC47STPSTE-014.md`, `archive/tickets/SPEC47STPSTE-016.md`

## Problem

SPEC-47's 16 prior implementation tickets each verify their own slice (per-ticket Acceptance Criteria + per-ticket Test Plan), but the spec's §Verification section enumerates 10 cross-cutting test assertions (T-1 STPLAN schema fidelity, T-2 STEMO schema fidelity, T-3 replay invariance, T-4 predicate-DSL parsability, T-5 tag-grammar extension, T-6 STORY_EDGE_TYPES registry completeness, T-7 edge extraction per-type, T-8 MCP context-packet summary fidelity, T-9 FOUNDATIONS §5c lint pass, T-10 no-regression sweep) that require all upstream surfaces to coexist coherently. The capstone ticket is the §Spec-Integration Ticket Shape: a single trailing ticket whose acceptance criteria enumerate the spec's §Verification bullets as test sub-cases, exercising the pipeline composed by the earlier tickets. It introduces no new production code; it composes a fixture story bundle containing STPLAN + STEMO records (alongside CLK/STSEC/STQ from SPEC-42 baseline) and asserts every spec-level invariant. Additionally folds Hook 3 verification (per SPEC-47 D-A9: Hook 3 generically pattern-matches `**/stories/<slug>/_source/**/*.yaml`; no code change; integration-test assertion confirms `_source/plans/` and `_source/emotions/` are automatically blocked from raw Edit/Write).

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified the integration-test directory convention at `tools/validators/tests/integration/` exists per the existing convention (e.g., `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` per the SPEC-46 archived ticket SPEC46STOPIPMAC-015 capstone). Verified Hook 3 at `tools/hooks/src/hook3-guard-direct-edit.ts:30-55` generically pattern-matches `**/stories/<slug>/_source/**/*.yaml` via regex `/^stories\/[^/]+\/_source\//` plus .yaml suffix check (per the reassess-spec session's D-A9 verification); new `_source/plans/` and `_source/emotions/` subdirs are automatically blocked without code change.
2. Verified SPEC-47 §Test Plan enumerates T-1 through T-10 (test categories) and §Approach §X-1+§X-2 specifies the cross-phase integration: `world-index build` regression run on a representative test world + fixture-bundle integration test asserting all 8 hard gates pass, snapshot replay equality holds, MCP context-packet returns both new summaries, page plan renders §9b and §9c, and `world-index build` extracts the 14 new edges. Verified D-A9 specifies Hook 3 verification (no code change) folded into this capstone.
3. Cross-skill boundary under audit: the capstone test exercises the pipeline end-to-end — patch engine (commit STPLAN/STEMO records via tickets 003/`archive/tickets/SPEC47STPSTE-004.md` surfaces) + validators (tickets 005/006/007 + `archive/tickets/SPEC47STPSTE-008.md`/`archive/tickets/SPEC47STPSTE-009.md`) + MCP retrieval (ticket 011) + world-index edges (ticket 013) + page-plan rendering (`archive/tickets/SPEC47STPSTE-015.md`) + skill prose (`archive/tickets/SPEC47STPSTE-016.md`) + Hook 3 (no-code-change verification per D-A9). Per the §Spec-Integration Ticket Shape: "parallel-branch leaf set" applies — the upstream DAG has parallel branches (skill prose ticket `archive/tickets/SPEC47STPSTE-016.md` reaches 005/006/007/`archive/tickets/SPEC47STPSTE-008.md`/`archive/tickets/SPEC47STPSTE-009.md`/011/013/`archive/tickets/SPEC47STPSTE-015.md` transitively but NOT 002/`archive/tickets/SPEC47STPSTE-004.md`/010/`archive/tickets/SPEC47STPSTE-012.md`/`archive/tickets/SPEC47STPSTE-014.md` which are parallel docs/contract surfaces). Capstone `Deps` enumerates the leaf set: 002 (contract inventory + FOUNDATIONS §6), `archive/tickets/SPEC47STPSTE-004.md` (patch-engine wiring), 010 (contract docs §5+§5a), `archive/tickets/SPEC47STPSTE-012.md` (capability + CONTEXT-PACKET-CONTRACT), `archive/tickets/SPEC47STPSTE-014.md` (MACHINE-FACING-LAYER docs), `archive/tickets/SPEC47STPSTE-016.md` (skill prose) — collectively transitively cover all 16 prior tickets.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) — T-9's §5c lint pass IS the §5c discipline expressed structurally: assert no STPLAN/STEMO schema field name, validator name, predicate name, edge type name, page-plan section name, or trigger vocabulary carries narrative-shape framing tokens (`act_*`, `climax_*`, `beat_position_*`, `arc_*`, `expected_outcome_*`, `target_curve_*`, `planned_resolution_*`, `setup_for_*`, `payoff_at_*`). The lint codifies §5c structurally so future schema additions can't silently introduce narrative-shape framing.

## Architecture Check

1. The capstone integration test is the worldloom-canonical §Spec-Integration Ticket Shape: single trailing ticket whose acceptance criteria enumerate the spec's §Verification bullets; fixture-world copy strategy keeps the real `worlds/<slug>/` tree untouched (per `fs.cpSync` to temp root); re-enumerated expected counts computed from fixture at test start (not hardcoded); one assertion per spec §Verification bullet. Following the SPEC-46 SPEC46STOPIPMAC-015 capstone precedent keeps the integration-test structure consistent.
2. Hook 3 verification folded into the capstone (per SPEC-47 D-A9 "No code change required") rather than its own ticket — Hook 3 is generic at the pattern level; the only assertion needed is that raw `Edit`/`Write` on a fixture `_source/plans/STPLAN-1.yaml` or `_source/emotions/STEMO-1.yaml` path is blocked by the existing Hook 3 logic. No code added.
3. No backwards-compatibility aliasing/shims introduced — capstone test is purely additive. The pipeline composed by tickets 003-016 is the substance being verified.

## Verification Layers

1. New integration-test file at `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` exists → codebase grep-proof
2. T-1 through T-10 assertions all present in the test file (one assertion per spec §Test Plan bullet) → schema validation against the test's test-name patterns
3. Hook 3 verification: raw Edit/Write attempt against fixture `_source/plans/STPLAN-1.yaml` and `_source/emotions/STEMO-1.yaml` paths returns the Hook 3 deny decision → integration test
4. §5c lint pass: assert no narrative-shape framing tokens appear in the new STPLAN/STEMO schema field names, validator names, predicate names, edge type names, page-plan section names, or trigger vocabularies → grep-based lint
5. world-index build regression: rebuild fixture world; assert STORY_EDGE_TYPES.length === 50 and all 14 new edge types appear with correct source-derived counts → fixture re-enumeration
6. Cross-package no-regression sweep: existing test suites for `world-mcp`, `world-index`, `patch-engine`, `validators`, and the 7 story-pipeline skills pass unchanged after this spec's deliverables land → CI test pass

## What to Change

### 1. Author `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts`

Single new test file with the following test-case structure (one test-case per SPEC-47 §Test Plan bullet T-1 through T-10):

```typescript
import test from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

// Fixture-world copy: clone a representative SPEC-46-compatible fixture to a temp root
// so the test never mutates real canon (per the §Spec-Integration Ticket Shape "fixture-world copy strategy")

test("SPEC-47 T-1: STPLAN schema fidelity", async () => {
  // Fixture-load 8 representative STPLAN records spanning the 7 plan_status enum values + one with populated fallback_steps
  // Assert: each record passes story-plan.schema.json validation; no fabricated keys; all required fields present
});

test("SPEC-47 T-2: STEMO schema fidelity", async () => {
  // Fixture-load 10 representative STEMO records spanning the 5 status enum values (including 2 dissociated with affect_kind: null)
  // Assert: closed-enum validation rejects out-of-vocab values; dissociated-status is the only status permitting affect_kind: null
});

test("SPEC-47 T-3: Replay invariance", async () => {
  // Build a bundle with 5 STPLAN supersessions and 5 STEMO supersessions across 3 branches
  // Assert: snapshot_replay_equality passes (cumulative state at each PG snapshot deterministically reconstructible from SE state-deltas)
});

test("SPEC-47 T-4: Predicate-DSL parsability", async () => {
  // For each of the 6 new predicates (plan_active, plan_blocked, any_plan_active, emotion_active, any_emotion_active, emotion_pressure):
  //   Positive: well-formed predicate object parses + arg-schema validation passes
  //   Negative: missing required arg, wrong arg type, value outside closed-enum → parser rejects with named-rule failure
});

test("SPEC-47 T-5: Tag-grammar extension", async () => {
  // For each of the 2 new intro:<CLASS>(...) class values (STPLAN, STEMO):
  //   Positive: intro:STPLAN(id=STPLAN-1, trigger=tactical_approach_committed, evidence=[...], distinct_from=[...]) parses
  //   Negative: unknown trigger name → parser rejects
  // For the new plan_relation: tag pattern: positive test per relation value + negative test for unknown relation
});

test("SPEC-47 T-6: Edge-extraction registry completeness", async () => {
  // Assert STORY_EDGE_TYPES.length === 50
  // Assert new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length (no duplicates)
});

test("SPEC-47 T-7: Edge extraction per-type", async () => {
  // For each of the 14 new edge types:
  //   Positive: fixture record with the field populated → edge emitted with correct source/target/edge_type/story_slug
  //   Negative: fixture record with the field empty → no edge emitted
});

test("SPEC-47 T-8: MCP context-packet summary fidelity", async () => {
  // Fixture-load a bundle with active STPLAN and STEMO records
  // Call mcp__worldloom__get_context_packet({task_type: 'page_authoring', seed_nodes: [...], story_slug: ...})
  // Assert: active_actor_plans and active_emotional_states summary shapes match SPEC-47 §Approach §C tables
  // Assert: active_plan_ids / active_emotion_ids / active_plan_holders / active_emotion_holders enumerate the corresponding ids/holders without orphans or omissions
});

test("SPEC-47 T-9: FOUNDATIONS §5c lint pass", async () => {
  // Lint pass over the new STPLAN/STEMO schema field names, validator names, predicate names, edge type names, page-plan section names, trigger vocabularies
  // Assert: no narrative-shape framing tokens (act_*, climax_*, beat_position_*, arc_*, expected_outcome_*, target_curve_*, planned_resolution_*, setup_for_*, payoff_at_*) appear
});

test("SPEC-47 T-10: No-regression sweep", async () => {
  // Verify existing test suites for world-mcp, world-index, patch-engine, validators, and 7 story-pipeline skills pass unchanged after SPEC-47 deliverables land
  // (Typically asserted by CI running the full test suite; this test-case is a hook for the assertion at the integration boundary)
});

test("SPEC-47 D-A9: Hook 3 covers new subdirs", async () => {
  // Attempt raw Edit/Write against fixture _source/plans/STPLAN-1.yaml and _source/emotions/STEMO-1.yaml paths
  // Assert: Hook 3's classifyPath returns block decision for both paths (no code change required; existing pattern covers new subdirs)
});
```

### 2. Verify world-index build regression on fixture world (D-X1)

The capstone test includes a sub-case that invokes `world-index build` on the fixture world and asserts the rebuilt index contains the 14 new STPLAN/STEMO edges without rebuild errors and without disturbing the 36 SPEC-46 baseline edges. Following the SPEC-46 SPEC46STOPIPMAC-015 precedent (which built a temporary fixture index in-test rather than relying on a manual CLI smoke).

## Files to Touch

- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (new)

## Out of Scope

- Per-ticket Acceptance Criteria for tickets 001-016 — each upstream ticket owns its own per-test verification; the capstone integration test is cross-cutting end-to-end verification, not per-ticket re-verification.
- Hook 3 code changes — per SPEC-47 D-A9, no Hook 3 code change is required (generic pattern already covers `_source/plans/` + `_source/emotions/`); the capstone test confirms the coverage.
- CI configuration changes — the capstone test uses the existing `npm test` invocation per the validators package convention.

## Acceptance Criteria

### Tests That Must Pass

1. `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` exists and runs as part of `npm --prefix tools/validators test`.
2. All 10 SPEC-47 §Test Plan assertions (T-1 through T-10) plus D-A9 Hook 3 verification pass against the fixture story bundle.
3. `world-index build` on fixture world rebuilds without errors; STORY_EDGE_TYPES.length === 50 holds in the rebuilt index.
4. Cross-package no-regression sweep: `npm --prefix tools/validators test && npm --prefix tools/world-mcp test && npm --prefix tools/world-index test && npm --prefix tools/patch-engine test` all pass.

### Invariants

1. The fixture-world copy strategy keeps the real `worlds/<slug>/` tree untouched — no test mutation of real canon.
2. Re-enumerated expected counts (not hardcoded) — counts computed from fixture at test start so the test stays valid as canon grows.
3. One assertion per spec §Test Plan bullet — no collapsed assertions hiding per-bullet failures.
4. The §5c lint discipline is structurally codified — future schema additions cannot silently introduce narrative-shape framing tokens.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (new) — the capstone integration test described above; 10+ test-cases (T-1 through T-10 plus D-A9).

### Commands

1. `npm --prefix tools/validators run build && npm --prefix tools/validators test -- --test-name-pattern "SPEC-47"` (capstone integration test runs and passes)
2. `npm --prefix tools/validators test && npm --prefix tools/world-mcp test && npm --prefix tools/world-index test && npm --prefix tools/patch-engine test` (cross-package no-regression sweep)
3. `node tools/world-index/dist/src/cli/world-index.js build <fixture-world>` (regression run on fixture; index rebuild succeeds)
