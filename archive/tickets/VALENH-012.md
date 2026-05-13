# VALENH-012: recursive_reference_closure reads greenfield scope.visibility, not legacy parsed.visibility.scope

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts`; paired tests under `tools/validators/tests/structural/`.
**Deps**: `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md`, `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md`

## Problem

At intake, the `recursive_reference_closure` validator read `parsed.visibility.scope` (legacy top-level field on SLT records) to decide whether a storylet with `created_at_page: null` was a legitimate global author-pool block reachable from any page's branch_path. The greenfield SLT schema at `tools/validators/src/schemas/story-storylet.schema.json` canonicalizes the visibility into a nested `scope.visibility` field with `additionalProperties: false` at the SLT root — so adding a sibling top-level `visibility` field as a legacy alias is rejected by the JSON-schema layer, while NOT adding it made every global-author-pool SLT with `created_at_page: null` fail the branch-leak check.

The branching-story-bootstrap session of 2026-05-13 hit this directly: 342 of 390 initial validation failures on the red-bunny patch envelope were `recursive_reference_closure.branch_leak` for the 10 seed SLT records the bundle ships with `scope.visibility: global_author_pool` + `created_at_page: null` (per shared contract `.claude/skills/_shared-templates/story-state-contract.md` §4.4). The operator worked around by setting `created_at_page: PG-1` on every seed SLT — placing the seed SLT's "creation page" into PG-1's branch_path — and shipped the bundle. The shared contract explicitly says `created_at_page: PG-NNNN | null # null only for global_author_pool`; the working-around bundle violated the "only" clause to satisfy the validator.

The validator now reads the canonical schema's `scope.visibility` rather than the legacy `visibility.scope` top-level field. VALENH-006 fixed PG branch-path handling but explicitly stayed away from the SLT visibility-field-name issue ("Implemented direct PG branch-path authorization in `recursive_reference_closure`: page targets are allowed when their PG id is in the new page's `branch_path`, independent of whether the page record carries `created_at_page`"), so this ticket completed the remaining SLT visibility-field correction.

## Assumption Reassessment (2026-05-13)

