# SPEC27FOUCAN-009: Integration capstone — test lanes + stale-vocab sweep + cross-cutting docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md` (cross-cutting doc reconciliation). No production code; runs package build/test lanes for verification.
**Deps**: archive/tickets/SPEC27FOUCAN-001.md, archive/tickets/SPEC27FOUCAN-002.md, archive/tickets/SPEC27FOUCAN-003.md, archive/tickets/SPEC27FOUCAN-004.md, archive/tickets/SPEC27FOUCAN-005.md, archive/tickets/SPEC27FOUCAN-006.md, archive/tickets/SPEC27FOUCAN-007.md, archive/tickets/SPEC27FOUCAN-008.md

## Problem

At intake, SPEC-27's amendments spanned the CF schema (D1), FOUNDATIONS structure (D2), `canon-addition` (D3), HARD-GATE discipline (D4), and the story-pipeline contract + skills (D5-D8). This capstone reconciled the remaining cross-cutting docs and verified that the validator and affected package lanes pass, no current CF `mystery_reserve` status or retired-`.md`-filename `required_world_updates` residue remains, and `docs/WORKFLOWS.md` + `docs/MACHINE-FACING-LAYER.md` reflect the amended CF status enum and the rule-numbering map.

## Assumption Reassessment (2026-05-15)

1. `tools/validators`, `tools/world-index`, `tools/patch-engine`, and `tools/world-mcp` each expose `npm run build` + `npm test` (confirmed via the SPEC-27 spec-to-tickets Step 2 command-surface scan). `docs/WORKFLOWS.md` cites "Test 13" and CF-status terminology; `docs/MACHINE-FACING-LAYER.md` documents the validator framework and CF-status vocabulary — both must be checked against D1's amended enum and D2's rule-numbering map.
2. This ticket depends on `archive/tickets/SPEC27FOUCAN-001.md`, `archive/tickets/SPEC27FOUCAN-002.md`, `archive/tickets/SPEC27FOUCAN-003.md`, `archive/tickets/SPEC27FOUCAN-004.md`, `archive/tickets/SPEC27FOUCAN-005.md`, `archive/tickets/SPEC27FOUCAN-006.md`, `archive/tickets/SPEC27FOUCAN-007.md`, and `archive/tickets/SPEC27FOUCAN-008.md` having landed; it introduces no production code and exercises the surfaces those tickets produced. All eight `Deps` are tickets produced in this same decomposition run.
3. Shared boundary under audit: the full SPEC-27 amendment surface — the CF schema/type, the FOUNDATIONS §Validation Rules numbering, the story-pipeline contract + skills, and the two cross-cutting docs. This ticket verifies coherence across all of them; it owns no single deliverable's primary edit.
4. FOUNDATIONS principle under audit: the reconciliation confirms every SPEC-27 amendment (D1-D8) landed without leaving the doc set internally inconsistent — the spec's §Verification D9 contract.
5. Live package scripts confirmed the package-test boundary needs one correction: `tools/validators` runs `npm run build` inside `npm test`, while `tools/world-index` has `npm test` as `node --test "dist/tests/**/*.test.js"` and therefore consumes compiled output. The truthful D9 package lane is `cd tools/validators && npm test`, then `cd tools/world-index && npm run build && npm test`.
6. All eight dependency tickets exist under `archive/tickets/` and are marked `COMPLETED`. Their closeout records show D1 owned the CF status and `required_world_updates` contract, D2 owned the FOUNDATIONS Rule map, D5-D8 owned the story-pipeline clauses, and D6's package proof was `tools/validators`; D9 remains a capstone verification/doc-reconciliation pass, not a production-code owner.
7. `docs/WORKFLOWS.md` used "Test 13" as a `canon-addition` Validation Test reference, which is legitimate after D2; its same-seam reconciliation was to make the Test-vs-FOUNDATIONS-Rule distinction explicit and keep the `world-validate --rules=1,2,4,5,6,7,11,12` example aligned with mechanized rules.
8. `docs/MACHINE-FACING-LAYER.md` said validators turn FOUNDATIONS Rules 1 through 7 into executable checks. That was stale after D2 because the defined/mechanized rule map is Rules 1-7, 11, and 12, with 8-10/13 intentionally not validator selectors. It also described `get_record_schema` for CF taxonomy without naming the amended CF status enum; the capstone owns a concise current-contract note there.
9. Stale-vocabulary sweeps must be classified, not forced to zero hits: `mystery_reserve` remains a legitimate Mystery Reserve record class, validator name, vocabulary class, and context-packet priority key. Retired root markdown filename hits remain legitimate in canonical-storage/deprecation prose, historical triage, examples, and non-CF `required_world_updates` examples unless they assert the old CF `required_world_updates` shape.

