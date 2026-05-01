# VALERR-001: Improve validator error messages — name the SEC-only restriction in `rule5_no_consequence_evasion`, surface multiple shape errors per call

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — modified `tools/validators/src/rules/rule5-no-consequence-evasion.ts`, `tools/world-mcp/src/tools/_shared.ts` `validatePatchPlanEnvelopeShape`, and the `validate_patch_plan` skipped-response detail surface
**Deps**: None

## Problem

Two adjacent validator-UX gaps surfaced during the canon-addition session that produced PA-0001 for `worlds/erotica-world`:

**At intake, Gap A — `rule5_no_consequence_evasion` did not surface the SEC-only restriction in its error message.** The validator (`tools/validators/src/rules/rule5-no-consequence-evasion.ts`) requires every entry in a CF's `required_world_updates` to have a matching SEC operation in the patch plan. When the operator included a non-SEC file class (e.g., `INVARIANTS` for an `append_extension` op against ONT-2), the error message read:

> `"CF-0002 requires INVARIANTS, but the patch plan has no matching SEC operation"`

This was technically correct but did not name WHY no SEC operation could match: only the seven SEC file classes (`GEOGRAPHY`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `MAGIC_OR_TECH_SYSTEMS`, `EVERYDAY_LIFE`, `TIMELINE`) are permissible in `required_world_updates`. The operator had to read the validator source code to discover the restriction. canon-addition's audit Issue 4 added documentation in `references/engine-envelope-shape.md` §7 to cover this; this ticket moved the same restriction into the validator error message itself.

**At intake, Gap B — `validatePatchPlanEnvelopeShape` reported only the first shape error per call.** The shape validator at `tools/world-mcp/src/tools/_shared.ts:308-391` returned on the first failed check (`return invalidInput(...)`). When a patch plan had multiple shape errors (e.g., 14 ops all missing `target_file`), the validator reported only the first; the operator fixed it, re-validated, got the next error, and so on. During PA-0001 assembly the operator wrote a Node script to populate `target_file` on all 14 ops at once, sidestepping the iteration; without the script, fixing 14 ops one-at-a-time would have been slow.

## Assumption Reassessment (2026-05-01)

1. `tools/validators/src/rules/rule5-no-consequence-evasion.ts` `hasMatchingPatchForFileClass` and `sectionIdMatchesFileClass` (lines 115-154) restrict matches to the seven SEC file classes via the `prefixes` map; `FILE_CLASS_TO_SUBDIR[fileClass]` returns `undefined` for non-SEC file classes (notably `INVARIANTS`), causing `hasMatchingPatchForFileClass` to return `false` early.
2. `tools/world-mcp/src/tools/_shared.ts` `validatePatchPlanEnvelopeShape` returns on the first failed check (early returns inside the for-loop at lines 356-388); it does not accumulate multiple errors. Spec / docs reference: no FOUNDATIONS or skill prose mandates single-error vs multi-error reporting; this is implementation choice.
3. Cross-skill shared boundary: `validatePatchPlanEnvelopeShape` is called by both `validate_patch_plan` and `submit_patch_plan` MCP tools; both currently surface only the first shape error. `validate_patch_plan` additionally drops shape-error details when converting the `McpError` to a `skipped` response, so multi-error reporting must preserve details on that response shape. `rule5_no_consequence_evasion` is called by the validator framework per-CF; both consumers benefit from richer error text.
4. FOUNDATIONS principle under audit: §Validation Rules Rule 5 ("If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest") and §Machine-Facing Layer item 4 ("Validator Framework — executable enforcement of Rules 1-7 plus structural invariants"). Both gaps are validator-UX improvements that don't change which states fail validation; they change how the failure is communicated.
5. HARD-GATE surface: `docs/HARD-GATE-DISCIPLINE.md` routes canon-addition Phase 14a through `validate_patch_plan` and Phase 15a through `submit_patch_plan`; this ticket only enriches fail-closed malformed-envelope diagnostics and does not weaken approval-token validation, submit ordering, pre-apply validator failures, or the Mystery Reserve firewall.
6. Schema extension shape: no schema changes. `validate_patch_plan` receives an additive optional `details` field only on multi-error `skipped` responses; single-error skipped responses remain unchanged.
7. Command-shape correction: the repo root has no `package.json` / `pnpm-workspace.yaml`, while `tools/validators/package.json` and `tools/world-mcp/package.json` expose package-local `npm test` scripts. The test plan is corrected from root `pnpm --filter ... test` to package-local `npm test`.
8. Adjacent contradictions: none.

## Architecture Check

