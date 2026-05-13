# story-promotion-closeout — New Skill v1

## Purpose

Close a story promotion after `canon-addition` adjudication. This is deliberately separate from proposal creation.

## Inputs

Required:

- `world_slug`
- `story_slug`
- `promotion_id`
- `canon_addition_verdict: accepted | accepted_with_limits | rejected | deferred`

Required on accepted outcomes:

- `linked_cf_ids[]`
- `linked_ch_ids[]`
- `linked_pa_ids[]`

Optional:

- `same_story_branch_handling: none | flag | archive`
- `affected_branch_ids[]`
- `notes`

## Outputs

Patch-engine story records:

- superseding `SF`, `BEL`, `STENT`, `SREL`, `DA`, or `BR` records as needed to link canon outcome,
- optional `SE` with `event_kind: promotion_closeout`.

Direct files:

- update `story-promotions/SP-NNNN.md`, or write `story-promotions/SP-NNNN-closeout.md` if direct mutation is undesirable,
- bundle `INDEX.md` last,
- per-world story index only if branch visibility/archive status changed.

## Workflow

### 1. Load promotion package and canon verdict

Verify that the source package exists and that the verdict references valid canon-addition output.

### 2. Determine story-local effects

Accepted outcomes may require:

- superseding a branch-local `SF` to add `promoted_to_cf`,
- superseding `BEL` records to distinguish belief from now-canon truth,
- superseding `DA` to link a story artifact to a world artifact,
- superseding `STENT` or `SREL` when a character outcome became canon,
- superseding `BR` records to flag or archive contradictory same-story branches.

Rejected outcomes may require:

- recording `promotion_rejected`,
- preserving the claim as branch-local, contested, or counterfactual,
- creating a `BEL` that marks the claim as false or disputed if that matters in-story.

Deferred outcomes record no canon link.

### 3. Validate

Check:

- no world-canon mutation is attempted,
- accepted links reference actual canon-addition outputs,
- branch archive/flag actions only affect same-story branches,
- story-local records are superseded append-only,
- rejected outcomes do not erase branch-local history.

### 4. Write

Submit story-bundle patch operations, then write/update promotion closeout markdown, then update indexes last.

## Why this exists

The old promotion skill had to describe a proposal phase, an external canon-addition handoff, and a post-adjudication closeout inside one large process. Splitting closeout makes both halves shorter, easier to test, and less likely to mis-sequence conditional writes.
