# VALENH-007: Recursive reference closure — branch_prefix_scoped storylets must honor visible_branch_path_prefix as branch anchor

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts` (modify), `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — add branch_prefix_scoped fixtures).
**Deps**: `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md` (the validator this ticket patches), `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md` (the prior page_record special-case), `archive/tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md` (the storylet-pool-authoring contract this ticket aligns the validator with)

## Problem

At intake, `recursive_reference_closure` (landed in VALENH-004, extended for page_record handling in VALENH-006) rejected every `branch_prefix_scoped` storylet that carried `provenance.created_at_page: null` as a `branch_leak`, regardless of whether the storylet's `visibility.visible_branch_path_prefix` was a prefix of the new page's `branch_path`. This contradicted storylet-pool-authoring's intentional contract, where `branch_prefix_scoped` storylets are AUTHORED with null `created_at_page` and use `visible_branch_path_prefix` as their branch-anchor signal (see `archive/tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md` line 3: *"`branch_prefix_scoped` requires the RSP `visible_branch_path_prefix`; `branch_scoped` requires the same prefix plus a leaf page used for `provenance.created_at_page`"*).

At intake, the relevant `isAllowedReference` branch in `tools/validators/src/structural/recursive-reference-closure.ts` read:

```typescript
if (createdAtPage === null) {
  return target.node_type === "storylet_record" && asPlainRecord(parsed.visibility).scope === "global_author_pool";
}
```

The `branch_prefix_scoped` case was unhandled — the only allowed null-`created_at_page` pathway was `global_author_pool`. Historical intake evidence: a session on 2026-05-06 (page-cycle invocation `--world_slug erotica-world --story_slug red-bunny --parent_page_id PG-5 --chosen_choice_id CHC-22`) hit the validator on its first envelope submission with four `branch_leak` verdicts against four different SLB-0003 candidates the page-cycle's Phase 4 storylet selection had legitimately top-ranked (SLT-49, SLT-54, SLT-58, SLT-59 — all `branch_prefix_scoped` to `[PG-1..PG-5]` with `created_at_page: null`). The page's `branch_path` was `[PG-1..PG-6]`, which was a strict extension of the storylets' visible prefix, so every one of them was a structurally valid selection per the storylet-pool-authoring contract — but the validator rejected all four. The 24-storylet SLB-0003 batch (per `worlds/erotica-world/stories/red-bunny/INDEX.md` storylet-pool block: *"All 24 visibility=`branch_prefix_scoped` to [PG-1..PG-5] (OBL-20 is PG-5-created and has no bootstrap precursor — `global_author_pool` would violate gate-8 branch-contamination)"*) was structurally unselectable until this validator gap was closed.

## Assumption Reassessment (2026-05-06)

1. `tools/validators/src/structural/recursive-reference-closure.ts` defines `isAllowedReference`. At reassessment, the null-`created_at_page` branch required `visibility.scope === "global_author_pool"` literally; there was no fallback path for `branch_prefix_scoped`. The run loop derived `branchPath` directly from `stringArray(parsed.branch_path)` before constructing the `Set`, so the authored page order was available there. The landed implementation preserves an explicit ordered `branchPath` array and keeps the `Set` only for membership checks.
2. `archive/tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md:3` documents the storylet-pool-authoring contract: `branch_prefix_scoped` REQUIRES `visible_branch_path_prefix` and INTENTIONALLY does NOT require non-null `created_at_page`; only `branch_scoped` requires `provenance.created_at_page`. The validator's contract must align: `branch_prefix_scoped` + null `created_at_page` + `visible_branch_path_prefix ⊆ branchPath` (as ordered prefix) is structurally valid. `worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-49.yaml` through `SLT-72.yaml` are 24 live records of this exact shape; verified by `grep -l 'branch_prefix_scoped' worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-0{49..72}.yaml` returning all 24 paths.
3. The shared boundary under audit is the validator's `isAllowedReference` contract for `storylet_record` targets and the `branch_prefix_scoped` visibility-scope semantic that storylet-pool-authoring (sibling skill) emits and branching-story-page-cycle (sibling skill) consumes via Phase 4 storylet selection. Both sibling skills depend on the validator's `isAllowedReference` honoring the storylet-pool-authoring authoring contract; a validator that rejects authoring-contract-conformant records is the silent third party breaking the inter-skill contract.
4. FOUNDATIONS §Story Bundles §5 (Validation Rules At Story Scope) names Rule 4 (No Globalization by Accident) as the principle behind story-scope branch isolation — *"Global author-pool storylets must not reference branch-local record IDs whose `created_at_page` is non-null"*. The principle's intent is to prevent a sibling-branch leak: a storylet-record reachable from page X must be either (a) globally authored with no branch-local dependency, or (b) authored on a page in X's ancestry. `branch_prefix_scoped` is precisely the case where (b) is expressed via `visible_branch_path_prefix` rather than a single-page `created_at_page` — the prefix IS the storylet's branch anchor. The pre-fix validator behavior collapsed (b) into "PG-anchored only" and silently rejected the prefix-anchored sub-case, which neither honored Rule 4 nor blocked any actual branch leak.
5. Adjacent contradiction classification — the SLB-0003 batch's design rationale (*"`global_author_pool` would violate gate-8 branch-contamination"*) is a required consequence of this validator gap, not a separate bug. The storylet-pool-authoring gate-8 branch-contamination check correctly forces `branch_prefix_scoped` for storylets that reference branch-local OBL-20; the validator's failure to honor `branch_prefix_scoped` is the same-validator fallout that VALENH-006 is the structural precedent for (PG-record handling was the analogous prior gap). No skill changes, no data migration, no `_source/` rewrites are required — only the validator extension.
6. Package/proof correction — this checkout has no root `pnpm --filter @worldloom/validators` workspace lane. `tools/validators/package.json` is the live proof authority: run `npm run build`, then compiled `node --test dist/tests/structural/recursive-reference-closure.test.js`, then `npm test` from `tools/validators`. The drafted direct `tools/world-mcp/dist/src/cli/validate-patch-plan.js <test-envelope>` smoke is not required for this package-local validator patch because the focused structural test exercises the validator's branch-prefix acceptance/rejection contract directly and `npm test` covers the validators package integration lane.