1. For Gap A: extending the error message to enumerate the permissible SEC file classes plus the routing advice for non-SEC mutations (CH `downstream_updates[]`) is cleaner than letting operators discover the rule from validator source. The information lives in the validator's own constants (`prefixes` map, file-class-to-subdir map); surfacing it in the error message has no maintenance cost beyond the message string.
2. For Gap B: accumulating shape errors and returning all at once is cleaner than the iterate-fix-revalidate loop. The validator already iterates the patches array once; flipping the early-return to error-collection costs minimal additional logic and preserves the input-validation-error-code contract by returning the first error's `field` while listing the rest in a `details.additional_errors[]` array. The `validate_patch_plan` wrapper preserves those details only when they exist, so existing single-error skipped response shape stays unchanged.
3. No backwards-compatibility aliasing/shims introduced. Both gaps preserve the existing error code (`invalid_input` for shape, `rule5.required_update_not_patched` for Rule 5); only the message text and optional details fields change.

## Verification Layers

1. Gap A — Rule 5 message includes SEC-only restriction -> codebase grep-proof: `grep -n "the seven SEC file classes" tools/validators/src/rules/rule5-no-consequence-evasion.ts`.
2. Gap A — error message round-trips a real plan: construct a plan with `required_world_updates: ['INVARIANTS']` and a matching `append_extension` op against an invariant; assert the error message names the SEC-only restriction and routes the operator to CH `downstream_updates[]`.
3. Gap B — multi-error shape validation: construct an envelope with multiple shape errors (e.g., 3 ops missing `target_file`, 1 op missing `payload`) and assert `validatePatchPlanEnvelopeShape` returns ALL errors in `details.additional_errors[]` while preserving the first error's `field` value at the top level for backwards compatibility; assert `validate_patch_plan` returns those details on multi-error `skipped` responses.

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
- Preserve `details.additional_errors[]` on `validate_patch_plan` `skipped` responses only when multiple shape errors exist.

### 3. Documentation update

Updated `canon-addition/references/engine-envelope-shape.md` §6 "Pre-validation envelope-shape errors", `tools/world-mcp/README.md`, and `docs/HARD-GATE-DISCIPLINE.md` to document that `validate_patch_plan` and the MCP submit path now report all shape errors per call through `details.additional_errors[]`.

## Files to Touch

- `tools/validators/src/rules/rule5-no-consequence-evasion.ts` (modify — error message)
- `tools/world-mcp/src/tools/_shared.ts` (modify — multi-error shape accumulation)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — preserve multi-error details on skipped response)
- `tools/world-mcp/README.md` (modify — describe optional skipped-response details)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — describe optional skipped-response details in the validate-path contract)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` §6 (modify — note the multi-error reporting once it ships)
- `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` (modify — Rule 5 message coverage)
- `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` (new — envelope shape helper coverage)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — skipped response details coverage)

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

1. `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` (modify) — extend with a case covering the new error message text.
2. `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` (new) — exercise both single-error and multi-error cases.
3. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify) — assert multi-error `skipped` responses preserve `details.additional_errors[]`.

### Commands

1. `npm test` from `tools/validators/`.
2. `npm test` from `tools/world-mcp/`.
3. Dry-run via canon-addition style: construct a plan with `required_world_updates: ['INVARIANTS']` and run `validate_patch_plan` — covered by the package-local Rule 5 and validate handler tests above; no live canon-mutating skill dry-run is required for this validator-UX ticket.

## Outcome

Implemented both validator-UX improvements.

1. `rule5_no_consequence_evasion` now builds its SEC file-class list from the same prefix map used for matching and emits a failure message that names the SEC-only restriction, enumerates all seven accepted SEC classes, and routes non-SEC mutations to CH `downstream_updates[]`.
2. `validatePatchPlanEnvelopeShape` now accumulates envelope and per-op shape errors in one pass. A single error keeps the prior `McpError` shape; multiple errors preserve the first error at top level and list the remaining `invalid_input` errors in `details.additional_errors[]`.
3. `validate_patch_plan` now preserves `details.additional_errors[]` on multi-error `skipped` responses. Single-error skipped responses remain unchanged.
4. Public docs for the validate/submit surfaces were updated in `tools/world-mcp/README.md`, `docs/HARD-GATE-DISCIPLINE.md`, and `canon-addition`'s engine-envelope-shape reference.

## Verification Result

1. `npm test` from `tools/validators/` — passed (84 tests).
2. `npm test` from `tools/world-mcp/` — passed (236 tests).
3. Rule 5 SEC-only message proof is covered by `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts`, including `required_world_updates: ["INVARIANTS"]`, an invariant `append_extension`, the phrase "only the seven SEC file classes are permissible", all seven SEC class names, and `CH.downstream_updates[]`.
4. Multi-error shape proof is covered by `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` and `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`, including single-error unchanged shape and multi-error `details.additional_errors[]` propagation.
5. `git diff --check` — passed.

## Deviations

The drafted root `pnpm --filter ... test` commands were not executable in the live repo because the repo root has no workspace manifest. Verification used the package-local `npm test` scripts from `tools/validators/` and `tools/world-mcp/`, which run each package build before the compiled test suite.
