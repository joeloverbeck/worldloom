# SPEC93DECSTATUR-002: Rehome gates 7 & 9 to record-operating validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`page-plan-turn-driver-consistency.ts`, `page-plan-active-pressure.ts` split; `registry.ts`; retain `turn-driver-pov-observer-firewall.ts`)
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

SPEC-93 §2.4 rehomes two of the nine shared hard gates so they validate the `PG`/`SE` records directly instead of a markdown page plan: gate 7 (plan grounding → state-delta grounding) and gate 9 (turn-driver lawfulness). The deterministic backstops `page-plan-turn-driver-consistency.ts` and `page-plan-active-pressure.ts` currently blend page-plan-markdown parsing with record-field checks. This ticket splits them: retire the plan-markdown-dependent portions (incl. the page-plan active-pressure disposition-table check) and keep the record-based driver-consistency / pressure-table-coherence logic, so gate 9's deterministic backstop operates on records. `turn-driver-pov-observer-firewall.ts` is already record-operating and is retained unchanged.

## Assumption Reassessment (2026-05-28)

1. `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` and `page-plan-active-pressure.ts` blend markdown parsing (`pagePlanTargets()` / `markdownSection`) with record reads (`SE.turn_driver`, `PG.state_snapshot.active_records`); `turn-driver-pov-observer-firewall.ts` is already record-only — confirmed during SPEC-93 reassessment (this session).
2. SPEC-93 §2.4 + §6 validators bullet: retire plan-markdown checks (incl. `page_plan_active_pressure_table_missing`), rehome record-based gate-9 logic, retain `turn-driver-pov-observer-firewall.ts`.
3. Cross-artifact boundary: the nine hard gates are defined in `_shared-templates/story-state-contract.md §7` (gate definitions are amended in SPEC93DECSTATUR-010) and populated by `branching-story-turn-cycle` (SPEC93DECSTATUR-007); this ticket owns only the validator-code backstop. `registry.ts` is shared with SPEC93DECSTATUR-003 (sequenced by Deps).
4. FOUNDATIONS Rule 1 (No Floating Facts): gate-7 grounding rehomes from the markdown plan to the `PG` record's state delta; Rule 7 (Preserve Mystery Deliberately): the record-operating POV/observer firewall (gate 9) is retained — only plan-markdown checks retire.
5. (HARD-GATE / Canon Safety) The enforcement surfaces are the structural validators under `tools/validators/src/structural/` that gate story-bundle record writes at engine pre-apply. The split removes markdown-only checks and preserves record-based coherence; gate 3 (the Mystery Reserve firewall) is a separate validator and is untouched, so the MR firewall is not weakened.
6. (was template item 7 — removed-check blast radius) The retired plan-markdown checks (incl. `page_plan_active_pressure_table_missing`) are removed validator codes; grep pipeline-wide (`tools/validators/src/public/registry.ts`, `tests/`, `_engine-vocabulary-tokens.ts`) for each retired code so no registry entry or test asserts a now-absent check.

## Architecture Check

1. Splitting (rather than wholesale retiring) preserves the record-based driver/pressure coherence that gate 9 still needs, while removing exactly the markdown-coupled logic that the page-plan removal makes dead.
2. No backwards-compatibility shim: the markdown-parsing code paths are deleted, not flag-guarded; `turn-driver-pov-observer-firewall.ts` stays as-is.

## Verification Layers

1. Gate-9 record-based driver lawfulness holds on planless records -> schema/fixture test (driver-consistency fixture passes on a `PG`/`SE` with no page plan present).
2. Active-pressure record-coherence retained, markdown-table check retired -> codebase grep-proof (`page_plan_active_pressure_table_missing` absent; record-based pressure-urgency logic present).
3. POV/observer firewall retained -> codebase grep-proof (`turn-driver-pov-observer-firewall.ts` unchanged).
4. Gate-7 grounding rehomed to record -> FOUNDATIONS alignment check (Rule 1).

## What to Change

### 1. Split `page-plan-turn-driver-consistency.ts`

Remove the page-plan-markdown parsing (`pagePlanTargets()` / `markdownSection(TURN_DRIVER_SECTION_HEADING)`); keep the record-based comparison of `SE.turn_driver` / `PG.input.resolved_event_id`. The validator now reads only records (gate-9 driver-consistency backstop).

### 2. Split `page-plan-active-pressure.ts`

Remove the markdown disposition-table parse and the `page_plan_active_pressure_table_missing` check; keep `highUrgencyActiveRecords()` and the record-based pressure-urgency coherence.

### 3. Registry + retain

Update `tools/validators/src/public/registry.ts` to reflect the split validators' record-only forms. Confirm `turn-driver-pov-observer-firewall.ts` remains registered and unchanged.

## Files to Touch

- `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (modify)
- `tools/validators/src/structural/page-plan-active-pressure.ts` (modify)
- `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` (modify)
- `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (modify)
- `tools/validators/src/public/registry.ts` (modify — shared with SPEC93DECSTATUR-003)

## Out of Scope

- Retiring the page-plan structural validators wholesale (SPEC93DECSTATUR-003).
- The gate definitions in `story-state-contract.md §7` (SPEC93DECSTATUR-010).
- The skill-side gate population in `branching-story-turn-cycle` (SPEC93DECSTATUR-007).
- `turn-driver-pov-observer-firewall.ts` logic (retained unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. Driver-consistency + active-pressure fixtures pass on records with no page plan present (record-only inputs).
2. `grep -rn "page_plan_active_pressure_table_missing\|pagePlanTargets\|markdownSection" tools/validators/src/structural/page-plan-turn-driver-consistency.ts tools/validators/src/structural/page-plan-active-pressure.ts` returns no markdown-parse references.
3. `(cd tools/validators && npm run build && npm test)` green.

### Invariants

1. Gate 9's record-based driver/POV/pressure coherence is preserved; only plan-markdown checks retire.
2. The Mystery Reserve firewall (gate 3) is untouched by this ticket.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` — record-only fixtures; markdown-dependent cases removed.
2. `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` — record-based pressure coherence; disposition-table cases removed.

### Commands

1. `(cd tools/validators && npm run build && npm test)`
2. Full-pipeline gate behavior on planless records is exercised in SPEC93DECSTATUR-013.
