# SPEC74STCHARDISBOU-011: New validator stchar_regeneration_reason_integrity

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new validator file `tools/validators/src/structural/stchar-regeneration-reason-integrity.ts`; registry append at `tools/validators/src/public/registry.ts`; new test file `tools/validators/tests/structural/stchar-regeneration-reason-integrity.test.ts`
**Deps**: 006

## Problem

After SPEC74STCHARDISBOU-006 lands, the JSON Schema enforces that `regeneration_reason_class` is non-null with a valid enum value when `source_kind: regenerated` OR `supersedes` is non-null. But the schema does NOT enforce that the named reason is BACKED by appropriate evidence — a regenerated STCHAR could claim `regeneration_reason_class: durable_branch_transformation` without citing any story-local evidence, or claim `profile_fidelity_failure` without prose-receipt evidence. The Rule 6 (No Silent Retcons) discipline requires every regeneration to carry classified + evidenced rationale; this validator enforces the evidence side that the schema cannot reach structurally.

## Assumption Reassessment (2026-05-23)

1. Verified `tools/validators/src/schemas/story-character-authority.schema.json` will (after SPEC74STCHARDISBOU-006 lands) define `regeneration_reason_class` as the 5-value enum + conditional non-null requirement on regenerated/superseding profiles. This validator consumes that field.
2. Verified SPEC-74 §4.10 specifies the 6 rules: enum-value check (per the 5 named reasons); per-reason evidence checks (`durable_branch_transformation` requires story-local evidence in `story_local_inputs_used[]` or `Validation / Audit Anchors`; `source_world_char_material_change` requires `source_char_id` non-null — note the post-reassess-spec-tightening that no broader source-drift mechanism exists in the codebase, so `source_char_id` non-null is the only structural evidence this validator can require, per the reassessment of §4.10 rule 3); `profile_fidelity_failure` requires prose-receipt or page-plan fidelity evidence; `stable_source_material_omission_repair` requires source-material-inventory evidence; an `ordinary_state_not_regeneration_reason` finding for regenerated profiles whose evidence is only active-state records without durable-consolidation rationale.
3. Cross-skill boundary under audit: this validator runs via the validator-framework run-loop; its diagnostic findings feed the health-audit Phase 2m `stchar_regeneration_reason_invalid` finding (SPEC74STCHARDISBOU-012); it depends on the schema field defined in SPEC74STCHARDISBOU-006 to exist and be parseable.
4. FOUNDATIONS principle restated: Rule 6 (No Silent Retcons) — every STCHAR regeneration must classify its lifecycle event with a durable-consolidation rationale + structural evidence. §Story Bundles §5b (Schema-Minimalism) — `regeneration_reason_class` is load-bearing because this validator consumes it for the lifecycle classification gate.
5. HARD-GATE / Canon Safety Check surface touched: this is a new structural validator under `tools/validators/src/structural/`; per the per-ticket-type granularity in spec-to-tickets, a new structural validator engages this item. The validator strengthens the STCHAR regeneration gate by enforcing the evidence requirement that the schema's conditional cannot reach.
6. Schema extension consumed: this validator reads the `regeneration_reason_class` field added by SPEC74STCHARDISBOU-006 to `story-character-authority.schema.json`. The validator IS the structural consumer that makes the schema field load-bearing under FOUNDATIONS §Story Bundles §5b. The consumer-side schema dependency is satisfied within this batch (SPEC74STCHARDISBOU-006 produces the field; this ticket consumes it).

## Architecture Check

1. The validator complements (not duplicates) the JSON Schema's conditional non-null requirement. Schema validates that `regeneration_reason_class` is present with a valid enum value; this validator validates that the chosen reason is BACKED by appropriate evidence per the per-reason-class rules. The split is intentional — JSON Schema cannot express "if regeneration_reason_class is durable_branch_transformation, then story_local_inputs_used must be non-empty" without becoming unwieldy.
2. The post-reassess-spec correction to §4.10 rule 3 (source_char_id non-null is the only structural evidence; no broader source-drift mechanism exists in the codebase post-SPEC-71) is load-bearing: the validator MUST NOT scope-extend to add a new source-drift mechanism or reintroduce a hash check. The validator simply asserts `source_char_id` non-null for `regeneration_reason_class: source_world_char_material_change` profiles.
3. No backwards-compatibility shims; existing regenerated profiles without evidence will fail. The migration covers existing red-bunny STCHAR profiles (SPEC74STCHARDISBOU-013).

## Verification Layers