## Architecture Check

1. The fix lands entirely inside `isAllowedReference`, the same function VALENH-006 extended for `page_record` handling. Architecturally this is a third allowed-reference rule — alongside (i) page records authorized by their own id in branchPath (VALENH-006), (ii) records with `created_at_page` in branchPath, (iii) storylets with `visibility.scope=global_author_pool` and null `created_at_page` (the original VALENH-004 rule) — adding (iv) storylets with `visibility.scope=branch_prefix_scoped` and null `created_at_page` whose `visible_branch_path_prefix` is an ordered prefix of branchPath. No new validator file, no helper-tier refactor, no schema migration. The fix matches VALENH-006's surgical-extension approach: special-case the legitimate authoring shape inside `isAllowedReference`, do not grow the skip-list, do not migrate authored data.
2. No backwards-compatibility shims. The pre-fix behavior silently rejected an authoring shape storylet-pool-authoring has emitted in production (SLB-0003) and will continue to emit going forward; the post-fix behavior accepts that shape iff the prefix relationship holds. There is no aliasing layer — the new branch is a direct condition added to `isAllowedReference`.

## Verification Layers

1. `branch_prefix_scoped` + null `created_at_page` + `visible_branch_path_prefix` is an ordered prefix of branchPath → reference is allowed → unit test in `tools/validators/tests/structural/recursive-reference-closure.test.ts` with explicit fixture (storylet record with `provenance.created_at_page: null`, `visibility.scope: "branch_prefix_scoped"`, `visibility.visible_branch_path_prefix: ["PG-1", "PG-2"]`; page record's `branch_path: ["PG-1", "PG-2"]`) → expected verdict `pass`.
2. `branch_prefix_scoped` + null `created_at_page` + `visible_branch_path_prefix` is NOT an ordered prefix of branchPath (sibling-branch case) → reference is rejected as `branch_leak` → unit test fixture: storylet with `visible_branch_path_prefix: ["PG-1", "PG-2"]`, page on `branch_path: ["PG-1", "PG-3"]` (sibling) → expected verdict `recursive_reference_closure.branch_leak`.
3. Regression: `global_author_pool` + null `created_at_page` continues to pass → existing fixture from VALENH-004 still passes after the change → codebase grep-proof that the original branch is preserved.
4. Regression: `page_record` PG-id-in-branchPath check (VALENH-006 invariant) continues to pass → existing PG-reference fixture still passes after the change.
5. Package integration regression → `cd tools/validators && npm test` passes after the focused branch-prefix fixtures are compiled, preserving the registered validator lane without requiring a live-world page-cycle mutation.

## Landed Changes

### 1. Extended `isAllowedReference` to handle `branch_prefix_scoped` storylets

`tools/validators/src/structural/recursive-reference-closure.ts` now keeps the authored `branch_path` as an ordered array and uses it alongside the existing membership `Set`. The null-`createdAtPage` branch in `isAllowedReference` now:

- Rejects non-storylet records with null branch anchors.
- Preserves the existing `global_author_pool` allowance.
- Allows `branch_prefix_scoped` storylets only when `visibility.visible_branch_path_prefix` is a non-empty ordered prefix of the new page's `branch_path`.
- Rejects null, non-array, empty, too-long, or out-of-order prefixes.

The verifier checks ordered prefix, not just set-membership: the storylet-pool-authoring contract is that `visible_branch_path_prefix` is an ordered prefix of `branch_path`.

### 2. Added unit-test fixtures for `branch_prefix_scoped` allowed and rejected cases

`tools/validators/tests/structural/recursive-reference-closure.test.ts` now covers:

- `branch_prefix_scoped` + valid prefix → reference allowed.
- `branch_prefix_scoped` + invalid sibling prefix → rejected with `recursive_reference_closure.branch_leak`.
- `branch_prefix_scoped` + null `visible_branch_path_prefix` → rejected.
- `branch_prefix_scoped` + non-array `visible_branch_path_prefix` → rejected.

The existing `global_author_pool`, PG-record, legacy OBL, missing-record, and world-level-artifact fixtures continue to pass unchanged.

### 3. Updated the validator's `branchLeak` verdict's `suggested_fix`

The non-page `branchLeak` `suggested_fix` now names the `branch_prefix_scoped` recovery route: scope the storylet as `branch_prefix_scoped` with a `visible_branch_path_prefix` that is an ordered prefix of this page's `branch_path`.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — extend `isAllowedReference`'s null-`createdAtPage` branch, add `isOrderedPrefix` helper, extend `suggested_fix` text in `branchLeak`)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — add four `branch_prefix_scoped` fixtures: allowed-prefix, sibling-rejection, null-prefix-rejection, malformed-prefix-rejection)

