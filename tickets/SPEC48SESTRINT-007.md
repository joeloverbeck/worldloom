# SPEC48SESTRINT-007: Replace `non-propagation-tag-shape.ts` with `non_propagation_facts_completeness` validator + delete old validator + update registry / README / tests

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — replaces 1 structural validator (delete `non-propagation-tag-shape.ts`; create `non-propagation-facts-completeness.ts`); updates registry + README + 2 test files; deletes old test file
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

## What to Change

### 1. Create `tools/validators/src/structural/non-propagation-facts-completeness.ts`

New validator file. Implementation:

```typescript
import type { IndexedRecord, Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue } from "./utils.js";
import { readSeNonPropagationFacts } from "./midstory-introduction-utils.js";

const VALIDATOR = "non_propagation_facts_completeness";
const VALID_REASONS = new Set([
  "no_witness",
  "witness_incapacitated",
  "evidence_concealed",
  "institution_suppresses_report",
  "event_leaves_no_accessible_trace"
]);
const REASON_TOKEN_PATTERN =
  /\b(no_witness|witness_incapacitated|evidence_concealed|institution_suppresses_report|event_leaves_no_accessible_trace)\b/g;

export const nonPropagationFactsCompleteness = {
  name: VALIDATOR,
  // applies_to: pre-apply scoped to create_se_record plans (same scope as deleted validator)
  // run(event): check that every reason named in world_logic_rationale prose has a matching
  //   structured entry in SE.non_propagation_facts[]; emit `missing_structured_entry` verdict for gaps.
  // ... (full implementation following the same shape as the deleted non-propagation-tag-shape.ts:122-134
  //      `missing` function, but reading `readSeNonPropagationFacts(event)` instead of regex-extracting tags)
};
```

Preserve the exact `applies_to: create_se_record` scoping from the deleted validator. The required-when-cited check finds every `REASON_TOKEN_PATTERN` match in `world_logic_rationale` prose, then asserts that each matched reason appears as a `reason` field in at least one entry of `readSeNonPropagationFacts(event)`. Gaps emit a `non_propagation_facts_completeness.missing_structured_entry` verdict with `suggested_fix: "Add an SE.non_propagation_facts[] entry with reason=<reason>, group=<witness-group>, records=[<record_ids>]."`.

### 2. Delete `tools/validators/src/structural/non-propagation-tag-shape.ts`

The deprecated validator file. Its work is subsumed by (i) schema-level rejection of malformed `non_propagation_facts[]` shape at ticket 001 + (ii) the new completeness validator above.

### 3. Update `tools/validators/src/public/registry.ts`

Replace the import at line 19 (`import { nonPropagationTagShape } from "../structural/non-propagation-tag-shape.js"`) with `import { nonPropagationFactsCompleteness } from "../structural/non-propagation-facts-completeness.js"`. Replace the array entry at line 103 (`nonPropagationTagShape,`) with `nonPropagationFactsCompleteness,`. Preserve the array's insertion order.

### 4. Update `tools/validators/README.md` validator inventory

Replace line 58 (`- non_propagation_tag_shape`) with `- non_propagation_facts_completeness`.

### 5. Update `tools/validators/tests/structural/registry.test.ts`

Replace the test-array name entry (around line 24 per the grep proof — `"non_propagation_tag_shape",`) with `"non_propagation_facts_completeness",`. Preserve the array's insertion order.

### 6. Update `tools/validators/tests/integration/validate-patch-plan.test.ts`

Replace the integration-test reference (around line 108 per the grep) — `result.executions.find((execution) => execution.name === "non_propagation_tag_shape")` becomes `result.executions.find((execution) => execution.name === "non_propagation_facts_completeness")`. Update any subsequent assertion shape to match the new validator's verdict-code (`non_propagation_facts_completeness.missing_structured_entry` instead of `non_propagation_tag_shape.malformed_tag` / `non_propagation_tag_shape.missing_tag`).

### 7. Delete `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` + create `non-propagation-facts-completeness.test.ts`

Delete the old test file. Create a new test file with positive cases (SE carrying `non_propagation_facts[]` entries matching the reasons named in `world_logic_rationale`), negative cases (SE naming a reason in prose without a matching structured entry → `missing_structured_entry` verdict), and edge cases (empty `non_propagation_facts[]` + prose with no reason references → PASS).

## Files to Touch

- `tools/validators/src/structural/non-propagation-facts-completeness.ts` (new)
- `tools/validators/src/structural/non-propagation-tag-shape.ts` (delete)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (delete)
- `tools/validators/tests/structural/non-propagation-facts-completeness.test.ts` (new)

## Out of Scope

- Introduction-grounding validator refactor (deferred to ticket 004).
- Plan-relation consumer refactor (deferred to ticket 005).
- Expected-witness-coverage refactor (deferred to ticket 006).
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

### Commands

1. `npm test --prefix tools/validators` — full test suite.
2. `grep -rn "nonPropagationTagShape\|non-propagation-tag-shape\|non_propagation_tag_shape" tools/validators/` — confirms zero matches in `src/` and `tests/` (excluding `dist/` build output which regenerates from source).
