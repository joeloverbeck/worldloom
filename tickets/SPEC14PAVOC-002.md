# SPEC14PAVOC-002: Patch Engine Update — Adjudication Field Rename, Verdict Enum, Bidirectional touched_by_cf, OQ Allocation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine/` (`AdjudicationFrontmatter` interface; `append_adjudication_record` op; `append_touched_by_cf` op gains bidirectional check + new error code `required_world_updates_mismatch`; OQ allocation pre-flight in adjudication submit path)
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-003.md` (engine imports `VERDICT_ENUM` from shared canonical-vocabularies module)

## Problem

Per SPEC-14, the patch engine currently:
- Emits adjudications with frontmatter field `id` (not `pa_id` per validator schema) and free-form `verdict` (not the canonical enum). Engine-emitted PAs fail `record_schema_compliance` immediately.
- `append_touched_by_cf` updates only the section side; nothing forces the target CF's `required_world_updates` to include the section's file_class. Result: 45 GF-0010 findings on animalia, all from skill-authored CF/SEC drift over time, with no engine-level prevention against recurrence.
- Provides no path for canon-addition's reasoning to allocate new OQ-NNNN records as part of an adjudication submit. PAs that raise new open questions either reference them by topic-string (failing the SPEC-14 tightened `OQ-NNNN[]` requirement) or skip the citation entirely.

## Assumption Reassessment (2026-04-25)

1. `tools/patch-engine/src/ops/append-adjudication-record.ts:5-15` defines `AdjudicationFrontmatter` with field `id` and unconstrained `verdict: string`. Field rename to `pa_id` is mechanical; verdict typing imports from the shared canonical-vocabularies module landed in `archive/tickets/SPEC14PAVOC-003.md`.
2. `tools/patch-engine/src/ops/append-touched-by-cf.ts` exists per archived SPEC-03 §Deliverables (op `append_touched_by_cf`) — confirm at implementation time. The bidirectional check requires reading the target CF from the world index (or pre-apply overlay) inside the op's `stage*` function; lookup pattern mirrors `tools/validators/src/_helpers/index-access.ts`.
3. `PatchEngineOpErrorCode` union at `tools/patch-engine/src/ops/shared.ts:10-26` enumerates 14 codes; adding `required_world_updates_mismatch` is additive (no consumer break).
4. OQ-allocation pre-flight: the engine's `expected_id_allocations` mechanism (per archived SPEC-03 envelope schema) already validates that allocated IDs are pre-declared. New OQ records arrive in the plan as `create_oq_record` ops; the adjudication's `open_questions_touched[]` references those IDs. The engine's existing 3-tier write order (Tier 1 atomic records → Tier 2 mutations → Tier 3 hybrid files) ensures OQ records exist before the PA references them. **No new engine sequencing logic** is needed beyond confirming the order is correct in `tools/patch-engine/src/commit/order.ts:21` (where `append_adjudication_record` is in Tier 3) and that `create_oq_record` is in Tier 1.
5. Engine test `tools/patch-engine/tests/ops/append-adjudication-record.test.ts:13` uses payload `{ id: "PA-0099", verdict: "accepted", ... }`. This MUST update to canonical shape; running the existing test post-change without payload update will fail (intentionally).
6. Existing animalia world index has 17 adjudication records. Pre-apply overlay for `append_touched_by_cf` reads CFs from the index (`tools/patch-engine/src/commit/temp-file.ts` consumers); the index is read-only during a patch plan.
7. Schema change is breaking for the engine API surface but not for any downstream consumer in main: pipeline-wide grep for `adjudication_frontmatter:` finds only the engine's own test fixture (`tools/patch-engine/tests/ops/append-adjudication-record.test.ts:13,24`) and the type re-export at `tools/patch-engine/src/envelope/schema.ts:13`. No skills currently invoke `append_adjudication_record` directly (skills go through MCP `submit_patch_plan`); the SPEC-06 skill rewrites are gated on this ticket landing.
8. Cross-skill blast radius: archived SPEC-03 referenced `AdjudicationFrontmatter.id` in §Deliverables; that reference is documentation-historical (archived spec is unedited). The live contract is SPEC-14.

## Architecture Check

1. Engine fail-fast on `append_touched_by_cf` makes bidirectional CF↔SEC integrity structurally enforced rather than post-write-validator-detected — eliminates the entire GF-0010 class of findings at the source. Skills that try to patch a section without extending the CF surface get an explicit error code instead of silent grandfathering.
2. Field rename + verdict enum gives the engine output type-aligned with the validator schema. Round-trip test: engine emits → validator parses → record_schema_compliance passes; this is the cross-package integration test that closes the SPEC-14 contract drift.
3. No backwards-compatibility shim. Old payloads with `id`/`accepted` are explicit type errors (TypeScript) and runtime errors (engine throws on unknown verdict). Consumers update at the same time.

## Verification Layers

1. PA frontmatter field naming → `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` — updated test payload uses `pa_id`/UPPERCASE verdict; engine emits frontmatter with `pa_id:` key; validator-side integration test consumes the emitted file and passes `record_schema_compliance`.
2. Bidirectional `append_touched_by_cf` → `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts` (new or extended) — three cases: (a) CF lacks file_class → engine throws `required_world_updates_mismatch`; (b) CF has file_class → succeeds; (c) plan with `update_record_field` extending `required_world_updates` ahead of `append_touched_by_cf` → succeeds even though CF-as-of-pre-plan lacked file_class.
3. OQ allocation pre-flight → `tools/patch-engine/tests/integration/oq-allocation-with-adjudication.test.ts` (new) — plan contains `create_oq_record` ops in Tier 1 + `append_adjudication_record` in Tier 3 referencing the new OQ IDs in `open_questions_touched[]`; engine applies all ops atomically; on-disk OQ records exist; PA file's frontmatter cites them.
4. Verdict enum constraint → unit test asserts `append_adjudication_record` with verdict `"foobar"` fails (TypeScript-level if compile-time; runtime guard if runtime check is added).
5. Cross-package contract (the round-trip integration test) → asserts that for any valid `append_adjudication_record` payload, the resulting file passes `tools/validators` `record_schema_compliance`. This is the most load-bearing test of SPEC-14 § Verification.

## What to Change

### 1. Rename `id` → `pa_id`; constrain `verdict`; document `originating_skill`

In `tools/patch-engine/src/ops/append-adjudication-record.ts`:

```typescript
import type { VERDICT_ENUM } from "@worldloom/world-index/public";

