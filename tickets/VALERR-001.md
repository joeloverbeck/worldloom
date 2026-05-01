# VALERR-001: Improve validator error messages — name the SEC-only restriction in `rule5_no_consequence_evasion`, surface multiple shape errors per call

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — modify `tools/validators/src/rules/rule5-no-consequence-evasion.ts` and `tools/world-mcp/src/tools/_shared.ts` `validatePatchPlanEnvelopeShape`
**Deps**: None

## Problem

Two adjacent validator-UX gaps surfaced during the canon-addition session that produced PA-0001 for `worlds/erotica-world`:

**Gap A — `rule5_no_consequence_evasion` does not surface the SEC-only restriction in its error message.** The validator (`tools/validators/src/rules/rule5-no-consequence-evasion.ts`) requires every entry in a CF's `required_world_updates` to have a matching SEC operation in the patch plan. When the operator includes a non-SEC file class (e.g., `INVARIANTS` for an `append_extension` op against ONT-2), the error message reads:

> `"CF-0002 requires INVARIANTS, but the patch plan has no matching SEC operation"`

This is technically correct but does not name WHY no SEC operation can match: only the seven SEC file classes (`GEOGRAPHY`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `MAGIC_OR_TECH_SYSTEMS`, `EVERYDAY_LIFE`, `TIMELINE`) are permissible in `required_world_updates`. The operator must read the validator source code to discover the restriction. canon-addition's audit Issue 4 added documentation in `references/engine-envelope-shape.md` §7 to cover this; the validator error message itself is the next layer to improve.

**Gap B — `validatePatchPlanEnvelopeShape` reports only the first shape error per call.** The shape validator at `tools/world-mcp/src/tools/_shared.ts:308-391` returns on the first failed check (`return invalidInput(...)`). When a patch plan has multiple shape errors (e.g., 14 ops all missing `target_file`), the validator reports only the first; the operator fixes it, re-validates, gets the next error, and so on. During PA-0001 assembly the operator wrote a Node script to populate `target_file` on all 14 ops at once, sidestepping the iteration; without the script, fixing 14 ops one-at-a-time would have been slow.

## Assumption Reassessment (2026-05-01)

1. `tools/validators/src/rules/rule5-no-consequence-evasion.ts` `hasMatchingPatchForFileClass` and `sectionIdMatchesFileClass` (lines 115-154) restrict matches to the seven SEC file classes via the `prefixes` map; `FILE_CLASS_TO_SUBDIR[fileClass]` returns `undefined` for non-SEC file classes (notably `INVARIANTS`), causing `hasMatchingPatchForFileClass` to return `false` early.
2. `tools/world-mcp/src/tools/_shared.ts` `validatePatchPlanEnvelopeShape` returns on the first failed check (early returns inside the for-loop at lines 356-388); it does not accumulate multiple errors. Spec / docs reference: no FOUNDATIONS or skill prose mandates single-error vs multi-error reporting; this is implementation choice.
3. Cross-skill shared boundary: `validatePatchPlanEnvelopeShape` is called by both `validate_patch_plan` and `submit_patch_plan` MCP tools; both currently surface only the first shape error. `rule5_no_consequence_evasion` is called by the validator framework per-CF; both consumers benefit from richer error text.
4. FOUNDATIONS principle under audit: §Validation Rules Rule 5 ("If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest") and §Machine-Facing Layer item 4 ("Validator Framework — executable enforcement of Rules 1-7 plus structural invariants"). Both gaps are validator-UX improvements that don't change which states fail validation; they change how the failure is communicated.
6. Schema extension shape: no schema changes. Both gaps are message-format improvements.
7. Adjacent contradictions: none.

## Architecture Check

1. For Gap A: extending the error message to enumerate the permissible SEC file classes plus the routing advice for non-SEC mutations (CH `downstream_updates[]`) is cleaner than letting operators discover the rule from validator source. The information lives in the validator's own constants (`prefixes` map, file-class-to-subdir map); surfacing it in the error message has no maintenance cost beyond the message string.
2. For Gap B: accumulating shape errors and returning all at once is cleaner than the iterate-fix-revalidate loop. The validator already iterates the patches array once; flipping the early-return to error-collection costs minimal additional logic and preserves the input-validation-error-code contract by returning the first error's `field` while listing the rest in a `details.additional_errors[]` array.
3. No backwards-compatibility aliasing/shims introduced. Both gaps preserve the existing error code (`invalid_input` for shape, `rule5.required_update_not_patched` for Rule 5); only the message text and optional details fields change.

