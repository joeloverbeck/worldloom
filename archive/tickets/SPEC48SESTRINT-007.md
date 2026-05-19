# SPEC48SESTRINT-007: Replace `non-propagation-tag-shape.ts` with `non_propagation_facts_completeness` validator + delete old validator + update registry / README / tests

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — replaces 1 structural validator (delete `non-propagation-tag-shape.ts`; create `non-propagation-facts-completeness.ts`); updates registry + README + validator tests + downstream `world-mcp` capability-parity expected validator list; deletes old test file
**Deps**: archive/tickets/SPEC48SESTRINT-003.md

## Problem

SPEC-48 D-B7 specifies replacing `tools/validators/src/structural/non-propagation-tag-shape.ts` (which currently validates parseable `non_propagation:<reason>(group=..., records=[...])` tag syntax + required-when-cited semantics inside `SE.world_logic_rationale`) with a thin `non_propagation_facts_completeness` structural validator that preserves the required-when-cited semantics against the new `SE.non_propagation_facts[]` structured field. SPEC-48 D-C2 specifies deleting the old `non-propagation-tag-shape.ts` (its work is subsumed by the schema's `oneOf` / `enum` constraints at ticket 001 + the new completeness validator). Under the clean-break design, parsing the deprecated tag grammar from prose makes no sense — the new validator checks completeness against the structured field directly.

## Assumption Reassessment (2026-05-19)

1. **Current validator surface verified**: `tools/validators/src/structural/non-propagation-tag-shape.ts:9-14` defines the 5-value `VALID_REASONS` set (migrated to schema enum by ticket 001); `non-propagation-tag-shape.ts:85` defines the regex `^non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)$` (replaced by structured-field schema validation); `non-propagation-tag-shape.ts:119,131` carry `suggested_fix` strings referencing the deprecated grammar; `non-propagation-tag-shape.ts:128` carries a required-when-cited check (the prose names a non-propagation reason without a matching parseable tag → fail). The required-when-cited semantics are the irreducible behavior to preserve in the replacement validator.
2. **SPEC-48 D-B7 + D-C2 enumeration**: D-B7 creates the replacement `non_propagation_facts_completeness` validator preserving the required-when-cited semantics of the deleted validator; D-C2 deletes the old `non-propagation-tag-shape.ts` (subsumed by D-B7).
3. **Cross-skill boundary**: the validator registers in `tools/validators/src/public/registry.ts:19,103` (verified via the spot-check grep at Step 2); is named in `tools/validators/README.md:58` validator-inventory line; is tested by `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (the existing test file) and referenced by integration test at `tools/validators/tests/integration/validate-patch-plan.test.ts:108`. The blast radius beyond SPEC-48 D-B7's enumerated files extends to these 4 ancillary files (per SPEC-30 mechanical-drift precedent: validator-deletion blast radius routinely extends to registry + README + paired test files).
4. **FOUNDATIONS Rule 5 (No Consequence Evasion)**: the required-when-cited semantics enforce that an SE naming a non-propagation reason (in prose or via the structured field) must carry the structured-field entry — preventing the silent drop where the prose mentions a reason but no machine-readable record exists. This is Rule 5 in the witness-coverage domain: if the event has non-propagation consequence semantics, the consequence must be ground-truth-recorded in `non_propagation_facts[]`, not relegated to prose where downstream consumers cannot reliably extract it.
5. **Canon Safety surface**: both the deleted `non-propagation-tag-shape.ts` and the new `non_propagation_facts_completeness.ts` live under `tools/validators/src/structural/`. Per-ticket-type granularity rule fires. The new validator preserves the Canon Safety contract — required-when-cited semantics are the firewall the old validator enforced; the new validator's structured-field check is the equivalent enforcement against the post-clean-break input shape.
6. **Rename / remove**: `non-propagation-tag-shape.ts` (validator + test file) deletion — registered in `registry.ts`, named in `README.md`, tested by `non-propagation-tag-shape.test.ts`, referenced in `validate-patch-plan.test.ts`. Replacement registers as `non_propagation_facts_completeness` — new name, new file (per kebab-case-to-snake-case validator-name convention), new test file.
7. **Baseline and downstream consumer proof**: pre-edit `npm test --prefix tools/validators` passed with 620 tests. After the validator rename, `tools/world-mcp/tests/server/capability-parity.test.ts` was same-seam fallout because it asserts the complete validator registry exposed through the local `@worldloom/validators` dependency; the expected list now names `non_propagation_facts_completeness` and includes the already-live `record_introduction_uniqueness` validator.

## Architecture Check

1. **Thin completeness validator**: the replacement is intentionally narrower than the old `tag-shape` validator — schema-level checks (closed `reason` enum, closed `records[]` RECORD_ID pattern) are now handled by `story-event.schema.json` (ticket 001), so the validator only needs the required-when-cited semantic check. Cleaner than carrying tag-syntax validation logic that the schema now subsumes.
2. **No backwards-compatibility aliasing**: the validator under the new name + new field consumer has no parseable-tag fallback. The deleted validator's behavior is replaced verbatim by schema rejection (for shape) + new validator (for completeness); no shim wraps the old behavior.

## Verification Layers

1. Old validator file deleted → `test ! -f tools/validators/src/structural/non-propagation-tag-shape.ts` returns success.
2. New validator file present → `test -f tools/validators/src/structural/non-propagation-facts-completeness.ts` returns success.
3. Registry updated → grep proof: `grep -n "nonPropagationTagShape\|non-propagation-tag-shape" tools/validators/src/public/registry.ts` returns zero matches AFTER refactor; `grep -n "nonPropagationFactsCompleteness\|non-propagation-facts-completeness" tools/validators/src/public/registry.ts` returns ≥2 matches (import + array entry).
4. README inventory updated → grep proof: `grep -n "non_propagation_tag_shape\|non_propagation_facts_completeness" tools/validators/README.md` returns 1 match for the new name; zero matches for the old.
5. Test files updated → `test ! -f tools/validators/tests/structural/non-propagation-tag-shape.test.ts` returns success; `test -f tools/validators/tests/structural/non-propagation-facts-completeness.test.ts` returns success.
6. Required-when-cited regression coverage → new validator's test cases cover the same positive (reason cited + structured entry present → PASS) and negative (reason cited in prose + no structured entry → FAIL) cases as the deleted validator.

## Landed Changes

### 1. Create `tools/validators/src/structural/non-propagation-facts-completeness.ts`

Created the new validator. It reads `SE.non_propagation_facts[]` through `readSeNonPropagationFacts(event)`, preserves the old full-world / touched-SE / `create_se_record` applicability surface, and emits `non_propagation_facts_completeness.missing_structured_entry` when `world_logic_rationale` names a closed-set non-propagation reason without a matching structured fact entry.

### 2. Delete `tools/validators/src/structural/non-propagation-tag-shape.ts`

The deprecated validator file was deleted. Its old tag-shape checks are now split between schema-level `non_propagation_facts[]` shape enforcement from ticket 001 and the new completeness validator's required-when-cited check.

### 3. Update `tools/validators/src/public/registry.ts`

Replaced the import and structural-validator array entry with `nonPropagationFactsCompleteness`, preserving insertion order.

### 4. Update `tools/validators/README.md` validator inventory

Replaced the old inventory entry with `non_propagation_facts_completeness`.

### 5. Update `tools/validators/tests/structural/registry.test.ts`

Replaced the expected registry-name entry with `non_propagation_facts_completeness`.

### 6. Update `tools/validators/tests/integration/validate-patch-plan.test.ts`

Replaced the pre-apply execution-status lookup with `non_propagation_facts_completeness`.

### 7. Delete `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` + create `non-propagation-facts-completeness.test.ts`

Deleted the old tag-shape test and created a structured-field completeness test with positive, negative, no-reference, duplicate-reason, and applicability-scope coverage.

### 8. Update downstream `world-mcp` validator-registry parity

Updated `tools/world-mcp/tests/server/capability-parity.test.ts` so the expected validator registry names match the current validator package after the rename.

## Files to Touch

- `tools/validators/src/structural/non-propagation-facts-completeness.ts` (new)
- `tools/validators/src/structural/non-propagation-tag-shape.ts` (delete)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (delete)
- `tools/validators/tests/structural/non-propagation-facts-completeness.test.ts` (new)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)

## Out of Scope

- Introduction-grounding validator refactor (deferred to ticket 004).
- Plan-relation consumer refactor (completed in archive/tickets/SPEC48SESTRINT-005.md).
- Expected-witness-coverage refactor (completed in archive/tickets/SPEC48SESTRINT-006.md).
- Schema field changes (covered by ticket 001).
- Parser file deletion (deferred to ticket 009).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator test suite passes, including the new `non-propagation-facts-completeness.test.ts` positive + negative cases.
2. Grep proof of deletion: `test ! -f tools/validators/src/structural/non-propagation-tag-shape.ts` returns success.
3. Grep proof of creation: `test -f tools/validators/src/structural/non-propagation-facts-completeness.ts` returns success.
4. Grep proof of registry swap: `grep -n "nonPropagationTagShape\|non-propagation-tag-shape" tools/validators/src/public/registry.ts` returns zero matches; `grep -n "nonPropagationFactsCompleteness" tools/validators/src/public/registry.ts` returns ≥2 matches.
5. Grep proof of README update: `grep -n "non_propagation_tag_shape" tools/validators/README.md` returns zero matches; `grep -n "non_propagation_facts_completeness" tools/validators/README.md` returns 1 match.
6. Grep proof of test rename: `grep -rn "non_propagation_tag_shape" tools/validators/tests/` returns zero matches in production-test code (any matches inside fixture inputs documenting historical behavior should be inspected manually before commit).

### Invariants

1. The required-when-cited semantics are preserved — every reason named in `world_logic_rationale` prose still requires a matching structured-field entry; gaps fire a verdict with the same severity as the deleted validator's `missing_tag` verdict.
2. The 5-value reason set is preserved verbatim (`no_witness | witness_incapacitated | evidence_concealed | institution_suppresses_report | event_leaves_no_accessible_trace`); both the new validator and the schema enum (ticket 001) use this exact set.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/non-propagation-facts-completeness.test.ts` (new) — positive case: SE with structured-field entry matching the reason cited in prose → PASS; negative case: SE with prose-cited reason but no structured-field entry → FAIL with `missing_structured_entry`; edge case: SE with no reason references → PASS.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — swap the name entry.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — swap the integration assertion to the new validator name.
4. `tools/world-mcp/tests/server/capability-parity.test.ts` (modify) — update the downstream expected validator registry names after the rename.

### Commands

1. `npm test --prefix tools/validators` — full test suite.
2. `rg -n "nonPropagationTagShape|non-propagation-tag-shape|non_propagation_tag_shape" tools/validators/src tools/validators/tests tools/validators/README.md` — confirms zero matches in current source, tests, and package inventory (ignored generated `dist/` is excluded from this proof).
3. `npm run build --prefix tools/world-mcp` followed by `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp/` — downstream validator-registry parity proof.

## Outcome

Completed: 2026-05-19

Implemented the SPEC-48 non-propagation validator replacement:

- Deleted `tools/validators/src/structural/non-propagation-tag-shape.ts` and its tag-syntax test.
- Added `tools/validators/src/structural/non-propagation-facts-completeness.ts` and `tools/validators/tests/structural/non-propagation-facts-completeness.test.ts`.
- Swapped the validator registry, validator README, structural registry test, and `validatePatchPlan` integration test from `non_propagation_tag_shape` to `non_propagation_facts_completeness`.
- Updated `tools/world-mcp/tests/server/capability-parity.test.ts` so the downstream validator-registry expected list matches the current validator package after the rename.

## Verification Result

- Baseline before edits: `npm test --prefix tools/validators` passed with 620 tests.
- `npm run build --prefix tools/validators` passed after implementation.
- Focused compiled validator proof passed: `node --test dist/tests/structural/non-propagation-facts-completeness.test.js`.
- Registry proof passed: `node --test dist/tests/structural/registry.test.js`.
- Pre-apply integration proof passed: `node --test dist/tests/integration/validate-patch-plan.test.js`.
- Negative stale-symbol proof passed: `rg -n "nonPropagationTagShape|non-propagation-tag-shape|non_propagation_tag_shape" tools/validators/src tools/validators/tests tools/validators/README.md` returned no matches.
- Deletion proofs passed: `test ! -f tools/validators/src/structural/non-propagation-tag-shape.ts` and `test ! -f tools/validators/tests/structural/non-propagation-tag-shape.test.ts`.
- Final clean broad validator suite passed after `npm run clean --prefix tools/validators`: `npm test --prefix tools/validators` passed with 620 tests.
- Downstream capability parity passed after `npm run build --prefix tools/world-mcp`: `node --test dist/tests/server/capability-parity.test.js` passed from `tools/world-mcp/`.

## Deviations

- The replacement validator preserved the live old validator's applicability surface (`full-world`, `create_se_record` patch plans, and touched story-event files), not only the narrower prose phrase "pre-apply scoped to create_se_record plans".
- `tools/world-mcp/tests/server/capability-parity.test.ts` was added to the touched file set after the downstream parity proof exposed same-seam registry-name fallout. The same update also included the already-live `record_introduction_uniqueness` validator that the previous expected list had missed.
