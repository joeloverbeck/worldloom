# SPEC49STPSTEINT-003: Extend state-snapshot-integrity inactive-record lifecycle regex to STPLAN and STEMO with status sets

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/state-snapshot-integrity.ts` (modify), `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify)
**Deps**: SPEC49STPSTEINT-001

## Problem

`tools/validators/src/structural/state-snapshot-integrity.ts:276` hard-codes the inactive-record lifecycle regex as `^state_snapshot\.active_records\.(CLK|STSEC|STQ)\[\d+\]$` — only 3 record classes (CLK, STSEC, STQ) are checked for inactive-status presence in `active_records`. The companion helper `allowedActiveStatuses()` at lines 305-316 enumerates allowed non-terminal statuses for the same 3 classes; any other class listed in `active_records` is silently uncovered. STPLAN and STEMO records with terminal statuses (`STPLAN: fulfilled | failed | abandoned`; `STEMO: settled | transformed`) can be silently retained in `PG.state_snapshot.active_records` without the validator catching the lifecycle violation. SPEC-49 §A.3 closes this gap by extending the regex and the status-set helper to cover STPLAN and STEMO with their respective active-lifecycle status enums.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/structural/state-snapshot-integrity.ts:276` and lines 305-316 confirmed via codebase grep — the regex pattern literal `(CLK|STSEC|STQ)` and the `allowedActiveStatuses()` switch over the same 3 classes is the current state. Verified during reassess-spec session.
2. SPEC-49 §Approach §A.3 (per the reassess-spec-updated spec) cites the audit report's Priority 0 must-do list item 2 *"Include STPLAN and STEMO in inactive-active-record lifecycle checks"*. Active lifecycle status sets defined: STPLAN active = `active`, `blocked`, `suspended`, `revised`; terminal = `fulfilled`, `failed`, `abandoned`. STEMO active = `active`, `suppressed`, `dissociated`; terminal = `settled`, `transformed`.
3. Cross-skill boundary under audit: `state-snapshot-integrity` is a structural validator that runs at engine pre-apply time when `create_pg_record` is submitted. The validator gates story-bundle record writes; weakening it would silently admit lifecycle-violating PG records. Ticket 001 (SPEC49STPSTEINT-001) lands the PG schema extension that allows STPLAN/STEMO keys in active_records; this ticket lands the corresponding lifecycle check on those keys. Without 001's schema landing first, this ticket has no records to validate.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: terminal-status records in active_records are a Rule 1 violation (the page claims the record is active when it isn't). The validator enforces the prerequisite "record is active" for active_records membership. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Canon Safety surface touched: `state-snapshot-integrity.ts` is a structural validator under `tools/validators/src/structural/`. The validator gates `create_pg_record` writes at engine pre-apply; weakening or skipping its lifecycle check would let pages claim active state for terminated records. The extension preserves the existing CLK/STSEC/STQ enforcement and adds STPLAN/STEMO at the same enforcement strength.

## Architecture Check

1. Extending the existing regex and `allowedActiveStatuses()` switch is the minimal-blast-radius approach. Alternative (introducing a lookup table keyed by class) would over-engineer a 5-class total (3 existing + 2 new). The regex pattern's `(CLK|STSEC|STQ|STPLAN|STEMO)` alternation extends naturally.
2. No backwards-compatibility aliasing introduced. Migration posture for legacy pages (per SPEC-49 D-CX.1 distributed contract): compatibility-mode WARN for pages that pre-date SPEC-49's landing commit and list STPLAN/STEMO active_records records that turned out to be terminal; current-contract pages FAIL closed.

## Verification Layers

1. Validator dispatch: `state-snapshot-integrity` runs against `create_pg_record` patch-plan ops + on bundle-replay verification. Validator surface: engine pre-apply gate.
2. Status-set correctness: `allowedActiveStatuses(class)` returns the correct active-status enum for STPLAN (`{active, blocked, suspended, revised}`) and STEMO (`{active, suppressed, dissociated}`). Validator surface: unit test against the helper.
3. Regex extension correctness: the regex matches `state_snapshot.active_records.STPLAN[0]` and `state_snapshot.active_records.STEMO[0]` paths in addition to the existing 3 classes. Validator surface: regex unit test.

## What to Change

### 1. Extend the inactive-record lifecycle regex at `tools/validators/src/structural/state-snapshot-integrity.ts:276`

Update from:
```typescript
const activeRecordMatch = reference.path.match(/^state_snapshot\.active_records\.(CLK|STSEC|STQ)\[\d+\]$/);
```
to:
```typescript
const activeRecordMatch = reference.path.match(/^state_snapshot\.active_records\.(CLK|STSEC|STQ|STPLAN|STEMO)\[\d+\]$/);
```

### 2. Extend `allowedActiveStatuses()` at lines 305-316

Add two new switch arms to the existing `switch (className)` block:

```typescript
case "STPLAN":
  return new Set(["active", "blocked", "suspended", "revised"]);