type Verdict = (typeof VERDICT_ENUM)[number];

export interface AdjudicationFrontmatter {
  pa_id: string;            // was `id`
  verdict: Verdict;         // was `string`
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

`tools/patch-engine/tests/ops/append-adjudication-record.test.ts:13,24`:
- `id: "PA-0099"` → `pa_id: "PA-0099"`
- `verdict: "accepted"` → `verdict: "ACCEPT"`
- assertion at line 18 `/verdict: accepted/` → `/verdict: ACCEPT/`
- (add) assert frontmatter contains `pa_id: PA-0099`

### 3. Bidirectional `append_touched_by_cf` check

In `tools/patch-engine/src/ops/append-touched-by-cf.ts`:
- Inside the op's stage function, after world/op validation, look up the target CF from the world index (the pre-apply overlay if present).
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
- If the same plan contains an `update_record_field` op for the CF's `required_world_updates` field that adds the file_class, the check must read the post-overlay state, not the pre-overlay state. Per archived SPEC-03 §Apply order, the overlay applies in declared order; the engine's apply-order helper provides the post-overlay view via `tools/patch-engine/src/commit/order.ts` orchestration — confirm the lookup uses the overlay-aware read.

### 4. Add `required_world_updates_mismatch` error code

In `tools/patch-engine/src/ops/shared.ts:10-26` (`PatchEngineOpErrorCode` union), add `"required_world_updates_mismatch"`.

### 5. OQ-allocation pre-flight (confirmation only)

`tools/patch-engine/src/commit/order.ts:21` (`append_adjudication_record` in Tier 3) + Tier 1 `create_oq_record` already provide the correct ordering. **Verify** that `expected_id_allocations.oq_ids` accepts new OQ-NNNN allocations alongside `pa_ids` for the same plan; if `expected_id_allocations` schema requires per-class enumeration, no change needed (already supports OQ class per archived SPEC-02 phase2 `allocate_next_id` extensions). If the field is missing, add it.

This sub-step is mostly a verification: most likely no code change, but the integration test (Verification Layer 3) confirms end-to-end behavior.

### 6. Cross-package round-trip integration test

Add `tools/patch-engine/tests/integration/end-to-end-spec14-validator-roundtrip.test.ts`. Steps:
1. Build a plan with `append_adjudication_record` payload using canonical SPEC-14 shape.
2. Apply the plan against a test world.
3. Read the resulting `adjudications/PA-NNNN-*.md` file from disk.
4. Run `record_schema_compliance` against the file.
5. Assert zero verdicts.

This test is load-bearing: it's the cross-package proof that engine emission and validator parsing agree.

## Files to Touch

- `tools/patch-engine/src/ops/append-adjudication-record.ts` (modify — interface rename + verdict typing)
- `tools/patch-engine/src/ops/append-touched-by-cf.ts` (modify — bidirectional check)
- `tools/patch-engine/src/ops/shared.ts` (modify — add error code)
- `tools/patch-engine/src/envelope/schema.ts` (modify — re-export shape implicitly updates)
- `tools/patch-engine/src/commit/order.ts` (verify — no change expected)
- `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` (modify — canonical payload)
- `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts` (modify or new — three-case coverage)
- `tools/patch-engine/tests/integration/oq-allocation-with-adjudication.test.ts` (new — OQ allocation roundtrip)
- `tools/patch-engine/tests/integration/end-to-end-spec14-validator-roundtrip.test.ts` (new — cross-package contract)

## Out of Scope

- Validator-side adjudication parsing (lands in `SPEC14PAVOC-001`).
- The MCP `get_canonical_vocabulary` tool (landed in `archive/tickets/SPEC14PAVOC-003.md`).
- Animalia content migration (lands in `SPEC14PAVOC-004` through `-006`).
- Engine support for `append_audit_record` (out of SPEC-14 scope; future work per SPEC-06 line 131).
- Engine-level `geography` domain awareness — domain validation is validator-side; engine does not constrain `domains_affected` content.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test` — full test suite passes.
2. New cross-package roundtrip test passes: engine-emitted PA frontmatter parses cleanly through `record_schema_compliance` with zero verdicts.
3. `append_touched_by_cf` rejects with `required_world_updates_mismatch` when CF lacks the section's file_class; succeeds when the same plan extends `required_world_updates` first.
4. OQ-allocation integration test passes: plan with `create_oq_record` Tier 1 + `append_adjudication_record` Tier 3 referencing the new OQ-IDs applies cleanly.

### Invariants

1. Every engine-emitted adjudication frontmatter satisfies `tools/validators/src/schemas/adjudication-frontmatter.schema.json` (the SPEC14PAVOC-001 renamed schema).
2. `append_touched_by_cf` is structurally bidirectional: post-this-ticket, no plan can introduce a `touched_by_cf` reference that isn't also reflected in the CF's `required_world_updates`.
3. The engine's verdict typing is sourced from `@worldloom/world-index/public/canonical-vocabularies` (single source of truth shared with validator schema).

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` — modified payloads use canonical shape.
2. `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts` — three-case coverage (reject; accept; same-plan extension resolves).
3. `tools/patch-engine/tests/integration/oq-allocation-with-adjudication.test.ts` — new.
4. `tools/patch-engine/tests/integration/end-to-end-spec14-validator-roundtrip.test.ts` — new cross-package test.

### Commands

1. `cd tools/patch-engine && npm run build && npm test` — full engine suite.
2. `cd tools/validators && npm test` — validator unaffected by engine changes (separate package).
3. Manual smoke: build a synthetic plan via the integration test harness; apply against a temp world; inspect the resulting `adjudications/*.md` file's frontmatter visually for shape correctness.
