# SPEC79CHCREM-002: Rewrite `chc_slt_selected_commitment_trace` to use `PG.input.choice_id` resolver

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (structural validator); `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (validator regression test).
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

The `chc_slt_selected_commitment_trace` validator currently uses `CHC.associated_commitment_block` in BOTH its primary lookup (line 388) AND its fallback scan of `parent_page.emitted_choices` (line 397). Once SPEC79CHCREM-001 drops the field from the schema, both code paths break — neither can filter by the removed field. The replacement mechanism is structurally new: match `PG.input.choice_id` (on the child page) against the parent page's `emitted_choices` list. Per-page CHC-id uniqueness (`^CHC-(0|[1-9][0-9]*)$` pattern + per-page id allocation) makes the match unambiguous by construction, returning at most one CHC without consulting `associated_commitment_block` at all. The validator's other behavior (SLT precondition evaluation against parent-page active records, `alias_bindings` validation against `SE.commitment.alias_bindings`) is unchanged.

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:388` filters `inputChoice.associated_commitment_block === selectedSltId` (primary path) and line 397 filters the same on `parent_page.emitted_choices` (fallback path). Line 214 emits the `turn_resolution_unresolvable` WARN code when the resolution returns `"ambiguous"`. Line 501 carries the JSON-output debug key `associated_commitment_block: recordId(storylet)` in `choiceVerdict()`.
2. Confirmed SPEC-79 §4.1 prescribes the new resolver shape: look up `PG.input.choice_id` in the parent page's `emitted_choices`; the `"ambiguous"` return shape is no longer reachable from the CHC-side resolution; the WARN code becomes structurally unreachable and should be removed unless SLT-side resolution still produces ambiguity (review at implementation time — the existing code has no separate SLT-side ambiguity surface, so the WARN code is expected to be removable).
3. Cross-skill boundary: this validator runs at engine pre-apply (covered by §HARD-GATE clause for canon-pipeline-adjacent validators) and is registered in `tools/validators/src/public/registry.ts` (verified during reassessment). The validator's output (verdicts with severity / code / message / location / detail) is consumed by the validator framework and surfaced via `world-validate` CLI; no consumer-side schema change beyond the JSON-detail-key rename in `choiceVerdict()`.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the validator's pre-removal soft-resolution path was load-bearing only because the field was present; once the field is gone, the new resolver based on `PG.input.choice_id` is structurally equivalent and reads from a field (`PG.input.choice_id`) that IS load-bearing per §5b (required on every PG record per `story-page.schema.json` line 13).
5. HARD-GATE / structural-validator surface: this ticket modifies a structural validator under `tools/validators/src/structural/` — the pre-apply gate that blocks invalid patch plans from reaching the canon-write surface. The change does NOT weaken the Mystery Reserve firewall (the firewall is in different validators); the new resolver preserves the same CHC-grounding integrity check the old code provided, just via a different lookup path.
6. Removal blast radius (was template item 7): the field is removed from the validator's source code (this ticket) and from the validator's regression-test fixtures (also this ticket). The schema rejection (001) is the upstream trigger; this ticket is one of the downstream consumer updates.

## Architecture Check

