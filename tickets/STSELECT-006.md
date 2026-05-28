# STSELECT-006: Regression coverage for page-state, source-ref, and error-path boundary cases in `select_storylet_candidates`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new fixture/test additions in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`. May include a one-line rename to clarify `mystery_policy_rejected_samples` evidence key naming if the bundled labeling decision is honored. No other production-code changes.
**Deps**: None.

## Problem

Three boundary surfaces in `tools/world-mcp/src/tools/select-storylet-candidates.ts` carry defensive code paths and contract details that current tests do not exercise:

1. **`sourceRecordIdRejectionSample` second branch (lines 434-446): `global_author_pool` SLT carrying STORY-LOCAL exact source refs.** The rejection path "global author-pool storylet carries story-local exact source refs" fires when a `global_author_pool` SLT references an exact record ID whose prefix is in `RECORD_PREFIX_TO_CLASS` (so `isStoryLocalRecordId` returns true) AND the ref actually resolves in the index. The current test fixture's SLT-7 has `STOBJ-99` (story-local prefix) and is `global_author_pool`, but `STOBJ-99` does NOT exist in the nodes table, so it falls into the FIRST branch (missing source refs, lines 419-432). The second branch — where the story-local ref RESOLVES but the SLT is still rejected for carrying it on a global-pool SLT — is unreached. This rejection enforces Rule 4 (No Globalization by Accident) at the predicate-source-ref layer; without coverage, a regression that silently dropped the second branch would not be caught.

2. **`loadParentPage` graceful-degradation paths (lines 220-262).** The function defends against several malformed-state-snapshot shapes:
   - `state_snapshot` null, missing, or non-object (snapshot defaults to `{}`)
   - `state_snapshot.active_records` as array instead of object (`activeClassesFromSnapshot` returns empty set)
   - `state_snapshot.unresolved_mystery_claims` as object instead of array (`mysteryAuthoritiesFromSnapshot` returns empty set)
   - `state_snapshot.unresolved_mystery_claims` array entries missing `authority` or with non-string authority (filtered out)
   - `state_snapshot.active_records[PREFIX]` array entries when `PREFIX` is not in `RECORD_PREFIX_TO_CLASS` (silently skipped)
   - `parsed.branch_id` non-string (defaults to null)
   - `parsed.branch_path` non-array (defaults to empty)

   None of these defensive paths is exercised by a regression test. A refactor that tightened the defaults (e.g., threw on malformed snapshot instead of degrading) would not be caught at this layer; the failure mode would surface only at runtime under malformed real-world data.

3. **`record_not_found` error path (lines 236-243).** When `parent_page_id` does not exist in the nodes table, `loadParentPage` returns an `McpError` with code `record_not_found`. The error is propagated back to the caller via the early-return at lines 673-676. No unit test asserts this contract — the existing tests always pass valid parent page IDs.

4. **Evidence-key labeling oddity in `mysteryPolicyRejectedSample` (lines 488-499).** The `evidence.forbidden_mystery_resolutions` field carries the SLT's `allowed_authority` value as a single-element array (e.g., `["canon_candidate"]`), wrapped in a key whose name suggests it carries `mystery_policy.forbidden_resolutions[]` (the SLT-schema field listing M-record IDs the SLT must not resolve, e.g., `[M-1, M-2, M-7]`). These are two semantically distinct fields, and the misleading key naming would cause downstream consumers reading the trace to draw wrong conclusions. Test 1 in `select-storylet-candidates.test.ts:355-360` asserts `forbidden_mystery_resolutions: ["canon_candidate"]` without flagging the naming oddity.

   Decision needed during implementation: either (a) rename the evidence key to `allowed_authority_classes: string[]` (or similar) and update the test assertion accordingly, or (b) document the field's actual contract in the source comment and add a regression test that explicitly asserts "this carries the SLT's `allowed_authority`, not its `forbidden_resolutions`". This ticket prefers (a) — the rename is mechanical, the schema is additive (new field name, old name retired), and downstream consumers are limited to the typed `StoryletCandidateFilterTrace` interface plus the `context-packet/shared.ts` mirror.

