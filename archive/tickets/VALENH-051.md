# VALENH-051: Truth validators README inventory against live registry

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes - documentation/test-surface truthing for `tools/validators/README.md`; no validator behavior change intended.
**Deps**: `archive/tickets/VALENH-050.md`

## Problem

Post-ticket review for `VALENH-050` exposed a package-public documentation drift in `tools/validators/README.md`: at intake the README said the package had 94 structural validators, but the built registry exposed 101 structural validators. The README structural inventory also omitted seven current registry names:

- `chc_slt_selected_commitment_trace`
- `page_affordance_integrity`
- `page_plan_turn_driver_consistency`
- `active_pressure_handling_discipline`
- `turn_driver_schema_compliance`
- `turn_driver_pov_observer_firewall`
- `stplan_predicate_references`

The drift was not part of `VALENH-050`'s owned message-UX fix, but it was a real package handoff gap: README inventory should match the live registry when it claims exact validator counts and lists.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** `tools/validators/src/public/registry.ts` is the live structural validator registry, and the built `tools/validators/dist/src/public/registry.js` reported 101 structural validators during this run. `tools/validators/tests/structural/registry.test.ts` asserts the exact live structural name list and includes the seven names missing from the README.
2. **Specs/docs reassessment.** At intake, `tools/validators/README.md` stated: "the 94 structural validators, the 12 rule-derived/story-scope validators" and its structural inventory omitted the seven names listed in `## Problem`. The README is linked from `docs/MACHINE-FACING-LAYER.md` as the validator inventory and CLI reference.
3. **Shared boundary under audit.** The shared boundary is the package-public validator inventory: `tools/validators/src/public/registry.ts` plus `tools/validators/tests/structural/registry.test.ts` are the machine/test authority, and `tools/validators/README.md` is the human-facing package summary.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS' tooling recommendation favors explicit, current machine-facing context. A stale validator inventory misleads operators about which structural checks exist and weakens handoff traceability, even when the validators themselves are correct.
5. **HARD-GATE / validation-signal surface.** This ticket did not change validator registration, verdict behavior, `applies_to`, `validate_patch_plan`, or pre-apply gating. It truthed the package README and added a README/registry parity guard. The Mystery Reserve firewall and existing hard gates remain unchanged.
6. **Adjacent contradiction classification.** The README also lists rule-derived validators in the same bullet style as structural validators; simple whole-file bullet counts include those 12 rule names. The landed guard compares the README's structural section only, not the whole README bullet list.
7. **Mismatch correction.** The live registry count used for implementation was 101 structural validators, not 94. The final README and parity guard now match that live registry count.
8. **Proof-surface correction.** `tools/validators/package.json` runs tests from compiled `dist/` output after `npm run build`. The landed proof therefore builds first, then runs `node --test dist/tests/structural/registry.test.js`. The README parity guard reads `../../../README.md` from the compiled test file location so it checks the package README used by operators.

## Architecture Check

1. README truthing was the smallest corrective action because the validator registry and exact-list registry test were already current and green.
2. No backwards-compatibility aliasing/shims introduced. The change does not add duplicate validator names, aliases, or stale alternate inventory sections.
3. A narrow README/registry parity test is local and low-risk because `registry.test.ts` already owns the exact structural validator list; the added assertion prevents package-public inventory drift without changing validator behavior.

## Verification Layers

1. README count and structural list match the live registry -> focused runtime probe over `tools/validators/README.md` and `tools/validators/dist/src/public/registry.js`.
2. Registry behavior unchanged and README parity guarded -> `tools/validators/tests/structural/registry.test.ts` passes from compiled output.
3. Package docs surface remains coherent -> manual review of `tools/validators/README.md` status line and structural inventory.
4. HARD-GATE validation semantics unchanged -> manual review that no validator source, registry source, `applies_to`, or pre-apply behavior changed.

## Landed Changes

### 1. `tools/validators/README.md`

Updated the status count from 94 to 101 and added the seven missing structural validator names in live registry order. The structural inventory now matches `structuralValidators.map((validator) => validator.name)`.

### 2. `tools/validators/tests/structural/registry.test.ts`

Added a README/registry parity assertion beside the existing exact registry list test. The test extracts only the README's `Structural validators:` section, so the 12 rule-derived validators are not mixed into the structural count.

## Files to Touch

- `tools/validators/README.md` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/dist/**` (ignored rebuild artifact refreshed by `npm run build`)

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

1. `tools/validators/tests/structural/registry.test.ts` — adds a focused README structural-inventory parity assertion against the live public registry.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/registry.test.js`
3. A focused README parity probe comparing the structural section in `tools/validators/README.md` against `structuralValidators.map((validator) => validator.name)`.

## Outcome

Completed. `tools/validators/README.md` now reports 101 structural validators and its structural inventory matches the live public registry order. `registry.test.ts` now guards that README section against future registry drift.

## Verification Result

1. Pre-edit baseline `cd tools/validators && npm run build` passed.
2. Pre-edit baseline `cd tools/validators && node --test dist/tests/structural/registry.test.js` passed: 1 passing test.
3. Final `cd tools/validators && npm run build` passed after the README/test edits.
4. Final `cd tools/validators && node --test dist/tests/structural/registry.test.js` passed: 2 passing tests.
5. Focused README parity probe passed: `README structural validators match registry: 101`.
6. Manual review confirmed no validator source, registry source, `applies_to`, pre-apply behavior, or HARD-GATE semantics changed.

## Deviations

- The optional parity guard was added because the existing registry exact-list test was the obvious local proof surface.
- The first post-edit build caught a strict TypeScript capture typing issue in the new README parser helper; the helper was tightened and the final build/test proof passed.
