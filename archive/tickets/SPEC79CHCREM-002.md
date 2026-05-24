# SPEC79CHCREM-002: Rewrite `chc_slt_selected_commitment_trace` to use `PG.input.choice_id` resolver

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (structural validator); `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (validator regression test).
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

At intake, the `chc_slt_selected_commitment_trace` validator used `CHC.associated_commitment_block` in both its primary lookup and its fallback scan of `parent_page.emitted_choices`. Once SPEC79CHCREM-001 dropped the field from the schema, both code paths became stale. This ticket replaced that mechanism with `PG.input.choice_id` (on the child page) matched against the parent page's `emitted_choices` list. Per-page CHC-id uniqueness (`^CHC-(0|[1-9][0-9]*)$` pattern + per-page id allocation) makes the match unambiguous by construction, returning at most one CHC without consulting `associated_commitment_block` at all. The validator's other behavior (SLT precondition evaluation against parent-page active records, `alias_bindings` validation against `SE.commitment.alias_bindings`) is unchanged.

## Assumption Reassessment (2026-05-24)

1. At intake, `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` filtered both the child `PG.input.choice_id` path and the parent `emitted_choices` fallback through `CHC.associated_commitment_block`, emitted `turn_resolution_unresolvable` for ambiguous resolution, and reported `associated_commitment_block` as a debug detail key in `choiceVerdict()`. This ticket removed those current-code dependencies; the old references now remain only as historical intake evidence in this completed ticket.
2. Confirmed SPEC-79 §4.1 prescribes the new resolver shape: look up `PG.input.choice_id` in the parent page's `emitted_choices`; the `"ambiguous"` return shape is no longer reachable from the CHC-side resolution. Implementation confirmed there is no separate SLT-side ambiguity surface, so the WARN code was removed.
3. Cross-skill boundary: this validator runs at engine pre-apply (covered by §HARD-GATE clause for canon-pipeline-adjacent validators) and is registered in `tools/validators/src/public/registry.ts` (verified during reassessment). The validator's output (verdicts with severity / code / message / location / detail) is consumed by the validator framework and surfaced via `world-validate` CLI; no consumer-side schema change beyond the JSON-detail-key rename in `choiceVerdict()`.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the validator's pre-removal soft-resolution path was load-bearing only because the field was present; once the field is gone, the new resolver based on `PG.input.choice_id` is structurally equivalent and reads from a field (`PG.input.choice_id`) that IS load-bearing per §5b (required on every PG record per `story-page.schema.json` line 13).
5. HARD-GATE / structural-validator surface: this ticket modifies a structural validator under `tools/validators/src/structural/` — the pre-apply gate that blocks invalid patch plans from reaching the canon-write surface. The change does NOT weaken the Mystery Reserve firewall (the firewall is in different validators); the new resolver preserves the same CHC-grounding integrity check the old code provided, just via a different lookup path.
6. Removal blast radius (was template item 7): the field is removed from the validator's source code (this ticket) and from the validator's regression-test fixtures (also this ticket). The schema rejection (001) is the upstream trigger; this ticket is one of the downstream consumer updates.
7. Proof-surface correction: the drafted `npm test -- --test-name-pattern='chc-slt-selected-commitment-trace'` command is not a reliable narrow filter for this package script because the extra argument lands after the `dist/tests/**/*.test.js` file list. The landed narrow proof uses `node --test --test-name-pattern='chc_slt_selected_commitment_trace' dist/tests/structural/chc-slt-selected-commitment-trace.test.js` after `npm run build`.

## Architecture Check

1. The new resolver is structurally simpler than the old two-path lookup: it reads a single field (`PG.input.choice_id`) from a single record (the child page) and matches it against a single list (the parent's `emitted_choices`). The old two-path lookup needed to walk both child and parent records, filter both by the removed field, and disambiguate on `"ambiguous"` results. Removing the WARN code path (`turn_resolution_unresolvable` at line 214) reduces the validator's verdict surface and simplifies downstream consumers.
2. No backwards-compatibility aliasing/shims introduced. The old `associated_commitment_block` lookup is removed outright; no fallback to the old shape is preserved.

## Verification Layers

1. Validator resolves selected-CHC correctly when child PG has `input.choice_id` matching a parent-emitted CHC → schema validation + skill dry-run: the regression test fixtures (rewritten in this ticket) exercise the new resolver path.
2. Validator fails predictably when `PG.input.choice_id` is missing or references a CHC not in the parent's `emitted_choices` → codebase grep-proof + schema validation: regression test for the negative case.
3. The `"ambiguous"` return shape is no longer reachable from CHC-side resolution → codebase grep-proof: `rg -n "ambiguous" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches.
4. The `choiceVerdict()` JSON-detail key is renamed from `associated_commitment_block` to `selected_slt_id` for accuracy → codebase grep-proof: `grep -n "associated_commitment_block" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches.

## Landed Changes

### 1. `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`

- Rewrote `selectedChoiceForEvent()` to look up `PG.input.choice_id` on the child page, require that CHC id to appear in the parent page's `emitted_choices`, and return the resolved CHC record from `maps.byId`.
- Removed the `"ambiguous"` return shape and the `turn_resolution_unresolvable` WARN branch. Unresolvable selected choices now fail closed with `selected_choice_unresolvable`.
- Renamed the JSON-output debug key in `choiceVerdict()` from `associated_commitment_block` to `selected_slt_id` for accuracy.
- The rest of the validator (SLT precondition evaluation against parent-page active records via `validateEffects` / `validateGrounding` / `validateAliasHygiene`) is unchanged.

### 2. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`

