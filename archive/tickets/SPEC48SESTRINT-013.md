# SPEC48SESTRINT-013: Integration test capstone — fixture bundle exercising 3 new SE fields end-to-end

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds 1 integration test under `tools/validators/tests/integration/`; folds D-A7 patch-engine STORY_RECORD_SPECS verification as a sub-assertion (no code change to patch-engine)
**Deps**: archive/tickets/SPEC48SESTRINT-005.md, archive/tickets/SPEC48SESTRINT-006.md, archive/tickets/SPEC48SESTRINT-007.md, archive/tickets/SPEC48SESTRINT-010.md, archive/tickets/SPEC48SESTRINT-011.md, archive/tickets/SPEC48SESTRINT-012.md, archive/tickets/SPEC48SESTRINT-014.md

## Problem

SPEC-48 §Phase E D-E3 specifies a cross-phase integration test that exercises the full clean-break design end-to-end: bootstrap a representative fixture bundle with seeded structured-field SE records covering all 3 new fields (`record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`); run turn-cycle + prose-attach + health-audit; assert (i) all 8 hard gates pass; (ii) schema rejects malformed structured fields (trigger-class mismatch, duplicate `record_id` in same SE, malformed RECORD_ID); (iii) the D-C3 CI parser-deletion gate fires green; (iv) the D-C4 skill-prose tag-absence gate fires green. SPEC-48 D-A7 (patch-engine `STORY_RECORD_SPECS` verification) folds into this ticket as a sub-assertion (verified at integration test time rather than as a standalone deliverable, per the SPEC-47 precedent of folding sub-assertion deliverables into the capstone). Without this capstone, the per-phase tickets land in isolation but the end-to-end clean-break guarantee — that an SE record carrying all 3 new fields validates through schema → validators → world-index edge extraction → MCP retrieval — remains unverified.

## Assumption Reassessment (2026-05-19)

1. **Test path convention**: per the Pre-Write Files-to-Touch existence check, `tools/validators/tests/integration/` is the established convention for integration tests (verified via `ls tools/validators/tests/integration/` — `validate-patch-plan.test.ts`, `spec14-engine-roundtrip.test.ts`, `spec43-midstory-introduction.test.ts`, `stemo-full-validation.test.ts`). This ticket adds `spec48-se-structured-introduction-fields.test.ts` at the same convention path.
2. **D-A7 patch-engine STORY_RECORD_SPECS sub-assertion**: SPEC-48 D-A7 specifies "Verify patch-engine `STORY_RECORD_SPECS` for SE — confirm the three new fields are structurally allowed at `create_se_record` op time. No code change expected if the SE op is schema-driven; explicit verification ticket." Per the §Sub-assertion deliverable rule, this folds into the integration test ticket as a sub-assertion: the integration test validates a `create_se_record` patch plan carrying all 3 new fields through `validatePatchPlan(...)`; if patch-engine's schema-driven story-record op surface (verified at SPEC-48 reassess-spec via `tools/patch-engine/src/ops/create-story-record.ts:104`) materializes the payload and the relevant pre-apply validators accept it, the sub-assertion passes. Expected outcome: pass without code change.
3. **Cross-skill boundary under audit**: the capstone exercises the full pipeline — schema validation (ticket 001), contract authority (ticket 002), typed readers (ticket 003), 12 refactored validators (tickets 004-007), world-index edge extraction (archive/tickets/SPEC48SESTRINT-008.md), parser-absence + skill-prose-absence CI gates (archive/tickets/SPEC48SESTRINT-009.md plus archive/tickets/SPEC48SESTRINT-010.md), skill prose + shared-template updates (archive/tickets/SPEC48SESTRINT-011.md), MCP + docs surfaces (ticket 012). Per §Spec-Integration Ticket Shape parallel-branch leaf-set rule, dependencies are the leaf set covering the full DAG: archive/tickets/SPEC48SESTRINT-005.md, archive/tickets/SPEC48SESTRINT-006.md, 007 (validator-refactor leaves; not reached transitively via archive/tickets/SPEC48SESTRINT-010.md because archive/tickets/SPEC48SESTRINT-010.md only depends on archive/tickets/SPEC48SESTRINT-009.md, 003, 004, and archive/tickets/SPEC48SESTRINT-008.md — not 005/006/007), archive/tickets/SPEC48SESTRINT-010.md (CI gates leaf), archive/tickets/SPEC48SESTRINT-011.md (skill prose leaf), 012 (docs leaf).
4. **FOUNDATIONS §Story Bundles §5b + Rule 7**: §5b motivates the schema-minimalism doctrine — every new field has named §5b-class consumers (the 12 refactored validators); the capstone verifies the schema-minimalism contract end-to-end. Rule 7 (Preserve Mystery Deliberately) is preserved by the `introduction-observer-firewall.ts` refactor (ticket 004); the capstone exercises observer-firewall behavior against a fixture bundle carrying observer-firewall-sensitive introductions.
5. **Live harness correction**: the drafted "run turn-cycle, prose-attach, and health-audit" step is not executable in this package test harness. The implementation uses mechanized surrogates that are available in the current checkout: `record_schema_compliance`, `record_introduction_uniqueness`, `non_propagation_facts_completeness`, `stplan_event_plan_relation_consistency`, `validatePatchPlan(...)`, `world-index build`, and the two SPEC-48 regression-gate test files. This preserves the capstone's machine-facing contract without claiming an interactive skill dry-run.
6. **Fixture layout correction**: no new checked-in fixture directory is needed. The existing SPEC-47 and validate-patch-plan precedents use temp-root and inline fixture builders for this class of capstone. This ticket therefore adds one integration test file with inline/temp fixtures and leaves `tools/validators/tests/integration/fixtures/spec48/` uncreated.

