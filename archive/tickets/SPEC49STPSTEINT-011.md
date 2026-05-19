# SPEC49STPSTEINT-011: E2E capstone — exercise new validators, schema constraints, edges, and health checks end-to-end

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`; update `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts`
**Deps**: archive/tickets/SPEC49STPSTEINT-002.md, archive/tickets/SPEC49STPSTEINT-003.md, archive/tickets/SPEC49STPSTEINT-004.md, archive/tickets/SPEC49STPSTEINT-005.md, archive/tickets/SPEC49STPSTEINT-006.md, archive/tickets/SPEC49STPSTEINT-007.md, archive/tickets/SPEC49STPSTEINT-008.md, archive/tickets/SPEC49STPSTEINT-009.md, archive/tickets/SPEC49STPSTEINT-010.md

## Problem

SPEC-49's §Test Plan declares an end-to-end test exercising the cumulative behavior of the spec's deliverables: *"End-to-end test inherited from SPEC-47: create → snapshot → replay → page plan → prose receipt round-trip for STPLAN and STEMO, extended to verify each new check fires correctly along the pipeline."* The per-ticket fixture tests (tickets 003-010) verify each deliverable in isolation; the capstone exercises the composed pipeline to catch cross-ticket integration issues that per-ticket tests can't surface. This is an inferred deliverable per `references/codebase-validation.md` §3.12 (the spec's §Test Plan names it, but §Deliverables does not enumerate it as a numbered deliverable). The §Spec-Integration Ticket Shape pattern applies: a single trailing ticket whose acceptance criteria enumerate the spec's §Test Plan + §Verification bullets as test sub-cases.

## Assumption Reassessment (2026-05-19)

1. SPEC-49 §Test Plan (line 243) confirmed via codebase grep — the line *"End-to-end test inherited from SPEC-47: create → snapshot → replay → page plan → prose receipt round-trip for STPLAN and STEMO, extended to verify each new check fires correctly along the pipeline"* is the inferred-deliverable basis. The existing `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` is the SPEC-47 capstone test that SPEC-49 extends; this ticket creates a parallel `spec49-stplan-stemo-hardening.test.ts` per the per-spec-NN naming convention seen at `tools/validators/tests/integration/`.
2. SPEC-49 §Approach Phase A + Phase B + Phase C deliverables define the cumulative behaviors to exercise: PG schema active_records carries STPLAN/STEMO (A.1); CHC grounds in STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF (A.2); state-snapshot-integrity flags terminal-status STPLAN/STEMO in active_records (A.3); STEMO agency_effect bug fix correctly catches incompatibility (B.1); STPLAN if/then enforces status-conditioned current_step + non-empty belief_basis (B.2+B.3); STPLAN predicate-references validator catches unparseable + unresolvable predicates (B.4); SE.state_relations[] deterministic coverage on all seven declared relations (B.5); STEMO orientation active+accessibility checks (B.6); world-index edges for new STPLAN/STEMO fields (C.1+C.2); health-audit Phase 2k 4 new checks (C.3). The capstone composes all of these.
3. Cross-skill boundary under audit: the capstone exercises schema compilation, existing structural validators, the world-index parser (new edges extracted), and health-audit prose. There is no executable health-audit skill runner in the repo; the Phase 2k portion is proved by source-prose assertions over `.claude/skills/branching-story-health-audit/SKILL.md`.
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary: the capstone exercises the planning/state surface directly and verifies the health-audit prose contract by source assertion. It does not mutate story state or claim a prose-receipt execution path. SPEC-49 §FOUNDATIONS Alignment confirms §4a alignment.

## Architecture Check

1. Single trailing capstone ticket depending on the upstream leaf set (per §Spec-Integration Ticket Shape) is the canonical pattern. The DAG is parallel-branch (most upstream tickets are independent leaves; only ticket 003 has a Deps:001 chain), so the capstone's `Deps` enumerates the 9 leaves (002, 003, 004, 005, 006, archive/tickets/SPEC49STPSTEINT-007.md, archive/tickets/SPEC49STPSTEINT-008.md, archive/tickets/SPEC49STPSTEINT-009.md, archive/tickets/SPEC49STPSTEINT-010.md) per the parallel-branch resolution rule. The single ticket 001 is reachable transitively via ticket 003.
2. The capstone introduces no new production code — only a new test file. It exercises the pipeline composed by tickets 001-010.
3. Fixture strategy corrected at implementation: the landed capstone follows the nearby integration-test pattern by using inline records and temp world-index roots rather than a checked-in fixture-world directory. This keeps the real `worlds/<slug>/` tree untouched and avoids adding a large fixture tree solely to prove already-mechanized contracts.
4. The full validators suite exposed a same-seam stale assertion in `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts`: SPEC-49 expanded the `STORY_EDGE_TYPES` registry from 50 to 56. The capstone iteration updates that assertion so the broad package lane reflects the current registry.

## Verification Layers

1. Engine validation surface: schema compilation and existing structural validators cover the SPEC-49 constraints over inline/temp records. Validator surface: assertion on validator output and schema errors.
2. World-index round-trip: rebuilding the index after `archive/tickets/SPEC49STPSTEINT-009.md`'s edge extraction surfaces the 6 new edge types. Validator surface: assertion on world-index edge rows and any available retrieval-layer query results.
3. Health-audit Phase 2k: the new Phase 2k check names, finding-code surface, lookup table, and migration phrase are present in `.claude/skills/branching-story-health-audit/SKILL.md`. Validator surface: package-local source-prose assertion.
4. Cross-ticket integration: the capstone composes schema, validator, world-index, and skill-prose surfaces in one compiled integration file while preserving focused per-validator tests for per-relation exhaustive coverage.

## Landed Changes

### 1. Created `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`

Implemented a compiled integration capstone following the package's existing inline/temp-fixture patterns:

- **Sub-test 1 (schema constraints)**: compiles the live story-page, story-choice, and story-plan schemas; asserts STPLAN/STEMO active-record and CHC grounding acceptance; asserts active-vs-terminal STPLAN `current_step` and `belief_basis` behavior.
- **Sub-test 2 (structural validators)**: composes STEMO agency-effect compatibility, STPLAN predicate-reference failures, SE plan-relation status mismatch, STEMO orientation inactive target, and state-snapshot inactive STPLAN/STEMO active-record checks.
- **Sub-test 3 (world-index edges)**: builds a temp world-index root and asserts the six SPEC-49 STPLAN/STEMO edge rows.
- **Sub-test 4 (health-audit Phase 2k prose)**: asserts the four new deterministic check names, the `contradictory_affect_pairs` table, and the migration phrase exist in the health-audit skill.

No wall-clock perf assertion (SPEC-49 names no performance gate).

### 2. Updated `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts`

Updated the `STORY_EDGE_TYPES` registry count assertion from 50 to 56 so the existing SPEC-47 integration test matches the post-SPEC-49 edge registry.

## Files to Touch

- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (new)
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modify — update edge-registry count)

## Out of Scope

- Modifying any production code (validators, parsers, schemas, skills). The capstone exercises code that tickets 001-010 land.
- Adding wall-clock performance assertions. SPEC-49 names no performance gate; perf testing is out of scope.
- Adding a checked-in fixture-world directory. The landed test uses inline records and temp world-index roots.
- Adding CI gate hooks for the capstone. The test runs as part of the standard `npm test --prefix tools/validators` suite.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` includes the new capstone test and all 4 sub-tests PASS.
2. The capstone uses inline records and temp world-index roots; it does not depend on a real world bundle or mutate `worlds/<slug>/`.
3. The SPEC-47 registry-count assertion matches the current `STORY_EDGE_TYPES` registry after SPEC-49's six new edges.

