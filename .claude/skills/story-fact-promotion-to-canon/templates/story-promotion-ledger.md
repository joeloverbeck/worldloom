---
promotion_id: SP-NNNN
story_slug: <story_slug>
world_slug: <world_slug>
created: <iso8601 date>
source_kind: story_fact | mystery_resolution | character_outcome | artifact_canonization | relationship_or_institutional_outcome | other_branch_claim
branch_path: BR-NNNN
proposal_package_path: worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-proposal-package.yaml
hard_gate_approved: true
firewall_verdict: PASS | REQUIRES_USER_ACCEPTANCE   # ABORT verdicts never reach the write phase
status: AWAITING_CANON_ADDITION
---

# SP-NNNN: <Short title from the candidate>

## Overview

Branch-local story claim from `<branch_path>` in story `<story_slug>` proposed for promotion to world canon as **<candidate.status>** (`<candidate.type>`). The full machine-readable proposal package is at [`<proposal_package_path>`](../story-promotions/SP-NNNN-proposal-package.yaml); this ledger is the human-readable narrative record of the promotion attempt and its HARD-GATE approval.

## Candidate

**Title**: <candidate.title>

**Statement**: <candidate.statement>

**Scope**: geographic `<candidate.scope.geographic>` | temporal `<candidate.scope.temporal>` | social `<candidate.scope.social>`

**Truth scope**: world_level `<candidate.truth_scope.world_level>` | diegetic_status `<candidate.truth_scope.diegetic_status>`

**Domains affected**: <comma-separated list>

## Evidence

- **Source records**: <list of source_record_ids>
- **Supporting pages**: <list of supporting_page_ids>
- **Authoring events**: <list of SE-NNNN ids>
- **Witness beliefs**: <list of BEL-NNNN ids>
- **Branch lineage**: <branch_path> (every source record's `created_at_page` traces to this branch)

## Analyses

### Scope-inflation report

- **Source actual scope**: `<derived geographic / temporal / social>`
- **Candidate proposed scope**: `<candidate geographic / temporal / social>`
- **Widening applied**: <none | named widening>
- **Scope argument**: <user-supplied rationale, if any>
- **Trace count**: <integer; for hard-canon Rule 12 anticipation>
- **Flags**: <list, if any>

### Mystery firewall report

- **Mysteries scanned**: <count>
- **Firewall verdict**: <PASS | REQUIRES_USER_ACCEPTANCE>
- **Forbidden resolution attempts**: <list, or none>
- **Accidental resolution warnings**: <list, or none>
- **Counterfactual promotion attempts**: <list, or none>
- **Source-kind mismatch warnings**: <list, or none>

### Downstream impact report

- **World domains affected**: <comma-separated list>
- **Same-story contradictory branches**: <list of BR-NNNN>
- **Cross-story contradictions**: <list of sibling_story_slug:record_id>
- **Affected world files**: <list>
- **Promotion provenance narrative**: <one-paragraph explanation>

## Contradiction preference

`<flag | archive_same_story_branches | leave_counterfactual>` — `story-promotion-closeout` will apply this preference after `canon-addition` adjudicates.

## User acceptances at HARD-GATE

- **Warnings accepted**: <list of warning ids, or none>
- **Prose-receipt failures accepted**: <list of (page_id, receipt verdict, acceptance rationale), or none>

## Recommended next step

Run `canon-addition` with `proposal_path=<proposal_package_path>`. After canon-addition emits its adjudication verdict (accept / accept_with_limits / reject / defer), run `story-promotion-closeout` with the verdict + this `promotion_id` to write the verdict back onto story-local records.
