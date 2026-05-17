# SPEC38STOLOCDIE-004: Amend `branching-story-turn-cycle` Phase 3+4 DA prescription

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-turn-cycle/SKILL.md`
**Deps**: SPEC38STOLOCDIE-001

## Problem

`branching-story-turn-cycle` Phase 3 (`SKILL.md:289`) lists DA creation/alteration as one delta operation among many (`Create or alter story-local artifacts (DA new or supersession)`) with no triage prompt — authors creating page deltas have no rubric to apply when deciding whether the selected choice / write-in / event should create a new DA, supersede an existing one, create a derived DA via `derived_from`, or modify only BEL/SF/STOBJ. Phase 4 (`SKILL.md:325`) correctly documents the `expected_witness_coverage` propagation discipline for public/factional DAs but does not cross-reference the broader DA-authoring rubric that consumer skills now share. This ticket adds a Phase 3 triage sub-step + a Phase 4 cross-reference sentence.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 3 at line 289 (per brainstorm agent verification: `Create or alter story-local artifacts (DA new or supersession)`) and Phase 4 at line 325 (per brainstorm agent: `expected_witness_coverage` validator + indirect-access-route enum + `non_propagation:event_leaves_no_accessible_trace` tag, all enforced deterministically).
2. Verified SPEC-38 §D4 prescribes Phase 3 triage sub-step + Phase 4 cross-reference sentence. The Phase 4 cross-reference is additive (does NOT remove or weaken the existing `expected_witness_coverage` description).
3. Cross-skill boundary: turn-cycle references the same shared reference as bootstrap (ticket 003) — `.claude/skills/_shared-templates/da-authoring-reference.md`. The reference's section names (§Triage, §Decision matrix, §Field semantics, §Patch obligations) must remain stable across the batch.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §4 Write Discipline (DA writes route through `append_story_diegetic_artifact_record` per the patch engine); §Story Bundles §6b Information / Observer Firewall (turn-cycle is the primary site where DA-driven access shifts manifest — new readers gain BEL, hidden artifacts surface, suppressed artifacts get leaked).

## Architecture Check

1. Phase 3 triage sub-step is symmetric with bootstrap's triage sub-step (ticket 003) — same shared reference, same triage rubric, same patch obligations. Single discipline across both producer skills; future updates to the rubric land in one place.
2. Phase 4 cross-reference reinforces existing validator wiring without behavioral change — adds discoverability so authors can find the broader rubric from the propagation paragraph.
3. No backwards-compatibility shims; both amendments are additive.

## Verification Layers

1. Phase 3 DA-triage sub-step present → codebase grep-proof: `grep -nE 'DA creation.*triage|DA creation / supersession|da-authoring-reference' .claude/skills/branching-story-turn-cycle/SKILL.md`.
2. Phase 4 cross-reference sentence to `da-authoring-reference.md` present without removing existing `expected_witness_coverage` description → grep + manual review.
3. Cross-reference target resolves → `test -f .claude/skills/_shared-templates/da-authoring-reference.md` (per ticket 001).
4. Single-layer ticket: documentation-only; verification is grep-based.

## What to Change

### 1. Phase 3 amendment

Add a sub-step immediately before the state-delta materialization step in Phase 3 (placement: adjacent to or replacing the current `Create or alter story-local artifacts (DA new or supersession)` line). Content:

```
**DA creation / supersession / derivation triage.** Before finalizing
`SE.state_delta`, scan the selected choice / write-in / event effects for
written, found, read, posted, forged, translated, copied, redacted, damaged,
broadcast, suppressed, or destroyed communicative artifacts. Apply the
triage rubric and decision matrix at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and
§Decision matrix to decide whether the turn should create a new DA,
supersede an existing DA, create a derived DA (`derived_from: [DA-*]`),
or modify only BEL / SF / STOBJ. Satisfy the patch obligations at
§Patch obligations for every DA created or superseded.
```

### 2. Phase 4 amendment

Add a single sentence to the existing propagation paragraph at line 325 (which describes `expected_witness_coverage` and the `non_propagation:event_leaves_no_accessible_trace` tag). Content:

```
For the full circulation-and-propagation rule set including the BEL
access-route enum, non-propagation tag syntax, and worked examples, see
`.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics
and §Patch obligations.
```

The existing `expected_witness_coverage` description remains in place — the new sentence is purely additive cross-reference.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- Phase 3 or Phase 4 reorganization (only sub-step + cross-reference sentence additions)
- Changes to `expected_witness_coverage` validator behavior (validator is unchanged; this ticket adds documentation cross-references only)
- DA schema changes (deferred per SPEC-38 §Out of Scope)
- Phase 5 or later phases (out of scope; this ticket touches Phase 3 + Phase 4 only)

## Acceptance Criteria

### Tests That Must Pass

1. Phase 3 DA-triage sub-step present in turn-cycle SKILL.md.
2. Phase 4 cross-reference sentence to `da-authoring-reference.md` present.
3. Existing Phase 4 `expected_witness_coverage` description retained (no removal; the cross-reference sentence is additive).
4. Cross-reference target file exists (per ticket 001).

### Invariants

1. Phase 3 and Phase 4 cross-reference the same shared reference; same section names cited as bootstrap's (ticket 003).
2. `expected_witness_coverage` validator is not modified by this ticket; the cross-reference is documentation-only.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'DA creation.*triage|da-authoring-reference|expected_witness_coverage' .claude/skills/branching-story-turn-cycle/SKILL.md` (presence checks across both phases)
2. `test -f .claude/skills/_shared-templates/da-authoring-reference.md` (cross-reference target exists per ticket 001)