1. The new resolver is structurally simpler than the old two-path lookup: it reads a single field (`PG.input.choice_id`) from a single record (the child page) and matches it against a single list (the parent's `emitted_choices`). The old two-path lookup needed to walk both child and parent records, filter both by the removed field, and disambiguate on `"ambiguous"` results. Removing the WARN code path (`turn_resolution_unresolvable` at line 214) reduces the validator's verdict surface and simplifies downstream consumers.
2. No backwards-compatibility aliasing/shims introduced. The old `associated_commitment_block` lookup is removed outright; no fallback to the old shape is preserved.

## Verification Layers

1. Validator resolves selected-CHC correctly when child PG has `input.choice_id` matching a parent-emitted CHC → schema validation + skill dry-run: the regression test fixtures (rewritten in this ticket) exercise the new resolver path.
2. Validator fails predictably when `PG.input.choice_id` is missing or references a CHC not in the parent's `emitted_choices` → codebase grep-proof + schema validation: regression test for the negative case.
3. The `"ambiguous"` return shape is no longer reachable from CHC-side resolution → codebase grep-proof: `grep -n "ambiguous" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` should return only the SLT-side ambiguity reference if any remains, OR zero matches if the WARN code path was removed entirely.
4. The `choiceVerdict()` JSON-detail key is renamed from `associated_commitment_block` to `selected_slt_id` for accuracy → codebase grep-proof: `grep -n "associated_commitment_block" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches.

## What to Change

### 1. `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`

- Rewrite `selectedChoiceForEvent()` (lines 377-403):
  - Look up `PG.input.choice_id` on the child page (via `parsedEvent.created_at_page`).
  - Look up the CHC by that id in `maps.byId`.
  - Confirm the resolved CHC's id is in the parent page's `emitted_choices` list (via `parsedEvent.parent_page_id`).
  - Return the matching CHC or `undefined`.
  - Per-page CHC-id uniqueness makes the match unambiguous by construction — the `"ambiguous"` return shape is no longer reachable from this resolver.
- Remove the `"ambiguous"`-resolution → WARN downgrade (line 214, code `turn_resolution_unresolvable`) unless SLT-side resolution still produces ambiguity. Review at implementation time; the existing code has no separate SLT-side ambiguity surface, so the WARN code is expected to be removable. If removed, drop the `code: "turn_resolution_unresolvable"` verdict path and any associated test cases (handled in the test rewrite below).
- Rename the JSON-output debug key in `choiceVerdict()` (line 501) from `associated_commitment_block: recordId(storylet)` to `selected_slt_id: recordId(storylet)` for accuracy — the field this debug key reports is the SLT id, not the (now-removed) CHC field name.
- The rest of the validator (SLT precondition evaluation against parent-page active records via `validateEffects` / `validateGrounding` / `validateAliasHygiene`) is unchanged.

### 2. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`

- Rewrite the test fixture at line 65 to exercise the new `PG.input.choice_id` resolver: the test bundle's child PG carries `input.choice_id: CHC-N` matching an emitted CHC on the parent page; the test asserts the validator resolves to that CHC and validates its preconditions correctly.
- Rewrite the test fixture at line 347 to exercise the same new resolver path.
- Drop the `associated_commitment_block: "SLT-1"` keys from any CHC fixture in this file.
- Add a negative test case: child PG has `input.choice_id` referencing a CHC not in the parent's `emitted_choices` → validator emits a fail verdict with a clear code (e.g., `selected_choice_unresolvable` or equivalent).
- Remove any test case asserting the `turn_resolution_unresolvable` WARN code if that verdict path was removed in the source.

## Files to Touch

- `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (modify)
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The `rule_choice_set_noncollapse` axis reduction (handled in 003).
- The world-index edge-class removal (handled in 004).
- Skill-side documentation updates that mirror this validator's behavior change (handled in 005, 006, 007).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test -- --test-name-pattern='chc-slt-selected-commitment-trace'` passes; the rewritten regression tests exercise the new `PG.input.choice_id` resolver.
2. `cd tools/validators && npm test` runs to completion with zero new failures across all structural validators.
3. `grep -n "associated_commitment_block" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches.

### Invariants

1. The validator resolves the selected CHC unambiguously when `PG.input.choice_id` is set and references a parent-emitted CHC. The new resolver returns at most one CHC by construction (per-page CHC-id uniqueness).
2. The validator's other behavior (SLT precondition evaluation, alias-bindings validation) is unchanged — only the CHC-side resolution path is rewritten.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` — rewritten regression tests for the new resolver shape, including a negative case for unresolvable `PG.input.choice_id`.

### Commands

1. `cd tools/validators && npm test -- --test-name-pattern='chc-slt-selected-commitment-trace'`
2. `cd tools/validators && npm test`
3. `grep -n "associated_commitment_block\|turn_resolution_unresolvable" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches (assuming the WARN code path was removed per the review-at-implementation-time clause).
