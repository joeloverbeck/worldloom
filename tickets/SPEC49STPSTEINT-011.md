# SPEC49STPSTEINT-011: E2E capstone — exercise new validators, schema constraints, edges, and health checks end-to-end

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`
**Deps**: archive/tickets/SPEC49STPSTEINT-002.md, archive/tickets/SPEC49STPSTEINT-003.md, archive/tickets/SPEC49STPSTEINT-004.md, archive/tickets/SPEC49STPSTEINT-005.md, archive/tickets/SPEC49STPSTEINT-006.md, archive/tickets/SPEC49STPSTEINT-007.md, archive/tickets/SPEC49STPSTEINT-008.md, archive/tickets/SPEC49STPSTEINT-009.md, tickets/SPEC49STPSTEINT-010.md

## Problem

SPEC-49's §Test Plan declares an end-to-end test exercising the cumulative behavior of the spec's deliverables: *"End-to-end test inherited from SPEC-47: create → snapshot → replay → page plan → prose receipt round-trip for STPLAN and STEMO, extended to verify each new check fires correctly along the pipeline."* The per-ticket fixture tests (tickets 003-010) verify each deliverable in isolation; the capstone exercises the composed pipeline to catch cross-ticket integration issues that per-ticket tests can't surface. This is an inferred deliverable per `references/codebase-validation.md` §3.12 (the spec's §Test Plan names it, but §Deliverables does not enumerate it as a numbered deliverable). The §Spec-Integration Ticket Shape pattern applies: a single trailing ticket whose acceptance criteria enumerate the spec's §Test Plan + §Verification bullets as test sub-cases.

## Assumption Reassessment (2026-05-19)

1. SPEC-49 §Test Plan (line 243) confirmed via codebase grep — the line *"End-to-end test inherited from SPEC-47: create → snapshot → replay → page plan → prose receipt round-trip for STPLAN and STEMO, extended to verify each new check fires correctly along the pipeline"* is the inferred-deliverable basis. The existing `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` is the SPEC-47 capstone test that SPEC-49 extends; this ticket creates a parallel `spec49-stplan-stemo-hardening.test.ts` per the per-spec-NN naming convention seen at `tools/validators/tests/integration/`.
2. SPEC-49 §Approach Phase A + Phase B + Phase C deliverables define the cumulative behaviors to exercise: PG schema active_records carries STPLAN/STEMO (A.1); CHC grounds in STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF (A.2); state-snapshot-integrity flags terminal-status STPLAN/STEMO in active_records (A.3); STEMO agency_effect bug fix correctly catches incompatibility (B.1); STPLAN if/then enforces status-conditioned current_step + non-empty belief_basis (B.2+B.3); STPLAN predicate-references validator catches unparseable + unresolvable predicates (B.4); SE.state_relations[] deterministic coverage on all seven declared relations (B.5); STEMO orientation active+accessibility checks (B.6); world-index edges for new STPLAN/STEMO fields (C.1+C.2); health-audit Phase 2k 4 new checks (C.3). The capstone composes all of these.
3. Cross-skill boundary under audit: the capstone exercises the engine pre-apply gate (every new validator fires correctly), the world-index parser (new edges extracted), and the health-audit prose (new Phase 2k checks fire on the audit fixture). The test composes the boundaries that the per-ticket fixture tests exercise in isolation.
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary: the capstone exercises the planning surface (PG snapshot containing active STPLAN/STEMO records) and the prose surface (prose receipt referencing the rendered emotional/tactical state) without confusing the two — the planning state is authoritative; the prose receipt is a renderable receipt. SPEC-49 §FOUNDATIONS Alignment confirms §4a alignment.

## Architecture Check

1. Single trailing capstone ticket depending on the upstream leaf set (per §Spec-Integration Ticket Shape) is the canonical pattern. The DAG is parallel-branch (most upstream tickets are independent leaves; only ticket 003 has a Deps:001 chain), so the capstone's `Deps` enumerates the 9 leaves (002, 003, 004, 005, 006, archive/tickets/SPEC49STPSTEINT-007.md, archive/tickets/SPEC49STPSTEINT-008.md, archive/tickets/SPEC49STPSTEINT-009.md, tickets/SPEC49STPSTEINT-010.md) per the parallel-branch resolution rule. The single ticket 001 is reachable transitively via ticket 003.
2. The capstone introduces no new production code — only a new test file. It exercises the pipeline composed by tickets 001-010.
3. Fixture-world copy strategy: the test uses `fs.cpSync` (or equivalent) to copy a fixture world to a temp root before exercising the pipeline, keeping the real `worlds/<slug>/` tree untouched per §Spec-Integration Ticket Shape's discipline. Re-enumerated expected counts (not hardcoded) computed from the fixture at test start.

## Verification Layers

1. Engine pre-apply gate: each new validator (tickets 003-008) fires correctly on the fixture-world's STPLAN/STEMO records. Validator surface: assertion on validator output (PASS for compliant records; named-finding FAIL for non-compliant records).
2. World-index round-trip: rebuilding the index after `archive/tickets/SPEC49STPSTEINT-009.md`'s edge extraction surfaces the 6 new edge types. Validator surface: assertion on world-index edge rows and any available retrieval-layer query results.
3. Health-audit Phase 2k: invoking the health-audit skill (per ticket 010) on the fixture-world produces the expected findings for each of the 4 new checks. Validator surface: assertion on health-audit finding-code matches.
4. Cross-ticket integration: a STPLAN with a malformed predicate is caught by ticket 006's validator at pre-apply, AND its world-index edge extraction (`archive/tickets/SPEC49STPSTEINT-009.md`) doesn't crash on the malformed input. Validator surface: composition-level test fixture.

## What to Change

### 1. Create `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`

Implement an end-to-end test following the pattern of `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts`. Test structure:

- **Fixture setup**: `fs.cpSync` a fixture-world tree to a temp directory. Re-enumerate expected STPLAN/STEMO record counts at test start.
- **Sub-test 1 (schema constraints)**: assert that PG.state_snapshot.active_records.STPLAN[] / STEMO[] is allowed (ticket 001), CHC.grounded_in.records[] accepts STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF (ticket 002), STPLAN if/then constraints fire correctly for active+terminal cases (ticket 005).
- **Sub-test 2 (validator bug fixes + new validators)**: assert that STEMO agency_effect compatibility fires correctly (ticket 004), STPLAN predicate-references catches unparseable + unresolvable predicates (ticket 006), SE.state_relations[] deterministic coverage fires for all seven declared relations (archive/tickets/SPEC49STPSTEINT-007.md), STEMO orientation strengthening fires for inactive/inaccessible targets with the BEL imagined-object carve-out (ticket 008), state-snapshot-integrity inactive-record lifecycle fires for terminal-status STPLAN/STEMO (ticket 003).
- **Sub-test 3 (world-index edges)**: after `world-index build` on the fixture, assert the 6 new edge types are extracted (`archive/tickets/SPEC49STPSTEINT-009.md`).
- **Sub-test 4 (health-audit Phase 2k)**: invoke the health-audit skill prose against a fixture bundle containing the 4 new check trigger patterns; assert each finding code fires (ticket 010).
- **Sub-test 5 (composition)**: a single fixture containing a STPLAN with both malformed predicates (ticket 006 validator FAIL) and a derived_from edge (`archive/tickets/SPEC49STPSTEINT-009.md`) is correctly handled — validator FAIL on the predicate doesn't block world-index extraction of the edge.

Re-enumerated expected counts: at test start, walk the fixture's `_source/plans/`, `_source/emotions/`, `_source/pages/`, `_source/choices/` directories to compute expected counts dynamically. Hardcoded counts become stale; re-enumeration stays valid.

No wall-clock perf assertion (SPEC-49 names no performance gate).

### 2. Fixture worlds for the capstone

The test's fixture-world directory should be created at `tools/validators/tests/fixtures/spec49-stplan-stemo-hardening-world/` with a minimal but complete story bundle exercising each new behavior. Reuse the SPEC-47 fixture pattern where applicable.

## Files to Touch

- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (new)
- `tools/validators/tests/fixtures/spec49-stplan-stemo-hardening-world/` (new directory tree — fixture bundle)

## Out of Scope

- Modifying any production code (validators, parsers, schemas, skills). The capstone exercises code that tickets 001-010 land.
- Adding wall-clock performance assertions. SPEC-49 names no performance gate; perf testing is out of scope.
- Modifying or extending the SPEC-47 capstone test (`spec47-stplan-stemo-integration.test.ts`). SPEC-49's capstone is parallel, not a replacement.
- Adding CI gate hooks for the capstone. The test runs as part of the standard `npm test --prefix tools/validators` suite.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` includes the new capstone test and all 5 sub-tests PASS.
2. The capstone fixture-world is created under `tools/validators/tests/fixtures/spec49-stplan-stemo-hardening-world/` and is internally consistent (every cited record exists; every cited edge resolves; every cited predicate parses or is intentionally malformed for the FAIL sub-test).
3. Re-enumerated counts in the test match the fixture's actual record counts (no hardcoded count drift).
4. The capstone does NOT mutate the real `worlds/<slug>/` tree — verified by asserting the working-tree state before and after the test.

### Invariants

1. Every SPEC-49 §Approach behavior has at least one sub-test assertion in the capstone.
2. The capstone's fixture-world is self-contained — the test does not depend on any real world bundle.
3. The capstone exercises the cumulative pipeline (create → snapshot → replay → page plan → prose receipt for STPLAN/STEMO) per SPEC-49 §Test Plan's E2E description.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (new) — the capstone test itself.
2. `tools/validators/tests/fixtures/spec49-stplan-stemo-hardening-world/` (new directory tree) — fixture bundle including STPLAN/STEMO records, PG snapshots with active_records, CHC records with various grounding patterns, SE records with state_relations across all seven declared relations, prose receipts for the suppression-render-conflict sub-test.

### Commands

1. `npm test --prefix tools/validators` (full validator suite including the new capstone)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/integration/spec49-stplan-stemo-hardening.test.js`
3. Pre-existence grep-proof of test file: `test -f tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` returns 0 (file exists).
