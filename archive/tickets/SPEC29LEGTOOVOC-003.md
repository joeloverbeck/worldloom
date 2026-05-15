# SPEC29LEGTOOVOC-003: Retire `arc_trace_record` legacy-rejection surfaces in validators, patch-engine, and hooks

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` and `tools/validators/tests/fixtures/story-storylet-complete.yaml` deleted; `tools/patch-engine/src/ops/update-record-field.ts` drops three legacy field-path branches; `tools/patch-engine/tests/ops/update-record-field.test.ts` drops the same stale ARC field-path fixture/assertions; `tools/patch-engine/tests/integration/create-bel-record.test.ts` loses one sub-test; `tools/hooks/tests/hook3-guard-direct-edit.test.ts` swaps an ARCTRACE-0001 path for another story-source path; `specs/SPEC-29-legacy-tools-vocabulary-cleanup.md` gets a same-seam implementation note.
**Deps**: None

## Problem

At intake, three packages carried `arc_trace_record` legacy-rejection surfaces that the spec's D4 named partially (validators test + fixture + create-bel-record sub-test) and Issue 2 (codebase validation 2026-05-15) extended to cover the full surface in those packages (patch-engine's `update-record-field` arc_trace field-path branches; hooks' `hook3-guard-direct-edit` ARCTRACE path coverage). These surfaces were all independent of world-mcp and world-index — legacy-rejection sentinels asserting that the SPEC-22 ARC vocabulary is no longer accepted.

Per SPEC-29 §"Key design decisions": these sentinel surfaces are retired because the JSON schemas' `additionalProperties: false` posture structurally rejects unknown fields generically; patch-engine's op-kind enum likewise rejects unknown op kinds without per-op-kind name matching; hook3's pattern coverage is exercised by other story-source paths. Named-token rejection is reverse coupling to a vocabulary the cleanup is trying to forget.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality at intake**: `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` existed; `tools/validators/tests/fixtures/story-storylet-complete.yaml` existed and carried 5 instances of retired vocabulary tokens (`commitment_class: offer_practical_help` plus surrounding `commitment_family`/etc. fields, verified by `grep -cE` at codebase validation 2026-05-15). `tools/patch-engine/src/ops/update-record-field.ts` carried three legacy field-path branches (`arc_trace_emitted`, `arc_trace_id`, `arc_trace_evidence_alignment`). `tools/patch-engine/tests/integration/create-bel-record.test.ts` carried the `create_arc_trace_record is rejected by envelope validation` sub-test. `tools/hooks/tests/hook3-guard-direct-edit.test.ts` used `ARCTRACE-0001.yaml` (under `stories/marla-kern-seduction/_source/arc-traces/`) as one of the test paths asserting hook3's direct-edit blocking.
2. **Spec/docs reality**: SPEC-29 §4 names the validators test file deletion, the fixture deletion, and the create-bel-record sub-test deletion. Issue 2 from /spec-to-tickets Step 2 (2026-05-15) added the patch-engine `update-record-field.ts` field-path branches and the hook3-guard-direct-edit ARCTRACE path; both were dispositioned **expand-scope-in-place**.
3. **Shared boundary under audit**: each surface is self-contained — the validators record-schema-compliance test exercises only the validators package; the fixture is consumed only by that test (verified at codebase validation: `grep -rn "story-storylet-complete.yaml" tools/` returns hits only in `record-schema-compliance-arc.test.ts`); the patch-engine field-path branches are evaluated only by `update-record-field`; the hook3 test exercises only the hook3 binary. No cross-package dep needs synchronization, which is why this ticket carries `Deps: None`.
4. **Coverage non-regression (per Rule 5 — No Consequence Evasion)**: SPEC-29 §Risks point 4 raises whether deleting `record-schema-compliance-arc.test.ts` removes the prohibition coverage. Answer: the generic `additionalProperties: false` coverage in `tools/validators/src/schemas/story-storylet.schema.json` plus the sibling `tools/validators/tests/structural/record-schema-compliance.test.ts` provide schema-level rejection coverage that does not depend on named-token tests. Implementation verified this through the validators package test lane; `record-schema-compliance.test.ts` still exercises `record_schema_compliance.additionalProperties`, including storylet-specific legacy-field rejection.
5. **Removal blast radius at intake**: pipeline-wide grep for `arc_trace_emitted|arc_trace_evidence_alignment` returned hits only in patch-engine source/tests and historical/spec/ticket prose; pipeline-wide grep for `arc_trace_id` returned same-seam patch-engine hits plus world-index sources (those land in SPEC29LEGTOOVOC-004). Validators-lane consumers of the deleted fixture were limited to `record-schema-compliance-arc.test.ts`; the final `story-storylet-complete.yaml` consumer grep over `tools/` is clean.
6. **Implementation reassessment (2026-05-15)**: live grep found same-seam patch-engine test fallout not listed above: `tools/patch-engine/tests/ops/update-record-field.test.ts` embeds `arc_trace_evidence_alignment`, `arc_trace_emitted`, and `arc_trace_id` in its PG fixture and exercises `["state_snapshot", "arc_trace_emitted"]` as an allowed prose-finalize transition. Because deleting the source branches would make that test stale, this ticket absorbs the test update inside the same `update_record_field` seam.
7. **HARD-GATE-facing read**: `docs/HARD-GATE-DISCIPLINE.md` was read because `update_record_field` is part of the patch-engine path used by `validate_patch_plan` / `submit_patch_plan`. This run changes only which legacy PG fields bypass retcon attestation; it does not submit or mutate world content.
8. **Package/docs surface check**: `tools/patch-engine/README.md`, `tools/validators/README.md`, and `tools/hooks/README.md` were inspected. They document package purposes, command surfaces, and hook3's generic `_source/*.yaml` blocking behavior, but do not name the retired ARC fixture/test surfaces; no README edit is required.

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the three legacy-rejection surfaces in one diff — independent of world-mcp's `list-records.ts` retirement and world-index's schema retirement — keeps each package's cleanup auditable as a local change. The alternative (folding into SPEC29LEGTOOVOC-002 or SPEC29LEGTOOVOC-004) would couple legacy-rejection cleanup to surfaces with non-trivial mid-flow states; isolating it here makes the ticket reviewable as "three packages, five files, all self-contained."
2. **No backwards-compatibility shims**: the three field-path branches in `update-record-field.ts` are deleted, not aliased; the validators test file is deleted, not kept as an `it.skip`; the hook3 test path is swapped, not retained with both ARCTRACE + replacement.

## Verification Layers

1. **Invariant: zero `arc_trace_emitted` / `arc_trace_evidence_alignment` field-path branches remain in patch-engine src or tests** → `grep -nE "arc_trace_emitted|arc_trace_evidence_alignment" tools/patch-engine/src/ tools/patch-engine/tests/` returns no hits. (Note: `arc_trace_id` is also removed from the patch-engine source/test seam; broader world-index `arc_trace_id` schema fields are retired in SPEC29LEGTOOVOC-004.)
2. **Invariant: validators + patch-engine + hooks test lanes pass without legacy-rejection sentinel coverage** → `cd tools/validators && npm test`; `cd tools/patch-engine && npm test`; `cd tools/hooks && npm test`. Generic schema-rejection coverage in `record-schema-compliance.test.ts` continues to exercise `additionalProperties: false`.
3. **Invariant: deleted fixture has no remaining consumer** → `grep -rn "story-storylet-complete.yaml" tools/` returns no hits after the test file is deleted.
4. **Invariant: hook3's direct-edit blocking is still test-backed for at least one story-source path** → the substituted path in `hook3-guard-direct-edit.test.ts:117-126` is a valid `_source/<subdir>/<RECORD-ID>.yaml` story-bundle path the hook is expected to block; this preserves the test's invariant under a non-retired record class.

## Landed Changes

### 1. Delete the validators-lane record-schema-compliance-arc test and its fixture

`tools/validators/tests/structural/record-schema-compliance-arc.test.ts`:
- Deleted. The named-token rejection it asserted (`record_schema_compliance rejects legacy v2 scene-commitment storylets`) is subsumed by the generic `additionalProperties: false` coverage in `record-schema-compliance.test.ts` (sibling file in the same directory).

`tools/validators/tests/fixtures/story-storylet-complete.yaml`:
- Deleted. This fixture was consumed only by the test deleted above. The fixture contained legacy vocabulary tokens (`commitment_class`, `commitment_family`, etc.) and existed solely as input to the test asserting their rejection.

### 2. Drop legacy field-path branches from patch-engine's update-record-field op

`tools/patch-engine/src/ops/update-record-field.ts`:
- Removed the `state_snapshot.arc_trace_emitted` / `state_snapshot.arc_trace_id` prose-finalize branch.
- Removed the `deferred_validation_trace.arc_trace_evidence_alignment` prose-finalize branch.
- The surrounding update-record-field dispatch structure stayed; only these three named-token branches were removed.

`tools/patch-engine/tests/ops/update-record-field.test.ts`:
- Removed the retired ARC fields from the synthetic PG fixture.
- Removed the assertion that `["state_snapshot", "arc_trace_emitted"]` is an allowed prose-finalize transition.
- Kept coverage for the still-live prose-finalize fields: `prose_path`, `prose_status`, `deferred_validation_trace.prose_ledger_consistency`, and `deferred_validation_trace.prose_critic_8_axis`.

### 3. Drop the legacy create_arc_trace_record sub-test from create-bel-record

`tools/patch-engine/tests/integration/create-bel-record.test.ts`:
- Removed the `create_arc_trace_record is rejected by envelope validation` test block. Surrounding tests for the legitimate `create_belief_record` envelope stayed.

### 4. Swap the ARCTRACE-0001 test path in hook3-guard-direct-edit

`tools/hooks/tests/hook3-guard-direct-edit.test.ts`:
- Swapped the second story-source block assertion from `stories/marla-kern-seduction/_source/arc-traces/ARCTRACE-0001.yaml` to `stories/marla-kern-seduction/_source/storylets/SLT-0002.yaml`. The first storylet path in the same test already proved the generic `_source/*` block pattern; this second path now preserves breadth without retaining ARC vocabulary.

## Files to Touch

- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (delete)
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` (delete)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify)
- `tools/patch-engine/tests/integration/create-bel-record.test.ts` (modify)
- `tools/hooks/tests/hook3-guard-direct-edit.test.ts` (modify)
- `specs/SPEC-29-legacy-tools-vocabulary-cleanup.md` (modify same-seam implementation note)

## Out of Scope

- World-mcp surface (`list-records.ts`, `_shared.ts`, all world-mcp tests, `spec22-capstone.test.ts`) — routed to SPEC29LEGTOOVOC-002.
- World-index schema/parser/indexer/migration/CLI — routed to SPEC29LEGTOOVOC-004.
- Vocabulary classes (`commitment_family` et al.) — routed to `archive/tickets/SPEC29LEGTOOVOC-001.md`.
- Documentation surfaces — routed to SPEC29LEGTOOVOC-005.
- Replacing the deleted fixture with a new clean-vocabulary fixture: not needed — the deleted test was the only consumer.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes; the generic `record-schema-compliance.test.ts` continues to exercise `additionalProperties: false` rejection on at least one storylet schema.
2. `cd tools/patch-engine && npm test` passes; `create-bel-record.test.ts` exercises the surviving belief-record envelope path.
3. The hooks lane's hook3-guard-direct-edit test passes (run via the project's hooks-test command); `hook3-guard-direct-edit.test.ts` exercises the substituted story-source path.
4. `grep -nE "arc_trace_emitted|arc_trace_evidence_alignment" tools/patch-engine/src/ tools/patch-engine/tests/` returns no hits.
5. `test -e tools/validators/tests/structural/record-schema-compliance-arc.test.ts` returns false.
6. `test -e tools/validators/tests/fixtures/story-storylet-complete.yaml` returns false.

### Invariants

1. Generic `additionalProperties: false` rejection coverage in `tools/validators/tests/structural/record-schema-compliance.test.ts` is preserved — named-token rejection coverage is structurally inherited from the schema's posture.
2. Hook3's direct-edit blocking is exercised against a live story-source path post-substitution.
3. Patch-engine's `update-record-field` op exposes no legacy ARC field paths.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` — delete.
2. `tools/validators/tests/fixtures/story-storylet-complete.yaml` — delete (no replacement; consumed only by the deleted test).
3. `tools/patch-engine/tests/ops/update-record-field.test.ts` — modify per Change 2; stale ARC field-path acceptance is removed while surviving prose-finalize fields stay covered.
4. `tools/patch-engine/tests/integration/create-bel-record.test.ts` — modify per Change 3; surrounding tests stay.
5. `tools/hooks/tests/hook3-guard-direct-edit.test.ts` — modify per Change 4; substituted path exercises the same blocking pattern under a non-retired record class.

### Commands

1. `cd tools/validators && npm test`
2. `cd tools/patch-engine && npm test`
3. `cd tools/hooks && npm test`
4. `grep -nE "arc_trace_emitted|arc_trace_evidence_alignment" tools/patch-engine/src/ tools/patch-engine/tests/` returns no hits.

## Outcome

Implemented. The validators ARC sentinel test and its legacy fixture were deleted; patch-engine no longer allows `arc_trace_emitted`, `arc_trace_id`, or `arc_trace_evidence_alignment` as prose-finalize fields; patch-engine tests were truthed to the surviving prose-finalize fields; the named `create_arc_trace_record` rejection sub-test was removed; hook3 now exercises story-source YAML blocking with non-ARC storylet paths. The SPEC-29 implementation note was updated for the completed D4 slice.

## Verification Result

1. `cd tools/validators && npm run clean`
2. `cd tools/validators && npm test` — passed, 213 tests.
3. `cd tools/patch-engine && npm run clean`
4. `cd tools/patch-engine && npm test` — passed, 75 tests.
5. `cd tools/hooks && npm run clean`
6. `cd tools/hooks && npm test` — passed, 18 tests.
7. `if grep -R -n -E "arc_trace_emitted|arc_trace_evidence_alignment" tools/patch-engine/src tools/patch-engine/tests; then exit 1; fi` — passed with no hits.
8. `if grep -R -n "story-storylet-complete.yaml" tools; then exit 1; fi` — passed with no hits.
9. `test ! -e tools/validators/tests/structural/record-schema-compliance-arc.test.ts && test ! -e tools/validators/tests/fixtures/story-storylet-complete.yaml` — passed.

## Deviations

1. The live patch-engine unit test `tools/patch-engine/tests/ops/update-record-field.test.ts` contained same-seam ARC field-path coverage that was not listed in the original ticket. It was absorbed because source removal and truthful package proof require the test fixture/assertions to move together.
2. `docs/HARD-GATE-DISCIPLINE.md` was read because `update_record_field` participates in the patch-engine path used behind HARD-GATE approval, but this ticket did not prepare, approve, or submit a patch plan and did not mutate world content.
3. The explicit SPEC-29 reference was updated with a dated implementation note instead of rewriting the historical broad-scope planning sections. Those older sections remain planning context for active sibling tickets.