## Verification Layers

1. Gap A — Rule 5 message includes SEC-only restriction -> codebase grep-proof: `grep -n "the seven SEC file classes" tools/validators/src/rules/rule5-no-consequence-evasion.ts`.
2. Gap A — error message round-trips a real plan: construct a plan with `required_world_updates: ['INVARIANTS']` and a matching `append_extension` op against an invariant; assert the error message names the SEC-only restriction and routes the operator to CH `downstream_updates[]`.
3. Gap B — multi-error shape validation: construct an envelope with multiple shape errors (e.g., 3 ops missing `target_file`, 1 op missing `payload`) and assert `validatePatchPlanEnvelopeShape` returns ALL errors in `details.additional_errors[]` while preserving the first error's `field` value at the top level for backwards compatibility.

## What to Change

### 1. Gap A — `rule5_no_consequence_evasion` error message

Update `tools/validators/src/rules/rule5-no-consequence-evasion.ts` to construct the failure message as:

```
"<CF-id>.required_world_updates contains '<bad-file-class>'; only the seven SEC file classes are permissible (GEOGRAPHY, PEOPLES_AND_SPECIES, INSTITUTIONS, ECONOMY_AND_RESOURCES, MAGIC_OR_TECH_SYSTEMS, EVERYDAY_LIFE, TIMELINE). For non-SEC mutations (invariant extensions, mystery-reserve entries, open-question entries, modification_history appends), use CH.downstream_updates[] free prose; required_world_updates is reserved for SEC file classes the patch plan must touch via append_touched_by_cf or append_extension on a SEC record."
```

Source the SEC list from the existing `prefixes` map keys to avoid drift.

### 2. Gap B — `validatePatchPlanEnvelopeShape` multi-error accumulation

Modify `tools/world-mcp/src/tools/_shared.ts:308-391` to:

- Collect errors in an array rather than early-returning.
- Return after the full loop completes.
- When 1 error: return the existing `McpError` shape unchanged (backwards-compatible).
- When 2+ errors: return the first error's `McpError` with an additional `details.additional_errors: McpError[]` field listing the others, each with its own `field` path.

### 3. Documentation update (optional, recommended)

Add a brief note to `canon-addition/references/engine-envelope-shape.md` §6 "Pre-validation envelope-shape errors" mentioning that `validate_patch_plan` (and the MCP submit path) now reports all shape errors per call when WMCP/VALERR-001 lands.

## Files to Touch

- `tools/validators/src/rules/rule5-no-consequence-evasion.ts` (modify — error message)
- `tools/world-mcp/src/tools/_shared.ts` (modify — multi-error shape accumulation)
- `tools/world-mcp/src/errors.ts` (modify only if `McpError.details.additional_errors[]` requires a typed shape)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` §6 (modify — note the multi-error reporting once it ships)

## Out of Scope

- Renaming `required_world_updates` to `required_sec_updates` (would be a schema-breaking change; out of scope for a validator-UX ticket).
- Adding a new validator that catches non-SEC `required_world_updates` entries at record-creation time (would duplicate `rule5_no_consequence_evasion` coverage).
- Changing error codes (`invalid_input`, `rule5.required_update_not_patched`) — backwards-compatibility for callers parsing the codes.

## Acceptance Criteria

### Tests That Must Pass

1. Gap A — Rule 5 error message includes the literal phrase "only the seven SEC file classes are permissible" and enumerates all seven.
2. Gap B — multi-error shape validation: a plan with N≥2 shape errors returns the first error's `McpError` plus `details.additional_errors[]` listing the remaining N-1 errors.
3. Gap B — single-error case unchanged: a plan with exactly 1 shape error returns the same `McpError` shape as before this ticket (no `additional_errors[]` field, or empty array).

### Invariants

1. Error codes (`invalid_input`, `rule5.required_update_not_patched`) are unchanged; only message text and optional details fields change.
2. Validator-pass behavior is unchanged — the same plans pass validation before and after this ticket.

## Test Plan

### New/Modified Tests

1. `tools/validators/test/rules/rule5-no-consequence-evasion.test.ts` (modify) — extend with a case covering the new error message text.
2. `tools/world-mcp/test/_shared.envelope-shape.test.ts` (modify or new) — exercise both single-error and multi-error cases.

### Commands

1. `pnpm --filter @worldloom/validators test` and `pnpm --filter @worldloom/world-mcp test`.
2. Dry-run via canon-addition style: construct a plan with `required_world_updates: ['INVARIANTS']` and run `validate_patch_plan` — verify the new error message text.
