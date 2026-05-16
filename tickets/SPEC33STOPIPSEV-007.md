# SPEC33STOPIPSEV-007: Fix `validation_trace.gates[]` wording + add structural validator + dist-JS-path note

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `_shared-templates/story-state-contract.md` prose updates at §7 and §4.2a; new structural validator at `tools/validators/src/structural/validation-trace-shape-compliance.ts`; new test fixture at `tools/validators/tests/structural/`; registry edit at `tools/validators/src/public/registry.ts`.
**Deps**: None

## Problem

`.claude/skills/_shared-templates/story-state-contract.md` §7 (Eight Shared Hard Gates) says gate results are recorded in `PG.validation_trace.gates[]`. The PG schema at §4.2 uses a flat mapping with eight schema keys (`input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold` — verified at lines 151-158). No `.gates[]` array exists in the schema. A skill author or future validator could implement an array shape rejected by `record_schema_compliance`, or accept two competing shapes silently. Additionally, the hash CLI runtime path is documented in skills as `dist/src/cli/compute-pg-hashes.js` while §10/§4.2a names only the TS source path `tools/world-mcp/src/cli/compute-pg-hashes.ts` — both paths coexist by design (the auditor's WL-S7-P2-008 misread this as drift; rolled into this ticket as a low-cost clarification).

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of contract drift**: live read of `_shared-templates/story-state-contract.md` confirms §7 wording references `PG.validation_trace.gates[]`; live grep of §4.2 confirms the flat mapping at lines 151-158 with the 8 keys named in the Problem. Live read of `tools/world-mcp/src/cli/compute-pg-hashes.ts` (TS source) and `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` (compiled output) confirms both paths exist by design.
2. **Codebase verification of validator infrastructure**: `tools/validators/src/structural/` contains 16 existing validator files; `tools/validators/src/public/registry.ts` line 28 declares `export const structuralValidators: readonly Validator[] = [...]` with imports at lines 1-25; `tools/validators/tests/structural/` exists as the test fixture directory; `tools/validators/package.json` test script is `npm run build && node --test dist/tests/**/*.test.js`.
3. **Cross-skill boundary**: the shared boundary under audit is `_shared-templates/story-state-contract.md` §4.2 PG schema (flat mapping) and the `record_schema_compliance` structural validator's accepted-shape contract. The new `validation_trace_shape_compliance` validator structurally forecloses the drift class without changing the schema.
4. **FOUNDATIONS principle restatement**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts; schema shape must match prose); §Canonical Storage Layer (`record_schema_compliance` gate). The new validator strengthens the existing structural-validator surface; the contract prose fix aligns prose with schema.
5. **HARD-GATE / canon-write / Canon Safety Check surface**: the new `validation-trace-shape-compliance` validator adds a Canon Safety Check surface to `tools/validators/src/structural/`, registered alongside the 15 existing structural validators. The Mystery Reserve firewall is not weakened — the validator enforces `PG.validation_trace` shape (the eight HARD-GATE result keys); it has no Mystery Reserve interaction. The HARD-GATE semantics in PG-authoring skills (bootstrap, turn-cycle) remain unchanged; the validator catches shape drift at the validator layer, not at the HARD-GATE layer.
6. **Schema extension check**: this ticket does NOT extend the `validation_trace` schema or add new fields — it strictly enforces the existing 8-key flat mapping at §4.2 and rejects the prose-implied `gates[]` array. The validator is additive at the structural layer; no schema field changes.
7. **Rename / removal blast radius**: this ticket does NOT rename or remove any field. The `validation_trace.gates[]` prose path was never valid; removing it from §7 does not affect any production code path (no consumer reads `gates[]` because the schema never defined it).

## Architecture Check

1. The three sub-changes (contract prose fix, new validator, new test fixture) land atomically because they serve one architectural goal: the schema at §4.2 is the canonical shape, and both the §7 prose AND a structural validator must reflect it. Cleaner than alternatives that would (a) only fix the §7 prose (leaves the drift re-emergent on the next skill amendment) or (b) only add the validator (leaves the contract internally inconsistent).
2. The new validator follows the existing sibling pattern: implementation file in `src/structural/`, registry import + array append in `src/public/registry.ts`, test fixture in `tests/structural/`. No new architectural surface; the validator instantiates the established pattern.
3. No backwards-compatibility aliasing/shims introduced — the `gates[]` array shape is rejected, not accepted alongside the flat mapping.

## Verification Layers