### Invariants

1. Every SPEC-49 §Approach behavior has at least one sub-test assertion in the capstone.
2. The capstone's inline records and temp world-index root are self-contained — the test does not depend on any real world bundle.
3. The capstone exercises the cumulative mechanized surfaces available in this repo: schema compilation, structural validators, temp world-index build, and health-audit prose assertions. It does not claim an executable prose-receipt or health-audit skill run.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (new) — the capstone test itself.
2. `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modified) — same-seam broad-suite proof truthing for the expanded edge registry count.

### Commands

1. `npm test --prefix tools/validators` (full validator suite including the new capstone)
2. Targeted from `tools/validators`: `npm run build && node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js`
3. Pre-existence grep-proof of test file: `test -f tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` returns 0 (file exists).

## Outcome

Completed: 2026-05-19.

Implemented the SPEC-49 validators capstone as `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` and truthed the existing SPEC-47 integration edge-registry count to the current 56-entry registry. The new capstone uses inline/temp fixtures and asserts the available mechanized surfaces: schema constraints, structural validator verdicts, temp `world-index build` edge extraction, and health-audit Phase 2k source prose.

Verification results:

- `npm run build` from `tools/validators` passed after correcting the capstone to avoid a non-exported `@worldloom/world-index/schema/types` import.
- `node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js` from `tools/validators` passed: 4 subtests, 0 failures.
- `npm test` from `tools/validators` passed: 663 tests, 0 failures.
- `test -f tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` returns 0.

Deviations:

- The drafted checked-in fixture directory was not created. The package's existing integration style supports inline records and temp world-index roots, which proved the same invariant with less fixture drift.
- No executable health-audit skill dry-run exists in this repo. The capstone verifies Phase 2k health-audit coverage by source-prose assertions over `.claude/skills/branching-story-health-audit/SKILL.md`.
- The first broad `npm test` run failed only because `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` still expected 50 story edge types. Updating that stale assertion to 56 was same-seam proof truthing for SPEC-49's six new edge types; the rerun passed.
