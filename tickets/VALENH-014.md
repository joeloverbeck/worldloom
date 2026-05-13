# VALENH-014: branch_prefix_scoped SLTs get a load-bearing greenfield prefix field

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json`, `tools/validators/src/structural/recursive-reference-closure.ts`, paired tests under `tools/validators/tests/structural/`, and the shared story-state contract.
**Deps**: `archive/tickets/VALENH-012.md`

## Problem

VALENH-012 corrected `recursive_reference_closure` to read SLT visibility from the greenfield schema's `scope.visibility` field and to reject legacy top-level `visibility.scope`. During that fix, the validator had to fail closed for null-created `branch_prefix_scoped` storylets: the greenfield SLT schema exposes `scope.branch_id`, but it has no load-bearing ordered page-prefix field that can prove whether a null-created storylet is visible from a page's `branch_path`.

The shared story-state contract still lists `branch_prefix_scoped` as a valid SLT visibility value at `.claude/skills/_shared-templates/story-state-contract.md` §4.4, and `tools/validators/src/schemas/story-storylet.schema.json` still allows the enum. Without a canonical prefix field, `branch_prefix_scoped` is a valid authoring value that cannot pass `recursive_reference_closure` when `created_at_page: null`. That keeps the validator safe, but leaves the schema/contract surface incomplete.

## Assumption Reassessment (2026-05-13)

1. `archive/tickets/VALENH-012.md` completed the legacy-to-greenfield visibility migration and records the remaining gap: null-created `branch_prefix_scoped` storylets fail closed because no ordered page-prefix field exists.
2. `tools/validators/src/schemas/story-storylet.schema.json` defines `scope.visibility` as `global_author_pool | branch_prefix_scoped | branch_scoped` and `scope.branch_id` as `BR-NNNN | null`, with `additionalProperties: false` under `scope`; no nested prefix field is currently allowed.
3. Shared boundary under audit: the SLT `scope` object across `.claude/skills/_shared-templates/story-state-contract.md`, `tools/validators/src/schemas/story-storylet.schema.json`, `record_schema_compliance`, and `recursive_reference_closure`.
4. FOUNDATIONS principle restated: §Story Bundles §5b requires every story-bundle record field to be load-bearing. If `branch_prefix_scoped` remains in the enum, its visibility predicate needs a load-bearing field and validator behavior that can prove the branch-prefix invariant.
5. HARD-GATE / Mystery Reserve firewall not weakened: this ticket only defines storylet visibility and branch isolation for story-bundle validation. It must not relax `mystery_policy.forbidden_resolutions` or world-canon mutation gates.
6. Adjacent active ticket check: `tickets/VALENH-013.md` owns pre-apply in-plan visibility for `storylet_predicate_dsl_parsability`; it does not own SLT `scope` schema shape or `recursive_reference_closure` branch-prefix semantics.

## Architecture Check

1. The clean path is to add a schema-canonical nested prefix field, such as `scope.visible_branch_path_prefix: [PG-NNNN, ...]`, required only for `branch_prefix_scoped` and forbidden/absent for other visibility modes. This preserves one source of truth under `scope` and avoids reviving legacy top-level `visibility`.
2. No backwards-compatibility aliasing/shims introduced. Do not accept the old top-level `visibility.visible_branch_path_prefix` field; only the greenfield nested `scope` shape may become current contract.

## Verification Layers

1. SLT schema shape -> schema validation tests proving `branch_prefix_scoped` requires a canonical nested prefix and rejects legacy top-level prefix fields.
2. Recursive branch-prefix behavior -> `recursive_reference_closure` unit tests proving null-created `branch_prefix_scoped` storylets pass when the prefix is an ordered prefix of the page `branch_path` and fail for sibling/malformed prefixes.
3. Shared contract alignment -> grep/manual review of `.claude/skills/_shared-templates/story-state-contract.md` and `docs/FOUNDATIONS.md` story-scope references so the contract and schema describe the same field.
4. HARD-GATE alignment -> manual review that the validator remains fail-closed for absent or malformed prefix data and does not touch Mystery Reserve enforcement.

## What to Change

### 1. Define canonical nested prefix field

Update `.claude/skills/_shared-templates/story-state-contract.md` §4.4 and `tools/validators/src/schemas/story-storylet.schema.json` so `branch_prefix_scoped` has a load-bearing ordered page-prefix field under `scope`.

Acceptance shape to reassess before coding:

- `scope.visibility: branch_prefix_scoped`
- `scope.branch_id: BR-NNNN`
- `scope.visible_branch_path_prefix: [PG-NNNN, ...]`
- `created_at_page: null`

The implementation may choose a different exact field name only if reassessment proves the live contract already has a better canonical carrier. Do not use a top-level `visibility` object.

### 2. Restore branch-prefix validation on the greenfield shape

Update `tools/validators/src/structural/recursive-reference-closure.ts` so null-created `branch_prefix_scoped` storylets are accepted only when the canonical nested prefix is a non-empty ordered prefix of the created page's `branch_path`.

Malformed, missing, empty, or sibling prefixes must emit `recursive_reference_closure.branch_leak`.

### 3. Add focused tests

Update the focused recursive-reference tests and schema-compliance tests to cover the new current-contract shape and legacy rejection behavior.

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
