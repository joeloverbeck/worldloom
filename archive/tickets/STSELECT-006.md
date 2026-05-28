# STSELECT-006: Regression coverage for page-state, source-ref, and error-path boundary cases in `select_storylet_candidates`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new fixture/test additions in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`, a trace evidence-key rename in `tools/world-mcp/src/tools/select-storylet-candidates.ts`, and the matching context-packet mirror type in `tools/world-mcp/src/context-packet/shared.ts`. No behavior changes to candidate filtering logic.
**Deps**: None.

## Problem

At intake, three boundary surfaces in `tools/world-mcp/src/tools/select-storylet-candidates.ts` carried defensive code paths and contract details that tests did not exercise:

1. **`sourceRecordIdRejectionSample` second branch (intake location: lines 434-446): `global_author_pool` SLT carrying STORY-LOCAL exact source refs.** The rejection path "global author-pool storylet carries story-local exact source refs" fires when a `global_author_pool` SLT references an exact record ID whose prefix is in `RECORD_PREFIX_TO_CLASS` (so `isStoryLocalRecordId` returns true) AND the ref actually resolves in the index. At intake, the existing test fixture's SLT-7 had `STOBJ-99` (story-local prefix) and was `global_author_pool`, but `STOBJ-99` did NOT exist in the nodes table, so it fell into the FIRST branch (missing source refs, intake location: lines 419-432). This ticket added a fixture where the story-local ref resolves and the SLT is still rejected for carrying it on a global-pool SLT. This rejection enforces Rule 4 (No Globalization by Accident) at the predicate-source-ref layer.

2. **`loadParentPage` graceful-degradation paths (intake location: lines 220-262).** The function defends against several malformed-state-snapshot shapes:
   - `state_snapshot` null, missing, or non-object (snapshot defaults to `{}`)
   - `state_snapshot.active_records` as array instead of object (`activeClassesFromSnapshot` returns empty set)
   - `state_snapshot.unresolved_mystery_claims` as object instead of array (`mysteryAuthoritiesFromSnapshot` returns empty set)
   - `state_snapshot.unresolved_mystery_claims` array entries missing `authority` or with non-string authority (filtered out)
   - `state_snapshot.active_records[PREFIX]` array entries when `PREFIX` is not in `RECORD_PREFIX_TO_CLASS` (silently skipped)
   - `parsed.branch_id` non-string (defaults to null)
   - `parsed.branch_path` non-array (defaults to empty)

   Before this ticket, these defensive paths were not exercised by a regression test. The landed malformed-snapshot fixture variants now catch regressions that throw instead of degrading.

3. **`record_not_found` error path (intake location: lines 236-243).** When `parent_page_id` does not exist in the nodes table, `loadParentPage` returns an `McpError` with code `record_not_found`. The error is propagated back to the caller via the early-return. Before this ticket, no unit test asserted this contract; the landed test now does.

4. **Evidence-key labeling oddity in `mysteryPolicyRejectedSample` (intake location: lines 488-499).** Before this ticket, the `evidence.forbidden_mystery_resolutions` field carried the SLT's `allowed_authority` value as a single-element array (e.g., `["canon_candidate"]`), wrapped in a key whose name suggested it carried `mystery_policy.forbidden_resolutions[]` (the SLT-schema field listing M-record IDs the SLT must not resolve, e.g., `[M-1, M-2, M-7]`). This ticket landed option (a): the selector now emits `allowed_authority_classes: string[]`, and the old response key is retired on current `tools/world-mcp` operational surfaces.

