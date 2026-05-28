# STSKILL-001: Add §16a DO/DON'T examples for prior-page references in STCHAR packets

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` (§16a contract prose with explicit DO/DON'T examples), `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, and `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (§16a authoring pointers). Documentation-only; no code/schema changes.
**Deps**: None.

## Problem

The `page_plan_stchar_packet_integrity.stale_current_state_reference` validator catches authoring leaks where §16a STCHAR packets cite `PG-<integer>` or `SE-<integer>` tokens of pages/events that aren't active in the snapshot. The shared contract §16a already states the rule: "any `PG-<integer>` or `SE-<integer>` token is treated as an operational current-state citation: cite only the current page's own `PG` or resolved `SE` id there. To discuss earlier pages or events as history, use prose such as 'the prior observation beat' or 'the parent-page action' rather than a literal page/event id unless that id is deliberately active/current for the packet."

Before this ticket, the rule was buried in a dense paragraph alongside the field-list contract. Authors writing §16a packets naturally used prose-style "from PG-6," "at PG-6," "compared to PG-6" as narrative shortcuts — these are exactly the form that trips the validator. At `red-bunny` PG-7 the validator caught 13 such leaks across two STCHAR packets, all of them prose-style references to PG-6 used as narrative shorthand.

This was authoring discipline, not a system bug — the contract was correct and the validator did its job. The landed shared-contract DO/DON'T table now makes the recurrent failure shape explicit without weakening validation.

## Assumption Reassessment (2026-05-27)

1. Before this ticket, the shared contract `.claude/skills/_shared-templates/story-state-contract.md` §16a contained the prior-page-reference rule in a single sentence within the packet contract paragraph. It did not contain explicit DO/DON'T example pairs.
2. The validator proof surface lives at `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts`: the existing tests prove `page_plan_stchar_packet_integrity.stale_current_state_reference` for inactive or unresolved current-state citations, and prove that only the current page's own `PG` and resolved `SE` references pass.
3. Cross-skill boundary: the §16a contract is consumed by `branching-story-turn-cycle` Phase 7 (`.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`) and `branching-story-bootstrap` Phase 8 (`.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`). Both are in scope for pointers to the single-source shared-contract table.
4. HARD-GATE/validation-signal boundary: `docs/HARD-GATE-DISCIPLINE.md` and `references/hard-gate-read-triage.md` were read because §16a is enforced by page-plan validators in content-generating flows. This ticket preserves gate order, approval timing, PASS/FAIL criteria, validator behavior, `validation_trace`, submit/validate flow, and approval-token semantics; it only clarifies authoring examples.
5. Adjacent contradictions: none. The contract is internally consistent; only the explicit-example surface is missing.
6. Proof-command correction: the drafted `pnpm -F @worldloom/validators test -- --filter page-plan-stchar-packet-integrity` command is not a live repo command because this checkout has no root `package.json` or `pnpm-workspace.yaml`. The live validators proof runs from `tools/validators` via `npm test`, which builds and runs the compiled validator tests.

## Architecture Check

1. Cleaner than alternatives. Option A (DO/DON'T examples in the contract prose) is the smallest, most local change and lands single-source-of-truth examples that every consumer skill can cite. Option B (validator change to allow prose-style references) weakens the rule's signal value and the audit-trail strictness §16a depends on. Option C (per-skill duplication of examples) introduces drift risk.
2. No backwards-compatibility aliasing/shims introduced. Documentation-only change; existing §16a packets remain valid.

## Verification Layers

1. The contract §16a section contains explicit DO/DON'T example pairs covering at least three common authoring shapes (prior-page narrative reference, prior-event reference, current-page valid self-citation) → manual review.
2. Existing validator coverage for stale packet citations and current-page `PG` / resolved `SE` citations remains green → package-local validators test.
3. No code or schema change; the validator's behavior is unchanged → codebase grep-proof (`git diff -- tools/validators` is empty).

## Landed Changes

### 1. Shared contract §16a DO/DON'T examples (`.claude/skills/_shared-templates/story-state-contract.md`)

After the existing sentence "To discuss earlier pages or events as history, use prose such as 'the prior observation beat' or 'the parent-page action' rather than a literal page/event id unless that id is deliberately active/current for the packet.", appended:

> **DO / DON'T examples for prior-page / prior-event references in §16a:**
>
> | DON'T (validator FAIL) | DO (validator PASS) |
> |---|---|
> | "the disclosure from PG-6 compounds the desire" | "the disclosure on the parent page compounds the desire" |
> | "Jon's posture from PG-6 must now hold against new pressure" | "Jon's posture from the prior page must now hold against new pressure" |
> | "the trade-coded register reads back to him as evidence the PG-5 probe was about pricing" | "the trade-coded register reads back to him as evidence the earlier probe was about pricing" |
> | "the SE-6 act has paid its cost into the air" | "the parent-page act has paid its cost into the air" |
> | "the dread is sharper than at PG-6" | "the dread is sharper than on the prior page" |
> | "Current-state grounding records: STEMO-13, STEMO-14, PG-6" | "Current-state grounding records: STEMO-17, STEMO-18, PG-7" — cite the CURRENT page's own PG, not a prior page |
> | "Trigger event: SE-6" (when SE-6 is the PRIOR resolved event) | "Trigger event: SE-7" — cite the CURRENT page's resolved SE (or use prose "the parent-page event" for context) |
>
> The validator's strict rule is that any `PG-<integer>` or `SE-<integer>` token in a §16a packet field MUST resolve to an active record in the current page's snapshot. The CURRENT page's own `PG-<n>` and the CURRENT page's resolved `SE-<n>` are always lawful citations; everything else needs prose substitution.

### 2. Skill-side authoring guidance

In `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, added a one-line pointer: "When authoring §16a packets, see the DO/DON'T table in the shared contract §16a for prior-page/prior-event reference patterns — the most common authoring failure is prose-style references like 'from PG-X' that trip `page_plan_stchar_packet_integrity.stale_current_state_reference`."

