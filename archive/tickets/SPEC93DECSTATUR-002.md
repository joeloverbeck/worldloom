# SPEC93DECSTATUR-002: Rehome gates 7 & 9 to record-operating validators

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`page-plan-turn-driver-consistency.ts`, `page-plan-active-pressure.ts` split; `registry.ts`; retain `turn-driver-pov-observer-firewall.ts`)
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

SPEC-93 §2.4 rehomes two of the nine shared hard gates so they validate the `PG`/`SE` records directly instead of a markdown page plan: gate 7 (plan grounding → state-delta grounding) and gate 9 (turn-driver lawfulness). The deterministic backstops `page-plan-turn-driver-consistency.ts` and `page-plan-active-pressure.ts` currently blend page-plan-markdown parsing with record-field checks. This ticket splits them: retire the plan-markdown-dependent portions (incl. the page-plan active-pressure disposition-table check) and keep the record-based driver-consistency / pressure-table-coherence logic, so gate 9's deterministic backstop operates on records. `turn-driver-pov-observer-firewall.ts` is already record-operating and is retained unchanged.

## Assumption Reassessment (2026-05-28)

1. `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` and `page-plan-active-pressure.ts` blend markdown parsing (`pagePlanTargets()` / `markdownSection`) with record reads (`SE.turn_driver`, `PG.state_snapshot.active_records`); `active-pressure-handling-discipline.ts` is the live markdown-table validator that consumes the `page-plan-active-pressure.ts` table parser; `turn-driver-pov-observer-firewall.ts` is already record-only — confirmed during SPEC-93 reassessment (this session).
2. SPEC-93 §2.4 + §6 validators bullet: retire plan-markdown checks (incl. `page_plan_active_pressure_table_missing`), rehome record-based gate-9 logic, retain `turn-driver-pov-observer-firewall.ts`.
3. Cross-artifact boundary: the nine hard gates are defined in `_shared-templates/story-state-contract.md §7` (gate definitions are amended in SPEC93DECSTATUR-010) and populated by `branching-story-turn-cycle` (SPEC93DECSTATUR-007); this ticket owns only the validator-code backstop. `registry.ts` is shared with SPEC93DECSTATUR-003 (sequenced by Deps).
4. FOUNDATIONS Rule 1 (No Floating Facts): gate-7 grounding rehomes from the markdown plan to the `PG` record's state delta; Rule 7 (Preserve Mystery Deliberately): the record-operating POV/observer firewall (gate 9) is retained — only plan-markdown checks retire.
5. (HARD-GATE / Canon Safety) The enforcement surfaces are the structural validators under `tools/validators/src/structural/` that gate story-bundle record writes at engine pre-apply. The split removes markdown-only checks and preserves record-based SE/PG coherence; gate 3 (the Mystery Reserve firewall) is a separate validator and is untouched, so the MR firewall is not weakened.
6. (was template item 7 — removed-check blast radius) The retired plan-markdown checks (incl. `page_plan_active_pressure_table_missing` and `active_pressure_handling_discipline`) are removed validator codes; grep pipeline-wide (`tools/validators/src/public/registry.ts`, `tests/`, `_engine-vocabulary-tokens.ts`) for each retired code so no registry entry or test asserts a now-absent check. Same-seam widening: removing the `page-plan-active-pressure.ts` markdown parser requires retiring `active-pressure-handling-discipline.ts` in this ticket because otherwise the package keeps a zombie page-plan validator after the helper parser is removed.

## Architecture Check

1. Splitting (rather than wholesale retiring) preserves the record-based driver coherence that gate 9 still needs, while removing exactly the markdown-coupled logic that the page-plan removal makes dead.
2. No backwards-compatibility shim: the markdown-parsing code paths are deleted, not flag-guarded; `turn-driver-pov-observer-firewall.ts` stays as-is.

## Verification Layers

1. Gate-9 record-based driver lawfulness holds on planless records -> schema/fixture test (driver-consistency fixture passes on a `PG`/`SE` with no page plan present).
2. Active-pressure table checks retired -> codebase grep-proof (`page_plan_active_pressure_table_missing` / `active_pressure_handling_discipline` absent from live registry/tests; `page-plan-active-pressure.ts` no longer contains table parsing).
3. POV/observer firewall retained -> codebase grep-proof (`turn-driver-pov-observer-firewall.ts` unchanged).
4. Gate-7 grounding rehomed to record -> FOUNDATIONS alignment check (Rule 1).

## What to Change

### 1. Split `page-plan-turn-driver-consistency.ts`

Remove the page-plan-markdown parsing (`pagePlanTargets()` / `markdownSection(TURN_DRIVER_SECTION_HEADING)`); keep a record-based comparison of `PG.input.resolved_event_id` to the resolved `SE` record's `created_at_page` / `turn_driver`. The validator now reads only records (gate-9 driver-consistency backstop).

### 2. Split `page-plan-active-pressure.ts`

Remove the markdown disposition-table parse and the `page_plan_active_pressure_table_missing` check. Retire `active-pressure-handling-discipline.ts` because its only live contract is the page-plan §7a markdown table; gate-9 record lawfulness remains covered by `turn-driver-schema-compliance`, `page_plan_turn_driver_consistency`, and `turn-driver-pov-observer-firewall`.

### 3. Registry + retain

