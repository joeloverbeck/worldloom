# SPEC74STCHARDISBOU-007: stchar-body-integrity.ts Stable Source Material Inventory subsection requirement

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/stchar-body-integrity.ts` (extend required-subsection list and fail-everywhere severity); `tools/validators/tests/structural/stchar-body-integrity.test.ts` (extend test cases); `tools/validators/tests/integration/spec34-integration.test.ts` (truth pass fixture for fail-everywhere enforcement)
**Deps**: None

## Problem

At intake, `stchar-body-integrity.ts` required three H3 subsections (`Operational capabilities and affordances` + `Capability limits, costs, and access constraints` under `Agency and Planning Tendencies`; `Signature scene behaviors to render` under `Prose Rendering Constraints`) but did not require the `Stable Source Material Inventory` subsection under `Source Distillation`. Without this requirement, STCHAR profiles could omit the inventory entirely, allowing stable operational source material outside the 10 `dramatic_core` fields to be silently dropped — the semantic-loss gap SPEC-74 §4.8 closes.

## Assumption Reassessment (2026-05-23)

1. Verified current `tools/validators/src/structural/stchar-body-integrity.ts` shape at lines 34-48: required-subsection list contains the three H3 subsections named above; no `Stable Source Material Inventory` requirement. Existing test file `tools/validators/tests/structural/stchar-body-integrity.test.ts` covers the existing three subsections.
2. Verified SPEC-74 §4.8 specifies the required-subsection extension + the migration policy upgrade from "untouched-legacy-warn / touched-fail" to "fail-everywhere" per the triage-time policy in SPEC-74 §5.
3. Cross-skill boundary under audit: this validator is the canonical structural check for STCHAR record body shape; it is invoked by the validator-framework run-loop (`tools/validators/src/public/registry.ts`) on every STCHAR record. The required-subsection list is the contract for what an STCHAR record body must contain. The new requirement enforces the authoring rule documented by `archive/tickets/SPEC74STCHARDISBOU-001.md` (story-character-profile/SKILL.md adds the `Stable Source Material Inventory` subsection authoring instruction).
4. FOUNDATIONS principle restated: §Tooling Recommendation ("LLM agents should never operate on prose alone" — structural validators on the shape of authored records, not on prose semantics). The required-subsection check is structural — it asserts subsection presence by name, not the inventory's content semantics (which `stchar_source_material_inventory_integrity` per SPEC74STCHARDISBOU-008 handles).
5. HARD-GATE / Canon Safety Check surface touched: this is a structural validator under `tools/validators/src/structural/` that the validator-framework's pre-apply run-loop invokes; per the per-ticket-type granularity in spec-to-tickets, modifying a structural validator engages this item. The change strengthens (not weakens) the STCHAR record gate by requiring the inventory subsection.
6. Baseline `npm test --prefix tools/validators` passed before edits (905 tests). After the validator changed to fail-everywhere, the broad suite exposed same-seam fixture fallout in `tools/validators/tests/integration/spec34-integration.test.ts`: its `spec34-pass` STCHAR body lacked the already-required operational-home subsections and therefore failed once legacy warnings became failures. Updating that pass fixture is ticket-owned proof-surface truthing, not a new validator feature.

## Architecture Check

1. The required-subsection list is the existing structural contract; extending it with one new entry (`Stable Source Material Inventory` under `Source Distillation`) preserves the validator's declarative shape. Alternative (a custom check for the inventory's presence elsewhere in the validator's logic) would split the contract across multiple sites.
2. The migration policy upgrade from "untouched-legacy-warn / touched-fail" to "fail-everywhere" is per SPEC-74 §5's triage-time decision. No backwards-compatibility shims for legacy profiles — the SPEC74STCHARDISBOU-013 migration pass handles existing red-bunny STCHAR profiles before this validator registers.

## Verification Layers

1. **Required-subsection list includes `Stable Source Material Inventory`** → codebase grep-proof: `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts` returns the required-subsection list entry.
2. **`Source Distillation` H2 parent declared** → grep-proof: the same required-subsection list contains `"Source Distillation"` as a parent H2 with `"Stable Source Material Inventory"` as a subsection entry.
3. **Test cases cover the new requirement** → `tools/validators/tests/structural/stchar-body-integrity.test.ts` covers positive (world-char STCHAR with `Stable Source Material Inventory` subsection passes), negative (world-char STCHAR missing the subsection fails), and story-local scoping cases.

## Landed Changes

### 1. Extend the required-subsection list in stchar-body-integrity.ts

Added the new entry to the required-subsection structure:

```ts
{
  section: "Source Distillation",
  subsections: ["Stable Source Material Inventory"],
  source_kind: "world_char",
}
```

The entry preserves the parent-H2 + subsections-array structure used by `Agency and Planning Tendencies` + `Prose Rendering Constraints`, with the added `source_kind: "world_char"` scope.

### 2. Upgrade the validator's migration policy to FAIL-everywhere

The prior convention was "untouched-legacy-warn / touched-fail" (legacy profiles got warnings; new/touched profiles failed). Per SPEC-74 §5's triage-time decision, the validator now fails every required-subsection violation in every run mode.

### 3. Extend tests

In `tools/validators/tests/structural/stchar-body-integrity.test.ts`, added:
- **Positive**: world-char STCHAR profile WITH `### Stable Source Material Inventory` subsection under `## Source Distillation` PASSES.
- **Negative**: world-char STCHAR profile MISSING the subsection FAILS with the body-integrity finding citing the missing subsection.
- **Positive**: story-local STCHAR (`source_kind: story_local`) MAY omit the inventory subsection — the requirement scopes to `source_kind: world_char` only.