1. Intake validator state: `tools/validators/src/structural/recursive-reference-closure.ts` read `const visibility = asPlainRecord(parsed.visibility); const scope = stringValue(visibility.scope);`. The same branch also read `visibility.visible_branch_path_prefix` for the `branch_prefix_scoped` case. Final stale-anchor proof confirms those reads are gone.
2. Current schema state (HEAD): `tools/validators/src/schemas/story-storylet.schema.json` defines `scope` as a required nested object with `visibility` (enum: global_author_pool | branch_prefix_scoped | branch_scoped) and `branch_id` (nullable BR-ref); top-level `additionalProperties: false` rejects sibling `visibility` field. Test fixture at `tools/validators/tests/fixtures/story-storylet-complete.yaml` intentionally remains a legacy rejection fixture in `tools/validators/tests/structural/record-schema-compliance-arc.test.ts`, so this ticket does not migrate that fixture.
3. Shared boundary under audit: the SLT record schema as the contract between (a) the validator framework (which decides branch-leak compliance), (b) the JSON schema layer (which decides record acceptance at submit time), and (c) the shared story-state contract document the story-pipeline skills inline by reference. All three must agree on `scope.visibility` being the canonical location; the validator is the lone outlier.
4. FOUNDATIONS principle restated: §Story Bundles §5b ("Schema-Minimalism At Story Scope") commits that "every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline." The greenfield schema's `scope.visibility` IS the load-bearing field for the global-pool eligibility decision; the validator's legacy `visibility.scope` read is a stale-implementation drift that loses the schema-minimalism guarantee for callers who follow the greenfield schema.
5. HARD-GATE / Mystery Reserve firewall not weakened: this ticket changes WHERE the validator reads the visibility scope from, not WHAT it allows for schema-valid global author-pool records. The `mystery_policy.forbidden_resolutions` enforcement at gate 3 is independent of this validator and is not touched.
6. Adjacent contradiction surfaced during reassessment: branch-prefix-scoped storylets with `created_at_page: null` had legacy test coverage through `visibility.visible_branch_path_prefix`, but the greenfield SLT schema has no `visible_branch_path_prefix` field under `scope` and `scope.branch_id` alone is not enough to prove an ordered page-path prefix. Classification: required same-validator proof truthing; this ticket will remove the legacy prefix read and fail closed for null-created `branch_prefix_scoped` storylets until a later schema-extension ticket provides a load-bearing prefix derivation surface.
7. Adjacent non-owner: `tools/validators/tests/fixtures/story-storylet-complete.yaml` uses many legacy fields not present in the greenfield SLT schema (`arc_contract`, `dramatic_unit`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`, `mystery_safety`, etc.). It is currently a negative fixture, not a greenfield positive fixture, and remains out of scope.

## Architecture Check

1. Cleaner than alternatives: (a) Validator reads canonical schema location -> single source of truth; (b) accepting both fields with a precedence rule would re-introduce the legacy form as a permanent dual-source-of-truth surface, violating FOUNDATIONS §Story Bundles §5b; (c) changing the schema to canonicalize at top-level `visibility` would force every greenfield-conformant record (existing red-bunny SLTs, etc.) to migrate, which is more disruptive than fixing the validator.
2. No backwards-compatibility aliasing/shim: the legacy `parsed.visibility.scope` read is removed entirely; the validator reads `parsed.scope.visibility` only. For null-created storylets, `branch_prefix_scoped` remains fail-closed because the current greenfield schema has no prefix field to prove visibility.

## Verification Layers

1. Global-author-pool SLT with `created_at_page: null` and `scope.visibility: global_author_pool` is recognized as a legitimate cross-page reference → unit test in `tools/validators/tests/structural/recursive-reference-closure.test.ts`.
2. Branch-scoped SLT with `created_at_page` outside the page branch remains rejected -> unit test in `tools/validators/tests/structural/recursive-reference-closure.test.ts`.
3. Null-created `branch_prefix_scoped` SLT fails closed because no greenfield prefix field exists -> unit test in `tools/validators/tests/structural/recursive-reference-closure.test.ts`.
4. FOUNDATIONS §Story Bundles §5b alignment: no nice-to-have legacy fields introduced; validator reads exactly the schema-canonical paths.

## Landed Changes

### 1. Validator: read scope.visibility, not visibility.scope

`tools/validators/src/structural/recursive-reference-closure.ts` now reads the nested greenfield SLT schema location: `scope.visibility`. The legacy `parsed.visibility.scope` read and `visibility.visible_branch_path_prefix` allowance were removed entirely.

Null-created `global_author_pool` storylets pass. Null-created non-global storylets fail closed because the current greenfield schema has no load-bearing prefix field that can prove branch-prefix reachability.

### 2. Tests for the greenfield SLT visibility shape

`tools/validators/tests/structural/recursive-reference-closure.test.ts` now uses greenfield storylet shape in the recursive-closure fixtures: `scope: { visibility: ..., branch_id: ... }`, top-level `created_at_page`, and `provenance.origin` without legacy `provenance.created_at_page`.

The focused test suite now covers:

- global author-pool SLT with `created_at_page: null` accepted without branch leak
- null-created `branch_prefix_scoped` SLT rejected fail-closed
- null-created `branch_scoped` SLT rejected fail-closed
- sibling-page branch-scoped storylet rejection still preserved

### 3. Code comment crediting the migration

Added a short source comment identifying VALENH-012 and the canonical `scope.visibility` location.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)

## Out of Scope

- Re-emitting the already-committed `red-bunny` bundle's seed SLT records to use `created_at_page: null` (the bundle remains as-shipped; future bundles emit cleanly under the fixed validator).
- Removing or migrating the legacy `arc_contract`, `dramatic_unit`, etc., from `tools/validators/tests/fixtures/story-storylet-complete.yaml`; it remains a negative schema-compliance fixture.
- Adding a `visible_branch_path_prefix` field to the greenfield SLT schema (if branch_prefix_scoped semantics are needed, that's a separate schema-extension ticket).
- Skill-prose update to clarify the shared contract's `created_at_page: null` discipline now actually works post-fix (route via `/skill-audit` after this lands).

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: validator emits zero `branch_leak` verdicts for a greenfield-schema SLT with `scope.visibility: global_author_pool` + `created_at_page: null` referenced by a same-plan PG record.
2. New unit test: validator continues to emit `branch_leak` for an SLT with `scope.visibility: branch_scoped` + `created_at_page: <pg not in branch_path>`.
3. Existing tests under `tools/validators/tests/structural/recursive-reference-closure.test.ts` continue to pass after legacy storylet forms in that file are migrated to the greenfield schema.
4. Unit test: null-created `branch_prefix_scoped` storylets fail closed while the greenfield schema has no load-bearing prefix field.

### Invariants

1. The validator reads visibility-scope information from the schema-canonical `scope.visibility` location ONLY; no fallback to legacy `visibility.scope` top-level field.
2. The greenfield SLT JSON schema's `additionalProperties: false` at root remains enforced — the validator no longer relies on extra fields that the schema rejects.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — add greenfield-schema SLT global-pool test case; update existing legacy-form fixtures.
2. No fixture file migration — legacy schema-compliance fixtures remain negative witnesses outside this ticket.

### Commands

1. Targeted build: `cd tools/validators && npm run build`
2. Targeted compiled test: `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js`
3. Full-package: `cd tools/validators && npm test`
4. Stale-anchor proof: no `parsed.visibility`, `visibility.scope`, or `visible_branch_path_prefix` dependency remains in `tools/validators/src/structural/recursive-reference-closure.ts`.

## Outcome

Completion date: 2026-05-13.

Implemented the schema-canonical SLT visibility read in `recursive_reference_closure`. The validator now allows null-created storylets only when `scope.visibility === "global_author_pool"` and no longer depends on top-level `visibility.scope` or `visible_branch_path_prefix` fields rejected by the greenfield SLT schema.

The focused recursive-closure tests were migrated to greenfield SLT shape. Legacy schema-compliance fixtures remain unchanged because they are negative witnesses for retired storylet fields.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js` — passed, 18/18 tests.
3. `cd tools/validators && npm test` — passed, 176/176 tests.
4. `rg -n 'parsed\\.visibility|visibility\\.scope|visible_branch_path_prefix|visibility: \\{|scope: "' tools/validators/src/structural/recursive-reference-closure.ts tools/validators/tests/structural/recursive-reference-closure.test.ts` — no matches, confirming the owned validator/test seam no longer depends on the legacy top-level visibility shape.

## Deviations

- The drafted end-to-end fresh `branching-story-bootstrap` rerun was replaced with package-local build, focused compiled structural tests, full validators package tests, and stale-anchor proof. This ticket owns the validator behavior, not re-emission of an already-shipped story bundle.
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` was left unchanged because live tests use it as a legacy rejection fixture, not as a current-contract positive storylet fixture.
- Null-created `branch_prefix_scoped` storylets now fail closed. The current greenfield schema exposes `scope.branch_id` but no ordered page-prefix field, so accepting them would require a separate schema-extension/derivation ticket.
