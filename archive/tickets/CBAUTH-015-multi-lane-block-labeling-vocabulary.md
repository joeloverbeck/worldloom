# CBAUTH-015: Phase 6 sub-step 3 block-labeling vocabulary should permit multi-lane labels rather than implying mutual exclusion via "vs."

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/SKILL.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-005 (depth-criteria lane vocabulary), CBAUTH-008 (moment-fit-lane vocabulary)

## Problem

`.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3 deliverable-summary instructs:

> Label each authored block as an absent-target fill **vs.** an under-representation addition (criterion `(a)` / `(b)` / cast-role gap) **vs.** a depth addition (`action_family_combo` / `specific_pressure_shape` / `single_block_move_family` / `action_family_single_block` / `paired_pressure_shape` / `hard_grounding_lane`) **vs.** a moment-fit addition (`lane_id` from Pass B), or — when none apply — explicitly flag the block as `no documented lane; authorial judgment` and state the rationale.

The "vs." conjunctions strongly imply mutual exclusion — pick exactly one label per block. But in practice **blocks regularly belong to multiple categories simultaneously**, and the operator must compose labels to convey what the block addresses. Observed on the 2026-05-30 red-bunny SLB-5 run:

- **SLT-34** addressed the Pass B moment-fit lane `evasion_under_single_block_at_moment` (a moment-fit addition with `lane_id` from Pass B) AND was authored with a lifecycle-robust relationship-keyed hard predicate (`any_relationship_axis(desire, ≥high, participant_role=primary_actor)`) that lifts the move_family's hard-grounding coverage from `soft_only` / single-block to a robust hard-grounded selection — exactly the CBAUTH-005 `hard_grounding_lane` depth criterion. SLT-34 is both a moment-fit addition AND a `hard_grounding_lane` depth addition.
- **SLT-37** addressed depth via `specific_pressure_shape` (the SREL-6→SREL-7 fear-folded-inward / warmth-as-trap supersession axis is a specific high-urgency shape that the existing bond_shift blocks SLT-2 / SLT-13 / SLT-20 do not narrow to). The block is depth-only at this moment (no Pass B lane fired for the warmth-as-trap supersession axis because the supersession was within a single PG and Pass B's source-axis filter did not name it), but the labeling vocabulary as written suggests choosing exactly one of `specific_pressure_shape` vs `single_block_move_family` vs `paired_pressure_shape` — the depth-criterion lane vocabulary itself contains multiple categories that can co-apply to one block.

The session worked around the limitation by labeling SLT-34 as "moment-fit (lane X) + depth (`hard_grounding_lane`)" in the deliverable summary (the user accepted the composite label without pushback), but the spec's "vs." phrasing makes the composite labeling read as a deviation from the documented procedure rather than the intended pattern.

A future operator reading the spec strictly might force-rank into one category and lose the second category's signal in the audit trail — collapsing the operator-routing information CBAUTH-013 separately tries to preserve at the Pass B output side.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3 (the "coverage-depth signal" bullet's instruction paragraph) reads "Label each authored block as an absent-target fill vs. an under-representation addition (criterion (a) / (b) / cast-role gap) vs. a depth addition (`action_family_combo` / `specific_pressure_shape` / `single_block_move_family` / `action_family_single_block` / `paired_pressure_shape` / `hard_grounding_lane`) vs. a moment-fit addition (`lane_id` from Pass B), or — when none apply — explicitly flag the block as `no documented lane; authorial judgment` and state the rationale." Verified by direct Read this session. The four "vs." conjunctions span four label families.
2. Within the depth-addition family, the six CBAUTH-005 lane labels (`action_family_combo` / `specific_pressure_shape` / `single_block_move_family` / `action_family_single_block` / `paired_pressure_shape` / `hard_grounding_lane`) are also separated by "/" within the bullet — natural reading is "pick one". But CBAUTH-005's lane definitions describe overlapping criteria (e.g., `hard_grounding_lane` overlaps with the under-representation criterion (a), per the CBAUTH-005 reference itself: "Overlaps with under-representation criterion (a) but extends it"). The spec acknowledges overlap at the lane-definition site but the labeling vocabulary at the Phase 6 site does not.
3. Shared boundary under audit: the SLB manifest's `## Under-Represented Lanes Addressed` section (when present in prior SLB conventions, e.g., SLB-4) consumes the per-block label. The composite-labeling case has precedent: SLB-4 manifest uses composite "(under-representation) + (depth: <criterion>)" phrasings in some block sections. The Phase 6 sub-step 3 spec should align with that observed convention.
4. FOUNDATIONS principle under audit: §Story Bundles §5b (Schema-Minimalism — every label load-bearing). The composite label IS load-bearing — it tells the operator both why the block was authored AND what depth criterion it satisfies. Collapsing to a single label loses signal; multi-labeling preserves both.
5. Adjacent contradiction classification: this ticket clarifies the Phase 6 sub-step 3 labeling vocabulary established at CBAUTH-005 (depth-criteria) and CBAUTH-008 (moment-fit-lane vocabulary) without changing either underlying lane enum. Required-consequence cleanup of the deliverable-summary contract, not a separate bug.
6. Out-of-scope creep guard: this ticket does NOT add new lane labels to either CBAUTH-005's depth-criteria or CBAUTH-008's moment-fit-lane vocabulary. It does NOT change Pass A's coverage-target enumeration or Pass B's source-axis enumeration. Skill-prose elaboration of the existing labeling instruction only.