- Updated the local CHC fixture helper so focused regression CHCs no longer carry `associated_commitment_block`.
- Updated the missing-grounding detail assertion to expect `selected_slt_id`.
- Replaced the old ambiguous-resolution WARN test with a negative `PG.input.choice_id` test where the child page names `CHC-2` but the parent emitted only `CHC-1`; the validator emits fail code `selected_choice_unresolvable`.

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

1. `cd tools/validators && npm run build` passes.
2. `cd tools/validators && node --test --test-name-pattern='chc_slt_selected_commitment_trace' dist/tests/structural/chc-slt-selected-commitment-trace.test.js` passes; the rewritten regression tests exercise the new `PG.input.choice_id` resolver and negative parent-emitted membership check.
3. `grep -n "associated_commitment_block" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches.
4. The broad `cd tools/validators && npm test` lane remains red on sibling-owned SPEC-79 fixtures/consumers still carrying `associated_commitment_block`; those are queued in SPEC79CHCREM-003, 009, 010, and the capstone rather than owned by this validator-resolver ticket.

### Invariants

1. The validator resolves the selected CHC unambiguously when `PG.input.choice_id` is set and references a parent-emitted CHC. The new resolver returns at most one CHC by construction (per-page CHC-id uniqueness).
2. The validator's other behavior (SLT precondition evaluation, alias-bindings validation) is unchanged — only the CHC-side resolution path is rewritten.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` — rewritten regression tests for the new resolver shape, including a negative case for unresolvable `PG.input.choice_id`.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test --test-name-pattern='chc_slt_selected_commitment_trace' dist/tests/structural/chc-slt-selected-commitment-trace.test.js`
3. `grep -n "associated_commitment_block\|turn_resolution_unresolvable" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns zero matches.

## Outcome

Completed: 2026-05-24.

The validator no longer reads `CHC.associated_commitment_block`. Selected-choice resolution now uses the child page's `PG.input.choice_id`, confirms that id was emitted by the parent page, and fails closed with `selected_choice_unresolvable` when the selected CHC cannot be resolved. The regression test fixture no longer emits the removed field, and the old ambiguous-resolution WARN test was replaced with a parent-emitted membership failure test.

No backwards-compatibility fallback to the old CHC field was added.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test --test-name-pattern='chc_slt_selected_commitment_trace' dist/tests/structural/chc-slt-selected-commitment-trace.test.js` — PASS, 11/11 focused subtests.
3. `rg -n "associated_commitment_block|turn_resolution_unresolvable|ambiguous" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` — PASS by expected no-match exit; no current validator source or focused test reference remains.
4. `cd tools/validators && npm test` — RED as a known non-blocking broad-lane deviation for this ticket. The concise classification run reported 9 failing compiled test files, including `spec34-integration.test.js` and `spec49-stplan-stemo-hardening.test.js`, because sibling-owned SPEC-79 positive fixtures still carry `associated_commitment_block` after 001's schema removal.

## Deviations

- The drafted narrow `npm test -- --test-name-pattern='chc-slt-selected-commitment-trace'` command was superseded by the direct compiled `node --test --test-name-pattern='chc_slt_selected_commitment_trace' ...` command because the package script's file-glob argument order does not provide a trustworthy narrow filter.
- The broad package suite is not used as the completion gate for this ticket. Its remaining red fixtures are same-family sibling work queued behind this ticket, not failures caused by the new `PG.input.choice_id` resolver.
