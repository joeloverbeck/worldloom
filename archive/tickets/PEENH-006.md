# PEENH-006: Extend patch-engine `update_record_field` for story-bundle records — staging-cache coverage + bare-id lookup

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/commit/temp-file.ts` (`metadataForTargetRecordId` extension), `tools/patch-engine/src/ops/shared.ts` (`loadExistingRecord` story-bundle-aware lookup), and `tools/patch-engine/src/ops/types.ts` (`StagedRecord.baseline_hash` for same-envelope hash checks). Tests updated in `tools/patch-engine/tests/ops/update-record-field.test.ts` with a harness schema/seed helper update in `tools/patch-engine/tests/harness.ts`. No skill-prose, hook, validator, or world-index schema changes.
**Deps**: `archive/tickets/PEENH-001.md` (introduced story-bundle create ops + Hook 3 coverage, but did not extend `update_record_field` infrastructure to match), `archive/tickets/MCPENH-025.md` (introduced story-bundle indexing with `<storySlug>:<recordId>` node_id form)

## Problem

`update_record_field` is the patch-engine op used to mutate individual fields on existing records (e.g., `prose_status: pending → rendered`, `deferred_validation_trace.<key>: DEFERRED → PASS`). It is the load-bearing op for `branching-story-page-prose-finalize` Phase 7 (per `.claude/skills/branching-story-page-prose-finalize/references/phase-7-engine-submit.md`), and for any future skill that transitions PG / OBL / THR / STINT state fields without superseding the whole record.

At intake, PEENH-001 had added engine create-ops for every story-bundle record class (`create_pg_record`, `create_se_record`, …, `create_arc_trace_record`, `append_story_diegetic_artifact_record`) and extended Hook 3 to block direct writes under `worlds/<slug>/stories/<slug>/_source/`. It had not extended the `update_record_field` machinery to handle story-bundle records, leaving two paired gaps:

**Gap 1 — intake defect: `metadataForTargetRecordId` regex set was world-canon-only.** Before this ticket, `tools/patch-engine/src/commit/temp-file.ts` matched CF / CH / INV / M / OQ / ENT / SEC record-id patterns and returned `null` for everything else. The `stagedRecord` cache in `stageAllOps` was populated only when `metadataForTargetRecordId` returned a non-null `{ nodeId, nodeType }`. For story-bundle records — whether expressed bare (`PG-0001`) or namespaced (`red-bunny:PG-0001`) — the regex returned null, so the staging cache was never populated, so subsequent ops on the same record in the same envelope read the unmodified file from disk (via `loadExistingRecord` → SQL → readFile). The mutations from prior ops were silently lost because `replaceStagedWrite` collapses staged writes by `target_file_path` and keeps only the last one. Result: a multi-op envelope on the same story-bundle file produced one mutation (the last op's), not N.

**Gap 2 — intake defect: `loadExistingRecord` SQL used bare `node_id` only.** Before this ticket, `tools/patch-engine/src/ops/shared.ts` queried `SELECT … FROM nodes WHERE world_slug = ? AND node_id = ?` with `params.targetRecordId` passed through directly. The world-index stores story-bundle records with namespaced node_ids (`<storySlug>:<recordId>`) per `tools/world-index/src/parse/atomic.ts` (`storyNodeId(spec.storySlug, authoredId)`), so bare `target_record_id: "PG-0001"` returned `record_not_found`. The skill reference docs (e.g., `.claude/skills/branching-story-page-prose-finalize/references/phase-7-engine-submit.md`: *"Each op carries `target_record_id: PG-NNNN`"*) document the bare form as the convention, so this gap surfaced as a contract mismatch — skill docs and test harness used bare IDs, but production indexer namespaces.

Historical intake evidence: both gaps surfaced in the same session. A `branching-story-page-prose-finalize` re-run on `worlds/erotica-world/stories/red-bunny/PG-0001` first failed with `record_not_found` on bare `target_record_id: "PG-0001"`, then on retry with namespaced `"red-bunny:PG-0001"` returned `{ ok: true, files_written: [{ prior_hash == new_hash, ops_applied: 1 }] }` for the PG record — the engine claimed success but the file was byte-identical to the prior version because the chained update ops had collapsed.

## Assumption Reassessment (2026-05-11)

1. **Codebase reassessment.** At intake, `tools/patch-engine/src/commit/temp-file.ts` `metadataForTargetRecordId` covered `^CF-\d{4}$`, `^CH-\d{4}$`, `^INV-\d+$`, `^M-\d+$`, `^OQ-\d{4}$`, `^ENT-\d{4}$`, `^SEC-[A-Z]{3}-\d{3}$` only — no story-bundle patterns. At intake, `tools/patch-engine/src/ops/shared.ts` `loadExistingRecord` queried only `node_id = ?` with the verbatim `targetRecordId`. Verified `tools/world-index/src/parse/atomic.ts` and `tools/world-index/src/index/nodes.ts` both define `storyNodeId(storySlug, recordId)` = `${storySlug}:${recordId}` and apply it for all story-bundle record classes at index time. Verified `tools/patch-engine/src/envelope/schema.ts` `update_record_field` payload has `target_record_id: string` and `field_path: string[]` but no `story_slug`. At intake, `tools/patch-engine/tests/ops/update-record-field.test.ts` seeded the test world with bare `"PG-0001"` node_id, so the test harness did not exercise the namespaced production form.

2. **Doc reassessment.** `.claude/skills/branching-story-page-prose-finalize/references/phase-7-engine-submit.md` (the load-bearing skill prose for this surface) and the live `.claude/skills/branching-story-page-cycle/SKILL.md` Phase 11 prose document bare `target_record_id: PG-NNNN` as the convention. `docs/HARD-GATE-DISCIPLINE.md` and `docs/MACHINE-FACING-LAYER.md` describe the engine's record-id semantics generically without disambiguating bare vs namespaced. With this ticket complete and the engine accepting bare form for story-bundle records, the skill docs are correct; no skill-prose update needed. Per Shape B audit boundary, any skill-prose adjustment still required after this ticket routes through `/skill-audit` separately.

3. **Cross-skill shared boundary under audit.** The boundary is the `update_record_field` op payload schema (`tools/patch-engine/src/envelope/schema.ts:167-175`) and its companion `loadExistingRecord` + `stagedRecords`-cache semantics in `tools/patch-engine/src/ops/shared.ts` and `tools/patch-engine/src/commit/temp-file.ts`. Producers: `branching-story-page-prose-finalize` (5 ops per finalize), `branching-story-page-cycle` (any single-page update via supersession on existing OBL / THR / STINT fields — see its references/record-schemas.md), and future skills that need transitional-field-flip semantics on story-bundle records. The shared contract is "`target_record_id` accepts the bare form `<PREFIX>-NNNN`; the engine resolves `story_slug` internally for story-bundle records." This ticket makes the contract structurally true.

4. **FOUNDATIONS principle motivating this ticket.** `docs/FOUNDATIONS.md` §Tooling Recommendation: *"LLM agents should never operate on prose alone … the documented context-packet + targeted-retrieval pattern."* §Machine-Facing Layer §3 (Patch Engine): *"All `_source/` writes route through `mcp__worldloom__submit_patch_plan`."* Story-bundle `_source/` is engine-routed (PEENH-001 added the create-ops and Hook 3 coverage); `update_record_field` is part of the engine's vocabulary for those same surfaces. At intake, multi-op envelopes silently collapsed to single-op writes on story-bundle records, violating the engine's "mutations apply atomically as a single transaction" implicit contract (per FOUNDATIONS §Machine-Facing Layer §3 prose), because callers reasonably assume every op in their envelope is applied independently. This ticket restores that invariant for the story-bundle record classes PEENH-001 introduced.

5. **Adjacent contradictions uncovered during reassessment.** (a) The pre-ticket test harness seeded bare `"PG-0001"` node_id rows and passed existing tests, but the production index emits namespaced node_ids per `tools/world-index/src/parse/atomic.ts`. The test path did not exercise the production form. This was required consequence fallout and is fixed by the new namespaced seed coverage. (b) Skill reference docs document bare form; this is resolved transitively because the completed engine accepts bare form. (c) The `file_versions` table reported a stale row for `PG-0001.yaml` in the session and `node tools/world-index/dist/src/cli.js sync --world erotica-world --force` did NOT refresh it; root cause is unclear (the `--force` flag is not a documented sync option per `tools/world-index/src/cli.ts:80-100`'s `parseArgs` config, so it was likely a silent no-op compounded with a separate sync-doesn't-refresh-drifted-rows condition that needs a focused investigation). Classified as a separate future-cleanup ticket if it recurs — NOT a required consequence of this ticket because the symptom self-resolved when the file mutated via successful single-op envelopes, and the root-cause uncertainty makes a "fix X" ticket premature.
6. **Final reassessment correction.** The ticket-cited page-cycle reference path `.claude/skills/branching-story-page-cycle/references/phase-11-engine-submit-and-markdown-writes.md` is not present in the live repo; the current authority is `.claude/skills/branching-story-page-cycle/SKILL.md` Phase 11 plus the current page-cycle references. That did not change implementation scope because the active engine contract remains bare `target_record_id: PG-NNNN` for finalize/page-cycle consumers. The live package test script does not support the drafted `npm test -- update-record-field` filter as a narrow file lane; the truthful targeted proof is `npm run build` followed by `node --test dist/tests/ops/update-record-field.test.js` from `tools/patch-engine/`.

## Architecture Check

1. **Engine-side fix is cleaner than skill-docs update everywhere.** The alternative — updating every skill reference doc that mentions `target_record_id` to specify the namespaced form for story-bundle records, plus updating any in-flight tickets and test harness to match — propagates the indexer's internal namespacing into every caller's mental model. The cleaner architecture: the engine's `update_record_field` op accepts the bare `<PREFIX>-NNNN` form for all record classes (matching `create_*_record` ops which already take bare IDs in `payload.record.id`), and resolves the namespacing internally by consulting the `nodes` table with both bare and `<storySlug>:<recordId>` candidates. Callers — skill prose, test harness, future operators — see one consistent interface.

2. **No backwards-compatibility shims.** At intake, story-bundle records could not be updated through the documented bare-form path (`record_not_found`); namespaced form worked but was undocumented. This ticket establishes bare form as the working contract. No deprecation cycle is needed because no caller had come to rely on the namespaced form as a stable API (the only known namespaced-form caller was the in-session workaround that this audit closed out).

## Verification Layers

1. **Invariant: chained `update_record_field` ops on the same story-bundle record in one envelope each produce a distinct mutation that lands in the final file.** → `tools/patch-engine/tests/ops/update-record-field.test.ts` (new test: seed a story-bundle PG record with namespaced node_id `"red-bunny:PG-0001"` and `file_path: "stories/red-bunny/_source/pages/PG-0001.yaml"`; submit a 3-op envelope that sets `prose_path`, then `prose_status`, then `deferred_validation_trace.prose_ledger_consistency` with bare `target_record_id: "PG-0001"`; assert the final file has all three field changes).
2. **Invariant: bare `target_record_id: "PG-NNNN"` resolves to the namespaced indexed record for story-bundle classes.** → `tools/patch-engine/tests/ops/update-record-field.test.ts` (new test: same seed as above; submit a 1-op envelope with bare `target_record_id: "PG-0001"`; assert the op succeeds and the field is mutated).
3. **Invariant: `metadataForTargetRecordId` returns a non-null `{ nodeId, nodeType }` for every story-bundle record class (PG, SE, SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, BR, CHC, STENT, ARCTRACE, DA) in both bare and namespaced form.** → codebase review: `tools/patch-engine/src/commit/temp-file.ts` derives `STORY_BUNDLE_NODE_TYPE_BY_PREFIX` from `STORY_RECORD_SPECS` and applies `STORY_BUNDLE_ID_PATTERN` to both bare and optional-story-slug-prefixed ids.
4. **Invariant: world-canon ID coverage in `metadataForTargetRecordId` is unchanged.** → existing tests in `tools/patch-engine/tests/ops/update-record-field.test.ts:7-71` continue to pass without modification (CF/CH/INV/M/OQ/ENT/SEC paths regression-protected).

## Landed Changes

### 1. Extend `metadataForTargetRecordId` for story-bundle records

`tools/patch-engine/src/commit/temp-file.ts` now recognizes both bare and namespaced story-bundle record IDs for every story record class. The prefix-to-node-type map is derived from `STORY_RECORD_SPECS`, so create-op metadata and staged-update metadata share one source for the story record vocabulary. The staging cache still keys by the caller's `target_record_id`, which preserves consistent-form same-envelope chaining.

### 2. Extend `loadExistingRecord` for bare story-bundle IDs

`tools/patch-engine/src/ops/shared.ts` now resolves a bare story-bundle target by first trying the exact `node_id`, then falling back to a story-scoped query for namespaced rows whose `node_id` ends in `:<recordId>` and whose `story_slug` is non-null. A single match is used; multiple matches return a `record_not_found`-class ambiguity message naming the matching namespaced IDs and instructing the operator to use the namespaced form.

The same-envelope staged overlay now preserves a `baseline_hash` so multiple update ops can all carry the original pre-envelope `expected_content_hash` while reading the staged record produced by prior ops.

### 3. Update `tools/patch-engine/tests/ops/update-record-field.test.ts`

`tools/patch-engine/tests/ops/update-record-field.test.ts` now covers:

- bare `target_record_id: "PG-0001"` resolving a production-shaped namespaced index row;
- a three-op same-envelope story-bundle update accumulating every mutation into one staged write;
- existing PG transitional-field and retcon-attestation tests using production-shaped namespaced seed rows.

`tools/patch-engine/tests/harness.ts` now models the `nodes.story_slug` column and can seed story-scoped rows.

### 4. (Optional, deferred) Investigate `file_versions` staleness behavior

A separate uncertainty surfaced during the audit session (see Assumption Reassessment item 5(c)). NOT part of this ticket's scope. File as a separate MCPENH ticket if the staleness recurs after this PEENH ticket lands.

## Files to Touch

- `tools/patch-engine/src/commit/temp-file.ts` (modify — extend `metadataForTargetRecordId`)
- `tools/patch-engine/src/ops/shared.ts` (modify — extend `loadExistingRecord` for bare story-bundle IDs)
- `tools/patch-engine/src/ops/types.ts` (modify — add staged-record baseline hash)
- `tools/patch-engine/tests/harness.ts` (modify — support story-scoped test index rows)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify — add multi-op chaining test + bare-id resolution test; update existing PG transitional-fields test to use namespaced seed form)

## Out of Scope

- Skill reference doc updates (`branching-story-page-prose-finalize/references/phase-7-engine-submit.md`, live page-cycle Phase 11 prose). These are resolved transitively by the completed engine behavior because the bare form they document now works. Route any residual skill-prose adjustment through `/skill-audit`.
- Adding `story_slug` to `update_record_field` payload schema. Optional; defer unless multi-bundle-same-world ambiguity surfaces as a real session pattern.
- Investigating `file_versions` staleness behavior. Separate concern; file an MCPENH ticket if it recurs after this lands.
- Engine support for story-bundle records in other ops beyond `update_record_field` (e.g., `append_extension`, `append_modification_history_entry`, `remove_ch_affected_cf_ids`). Those ops are world-canon-only by design at intake; revisit if a future story-bundle skill needs them.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/patch-engine/`, then `node --test dist/tests/ops/update-record-field.test.js` — both new tests (multi-op chaining + bare-id resolution) pass; existing tests (world-canon CF / CH ops, PG transitional-fields with updated seed form) continue to pass.
2. `npm test` from `tools/patch-engine/` (full integration test suite) passes.
3. Manual integration remains a downstream operational smoke, not run in this implementation turn: a fresh re-invocation of `branching-story-page-prose-finalize` on a `prose_status: pending` story-bundle page should emit a single 5-op envelope, and the rendered PG-NNNN.yaml should have every transitional field flipped. The package tests prove the engine invariant without mutating a live story bundle.

