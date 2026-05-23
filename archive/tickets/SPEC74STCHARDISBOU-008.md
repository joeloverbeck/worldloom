# SPEC74STCHARDISBOU-008: New validator stchar_source_material_inventory_integrity

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new validator file `tools/validators/src/structural/stchar-source-material-inventory-integrity.ts`; registry append at `tools/validators/src/public/registry.ts`; validator inventory/count updates in `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, and `tools/validators/tests/integration/spec04-verification.test.ts`; new test file `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts`
**Deps**: None

## Problem

After `archive/tickets/SPEC74STCHARDISBOU-007.md` landed, `stchar-body-integrity.ts` requires the `Stable Source Material Inventory` subsection to be present, but does NOT validate its content. A `source_kind: world_char` STCHAR profile could include an empty inventory or an inventory with invalid rows (missing required fields, retained-disposition rows mapping to `Source Distillation` as operational home, `story_irrelevant` rationale using forbidden categories like `opening_not_relevant`). The semantic-loss gap closes structurally only when both shape (`archive/tickets/SPEC74STCHARDISBOU-007.md`) AND content (this ticket) are validated.

## Assumption Reassessment (2026-05-23)

1. Verified `tools/validators/src/structural/stchar-source-fact-coverage.ts` exists at the cited path and exports the `OPERATIONAL_TARGET_SECTIONS` set at line 23 (currently `const`, not exported — see SPEC74STCHARDISBOU-009 for the extract-to-shared-module work that exposes the constant). This validator must reference the same 11-H2 set per SPEC-74 §4.11 rule 3. Until SPEC74STCHARDISBOU-009 lands, this ticket can either (a) inline-duplicate the constant with a comment pointing at the shared source, or (b) wait for SPEC74STCHARDISBOU-009 — choose (a) for independent landing per the no-Deps decomposition.
2. Verified SPEC-74 §4.11 specifies the validator's 5 rules: non-empty subsection; row shape (`source_area`, `disposition`, `operational_home`, conditional `rationale`); operational-home restriction to the 11 H2s (Source Distillation NOT a retained home); bootstrap `story_irrelevant` rationale category enforcement (5 valid categories); forbidden-rationale-string check (`opening_not_relevant`, `not_needed_on_page_1`, `not_in_root_scene` case-insensitive substring match on the rationale field, not free prose).
3. Cross-skill boundary under audit: this validator runs via the validator-framework run-loop (`tools/validators/src/public/registry.ts`); its diagnostic findings feed the health-audit Phase 2m `stchar_semantic_loss_risk` finding (SPEC74STCHARDISBOU-012); its content-validation contract complements `stchar-body-integrity.ts`'s structural-subsection check (`archive/tickets/SPEC74STCHARDISBOU-007.md`).
4. FOUNDATIONS principle restated: §Tooling Recommendation ("LLM agents should never operate on prose alone" — structural validators on inventory row shape and rationale categories, not on free-prose semantics). The forbidden-rationale-string check is a case-insensitive substring match on the rationale field (a structured cell), NOT a regex scan of free prose elsewhere — this preserves the "no LLM judgment, no prose-semantic heuristics" discipline.
5. HARD-GATE / Canon Safety Check surface touched: this is a new structural validator under `tools/validators/src/structural/`; per the per-ticket-type granularity in spec-to-tickets, a new structural validator engages this item. The validator gates STCHAR record writes by failing FAIL-everywhere on world_char STCHAR profiles with malformed inventories.
6. Same-package registry inventory fallout: live reassessment found validator inventory/count surfaces that must move with a new registered structural validator: `tools/validators/README.md` lists STCHAR structural validators, `tools/validators/tests/structural/registry.test.ts` asserts the exact `structuralValidators` name list, and `tools/validators/tests/integration/spec04-verification.test.ts` asserts the structural validator count. These are same-seam proof surfaces, not separate feature work.

## Architecture Check

1. The validator inspects inventory shape and rationale categories — both structural surfaces (the inventory is a body table with named columns; the rationale is a structured cell). It does NOT regex-detect semantic phrases in free prose; the forbidden-rationale-string check is scoped to the rationale field of inventory rows, not to STCHAR body prose. This preserves the FOUNDATIONS §Tooling Recommendation discipline of structural-only validators.
2. The registry-append pattern matches existing STCHAR validators (`stcharBodyIntegrity`, `stcharSourceFactCoverage`, etc. at `tools/validators/src/public/registry.ts:74-78`): `import { stcharSourceMaterialInventoryIntegrity } from "../structural/stchar-source-material-inventory-integrity.js";` + array entry in `structuralValidators` (line 107). No new framework wiring; the validator is consumed by the framework's run-loop the moment it is registered.
3. Updating the package README inventory and exact registry/count assertions keeps the public validator inventory aligned with the executable registry rather than letting broad package tests discover stale same-seam proof surfaces late.

## Verification Layers

1. **Validator file present and exports the validator** → codebase grep-proof: `grep -n 'stcharSourceMaterialInventoryIntegrity\|stchar_source_material_inventory_integrity' tools/validators/src/structural/stchar-source-material-inventory-integrity.ts` returns ≥2 matches (camelCase export + snake_case validator name).
2. **Registry append in place** → grep-proof: `grep -n 'stcharSourceMaterialInventoryIntegrity\|stchar-source-material-inventory-integrity' tools/validators/src/public/registry.ts` returns ≥2 matches (import statement + array entry).
3. **Tests cover positive + negative cases** → `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts` extended with the cases enumerated in SPEC-74 §7.
4. **Validator inventory/count surfaces updated** → grep/count proof: registry expected-name test and README include `stchar_source_material_inventory_integrity`; SPEC-04 structural validator count increments by 1.

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
- **Negative**: missing inventory subsection fails (covered by `archive/tickets/SPEC74STCHARDISBOU-007.md`'s `stchar-body-integrity` test surface; assert here that the inventory-integrity validator emits an additional finding citing the missing inventory shape).
- **Negative**: retained-disposition row with `operational_home: Source Distillation` fails (Source Distillation NOT a retained home).
- **Negative**: `story_irrelevant` with rationale containing `not_needed_on_page_1` or `opening_not_relevant` fails (forbidden rationale categories).
- **Positive**: story-local STCHAR (`source_kind: story_local`) MAY omit the inventory subsection — the validator is scoped to `source_kind: world_char` only.

## Files to Touch

- `tools/validators/src/structural/stchar-source-material-inventory-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — exact registry-name assertion)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural and total validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply STCHAR validator execution-count assertion)
- `tools/validators/README.md` (modify — structural validator inventory)

