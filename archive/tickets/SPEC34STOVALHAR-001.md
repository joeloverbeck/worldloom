# SPEC34STOVALHAR-001: branch_isolation structural validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/branch-isolation.ts`; new test fixture at `tools/validators/tests/structural/branch-isolation.test.ts`; one-line registry append at `tools/validators/src/public/registry.ts`. No impact on existing validators.
**Deps**: None

## Problem

Eight-Shared-Hard-Gate 4 at `.claude/skills/_shared-templates/story-state-contract.md` §7 line 773 states: *"No record from a sibling branch appears in this page's `state_snapshot.active_records`. No author-pool commitment block references branch-local record ids."* This is enforced at the skill layer (PG-authoring in `branching-story-bootstrap` and `branching-story-turn-cycle`) but not at the validator layer — a malformed bundle authored outside the skill (or a regression in skill enforcement) currently passes `world-validate`. Audit `reports/story-related-improvements-seventh-iteration.md` §11.3 names two tests this single validator covers: `branch_isolation` (line 829) and `global_author_pool_branch_local_leakage` (line 844). The discipline maps to FOUNDATIONS Rule 4 (No Globalization by Accident) at story scope per FOUNDATIONS.md §Story Bundles §5.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/src/structural/` exists with 16 sibling validators (verified during `/reassess-spec` this session via `ls tools/validators/src/structural/`); the new validator file `branch-isolation.ts` is additive — no naming collision.
2. SPEC-34 §D1 (lines 59-102) is the authoritative spec section; `/reassess-spec` ran on this spec earlier this session and applied 17 findings including the D1 `bound:<alias>` exclusion clause for `SLT.effects` / `exit_options[]` (per §D1 step 3's expanded carve-out at line 85). Spec also names the `applies_to` predicate (line 65) and `severity_mode: "fail"` (line 63) explicitly.
3. Shared boundary under audit: `tools/validators/src/public/registry.ts` `structuralValidators` array (line 29) — the validator is registered via import + array-append matching the sibling pattern at lines 30-45 (e.g., `import { branchIsolation } from "../structural/branch-isolation.js"` + array entry); also `tools/validators/src/structural/utils.ts` shared helpers (`asPlainRecord`, `stringValue`, `stringArray`, `locationFor`, `queryStructuralRecords`, `touchedFilesInclude`) which this validator consumes for record retrieval and verdict emission.
4. FOUNDATIONS principle motivating this ticket — Rule 4 (No Globalization by Accident) at story scope per FOUNDATIONS.md §Story Bundles §5: *"Global author-pool storylets must not reference `branch_local_record` IDs; `bundle_genesis_record` IDs remain globally visible unless later superseded or closed, per the shared story state contract's branch-scope vocabulary."* The validator enforces this discipline at `world-validate` time, independent of skill-side hard gates.
5. Mismatch + correction: spec §Verification item 1 cites `npm run test -- --grep 'branch-isolation'` (Mocha syntax); the actual runner is node's built-in test (`node --test dist/tests/**/*.test.js` per `tools/validators/package.json`). Corrected to direct invocation `node --test dist/tests/structural/branch-isolation.test.js` after `npm run build` in this ticket's Verification commands. Mechanical drift; spec intent preserved.
6. Same-seam registry fallout: live package inventory/count assertions exist in `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, and `tools/validators/README.md`. These moved with the registration so the new structural validator is counted, listed, and skipped in clean non-story pre-apply plans.

## Architecture Check

1. Standalone validator (not extension of existing `state-snapshot-integrity.ts`) is cleaner because `state-snapshot-integrity.ts` checks dangling-reference-existence only (per `tools/validators/src/structural/state-snapshot-integrity.ts:96-104`) — it confirms records EXIST in the bundle but does NOT walk branch-ancestry to detect sibling-branch leaks. Conflating the two checks in one file would couple two distinct invariants (referential integrity vs. branch isolation) and complicate fixture authoring.
2. No backwards-compatibility aliasing/shims introduced. Validator is net-new; sibling pattern preserved exactly.

