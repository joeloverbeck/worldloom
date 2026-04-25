# SPEC14PAVOC-002: Patch Engine Update — Adjudication Field Rename, Verdict Enum, Bidirectional touched_by_cf, OQ Allocation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine/` (`AdjudicationFrontmatter` interface; `append_adjudication_record` op; staging overlay in `commit/temp-file`; `append_touched_by_cf` and section-target `append_extension` gain bidirectional checks + new error code `required_world_updates_mismatch`; OQ allocation pre-flight in adjudication submit path; `canonicalOpHash` public export for approval-token/cross-package proof); `tools/validators/` adds the SPEC-14 engine-emitted PA roundtrip test.
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-003.md` (engine imports `VERDICT_ENUM` from shared canonical-vocabularies module)

## Problem

At intake, per SPEC-14, the patch engine:
- Emits adjudications with frontmatter field `id` (not `pa_id` per validator schema) and free-form `verdict` (not the canonical enum). Engine-emitted PAs fail `record_schema_compliance` immediately.
- `append_touched_by_cf` updates only the section side; nothing forces the target CF's `required_world_updates` to include the section's file_class. Result: 45 GF-0010 findings on animalia, all from skill-authored CF/SEC drift over time, with no engine-level prevention against recurrence.
- Provides no path for canon-addition's reasoning to allocate new OQ-NNNN records as part of an adjudication submit. PAs that raise new open questions either reference them by topic-string (failing the SPEC-14 tightened `OQ-NNNN[]` requirement) or skip the citation entirely.

## Assumption Reassessment (2026-04-25)

1. `tools/patch-engine/src/ops/append-adjudication-record.ts` defined `AdjudicationFrontmatter` with field `id` and unconstrained `verdict: string`; it now uses `pa_id` plus `VerdictEnumValue` from `@worldloom/world-index/public/canonical-vocabularies` and runtime-rejects non-canonical verdicts.
2. `tools/patch-engine/src/ops/append-touched-by-cf.ts` existed but only appended the section-side pointer. It now loads the target CF and rejects with `required_world_updates_mismatch` unless the normalized section `file_class` is listed in the CF's `required_world_updates`.
3. Reassessment found an adjacent same-seam bypass: section-target `append_extension` auto-adds `touched_by_cf[]` via `tools/patch-engine/src/ops/append-extension.ts`. It now applies the same CF `required_world_updates` check before auto-linking.
4. Live staging did not have an engine-side overlay: `stageAllOps` staged each operation against pre-plan files/index rows. The same-plan `update_record_field` + `append_touched_by_cf` acceptance case and same-plan `create_cf_record` + section `append_extension` case were not independently landable without adding a staging overlay in `tools/patch-engine/src/commit/temp-file.ts` and `tools/patch-engine/src/ops/types.ts`.
5. `PatchEngineOpErrorCode` at `tools/patch-engine/src/ops/shared.ts` now includes the additive `required_world_updates_mismatch` code.
6. OQ-allocation pre-flight was confirmed through the existing `expected_id_allocations.oq_ids` and `pa_ids` lanes plus write reordering: `create_oq_record` is Tier 1 and `append_adjudication_record` is Tier 3, so the OQ file is written before the PA that cites it.
7. Cross-package proof cannot lawfully live inside `tools/patch-engine` by importing validators, because `tools/validators` already depends on `@worldloom/patch-engine`. The roundtrip proof therefore lives in `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts`, using the public `submitPatchPlan` and exported `canonicalOpHash`.
8. Package-local README reassessment found `tools/patch-engine/README.md` still named only archived SPEC-03 as design authority and omitted SPEC-14 adjudication/bidirectional behavior. It was updated as same-seam docs fallout.

## Architecture Check

1. Engine fail-fast on `append_touched_by_cf` and section-target `append_extension` makes bidirectional CF↔SEC integrity structurally enforced rather than post-write-validator-detected. Skills that try to patch a section without extending the CF surface get an explicit error code instead of silent grandfathering.
2. Field rename + verdict enum gives the engine output type-aligned with the validator schema. Round-trip test: engine emits → validator parses → `record_schema_compliance` passes.
3. No backwards-compatibility shim. Old payloads with `id`/lowercase verdict are TypeScript errors for typed callers and runtime errors for untyped callers.
4. The staging overlay is local to one `stageAllOps` call and is restored before return; it does not mutate the world index or bypass the pre-apply hard gate.

## Verification Layers

1. PA frontmatter field naming → `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` — updated test payload uses `pa_id`/UPPERCASE verdict; engine emits frontmatter with `pa_id:` key; validator-side integration test consumes the emitted file and passes `record_schema_compliance`.
2. Bidirectional section-to-CF writes → `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts`, `tools/patch-engine/tests/ops/append-extension.test.ts`, and `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — reject when CF lacks file_class; accept when CF has file_class; same-plan overlay resolves required-world-update extension/creation cases.
3. OQ allocation pre-flight → `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — plan contains `create_oq_record` ops in Tier 1 + `append_adjudication_record` in Tier 3 referencing the new OQ IDs in `open_questions_touched[]`; engine applies all ops atomically; on-disk OQ records exist; PA file's frontmatter cites them.
4. Verdict enum constraint → unit test asserts `append_adjudication_record` with lowercase verdict `"accepted"` fails at runtime for untyped callers.
5. Cross-package contract → `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` asserts an engine-emitted PA file passes `tools/validators` `record_schema_compliance` with zero verdicts.

## What to Change

### 1. Rename `id` → `pa_id`; constrain `verdict`; document `originating_skill`

In `tools/patch-engine/src/ops/append-adjudication-record.ts`:

```typescript
import { VERDICT_ENUM, type VerdictEnumValue } from "@worldloom/world-index/public/canonical-vocabularies";