case "STEMO":
  return new Set(["active", "suppressed", "dissociated"]);
```

Preserve the existing CLK/STSEC/STQ arms unchanged.

### 3. D-CX.1 migration-posture handling

Distinct from the regex/status-set extension above, add a compatibility-mode WARN path for legacy pages (per SPEC-49 D-CX.1 distributed contract): when a page's `revision_marker` predates the SPEC-49 landing commit AND the page lists a terminal-status STPLAN/STEMO in active_records, emit a WARN finding rather than FAIL. Current-contract pages (post-SPEC-49) FAIL closed. The revision_marker detection mechanism follows SPEC-44's append-only-lifecycle precedent.

## Files to Touch

- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — extend with STPLAN/STEMO test cases)

## Out of Scope

- Modifying the CLK/STSEC/STQ existing arms — their behavior is preserved unchanged.
- Adding lifecycle checks for any class beyond STPLAN/STEMO (e.g., for STENT/STINT/SF — those classes have no terminal status enum).
- Refactoring the `allowedActiveStatuses()` switch to a lookup-table representation — out of scope; the switch remains the canonical form for the 5 classes.
- Adding lifecycle checks for non-active_records surfaces (e.g., `state_snapshot.unresolved_mystery_claims`) — out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. A page fixture listing `STPLAN-1` in `state_snapshot.active_records.STPLAN[]` where STPLAN-1 has `plan_status: fulfilled` fails the inactive-record lifecycle check (current-contract page FAIL).
2. A page fixture listing `STPLAN-1` where STPLAN-1 has `plan_status: active` passes the check.
3. A page fixture listing `STEMO-1` in `state_snapshot.active_records.STEMO[]` where STEMO-1 has `status: settled` fails the lifecycle check (current-contract page FAIL).
4. A page fixture listing `STEMO-1` where STEMO-1 has `status: active` passes the check.
5. A legacy-marker page fixture (pre-SPEC-49 revision_marker) listing a terminal-status STPLAN/STEMO emits a WARN rather than FAIL.
6. Existing CLK/STSEC/STQ test cases continue to pass without modification.

### Invariants

1. The regex at `state-snapshot-integrity.ts:276` and the `allowedActiveStatuses()` helper at lines 305-316 enumerate the same set of record classes; no class is checked by the regex without a corresponding status-set entry (or vice versa).
2. The 5-class union (CLK, STSEC, STQ, STPLAN, STEMO) is the complete set of record classes whose `state_snapshot.active_records` membership is lifecycle-validated. Other classes in `active_records` (STENT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, STSTAT) have no terminal-status concept and are not lifecycle-checked.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/pg-with-terminal-stplan-in-active-records.json` — new fixture (current-contract page; terminal STPLAN in active_records → FAIL).
2. `tools/validators/tests/fixtures/pg-with-active-stplan-in-active-records.json` — new fixture (active STPLAN → PASS).
3. `tools/validators/tests/fixtures/pg-with-terminal-stemo-in-active-records.json` — new fixture (terminal STEMO → FAIL).
4. `tools/validators/tests/fixtures/pg-with-legacy-marker-terminal-stplan.json` — new fixture (legacy-marker page; terminal STPLAN → WARN, not FAIL).
5. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — modify to add the 4 new STPLAN/STEMO test cases above + the legacy-marker WARN test case.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/state-snapshot-integrity.test.js`