Bundle these four cases in one ticket because they share fixture machinery (malformed page-state shapes plus an existing-but-mis-pooled story-local source ref) and one analytical theme (defensive contracts at the page-state / source-ref boundary).

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: confirmed line-by-line at the citations above. The `sourceRecordIdRejectionSample` second branch is reachable only with a fixture that (i) creates a story-local record (e.g., `STOBJ-1`) in the nodes table AND (ii) has a `global_author_pool` SLT with a `storylet_predicate_ref` edge to that record ID. The current fixtures never combine those two conditions.
2. **Mirror schema check**: `tools/world-mcp/src/context-packet/shared.ts:158-162` mirrors the `mystery_policy_rejected_samples` shape with the same evidence-key naming. If §4's rename path is taken, both files must be updated in lockstep; the README at `tools/world-mcp/README.md:22` may also reference the evidence shape and should be checked.
3. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between `loadParentPage` and the upstream page-record writer (the patch engine's `create_pg_record` op, which serializes `PG.state_snapshot` from the page-cycle plan). The malformed-state-snapshot defenses are a "trust but verify" layer; in production, the patch engine produces well-formed snapshots, but the defenses exist to prevent silent downstream failures if a future patch-engine bug serializes malformed data.
4. **FOUNDATIONS principle restatement**: §Tooling Recommendation @ error-shape (aligns — `record_not_found` is the standard MCP error contract; coverage proves the selector adheres to it). §Story Bundles Validation Rule 4 (No Globalization by Accident) @ runtime selection (aligns — §1's second-branch rejection enforces the story-local-ref-on-global-pool prohibition at retrieval time). §Story Bundles Validation Rule 7 (Preserve Mystery Deliberately) @ runtime selection (aligns — §4's labeling clarification protects the authority-vs-claim discipline at the evidence-trace surface).
5. **Existing-output schema**: §4's preferred rename (option a) is an additive schema change: new evidence-key name introduced; old name retired (no aliasing). Downstream consumers reading `filter_trace.mystery_policy_rejected_samples[i].evidence.forbidden_mystery_resolutions` would break. The mirror `context-packet/shared.ts` type is the canonical consumer surface; `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` may carry textual references. Pre-implementation: grep for `forbidden_mystery_resolutions` in `tools/`, `docs/`, and `.claude/skills/` to enumerate all consumers before deciding rename-vs-document.
6. **Pre-edit baseline**: `cd tools/world-mcp && npm test` is expected to pass before this ticket's edits.

## Architecture Check

1. **Cleaner than alternatives.** Option A (this ticket — bundle defensive-path coverage with the labeling clarification because they share one ticket's worth of fixture work) keeps the test surface analytically coherent. Option B (split labeling rename into a separate ticket) inflates ticket count for a one-line change. Option C (only document the labeling oddity in source comments without renaming) is the YAGNI-aware fallback if pre-implementation grep reveals downstream consumers depending on the current name.
2. **No backwards-compatibility aliasing/shims introduced.** §4's rename (if option a is taken) is an outright contract change with no alias; the existing field is replaced. The defensive-path tests are purely additive.

## Verification Layers

1. `sourceRecordIdRejectionSample` second branch fires when a `global_author_pool` SLT carries an existing story-local source ref → regression assertion (fixture seeds STOBJ-1, gives SLT a `storylet_predicate_ref` to STOBJ-1, sets SLT scope to `global_author_pool`; selector rejects at `after_source_record_id` with the second-branch reason text).
2. Malformed `state_snapshot` shapes (null / array / missing keys / unknown record-class prefix) cause `loadParentPage` to degrade gracefully (default to empty active classes and empty mystery authorities) without raising → regression assertion against four fixture variants.
3. `parent_page_id` not found returns an `McpError` with `code: "record_not_found"` and the `parent_page_id` echoed in `details` → regression assertion.
4. `mystery_policy_rejected_samples[i].evidence` carries an accurately-named field whose semantics match the actual content (the SLT's `allowed_authority` value, not the SLT's `forbidden_resolutions[]`) → regression assertion against the renamed-or-documented contract from §4.
5. The `tools/world-mcp/src/context-packet/shared.ts` mirror schema is updated in lockstep with any selector schema change → grep-proof that both files carry the same evidence-key name.

## Files to Touch

- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add ≥6 new tests)
- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (conditionally modify — if §4's rename path is taken, update `mysteryPolicyRejectedSample`'s evidence-key name)
- `tools/world-mcp/src/context-packet/shared.ts` (conditionally modify — mirror the evidence-key rename if taken)
- `tools/world-mcp/README.md` (conditionally modify — update any textual reference to the evidence-key name)
- `docs/MACHINE-FACING-LAYER.md` (conditionally modify — update the `select_storylet_candidates` row if the evidence-key name is referenced)

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
4. New test asserts the `mystery_policy_rejected_samples[i].evidence` field accurately names its content (either renamed per §4 option a, OR an assertion-with-comment per option b explaining the field carries `allowed_authority`).
5. Existing tests in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` continue to pass; if §4 option a is taken, the existing test's `forbidden_mystery_resolutions` assertion is updated to the new key name.
6. If §4 option a is taken: `tools/world-mcp/src/context-packet/shared.ts` mirror is updated; grep proves no stale `forbidden_mystery_resolutions` reference remains in `tools/world-mcp/` or `docs/MACHINE-FACING-LAYER.md`.

### Invariants

1. Defensive paths in `loadParentPage` are mechanically asserted; a regression that removes defaulting and lets a malformed snapshot raise an exception fails the relevant test.
2. The `sourceRecordIdRejectionSample` second branch is reachable by at least one fixture; a regression that drops the branch (e.g., merging it into the first branch's logic) fails the dedicated test.
3. The `record_not_found` error contract for `parent_page_id` is asserted at the unit-test layer (not only via integration / smoke).
4. If §4 option a is taken: the evidence-key naming reflects actual content; only one name exists across selector + context-packet mirror + docs.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify) — add six focused boundary tests; introduce dedicated fixture-builder helpers per boundary class (e.g., `buildGlobalPoolStoryLocalRefWorld`, `buildMalformedSnapshotWorld`).

### Commands

1. Pre-implementation grep: `rg -n "forbidden_mystery_resolutions" tools/ docs/ .claude/` to enumerate consumers before deciding §4's rename-vs-document path.
2. `cd tools/world-mcp && npm test` — full suite passes including the new boundary tests.
3. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/select-storylet-candidates.test.js` — focused compiled proof.

## Outcome

(To be populated post-implementation.)

## Verification Result

(To be populated post-implementation.)
