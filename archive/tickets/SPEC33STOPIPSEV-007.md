# SPEC33STOPIPSEV-007: Fix `validation_trace.gates[]` wording + add structural validator + dist-JS-path note

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `_shared-templates/story-state-contract.md` prose updates at §7 and §4.2a; new structural validator at `tools/validators/src/structural/validation-trace-shape-compliance.ts`; new structural fixture, registry tests, integration proof-fixture updates under `tools/validators/tests/`; registry edit at `tools/validators/src/public/registry.ts`; SPEC-33 D7 implementation note.
**Deps**: None

## Problem

At intake, `.claude/skills/_shared-templates/story-state-contract.md` §7 (Eight Shared Hard Gates) said gate results were recorded in `PG.validation_trace.gates[]`. The shared contract's §4.2 PG schema sketch used a flat mapping with eight named gate keys (`input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold`). No `.gates[]` array exists in the contract sketch. The current JSON Schema at `tools/validators/src/schemas/story-page.schema.json` keeps `validation_trace` permissive (`additionalProperties: true`), so `record_schema_compliance` does not enforce the eight-key shape by itself. Before this ticket, a skill author or future validator could therefore implement an array shape or accept two competing shapes silently unless a structural validator closed the gap. Additionally, the hash CLI runtime path was documented in skills as `dist/src/cli/compute-pg-hashes.js` while §10/§4.2a named only the TS source path `tools/world-mcp/src/cli/compute-pg-hashes.ts` — both paths coexist by design (the auditor's WL-S7-P2-008 misread this as drift; rolled into this ticket as a low-cost clarification).

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of contract drift**: intake live read of `_shared-templates/story-state-contract.md` confirmed §7 wording referenced `PG.validation_trace.gates[]`; live grep of §4.2 confirmed the flat mapping with the 8 keys named in the Problem. Live read of `tools/validators/src/schemas/story-page.schema.json` confirmed the machine JSON Schema is currently permissive for `validation_trace` (`additionalProperties: true`), so this ticket's new structural validator becomes the enforcing layer for the eight-key shape. Live read of `tools/world-mcp/src/cli/compute-pg-hashes.ts` (TS source) and `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` (compiled output) confirmed both paths exist by design.
2. **Codebase verification of validator infrastructure**: `tools/validators/src/structural/` contained 15 structural validator files plus `utils.ts` before this ticket; `tools/validators/src/public/registry.ts` declares `export const structuralValidators: readonly Validator[] = [...]`; `tools/validators/tests/structural/` exists as the test fixture directory; `tools/validators/package.json` test script is `npm run build && node --test dist/tests/**/*.test.js`.
3. **Cross-skill boundary**: the shared boundary under audit is `_shared-templates/story-state-contract.md` §4.2 PG contract sketch (flat mapping) and the structural validator registry's accepted-shape contract. The new `validation_trace_shape_compliance` validator structurally forecloses the drift class without changing the permissive JSON Schema.
4. **FOUNDATIONS principle restatement**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts; schema shape must match prose); §Canonical Storage Layer (`record_schema_compliance` gate). The new validator strengthens the existing structural-validator surface; the contract prose fix aligns prose with schema.
5. **HARD-GATE / canon-write / Canon Safety Check surface**: the new `validation-trace-shape-compliance` validator adds a Canon Safety Check surface to `tools/validators/src/structural/`, registered alongside the 15 existing structural validators. The Mystery Reserve firewall is not weakened — the validator enforces `PG.validation_trace` shape (the eight HARD-GATE result keys); it has no Mystery Reserve interaction. The HARD-GATE semantics in PG-authoring skills (bootstrap, turn-cycle) remain unchanged; the validator catches shape drift at the validator layer, not at the HARD-GATE layer.
6. **Schema extension check**: this ticket does NOT extend the `validation_trace` schema or add new fields — it strictly enforces the existing 8-key flat mapping from the §4.2 contract sketch and rejects the prose-implied `gates[]` array. The validator is additive at the structural layer; no JSON Schema field changes.
7. **Rename / removal blast radius**: this ticket does NOT rename or remove any field. The `validation_trace.gates[]` prose path was never valid; removing it from §7 does not affect any production code path (no consumer reads `gates[]` because the schema never defined it).

