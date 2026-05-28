# SPEC93DECSTATUR-013: Capstone — removal-completeness sweep + planless end-to-end regression

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/integration/spec93-capstone.test.ts` (new; no production code) + per-package green confirmation
**Deps**: archive/tickets/SPEC93DECSTATUR-005.md, archive/tickets/SPEC93DECSTATUR-006.md, archive/tickets/SPEC93DECSTATUR-007.md, archive/tickets/SPEC93DECSTATUR-008.md, archive/tickets/SPEC93DECSTATUR-010.md, archive/tickets/SPEC93DECSTATUR-011.md, archive/tickets/SPEC93DECSTATUR-012.md

## Problem

SPEC-93 §8 + §9 require an end-to-end proof that the teardown landed with no zombie gates and that the planless state engine works through the full pipeline. This capstone runs the §8 removal-completeness sweep (a grep negative test) and documents the §9 planless end-to-end regression (bootstrap → turn-cycle → scene-plan → scene-prose-attach), which requires skill dry-runs not runnable from test-suite code. It introduces no production code; it exercises the pipeline composed by the prior tickets.

## Assumption Reassessment (2026-05-28)

1. The raw §8 removal-completeness grep is too broad to use as a literal no-hit assertion after later specs added legitimate legacy-read and historical/meta references. The implemented capstone encodes the same contract as a classifier: retired authoring gates must have no unclassified current hits, while annotated historical/legacy-read references are allowed and named.
2. SPEC-93 §8 (9 acceptance criteria + the sweep) + §9 (per-package test plan + the bootstrap→turn-cycle→scene-plan→scene-prose-attach regression); §8 AC5 (no zombie gates) + AC9 (affected packages build + test green).
3. Cross-artifact boundary: this capstone exercises every upstream ticket's surface; its `Deps` is the parallel-branch leaf set (005, 006, 007, 008, 010, 011, 012) whose transitive `Deps` cover the foundations (001), gate rehoming (002), validator retirement (003), and arg removal (004). The §9 bootstrap/turn-cycle/scene dry-runs are LLM-driven skill invocations (not test-suite-runnable) — handled via the manual-dry-run runbook variant.
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): the §9 regression must confirm the firewall holds end-to-end after the teardown — gate 3 on the `PG` record stays authoritative and `scene_range_forbidden_mystery_resolution` (SPEC-92) guards rendered scene prose; no forbidden-status `M` is resolved anywhere in the planless flow.
5. Reassessment found same-seam stale current references outside the originally listed new test file. Those were corrected narrowly in shared story schemas, bootstrap contract prose, validator README prose, and existing capstone tests that asserted retired text.

## Architecture Check

1. A single trailing capstone (vs. folding the sweep into each ticket) gives one authoritative no-zombie-gates proof against the fully-composed post-teardown tree; the §8 sweep is meaningless until all removals have landed.
2. No backwards-compatibility shim: the capstone is a test + runbook only; it introduces no production code and no compatibility path.

## Verification Layers

1. No zombie gates -> codebase grep-proof (the §8 removal sweep returns only annotated legacy-read references).
2. Planless PG create + hashing -> schema/integration test (patch-engine PG create op accepts a planless `PG`; `compute-pg-hashes` emits `state_hash` only; `verify-pg-state-hash` reports only `state_hash`).
3. Planless end-to-end flow -> manual skill dry-run runbook (bootstrap → turn-cycle → scene-plan → scene-prose-attach against a temp fixture copy; commits state with no page plan, renders prose at scene level).
4. Affected packages green -> build/test (per-package `npm run build && npm test`; patch-engine also `npm run test:integration`).

## What to Change

### 1. Removal-completeness sweep (automated)

In `tools/validators/tests/integration/spec93-capstone.test.ts` (new): encode the §8 sweep as a negative test — run the SPEC-93 §8 grep (with the `scene-|SPEC-93|SPEC-92|legacy|grandfather` exclusion) and assert remaining hits are only annotated legacy-read references (Story Explorer read paths, world-index legacy enumeration, archived-spec/triage mentions). Include the schema-side automated assertions that are test-runnable: a planless `PG` validates; a legacy `PG` validates; field-presence `state_hash` re-verification.

### 2. Manual dry-run runbook (header comment)

In the same test file's header comment, document the §9 planless end-to-end runbook the implementer follows manually before declaring SPEC-93 landed: `fs.cpSync` a fixture bundle to a temp root; invoke `branching-story-bootstrap` (state-only, no `pages-prose-plans/PG-1.md`); invoke `branching-story-turn-cycle` (no page plan, delta from records); invoke SPEC-92's `branching-story-scene-plan` + `branching-story-scene-prose-attach`; verify state commits with no page plan and prose renders at scene level. Name each step's verification command.

### 3. Per-package green confirmation

Document (in the runbook) the per-package build+test commands that must pass: validators, world-mcp, world-index, hooks (remaining hooks), patch-engine (incl. `test:integration`), story-explorer.

## Files to Touch

- `tools/validators/tests/integration/spec93-capstone.test.ts` (new)
- `.claude/skills/_shared-templates/story-record-schemas.md`
- `.claude/skills/branching-story-bootstrap/references/story-kernel-contract.md`
- `tools/validators/README.md`
- `tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml`
- `tools/validators/tests/integration/spec43-midstory-introduction.test.ts`
- `tools/world-mcp/tests/integration/spec42-capstone.test.ts`

## Out of Scope

- Any production-code change (capstone is test + runbook only).
- The scene-first Story Explorer rewrite (deferred).
- Re-running SPEC-92's scene-layer capstone (its retired-validator assertions are cleaned in SPEC93DECSTATUR-003).

## Acceptance Criteria

### Tests That Must Pass

1. The §8 removal sweep (automated negative test) shows no live `page_plan_`/`prose_receipt_`/`hook6-guard`/`hook7-guard`/`branching-story-prose-attach`/`page_plan_drafts` authoring/validation references outside annotated legacy-read sites.
2. Automated schema assertions pass: planless `PG` validates; legacy `PG` validates; field-presence `state_hash` re-verifies; patch-engine PG create op accepts a planless `PG`; append-only + ordering retained.
3. Manual runbook (implementer checklist): bootstrap → turn-cycle → scene-plan → scene-prose-attach against a temp fixture commits planless state and renders scene prose; gate 3 + scene firewall hold.

### Invariants

1. No zombie gates remain anywhere in skills/tools/docs (the §8 sweep is the proof).
2. The Mystery Reserve firewall holds end-to-end after the teardown (gate 3 on the `PG` record + `scene_range_forbidden_mystery_resolution` at scene attach); no forbidden-status `M` is resolved.
3. The real `worlds/<slug>/` tree is never mutated by the capstone (fixture copied to a temp root).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec93-capstone.test.ts` — automated §8 sweep negative test + schema assertions; header-comment manual dry-run runbook for the §9 skill-invocation regression.

