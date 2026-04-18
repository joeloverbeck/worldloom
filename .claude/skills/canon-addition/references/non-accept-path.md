# Non-Accept Path: Phases 12b-14b

Load this reference when Phase 11 produces a non-accept verdict (REVISE_AND_RESUBMIT / REJECT). This reference covers adjudication report drafting, validation tests for the report, and the commit procedure with its HARD-GATE. No canon is mutated on this branch — only an adjudication record is written.

## Phase 12b: Draft Adjudication Report

Compose `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md`:
- Proposal (copied)
- Phase 0–11 analysis (full outputs, not summaries)
- Verdict + phase-cited justifications
- For `REVISE_AND_RESUBMIT`: a "what would need to change for resubmission" section (scope narrowings, cost additions, reclassifications, splits).
- For `REJECT`: a "why this cannot be repaired within the current world" section naming the invariants / genre-contract elements / mystery-reserve entries that forbid it. May recommend Mystery Reserve placement.
- If escalation fired, the six critic reports verbatim.

## Phase 13b: Validation Tests

Loop back to Phase 12b if: any phase's output is missing; verdict is not cited to specific phase findings; REVISE resubmission menu is empty or vague; REJECT does not name an invariant / genre-contract element / mystery-reserve entry as the cause.

## Phase 14b: Commit (non-accept branch)

Present verdict + report summary to the user.

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request report revisions, (c) override the verdict and convert to accept branch (returns to Phase 11 with user-provided verdict override; override is logged in the adjudication record per Rule 6).

On approval, atomic write of `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md` only. No canon mutated. Report path.