## Architecture Check

1. A single trailing capstone is cleaner than per-ticket cross-cutting doc edits: `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` need all of D1-D8's surfaces to exist coherently before they can be reconciled in one breath (the CF-status enum, the rule-numbering map, the story-pipeline rules).
2. No backwards-compatibility aliasing — docs-and-verification only; no production code, no shims.

## Verification Layers

1. `tools/validators` + affected `tools/` package build/test lanes pass after D1-D8 land -> schema validation + test-lane run.
2. No `mystery_reserve` CF-status residue and no retired-`.md`-filename `required_world_updates` residue remain pipeline-wide -> codebase grep-proof.
3. `docs/WORKFLOWS.md` + `docs/MACHINE-FACING-LAYER.md` reflect the amended CF status enum and the rule-numbering map -> codebase grep-proof against the post-implementation tree + manual review.

## Landed Changes

### 1. Run the test lanes

- Ran `npm test` in `tools/validators`. Ran `npm run build` and then `npm test` in `tools/world-index` because its test script consumes existing compiled `dist/` output. Both lanes passed.

### 2. Stale-vocabulary sweep

- Ran `rg -n 'mystery_reserve' tools .claude/skills docs specs` and classified the remaining hits as legitimate Mystery Reserve record-class, validator, vocabulary, context-packet, historical-spec, or ticket-evidence hits. Ran a multiline retired-filename `required_world_updates` sweep and found no current CF `required_world_updates` residue.

### 3. WORKFLOWS.md reconciliation

- Reconciled `docs/WORKFLOWS.md` so its CF-status terminology and rule/test references reflect D1's amended enum and D2's rule-numbering map. The "Test 13" reference remains a canon-addition Validation Test reference and now explicitly states it is not a FOUNDATIONS Rule 13.

### 4. MACHINE-FACING-LAYER.md reconciliation

- Reconciled `docs/MACHINE-FACING-LAYER.md` so its validator-framework description names the defined mechanized rule selectors (Rules 1-7, 11, and 12) and its schema-discovery / CF-status description reflects D1's amended enum.

## Files to Touch