## Architecture Check

1. The three sub-changes (contract prose fix, new validator, new test fixture) land atomically because they serve one architectural goal: the schema at §4.2 is the canonical shape, and both the §7 prose AND a structural validator must reflect it. Cleaner than alternatives that would (a) only fix the §7 prose (leaves the drift re-emergent on the next skill amendment) or (b) only add the validator (leaves the contract internally inconsistent).
2. The new validator follows the existing sibling pattern: implementation file in `src/structural/`, registry import + array append in `src/public/registry.ts`, test fixture in `tests/structural/`. No new architectural surface; the validator instantiates the established pattern.
3. No backwards-compatibility aliasing/shims introduced — the `gates[]` array shape is rejected, not accepted alongside the flat mapping.

## Verification Layers

1. `validation_trace.gates` reference removed from contract §7 → codebase grep-proof.
2. Contract §4.2a documents both TS source and JS dist paths → manual review.
3. New validator implementation file exists at canonical path and is registered → codebase grep-proof + registry import inspection.
4. Validator test fixture passes its five cases → `npm run test` in `tools/validators/`.
5. Validator FAILs on `validation_trace.gates: [...]` array shape → fixture test result.
6. PG schema at §4.2 unchanged (still 8-key flat mapping) → manual review.

## Landed Changes

### 1. Contract prose §7 — replace `validation_trace.gates[]` wording

In `.claude/skills/_shared-templates/story-state-contract.md` §7 (Eight Shared Hard Gates), replace any sentence containing `PG.validation_trace.gates[]` with:

```
Gate results are recorded in the flat `PG.validation_trace` mapping using
the eight schema keys defined in §4.2 (one entry per gate, keyed by the
gate name).
```

### 2. Contract prose §4.2a — add dist-JS-path note

Added a one-line clarification at §4.2a:

```
Implementation source: `tools/world-mcp/src/cli/compute-pg-hashes.ts`.
Runtime invocation after build: `node
tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-md-path> --pg
<pg-record-path>`. The TS source path is the canonical reference; the dist
JS path is the runtime invocation. Both are correct in their respective
contexts.
```

### 3. New structural validator

Created `tools/validators/src/structural/validation-trace-shape-compliance.ts` that:

- Implements the `Validator` interface (same shape as sibling validators in `src/structural/`).
- Inspects every PG record (`page_record`) in the bundle.
- PASSes when `validation_trace` is a plain object with exactly the eight enumerated keys (`input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold`).
- FAILs with diagnostic `validation_trace_shape_compliance` if `validation_trace.gates` exists as a key (array or otherwise).
- FAILs if `validation_trace` has extraneous keys beyond the eight.
- FAILs if `validation_trace` is missing any of the eight keys.

### 4. Register the new validator

In `tools/validators/src/public/registry.ts`:

- Added import: `import { validationTraceShapeCompliance } from "../structural/validation-trace-shape-compliance.js";`
- Added `validationTraceShapeCompliance` to the `structuralValidators` array.

### 5. Test fixture

Created `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` exercising five cases against synthetic PG records:

- Case 1: PG with flat mapping and all eight keys → PASS.
- Case 2: PG with `validation_trace.gates: [...]` array → FAIL with diagnostic `validation_trace_shape_compliance`.
- Case 3: PG with flat mapping but extraneous keys → FAIL.
- Case 4: PG with flat mapping missing one gate key → FAIL.
- Case 5: validator applies to `create_pg_record` pre-apply plans and skips non-PG pre-apply plans.

Same-seam fixture fallout also landed: registry-count tests now expect 16 structural validators, clean pre-apply execution tests expect `validation_trace_shape_compliance` to skip when no PG record is touched, and page-plan integration fixtures include a valid flat `validation_trace`.

The new fixture follows the existing sibling-test pattern under `tools/validators/tests/structural/`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §7 prose + §4.2a clarification)
- `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` (modify — dated D7 implementation note)
- `archive/tickets/SPEC33STOPIPSEV-007.md` (modify — reassessment correction, closeout, and archival)
- `tools/validators/src/structural/validation-trace-shape-compliance.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — import + array append)
- `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — expected structural validator list)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — active mechanized validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply skip expectation and PG fixture trace)

