# SPEC76TURDRIPRI-006: Validator — `active_pressure_handling_discipline`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/active-pressure-handling-discipline.ts`; new registry entry at `tools/validators/src/public/registry.ts`
**Deps**: archive/tickets/SPEC76TURDRIPRI-002.md

## Problem

Active high-urgency STPLAN / STEMO / CLK / THR / STSEC / STQ / OBL / CNSQ records on a parent PG.state_snapshot can persist across pages without ever being selected as a turn driver, deferred with expiry, or rejected with reason — the structural inertness that makes the system feel reactive. SPEC-76 §3.2 introduces the page-plan §7a `Active-pressure disposition` table as the structural fix: every high-urgency active record must appear in exactly one row classified as `selected`, `deferred` (with expiry), or `rejected` (with reason). SPEC-76 §3.6.4 prescribes a new structural validator `active_pressure_handling_discipline` that enforces the table's content — every high-urgency active record present and accounted for; rejection rows carry reasons; deferred rows carry expiries; dispositions are from the closed `{selected, deferred, rejected}` set.

## Assumption Reassessment (2026-05-23)

1. PG record schema at `tools/validators/src/schemas/story-page.schema.json:50-73` defines `state_snapshot.active_records` with per-record-class active-record arrays (STENT, STINT, SF, BEL, etc.); per SPEC-76 §3.6.4 high-urgency classification, the per-class urgency criteria are STPLAN with `current_step` due-this-page, STEMO at `intensity: high` with non-empty `behavioral_pressure`, CLK at threshold, THR with active and ≥1 page-old escalation, STSEC reveal-ready, STQ with payoff-due, OBL/CNSQ with `urgency: high`. Verified via reassess-spec Agent 1 in this session. Page-plan body is parsed via the shared §7a/§16a structured-text parser introduced in SPEC76TURDRIPRI-005.
2. SPEC-76 §3.6.4 prescribes the validator's severity differential (`fail` for high-urgency unhandled; `warn` for medium-urgency unhandled), inputs (`PG.state_snapshot.active_records (per record class), page-plan §7a active-pressure table`), and 4 error codes verbatim: `high_urgency_active_record_unhandled`, `active_pressure_rejection_reason_missing`, `active_pressure_deferred_without_expiry`, `active_pressure_disposition_unknown`. Per SPEC-76 §9 Risk Reassessment, the concrete medium-tier table is deferred to ticket-time enumeration alongside this validator's implementation; until then, the `warn` severity is unreachable (validator falls back to fail-on-unhandled-high-only).
3. **Cross-skill / cross-artifact boundary**: this validator consumes (a) PG.state_snapshot.active_records (per-class arrays of record ids), (b) the page-plan §7a active-pressure disposition table parsed via the shared parser introduced in SPEC76TURDRIPRI-005, (c) the per-record-class urgency state on STPLAN / STEMO / CLK / THR / STSEC / STQ / OBL / CNSQ records (urgency criteria per SPEC-76 §3.6.4). The shape under audit is the active-pressure-table-vs-PG-state correlation. Per SPEC-76 §3.6.4 SREL / STCHAR scope clarification: SREL and STCHAR may appear in `turn_driver.driver_records[]` only as SUPPORTING records (the leading driver_record must be from the named 8 classes); SREL / STCHAR are excluded from this validator's urgency classification (they're not driver-eligible as the leading record).
4. **FOUNDATIONS principle**: Rule 5 (No Consequence Evasion) governs this ticket. Per the spec's §FOUNDATIONS Alignment table, "active-pressure handling discipline ensures no high-urgency active record can be silently ignored; every record is selected, deferred-with-expiry, or rejected-with-reason. Inertness is structurally impossible." Rule 5's "if a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest" is the principle the active-pressure table operationalizes at the story-pipeline level: active pressures are second-order effects of prior turns' state changes, and this validator forces them to be either acted-on, deferred, or rejected — never silently ignored.
5. **HARD-GATE / Canon Safety Check surface**: this is a new structural validator under `tools/validators/src/structural/`. Per the per-ticket-type granularity rule, item 5 fires because the structural validator gates story-bundle PG record writes at engine pre-apply time. The validator strengthens Rule 5 enforcement at the story-pipeline level; it does not touch the Mystery Reserve firewall (which remains the domain of `turn_driver_pov_observer_firewall` and `forbidden_mystery_resolution`).