- `docs/WORKFLOWS.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

Note: the test-lane runs and the stale-vocabulary sweep are verification actions, not file edits; any residue fix the sweep surfaces is applied to the offending file and named in the implementation summary.

## Out of Scope

- Re-implementing any D1-D8 deliverable — this ticket verifies and reconciles; it does not own a primary deliverable edit.
- Production code changes — docs + verification only.
- Editing `docs/FOUNDATIONS.md` — D1-D8 own all FOUNDATIONS edits.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes; `cd tools/world-index && npm run build && npm test` passes.
2. `rg -n 'mystery_reserve' tools .claude/skills docs specs` returns no CF-`status` enum residue after classification of legitimate Mystery Reserve record-class / validator / vocabulary / context-packet / historical-spec hits.
3. `rg -n -U 'required_world_updates(.|\n){0,240}(INSTITUTIONS\.md|ECONOMY_AND_RESOURCES\.md|EVERYDAY_LIFE\.md|TIMELINE\.md)|(?:INSTITUTIONS\.md|ECONOMY_AND_RESOURCES\.md|EVERYDAY_LIFE\.md|TIMELINE\.md)(.|\n){0,240}required_world_updates' docs .claude/skills` returns no current CF `required_world_updates` retired-filename residue; broader retired-filename hits are classified separately.

### Invariants

1. After D1-D8 + this ticket, the CF-status vocabulary is consistent across `tools/`, `.claude/skills/`, and `docs/`.
2. `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` contain no CF-status or rule-numbering claim contradicted by the amended `docs/FOUNDATIONS.md`.

## Test Plan

### New/Modified Tests

1. `None — integration-capstone + cross-cutting-docs ticket; verification is test-lane runs + grep-proofs against the post-implementation tree. Test surface is owned by D1 (record_schema_compliance fixtures) and D6 (story-page.schema.json + state-snapshot-replay.test.ts).`

### Commands

1. `cd tools/validators && npm test`
2. `cd tools/world-index && npm run build && npm test`
3. `rg -n 'mystery_reserve' tools .claude/skills docs specs`
4. `rg -n -U 'required_world_updates(.|\n){0,240}(INSTITUTIONS\.md|ECONOMY_AND_RESOURCES\.md|EVERYDAY_LIFE\.md|TIMELINE\.md)|(?:INSTITUTIONS\.md|ECONOMY_AND_RESOURCES\.md|EVERYDAY_LIFE\.md|TIMELINE\.md)(.|\n){0,240}required_world_updates' docs .claude/skills`

## Outcome

Completed. `docs/WORKFLOWS.md` now states that canon-addition Test 13 is not a FOUNDATIONS Rule 13 and names the current CF status enum (`hard_canon`, `derived_canon`, `soft_canon`, `contested_canon`) with Mystery Reserve as a separate `M-<integer>` record class. `docs/MACHINE-FACING-LAYER.md` now names the mechanized validator selectors as Rules 1-7, 11, and 12; records that Rules 8, 9, 10, and 13 are not selectors; and documents the current CF status enum at the `get_record_schema` discovery surface.

## Verification Result

1. `cd tools/validators && npm test` — PASS; build completed and 217 tests passed.
2. `cd tools/world-index && npm run build && npm test` — PASS; build completed and 84 tests passed.
3. `rg -n 'mystery_reserve' tools .claude/skills docs specs` — PASS by classification; remaining hits are legitimate Mystery Reserve record-class, validator, vocabulary, context-packet, historical-spec, or ticket-evidence references, not current CF `status` enum residue.
4. `rg -n -U 'required_world_updates(.|\n){0,240}(INSTITUTIONS\.md|ECONOMY_AND_RESOURCES\.md|EVERYDAY_LIFE\.md|TIMELINE\.md)|(?:INSTITUTIONS\.md|ECONOMY_AND_RESOURCES\.md|EVERYDAY_LIFE\.md|TIMELINE\.md)(.|\n){0,240}required_world_updates' docs .claude/skills` — PASS; no current CF `required_world_updates` retired-filename residue was found.
5. `rg -n 'FOUNDATIONS Rule 13|Rule 13|Test 13|Rules 1 through 7|Rules 1-7|status values are|CF status enum|current CF status enum|mystery_reserve.*CF status|CF status.*mystery_reserve' docs/WORKFLOWS.md docs/MACHINE-FACING-LAYER.md` — PASS by manual review; the remaining hits are the intended current statements in the reconciled docs.

## Deviations

1. The drafted `cd tools/validators && npm test && cd ../world-index && npm test` command was corrected because `tools/world-index` tests consume compiled `dist/` output and its `npm test` script does not build. The final proof runs `npm run build` before `npm test` in `tools/world-index`.
2. The drafted stale-vocabulary proof expected broad zero-ish grep results, but the live repo legitimately contains many `mystery_reserve` references for Mystery Reserve records, validators, context-packet priorities, and historical spec/ticket evidence. Verification used classification plus narrower current-contract sweeps instead of deleting legitimate record-class vocabulary.