Bundle these four cases in one ticket because they share fixture machinery (malformed page-state shapes plus an existing-but-mis-pooled story-local source ref) and one analytical theme (defensive contracts at the page-state / source-ref boundary).

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: confirmed line-by-line at the citations above. The `sourceRecordIdRejectionSample` second branch is reachable only with a fixture that (i) creates a story-local record (e.g., `STOBJ-1`) in the nodes table AND (ii) has a `global_author_pool` SLT with a `storylet_predicate_ref` edge to that record ID. Before this ticket, the fixtures never combined those two conditions; the landed `buildGlobalPoolStoryLocalSourceRefWorld` fixture now does.
2. **Mirror schema check**: `tools/world-mcp/src/context-packet/shared.ts` mirrors the `mystery_policy_rejected_samples` shape and was updated in lockstep with the selector rename. `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/src/server.ts` describe stage-specific evidence generically and did not require edits.
3. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between `loadParentPage` and the upstream page-record writer (the patch engine's `create_pg_record` op, which serializes `PG.state_snapshot` from the page-cycle plan). The malformed-state-snapshot defenses are a "trust but verify" layer; in production, the patch engine produces well-formed snapshots, but the defenses exist to prevent silent downstream failures if a future patch-engine bug serializes malformed data.
4. **FOUNDATIONS principle restatement**: §Tooling Recommendation @ error-shape (aligns — `record_not_found` is the standard MCP error contract; coverage proves the selector adheres to it). §Story Bundles Validation Rule 4 (No Globalization by Accident) @ runtime selection (aligns — §1's second-branch rejection enforces the story-local-ref-on-global-pool prohibition at retrieval time). §Story Bundles Validation Rule 7 (Preserve Mystery Deliberately) @ runtime selection (aligns — §4's labeling clarification protects the authority-vs-claim discipline at the evidence-trace surface).
5. **Existing-output schema**: §4's rename was an output-shape change: new evidence-key name introduced; old name retired (no aliasing). Downstream consumers reading `filter_trace.mystery_policy_rejected_samples[i].evidence.forbidden_mystery_resolutions` must move to `allowed_authority_classes`.
6. **Pre-edit baseline**: `cd tools/world-mcp && npm test` passed before this ticket's edits.
7. **Implementation reassessment**: pre-implementation grep found `forbidden_mystery_resolutions` in the selector, the selector test, historical triage prose, and story-state/skill surfaces where the term names a different state-seed or SLT-schema concept. The operational selector trace response had no package README, `docs/MACHINE-FACING-LAYER.md`, or `src/server.ts` evidence-key reference to update beyond the selector, its context-packet mirror type, and the selector test assertion.
8. **Package baseline**: `cd tools/world-mcp && npm test` passed before source edits with 509 passing tests, confirming the broad package lane was green before this ticket's changes.

## Architecture Check

1. **Cleaner than alternatives.** Option A (this ticket — bundle defensive-path coverage with the labeling clarification because they share one ticket's worth of fixture work) keeps the test surface analytically coherent. Option B (split labeling rename into a separate ticket) inflates ticket count for a one-line change. Option C (only document the labeling oddity in source comments without renaming) is the YAGNI-aware fallback if pre-implementation grep reveals downstream consumers depending on the current name.
2. **No backwards-compatibility aliasing/shims introduced.** §4's rename is an outright contract change with no alias; the existing field is replaced. The defensive-path tests are purely additive.

## Verification Layers

1. `sourceRecordIdRejectionSample` second branch fires when a `global_author_pool` SLT carries an existing story-local source ref → regression assertion (fixture seeds STOBJ-1, gives SLT a `storylet_predicate_ref` to STOBJ-1, sets SLT scope to `global_author_pool`; selector rejects at `after_source_record_id` with the second-branch reason text).
2. Malformed `state_snapshot` shapes (null / array / missing keys / unknown record-class prefix) cause `loadParentPage` to degrade gracefully (default to empty active classes and empty mystery authorities) without raising → regression assertion against four fixture variants.
3. `parent_page_id` not found returns an `McpError` with `code: "record_not_found"` and the `parent_page_id` echoed in `details` → regression assertion.
4. `mystery_policy_rejected_samples[i].evidence` carries an accurately-named field whose semantics match the actual content (the SLT's `allowed_authority` value, not the SLT's `forbidden_resolutions[]`) → regression assertion against `allowed_authority_classes`.
5. The `tools/world-mcp/src/context-packet/shared.ts` mirror schema is updated in lockstep with any selector schema change → grep-proof that both files carry the same evidence-key name.

## Files to Touch

- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — added three focused tests covering six boundary subcases)
- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify — renamed mystery-policy evidence key and typed its rejected-sample shape)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — mirrored the renamed mystery-policy evidence shape for context-packet embedded shortlists)
- `tools/world-mcp/README.md` (inspected — no evidence-key-specific text to update)
- `docs/MACHINE-FACING-LAYER.md` (inspected — no evidence-key-specific text to update)

## Out of Scope

