# BSPAGE-006: Decide on `SKILL.md` Process Flow vs Procedure duplication (parity with bootstrap audit's dismissal)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small (if dismiss) | Medium (if shrink)
**Engine Changes**: None — decision + optional documentation reshaping inside `.claude/skills/branching-story-page-cycle/`.
**Deps**: None.

## Problem

`SKILL.md:56-211` is an ASCII Process Flow diagram (~155 lines) describing the Pre-flight → Phase 11 workflow in box-and-arrow form. `SKILL.md:283-472` is the Procedure section (~190 lines) describing the same workflow as a numbered operational checklist. The Process Flow occupies ~31.5% of the SKILL.md's 491 lines, crossing the 30% threshold from the Phase 4 duplication pattern in the skill-streamlining-audit catalog.

The prior bootstrap audit (`docs/triage/2026-05-11-bootstrap-skill-audit-triage.md`) explicitly dismissed the analogous bootstrap Process Flow finding (M3) as "cosmetic" with the rationale that the diagram has orientation value for new readers and the cost of shrinking is materially higher than the gain. The user accepted that dismissal for bootstrap.

This ticket exists to make an explicit parity decision rather than silently inherit one option:

- **Option A (dismiss, parity with bootstrap)** [RECOMMENDED]: close this ticket as wontfix with the rationale "the bootstrap audit dismissed the same finding as cosmetic; preserving the diagram in page-cycle maintains structural parity across the story-skill family." No edit; close the ticket.
- **Option B (shrink the Process Flow)**: trim the Process Flow diagram (lines 56-211) by collapsing per-phase prose annotations to one-line summaries; preserve the Pre-flight → Phase 1 → ... → Phase 11 box-and-arrow skeleton only. Estimated net reduction: ~80-100 lines.

The Procedure section is the operational authority and should remain unchanged in either option.

## Assumption Reassessment (2026-05-11)

1. `SKILL.md:56-211` is the Process Flow ASCII diagram with embedded per-phase prose. Confirmed by direct read.
2. `SKILL.md:283-472` is the Procedure section enumerating 11 numbered steps (Pre-flight + 10 phases through Phase 11). Confirmed by direct read.
3. SKILL.md total line count: 491. Process Flow lines 56-211 = 155 lines = 31.6% of total. Procedure lines 283-472 = 190 lines = 38.7% of total. Both blocks describe the same workflow at different abstraction levels.
4. Shared boundary: SKILL.md is the page-cycle entry point; both Process Flow and Procedure are page-cycle-internal surfaces, not cited by sibling skills. No cross-skill consumer breakage in either option.
5. Bootstrap precedent: `.claude/skills/branching-story-bootstrap/SKILL.md` has the same Process Flow + Procedure structure, ~150 lines + ~190 lines, dismissed by the 2026-05-11 audit as cosmetic. Parity argument favors Option A.
6. New-reader orientation argument: the Process Flow diagram functions as a navigable index for first-time readers; collapsing it makes the SKILL.md denser but loses the at-a-glance comprehension surface.
7. Maintenance-cost argument: the Process Flow's per-phase prose duplicates Procedure prose; an edit to phase semantics requires landing in both surfaces or risks drift. This is a real but small drift hazard.
8. Mismatch + correction: Option A is a no-op edit; Option B is a moderate shrink that preserves the box-and-arrow skeleton.

## Architecture Check

1. Option A preserves user-visible structural parity across the story-skill family (bootstrap and page-cycle present the same Process Flow + Procedure shape) and inherits the prior audit's accepted rationale.
2. Option B reduces the maintenance-drift surface but introduces asymmetry with bootstrap unless a parallel BSBOOT-NN ticket is also opened. If Option B is selected, recommend opening a paired BSBOOT-NN ticket for the bootstrap surface so the family stays consistent.
3. No backwards-compatibility aliasing introduced in either option.

## Verification Layers

### Option A (dismiss)

1. Ticket marked closed/wontfix with rationale referencing the bootstrap-audit precedent → ticket-status manual review.
2. `SKILL.md` unmodified → `git diff .claude/skills/branching-story-page-cycle/SKILL.md` returns empty.

### Option B (shrink)

1. Post-edit Process Flow occupies materially less than 30% of SKILL.md → `wc -l .claude/skills/branching-story-page-cycle/SKILL.md` shows total ≤ ~410 lines (net ~80 reduction).
2. Post-edit Process Flow retains the Pre-flight → Phase 1 → ... → Phase 11 box-and-arrow skeleton → manual review.
3. Procedure section unchanged → `git diff` of `SKILL.md` lines 283-472 (range mapped to post-edit equivalents) returns no semantic changes.
4. Parallel BSBOOT-NN ticket opened for bootstrap parity → cross-ticket reference in this ticket.

## What to Change

### If Option A (recommended)

1. Update this ticket's status to `Closed (wontfix)` with rationale: *"Parity with `docs/triage/2026-05-11-bootstrap-skill-audit-triage.md` dismissal of analogous bootstrap M3 as cosmetic. Process Flow diagram retains orientation value for new readers; cost of shrinking exceeds gain."*
2. No code or documentation edit.

### If Option B

1. `SKILL.md` lines 56-211: collapse per-phase prose annotations under each box to one-line summaries. Preserve box labels (Pre-flight / Phase 1 / Phase 2 / Phase 3 / Phase 4 / Phase 4b / Phase 4.5 / Phase 5 / Phase 6 / Phase 6.5 / Phase 7 / Phase 7.5 / Phase 7.6 / Phase 8 / Phase 9 / Phase 10 / Phase 11) and the box-and-arrow connectors. Drop the long prose between boxes.
2. Open a parallel BSBOOT-NN ticket for the bootstrap SKILL.md Process Flow to maintain story-skill family parity.

## Files to Touch

### Option A

- None.

### Option B

- `.claude/skills/branching-story-page-cycle/SKILL.md` (lines 56-211; ~80-line net reduction).
- A new `tickets/BSBOOT-NN-shrink-process-flow-parity-with-page-cycle.md` for bootstrap parity (separate file create).

## Acceptance Criteria

### Option A

- Ticket status updated to `Closed (wontfix)` with the parity rationale recorded in the commit message that closes it.
- No file modifications under `.claude/skills/branching-story-page-cycle/`.

### Option B

- `wc -l .claude/skills/branching-story-page-cycle/SKILL.md` returns ≤ ~410.
- Process Flow's box-and-arrow skeleton remains intact (Pre-flight + 16 phase boxes connected by arrows) → manual review.
- Procedure section is unchanged in semantics → manual diff confirms lines 283-472 are untouched (modulo line-number shift from the upstream Process Flow shrink).
- Parallel BSBOOT-NN ticket exists at `tickets/BSBOOT-NN-shrink-process-flow-parity-with-page-cycle.md`.

## Test Plan

- User picks Option A or Option B with explicit rationale.
- If Option A: ticket closes; the audit trail (this ticket + the prior bootstrap-audit triage) preserves the dismissal context.
- If Option B: a new-reader (or skill-streamlining-audit re-run) confirms the post-edit SKILL.md is easier to scan without losing the at-a-glance Phase enumeration. Parallel BSBOOT ticket coordinates the bootstrap surface.
