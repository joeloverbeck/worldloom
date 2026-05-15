# SPEC29LEGTOOVOC-003: Retire `arc_trace_record` legacy-rejection surfaces in validators, patch-engine, and hooks

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` and `tools/validators/tests/fixtures/story-storylet-complete.yaml` deleted; `tools/patch-engine/src/ops/update-record-field.ts` drops three legacy field-path branches; `tools/patch-engine/tests/integration/create-bel-record.test.ts` loses one sub-test; `tools/hooks/tests/hook3-guard-direct-edit.test.ts` swaps an ARCTRACE-0001 path for another story-source path.
**Deps**: None

## Problem

Three packages carry `arc_trace_record` legacy-rejection surfaces that the spec's D4 names partially (validators test + fixture + create-bel-record sub-test) and Issue 2 (codebase validation 2026-05-15) extended to cover the full surface in those packages (patch-engine's `update-record-field` arc_trace field-path branches; hooks' `hook3-guard-direct-edit` ARCTRACE path coverage). These surfaces are all independent of world-mcp and world-index — they're legacy-rejection sentinels asserting that the SPEC-22 ARC vocabulary is no longer accepted.

Per SPEC-29 §"Key design decisions": these sentinel surfaces are retired because the JSON schemas' `additionalProperties: false` posture structurally rejects unknown fields generically; patch-engine's op-kind enum likewise rejects unknown op kinds without per-op-kind name matching; hook3's pattern coverage is exercised by other story-source paths. Named-token rejection is reverse coupling to a vocabulary the cleanup is trying to forget.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` exists; `tools/validators/tests/fixtures/story-storylet-complete.yaml` exists and carries 5 instances of retired vocabulary tokens (`commitment_class: offer_practical_help` plus surrounding `commitment_family`/etc. fields, verified by `grep -cE` at codebase validation 2026-05-15). `tools/patch-engine/src/ops/update-record-field.ts:157, 162` carries three legacy field-path branches (`arc_trace_emitted`, `arc_trace_id`, `arc_trace_evidence_alignment`). `tools/patch-engine/tests/integration/create-bel-record.test.ts:59-69` carries the `create_arc_trace_record is rejected by envelope validation` sub-test. `tools/hooks/tests/hook3-guard-direct-edit.test.ts:117-126` uses `ARCTRACE-0001.yaml` (under `stories/marla-kern-seduction/_source/arc-traces/`) as one of the test paths asserting hook3's direct-edit blocking.
2. **Spec/docs reality**: SPEC-29 §4 names the validators test file deletion, the fixture deletion, and the create-bel-record sub-test deletion. Issue 2 from /spec-to-tickets Step 2 (2026-05-15) added the patch-engine `update-record-field.ts` field-path branches and the hook3-guard-direct-edit ARCTRACE path; both were dispositioned **expand-scope-in-place**.
3. **Shared boundary under audit**: each surface is self-contained — the validators record-schema-compliance test exercises only the validators package; the fixture is consumed only by that test (verified at codebase validation: `grep -rn "story-storylet-complete.yaml" tools/` returns hits only in `record-schema-compliance-arc.test.ts`); the patch-engine field-path branches are evaluated only by `update-record-field`; the hook3 test exercises only the hook3 binary. No cross-package dep needs synchronization, which is why this ticket carries `Deps: None`.
4. **Coverage non-regression (per Rule 5 — No Consequence Evasion)**: SPEC-29 §Risks point 4 raises whether deleting `record-schema-compliance-arc.test.ts` removes the prohibition coverage. Answer: the generic `additionalProperties: false` coverage in `tools/validators/src/schemas/story-storylet.schema.json` plus the sibling `tools/validators/tests/structural/record-schema-compliance.test.ts` provide schema-level rejection coverage that does not depend on named-token tests. Verify at implementation time by inspection: `record-schema-compliance.test.ts` must exercise at least one schema with `additionalProperties: false` so that the generic rejection path is asserted post-deletion; if not, surface as a follow-up before deletion.
5. **Removal blast radius**: pipeline-wide grep for `arc_trace_emitted|arc_trace_evidence_alignment` returns hits only in `update-record-field.ts:157, 162`; pipeline-wide grep for `arc_trace_id` returns hits in `update-record-field.ts:157` and in world-index sources (those land in SPEC29LEGTOOVOC-004). Validators-lane consumers of the deleted fixture: confirmed at codebase validation that only `record-schema-compliance-arc.test.ts` consumes `story-storylet-complete.yaml`.

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the three legacy-rejection surfaces in one diff — independent of world-mcp's `list-records.ts` retirement and world-index's schema retirement — keeps each package's cleanup auditable as a local change. The alternative (folding into SPEC29LEGTOOVOC-002 or SPEC29LEGTOOVOC-004) would couple legacy-rejection cleanup to surfaces with non-trivial mid-flow states; isolating it here makes the ticket reviewable as "three packages, five files, all self-contained."
2. **No backwards-compatibility shims**: the three field-path branches in `update-record-field.ts` are deleted, not aliased; the validators test file is deleted, not kept as an `it.skip`; the hook3 test path is swapped, not retained with both ARCTRACE + replacement.