## Architecture Check

1. **Structural validator on the active-pressure table**: the §7a active-pressure disposition table is the contract surface this validator enforces. Per FOUNDATIONS §Story Bundles §5b, fields exist when they are consumed by a validator — the active-pressure table's existence as a contract is justified by this validator's enforcement of it. Alternatives considered and rejected: (a) bake the check into `page_plan_turn_driver_consistency` (SPEC76TURDRIPRI-005) — rejected, the two validators have orthogonal scopes (SPEC76TURDRIPRI-005 checks §7a's PRESENCE + driver-key consistency with SE; THIS validator checks §7a's CONTENT — disposition rows for active records); (b) defer enforcement to a follow-up spec — rejected, the inertness problem is the source-report's primary concern (§5.7) and SPEC-76's deepest structural fix, not optional.
2. **No backwards-compatibility aliasing**: the validator emits 4 closed error codes per SPEC-76 §3.6.4; no fallback or "partial coverage tolerance" is introduced. The medium-tier urgency table is deferred per §9 Risk Reassessment — the warn severity remains unreachable until the table is enumerated, which is a documented deferral, not a backwards-compat shim.

## Verification Layers

1. **Invariant**: high-urgency active STPLAN / STEMO / CLK / THR / STSEC / STQ / OBL / CNSQ record absent from §7a active-pressure table → `high_urgency_active_record_unhandled` verdict → structural validator test with inline-fixture-builder, one case per record class.
2. **Invariant**: table row marked `rejected` with no reason string → `active_pressure_rejection_reason_missing` verdict → structural validator test.
3. **Invariant**: table row marked `deferred` with no expiry (no PG-id or condition in the "Reason / expiry" column) → `active_pressure_deferred_without_expiry` verdict → structural validator test.
4. **Invariant**: table row disposition outside the closed set `{selected, deferred, rejected}` → `active_pressure_disposition_unknown` verdict → structural validator test.
5. **Invariant**: SREL and STCHAR active records are excluded from urgency classification (they appear only as supporting records in `driver_records[]`, not as leading drivers) → grep-proof of validator's classification logic.
6. **Invariant**: medium-tier criteria are deferred per §9 Risk; warn severity is unreachable until medium-tier table is enumerated → validator implementation comment + this ticket's Files to Touch note.

## What to Change

### 1. Create the validator module

Create `tools/validators/src/structural/active-pressure-handling-discipline.ts` exporting `activePressureHandlingDiscipline: Validator` with:

- `name: "active_pressure_handling_discipline"`
- `severity: "fail"` (for high-urgency unhandled; `warn` reserved for medium-urgency once the medium-tier table is enumerated per §9 Risk Reassessment).
- `appliesTo: <full-world | pre-apply modes>` per existing sibling-validator pattern.
- `run(...)` implementation iterating PG records, classifying their `state_snapshot.active_records` per the 8 high-urgency criteria, parsing the §7a active-pressure table via the shared parser, and emitting verdicts.

For each PG record:

1. Enumerate high-urgency active records on `state_snapshot.active_records`:
   - STPLAN with `current_step` due-this-page → high.
   - STEMO at `intensity: high` with non-empty `behavioral_pressure` → high.
   - CLK at threshold (`current >= threshold` per the CLK schema) → high.
   - THR with `status: active` and ≥1 page-old escalation → high.
   - STSEC reveal-ready (`status: reveal_ready` or equivalent) → high.
   - STQ with payoff-due → high.
   - OBL with `urgency: high` → high.
   - CNSQ with `urgency: high` → high.
   - SREL, STCHAR, STENT, STSTAT, SF, BEL, STINT, STLOC, STOBJ → not classified (excluded per SPEC-76 §3.6.4 SREL/STCHAR scope clarification + the validator scope).
