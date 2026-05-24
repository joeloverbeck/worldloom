# SPEC79CHCREM-006: Turn-cycle skill — Phase 1 routing change + Phase 8/9 axis-list edits

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — three turn-cycle reference files: `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md` (Phase 1 routing change), `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (CHC enumeration + axis list), `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (validator gate axis list).
**Deps**: archive/tickets/SPEC79CHCREM-001.md, SPEC79CHCREM-003

## Problem

Three turn-cycle reference files document the pre-removal CHC contract: Phase 1 reads `associated_commitment_block` as one of the action-routing inputs; Phase 8 enumerates the §4.5.12 CHC shape including the field; Phase 9 documents the `choice_set_collapse` ERROR check with all 4 material axes including the field. Once 001 drops the field from the schema and 003 reduces the noncollapse axes to 3, all three reference files must be updated so the turn-cycle skill's operator guidance matches the post-removal contract.

Phase 1's change is the only non-mechanical edit: per the SPEC-79 reassessment Q2=(a), Phase 1 routes on `action_family + grounded_in.records` rather than on the SLT identity carried by the dropped field. This cleaner separation treats Phase 1 as intent-routing and Phase 2 as commitment-block-selection; SLT identity is no longer carried across the phase boundary.

## Assumption Reassessment (2026-05-24)

