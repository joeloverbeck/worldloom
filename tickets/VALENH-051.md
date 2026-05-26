# VALENH-051: Truth validators README inventory against live registry

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes - documentation/test-surface truthing for `tools/validators/README.md`; no validator behavior change intended.
**Deps**: `archive/tickets/VALENH-050.md`

## Problem

Post-ticket review for `VALENH-050` exposed a package-public documentation drift in `tools/validators/README.md`: the README says the package has 94 structural validators, but the built registry currently exposes 101 structural validators. The README structural inventory also omits seven current registry names:

- `chc_slt_selected_commitment_trace`
- `page_affordance_integrity`
- `page_plan_turn_driver_consistency`
- `active_pressure_handling_discipline`
- `turn_driver_schema_compliance`
- `turn_driver_pov_observer_firewall`
- `stplan_predicate_references`

The drift is not part of `VALENH-050`'s owned message-UX fix, but it is a real package handoff gap: README inventory should match the live registry when it claims exact validator counts and lists.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** `tools/validators/src/public/registry.ts` is the live structural validator registry, and the built `tools/validators/dist/src/public/registry.js` currently reports 101 structural validators. `tools/validators/tests/structural/registry.test.ts` asserts the exact live structural name list and includes the seven names missing from the README.
2. **Specs/docs reassessment.** `tools/validators/README.md` states: "the 94 structural validators, the 12 rule-derived/story-scope validators" and its structural inventory omits the seven names listed in `## Problem`. The README is linked from `docs/MACHINE-FACING-LAYER.md` as the validator inventory and CLI reference.
3. **Shared boundary under audit.** The shared boundary is the package-public validator inventory: `tools/validators/src/public/registry.ts` plus `tools/validators/tests/structural/registry.test.ts` are the machine/test authority, and `tools/validators/README.md` is the human-facing package summary.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS' tooling recommendation favors explicit, current machine-facing context. A stale validator inventory misleads operators about which structural checks exist and weakens handoff traceability, even when the validators themselves are correct.
5. **HARD-GATE / validation-signal surface.** This ticket must not change validator registration, verdict behavior, `applies_to`, `validate_patch_plan`, or pre-apply gating. It should only truth the package README and, if useful, add a README/registry parity guard. The Mystery Reserve firewall and existing hard gates remain unchanged.
6. **Adjacent contradiction classification.** The README also lists rule-derived validators in the same bullet style as structural validators; simple whole-file bullet counts include those 12 rule names. The implementation should compare the README's structural section only, not the whole README bullet list.
7. **Mismatch correction.** The current registry count is 101 structural validators, not 94. If implementation-time registry count changes again, use the live registry/test list as authority and record the updated count before editing.

## Architecture Check

1. README truthing is the smallest corrective action because the validator registry and exact-list registry test are already current and green.
2. No backwards-compatibility aliasing/shims introduced. Do not add duplicate validator names, aliases, or stale alternate inventory sections.

## Verification Layers

1. README count and structural list match the live registry -> codebase grep/probe over `tools/validators/README.md` and `tools/validators/dist/src/public/registry.js`.
2. Registry behavior unchanged -> existing `tools/validators/tests/structural/registry.test.ts` continues to pass from compiled output.
3. Package docs surface remains coherent -> manual review of `tools/validators/README.md` status line and structural inventory.
4. HARD-GATE validation semantics unchanged -> manual review that no validator source, registry source, `applies_to`, or pre-apply behavior changed.

## What to Change

### 1. `tools/validators/README.md`

Update the status count from 94 to the live structural validator count and add the seven missing structural validator names in the correct inventory positions.

### 2. Optional parity guard

If the package has an established README/registry parity test or an obvious narrow place to add one, add/update it. If no such guard exists and adding one would be heavier than the docs fix, record manual parity proof instead.

## Files to Touch

- `tools/validators/README.md` (modify)
- `tools/validators/tests/**` (modify only if adding a narrow README/registry parity guard is clearly local and low-risk)

## Out of Scope

- Changing validator registration, validator behavior, severity, `applies_to`, or verdict payloads.
- Updating historical tickets, reports, or triage notes that mention older validator counts.
- Reworking the README's broader organization beyond the count/list truthing needed here.

## Acceptance Criteria

### Tests That Must Pass

1. README structural count matches the live registry count.
2. README structural inventory includes every name from `structuralValidators.map((validator) => validator.name)` exactly once.
3. `cd tools/validators && npm run build` passes.
4. `cd tools/validators && node --test dist/tests/structural/registry.test.js` passes.

### Invariants

1. Validator runtime behavior and pre-apply gating are unchanged.
2. README remains a human-facing inventory of the live package, not a historical migration log.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/registry.test.ts` or a new README parity test only if implementation adds a low-risk automated guard.
2. Otherwise: `None - documentation-only ticket; verification is command-based and existing registry test coverage is named in Assumption Reassessment.`

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/registry.test.js`
3. A focused README parity probe comparing the structural section in `tools/validators/README.md` against `structuralValidators.map((validator) => validator.name)`.