Update `tools/validators/src/public/registry.ts` to reflect the split validators' record-only forms and remove `active_pressure_handling_discipline`. Confirm `turn-driver-pov-observer-firewall.ts` remains registered and unchanged.

## Files to Touch

- `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (modify)
- `tools/validators/src/structural/page-plan-active-pressure.ts` (modify)
- `tools/validators/src/structural/active-pressure-handling-discipline.ts` (delete — absorbed same-seam markdown-table retirement)
- `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` (modify)
- `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (delete — absorbed same-seam markdown-table retirement)
- `tools/validators/src/public/registry.ts` (modify — shared with SPEC93DECSTATUR-003)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (modify)
- `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts` (modify)
- `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts` (modify)
- `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts` (modify)
- `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- Retiring the page-plan structural validators wholesale (SPEC93DECSTATUR-003).
- The gate definitions in `story-state-contract.md §7` (SPEC93DECSTATUR-010).
- The skill-side gate population in `branching-story-turn-cycle` (SPEC93DECSTATUR-007).
- `turn-driver-pov-observer-firewall.ts` logic (retained unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. Driver-consistency fixtures pass on records with no page plan present (record-only inputs).
2. `grep -rn "page_plan_active_pressure_table_missing\|active_pressure_handling_discipline\|pagePlanTargets\|markdownSection" tools/validators/src/structural/page-plan-turn-driver-consistency.ts tools/validators/src/structural/page-plan-active-pressure.ts tools/validators/src/public/registry.ts tools/validators/tests` returns no live registry/test/source references except historical fixture README notes if intentionally left for downstream cleanup.
3. `(cd tools/validators && npm run build)` green; focused owned compiled tests green. Full `(cd tools/validators && npm test)` was run after `npm run clean` and remains red on pre-existing broad compatibility-drift fixtures outside this ticket's validator seam (see `## Deviations`).

### Invariants

1. Gate 9's record-based driver/POV coherence is preserved; only plan-markdown checks retire.
2. The Mystery Reserve firewall (gate 3) is untouched by this ticket.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` — record-only fixtures; markdown-dependent cases removed.
2. `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` — deleted with the retired markdown-table validator.

### Commands

1. `(cd tools/validators && npm run build && npm test)`
2. Full-pipeline gate behavior on planless records is exercised in SPEC93DECSTATUR-013.

## Outcome

Completed: 2026-05-28

Implemented the SPEC-93 gate-9 validator split in `tools/validators`: `page_plan_turn_driver_consistency` no longer reads `page_plan_drafts`, `pagePlanTargets()`, or markdown section `7a`; it now validates record-level `PG.input.resolved_event_id` -> `SE.created_at_page` consistency for turn-driver events. The page-plan active-pressure table parser was removed from `page-plan-active-pressure.ts`, and the markdown-only `active_pressure_handling_discipline` validator plus its test were retired from the public registry.

Same-seam widening from reassessment: `active_pressure_handling_discipline` was absorbed because it was the live consumer of the active-pressure markdown table parser. Keeping it would have left a zombie page-plan validator after the parser removal.

Updated validator registry/docs and SPEC-76/SPEC-85 fixture tests to stop expecting page-plan section/table verdicts while preserving record-based driver, POV/observer-firewall, and response-grounding checks.

## Verification Result

PASS — `(cd tools/validators && npm run build)` completed successfully after the validator/test edits.

PASS — `(cd tools/validators && node --test dist/tests/structural/registry.test.js dist/tests/structural/page-plan-turn-driver-consistency.test.js dist/tests/integration/spec76-red-kiln-ambush.test.js dist/tests/integration/spec85-clock-fire-route-closes.test.js dist/tests/integration/spec85-multi-actor-collision-confrontation.test.js dist/tests/integration/spec85-offstage-bridge-sabotage.test.js dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js dist/tests/integration/validate-patch-plan.test.js)` passed 37/37 focused compiled tests, proving the owned registry, record-only validator, fixture, and pre-apply execution-surface changes.

PASS — `rg -n "activePressureHandlingDiscipline|active_pressure_handling_discipline|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_disposition_unknown|active_pressure_deferred_without_expiry|active_pressure_rejection_reason_missing|pagePlanTargets|markdownSection" tools/validators/src/structural/page-plan-turn-driver-consistency.ts tools/validators/src/structural/page-plan-active-pressure.ts tools/validators/src/public/registry.ts tools/validators/tests` returned no hits, proving no live registry/test/source reference remains for the retired table validator or markdown parser in the owned surfaces.

## Deviations

- Full `(cd tools/validators && npm test)` was run after `npm run clean` and remains red outside this ticket's owned seam: the broad suite reports four failures from historical full-world/compatibility-drift fixtures (first visible failure: `spec43-midstory-introduction.test.js` expects a synthetic legacy bundle to validate cleanly while `compatibility_drift` emits informational optional-directory verdicts). The focused owned test lane above is green; this ticket did not modify compatibility-drift behavior or those legacy fixture expectations.
- The active-pressure table validator was deleted rather than rewritten record-only because no surviving record schema carries selected/deferred/rejected disposition rows. Record-level gate-9 lawfulness is preserved by `turn_driver_schema_compliance`, `page_plan_turn_driver_consistency`, `turn_driver_pov_observer_firewall`, and `turn_cycle_output_grounding_integrity`.