## Verification Layers

1. **Invariant: zero `arc_trace_emitted` / `arc_trace_evidence_alignment` field-path branches remain in patch-engine src** → `grep -nE "arc_trace_emitted|arc_trace_evidence_alignment" tools/patch-engine/src/` returns no hits. (Note: `arc_trace_id` is also removed from patch-engine src; the broader world-index `arc_trace_id` schema field is retired in SPEC29LEGTOOVOC-004.)
2. **Invariant: validators + patch-engine + hooks test lanes pass without legacy-rejection sentinel coverage** → `cd tools/validators && npm test`; `cd tools/patch-engine && npm test`; hooks lane verified per the project's hooks-test command (verify at implementation time — see Test Plan §Commands). Generic schema-rejection coverage in `record-schema-compliance.test.ts` continues to exercise `additionalProperties: false`.
3. **Invariant: deleted fixture has no remaining consumer** → `grep -rn "story-storylet-complete.yaml" tools/` returns no hits after the test file is deleted.
4. **Invariant: hook3's direct-edit blocking is still test-backed for at least one story-source path** → the substituted path in `hook3-guard-direct-edit.test.ts:117-126` is a valid `_source/<subdir>/<RECORD-ID>.yaml` story-bundle path the hook is expected to block; this preserves the test's invariant under a non-retired record class.

## What to Change

### 1. Delete the validators-lane record-schema-compliance-arc test and its fixture

`tools/validators/tests/structural/record-schema-compliance-arc.test.ts`:
- Delete the entire file. The named-token rejection it asserted (`record_schema_compliance rejects legacy v2 scene-commitment storylets`) is subsumed by the generic `additionalProperties: false` coverage in `record-schema-compliance.test.ts` (sibling file in the same directory).

`tools/validators/tests/fixtures/story-storylet-complete.yaml`:
- Delete the entire file. This fixture is consumed only by the test deleted above (verified at codebase validation: `grep -rn "story-storylet-complete.yaml" tools/` returns hits only in `record-schema-compliance-arc.test.ts`). The fixture contains legacy vocabulary tokens (`commitment_class`, `commitment_family`, etc.) and exists solely as input to the test asserting their rejection.

### 2. Drop legacy field-path branches from patch-engine's update-record-field op

`tools/patch-engine/src/ops/update-record-field.ts`:
- Remove the `arc_trace_emitted` / `arc_trace_id` field-path branch at L157 (`return fieldPath[1] === "arc_trace_emitted" || fieldPath[1] === "arc_trace_id";`).
- Remove the `arc_trace_evidence_alignment` branch at L162 (`fieldPath[1] === "arc_trace_evidence_alignment"`).
- The surrounding update-record-field dispatch structure (the function determining whether a field-path is legal for the addressed record class) stays; only these three named-token branches are removed.