## Verification Layers

1. **Branch-ancestry traversal correctness** → codebase grep-proof (`grep -n 'parent_branch_id\|branch_path' tools/validators/src/structural/branch-isolation.ts` confirms ancestry walk; node:test fixture Cases 1-2 prove ancestor-OK vs sibling-FAIL).
2. **Global-SLT branch-local-reference rejection** → codebase grep-proof + fixture (Cases 3-5 prove world-scope/bundle-genesis-OK vs branch-local-FAIL vs existential-predicate-PASS).
3. **Registry integration** → codebase grep-proof (`grep -n 'branchIsolation' tools/validators/src/public/registry.ts` returns import + array-entry).
4. **FOUNDATIONS alignment** → FOUNDATIONS.md §Story Bundles §5 (Rule 4 at story scope) + §7 gate 4 (Eight-Shared-Hard-Gate 4) cited in implementation comments.

## What to Change

### 1. New validator implementation

Create `tools/validators/src/structural/branch-isolation.ts` following the sibling pattern (e.g., `tools/validators/src/structural/state-snapshot-integrity.ts` lines 45-109 for shape):

- `severity_mode: "fail"`.
- `applies_to(ctx)`: `ctx.run_mode === "full-world" || ctx.patch_plan?.patches.some(p => p.op === "create_pg_record" || p.op === "create_slt_record") === true || touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(pages|storylets)\/(PG|SLT)-\d+\.yaml$/)`.
- Logic per SPEC-34 §D1 lines 71-85:
  - **Step 1**: For each `BR-<integer>` record in the bundle, compute its `branch_path` via `parent_branch_id` chain (root → … → this branch).
  - **Step 2**: For each `PG-<integer>` record, determine its branch from `PG.branch_id`; for each story-local record id in `PG.state_snapshot.active_records` (across STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA / STSTAT sub-arrays per contract §4.2), look up `created_at_page` of the referenced record, derive its branch, verify branch is in current PG's `branch_path` (ancestor or self) OR record is `bundle_genesis_record` (created at PG-1). Otherwise emit `branch_isolation_violation`.
  - **Step 3**: For each `SLT-<integer>` with `scope.visibility: global_author_pool`, walk `preconditions.hard | soft`, `effects.create | supersede | close`, and `exit_options[].likely_effects`; for each static record-id reference (excluding existential-predicate aliases AND `bound:<alias>` references per spec §D1 line 85), verify it is `bundle_genesis_record` OR world-scope id (`CF-<integer>` / `CHAR-<integer>` / `ENT-<integer>`). Otherwise emit `global_storylet_references_branch_local`.

### 2. Diagnostics

- `branch_isolation_violation` — fail. Cites the PG, the offending record id, and the sibling-branch id.
- `global_storylet_references_branch_local` — fail. Cites the SLT, the offending record-id reference, and the branch_local record's owning branch.

### 3. Test fixtures

Create `tools/validators/tests/structural/branch-isolation.test.ts` with 5 cases per SPEC-34 §D1 lines 94-98:

- Case 1: PG snapshot referencing only ancestor-branch + bundle-genesis records → PASS.
- Case 2: PG snapshot referencing an SF whose `created_at_page` is on a sibling branch → FAIL with `branch_isolation_violation`.
- Case 3: Global SLT with only bundle-genesis + world-scope references → PASS.
- Case 4: Global SLT citing a branch-local SF in its preconditions → FAIL with `global_storylet_references_branch_local`.
- Case 5: Global SLT using only existential predicates (e.g., `any_belief(alias, …)`) → PASS (runtime-bound, not static leak).

### 4. Registry append

Add to `tools/validators/src/public/registry.ts` (sorted-or-grouped to match sibling style):

- Import: `import { branchIsolation } from "../structural/branch-isolation.js";`
- Array entry in `structuralValidators` (line 29 onward) at a coherent position.

