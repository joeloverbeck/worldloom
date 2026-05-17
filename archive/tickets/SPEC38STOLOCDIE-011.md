# SPEC38STOLOCDIE-011: New structural validator `story_da_duplicate_heuristic`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/story-da-duplicate-heuristic.ts` + paired test + registration in `tools/validators/src/public/registry.ts` + registry-test assertion update + validator inventory/count proof updates
**Deps**: None

## Problem

At intake, health-audit Phase 2x (ticket 005) needed duplicate-DA detection but no validator surfaced it. Duplicate DAs arise from operator error during turn-cycle authoring when the operator forgets to supersede an existing DA, or to use `derived_from` for a copy. This ticket landed the structural validator that consumes story-bundle state and emits a WARN-level verdict when active DAs share `(title, author)` without a `supersedes` or `derived_from` chain linking the cluster.

## Assumption Reassessment (2026-05-17)

1. Verified codebase has analogous structural validators at `tools/validators/src/structural/<name>.ts` using kebab-case naming (per existing `expected-witness-coverage.ts`, `non-propagation-tag-shape.ts`, `branch-isolation.ts`, etc.). Verified registry seam: import block at lines 1-21 of `registry.ts`, `structuralValidators` array at lines 36-60. Verified registry test at `tools/validators/tests/structural/registry.test.ts` asserts the exact name list. Verified test naming at `tools/validators/tests/structural/<source-name>.test.ts`.
2. Verified SPEC-38 §D11 filename `story-da-duplicate-heuristic.ts` matches existing kebab-case convention (no mechanical-drift correction needed). Default cluster key is `(title, author)`; body-similarity threshold disabled in v1 and routed to §Risks #3 as opt-in extension awaiting pilot patterns.
3. Cross-skill boundary: this validator is consumed by `branching-story-health-audit` Phase 2x (ticket 005). The verdict code `story_da_duplicate_heuristic` must match the name ticket 005 cites. Registry surface + registry test updated atomically in this ticket to prevent test failures.
4. FOUNDATIONS principle motivating this ticket: Rule 6 No Silent Retcons — duplicate DAs without `supersedes` or `derived_from` break the audit trail (a reader of the bundle cannot tell whether the two artifacts are the same logical artifact mutated over time, or two distinct artifacts that happen to share authorial metadata). §Story Bundles §5b Schema-Minimalism: `supersedes` and `derived_from` are the canonical reconciliation mechanism; the validator enforces correct mechanism usage rather than adding new fields.
5. HARD-GATE / canon-write ordering: this ticket adds a NEW structural validator under `tools/validators/src/structural/`. Per the validator-modification-gates-canon-write rule, structural validators gate canon and story-bundle record writes at engine pre-apply time. The new validator emits WARN verdicts (not FAIL — duplicate detection is heuristic and false positives are possible per §Risks #3); landing it extends the audit-trail surface without blocking lawful operations. Confirmed the validator STRENGTHENS audit-trail discipline — it does NOT weaken the Mystery Reserve firewall, does NOT silently resolve MR entries, and does NOT change any existing validator's verdict semantics.
6. Implementation reassessment: package pre-scan found same-seam validator inventory/count surfaces in `tools/validators/README.md`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`. These moved with the registry so the broad package lane remains truthful. The validator is scoped to full-world runs, story DA/page pre-apply plans, and touched story DA/page files; the clean canon-only pre-apply integration test now expects this validator to be skipped.

## Architecture Check

1. New structural validator (cleaner than rule): the check operates on cross-record cluster analysis (multiple DAs analyzed together for shared (title, author) signature) rather than per-event predicate evaluation. Following established kebab-case naming for structural validators.
2. WARN severity (not FAIL): duplicate detection is heuristic; false positives possible. WARN surfaces candidates for operator review without blocking patch application. SPEC-38 §Risks #3 explicitly defers body-similarity clustering as opt-in.
3. No backwards-compatibility shims; net-new validator.

## Verification Layers

1. Validator file exists → codebase grep-proof: `test -f tools/validators/src/structural/story-da-duplicate-heuristic.ts`.
2. Test file exists with ≥3 tests passing → `cd tools/validators && npm test`.
3. Registry import + `structuralValidators` array entry added → codebase grep-proof: `grep -n 'storyDaDuplicateHeuristic' tools/validators/src/public/registry.ts` returns ≥2 matches.
4. Registry test extended to include new name → codebase grep-proof: `grep -n 'story_da_duplicate_heuristic' tools/validators/tests/structural/registry.test.ts` returns ≥1 match.
5. No regressions on existing suite.

## Landed Changes

### 1. New validator source file

Path: `tools/validators/src/structural/story-da-duplicate-heuristic.ts`.

Landed `storyDaDuplicateHeuristic` as a structural validator. It loads active story-local DAs from the latest PG's `state_snapshot.active_records.DA[]`, clusters active artifacts by exact `(title, author)`, treats `supersedes` and `derived_from` as an undirected connectivity graph inside each cluster, and emits WARN verdict `story_da_duplicate_heuristic` only when the cluster is not fully linked. Body-similarity clustering remains out of scope.

### 2. New test file

Path: `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts`. Landed 5 focused tests:

- `distinct_da_pair_passes` — DA-1 and DA-2 with different `(title, author)`. Expect pass.
- `title_author_cluster_without_chain_warns` — DA-1 and DA-2 share `(title, author)`, no supersession or derivation. Expect verdict `story_da_duplicate_heuristic`.
- `title_author_cluster_with_supersession_passes` — DA-1 and DA-2 share `(title, author)`, DA-2 `supersedes: DA-1`. Expect pass.
- `title_author_cluster_with_derivation_passes` — same title/author, DA-2 `derived_from: [DA-1]`. Expect pass.
- `story_da_duplicate_heuristic is scoped to full-world, story DA/page pre-apply, and touched story DA/page files` — confirms `applies_to` behavior.

### 3. Register in `tools/validators/src/public/registry.ts`

Added import and `structuralValidators` registration in `tools/validators/src/public/registry.ts`.

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Added `"story_da_duplicate_heuristic"` to the structural registry assertion in the same order as `registry.ts`.

### 5. Updated same-seam inventory and pre-apply execution tests

Updated `tools/validators/README.md` from 23 to 24 structural validators and added the new name to the inventory. Updated `tools/validators/tests/integration/spec04-verification.test.ts` from 23/34 to 24/35 validator counts. Updated `tools/validators/tests/integration/validate-patch-plan.test.ts` so clean canon-only pre-apply plans classify the new story DA/page-scoped validator as skipped.

## Files to Touch

- `tools/validators/src/structural/story-da-duplicate-heuristic.ts` (new)
- `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/structural/registry.test.ts` (modify — extend assertion list)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator count assertion)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply skip classification)
- `tools/validators/README.md` (modify — structural validator inventory/count)

## Out of Scope

- Body-similarity clustering (opt-in extension; deferred per SPEC-38 §Risks #3 pending pilot patterns where title+author differs but body is similar)
- Levenshtein / token-overlap / embedding threshold tuning (default disabled in v1)
- CHC-grounding accessibility (lives in ticket 010)
- Prose-mention detection (lives in ticket 012)
- Health-audit Phase 2x prose (lives in ticket 005)
- DA schema changes (deferred per SPEC-38 §Out of Scope)

## Acceptance Criteria

### Tests That Must Pass

1. Validator implemented and registered.
2. All 3 minimum tests pass.
3. `cd tools/validators && npm test` produces zero regressions.
4. `tools/validators/tests/structural/registry.test.ts` includes the new name.

### Invariants

1. The validator emits WARN-severity verdicts (heuristic detection; not blocking).
2. Verdict code `story_da_duplicate_heuristic` matches the name cited by ticket 005.
3. Title+author exact-match clustering is mandatory in v1; body-similarity is opt-in per §Risks #3.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts` (new) — 5 tests covering distinct pairs, unlinked duplicate warnings, supersession pass, derivation pass, and `applies_to` scoping.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — extend name list.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — update structural/total validator counts.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — classify this story-scoped validator as skipped for clean canon-only pre-apply plans.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/story-da-duplicate-heuristic.test.js`

## Outcome

Completed on 2026-05-17.

Implemented and registered `story_da_duplicate_heuristic` as a WARN-severity structural validator. It checks active story-local DAs from the latest PG snapshot, clusters by exact `(title, author)`, accepts clusters connected by `supersedes` or `derived_from`, and warns on unlinked likely duplicates. The package README, registry assertion, validator count capstone, and clean pre-apply execution-status test now include the new validator.

## Verification Result

1. `cd tools/validators && npm test` before edits — PASS, 348 tests.
2. `cd tools/validators && npm run build` — PASS after implementation.
3. `cd tools/validators && node --test dist/tests/structural/story-da-duplicate-heuristic.test.js` — PASS, 5 tests.
4. First post-implementation `cd tools/validators && npm test` — FAIL only in `validatePatchPlan returns no verdicts for a clean pre-apply plan`, because the new story-scoped validator was skipped for a canon-only clean plan and the test did not yet classify that skip.
5. Final `cd tools/validators && npm test` — PASS, 353 tests.
6. Manual review: `story_da_duplicate_heuristic` is WARN severity, uses the same verdict code cited by ticket 005, and does not weaken HARD-GATE or Mystery Reserve behavior.

## Deviations

- The implementation added same-seam inventory/count and clean pre-apply execution-status updates beyond the drafted four files because package reassessment found those assertions move with any registered validator.
- The focused test set landed with 5 tests instead of the minimum 3, adding `derived_from` and `applies_to` coverage.
