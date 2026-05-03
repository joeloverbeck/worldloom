# Story Promotion SP-NNNN

**Story**: <story_slug> in <world_slug>
**Date**: <iso8601>
**Source kind**: <story_fact | mystery_resolution | character_arc_outcome | artifact_canonization>
**Source record**: <source ID>
**Branch promoted from**: <promotion_branch_path>
**Execution mode**: <authoring | interactive_runtime | batch_generation>

## Outcome

**This-pipeline outcome**: <ACCEPT (handed to canon-addition) | REVISE | REJECT (firewall — <reason>) | REJECT (user)>
**canon-addition outcome** (if handoff fired): <ACCEPT | ACCEPT_WITH_REQUIRED_UPDATES | ACCEPT_AS_LOCAL_EXCEPTION | ACCEPT_AS_CONTESTED_BELIEF | REVISE_AND_RESUBMIT | REJECT | n/a (not handed off)>
**Resulting CF** (if accepted): CF-NNNN | n/a
**Resulting CH** (if accepted): CH-NNNN | n/a
**Adjudication record**: PA-NNNN | n/a
**World-DA created** (if artifact_canonization accepted): DA-NNNN | n/a

## Provenance

- Story: STORY-NNNN
- Branch: <promotion_branch_path>
- Supporting pages: [PG-NNNN, PG-NNNN, ...]
- Supporting prose excerpts:
  - <quoted snippet 1, with PG-NNNN cite>
  - <quoted snippet 2, with PG-NNNN cite>

## Scope and status

- Proposed scope: geographic=<...> / temporal=<...> / social=<...>
- Final scope (post canon-addition): <as accepted | n/a>
- Proposed status: <hard_canon | soft_canon | contested_canon | mystery_reserve>
- Final status: <as accepted | n/a>

## Downstream impact handling

- Within this story: <handling applied per contradiction_handling_preference>
  - Branch <leaf>: <flagged | left alone | archived | n/a>
  - Branch <leaf>: <flagged | left alone | archived | n/a>
- Cross-story (if scan performed): <handling applied — always flag>
  - Story <slug>, branch <leaf>: flagged
  - Story <slug>, branch <leaf>: flagged

## Story-local source record

The original <source ID> remains in this story's `_source/`.

<On accept-flavored verdict:>
A superseding record was written: <new SF/STENT/DA id> at `_source/<class>/<new-id>.yaml` adding `promoted_to_cf: CF-NNNN`. Story-local truth and world-level truth are tracked separately even after promotion; the link is recorded, not erased.

<On non-accept (REVISE_AND_RESUBMIT, REJECT, firewall-reject, user-reject):>
No superseding record was written. The story-local source remains unchanged.

## Mandatory critic verdicts (Phase 7)

- Provenance: <PASS | FAIL — rationale>
- Scope-Inflation: <PASS | FAIL — rationale>
- Mystery-Firewall: <PASS | FAIL — rationale>
- Downstream-Impact: <PASS | FAIL — rationale>
- Rule 12 Two-Trace: <PASS | FAIL | N/A — rationale>

## canon-addition adjudication summary

<Free-form summary of canon-addition's verdict and rationale, copied from PA-NNNN's body_markdown # Verdict + # Justification sections. Cross-reference to the full PA at `worlds/<slug>/adjudications/PA-NNNN-<verdict>.md`.>

<On firewall-reject or user-reject before canon-addition handoff: state "Not handed to canon-addition — rejected at <Phase 4 firewall | Phase 8 user> with reason: <reason>.">

## Notes

<Free-form rationale, user-provided context for the promotion, follow-up audit recommendations (e.g., "branching-story-health-audit recommended after this promotion to verify no other branches developed unflagged contradictions").>
