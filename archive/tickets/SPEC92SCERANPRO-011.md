# SPEC92SCERANPRO-011: scene-layer capstone — end-to-end + coexistence

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — capstone integration test (new); manual dry-run runbook + automated coexistence assertions. No production code.
**Deps**: archive/tickets/SPEC92SCERANPRO-010.md

## Problem

SPEC-92 acceptance #9 (the page-plan pipeline is unchanged and green — coexistence) and #10 (affected `tools/` packages build + test green), plus the end-to-end scene flow (scene-plan → scene-prose-attach over a committed PG range), are cross-cutting — no single implementation ticket owns them. This capstone exercises the spec's §Test plan end-to-end and asserts coexistence.

## Assumption Reassessment (2026-05-28)

1. All implementation tickets (-001 through -010) land before this capstone; -010 is the transitive head of the DAG (it reaches -001..-009 via -008/-009), so `Deps: archive/tickets/SPEC92SCERANPRO-010.md` covers the full chain.
2. SPEC-92 §Acceptance #9 / #10 + §Test plan define the capstone matrix. The scene-plan + scene-prose-attach skills (-008 / -009) are LLM-driven and NOT runnable from test-suite code → manual-dry-run capstone variant (per §Spec-Integration Ticket Shape), plus automated assertions over the deterministic package surfaces.
3. Cross-artifact boundary under audit: the capstone exercises upstream deterministic surfaces (SCN schema/validators, page-plan coexistence validators, affected package build/test script contracts, and a fixture no-state-mutation check) and documents the manual scene-plan → scene-prose-attach dry-run for the LLM skill portion. It introduces no production code. The fixture strategy must keep the real `worlds/<slug>/` tree untouched by constructing a temp story root.
4. FOUNDATIONS §Story Bundles §4a (scene attach creates no state) + §Rule 7 (the mystery firewall holds across the scene range) + the additive-coexistence discipline (page-plan pipeline unchanged) are what the capstone verifies end-to-end.

## Architecture Check

1. A single trailing capstone owns the cross-cutting acceptance (coexistence + end-to-end) that no implementation ticket owns, exercising the composed pipeline rather than re-testing units. Manual-dry-run runbook for the LLM skills + automated assertions for the test-runnable portion.
2. No shims: capstone is a test deliverable; introduces no production code.

## Verification Layers

1. End-to-end scene flow (scene-plan → render → scene-prose-attach over a fixture PG range) -> manual dry-run runbook (test-file header comment).
2. Page-plan pipeline still builds + tests green (coexistence, acceptance #9) -> automated registry assertions that page-plan validators remain present, plus package build/test commands in closeout proof.
3. Affected `tools/` packages build + test green (acceptance #10) -> package build/test command proof; the capstone test also asserts each affected package still exposes `build` and `test` scripts.
4. Scene attach mutated no PG / `_source` state (§4a) -> automated state-byte diff over a temp fixture while validating scene receipt/prose outputs as direct-write artifacts.

## Landed Changes

### 1. Capstone test file (new) — hybrid

- **Manual dry-run runbook** (header comment): documents a temp-root-only flow for copying or constructing a fixture bundle, invoking `branching-story-scene-plan` over a committed PG range (e.g., PG-5..PG-8), rendering scene prose, invoking `branching-story-scene-prose-attach`, and verifying SCN + plan + receipt output with no PG / `_source` mutation.
- **Automated body**: asserts page-plan validators remain registered alongside scene validators, each affected package still exposes build/test scripts, and scene receipt/prose validation over a temp fixture leaves `_source` bytes unchanged.

## Files to Touch

- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` (new)

## Out of Scope

- Any production code (all in -001..-010).
- SPEC-93's subtractive removals (page-plan retirement) — coexistence here asserts page plans STILL work.

## Acceptance Criteria

### Tests That Must Pass

1. Manual dry-run runbook exists in the capstone test header and is temp-root-only for scene-plan + scene-prose-attach over a fixture PG range; expected output is SCN + plan + receipt with no PG / `_source` mutation.
2. Automated coexistence passed: page-plan validators remain registered alongside scene validators; affected packages still expose build/test scripts.
3. `cd tools/validators && npm run build && npm test`, `cd tools/world-index && npm test`, `cd tools/world-mcp && npm test`, and `cd tools/patch-engine && npm test` passed.

### Invariants

1. The capstone never mutates the real `worlds/<slug>/` tree (fixture-copy to temp).
2. Scene attach creates no state (§4a); the mystery firewall holds across the scene range (Rule 7).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` — new; automated coexistence + package script inventory + no-state-mutation assertions; manual dry-run runbook in the header comment.

### Commands

1. Manual: follow the test file's header runbook against a temp fixture copy.
2. `cd tools/validators && npm run build && npm test`
3. `cd tools/world-index && npm test`
4. `cd tools/world-mcp && npm test`
5. `cd tools/patch-engine && npm test`

## Outcome

Completed: 2026-05-28

Added the SPEC-92 scene-layer capstone test at `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts`. The test carries the manual temp-root runbook for the LLM-owned scene-plan -> scene-prose-attach flow, then automates the deterministic capstone checks: page-plan validator coexistence, scene validator presence, affected package build/test script inventory, and scene receipt/prose validation that leaves temp `_source` bytes unchanged.

No production code changed. The capstone keeps SPEC-92 additive: page-plan validators remain registered and the scene-layer validators are present beside them.

## Verification Result

1. `cd tools/validators && npm run build` — PASS: TypeScript compiled the new capstone test into `dist/`.
2. `cd tools/validators && node --test dist/tests/integration/spec92-scene-layer-capstone.test.js` — PASS: 3 capstone subtests passed.
3. `cd tools/validators && npm test` — PASS: full validators package rebuilt and passed 1134 tests.
4. `cd tools/world-index && npm test` — PASS: package test runner passed 135 tests.
5. `cd tools/patch-engine && npm test` — PASS: package build + test passed 106 tests.
6. `cd tools/world-mcp && npm test` — PASS: package build + test passed 516 tests.
7. Manual review of `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` header — PASS: the runbook is explicitly temp-root-only and does not instruct running against the real `worlds/<slug>/` tree.

## Deviations

The LLM-owned `branching-story-scene-plan` and `branching-story-scene-prose-attach` skills were not executed from `node:test`; the capstone documents that manual flow in the test header and automates the deterministic package surfaces instead. This matches reassessment item 2 and avoids claiming an executable skill runner that does not exist in the test suite.
