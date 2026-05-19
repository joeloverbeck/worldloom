# SPEC48SESTRINT-005: Refactor 3 plan-relation consumers to consume `SE.state_relations[]`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — refactors 3 structural validators in `tools/validators/src/structural/`
**Deps**: archive/tickets/SPEC48SESTRINT-003.md

## Problem

SPEC-48 §Phase B specifies refactoring the 3 validators that currently consume parseable `plan_relation:<...>(plan=...)` tags via regex scanning of `SE.world_logic_rationale`. Without refactoring them, ticket 009's parser deletion + ticket 003's removal of `PLAN_CLOSURE_RELATION` / `PLAN_ADVANCES_RELATION` regex constants breaks the validators' build. The 3 consumers each have distinct firing semantics — `stplan-event-plan-relation-consistency` checks that an SE advancing a plan matches the plan's current step or success-condition records; `stplan-closure-status-requires-closure-event` checks that a plan_status closure has a matching closure event; `stemo-agency-effect-compatibility` checks that constraining agency effects have a compatible STSTAT or same-event plan_relation/non_propagation rationale. All three must migrate to read `SE.state_relations[]` via the typed reader `readSeStateRelations(event)` from ticket 003.

## Assumption Reassessment (2026-05-19)

1. **3 plan-relation consumers verified**: per SPEC-48 reassessment Phase B-2 enumeration and the SPEC-48-Phase-B grep against `tools/validators/src/structural/*.ts`, the 3 consumers are: `stplan-event-plan-relation-consistency.ts:21` (currently reads `world_logic_rationale` via `stplan-utils.ts` regex constants), `stplan-closure-status-requires-closure-event.ts:15` (currently emits `"plan_status ${status} requires an SE world_logic_rationale plan_relation closure tag"` — message string referencing the deprecated grammar), and `stemo-agency-effect-compatibility.ts:13` (currently uses the `stemo-utils.ts:322` `rationale.includes("plan_relation:")` shortcut).
2. **SPEC-48 D-B2 enumeration**: replace parser/regex/shortcut consumption with structured-field read via `readSeStateRelations(event)` from `midstory-introduction-utils.ts` (ticket 003). Preserve every existing PASS/FAIL semantic. Rewrite `suggested_fix` / `message` strings referencing the deprecated grammar to reference structured-field form (per the M2-refined Phase B preamble — verified site: `stplan-closure-status-requires-closure-event.ts:15`).
3. **Cross-skill boundary**: the 3 consumers each call helper functions in `stplan-utils.ts` and `stemo-utils.ts` (the consumers don't call the parser directly; they call helpers that did the regex/shortcut work internally). After ticket 003 refactors those helpers to consume `readSeStateRelations(event)` instead of regex-scanning rationale strings, the consumers inherit the structured-field migration automatically — but the `suggested_fix` / `message` strings in the consumer files still need updating, and any consumer-local code that directly inspected `world_logic_rationale` needs migration too.
4. **Canon Safety surface**: all 3 files live under `tools/validators/src/structural/`. Per-ticket-type granularity rule for structural validators fires. The refactor preserves all existing PASS/FAIL semantics: `stplan-event-plan-relation-consistency` still flags SE-advances-plan mismatches; `stplan-closure-status-requires-closure-event` still flags missing closure events; `stemo-agency-effect-compatibility` still flags unexplained constraining effects. No Canon Safety check is weakened.

## Architecture Check

1. **Shared typed-reader as the read seam**: each validator's helper-call site (in `stplan-utils.ts` / `stemo-utils.ts`) now consumes `readSeStateRelations(event)` from `midstory-introduction-utils.ts` (per ticket 003) — single read seam, single source of truth for the 7-value `state_relations.relation` enum.
2. **No backwards-compatibility aliasing**: the 3 validators no longer fall back to regex-scanning `world_logic_rationale`; the `PLAN_CLOSURE_RELATION` / `PLAN_ADVANCES_RELATION` regex constants are gone (per ticket 003); the `stemo-utils.ts:322` `rationale.includes` shortcut is gone (per ticket 003). Consumers migrate directly to the typed reader; no shim is introduced.

## Verification Layers

1. Validator regression coverage → `npm test --prefix tools/validators` passes with no test-case regression on the 3 refactored validators' existing positive/negative cases.
2. Helper-function migration → grep proof: `grep -n "world_logic_rationale" tools/validators/src/structural/stplan-event-plan-relation-consistency.ts tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts tools/validators/src/structural/stemo-agency-effect-compatibility.ts` returns zero matches (the validators no longer inspect the rationale string directly; they go through `readSeStateRelations(event)`).
3. `message` string update → grep proof: `grep -n "world_logic_rationale plan_relation closure tag" tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts` returns zero matches AFTER refactor.

## What to Change

### 1. Refactor `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts`

Update the helper-call site at line 21 (`SE ${relation.event.node_id} advances ${relation.planId}...`) to consume the structured-field iteration returned by `readSeStateRelations(event)` (via the refactored `stplan-utils.ts` helpers from ticket 003). Preserve the existing failure-code `stplan_event_plan_relation_consistency.no_matching_delta` and the same `delta-mismatch` semantics; the read mechanism is the only thing that changes.

### 2. Refactor `tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts`

Update the helper-call site at line 15 to consume `readSeStateRelations(event)` filtered for closure relations (`fulfills` | `abandons` | `blocks` per the 7-value enum). Rewrite the `message` string from `"plan_status ${status} requires an SE world_logic_rationale plan_relation closure tag"` to `"plan_status ${status} requires an SE state_relations[] entry with relation in {fulfills, abandons, blocks} naming this plan as target_record"`. Preserve the existing failure-code `stplan_closure_status_requires_closure_event.missing_closure_event`.

### 3. Refactor `tools/validators/src/structural/stemo-agency-effect-compatibility.ts`

Update line 13's caller of the `stemo-utils.ts:322` shortcut to use `readSeStateRelations(event).length > 0 || readSeNonPropagationFacts(event).length > 0` (combining the two structured-field reads per the original shortcut's combined check). Rewrite the `message` string at line 13 from `"agency_effect: constraining requires compatible active STSTAT.agency or same-event plan_relation/non_propagation rationale."` to `"agency_effect: constraining requires compatible active STSTAT.agency or same-event state_relations[] / non_propagation_facts[] entry."`. Preserve the existing failure-code `stemo_agency_effect_compatibility.unexplained_constraining_effect`.