## Out of Scope

- The body-integrity subsection-presence check (`archive/tickets/SPEC74STCHARDISBOU-007.md`).
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
6. `tools/validators/tests/structural/registry.test.ts` and `tools/validators/tests/integration/spec04-verification.test.ts` remain truthful after the new validator registry entry.

### Invariants

1. The validator is structural — it inspects inventory row shape and the rationale field's structured-category value, NOT free-prose semantics elsewhere in the body.
2. `Source Distillation` is NEVER a valid retained operational home; retained material MUST map to one of the 11 operational H2s.
3. Bootstrap `story_irrelevant` rationale MUST be one of the 5 structured categories; opening-page-relevance rationales are forbidden.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-source-material-inventory-integrity.test.ts` (new) — positive/negative/scoping cases per Verification Layers item 3.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — exact registry-name list includes the new validator.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — package validator count assertions account for the new structural validator.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — pre-apply execution inventory now accounts for eight STCHAR-family validators.

### Commands

1. `npm test --prefix tools/validators` (confirms new test file passes)
2. `grep -n 'stcharSourceMaterialInventoryIntegrity\|stchar-source-material-inventory-integrity' tools/validators/src/public/registry.ts` (confirms registry append)
3. From `tools/validators`: `node --test dist/tests/structural/stchar-source-material-inventory-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js dist/tests/integration/validate-patch-plan.test.js` after `npm run build` (focused compiled proof for validator behavior, registry/count surfaces, and pre-apply execution inventory).

## Outcome

Completed: 2026-05-23

Implemented `stchar_source_material_inventory_integrity` as a new fail-severity structural validator for `source_kind: world_char` STCHAR records. The validator reads the hybrid STCHAR body, requires a non-empty `### Stable Source Material Inventory` subsection under `## Source Distillation`, parses the required inventory table columns, validates row dispositions and retained operational homes, rejects `Source Distillation` as a retained home, enforces the five structured `story_irrelevant` rationale categories, and rejects opening-page relevance rationales only inside the structured rationale cell.

Registered the validator in `structuralValidators`, updated the package README inventory, updated exact registry/count assertions, and updated the clean pre-apply validator execution inventory to account for the eighth STCHAR-family validator. The implementation intentionally inline-duplicates the 11 operational STCHAR H2 names with a comment pointing to the future shared-module extraction owned by SPEC74STCHARDISBOU-009.

## Verification Result

1. From `tools/validators`: `npm run build` — passed.
2. From `tools/validators`: `node --test dist/tests/structural/stchar-source-material-inventory-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js dist/tests/integration/validate-patch-plan.test.js` — passed, 41 tests.
3. From `tools/validators`: `npm test` — passed, 918 tests.

## Deviations

1. Same-seam proof fallout was added during reassessment: `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` moved with the registry entry so package inventory/count and pre-apply execution assertions remained truthful.
2. The focused compiled `spec04-verification` proof must run from the `tools/validators` package root; running the same compiled file from repo root derives the wrong fixture path from `process.cwd()`.