export interface AdjudicationFrontmatter {
  pa_id: string;            // was `id`
  verdict: VerdictEnumValue; // was `string`
  date: string;
  originating_skill: string;
  change_id?: string;
  mystery_reserve_touched?: string[];
  invariants_touched?: string[];
  cf_records_touched?: string[];
  open_questions_touched?: string[];
}
```

Update `tools/patch-engine/src/envelope/schema.ts:13` re-export of `AdjudicationFrontmatter` (no shape change to the import line itself — the type changes propagate).

### 2. Update engine test payload

`tools/patch-engine/tests/ops/append-adjudication-record.test.ts`:
- `id: "PA-0099"` → `pa_id: "PA-0099"`
- `verdict: "accepted"` → `verdict: "ACCEPT"`
- assertion at line 18 `/verdict: accepted/` → `/verdict: ACCEPT/`
- (add) assert frontmatter contains `pa_id: PA-0099`

### 3. Bidirectional `append_touched_by_cf` check plus staging overlay

In `tools/patch-engine/src/ops/append-touched-by-cf.ts`:
- Inside the op's stage function, after world/op validation, look up the target CF from the world index or the same-plan staging overlay.
- Read its `required_world_updates` array.
- Look up the target section from the world index to get its `file_class`.
- If `file_class` not in `required_world_updates`, throw:
  ```typescript
  throw new PatchEngineOpError({
    code: "required_world_updates_mismatch",
    message: `${op.payload.target_sec_id} (file_class=${fileClass}) cites ${op.payload.cf_id}, but ${op.payload.cf_id}.required_world_updates does not include ${fileClass}; include an update_record_field op extending required_world_updates ahead of this op`,
    op_kind: "append_touched_by_cf",
    record_id: op.payload.cf_id
  });
  ```
- If the same plan contains a `create_cf_record` or an `update_record_field` op for the CF's `required_world_updates` field ahead of `append_touched_by_cf`, the check reads the post-overlay state through `OpContext.stagedRecords`, not the pre-overlay state.

### 4. Add `required_world_updates_mismatch` error code

In `tools/patch-engine/src/ops/shared.ts:10-26` (`PatchEngineOpErrorCode` union), add `"required_world_updates_mismatch"`.

### 5. OQ-allocation pre-flight (confirmation only)

`tools/patch-engine/src/commit/order.ts` (`append_adjudication_record` in Tier 3) + Tier 1 `create_oq_record` already provide the correct ordering. `expected_id_allocations.oq_ids` and `pa_ids` both exist and are verified before staging.

This sub-step is mostly a verification: most likely no code change, but the integration test (Verification Layer 3) confirms end-to-end behavior.

### 6. Cross-package round-trip integration test

Add `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts`. Steps:
1. Build a plan with `append_adjudication_record` payload using canonical SPEC-14 shape.
2. Apply the plan against a test world.
3. Read the resulting `adjudications/PA-NNNN-*.md` file from disk.
4. Run `record_schema_compliance` against the file.
5. Assert zero verdicts.

This test is load-bearing: it's the cross-package proof that engine emission and validator parsing agree.

## Files to Touch

- `tools/patch-engine/src/ops/append-adjudication-record.ts` (modify — interface rename + verdict typing)
- `tools/patch-engine/src/ops/append-touched-by-cf.ts` (modify — bidirectional check)
- `tools/patch-engine/src/ops/append-extension.ts` (modify — bidirectional check for section auto-links)
- `tools/patch-engine/src/ops/shared.ts` (modify — add error code)
- `tools/patch-engine/src/apply.ts` (modify — export `canonicalOpHash` for lawful approval-token construction from the validator integration test)
- `tools/patch-engine/src/commit/temp-file.ts` (modify — same-plan staged-record overlay)
- `tools/patch-engine/src/ops/types.ts` (modify — staged-record overlay context type)
- `tools/patch-engine/README.md` (modify — SPEC-14 behavior and public surface)
- `tools/patch-engine/src/envelope/schema.ts` (verify — re-export shape implicitly updates; no direct edit needed)
- `tools/patch-engine/src/commit/order.ts` (verify — no change expected)
- `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` (modify — canonical payload)
- `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts` (modify — three-case coverage)
- `tools/patch-engine/tests/ops/append-extension.test.ts` (modify — auto-link rejection coverage)
- `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (modify — OQ allocation roundtrip)
- `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` (new — cross-package contract)

