# SPEC38STOLOCDIE-011: New structural validator `story_da_duplicate_heuristic`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/story-da-duplicate-heuristic.ts` + paired test + registration in `tools/validators/src/public/registry.ts` + registry-test assertion update
**Deps**: None

## Problem

Health-audit Phase 2x (ticket 005) needs duplicate-DA detection but no validator currently surfaces it. Duplicate DAs arise from operator error during turn-cycle authoring when the operator forgets to supersede an existing DA, or to use `derived_from` for a copy. Two DAs sharing `(title, author)` without a `supersedes` or `derived_from` chain linking them are almost certainly duplicates — but the health-audit has no mechanical way to surface them to operator review. This ticket lands the structural validator that consumes story-bundle state and emits a WARN-level verdict when likely duplicates are found.

## Assumption Reassessment (2026-05-17)

1. Verified codebase has analogous structural validators at `tools/validators/src/structural/<name>.ts` using kebab-case naming (per existing `expected-witness-coverage.ts`, `non-propagation-tag-shape.ts`, `branch-isolation.ts`, etc.). Verified registry seam: import block at lines 1-21 of `registry.ts`, `structuralValidators` array at lines 36-60. Verified registry test at `tools/validators/tests/structural/registry.test.ts` asserts the exact name list. Verified test naming at `tools/validators/tests/structural/<source-name>.test.ts`.
2. Verified SPEC-38 §D11 filename `story-da-duplicate-heuristic.ts` matches existing kebab-case convention (no mechanical-drift correction needed). Default cluster key is `(title, author)`; body-similarity threshold disabled in v1 and routed to §Risks #3 as opt-in extension awaiting pilot patterns.
3. Cross-skill boundary: this validator is consumed by `branching-story-health-audit` Phase 2x (ticket 005). The verdict code `story_da_duplicate_heuristic` must match the name ticket 005 cites. Registry surface + registry test updated atomically in this ticket to prevent test failures.
4. FOUNDATIONS principle motivating this ticket: Rule 6 No Silent Retcons — duplicate DAs without `supersedes` or `derived_from` break the audit trail (a reader of the bundle cannot tell whether the two artifacts are the same logical artifact mutated over time, or two distinct artifacts that happen to share authorial metadata). §Story Bundles §5b Schema-Minimalism: `supersedes` and `derived_from` are the canonical reconciliation mechanism; the validator enforces correct mechanism usage rather than adding new fields.
5. HARD-GATE / canon-write ordering: this ticket adds a NEW structural validator under `tools/validators/src/structural/`. Per the validator-modification-gates-canon-write rule, structural validators gate canon and story-bundle record writes at engine pre-apply time. The new validator emits WARN verdicts (not FAIL — duplicate detection is heuristic and false positives are possible per §Risks #3); landing it extends the audit-trail surface without blocking lawful operations. Confirmed the validator STRENGTHENS audit-trail discipline — it does NOT weaken the Mystery Reserve firewall, does NOT silently resolve MR entries, and does NOT change any existing validator's verdict semantics.

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

## What to Change

### 1. New validator source file

Path: `tools/validators/src/structural/story-da-duplicate-heuristic.ts`.

Behavior per SPEC-38 §D11:
- Load all active DA records in the story bundle (per the latest PG's `state_snapshot.active_records.DA[]`).
- Cluster by `(title, author)` exact match.
- For each cluster of size > 1, check whether at least one supersession or derivation chain links them (`DA-A.supersedes == DA-B` OR `DA-A.derived_from` contains `DA-B`).
- If no chain, emit verdict `story_da_duplicate_heuristic` (WARN), message naming the cluster's DA ids.
- Body-similarity clustering is opt-in via config; default disabled in v1.

Export shape:

```ts
export const storyDaDuplicateHeuristic: Validator = {
  name: "story_da_duplicate_heuristic",
  severity_mode: "warn",
  applies_to: (ctx) => /* full-world OR DA-related patches */,
  run: async (input, ctx) => verdicts
};
```

### 2. New test file

Path: `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts`. Minimum 3 tests per SPEC-38 §D11:

- `distinct_da_pair_passes` — DA-1 and DA-2 with different `(title, author)`. Expect pass.
- `title_author_cluster_without_chain_warns` — DA-1 and DA-2 share `(title, author)`, no supersession or derivation. Expect verdict `story_da_duplicate_heuristic`.
- `title_author_cluster_with_supersession_passes` — DA-1 and DA-2 share `(title, author)`, DA-2 `supersedes: DA-1`. Expect pass.

### 3. Register in `tools/validators/src/public/registry.ts`

Add import alongside existing structural imports (lines 1-21 region):

```ts
import { storyDaDuplicateHeuristic } from "../structural/story-da-duplicate-heuristic.js";
```

Add to `structuralValidators` array (lines 36-60 region) at an appropriate position.

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Append `"story_da_duplicate_heuristic"` to the existing name-list assertion, in the same order as the registry.ts array entry.

## Files to Touch

- `tools/validators/src/structural/story-da-duplicate-heuristic.ts` (new)
- `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/structural/registry.test.ts` (modify — extend assertion list)

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

1. `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts` (new) — 3 tests per SPEC-38 §D11.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — extend name list.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/story-da-duplicate-heuristic.test.js`