1. **Validator file present and exports the validator** → codebase grep-proof: `grep -n 'stcharRegenerationReasonIntegrity\|stchar_regeneration_reason_integrity' tools/validators/src/structural/stchar-regeneration-reason-integrity.ts` returns ≥2 matches.
2. **Registry append in place** → grep-proof: `grep -n 'stcharRegenerationReasonIntegrity\|stchar-regeneration-reason-integrity' tools/validators/src/public/registry.ts` returns ≥2 matches.
3. **No source_char_hash reintroduction** → grep-proof: `grep -n 'source_char_hash' tools/validators/src/structural/stchar-regeneration-reason-integrity.ts` returns 0 matches (SPEC-71's strip preserved; reassess-spec correction enforced).
4. **Tests cover positive + negative cases** → `tools/validators/tests/structural/stchar-regeneration-reason-integrity.test.ts` extended with the cases enumerated in SPEC-74 §7.

## What to Change

### 1. Create the validator file

**File**: `tools/validators/src/structural/stchar-regeneration-reason-integrity.ts`

**Registered name**: `stchar_regeneration_reason_integrity`

**Severity**: FAIL on all regenerated/superseding STCHAR records.

**Rules**:

1. If `source_kind: regenerated` OR `supersedes` is non-null, `regeneration_reason_class` MUST be one of the 5 enum values from SPEC74STCHARDISBOU-006 (`source_world_char_material_change`, `durable_branch_transformation`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair`).
2. When `regeneration_reason_class: durable_branch_transformation`, `story_local_inputs_used[]` OR `Validation / Audit Anchors` MUST cite at least one story-local evidence record (e.g., `SE-N`, `SREL-N`, `STEMO-N`).
3. When `regeneration_reason_class: source_world_char_material_change`, `source_char_id` MUST be non-null. Per the SPEC-74 §4.10 reassess-spec correction: `source_char_hash` no longer exists post-SPEC-71, and no equivalent source-drift evidence mechanism exists in the current codebase — `source_char_id` non-null is the only structural evidence this validator can require. The validator MUST NOT reintroduce a hash check OR scope-extend to add a new source-drift mechanism.
4. When `regeneration_reason_class: profile_fidelity_failure`, the profile MUST cite prose-receipt or page-plan fidelity evidence in `Validation / Audit Anchors` or `story_local_inputs_used[]`.
5. When `regeneration_reason_class: stable_source_material_omission_repair`, the profile MUST cite source-material-inventory evidence OR prior coverage-failure evidence.
6. A regenerated STCHAR whose evidence consists only of ordinary active-state records without a durable-consolidation rationale in `Validation / Audit Anchors` emits `ordinary_state_not_regeneration_reason`.

### 2. Register in `tools/validators/src/public/registry.ts`

Add the import + array entry following the existing STCHAR-validator pattern:

```ts
import { stcharRegenerationReasonIntegrity } from "../structural/stchar-regeneration-reason-integrity.js";
// ...
export const structuralValidators: readonly Validator[] = [
  // ... existing entries
  stcharRegenerationReasonIntegrity,
];
```

### 3. Create the test file

**File**: `tools/validators/tests/structural/stchar-regeneration-reason-integrity.test.ts`

Cases per SPEC-74 §7:

- **Positive**: `source_kind: regenerated`, `supersedes: STCHAR-1`, `regeneration_reason_class: durable_branch_transformation`, with `story_local_inputs_used: [SE-9, SREL-4, STEMO-7]` and audit-anchor evidence — PASSES.
- **Positive**: `profile_fidelity_failure` with prose-receipt evidence — PASSES.
- **Positive**: `stable_source_material_omission_repair` with inventory evidence — PASSES.
- **Negative**: regenerated STCHAR MISSING `regeneration_reason_class` field — FAILS (this is also the JSON Schema's job, but the validator should produce its own finding for completeness).
- **Negative**: `regeneration_reason_class: null` with `supersedes: STCHAR-1` non-null — FAILS.
- **Negative**: `regeneration_reason_class: durable_branch_transformation` with empty `story_local_inputs_used[]` and no audit-anchor evidence — FAILS.
- **Negative**: regenerated STCHAR whose evidence is only `[STEMO-1, BEL-2]` without a durable-consolidation rationale — emits `ordinary_state_not_regeneration_reason`.

## Files to Touch

- `tools/validators/src/structural/stchar-regeneration-reason-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/structural/stchar-regeneration-reason-integrity.test.ts` (new)

## Out of Scope

- The JSON Schema field add (SPEC74STCHARDISBOU-006).
- Skill regenerate-mode wording (SPEC74STCHARDISBOU-001).
- Health-audit `stchar_regeneration_reason_invalid` finding registration (SPEC74STCHARDISBOU-012).
- Any source_char_hash reintroduction or new source-drift mechanism (explicitly forbidden by SPEC-74 §4.10 reassess-spec correction).
- Migration of existing red-bunny regenerated STCHAR profiles (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'stcharRegenerationReasonIntegrity' tools/validators/src/public/registry.ts` returns ≥2 matches.
2. `npm test --prefix tools/validators` PASSES with all new test cases.
3. A representative regenerated STCHAR with `durable_branch_transformation` + story-local evidence PASSES.
4. A representative regenerated STCHAR with `regeneration_reason_class: null` FAILS.
5. A representative regenerated STCHAR with evidence consisting only of `[STEMO-N, BEL-N]` and no durable-consolidation rationale emits `ordinary_state_not_regeneration_reason`.
6. `grep -n 'source_char_hash' tools/validators/src/structural/stchar-regeneration-reason-integrity.ts` returns 0 matches (no hash reintroduction).

### Invariants

1. Every STCHAR regeneration carries a classified + evidenced rationale; ordinary state-record updates without durable-consolidation evidence cannot be valid regenerations.
2. The validator MUST NOT introduce a source-drift mechanism beyond `source_char_id` non-null; the post-SPEC-71 codebase has no such mechanism to consult, and scope-extending would violate SPEC-74 §4.10's explicit constraint.
3. The validator's per-reason-class evidence rules complement (not duplicate) the JSON Schema's conditional non-null requirement.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-regeneration-reason-integrity.test.ts` (new) — positive (3 valid reason-class + evidence combinations) + negative (missing field, null, no evidence, ordinary-state-only evidence) cases per Verification Layers item 4.

### Commands

1. `npm test --prefix tools/validators` (confirms new test file passes)
2. `grep -n 'stcharRegenerationReasonIntegrity\|stchar-regeneration-reason-integrity' tools/validators/src/public/registry.ts` (confirms registry append)
3. Dry-run the validator against a representative regenerated red-bunny STCHAR fixture (post-SPEC74STCHARDISBOU-013-migration) to confirm PASS with valid evidence and FAIL on hand-crafted negative fixtures.