## Architecture Check

1. **Spec-Integration Ticket Shape capstone**: this ticket follows the recurring worldloom capstone pattern (one trailing ticket per spec whose acceptance criteria enumerate the spec's §Verification bullets as test sub-cases; no new production code; exercises the pipeline composed by earlier tickets). The fixture-world copy strategy (per §Spec-Integration Ticket Shape) uses `fs.cpSync` to a temp root so the test never mutates real `worlds/<slug>/` canon.
2. **Re-enumerated expected counts**: counts (validator firing counts, schema-rejection counts, edge-extraction counts) are asserted from the generated temp fixture and live command output rather than copied from stale proposal prose — the §Spec-Integration Ticket Shape's stay-valid-over-time discipline.
3. **No backwards-compatibility aliasing**: the integration test does not exercise any "fallback to parsed tags" path because no such path exists post-clean-break. The test asserts the structured-field representation is the only valid representation; any malformed structured-field shape is rejected at schema validation.

## Verification Layers

1. Fixture bundle bootstrap + clean-break SE records → integration test bootstraps temp-root / inline fixtures with seeded SE records carrying all 3 new fields; asserts no error at bootstrap time.
2. Structured validation rejects malformed structured-field shapes → 4 negative-case sub-tests: (i) trigger-class mismatch (`class: CLK` + `trigger: tactical_approach_committed`) → schema rejects; (ii) duplicate `record_id` in same SE.record_introductions[] with differing item bodies → SPEC48SESTRINT-014 validator rejects; (iii) malformed RECORD_ID (`record_id: foo`) → schema rejects via pattern; (iv) invalid relation enum value (`relation: convolves`) → schema rejects via enum.
3. Mechanized hard-gate surrogates pass on the fixture bundle → the available validator/pre-apply/index gates run green; the test does not claim an interactive story-skill dry-run.
4. World-index edge extraction → run `world-index build` over the fixture; assert introduction-derived edges are emitted from `SE.record_introductions[]` (count + types match expected).
5. MCP/docs surface → covered by archive/tickets/SPEC48SESTRINT-012.md and the SPEC-48 parser/prose absence gates; this capstone does not invoke a live external MCP connector.
6. CI gates fire green → the parser-deletion-completeness gate + the skill-prose-tag-syntax-absence gate (both from archive/tickets/SPEC48SESTRINT-010.md) report PASS in the full test suite run.
7. D-A7 sub-assertion → fixture validates a `create_se_record` patch plan carrying all 3 new fields through `validatePatchPlan(...)`; the pre-apply materialized SE passes `record_schema_compliance`, and the patch-engine package suite proves the generic story-record op path remains green.

## What to Change

### 1. Create `tools/validators/tests/integration/spec48-se-structured-introduction-fields.test.ts`

Integration test file using `node:test` + `node:assert`. Structure:

```typescript
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
// ... existing integration-test helpers (per spec43-midstory-introduction.test.ts convention)

test("SPEC-48: fixture bundle with structured-field SE records validates end-to-end", async () => {
  // 1. Seed SE records with structured fields covering all 3 new fields.
  // 2. Assert structural validators consume the fields without parser/tag fallback.
  // 3. Submit a create_se_record patch plan through validatePatchPlan (D-A7 sub-assertion).
  // 4. Run world-index build over a temp root; assert introduction-derived edges emit from structured fields.
});

test("SPEC-48: schema rejects malformed record_introductions[] shapes", async () => {
  // 4 negative sub-cases covering trigger-class mismatch, duplicate record_id, malformed RECORD_ID, invalid relation enum
});

test("SPEC-48: CI gates fire green on post-clean-break tree", async () => {
  // Invoke the parser-deletion-completeness test + skill-prose-tag-syntax-absence test from archive/tickets/SPEC48SESTRINT-010.md
  // Assert both report PASS
});

test("SPEC-48: world_logic_rationale prose-only — accidental tag-like substrings are inert", async () => {
  // Per SPEC-48 R-3 mitigation: seed an SE with world_logic_rationale = "Mara wonders if the intro: section will resolve."
  // Assert the SE validates successfully; no validator misattributes structural meaning to the prose substring.
});
```

The test imports the existing `node:test` framework, the integration-test helpers from sibling tests (per the `spec43-midstory-introduction.test.ts` convention which is the structurally closest precedent), and the validators / patch-engine / world-index packages via their public APIs.

### 2. Fixture world content for the test

Seed inline/temp fixture records demonstrating each of the 3 new structured fields. At least one SE carries all 3 fields. No checked-in fixture directory is created.

### 3. Fold D-A7 patch-engine verification as a sub-assertion

Inside the main test (#1 above), validate a `create_se_record` patch plan via `validatePatchPlan(...)` carrying an SE with all 3 new fields. Assert the pre-apply materialized SE passes `record_schema_compliance`, `record_introduction_uniqueness`, and `non_propagation_facts_completeness`. This satisfies SPEC-48 D-A7's verification requirement without a standalone ticket because `STORY_RECORD_SPECS.create_se_record` is schema-driven and does not allow-list individual SE fields.

## Files to Touch

- `tools/validators/tests/integration/spec48-se-structured-introduction-fields.test.ts` (new)
- `archive/tickets/SPEC48SESTRINT-013.md` (modify — reassessment and closeout truthing)

## Out of Scope

- New production code in any package (this ticket is test-only).
- Schema, contract, validator, world-index, parser-deletion, CI gates, skill-prose, docs updates (covered by upstream tickets).
- Future Priority 2 packet specs (per SPEC-48 §Out of Scope item 4 — deferred per `docs/plans/2026-05-19-spec47-followup-routing.md`).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator test suite passes, including the new `spec48-se-structured-introduction-fields.test.ts` integration test.
2. The integration test's mechanized hard-gate surrogate assertions report PASS for the structured-field fixture surfaces.
3. The integration test's schema-rejection sub-tests (4 negative cases) each fail at schema validation as expected.
4. The integration test's D-A7 sub-assertion confirms pre-apply materialization/schema validation accepts SE records carrying all 3 new fields; `npm test --prefix tools/patch-engine` confirms the story-record op path remains green.
5. The integration test's prose-inertness sub-test confirms that a `world_logic_rationale` containing the substring `intro:` (as part of legitimate prose, not as a tag) does not produce validator misattribution.

### Invariants

1. The SPEC-48 clean-break design works end-to-end — schema → validators → world-index → MCP — with no parser code reachable in any traced execution path.
2. The patch-engine `STORY_RECORD_SPECS` requires no code change for the 3 new optional SE fields (D-A7 sub-assertion).
3. CI gates added by archive/tickets/SPEC48SESTRINT-010.md fire green; future regressions re-introducing parser or tag-grammar fail the gates.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec48-se-structured-introduction-fields.test.ts` (new) — integration cases covering positive path + schema-rejection negative cases + CI-gate green + prose-inertness, with inline/temp fixtures.

### Commands

1. `npm test --prefix tools/validators` — full validator test suite (includes the new integration test).
2. `npm test --prefix tools/world-index` — world-index test suite (verifies edge extraction from structured fields).
3. `npm test --prefix tools/world-mcp` — world-mcp test suite (verifies MCP retrieval surface).
4. End-to-end: `npm test --prefix tools/validators && npm test --prefix tools/world-index && npm test --prefix tools/world-mcp && npm test --prefix tools/patch-engine` — all 4 packages build + test green in the post-clean-break tree.

## Outcome

Completed: 2026-05-19

This ticket landed `tools/validators/tests/integration/spec48-se-structured-introduction-fields.test.ts`, a package-level SPEC-48 capstone using inline/temp fixtures instead of a checked-in fixture directory. The test verifies:

1. An SE carrying `record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]` passes the available structural validators.
2. Malformed structured-field shapes fail through schema/structural validators.
3. The parser-deletion and skill-prose tag-syntax regression gates stay green.
4. Tag-like `world_logic_rationale` prose remains inert when no structured entries are present.
5. `world-index build` emits `creation_evidence` edges from `SE.record_introductions[]`.
6. `validatePatchPlan(...)` materializes a `create_se_record` payload carrying all 3 fields and passes the relevant pre-apply validators.

## Verification Result

Commands run from package roots:

1. `npm run build` in `tools/validators` — PASS.
2. `node --test dist/tests/integration/spec48-se-structured-introduction-fields.test.js` in `tools/validators` — PASS (4/4 tests).
3. `npm test` in `tools/validators` — PASS (626/626 tests).
4. `npm test` in `tools/world-index` — PASS (119/119 tests).
5. `npm test` in `tools/world-mcp` — PASS (407/407 tests).
6. `npm test` in `tools/patch-engine` — PASS (85/85 tests).

## Deviations

1. The drafted interactive skill-flow proof (`turn-cycle`, `prose-attach`, `health-audit`) was replaced with mechanized package-level surrogates because there is no executable story-skill runner in this test harness.
2. No `tools/validators/tests/integration/fixtures/spec48/` directory was created; the landed test uses inline/temp fixtures, matching the current SPEC-47 and validate-patch-plan precedent.
3. The D-A7 proof uses `validatePatchPlan(...)` plus the patch-engine package suite rather than a signed `submit_patch_plan` run. That is the truthful local boundary for this capstone because the field allowability is schema-driven, not a field allow-list inside `STORY_RECORD_SPECS`.