## Files to Touch

- `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` (modify)
- `tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts` (modify)
- `tools/validators/src/structural/stemo-agency-effect-compatibility.ts` (modify)
- Per-validator test files at `tools/validators/tests/structural/` (modify — update test inputs to structured-field form; assertion outputs unchanged)

## Out of Scope

- Introduction-grounding validator refactor (deferred to ticket 004).
- Expected-witness-coverage refactor (deferred to ticket 006).
- non-propagation-tag-shape replacement (deferred to ticket 007).
- Schema field changes (covered by ticket 001).
- Helper-function refactor in `stplan-utils.ts` / `stemo-utils.ts` (covered by ticket 003).
- Parser file deletion (deferred to ticket 009).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator test suite passes with zero regression on the 3 refactored validators.
2. Grep proof: `grep -n "world_logic_rationale" tools/validators/src/structural/stplan-event-plan-relation-consistency.ts tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts tools/validators/src/structural/stemo-agency-effect-compatibility.ts` returns zero matches.
3. Grep proof: `grep -n "world_logic_rationale plan_relation closure tag" tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts` returns zero matches.

### Invariants

1. Each refactored validator preserves its existing PASS/FAIL contract — same delta-mismatch / missing-closure-event / unexplained-constraining-effect semantics; same failure codes; same severity.
2. The 3 validators no longer inspect `SE.world_logic_rationale` for structural facts — they consume `SE.state_relations[]` (and where applicable, `SE.non_propagation_facts[]`) via the typed reader from ticket 003.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (modify) — update test inputs from tag-grammar form to structured-field form; assertion outputs unchanged.
2. `tools/validators/tests/structural/stplan-closure-status-requires-closure-event.test.ts` (modify) — same; verify the `message` string update lands.
3. `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (modify) — same; verify the `message` string update lands.

### Commands

1. `npm test --prefix tools/validators` — full test suite.
2. `grep -n "world_logic_rationale" tools/validators/src/structural/stplan-event-plan-relation-consistency.ts tools/validators/src/structural/stplan-closure-status-requires-closure-event.ts tools/validators/src/structural/stemo-agency-effect-compatibility.ts` — confirms zero matches.
