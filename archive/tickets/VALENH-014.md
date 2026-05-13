# VALENH-014: branch_prefix_scoped SLTs get a load-bearing greenfield prefix field

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json`, `tools/validators/src/structural/recursive-reference-closure.ts`, paired tests under `tools/validators/tests/structural/`, and the shared story-state contract.
**Deps**: `archive/tickets/VALENH-012.md`

## Problem

At intake, VALENH-012 had corrected `recursive_reference_closure` to read SLT visibility from the greenfield schema's `scope.visibility` field and to reject legacy top-level `visibility.scope`. During that fix, the validator had to fail closed for null-created `branch_prefix_scoped` storylets: the greenfield SLT schema exposed `scope.branch_id`, but it had no load-bearing ordered page-prefix field that could prove whether a null-created storylet was visible from a page's `branch_path`.

Before this ticket, the shared story-state contract still listed `branch_prefix_scoped` as a valid SLT visibility value at `.claude/skills/_shared-templates/story-state-contract.md` §4.4, and `tools/validators/src/schemas/story-storylet.schema.json` still allowed the enum without a canonical prefix field. That made `branch_prefix_scoped` a valid authoring value that could not pass `recursive_reference_closure` when `created_at_page: null`. The validator stayed safe, but the schema/contract surface was incomplete.

## Assumption Reassessment (2026-05-13)

1. At intake, `archive/tickets/VALENH-012.md` completed the legacy-to-greenfield visibility migration and recorded the remaining gap: null-created `branch_prefix_scoped` storylets failed closed because no ordered page-prefix field existed.
2. At intake, `tools/validators/src/schemas/story-storylet.schema.json` defined `scope.visibility` as `global_author_pool | branch_prefix_scoped | branch_scoped` and `scope.branch_id` as `BR-NNNN | null`, with `additionalProperties: false` under `scope`; no nested prefix field was allowed.
3. Shared boundary under audit: the SLT `scope` object across `.claude/skills/_shared-templates/story-state-contract.md`, `tools/validators/src/schemas/story-storylet.schema.json`, `record_schema_compliance`, and `recursive_reference_closure`.
4. FOUNDATIONS principle restated: §Story Bundles §5b requires every story-bundle record field to be load-bearing. If `branch_prefix_scoped` remains in the enum, its visibility predicate needs a load-bearing field and validator behavior that can prove the branch-prefix invariant.
5. HARD-GATE / Mystery Reserve firewall not weakened: this ticket only defines storylet visibility and branch isolation for story-bundle validation. It must not relax `mystery_policy.forbidden_resolutions` or world-canon mutation gates.
6. Adjacent active ticket check: `tickets/VALENH-013.md` owns pre-apply in-plan visibility for `storylet_predicate_dsl_parsability`; it does not own SLT `scope` schema shape or `recursive_reference_closure` branch-prefix semantics.
7. Implementation reassessment: `tools/validators/package.json` confirms the truthful package proof lane is package-local `npm run build`, compiled `node --test dist/tests/...`, and `npm test`. `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts before verification.
8. Stale-anchor classification: legacy top-level `visibility.visible_branch_path_prefix` remains only in old fixture files (`tools/validators/tests/fixtures/patch-plan-complete-slt.json`, `tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json`, and `tools/validators/tests/fixtures/story-storylet-complete.yaml`) that are unused or legacy rejection witnesses in the current compiled proof. Current-contract code, shared contract prose, schema tests, and recursive-closure positive fixtures use `scope.visible_branch_path_prefix`.

## Architecture Check

1. The clean path is to add a schema-canonical nested prefix field, such as `scope.visible_branch_path_prefix: [PG-NNNN, ...]`, required only for `branch_prefix_scoped` and forbidden/absent for other visibility modes. This preserves one source of truth under `scope` and avoids reviving legacy top-level `visibility`.
2. No backwards-compatibility aliasing/shims introduced. Do not accept the old top-level `visibility.visible_branch_path_prefix` field; only the greenfield nested `scope` shape may become current contract.

## Verification Layers

1. SLT schema shape -> schema validation tests proving `branch_prefix_scoped` requires a canonical nested prefix and rejects legacy top-level prefix fields.
2. Recursive branch-prefix behavior -> `recursive_reference_closure` unit tests proving null-created `branch_prefix_scoped` storylets pass when the prefix is an ordered prefix of the page `branch_path` and fail for sibling/malformed prefixes.
3. Shared contract alignment -> grep/manual review of `.claude/skills/_shared-templates/story-state-contract.md` and `docs/FOUNDATIONS.md` story-scope references so the contract and schema describe the same field.
4. HARD-GATE alignment -> manual review that the validator remains fail-closed for absent or malformed prefix data and does not touch Mystery Reserve enforcement.

## Landed Changes

### 1. Define canonical nested prefix field