2. Parse the page-plan §7a active-pressure disposition table via the shared parser (introduced in SPEC76TURDRIPRI-005).
3. For each high-urgency active record, verify a row appears in the table → emit `high_urgency_active_record_unhandled` for any missing record.
4. For each table row, verify the disposition value is in `{selected, deferred, rejected}` → emit `active_pressure_disposition_unknown` for any out-of-set value.
5. For each `rejected` row, verify the "Reason / expiry" column is non-empty → emit `active_pressure_rejection_reason_missing` for any empty reason.
6. For each `deferred` row, verify the "Reason / expiry" column contains a PG-id (e.g., `PG-12`) or a condition expression → emit `active_pressure_deferred_without_expiry` for any missing expiry.

### 2. Document the deferred medium-tier table

Add an in-source comment at the top of the validator module naming the §9 Risk Reassessment deferral: the medium-tier criteria are deferred to a future enumeration; the `warn` severity is unreachable until the medium-tier table is populated; the validator currently emits only `fail` verdicts for high-urgency unhandled records.

### 3. Register the validator

Add to `tools/validators/src/public/registry.ts`:

```typescript
import { activePressureHandlingDiscipline } from "../structural/active-pressure-handling-discipline.js";
```

Append to `structuralValidators` array alongside the existing sibling registrations.

### 4. Inline-fixture-builder tests

Per SPEC-76 §6.2 and the established convention at `tools/validators/tests/structural/`, add `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` with:

- **Positive cases**: every high-urgency active record appears in §7a with valid disposition; mixed selected/deferred/rejected dispositions pass.
- **Negative cases**:
  - high-urgency STPLAN unhandled → `high_urgency_active_record_unhandled`.
  - `rejected` row with no reason → `active_pressure_rejection_reason_missing`.
  - `deferred` row with no expiry → `active_pressure_deferred_without_expiry`.
  - disposition outside `{selected, deferred, rejected}` (e.g., `postponed`) → `active_pressure_disposition_unknown`.
  - One negative case per high-urgency record class to confirm the classification covers all 8.

## Files to Touch

- `tools/validators/src/structural/active-pressure-handling-discipline.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — single import + single array append)
- `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (new)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-003.
- Observer-firewall semantics for non-player drivers — ship in SPEC76TURDRIPRI-004.
- Page-plan §7a PRESENCE check + driver-key consistency with SE — ship in SPEC76TURDRIPRI-005. THIS validator only checks §7a's CONTENT (active-pressure disposition rows).
- Medium-tier urgency table enumeration — deferred per SPEC-76 §9 Risk Reassessment; lands in a follow-up ticket once the per-class medium-tier criteria are specified.
- Reactivity Inertness audit pass (chain-level scan for non-player driver absence across consecutive pages) — ship in SPEC76TURDRIPRI-010.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all tests in `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` pass.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds including the new validator module and registry import.
3. Red Kiln Ambush canonical fixture (SPEC76TURDRIPRI-011) passes this validator end-to-end — Varro's STPLAN-9, STEMO-12, CLK-3, THR-4 are all in the active-pressure table with valid dispositions.
4. Existing structural-validator tests continue to pass — the new validator does not interfere with sibling validators.

### Invariants

1. The validator emits exactly one verdict per failure case (no double-reporting, no missing reports).
2. The validator's error codes are closed and exactly match the 4 codes named in SPEC-76 §3.6.4.
3. The high-urgency classification covers all 8 named record classes (STPLAN / STEMO / CLK / THR / STSEC / STQ / OBL / CNSQ); SREL / STCHAR / other state classes are excluded per SPEC-76 §3.6.4.
4. The warn severity is unreachable until the medium-tier table is enumerated per §9 Risk Reassessment.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (new) — inline-fixture-builder suite per SPEC-76 §6.2: positive cases + negative cases per 4 error codes + per-class coverage for high-urgency classification.

### Commands

1. `cd tools/validators && npm test` — runs the validator package's full test suite including the new structural test file.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the new validator module and registry import.