- Changes to `loadParentPage` defensive logic (the defenses are correct; only test coverage is missing).
- Changes to `sourceRecordIdRejectionSample` logic (both branches are correct; only coverage is missing).
- Adding `mystery_policy.forbidden_resolutions[]` enforcement to the selector (this is intentionally downstream-evaluator territory — the selector's job is shortlisting, not per-mystery-per-branch resolution checks).
- Coverage for the ranking algorithm (STSELECT-004's scope).
- Coverage for branch/scope/cooldown boundaries (completed under `archive/tickets/STSELECT-005.md`).
- Coverage for the end-to-end indexer→selector pipeline (completed under `archive/tickets/STSELECT-003.md`).
- Coverage for the `include_rejection_summary` flag defect (MCPENH-075's scope).

## Acceptance Criteria

### Tests That Must Pass

1. New test asserts `sourceRecordIdRejectionSample` second branch fires for a `global_author_pool` SLT carrying an existing story-local source ref.
2. New test asserts malformed `state_snapshot` (null / array / unknown prefix / missing-authority entries) degrades gracefully — selector returns a usable shortlist without raising.
3. New test asserts `parent_page_id` not found returns `McpError` with `code: "record_not_found"` and parent_page_id echoed in details.
4. New trace expectation asserts `mystery_policy_rejected_samples[i].evidence.allowed_authority_classes` accurately names the SLT `allowed_authority` content.
5. Existing tests in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` pass with the updated evidence key.
6. `tools/world-mcp/src/context-packet/shared.ts` mirror is updated; grep proves no stale `forbidden_mystery_resolutions` selector-trace reference remains in `tools/world-mcp/` or `docs/MACHINE-FACING-LAYER.md`.

### Invariants

1. Defensive paths in `loadParentPage` are mechanically asserted; a regression that removes defaulting and lets a malformed snapshot raise an exception fails the relevant test.
2. The `sourceRecordIdRejectionSample` second branch is reachable by at least one fixture; a regression that drops the branch (e.g., merging it into the first branch's logic) fails the dedicated test.
3. The `record_not_found` error contract for `parent_page_id` is asserted at the unit-test layer (not only via integration / smoke).
4. The evidence-key naming reflects actual content; only `allowed_authority_classes` exists across selector + context-packet mirror + current docs for this trace field.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify) — added focused boundary coverage for existing story-local source refs on global-pool SLTs, malformed page-state snapshots, missing parent-page errors, and renamed mystery-policy evidence.

### Commands

1. Pre-implementation grep: `rg -n "forbidden_mystery_resolutions" tools/ docs/ .claude/` enumerated consumers before applying the rename path.
2. `cd tools/world-mcp && npm test` — full suite passes including the new boundary tests.
3. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/select-storylet-candidates.test.js` — focused compiled proof.

## Outcome

Implemented. The selector now emits `mystery_policy_rejected_samples[].evidence.allowed_authority_classes` for the SLT `mystery_policy.allowed_authority` values, and the context-packet embedded shortlist mirror carries the same typed evidence shape. The old selector-trace key `forbidden_mystery_resolutions` was removed from current `tools/world-mcp` operational surfaces.

Added regression coverage for:

1. Global-author-pool SLTs that carry an existing story-local exact source ref, proving the second `sourceRecordIdRejectionSample` branch.
2. Malformed parent-page state snapshots, including null/array snapshots, array `active_records`, object `unresolved_mystery_claims`, missing/non-string authorities, unknown active-record prefixes, non-string `branch_id`, and non-array `branch_path`.
3. Missing `parent_page_id` returning `record_not_found` with the page id echoed in details.
4. The renamed mystery-policy evidence key in the main selector trace expectation.

## Verification Result

Pre-edit baseline:

1. `cd tools/world-mcp && npm test` — passed before source edits, 509 passing tests.

Post-implementation proof:

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js` — passed, 19 tests.
3. `cd tools/world-mcp && npm test` — passed after source/test edits, 512 passing tests.
4. `rg -n 'forbidden_mystery_resolutions|allowed_authority_classes' tools/world-mcp docs/MACHINE-FACING-LAYER.md` — current `tools/world-mcp` and machine-facing doc surfaces contain only `allowed_authority_classes`; no stale `forbidden_mystery_resolutions` selector-trace key remains there.
5. `git diff --check` — passed.

## Deviations

The ticket draft said "add ≥6 new tests"; the implementation adds three focused `node:test` tests, with the malformed-snapshot test table covering four defensive subcases. This preserves the intended six boundary assertions without splitting every malformed state shape into a separate top-level test. `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `src/server.ts` were inspected but not edited because they describe stage-specific evidence generically and did not name the retired key.
