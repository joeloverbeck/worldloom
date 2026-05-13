# VALENH-012: recursive_reference_closure reads greenfield scope.visibility, not legacy parsed.visibility.scope

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts`; paired tests under `tools/validators/tests/structural/`.
**Deps**: `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md`, `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md`

## Problem

The `recursive_reference_closure` validator reads `parsed.visibility.scope` (legacy top-level field on SLT records) to decide whether a storylet with `created_at_page: null` is a legitimate global author-pool block reachable from any page's branch_path. The greenfield SLT schema at `tools/validators/src/schemas/story-storylet.schema.json` canonicalizes the visibility into a nested `scope.visibility` field with `additionalProperties: false` at the SLT root — so adding a sibling top-level `visibility` field as a legacy alias is rejected by the JSON-schema layer, while NOT adding it makes every global-author-pool SLT with `created_at_page: null` fail the branch-leak check.

The branching-story-bootstrap session of 2026-05-13 hit this directly: 342 of 390 initial validation failures on the red-bunny patch envelope were `recursive_reference_closure.branch_leak` for the 10 seed SLT records the bundle ships with `scope.visibility: global_author_pool` + `created_at_page: null` (per shared contract `.claude/skills/_shared-templates/story-state-contract.md` §4.4). The operator worked around by setting `created_at_page: PG-0001` on every seed SLT — placing the seed SLT's "creation page" into PG-0001's branch_path — and shipped the bundle. The shared contract explicitly says `created_at_page: PG-NNNN | null # null only for global_author_pool`; the working-around bundle violates the "only" clause to satisfy the validator.

The validator must read the canonical schema's `scope.visibility` (and `scope.visible_branch_path_prefix` etc.) rather than the legacy `visibility.scope` top-level field. VALENH-006 fixed PG branch-path handling but explicitly stayed away from the SLT visibility-field-name issue ("Implemented direct PG branch-path authorization in `recursive_reference_closure`: page targets are allowed when their PG id is in the new page's `branch_path`, independent of whether the page record carries `created_at_page`") — so the legacy SLT visibility read survives at HEAD.

## Assumption Reassessment (2026-05-13)