Mirrored the same pointer in `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`, which owns bootstrap root-page §16a authoring guidance.

### 3. Validator error message hint (not landed)

The optional `suggested_fix` refresh is not part of the accepted implementation boundary. Keeping validator code untouched preserves the current behavior and keeps this ticket documentation-only.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — add DO/DON'T table after the existing §16a rule)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify — add pointer to contract §16a DO/DON'T table)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify — same pointer)

## Out of Scope

- Changes to the validator's tokenization or matching logic — the rule is correct.
- Adding a "soft" or "lenient" mode that allows prose-style references — that defeats the audit-trail value.
- Adding a §16a-rendering tool that auto-rewrites prose-style references — too much scope; the DO/DON'T table is the lower-cost intervention.
- Restructuring §16a's field-list contract beyond appending the DO/DON'T table.

## Acceptance Criteria

### Tests That Must Pass

1. The contract §16a section contains the DO/DON'T table with the seven example pairs above.
2. `npm test` from `tools/validators` passed, preserving existing `page_plan_stchar_packet_integrity` behavior.
3. Manual inspection confirmed that a new §16a-authoring author given only the contract §16a section now sees explicit PASS/FAIL examples for the common prior-page/prior-event reference shapes.

### Invariants

1. The validator behavior is unchanged; the rule's strictness is preserved.
2. The DO/DON'T table is single-sourced in the shared contract; consumer skills reference it rather than duplicating.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is manual review of the contract prose addition, plus existing test coverage at tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts.`

### Commands

1. `npm test` from `tools/validators` — confirm no validator behavior regression.
2. Manual review of the updated `.claude/skills/_shared-templates/story-state-contract.md` §16a section — confirm DO/DON'T examples cover the recurrent failure shapes.

## Outcome

Completion date: 2026-05-27.

Added a single-source §16a DO/DON'T table to `.claude/skills/_shared-templates/story-state-contract.md`, covering prior-page narrative references, prior-event references, current-page self-citation, and current resolved-event citation. Added short pointers from both page-plan authoring references:

- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

No validator source, schema, or test fixture changed.

## Verification Result

1. Manual review: `.claude/skills/_shared-templates/story-state-contract.md` §16a contains seven DO/DON'T rows, including prior-page prose substitutions, prior-event prose substitution, current-page `PG` self-citation, and current resolved `SE` citation.
2. Manual review: both consumer skill references point authors to the shared §16a DO/DON'T table instead of duplicating the examples.
3. `git diff -- tools/validators` produced no output, confirming validator behavior/code was untouched.
4. `npm test` from `tools/validators` passed after building the package: 1,098 passing tests, 0 failures.
5. `git diff --check` passed.

## Deviations

1. Replaced the drafted `pnpm -F @worldloom/validators test -- --filter page-plan-stchar-packet-integrity` proof with the live package-local `npm test` command because this checkout has no root `package.json` or `pnpm-workspace.yaml`, and `tools/validators/package.json` defines `npm test` as the build-plus-compiled-test lane.
2. Did not implement the optional validator `suggested_fix` hint. The accepted boundary is documentation-only guidance; leaving validator code unchanged preserves the strict rule and avoids fixture churn.
3. The drafted future metric "observe whether the validator-fail count drops on the next turn-cycle invocation" remains a non-blocking operational signal, not a completion gate for this ticket.
