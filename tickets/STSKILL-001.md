# STSKILL-001: Add §16a DO/DON'T examples for prior-page references in STCHAR packets

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` (§16a contract prose with explicit DO/DON'T examples), `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (or equivalent — §16a authoring instructions). Documentation-only; no code/schema changes.
**Deps**: None.

## Problem

The `page_plan_stchar_packet_integrity.stale_current_state_reference` validator catches authoring leaks where §16a STCHAR packets cite `PG-<integer>` or `SE-<integer>` tokens of pages/events that aren't active in the snapshot. The shared contract §16a already states the rule: "any `PG-<integer>` or `SE-<integer>` token is treated as an operational current-state citation: cite only the current page's own `PG` or resolved `SE` id there. To discuss earlier pages or events as history, use prose such as 'the prior observation beat' or 'the parent-page action' rather than a literal page/event id unless that id is deliberately active/current for the packet."

But the rule is buried in a dense paragraph alongside the field-list contract. Authors writing §16a packets naturally use prose-style "from PG-6," "at PG-6," "compared to PG-6" as narrative shortcuts — these are exactly the form that trips the validator. At `red-bunny` PG-7 the validator caught 13 such leaks across two STCHAR packets, all of them prose-style references to PG-6 used as narrative shorthand.

This is authoring discipline, not a system bug — the contract is correct and the validator does its job. But the failure mode is recurrent enough across pages that explicit DO/DON'T examples would substantially lower the recurrence rate at near-zero cost.

## Assumption Reassessment (2026-05-27)

1. The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §16a contains the prior-page-reference rule in a single sentence within the field-list contract paragraph. There are no DO/DON'T example pairs.
2. The validator `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (or sibling) tokenizes the §16a packet body and flags any `PG-<integer>` / `SE-<integer>` that doesn't resolve to an active record. The rule is strict and correct; the authoring discipline is the weak link.
3. Cross-skill boundary: the §16a contract is consumed by `branching-story-turn-cycle` Phase 7 (page-plan authoring) and `branching-story-bootstrap` Phase 8 (root-page authoring). Both rely on the same contract text.
4. Adjacent contradictions: none. The contract is internally consistent; only the explicit-example surface is missing.
5. Skill-side reference: `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` may already include §16a authoring guidance. Confirm via grep before editing; add DO/DON'T examples adjacent to the existing guidance rather than duplicating elsewhere.

## Architecture Check

1. Cleaner than alternatives. Option A (DO/DON'T examples in the contract prose) is the smallest, most local change and lands single-source-of-truth examples that every consumer skill can cite. Option B (validator change to allow prose-style references) weakens the rule's signal value and the audit-trail strictness §16a depends on. Option C (per-skill duplication of examples) introduces drift risk.
2. No backwards-compatibility aliasing/shims introduced. Documentation-only change; existing §16a packets remain valid.

## Verification Layers

1. The contract §16a section contains explicit DO/DON'T example pairs covering at least three common authoring shapes (prior-page narrative reference, prior-event reference, current-page valid self-citation) → manual review.
2. A skill dry-run on a synthetic §16a packet using the DON'T-shape examples produces `page_plan_stchar_packet_integrity.stale_current_state_reference` verdicts; the same packet rewritten with the DO-shape examples passes → skill dry-run (manual construction of the test packet; run against the existing validator binary).
3. No code or schema change; the validator's behavior is unchanged → codebase grep-proof (`git diff tools/validators/` is empty).

## What to Change

### 1. Shared contract §16a DO/DON'T examples (`.claude/skills/_shared-templates/story-state-contract.md`)

After the existing sentence "To discuss earlier pages or events as history, use prose such as 'the prior observation beat' or 'the parent-page action' rather than a literal page/event id unless that id is deliberately active/current for the packet.", append:

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

In `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (or whichever reference owns §16a authoring), add a one-line pointer: "When authoring §16a packets, see the DO/DON'T table in the shared contract §16a for prior-page/prior-event reference patterns — the most common authoring failure is prose-style references like 'from PG-X' that trip `page_plan_stchar_packet_integrity.stale_current_state_reference`."

Mirror the same pointer in `branching-story-bootstrap/references/` if it has a §16a-authoring section.

### 3. Validator error message hint (optional, nice-to-have)

The validator's `suggested_fix` text at the verdict surface currently says "Create or activate <id> in <page>.state_snapshot.active_records, cite the page's own PG/SE record, or remove the stale packet reference." Optionally append: "For prose-style references to prior pages (e.g., 'the disclosure from PG-6'), substitute 'the disclosure on the parent page' or 'the prior-page disclosure' — see contract §16a DO/DON'T table." Cosmetic; non-blocking.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — add DO/DON'T table after the existing §16a rule)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify — add pointer to contract §16a DO/DON'T table)
- `.claude/skills/branching-story-bootstrap/references/*.md` (modify if any owns §16a authoring guidance — same pointer)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (optional, modify the `suggested_fix` text + test fixtures)

## Out of Scope

- Changes to the validator's tokenization or matching logic — the rule is correct.
- Adding a "soft" or "lenient" mode that allows prose-style references — that defeats the audit-trail value.
- Adding a §16a-rendering tool that auto-rewrites prose-style references — too much scope; the DO/DON'T table is the lower-cost intervention.
- Restructuring §16a's field-list contract beyond appending the DO/DON'T table.

## Acceptance Criteria

### Tests That Must Pass

1. The contract §16a section now contains the DO/DON'T table with at least the seven example pairs above.
2. `pnpm -F @worldloom/validators test -- --filter page-plan-stchar-packet-integrity` continues to pass (no code change unless the optional suggested_fix refresh lands; in that case test fixtures' expected suggested_fix strings update in lockstep).
3. A new §16a-authoring author given only the contract §16a section as input would produce a packet that passes `page_plan_stchar_packet_integrity` on first attempt for the common prior-page/prior-event reference shapes. (Validated by manual inspection of a follow-up turn-cycle dry-run; not gated by automated test.)

### Invariants

1. The validator behavior is unchanged; the rule's strictness is preserved.
2. The DO/DON'T table is single-sourced in the shared contract; consumer skills reference it rather than duplicating.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is manual review of the contract prose addition, plus existing test coverage at tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts.`

### Commands

1. `pnpm -F @worldloom/validators test -- --filter page-plan-stchar-packet-integrity` — confirm no validator behavior regression.
2. Manual review of the updated `.claude/skills/_shared-templates/story-state-contract.md` §16a section — confirm DO/DON'T examples cover the recurrent failure shapes.
3. After landing, on the next branching-story-turn-cycle invocation, observe whether the validator-fail count on §16a packets drops on first-author attempt. (Non-blocking metric; recurrence rate is the real signal.)
