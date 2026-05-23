# SPEC74STCHARDISBOU-007: stchar-body-integrity.ts Stable Source Material Inventory subsection requirement

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/stchar-body-integrity.ts` (extend required-subsection list); `tools/validators/tests/structural/stchar-body-integrity.test.ts` (extend test cases)
**Deps**: None

## Problem

`stchar-body-integrity.ts` currently requires three H3 subsections (`Operational capabilities and affordances` + `Capability limits, costs, and access constraints` under `Agency and Planning Tendencies`; `Signature scene behaviors to render` under `Prose Rendering Constraints`) but does not require the `Stable Source Material Inventory` subsection under `Source Distillation`. Without this requirement, STCHAR profiles can omit the inventory entirely, allowing stable operational source material outside the 10 `dramatic_core` fields to be silently dropped — the semantic-loss gap SPEC-74 §4.8 closes.

## Assumption Reassessment (2026-05-23)

1. Verified current `tools/validators/src/structural/stchar-body-integrity.ts` shape at lines 34-48: required-subsection list contains the three H3 subsections named above; no `Stable Source Material Inventory` requirement. Existing test file `tools/validators/tests/structural/stchar-body-integrity.test.ts` covers the existing three subsections.
2. Verified SPEC-74 §4.8 specifies the required-subsection extension + the migration policy upgrade from "untouched-legacy-warn / touched-fail" to "fail-everywhere" per the triage-time policy in SPEC-74 §5.
3. Cross-skill boundary under audit: this validator is the canonical structural check for STCHAR record body shape; it is invoked by the validator-framework run-loop (`tools/validators/src/public/registry.ts`) on every STCHAR record. The required-subsection list is the contract for what an STCHAR record body must contain. The new requirement enforces the authoring rule documented by SPEC74STCHARDISBOU-001 (story-character-profile/SKILL.md adds the `Stable Source Material Inventory` subsection authoring instruction).
4. FOUNDATIONS principle restated: §Tooling Recommendation ("LLM agents should never operate on prose alone" — structural validators on the shape of authored records, not on prose semantics). The required-subsection check is structural — it asserts subsection presence by name, not the inventory's content semantics (which `stchar_source_material_inventory_integrity` per SPEC74STCHARDISBOU-008 handles).
5. HARD-GATE / Canon Safety Check surface touched: this is a structural validator under `tools/validators/src/structural/` that the validator-framework's pre-apply run-loop invokes; per the per-ticket-type granularity in spec-to-tickets, modifying a structural validator engages this item. The change strengthens (not weakens) the STCHAR record gate by requiring the inventory subsection.

## Architecture Check

1. The required-subsection list is the existing structural contract; extending it with one new entry (`Stable Source Material Inventory` under `Source Distillation`) preserves the validator's declarative shape. Alternative (a custom check for the inventory's presence elsewhere in the validator's logic) would split the contract across multiple sites.
2. The migration policy upgrade from "untouched-legacy-warn / touched-fail" to "fail-everywhere" is per SPEC-74 §5's triage-time decision. No backwards-compatibility shims for legacy profiles — the SPEC74STCHARDISBOU-013 migration pass handles existing red-bunny STCHAR profiles before this validator registers.

## Verification Layers

1. **Required-subsection list includes `Stable Source Material Inventory`** → codebase grep-proof: `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts` returns ≥1 match in the required-subsection list at lines 34-48 (or whatever the post-edit lines are).
2. **`Source Distillation` H2 parent declared** → grep-proof: the same required-subsection list contains `"Source Distillation"` as a parent H2 with `"Stable Source Material Inventory"` as a subsection entry.
3. **Test cases cover the new requirement** → `tools/validators/tests/structural/stchar-body-integrity.test.ts` extended with positive (new/touched world-char STCHAR with `Stable Source Material Inventory` subsection passes) and negative (new/touched world-char STCHAR missing the subsection fails) cases.

## What to Change

### 1. Extend the required-subsection list in stchar-body-integrity.ts

Add the new entry to the required-subsection structure at lines 34-48:

```ts
{
  section: "Source Distillation",
  subsections: ["Stable Source Material Inventory"],
}
```

Match the existing entry shape exactly (preserve the parent-H2 + subsections-array structure used by `Agency and Planning Tendencies` + `Prose Rendering Constraints`).

### 2. Upgrade the validator's migration policy to FAIL-everywhere

The validator's existing convention is "untouched-legacy-warn / touched-fail" (legacy profiles get warnings; new/touched profiles fail). Per SPEC-74 §5's triage-time decision, upgrade to FAIL-everywhere — every STCHAR profile must pass, including untouched legacy. The implementing developer must locate the touched/untouched branching in the validator's logic and remove the legacy-warning branch.

### 3. Extend tests

In `tools/validators/tests/structural/stchar-body-integrity.test.ts`, add:
- **Positive**: new/touched world-char STCHAR profile WITH `### Stable Source Material Inventory` subsection under `## Source Distillation` PASSES.
- **Negative**: new/touched world-char STCHAR profile MISSING the subsection FAILS with the body-integrity finding citing the missing subsection.
- **Positive**: story-local STCHAR (`source_kind: story_local`) MAY omit the inventory subsection — the requirement scopes to `source_kind: world_char` only. Confirm the validator's logic correctly scopes the check.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)

## Out of Scope

- The inventory's content-validation rules (SPEC74STCHARDISBOU-008 — `stchar_source_material_inventory_integrity` checks row shape and rationale categories).
- The skill authoring instruction for the inventory subsection (SPEC74STCHARDISBOU-001).
- Migration of existing red-bunny STCHAR profiles that lack the subsection (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts` returns ≥1 match in the required-subsection list.
2. `npm test --prefix tools/validators` PASSES with the extended test cases.
3. A representative new/touched world-char STCHAR record WITHOUT the `### Stable Source Material Inventory` subsection FAILS the validator with a finding naming the missing subsection.
4. A representative `source_kind: story_local` STCHAR record without the subsection PASSES (the requirement is world_char-scoped).

### Invariants

1. New/touched `source_kind: world_char` STCHAR records MUST have a `### Stable Source Material Inventory` subsection under `## Source Distillation`.
2. The validator's required-subsection list maintains its declarative parent-H2 + subsections-array shape.
3. FAIL-everywhere migration policy is enforced (no legacy-warning branch remains).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — extend with positive (subsection present) + negative (subsection missing) + scoping (story_local omission permitted) cases.

### Commands

1. `npm test --prefix tools/validators` (confirms all body-integrity tests pass, including new cases)
2. `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts` (confirms subsection requirement in code)
3. Dry-run the validator against a hand-crafted negative fixture (world_char STCHAR missing the subsection) to confirm FAIL with the expected finding message.