In `tools/validators/tests/integration/spec34-integration.test.ts`, updated the synthetic STCHAR fixture body so the SPEC-34 pass-world fixture remains valid under fail-everywhere operational-home subsection enforcement.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify — keep the SPEC-34 pass fixture valid under fail-everywhere subsection enforcement)

## Out of Scope

- The inventory's content-validation rules (SPEC74STCHARDISBOU-008 — `stchar_source_material_inventory_integrity` checks row shape and rationale categories).
- The skill authoring instruction for the inventory subsection (`archive/tickets/SPEC74STCHARDISBOU-001.md`).
- Migration of existing red-bunny STCHAR profiles that lack the subsection (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts` returns ≥1 match in the required-subsection list.
2. `npm test --prefix tools/validators` PASSES with the extended test cases.
3. A representative world-char STCHAR record WITHOUT the `### Stable Source Material Inventory` subsection FAILS the validator with a finding naming the missing subsection.
4. A representative `source_kind: story_local` STCHAR record without the subsection PASSES (the requirement is world_char-scoped).

### Invariants

1. `source_kind: world_char` STCHAR records MUST have a `### Stable Source Material Inventory` subsection under `## Source Distillation`.
2. The validator's required-subsection list maintains its declarative parent-H2 + subsections-array shape.
3. FAIL-everywhere migration policy is enforced (no legacy-warning branch remains).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — extend with positive (subsection present) + negative (subsection missing) + scoping (story_local omission permitted) cases.
2. `tools/validators/tests/integration/spec34-integration.test.ts` — update the synthetic STCHAR body fixture so the pass-world fixture includes required operational-home subsections after fail-everywhere enforcement.

### Commands

1. `npm test --prefix tools/validators` (confirms all body-integrity tests pass, including new cases)
2. `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts` (confirms subsection requirement in code)
3. `node --test dist/tests/structural/stchar-body-integrity.test.js` from `tools/validators` (includes a hand-crafted world-char STCHAR negative fixture missing the subsection and confirms FAIL with the expected finding)

## Outcome

Completed 2026-05-23.

`stchar_body_integrity` now requires `### Stable Source Material Inventory` under `## Source Distillation` for `source_kind: world_char` STCHAR records, while allowing `source_kind: story_local` STCHAR records to omit that world-char inventory subsection. Required-subsection violations now fail everywhere; the old untouched-legacy warning path was removed. The structural test file now covers fail-everywhere behavior, the world-char inventory requirement, and the story-local scoping exception.

The broad package suite exposed one same-seam proof fixture after the fail-everywhere change: `tools/validators/tests/integration/spec34-integration.test.ts` used a synthetic pass-world STCHAR body without the existing operational-home subsections. That fixture was updated to remain a valid pass fixture under the strengthened validator.

## Verification Result

1. `npm test --prefix tools/validators` before edits: PASS (905 tests), establishing a clean baseline.
2. `npm run build` from `tools/validators`: PASS after source/test edits.
3. `node --test dist/tests/structural/stchar-body-integrity.test.js` from `tools/validators`: PASS (13 tests), covering the new world-char inventory requirement, story-local omission allowance, and fail-everywhere subsection severity.
4. Initial post-edit `npm test --prefix tools/validators`: FAIL in `SPEC-34 validators run together through world-validate CLI with pass and fail worlds`; the failure was the same-seam `spec34-pass` synthetic STCHAR fixture missing required subsections after fail-everywhere enforcement.
5. `node --test dist/tests/integration/spec34-integration.test.js` from `tools/validators`: PASS after fixture truthing.
6. Final `npm test --prefix tools/validators`: PASS (907 tests).
7. `grep -n 'Stable Source Material Inventory' tools/validators/src/structural/stchar-body-integrity.ts`: PASS by inspection; the required-subsection list contains the world-char-scoped `Source Distillation` requirement.

## Deviations

- `tools/validators/tests/integration/spec34-integration.test.ts` was added to the touched file set because fail-everywhere enforcement made its pass fixture stale. The change only updates test fixture shape; it does not change SPEC-34 validator behavior.