1. Confirmed three turn-cycle reference files reference the field: `phase-1-action-resolution.md:3` reads the field as a routing input; `phase-8-choice-generation.md:7` enumerates the §4.5.12 CHC shape; `phase-8-choice-generation.md:19` and `phase-9-validation-gates.md:28` enumerate the 4-axis material-signature for the `choice_set_collapse` gate. The turn-cycle `SKILL.md` itself does NOT reference the field (verified by grep at reassessment time).
2. Confirmed SPEC-79 §5.2 prescribes the three-file edit set with explicit per-file edits. Q2=(a) in the SPEC-79 reassessment authorized the Phase 1 routing change to `action_family + grounded_in.records`.
3. Cross-skill boundary: these reference files document the turn-cycle skill's CHC consumption (Phase 1 routing) and emission (Phase 8 generation) contracts. The edits must land alongside the schema change (001) so the skill's documented behavior matches the schema's accepted CHC shape, AND alongside the rule_choice_set_noncollapse axis reduction (003) so the documented validator gate's axis list matches the rule validator's actual signature axes. The Deps on 001 + 003 enforces both orderings.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the turn-cycle skill is both a CHC consumer (Phase 1) and a CHC producer (Phase 8); its documented contracts must match the post-removal shared-contract template (handled in 001). The Phase 1 routing change preserves the routing semantics (action_family + grounded_in.records carry the same intent the removed SLT-name formerly hinted at, plus `grounded_in.records` is now required per the schema post-001).
5. Removal blast radius (was template item 7): this ticket updates three reference files in the turn-cycle skill. The operational consequence is that turn-cycle Phase 8 CHC-emission patch payloads stop emitting the field (enforced by 001's schema rejection); Phase 1's routing logic switches inputs (operator-applied per the updated guidance); Phase 9's validator-gate description matches the rule validator's 3-axis signature.

## Architecture Check

1. The Phase 1 routing change is the cleaner separation: Phase 1 routes intent (action_family + grounded_in.records); Phase 2 selects the commitment block (the SLT). The pre-removal contract carried SLT identity across the phase boundary, conflating intent-routing with commitment-block-selection. The post-removal contract restores the clean separation that §Story Bundles §5c ("Driver salience is local") prescribes — two local salience passes (intent-routing then SLT-selection), not one global lookup.
2. The Phase 8 enumeration edit mirrors bootstrap's Phase 9 edit (005) — both files document the same §4.5.12 CHC shape; both drop the field reference; both add the same FOUNDATIONS-aligned resolution-time-selection note.
3. The Phase 9 validator-gate edit mirrors the rule_choice_set_noncollapse axis reduction (003) and the health-audit material-axes edit (007) — all three documents/skills name the same 4→3 axis reduction.
4. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. The three reference files no longer mention `associated_commitment_block` → codebase grep-proof: `grep -rn "associated_commitment_block" .claude/skills/branching-story-turn-cycle/` returns zero matches.
2. Phase 1's routing guidance reads as prescribed in SPEC-79 §5.2 (routes on `action_family + grounded_in.records`) → manual review of the updated `phase-1-action-resolution.md:3` paragraph.
3. Phase 8's CHC enumeration mirrors bootstrap's updated enumeration → manual review against `phase-8-9-page-plan-and-choices.md` (post-005).
4. Phase 9's validator-gate description matches the rule's 3-axis signature → manual review against `rule_choice_set_noncollapse.ts` (post-003) and against `branching-story-health-audit/SKILL.md:185` (post-007).

## What to Change

### 1. `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md`

- At line 3, rewrite the action-resolution routing input list:
  - **Old**: *"If `chosen_choice_id` is supplied, load the `CHC` record; its action-family list, `associated_commitment_block`, and `success_policy` (if any) drive the routing."*
  - **New**: *"If `chosen_choice_id` is supplied, load the `CHC` record; its action-family list, `grounded_in.records`, and `success_policy` (if any) drive the routing."*
- The cleaner separation treats Phase 1 as intent-routing and Phase 2 as commitment-block-selection. SLT identity is no longer carried across the phase boundary — Phase 2 selects the commitment block from the live pool filtered against `grounded_in.records`, `target_or_action_families`, and parent PG active records per §Phase 2 commitment-block selection.

### 2. `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`

- At line 7, drop the `associated_commitment_block (SLT-<integer> or null — turn-cycle will JIT next turn if null)` clause from the §4.5.12 CHC-shape enumeration. The corrected paragraph reads: *"Each `CHC` carries the shared contract §4.5.12 shape: `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families` (a non-empty list using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `grounded_in`, and optional `success_policy` when this choice later resolves through `outcome_route: attempt`."* Add the same one-line FOUNDATIONS-aligned note as 005 (and 001's shared-contract update): *"CHCs do not name a specific SLT; selection happens at turn-cycle resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records."*
- At line 19, drop `associated_commitment_block` from the material-axes list in the `choice_set_noncollapse` validator description. The corrected sentence reads: *"…a non-terminal page with more than one emitted choice must have at least two choices that differ materially in `target_or_action_families`, `grounded_in.records`, or `likely_state_pressure`, unless at least two intentionally expressive variants are marked in the page plan as rhetorical or expressive."*

### 3. `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`

- At line 28, drop `associated_commitment_block` from the material-axes enumeration in the `choice_set_noncollapse` gate description. The corrected sentence reads: *"ERROR `choice_set_collapse` rejects a page whose choices all share the same `target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`, unless the page plan explicitly marks at least two named CHCs as rhetorical or expressive variants."*

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The validator rewrites (handled in 002, 003).
- Bootstrap skill update (handled in 005).
- Health-audit skill update (handled in 007).
- Docs update (handled in 008).
- Adding new fields to CHC (rejected per spec §2.3 + §7).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "associated_commitment_block" .claude/skills/branching-story-turn-cycle/` returns zero matches.
2. A turn-cycle dry-run from a synthetic bundle: Phase 2 selects an SLT from the live pool without consulting any per-CHC SLT hint; Phase 8 emits CHCs without the field; the resulting state is replay-equivalent under `snapshot_replay_equality`.
3. The Phase 1 routing guidance reads as prescribed in SPEC-79 §5.2 (Q2=(a)).
4. The Phase 9 validator-gate description matches the rule_choice_set_noncollapse signature (3-axis).

### Invariants

1. The turn-cycle skill's documented CHC shape (Phase 8 emission) matches the post-removal shared-contract template at every CHC-emission site.
2. The turn-cycle skill's documented validator-gate description (Phase 9) matches the rule_choice_set_noncollapse implementation's actual signature axes.
3. Phase 1 routes on intent-only inputs (action_family + grounded_in.records); SLT identity is selected in Phase 2 from the live pool, not carried across the phase boundary.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "associated_commitment_block" .claude/skills/branching-story-turn-cycle/`
2. Turn-cycle dry-run (manual): invoke `/branching-story-turn-cycle` against a test bundle and verify the produced CHCs lack the field; verify Phase 2's selection traces don't reference the field.
