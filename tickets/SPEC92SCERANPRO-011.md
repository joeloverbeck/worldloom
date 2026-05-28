# SPEC92SCERANPRO-011: scene-layer capstone — end-to-end + coexistence

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — capstone integration test (new); manual dry-run runbook + automated coexistence assertions. No production code.
**Deps**: archive/tickets/SPEC92SCERANPRO-010.md

## Problem

SPEC-92 acceptance #9 (the page-plan pipeline is unchanged and green — coexistence) and #10 (affected `tools/` packages build + test green), plus the end-to-end scene flow (scene-plan → scene-prose-attach over a committed PG range), are cross-cutting — no single implementation ticket owns them. This capstone exercises the spec's §Test plan end-to-end and asserts coexistence.

## Assumption Reassessment (2026-05-28)

1. All implementation tickets (-001 through -010) land before this capstone; -010 is the transitive head of the DAG (it reaches -001..-009 via -008/-009), so `Deps: archive/tickets/SPEC92SCERANPRO-010.md` covers the full chain.
2. SPEC-92 §Acceptance #9 / #10 + §Test plan define the capstone matrix. The scene-plan + scene-prose-attach skills (-008 / -009) are LLM-driven and NOT runnable from test-suite code → manual-dry-run capstone variant (per §Spec-Integration Ticket Shape).
3. Cross-artifact boundary under audit: the capstone exercises every upstream surface (SCN op / schema / validators / index / retrieval + both skills); it introduces no new production code. The fixture-world copy strategy must keep the real `worlds/<slug>/` tree untouched (`fs.cpSync` to a temp root).
4. FOUNDATIONS §Story Bundles §4a (scene attach creates no state) + §Rule 7 (the mystery firewall holds across the scene range) + the additive-coexistence discipline (page-plan pipeline unchanged) are what the capstone verifies end-to-end.

## Architecture Check

1. A single trailing capstone owns the cross-cutting acceptance (coexistence + end-to-end) that no implementation ticket owns, exercising the composed pipeline rather than re-testing units. Manual-dry-run runbook for the LLM skills + automated assertions for the test-runnable portion.
2. No shims: capstone is a test deliverable; introduces no production code.

## Verification Layers

1. End-to-end scene flow (scene-plan → render → scene-prose-attach over a fixture PG range) -> manual dry-run runbook (test-file header comment).
2. Page-plan pipeline still builds + tests green (coexistence, acceptance #9) -> automated per-package `npm test` + grep that page-plan validators / dirs remain.
3. Affected `tools/` packages build + test green (acceptance #10) -> automated per-package build/test.
4. Scene attach mutated no PG / `_source` state (§4a) -> automated state-diff over the temp fixture after the manual flow.

## What to Change

### 1. Capstone test file (new) — hybrid

- **Manual dry-run runbook** (header comment): `fs.cpSync` a fixture bundle to a temp root; invoke `branching-story-scene-plan` over a committed PG range (e.g., PG-5..PG-8); render scene prose; invoke `branching-story-scene-prose-attach`; expected post-state (SCN record + scene plan + receipt; no PG mutation) with verification commands.
- **Automated body**: coexistence grep (page-plan validators / dirs intact), per-package build/test invocation list, post-attach no-state-mutation assertion over the temp fixture.

## Files to Touch

- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` (new) — or the package whose harness best hosts the automated coexistence assertions

## Out of Scope

- Any production code (all in -001..-010).
- SPEC-93's subtractive removals (page-plan retirement) — coexistence here asserts page plans STILL work.

## Acceptance Criteria

### Tests That Must Pass

1. Manual dry-run runbook completes: scene-plan + scene-prose-attach over a fixture PG range produce SCN + plan + receipt; no PG / `_source` mutation.
2. Automated coexistence: the page-plan pipeline builds + tests green; page-plan validators / dirs remain.
3. `cd tools/validators && npm run build && npm test` (+ the other affected packages) green.

### Invariants

1. The capstone never mutates the real `worlds/<slug>/` tree (fixture-copy to temp).
2. Scene attach creates no state (§4a); the mystery firewall holds across the scene range (Rule 7).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` — new; automated coexistence + no-state-mutation assertions; manual dry-run runbook in the header comment.

### Commands

1. Manual: follow the test file's header runbook (skill dry-runs against a temp fixture copy).
2. `cd tools/validators && npm run build && npm test` (+ `cd tools/world-index && npm test`, `cd tools/world-mcp && npm test`, `cd tools/patch-engine && npm test`)