### Commands

1. `(cd tools/validators && npm run build && npm test)` — runs the capstone sweep + schema assertions.
2. `(cd tools/world-mcp && npm run build && npm test)`; `(cd tools/world-index && npm run build && npm test)`; `(cd tools/hooks && npm run build && npm test)`; `(cd tools/patch-engine && npm run build && npm test && npm run test:integration)`; `(cd tools/story-explorer && npm test)` — all affected packages green.
3. Manual: the §9 bootstrap→turn-cycle→scene dry-run runbook (not test-suite-runnable; implementer checklist).

## Outcome

Implemented the SPEC-93 capstone as `tools/validators/tests/integration/spec93-capstone.test.ts`. The test classifies removal-completeness sweep hits, proves planless and legacy `PG` schema/hash behavior, and verifies `computePgStateHash` no longer special-cases `prose_plan_path` or `plan_hash`.

During the sweep, corrected narrow same-seam stale current references:

- Bootstrap/story-kernel contract now points to `branching-story-scene-prose-attach` and rendered scene prose.
- Shared story schema notes and validators README now describe legacy page prose receipts as historical, with current validation on scene prose receipts.
- Existing SPEC-42 and SPEC-43 capstone expectations were updated to current contract text and current validator behavior.
- The SPEC-43 synthetic legacy compatibility fixture now includes the `SE` records its `PG.input.resolved_event_id` fields already referenced, so compatibility advisories are the only remaining diagnostics.

## Verification Result

Passed:

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/integration/spec93-capstone.test.js`
3. `cd tools/validators && node --test dist/tests/integration/spec43-midstory-introduction.test.js`
4. `cd tools/validators && npm test` — 1057 tests passed.
5. `cd tools/world-mcp && npm run build`
6. `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js`
7. `cd tools/world-mcp && npm test` — 506 tests passed.
8. Earlier same-iteration package lanes also passed before the final narrow patches: `tools/world-index npm test`, `tools/hooks npm test`, `tools/patch-engine npm test`, and `tools/story-explorer npm test`.

## Deviations

The §9 bootstrap→turn-cycle→scene-plan→scene-prose-attach flow remains documented as a manual dry-run runbook in the capstone header because these are LLM skill invocations with HARD-GATE/user-approval boundaries, not an executable package test. The automated capstone covers the mechanized sweep/schema/hash parts and the package suites cover the affected tool contracts.
