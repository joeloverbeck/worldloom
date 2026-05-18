# SPEC43PRECAUSTO-011: `introduction_observer_firewall` Validator (Wave 2 Explicit-Reference Scope)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/introduction-observer-firewall.ts` (Wave 2 explicit-reference scope: gates choices grounded in freshly-introduced records through the existing `observer-firewall.ts` access-route check). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-002.md, archive/tickets/SPEC43PRECAUSTO-003.md

## Problem

SPEC-43 §Approach D Table row 8 + §Approach H Phase 9 / Phase 2i clarification + the SPEC-43 brainstorm's Out-of-Report finding O2 (PROMOTE from Wave 3 to Wave 2) require an observer-firewall extension validator that checks: any choice (`CHC` record) grounded in a freshly-introduced CLK / STSEC / STQ / SREL / STENT / THR record must name an explicit access route through the existing observer-firewall mechanism (BEL / DA / STOBJ / STLOC / institutional channels / direct observation / testimony / surveillance). Without this validator, a freshly-introduced record could license actor behavior the actor has no recorded access to — exactly the §6b firewall violation.

## Assumption Reassessment (2026-05-18)

1. Existing `observer-firewall.ts` at `tools/validators/src/structural/observer-firewall.ts` carries the access-route check for existing records (verified via directory listing). The new validator's job is to enumerate fresh-record ids from `SE.state_delta.create[]` (filtered to the 6 mid-story-introducible classes) and feed them through the existing access-route logic on any CHC record grounded in those new ids. The Wave 2 scope is EXPLICIT-REFERENCE only — the choice's `grounded_in.records[]` field must name the fresh record id directly. Inferential access (where access is implied by social/institutional context rather than explicit record reference) is deferred to Wave 3 per SPEC-43 §Out of Scope.
2. SPEC-43 §Approach D Wave-2 scope decision (promoted from Wave 3 per brainstorm O2): the reasoning is that §6b (Observer Firewall) is foundational — choices grounded in freshly-introduced records must respect the acting entity's access route. The existing observer-firewall already handles the access-route check; the new validator's job is just to enumerate new-record class IDs from `state_delta.create[]` and feed them through.
3. Cross-skill boundary under audit: this validator composes with `observer-firewall.ts` (existing) and the per-class introduction validators (003-009). The Validator object's `applies_to` field must include `branching-story-turn-cycle`. Implementation may import access-route helpers from `observer-firewall.ts` if exported, or compose with the existing validator via shared utility extraction.
4. FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall) restated: storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity. The new validator extends §6b discipline to freshly-introduced records — without this gate, a fresh STSEC could license a choice the acting STENT has no `BEL` about and no clue-carrier route to.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating choices grounded in mid-story-introduced records. The change does not weaken existing observer-firewall coverage; it extends the coverage surface to the new fresh-record class.

## Architecture Check

1. Cleaner than alternative #1 (extend `observer-firewall.ts` directly): that file gates the general access-route check; conflating it with mid-story-creation-specific enumeration logic would couple the two concerns. A separate Validator object that composes with the existing one keeps both surfaces stable.
2. Cleaner than alternative #2 (defer to Wave 3 as originally proposed): per O2 / SPEC-43 §Key design decisions, deferring would ship Wave 2 with NO observer firewall on mid-story-introduced records — a real §6b risk gap. The Wave 2 explicit-reference scope ships now; inferential access defers.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator; existing `observer-firewall.ts` unchanged.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "introductionObserverFirewall\|introduction_observer_firewall" tools/validators/src/public/registry.ts` returns import + array entry.
2. Access-route enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-pass/all-classes.yaml` `CHC-1` / `STSEC-1` access-route case passes; `creation-fail/failure-cases.yaml` `observer-firewall-no-access` case (CHC grounded in fresh STSEC, no BEL / DA / institutional access for the actor) emits `intro_observer_no_access_route`.
3. Composition with existing observer-firewall → schema validation: a CHC grounded in an EXISTING (not freshly-introduced) record continues to be gated by `observer-firewall.ts`; the new validator does not double-fire.
4. FOUNDATIONS §6b alignment → FOUNDATIONS alignment check: every CHC `grounded_in.records[]` reference to a fresh-record id must have a recorded access route per the existing observer-firewall access-route taxonomy.

## What to Change

### 1. Create `tools/validators/src/structural/introduction-observer-firewall.ts`

Validator object:
- `name: "introduction_observer_firewall"`.
- `applies_to: ["branching-story-turn-cycle"]`.
- `severity: "fail"`.
- For each SE in the bundle:
  - Extract `freshRecordIds = se.state_delta.create[].filter(id => /^(CLK|STSEC|STQ|SREL|STENT|THR)-/.test(id))`. If empty, skip.
  - For each CHC record in the bundle whose `created_at_page` is the new child PG (i.e., choices emitted alongside the introduction):
    - If `chc.grounded_in.records[]` contains any of the `freshRecordIds`, verify the acting entity (per `chc.actor` or the parent move's actor) has an explicit access route to that fresh record per the observer-firewall taxonomy (BEL with `subject` referencing the fresh record, DA / STOBJ / STLOC `accessible_to` referencing the actor, institutional-channel link, direct observation via the creating SE's `expected_witnesses` field).
- Failure code: `intro_observer_no_access_route` (with the offending CHC id, fresh record id, and missing-access-route diagnosis).

Wave 2 scope: ONLY explicit-record-reference access routes (the access route must be a named record in BEL/DA/STOBJ/STLOC or a witness in `expected_witnesses`). Inferential access (e.g., "the actor was in the room when the institutional norm changed, so they implicitly know") is OUT OF SCOPE — deferred to Wave 3.

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-010, 012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/introduction-observer-firewall.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass: CHC grounded in fresh STSEC, acting STENT has a BEL with `subject: STSEC-fresh-id` → 0 failures.
- creation-fail: CHC grounded in fresh STSEC, no BEL / DA / institutional access for the acting STENT → emits `intro_observer_no_access_route`.
- creation-pass: CHC grounded in fresh CLK, fresh CLK has `visibility: public`, acting STENT is in `expected_witnesses` of creating SE → 0 failures.
- not-applicable: CHC grounded in an existing (non-fresh) record → 0 failures from this validator (existing `observer-firewall.ts` handles it).

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `introduction_observer_firewall` to the validator-name assertion list (coordinate with tickets 003-010, 012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/introduction-observer-firewall.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/introduction-observer-firewall.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- Inferential access handling — deferred to Wave 3 per SPEC-43 §Out of Scope.
- General observer-firewall on existing records — owned by `observer-firewall.ts`.
- Generic introduction grounding — handled by ticket 003.
- Class-specific introduction grounding — handled by tickets 004-009.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- introduction-observer-firewall` (test file passes).
2. `npm test --prefix tools/validators -- observer-firewall` (existing observer-firewall tests continue to pass).
3. `npm test --prefix tools/validators` (full validator package test pass).
4. `grep -n "introductionObserverFirewall\|introduction_observer_firewall" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator fires ONLY on CHC records whose `grounded_in.records[]` references a freshly-introduced (in same SE's `state_delta.create[]`) CLK / STSEC / STQ / SREL / STENT / THR id; CHC records grounded in existing records are out of scope (handled by `observer-firewall.ts`).
2. Wave 2 scope is explicit-reference only; the validator does NOT infer access from social/institutional context — that's Wave 3.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/introduction-observer-firewall.test.ts` — 4 test cases per §What to Change item 3.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-010, 012 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- introduction-observer-firewall` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