## Out of Scope

- Storylet-pool-authoring skill changes. The storylet-pool-authoring contract (per STPOOL-001) is the source of truth; this ticket aligns the validator with that contract. No skill-prose, template, or batch-manifest changes are needed on the storylet-pool-authoring side.
- Story-bundle data migration. Existing SLB-0003 storylets at `worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-0{49..72}.yaml` are correctly authored per the storylet-pool-authoring contract; no `_source/` rewrites or supersession events are required.
- `branch_scoped` visibility scope handling. `branch_scoped` storylets carry non-null `created_at_page` per the storylet-pool-authoring contract; the existing `branchPath.has(createdAtPage)` branch handles them correctly. No change to that branch.
- Page-cycle skill prose changes. The skill correctly delegates to storylet-pool-authoring for storylet-pool authoring and reads the resulting visibility metadata; no page-cycle SKILL.md or references update is needed.
- `recursive_reference_closure.missing_record` code path. This ticket only touches branch-leak allowance and suggested-fix behavior; missing-record handling is unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — succeeds.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js` — all new `branch_prefix_scoped` fixtures pass; all VALENH-004/VALENH-006 fixtures continue to pass.
3. `cd tools/validators && npm test` — full validators-package pass, preserving package integration coverage.

### Invariants

1. The validator continues to reject every reference whose target's branch anchor is genuinely outside the new page's branch_path. The fix does not weaken sibling-branch isolation; it only honors the `branch_prefix_scoped` authoring shape that already encodes the same isolation via prefix-relation rather than single-page anchor.
2. `global_author_pool` storylets with null `created_at_page` continue to be allowed (VALENH-004 invariant).
3. `page_record` references continue to be authorized by PG-id-in-branchPath check (VALENH-006 invariant).
4. The validator's `STORY_LOCAL_ID` set, `NON_EDGE_FIELDS` skip-list, and `referenceBranchPageFor` helper are unchanged. Only `isAllowedReference` (one branch added) and the `branchLeak` verdict's `suggested_fix` text are modified.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — added four `branch_prefix_scoped` fixtures (allowed-prefix, sibling-rejection, null-prefix-rejection, malformed-prefix-rejection); existing `global_author_pool` and `page_record` fixtures continue to pass.

### Commands

1. `cd tools/validators && npm run build` (producer build).
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js` (targeted compiled structural validator test).
3. `cd tools/validators && npm test` (full validators-package pass).

## Outcome

Completed: 2026-05-06.

`recursive_reference_closure` now accepts `branch_prefix_scoped` storylets with `provenance.created_at_page: null` when their `visibility.visible_branch_path_prefix` is a non-empty ordered prefix of the new page's `branch_path`. It continues to reject sibling-prefix, null-prefix, and malformed-prefix storylets as `recursive_reference_closure.branch_leak`.

The validator keeps the existing `global_author_pool`, page-record, legacy OBL, missing-record, and world-level-artifact behavior intact. The non-page branch-leak suggestion now includes the `branch_prefix_scoped` repair path.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js` — passed.
3. `cd tools/validators && npm test` — passed, 134/134 tests.

## Deviations

- The drafted root `pnpm --filter @worldloom/validators test recursive-reference-closure` command was replaced with the live package-local npm lane from `tools/validators/package.json`.
- The drafted `tools/world-mcp/dist/src/cli/validate-patch-plan.js <test-envelope>` smoke was narrowed to focused validators-package proof. The owned implementation is inside `tools/validators`, and `npm test` includes the package integration lane that runs `validatePatchPlan` with `recursive_reference_closure` for Shape B page ops.
- The first focused run exposed that the positive branch-prefix test fixture needed to include the referenced ancestor PG record because recursive closure still resolves PG ids appearing inside record bodies. The fixture was corrected to match the real story-bundle shape.