1. Current validator state (HEAD): `tools/validators/src/structural/recursive-reference-closure.ts:204-205` reads `const visibility = asPlainRecord(parsed.visibility); const scope = stringValue(visibility.scope);`. Verified by grep: `grep -nE "parsed\.visibility|visibility\.scope" tools/validators/src/structural/recursive-reference-closure.ts`. Line 210 also reads `visibility.visible_branch_path_prefix` for the `branch_prefix_scoped` case.
2. Current schema state (HEAD): `tools/validators/src/schemas/story-storylet.schema.json` defines `scope` as a required nested object with `visibility` (enum: global_author_pool | branch_prefix_scoped | branch_scoped) and `branch_id` (nullable BR-ref); top-level `additionalProperties: false` rejects sibling `visibility` field. Test fixture at `tools/validators/tests/fixtures/story-storylet-complete.yaml` uses the legacy `visibility: { scope: ... }` top-level form, indicating the fixture predates the greenfield schema change and is itself stale (worth flagging in a follow-up, but not this ticket's fix).
3. Shared boundary under audit: the SLT record schema as the contract between (a) the validator framework (which decides branch-leak compliance), (b) the JSON schema layer (which decides record acceptance at submit time), and (c) the shared story-state contract document the story-pipeline skills inline by reference. All three must agree on `scope.visibility` being the canonical location; the validator is the lone outlier.
4. FOUNDATIONS principle restated: §Story Bundles §5b ("Schema-Minimalism At Story Scope") commits that "every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline." The greenfield schema's `scope.visibility` IS the load-bearing field for the global-pool eligibility decision; the validator's legacy `visibility.scope` read is a stale-implementation drift that loses the schema-minimalism guarantee for callers who follow the greenfield schema.
5. HARD-GATE / Mystery Reserve firewall not weakened: this ticket changes WHERE the validator reads the visibility scope from, not WHAT it allows. The `global_author_pool` + `branch_prefix_scoped` semantics remain unchanged; the `mystery_policy.forbidden_resolutions` enforcement at gate 3 is independent of this validator and is not touched.
6. Adjacent contradiction surfaced during reassessment: the test fixture `tools/validators/tests/fixtures/story-storylet-complete.yaml` uses many legacy fields not present in the greenfield SLT schema (`arc_contract`, `dramatic_unit`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`, `mystery_safety`, etc.). The fixture is a separate cleanup that should not block this ticket; the validator change here uses the same `scope.visibility` reading whether the fixture is updated or not. Classification: future cleanup; file as a follow-up VALENH ticket if/when the test fixture's drift becomes load-bearing.

## Architecture Check

1. Cleaner than alternatives: (a) Validator reads canonical schema location → single source of truth; (b) accepting both fields with a precedence rule would re-introduce the legacy form as a permanent dual-source-of-truth surface, violating FOUNDATIONS §Story Bundles §5b; (c) changing the schema to canonicalize at top-level `visibility` would force every greenfield-conformant record (existing red-bunny SLTs, etc.) to migrate, which is more disruptive than fixing the validator.
2. No backwards-compatibility aliasing/shim: the legacy `parsed.visibility.scope` read is removed entirely; the validator reads `parsed.scope.visibility` and `parsed.scope.visible_branch_path_prefix` (if such field is added; see §What to Change below for what to do absent that field in the current schema).

## Verification Layers

1. Global-author-pool SLT with `created_at_page: null` and `scope.visibility: global_author_pool` is recognized as a legitimate cross-page reference → unit test in `tools/validators/tests/structural/recursive-reference-closure.test.ts`.
2. Branch-prefix-scoped SLT with `created_at_page: null` is handled correctly when the page's branch_path is a valid prefix → unit test (current logic reads `visibility.visible_branch_path_prefix`; if greenfield SLT schema has no such field, the test asserts the branch_prefix_scoped path is either correctly resolved from `scope.branch_id` + parent-branch lookup, or this leg's behavior is deferred with a clear explanation).
3. End-to-end bootstrap dry-run with `created_at_page: null` seed SLTs validates clean → red-bunny bundle re-validation after SLT records are re-emitted with the schema-canonical null `created_at_page`.
4. FOUNDATIONS §Story Bundles §5b alignment: no nice-to-have legacy fields introduced; validator reads exactly the schema-canonical paths.

## What to Change

### 1. Validator: read scope.visibility, not visibility.scope

In `tools/validators/src/structural/recursive-reference-closure.ts`, around lines 200-213 (the `isAllowedReference` function's `createdAtPage === null` branch):

- Replace `const visibility = asPlainRecord(parsed.visibility); const scope = stringValue(visibility.scope);` with reads against `parsed.scope` instead: `const scope = asPlainRecord(parsed.scope); const visibility = stringValue(scope.visibility);`.
- Note the local-variable name swap — the greenfield schema names the nested object `scope` and the enum value `visibility`; the legacy code had them inverted.
- For the `branch_prefix_scoped` branch (line 209-211): determine the correct field name in the greenfield schema. The current shared contract §4.4 schema does NOT include a `visible_branch_path_prefix` field on `scope`; if a branch-prefix-scoped SLT's allowed-prefix is derived from `scope.branch_id`'s parent-branch lookup instead, document that derivation in a code comment and emit a TODO for a follow-up if no derivation surface exists yet. (Alternative: the branch_prefix_scoped value may be effectively unused in greenfield; if so, route the branch to a "branch_prefix_scoped not yet supported in greenfield schema; treat as branch_scoped for safety" comment and let the existing branch_scoped fallthrough cover it.)

### 2. Tests for the greenfield SLT visibility shape

Add a test (or update existing tests) under `tools/validators/tests/structural/recursive-reference-closure.test.ts` that:

- Builds a patch plan with a `create_pg_record` and a `create_slt_record` whose record body matches the greenfield SLT schema exactly: `scope: { visibility: 'global_author_pool', branch_id: null }`, `created_at_page: null`, no top-level `visibility` field.
- Asserts the validator returns ZERO `recursive_reference_closure.branch_leak` verdicts for the global-author-pool SLT being referenced from the new page's storylet pool.
- Existing tests using the legacy top-level `visibility: { scope: ... }` form should be updated to use the greenfield schema form (this updates the fixture story-storylet-complete.yaml mentioned in Assumption Reassessment item 6 as a side cleanup if landed together; otherwise file as VALENH follow-up).

### 3. Code comment crediting the migration

Add a short comment near the changed lines explaining the greenfield-schema canonical location and citing this ticket for audit-trail purposes (per Rule 6 No Silent Retcons — the session evidence at red-bunny bootstrap IS the retcon justification).

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` (modify — update to greenfield SLT schema form; optional in scope, but the same logical change)

## Out of Scope

- Re-emitting the already-committed `red-bunny` bundle's seed SLT records to use `created_at_page: null` (the bundle remains as-shipped; future bundles emit cleanly under the fixed validator).
- Removing the legacy `arc_contract`, `dramatic_unit`, etc., from the test fixture (separate cleanup; this ticket touches only the visibility-field-name read).
- Adding a `visible_branch_path_prefix` field to the greenfield SLT schema (if branch_prefix_scoped semantics are needed, that's a separate schema-extension ticket).
- Skill-prose update to clarify the shared contract's `created_at_page: null` discipline now actually works post-fix (route via `/skill-audit` after this lands).

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: validator emits zero `branch_leak` verdicts for a greenfield-schema SLT with `scope.visibility: global_author_pool` + `created_at_page: null` referenced by a same-plan PG record.
2. New unit test: validator continues to emit `branch_leak` for an SLT with `scope.visibility: branch_scoped` + `created_at_page: <pg not in branch_path>`.
3. Existing tests under `tools/validators/tests/structural/recursive-reference-closure.test.ts` continue to pass after legacy fixture forms are migrated to the greenfield schema (or remain green if the fixtures are deferred to a follow-up).
4. End-to-end: a fresh `branching-story-bootstrap` invocation emitting seed SLTs with `created_at_page: null` (per shared contract) validates clean with zero branch_leak verdicts.

### Invariants

1. The validator reads visibility-scope information from the schema-canonical `scope.visibility` location ONLY; no fallback to legacy `visibility.scope` top-level field.
2. The greenfield SLT JSON schema's `additionalProperties: false` at root remains enforced — the validator no longer relies on extra fields that the schema rejects.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — add greenfield-schema SLT global-pool test case; update existing legacy-form fixtures.
2. `tools/validators/tests/fixtures/story-storylet-complete.yaml` — update to greenfield-schema field set (or split as follow-up).

### Commands

1. Targeted: `cd tools/validators && pnpm test -- recursive-reference-closure`
2. Full-package: `cd tools/validators && pnpm test`
3. End-to-end: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <fresh-bootstrap-envelope.json>` and verify zero `recursive_reference_closure.branch_leak` failures.