### Invariants

1. **Multi-op `update_record_field` envelopes on story-bundle records accumulate mutations correctly.** Each op reads the in-envelope-staged record state (not the unmodified file), applies its mutation, restages. The final commit writes a single file containing every mutation. Verified via Test 1.
2. **Bare `target_record_id` form is the canonical API for `update_record_field` across all record classes (world-canon + story-bundle).** The engine resolves story-bundle namespacing internally. Verified via Test 2.
3. **`metadataForTargetRecordId` returns metadata for every recognized record class, ensuring `stagedRecords` cache is populated for chained-op envelopes.** Verified via codebase grep-proof of the extended pattern set.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/update-record-field.test.ts` — new test "update_record_field chains mutations on a story-bundle page across multiple ops" exercising the staging-cache fix (Gap 1).
2. `tools/patch-engine/tests/ops/update-record-field.test.ts` — new test "update_record_field accepts bare story-bundle ids and resolves to the namespaced indexed record" exercising the SQL-lookup fix (Gap 2).
3. `tools/patch-engine/tests/ops/update-record-field.test.ts` — modify the existing PG prose-finalize transitional-field and unrelated-PG-field attestation tests to use namespaced seed rows and run the assertions against bare `target_record_id: "PG-0001"`. This makes the existing story-bundle update tests production-shaped.

### Commands

1. `cd tools/patch-engine && npm run build`
2. `cd tools/patch-engine && node --test dist/tests/ops/update-record-field.test.js`
3. `cd tools/patch-engine && npm test`

## Outcome

Completed on 2026-05-11. `update_record_field` now accepts bare story-bundle record IDs against production-shaped namespaced world-index rows, and chained updates on the same story-bundle record accumulate in a single staged write instead of collapsing to the last mutation. The patch-engine test harness now reflects `nodes.story_slug`, and the update-record-field tests cover both the bare-ID lookup path and same-envelope staged-cache path.

## Verification Result

Passed on 2026-05-11:

1. `npm run build` from `tools/patch-engine/`.
2. `node --test dist/tests/ops/update-record-field.test.js` from `tools/patch-engine/` — 6 tests passed.
3. `npm test` from `tools/patch-engine/` — build plus 69 tests passed.
4. Manual code review: `metadataForTargetRecordId` derives story prefix coverage from `STORY_RECORD_SPECS` and accepts both bare and namespaced forms for PG, SE, SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, BR, CHC, STENT, ARCTRACE, and DA.

## Deviations

- The drafted targeted command `npm test -- update-record-field` is not the truthful package-local narrow lane because the package script wraps build plus `node --test dist/tests/**/*.test.js`; the completed targeted proof used `npm run build` followed by `node --test dist/tests/ops/update-record-field.test.js`.
- The drafted representative `validate-patch-plan.js <path-to-test-envelope.json>` and live `branching-story-page-prose-finalize` manual smoke were not run. The implemented package tests use temp-seeded indexed worlds and exercise the same patch-engine staging/lookup invariant without mutating live `worlds/<slug>/stories/<story-slug>/_source/` content.
- The optional `story_slug` payload field was not added. Ambiguous bare IDs across multiple story bundles now return an ambiguity diagnostic that instructs callers to use the namespaced form.