### 3. Drop the legacy create_arc_trace_record sub-test from create-bel-record

`tools/patch-engine/tests/integration/create-bel-record.test.ts`:
- Remove the `create_arc_trace_record is rejected by envelope validation` test at L59-69 (the entire `test(...)` block, including the envelope payload with `op: "create_arc_trace_record"` + the ARCTRACE-0001 record placeholder). Surrounding tests for the legitimate `create_belief_record` envelope stay; envelope-validation coverage for unknown op kinds is preserved by other tests in the same file or sibling integration tests.

### 4. Swap the ARCTRACE-0001 test path in hook3-guard-direct-edit

`tools/hooks/tests/hook3-guard-direct-edit.test.ts`:
- At L117 + L126 (the `ARCTRACE-0001.yaml` path under `stories/marla-kern-seduction/_source/arc-traces/`), swap for any other `_source/<subdir>/<RECORD-ID>.yaml` story-source path that hook3 is expected to block. Recommended substitute: `stories/marla-kern-seduction/_source/storylets/SLT-0001.yaml` or `stories/marla-kern-seduction/_source/pages/PG-0001.yaml`. The test asserts hook3 BLOCKS the write; the substitute path must be one hook3 covers under its `_source/*/` block pattern. Confirm at implementation time by inspecting `tools/hooks/src/hook3.ts` (or wherever the hook's blocking patterns are defined) for the regex covering story-source `_source/<subdir>/` paths, and update the assertion's path-match regex at L126 in lockstep.

## Files to Touch

- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (delete)
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` (delete)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify)
- `tools/patch-engine/tests/integration/create-bel-record.test.ts` (modify)
- `tools/hooks/tests/hook3-guard-direct-edit.test.ts` (modify)

## Out of Scope

- World-mcp surface (`list-records.ts`, `_shared.ts`, all world-mcp tests, `spec22-capstone.test.ts`) — routed to SPEC29LEGTOOVOC-002.
- World-index schema/parser/indexer/migration/CLI — routed to SPEC29LEGTOOVOC-004.
- Vocabulary classes (`commitment_family` et al.) — routed to `archive/tickets/SPEC29LEGTOOVOC-001.md`.
- Documentation surfaces — routed to SPEC29LEGTOOVOC-005.
- Replacing the deleted fixture with a new clean-vocabulary fixture: not needed — the deleted test was the only consumer.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes; the generic `record-schema-compliance.test.ts` continues to exercise `additionalProperties: false` rejection on at least one storylet schema (verify at implementation time per Assumption Reassessment item 4).
2. `cd tools/patch-engine && npm test` passes; `create-bel-record.test.ts` exercises the surviving belief-record envelope path.
3. The hooks lane's hook3-guard-direct-edit test passes (run via the project's hooks-test command); `hook3-guard-direct-edit.test.ts` exercises the substituted story-source path.
4. `grep -nE "arc_trace_emitted|arc_trace_evidence_alignment" tools/patch-engine/src/` returns no hits.
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
3. `tools/patch-engine/tests/integration/create-bel-record.test.ts` — modify per Change 3; surrounding tests stay.
4. `tools/hooks/tests/hook3-guard-direct-edit.test.ts` — modify per Change 4; substituted path exercises the same blocking pattern under a non-retired record class.

### Commands

1. `cd tools/validators && npm test`
2. `cd tools/patch-engine && npm test`
3. Hooks lane test command — verify at implementation time per SPEC-29 §Verification's "or equivalent test commands; verify at ticket time" provision; if `tools/hooks/package.json` has no `test` script, run `node --test tests/hook3-guard-direct-edit.test.ts` against the built artifact or follow the project's documented hooks-test pattern.