## Architecture Check

1. Cleaner than alternatives: rewriting the Phase 6 sub-step 3 instruction to explicitly permit composite labels (one block can carry one absent-target / under-representation label PLUS one or more depth-criteria labels PLUS one moment-fit-lane label PLUS the "no documented lane" fallback) preserves the existing four label families and their six depth-criteria sub-vocabulary without enum expansion. The alternative — introducing a new top-level "composite" label family — would proliferate vocabulary and require Phase 2 authoring guidance and SLB manifest templates to consume both single and composite labels separately.
2. No backwards-compatibility aliasing/shims introduced: existing SLB-1..SLB-4 manifests that used single labels remain valid; existing SLB-4 manifests that used composite labels become explicitly licensed rather than implicitly tolerated. No on-disk artifact changes.

## Verification Layers

1. Invariant: Phase 6 sub-step 3 explicitly permits per-block composite labels across the four families (absent-target / under-representation / depth / moment-fit) → codebase grep-proof (`SKILL.md` Phase 6 sub-step 3 contains a sentence like "A single block may carry labels from multiple families when the block addresses more than one lane simultaneously (e.g., a moment-fit lane addressing AND a `hard_grounding_lane` depth criterion); join composites with ' + ' and surface each in the deliverable summary").
2. Invariant: the depth-addition sub-vocabulary's six labels remain comma-separated (or "/" separated as currently) but the surrounding instruction notes that multiple sub-vocabulary labels may co-apply to one block → codebase grep-proof (the instruction paragraph names "multiple depth-criteria sub-labels may co-apply, e.g., `specific_pressure_shape + paired_pressure_shape`").
3. Invariant: the "no documented lane" fallback continues to apply when NO family's label applies → manual review (re-read the instruction paragraph and confirm the fallback's scope: "when no label across all four families applies").

## What to Change

### 1. Phase 6 sub-step 3 instruction rewrite

In `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3, replace the labeling instruction with:

> Label each authored block with one or more labels from the four label families below — a single block may carry labels from multiple families when the block addresses more than one lane simultaneously. Join composite labels with ` + ` so the audit trail surfaces every category the block addresses. Family 1 (absent-target fill): the labels `absent-target` plus the missing target_id from Pass A. Family 2 (under-representation addition): the labels `under-representation` plus criterion (`(a)` / `(b)` / `cast-role gap`) from Pass A. Family 3 (depth addition): one OR more of `action_family_combo` / `specific_pressure_shape` / `single_block_move_family` / `action_family_single_block` / `paired_pressure_shape` / `hard_grounding_lane` from CBAUTH-005's lane vocabulary; multiple sub-labels may co-apply to one block. Family 4 (moment-fit addition): the `lane_id` from Pass B (CBAUTH-008) plus its `source` axis. When NO label across all four families applies, explicitly flag the block as `no documented lane; authorial judgment` and state the rationale.

### 2. Worked composite-label examples

Add a worked-example paragraph below the instruction:

> Worked composite examples (red-bunny SLB-5 case, 2026-05-30): SLT-34 → "moment-fit (`evasion_under_single_block_at_moment` from Pass B `move_family_under_represented_at_moment` source) + depth (`hard_grounding_lane`: the relationship-keyed hard predicate lifts the move_family's hard-grounding coverage from soft_only/single-block to robust hard-grounded)". SLT-37 → "depth (`specific_pressure_shape`: the SREL-6→SREL-7 fear-folded-inward / warmth-as-trap supersession axis narrows the bond_shift move_family to a specific high-urgency shape not covered by SLT-2 / SLT-13 / SLT-20)". SLT-32 → "Pass A cast-role gap (authority STENT-3) + moment-fit (`authority_reach_at_offstage_pressure_source` from Pass B `cast_role_engagement` source)".

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Any change to CBAUTH-005's depth-criteria lane enum, CBAUTH-008's moment-fit-lane shape, or Pass A's 17-target enumeration.
- Generalization of multi-label semantics to per-block validation traces or batch-diversity check rows (those continue to be single-block scoped per gate).
- A new schema field on SLT records carrying the labels (the labels are deliverable-summary metadata, not persisted record state).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "may carry labels from multiple families\|Join composite labels with" .claude/skills/commitment-block-authoring/SKILL.md` returns the rewritten instruction.
2. `grep -n "Worked composite examples" .claude/skills/commitment-block-authoring/SKILL.md` returns the worked-example paragraph.
3. Re-running `commitment-block-authoring` against red-bunny SLB-N+1 produces a deliverable summary in which any block that addresses multiple lanes carries the composite label with ` + ` joining, matching the SLB-5 worked example.

### Invariants

1. The four label families (absent-target / under-representation / depth / moment-fit) and their sub-vocabularies (CBAUTH-005 depth lanes; CBAUTH-008 moment-fit `source` axes) are unchanged.
2. The "no documented lane; authorial judgment" fallback continues to apply when no family's label applies.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "may carry labels from multiple families\|Worked composite examples\|Join composite labels with" .claude/skills/commitment-block-authoring/SKILL.md`
2. Re-invoke `commitment-block-authoring --world_slug erotica-world --story_slug red-bunny --mode direct_batch --target_count 6` and confirm the deliverable summary's "Coverage-depth signal" table accepts composite labels per the worked example, without the spec's "vs." phrasing implying single-label selection.
3. (No narrower verification surface needed — prose-only ticket; the composite-labeling claim is verifiable by re-running on the live bundle.)