Updated `.claude/skills/_shared-templates/story-state-contract.md` §4.4 and `tools/validators/src/schemas/story-storylet.schema.json` so `branch_prefix_scoped` has a load-bearing ordered page-prefix field under `scope`.

Accepted shape:

- `scope.visibility: branch_prefix_scoped`
- `scope.branch_id: BR-NNNN`
- `scope.visible_branch_path_prefix: [PG-NNNN, ...]`
- `created_at_page: null`

The schema requires `scope.visible_branch_path_prefix` for `branch_prefix_scoped`, forbids it for `global_author_pool` and `branch_scoped`, keeps the `scope` object closed, and does not reintroduce any top-level `visibility` object.

### 2. Restore branch-prefix validation on the greenfield shape

Updated `tools/validators/src/structural/recursive-reference-closure.ts` so null-created `branch_prefix_scoped` storylets are accepted only when the canonical nested prefix is a non-empty ordered prefix of the created page's `branch_path`.

Malformed, missing, empty, or sibling prefixes emit `recursive_reference_closure.branch_leak`.

### 3. Add focused tests

Updated the focused recursive-reference tests and schema-compliance tests to cover the new current-contract shape, malformed prefix behavior, and legacy top-level prefix rejection.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)

## Out of Scope

- Re-emitting existing story bundles or changing already-shipped red-bunny SLT records.
- Reintroducing legacy top-level `visibility` or top-level `visible_branch_path_prefix`.
- Changing `storylet_predicate_dsl_parsability` in-plan reference behavior; that is owned by `tickets/VALENH-013.md`.
- Changing Mystery Reserve validation or world-canon HARD-GATE behavior.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/record-schema-compliance.test.js`
3. `cd tools/validators && npm test`
4. Stale-anchor proof confirms no current-contract code or positive fixtures use top-level `visibility.visible_branch_path_prefix`.

### Invariants

1. `branch_prefix_scoped` visibility has exactly one greenfield source of truth under `scope`.
2. `recursive_reference_closure` remains fail-closed for absent, malformed, empty, or sibling branch-prefix data.
3. `global_author_pool` and `branch_scoped` behavior from VALENH-012 remains unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — add greenfield `branch_prefix_scoped` pass/fail cases.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` — add schema acceptance/rejection coverage for the canonical nested prefix field and legacy top-level field rejection.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/record-schema-compliance.test.js`
3. `cd tools/validators && npm test`
4. `rg -n 'visibility:\\s*\\{|visible_branch_path_prefix' tools/validators/src tools/validators/tests .claude/skills/_shared-templates/story-state-contract.md docs/FOUNDATIONS.md` — classify remaining hits as current nested-scope guidance, intentional legacy rejection fixtures, or stale current-contract drift.

## Outcome

Completion date: 2026-05-13.

Implemented the greenfield `scope.visible_branch_path_prefix` contract for `branch_prefix_scoped` storylets. The shared story-state contract and SLT JSON Schema now name the nested prefix as the only current source of truth, and the schema requires it only for `branch_prefix_scoped` while forbidding it for `global_author_pool` and `branch_scoped`.

`recursive_reference_closure` now accepts null-created `branch_prefix_scoped` storylets when the nested prefix is a non-empty ordered prefix of the created page's `branch_path`. Missing, empty, malformed, or sibling prefixes still fail closed with `recursive_reference_closure.branch_leak`.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/record-schema-compliance.test.js` — passed, 42/42 focused tests.
3. `cd tools/validators && npm test` — passed, 180/180 tests.
4. `rg -n 'visibility:\\s*\\{|visible_branch_path_prefix|branch_prefix_scoped|No greenfield prefix field|without a canonical prefix field|fail closed because no ordered page-prefix|fail closed because no load-bearing prefix|scope\\.visible_branch_path_prefix|scope.visibility|created_at_page: PG-NNNN \\| null' tools/validators/src tools/validators/tests .claude/skills/_shared-templates/story-state-contract.md docs/FOUNDATIONS.md archive/tickets/VALENH-014.md` — reviewed, and rerun during archive review after the ticket moved. Remaining current-contract hits are the nested `scope.visible_branch_path_prefix` schema, validator, shared-contract row, and focused tests; remaining legacy top-level fixture hits are classified in Assumption Reassessment item 8.
5. Manual HARD-GATE / FOUNDATIONS review — `docs/HARD-GATE-DISCIPLINE.md` and `docs/FOUNDATIONS.md` §Story Bundles §5b were reread. This ticket changes story-bundle validation only; it does not relax Mystery Reserve enforcement, approval-token behavior, or world-canon mutation gates.

## Deviations

- The first focused compiled test run failed during AJV strict schema compilation because the conditional `then.required` branch did not locally declare `visible_branch_path_prefix`. The schema branch was corrected and the build, focused compiled tests, and full package tests all passed afterward.
- Legacy top-level `visibility.visible_branch_path_prefix` fixture hits remain in old fixture files named in Assumption Reassessment item 8. They are not current-contract positive proof surfaces for this ticket.