## Out of Scope

- Validator-side adjudication parsing (lands in `SPEC14PAVOC-001`).
- The MCP `get_canonical_vocabulary` tool (landed in `archive/tickets/SPEC14PAVOC-003.md`).
- Animalia content migration (lands in `SPEC14PAVOC-004` through `-006`).
- Engine support for `append_audit_record` (out of SPEC-14 scope; future work per SPEC-06 line 131).
- Engine-level `geography` domain awareness — domain validation is validator-side; engine does not constrain `domains_affected` content.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test` — full test suite passes.
2. `cd tools/validators && npm test` — includes the new cross-package roundtrip: engine-emitted PA frontmatter parses cleanly through `record_schema_compliance` with zero verdicts.
3. `append_touched_by_cf` and section-target `append_extension` reject with `required_world_updates_mismatch` when CF lacks the section's file_class; same-plan staged CF creation/update succeeds when it supplies the file class first.
4. OQ-allocation integration test passes: plan with `create_oq_record` Tier 1 + `append_adjudication_record` Tier 3 referencing the new OQ-IDs applies cleanly.

### Invariants

1. Every engine-emitted adjudication frontmatter satisfies `tools/validators/src/schemas/adjudication-frontmatter.schema.json` (the SPEC14PAVOC-001 renamed schema).
2. Section-to-CF writes are structurally bidirectional: post-this-ticket, neither `append_touched_by_cf` nor section-target `append_extension` can introduce a `touched_by_cf` reference that isn't also reflected in the CF's `required_world_updates`.
3. The engine's verdict typing is sourced from `@worldloom/world-index/public/canonical-vocabularies` (single source of truth shared with validator schema).
4. Engine staging validates same-plan atomic record changes through an in-memory overlay before committing any source writes.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` — modified payloads use canonical shape.
2. `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts` — three-case coverage (reject; accept; same-plan extension resolves).
3. `tools/patch-engine/tests/ops/append-extension.test.ts` — section auto-link rejection coverage.
4. `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — modified with same-plan CF overlay, OQ allocation + adjudication roundtrip.
5. `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` — new cross-package engine-to-validator roundtrip.

### Commands

1. `cd tools/patch-engine && npm test` — full engine suite.
2. `cd tools/patch-engine && npm run test:compile-reject` — unsupported destructive ops still fail to compile.
3. `cd tools/validators && npm test` — validator suite plus SPEC-14 engine-emitted PA roundtrip.

## Outcome

Implemented. `append_adjudication_record` now emits `pa_id` frontmatter and canonical verdict values sourced from `@worldloom/world-index/public/canonical-vocabularies`, with runtime rejection for untyped invalid verdict payloads. `append_touched_by_cf` and section-target `append_extension` now enforce the CF↔SEC bidirectional contract and throw `required_world_updates_mismatch` when the CF surface is missing the section file class.

`stageAllOps` now maintains a temporary staged-record overlay, so same-plan atomic creates and updates are visible to later validation before any source commit. This closes the same-plan `update_record_field(required_world_updates)` then `append_touched_by_cf` case without mutating the derived world index during staging.

OQ allocation was confirmed by integration coverage using `create_oq_record` plus `append_adjudication_record` in the same plan. Cross-package engine-to-validator proof was added in `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts`.

## Verification Result

Passed:

1. `cd tools/patch-engine && npm test` — 40/40 tests passed.
2. `cd tools/patch-engine && npm run test:compile-reject` — compile-rejection lane failed as expected on unsupported destructive ops.
3. `cd tools/validators && npm test` — 50/50 tests passed, including `SPEC-14 roundtrip: engine-emitted PA frontmatter passes record_schema_compliance`.

`tools/patch-engine/node_modules`, `tools/patch-engine/dist`, `tools/validators/node_modules`, and `tools/validators/dist` are expected ignored package artifacts from existing installs/builds.

## Deviations

The drafted `tools/patch-engine/tests/integration/end-to-end-spec14-validator-roundtrip.test.ts` location was corrected. `tools/patch-engine` cannot import `tools/validators` without reversing the live package dependency direction, so the cross-package roundtrip test lives in `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts`, where `@worldloom/validators` already depends on `@worldloom/patch-engine`.

The drafted standalone `oq-allocation-with-adjudication.test.ts` was implemented as an additional case in `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts`, reusing the existing approval-token and temp-world integration harness.