## Out of Scope

- PG schema at §4.2 — already canonical (flat 8-key mapping); not modified.
- `record_schema_compliance` validator — remains the general schema-compliance layer; the new validator is shape-specific to `validation_trace` and enforces a stricter contract than the current permissive JSON Schema.
- Other structural validators in `src/structural/` — not modified.
- TS source vs dist JS path conventions across the rest of the codebase — the §4.2a note only documents the existing two-path coexistence; no other surfaces are normalized.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'validation_trace\.gates' .claude/skills/_shared-templates/story-state-contract.md` returns zero matches.
2. `grep -n 'compute-pg-hashes.js' .claude/skills/_shared-templates/story-state-contract.md` returns a match in §4.2a's new clarification.
3. `test -f tools/validators/src/structural/validation-trace-shape-compliance.ts` succeeds.
4. `grep -n 'validationTraceShapeCompliance' tools/validators/src/public/registry.ts` returns the import + array-entry matches.
5. `test -f tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` succeeds.
6. `cd tools/validators && npm run test` passes; the new validator's focused fixture and same-seam registry/integration fixtures all pass.

### Invariants

1. `PG.validation_trace` is a flat 8-key mapping; the `.gates[]` array shape is rejected at the structural-validator layer.
2. The contract §7 prose names the canonical 8 keys; the schema at §4.2 is the single source of truth.
3. The new validator integrates with the existing `structuralValidators` registry without breaking sibling validators.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` — five-case fixture exercising PASS (all 8 keys), FAIL (gates-array; extraneous keys; missing key), and pre-apply selector behavior.
2. `tools/validators/tests/structural/registry.test.ts` — expected structural validator list now includes `validation_trace_shape_compliance`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — active mechanized validator counts now reflect 16 structural validators / 26 total validators.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — clean pre-apply skips the PG-only validator when no PG is touched; page-cycle fixtures include valid flat `validation_trace`.

### Commands

1. `cd tools/validators && npm run build` — must succeed.
2. `cd tools/validators && npm run test` — full validator test suite passes including the new fixture.
3. `if grep -nE 'validation_trace\.gates|gates\[\]' .claude/skills/_shared-templates/story-state-contract.md; then exit 1; fi` — passes with zero matches.
4. `grep -nE 'compute-pg-hashes\.(ts|js)' .claude/skills/_shared-templates/story-state-contract.md` — returns matches naming both paths in §4.2a.

## Outcome

Completed: 2026-05-16.

The shared story-state contract no longer says gate results live at `PG.validation_trace.gates[]`; §7 now points to the flat eight-key mapping from §4.2. §4.2a now documents the TypeScript source path and compiled dist-JS runtime invocation for `compute-pg-hashes`.

`tools/validators` now includes and registers `validation_trace_shape_compliance`, a structural validator that enforces the exact flat eight-key `PG.validation_trace` mapping and rejects `gates` / missing / extraneous keys. The validator is scoped to full-world runs, `create_pg_record` pre-apply plans, and page-record touched files.

## Verification Result

Commands run:

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && npm run test` — first run failed on same-seam proof fixtures: SPEC-04 expected 15 structural validators instead of 16, and clean pre-apply execution expected every non-listed validator to pass rather than allowing the new PG-only validator to skip. Fixture expectations were truthed.
3. `cd tools/validators && npm run test` — passed after fixture truthing: 274 tests, 274 pass.
4. `if grep -n 'validation_trace\.gates' .claude/skills/_shared-templates/story-state-contract.md; then exit 1; fi` — passed with zero matches.
5. `grep -n 'compute-pg-hashes' .claude/skills/_shared-templates/story-state-contract.md` — passed; §4.2a names both `tools/world-mcp/src/cli/compute-pg-hashes.ts` and `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`.

## Deviations

- Live reassessment corrected the enforcement model: `record_schema_compliance` does not reject `validation_trace.gates[]` because the current JSON Schema keeps `validation_trace` permissive. The new structural validator is the exact-shape enforcement layer.
- Same-seam integration tests were updated after the first broad package run exposed stale registry count and skip/pass expectations.
