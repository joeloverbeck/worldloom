# SPEC74STCHARDISBOU-008: New validator stchar_source_material_inventory_integrity

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new validator file `tools/validators/src/structural/stchar-source-material-inventory-integrity.ts`; registry append at `tools/validators/src/public/registry.ts`; new test file `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts`
**Deps**: None

## Problem

After SPEC74STCHARDISBOU-007 lands, `stchar-body-integrity.ts` requires the `Stable Source Material Inventory` subsection to be present, but does NOT validate its content. A `source_kind: world_char` STCHAR profile could include an empty inventory or an inventory with invalid rows (missing required fields, retained-disposition rows mapping to `Source Distillation` as operational home, `story_irrelevant` rationale using forbidden categories like `opening_not_relevant`). The semantic-loss gap closes structurally only when both shape (SPEC74STCHARDISBOU-007) AND content (this ticket) are validated.

## Assumption Reassessment (2026-05-23)

1. Verified `tools/validators/src/structural/stchar-source-fact-coverage.ts` exists at the cited path and exports the `OPERATIONAL_TARGET_SECTIONS` set at line 23 (currently `const`, not exported — see SPEC74STCHARDISBOU-009 for the extract-to-shared-module work that exposes the constant). This validator must reference the same 11-H2 set per SPEC-74 §4.11 rule 3. Until SPEC74STCHARDISBOU-009 lands, this ticket can either (a) inline-duplicate the constant with a comment pointing at the shared source, or (b) wait for SPEC74STCHARDISBOU-009 — choose (a) for independent landing per the no-Deps decomposition.
2. Verified SPEC-74 §4.11 specifies the validator's 5 rules: non-empty subsection; row shape (`source_area`, `disposition`, `operational_home`, conditional `rationale`); operational-home restriction to the 11 H2s (Source Distillation NOT a retained home); bootstrap `story_irrelevant` rationale category enforcement (5 valid categories); forbidden-rationale-string check (`opening_not_relevant`, `not_needed_on_page_1`, `not_in_root_scene` case-insensitive substring match on the rationale field, not free prose).
3. Cross-skill boundary under audit: this validator runs via the validator-framework run-loop (`tools/validators/src/public/registry.ts`); its diagnostic findings feed the health-audit Phase 2m `stchar_semantic_loss_risk` finding (SPEC74STCHARDISBOU-012); its content-validation contract complements `stchar-body-integrity.ts`'s structural-subsection check (SPEC74STCHARDISBOU-007).
4. FOUNDATIONS principle restated: §Tooling Recommendation ("LLM agents should never operate on prose alone" — structural validators on inventory row shape and rationale categories, not on free-prose semantics). The forbidden-rationale-string check is a case-insensitive substring match on the rationale field (a structured cell), NOT a regex scan of free prose elsewhere — this preserves the "no LLM judgment, no prose-semantic heuristics" discipline.
5. HARD-GATE / Canon Safety Check surface touched: this is a new structural validator under `tools/validators/src/structural/`; per the per-ticket-type granularity in spec-to-tickets, a new structural validator engages this item. The validator gates STCHAR record writes by failing FAIL-everywhere on world_char STCHAR profiles with malformed inventories.

## Architecture Check

1. The validator inspects inventory shape and rationale categories — both structural surfaces (the inventory is a body table with named columns; the rationale is a structured cell). It does NOT regex-detect semantic phrases in free prose; the forbidden-rationale-string check is scoped to the rationale field of inventory rows, not to STCHAR body prose. This preserves the FOUNDATIONS §Tooling Recommendation discipline of structural-only validators.
2. The registry-append pattern matches existing STCHAR validators (`stcharBodyIntegrity`, `stcharSourceFactCoverage`, etc. at `tools/validators/src/public/registry.ts:74-78`): `import { stcharSourceMaterialInventoryIntegrity } from "../structural/stchar-source-material-inventory-integrity.js";` + array entry in `structuralValidators` (line 107). No new framework wiring; the validator is consumed by the framework's run-loop the moment it is registered.

## Verification Layers

1. **Validator file present and exports the validator** → codebase grep-proof: `grep -n 'stcharSourceMaterialInventoryIntegrity\|stchar_source_material_inventory_integrity' tools/validators/src/structural/stchar-source-material-inventory-integrity.ts` returns ≥2 matches (camelCase export + snake_case validator name).
2. **Registry append in place** → grep-proof: `grep -n 'stcharSourceMaterialInventoryIntegrity\|stchar-source-material-inventory-integrity' tools/validators/src/public/registry.ts` returns ≥2 matches (import statement + array entry).
3. **Tests cover positive + negative cases** → `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts` extended with the cases enumerated in SPEC-74 §7.

## What to Change