## Files to Touch

- `tools/validators/src/structural/branch-isolation.ts` (new)
- `tools/validators/tests/structural/branch-isolation.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — 1 import line + 1 array entry)
- `tools/validators/tests/structural/registry.test.ts` (modify — structural registry expected list)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural/total validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean non-story pre-apply skip expectation)
- `tools/validators/README.md` (modify — validator inventory/count)

## Out of Scope

- Cross-validator helper extraction (e.g., shared branch-path computation utility). Per SPEC-34 line 28, deferred until duplication grows past 2-3 internal copies.
- Modifying existing `state-snapshot-integrity.ts` to absorb branch-isolation logic — conflates distinct invariants; expressly out-of-scope per spec §D1 design decision.
- D2/D3/D4 implementations (separate tickets in this batch).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/branch-isolation.test.js` — all 5 fixture cases pass.
2. `cd tools/validators && grep -nE 'branchIsolation' src/public/registry.ts` — returns ≥2 matches (1 import + 1 array entry).
3. `cd tools/validators && npm run test` — full validators suite green (no sibling-validator regressions).

### Invariants

1. PG `state_snapshot.active_records` MUST contain only records whose owning branch is in the PG's `branch_path` (ancestor-or-self) OR records flagged as `bundle_genesis_record`. Sibling-branch leakage is a hard failure.
2. Global author-pool SLTs (`scope.visibility: global_author_pool`) MUST NOT statically reference branch-local record ids in preconditions, effects, or exit-option likely-effects. Existential-predicate aliases and `bound:<alias>` references are runtime-bound and excluded from this check.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/branch-isolation.test.ts` (new) — exercises the 5 fixture cases above; covers ancestor-OK, sibling-FAIL, world-scope-OK, branch-local-FAIL, and existential-predicate-PASS paths.
2. `tools/validators/tests/structural/registry.test.ts` (modified) — proves `branch_isolation` is registered in structural validator order.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modified) — updates the active structural/total validator counts.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — proves `branch_isolation` remains skipped for clean non-story pre-apply plans.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/branch-isolation.test.js` (targeted)
2. `cd tools/validators && npm run test` (full suite — confirms no regressions in the 16 existing structural validators)
3. The targeted command is the correct verification boundary for the validator's own correctness; the full-suite command catches integration regressions from the registry append.

## Outcome

Completed: 2026-05-16

Implemented `branch_isolation` as a standalone structural validator with `severity_mode: "fail"`. The validator now:

- checks page `state_snapshot.active_records` against the page branch path, allowing ancestor/self and PG-1 bundle-genesis records while failing sibling-branch leakage with `branch_isolation_violation`;
- checks `global_author_pool` storylets for static branch-local record references in preconditions, effects, and exit-option likely effects, while allowing world-scope IDs, bundle-genesis IDs, existential predicates, and `bound:<alias>` runtime-bound references;
- runs in full-world mode, in pre-apply for `create_pg_record` / `create_slt_record`, and in incremental mode for touched page/storylet files.

Same-seam package inventory and proof fallout moved with the validator: registry expected-list coverage, SPEC-04 aggregate validator counts, clean non-story pre-apply skip expectations, and the validators README structural inventory/count.

## Verification Result

- `cd tools/validators && npm run build` — PASS.
- `cd tools/validators && node --test dist/tests/structural/branch-isolation.test.js` — PASS, 6 tests.
- `cd tools/validators && grep -nE 'branchIsolation' src/public/registry.ts` — PASS, import + array entry found.
- `cd tools/validators && npm run test` — PASS, 280 tests.

## Deviations

- The landed test fixture includes a sixth applies-to scoping case in addition to the five behavior cases from the ticket, because this validator participates in pre-apply and incremental selector behavior.
- The package README and existing registry/count/pre-apply execution tests were added to the touched set during reassessment because registering a new structural validator otherwise left same-seam inventory and clean-plan expectations stale.