1. `validation_trace.gates` reference removed from contract §7 → codebase grep-proof.
2. Contract §4.2a documents both TS source and JS dist paths → manual review.
3. New validator implementation file exists at canonical path and is registered → codebase grep-proof + registry import inspection.
4. Validator test fixture passes its four cases → `npm run test` in `tools/validators/`.
5. Validator FAILs on `validation_trace.gates: [...]` array shape → fixture test result.
6. PG schema at §4.2 unchanged (still 8-key flat mapping) → manual review.

## What to Change

### 1. Contract prose §7 — replace `validation_trace.gates[]` wording

In `.claude/skills/_shared-templates/story-state-contract.md` §7 (Eight Shared Hard Gates), replace any sentence containing `PG.validation_trace.gates[]` with:

```
Gate results are recorded in the flat `PG.validation_trace` mapping using
the eight schema keys defined in §4.2 (one entry per gate, keyed by the
gate name).
```

### 2. Contract prose §4.2a — add dist-JS-path note

Add a one-line clarification at §4.2a:

```
Implementation source: `tools/world-mcp/src/cli/compute-pg-hashes.ts`.
Runtime invocation after build: `node
tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-md-path> --pg
<pg-record-path>`. The TS source path is the canonical reference; the dist
JS path is the runtime invocation. Both are correct in their respective
contexts.
```

### 3. New structural validator

Create `tools/validators/src/structural/validation-trace-shape-compliance.ts` that:

- Implements the `Validator` interface (same shape as sibling validators in `src/structural/`).
- Inspects every PG record (`page_record`) in the bundle.
- For each PG record's `validation_trace` field:
  - PASS if `validation_trace` is an object with EXACTLY the eight enumerated keys (`input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold`).
  - FAIL with diagnostic `validation_trace_shape_compliance` if `validation_trace.gates` exists as a key (array or otherwise).
  - FAIL if `validation_trace` has extraneous keys beyond the eight.
  - FAIL if `validation_trace` is missing any of the eight keys.

### 4. Register the new validator

In `tools/validators/src/public/registry.ts`:

- Add an import: `import { validationTraceShapeCompliance } from "../structural/validation-trace-shape-compliance.js";`
- Add `validationTraceShapeCompliance` to the `structuralValidators` array.

### 5. Test fixture

Create `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` exercising four cases against synthetic PG records:

- Case 1: PG with flat mapping and all eight keys → PASS.
- Case 2: PG with `validation_trace.gates: [...]` array → FAIL with diagnostic `validation_trace_shape_compliance`.
- Case 3: PG with flat mapping but extraneous keys → FAIL.
- Case 4: PG with flat mapping missing one gate key → FAIL.

Follow the existing test-fixture pattern in sibling tests under `tools/validators/tests/structural/`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §7 prose + §4.2a clarification)
- `tools/validators/src/structural/validation-trace-shape-compliance.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — import + array append)
- `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` (new)

## Out of Scope

- PG schema at §4.2 — already canonical (flat 8-key mapping); not modified.
- `record_schema_compliance` validator — already handles general schema compliance; the new validator is shape-specific to `validation_trace` and complements `record_schema_compliance`.
- Other structural validators in `src/structural/` — not modified.
- TS source vs dist JS path conventions across the rest of the codebase — the §4.2a note only documents the existing two-path coexistence; no other surfaces are normalized.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'validation_trace\.gates' .claude/skills/_shared-templates/story-state-contract.md` returns zero matches.
2. `grep -n 'compute-pg-hashes.js' .claude/skills/_shared-templates/story-state-contract.md` returns a match in §4.2a's new clarification.
3. `test -f tools/validators/src/structural/validation-trace-shape-compliance.ts` succeeds.
4. `grep -n 'validationTraceShapeCompliance' tools/validators/src/public/registry.ts` returns the import + array-entry matches.
5. `test -f tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` succeeds.
6. `cd tools/validators && npm run test` passes; the new validator's four-case test fixture all pass.

### Invariants

1. `PG.validation_trace` is a flat 8-key mapping; the `.gates[]` array shape is rejected at the structural-validator layer.
2. The contract §7 prose names the canonical 8 keys; the schema at §4.2 is the single source of truth.
3. The new validator integrates with the existing `structuralValidators` registry without breaking sibling validators.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` — four-case fixture exercising PASS (all 8 keys) and FAIL (gates-array; extraneous keys; missing key).

### Commands

1. `cd tools/validators && npm run build` — must succeed.
2. `cd tools/validators && npm run test` — full validator test suite passes including the new fixture.
3. `grep -nE 'validation_trace\.gates|gates\[\]' .claude/skills/_shared-templates/story-state-contract.md` — must return zero matches.
4. `grep -n 'compute-pg-hashes.(ts|js)' .claude/skills/_shared-templates/story-state-contract.md` — returns matches naming both paths in §4.2a.