### 1. Create the validator file

**File**: `tools/validators/src/structural/stchar-source-material-inventory-integrity.ts`

**Registered name**: `stchar_source_material_inventory_integrity`

**Severity**: FAIL on all `source_kind: world_char` STCHAR records under the fail-everywhere policy chosen at SPEC-74 §5 triage.

**Rules**:

1. Require a non-empty `### Stable Source Material Inventory` subsection under `## Source Distillation`.
2. Inventory rows MUST name `source_area`, `disposition`, `operational_home`, and `rationale` when `disposition` is `omitted_with_rationale` or `story_irrelevant`.
3. Valid retained operational homes are the same 11 H2s used by `stchar_source_fact_coverage` (see Assumption Reassessment item 1 for the duplication/extract decision). `Source Distillation` is NOT a retained operational home.
4. At bootstrap, `story_irrelevant` rationale must be one of the structured categories: `outside_story_scope`, `content_constraint`, `premise_incompatible`, `non_operational_trivia`, `duplicate_of_retained_material`.
5. Rationale strings equivalent to `opening_not_relevant`, `not_needed_on_page_1`, `not_in_root_scene` (case-insensitive substring match on the rationale field, NOT free prose elsewhere in the body) are invalid as structured categories.

### 2. Register in `tools/validators/src/public/registry.ts`

Add the import + array entry following the existing STCHAR-validator pattern (lines 73-78 for imports; line 107+ for `structuralValidators` array):

```ts
import { stcharSourceMaterialInventoryIntegrity } from "../structural/stchar-source-material-inventory-integrity.js";
// ...
export const structuralValidators: readonly Validator[] = [
  // ... existing entries
  stcharSourceMaterialInventoryIntegrity,
];
```

### 3. Create the test file

**File**: `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts`

Cases per SPEC-74 §7:
- **Positive**: world-char STCHAR with non-empty inventory mapping retained material to operational H2s passes.
- **Positive**: `story_irrelevant` with structured category `non_operational_trivia` passes when `operational_home` is null and rationale is explicit.
- **Negative**: missing inventory subsection fails (covered by SPEC74STCHARDISBOU-007's `stchar-body-integrity` test surface; assert here that the inventory-integrity validator emits an additional finding citing the missing inventory shape).
- **Negative**: retained-disposition row with `operational_home: Source Distillation` fails (Source Distillation NOT a retained home).
- **Negative**: `story_irrelevant` with rationale containing `not_needed_on_page_1` or `opening_not_relevant` fails (forbidden rationale categories).
- **Positive**: story-local STCHAR (`source_kind: story_local`) MAY omit the inventory subsection — the validator is scoped to `source_kind: world_char` only.

## Files to Touch

- `tools/validators/src/structural/stchar-source-material-inventory-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts` (new)

## Out of Scope

- The body-integrity subsection-presence check (SPEC74STCHARDISBOU-007).
- Extracting `OPERATIONAL_TARGET_SECTIONS` to a shared module (SPEC74STCHARDISBOU-009 — independent ticket; until then, this validator inline-duplicates the constant with a comment pointing at the shared source).
- The skill authoring instruction for the inventory subsection (`archive/tickets/SPEC74STCHARDISBOU-001.md`).
- Migration of existing red-bunny STCHAR profiles that lack the inventory (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'stcharSourceMaterialInventoryIntegrity' tools/validators/src/public/registry.ts` returns ≥2 matches (import + array entry).
2. `npm test --prefix tools/validators` PASSES with all new test cases.
3. A representative world-char STCHAR with an empty inventory FAILS the validator.
4. A representative world-char STCHAR with `story_irrelevant` rationale `not_needed_on_page_1` FAILS the validator.
5. A representative story-local STCHAR without inventory PASSES the validator (scoping check).

### Invariants

1. The validator is structural — it inspects inventory row shape and the rationale field's structured-category value, NOT free-prose semantics elsewhere in the body.
2. `Source Distillation` is NEVER a valid retained operational home; retained material MUST map to one of the 11 operational H2s.
3. Bootstrap `story_irrelevant` rationale MUST be one of the 5 structured categories; opening-page-relevance rationales are forbidden.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts` (new) — positive/negative/scoping cases per Verification Layers item 3.

### Commands

1. `npm test --prefix tools/validators` (confirms new test file passes)
2. `grep -n 'stcharSourceMaterialInventoryIntegrity\|stchar-source-material-inventory-integrity' tools/validators/src/public/registry.ts` (confirms registry append)
3. Dry-run the validator against the 5 fixtures named in §7 (positive valid inventory, story_irrelevant non_operational_trivia, missing subsection, Source-Distillation-as-home, opening-page-relevance rationale) to confirm expected pass/fail pattern.
