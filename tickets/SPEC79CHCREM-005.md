# SPEC79CHCREM-005: Bootstrap skill — drop `associated_commitment_block` from CHC emission guidance

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (Phase 9 CHC emission guidance).
**Deps**: SPEC79CHCREM-001

## Problem

Bootstrap's Phase 9 reference file currently documents the CHC shape as including `associated_commitment_block (SLT-<integer> if known, else null — turn-cycle will JIT)` per the pre-removal §4.5.12 shared contract. Once SPEC79CHCREM-001 drops the field from the schema and shared contract, this guidance is stale — any bootstrap run that follows it would emit CHCs that fail schema validation at patch-engine submission. The reference must be updated to document the post-removal CHC shape (no `associated_commitment_block`, with a one-line FOUNDATIONS-aligned note explaining that selection happens at turn-cycle resolution time).

## Assumption Reassessment (2026-05-24)

1. Confirmed `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md:25` enumerates the §4.5.12 CHC shape including `associated_commitment_block (SLT-<integer> if known, else null — turn-cycle will JIT)`. Verified via grep at reassessment time.
2. Confirmed SPEC-79 §5.1 prescribes the replacement language: *"Each CHC carries the shared contract §4.5.12 shape: id, story_id, created_at_page, surface_label, player_visible_intent, target_or_action_families, likely_state_pressure, grounded_in.records (from PG-1.state_snapshot.active_records). Selection happens at turn-cycle resolution time against the live pool."*
3. Cross-skill boundary: this ticket's edit must land alongside the schema change (001) so bootstrap's documented CHC shape matches the schema's accepted CHC shape. Patch-engine submission of `create_chc_record` payloads will fail validation if bootstrap emits the field after 001 lands. The Deps chain enforces ordering.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the bootstrap skill is a producer of CHC records; its documented contract must match the post-removal shared-contract template (handled in 001). The skill's other Phase 9 guidance (grounded_in.records population, affordance_ordinals, success_policy) is unchanged.
5. Removal blast radius (was template item 7): bootstrap's `create_chc_record` patch payloads stop emitting the field (operational consequence of this documentation update). The skill prose itself is the only file touched here; the operational change is enforced by 001's schema rejection.

## Architecture Check

1. Replacing the parenthetical with the FOUNDATIONS-aligned note makes the post-removal CHC shape explicit at the bootstrap skill's only CHC-emission site. The alternative (just deleting the field reference and leaving the rest of the §4.5.12 enumeration prose) would leave bootstrap operators wondering whether the omission was intentional or an editorial oversight; the explicit note resolves the ambiguity.
2. No backwards-compatibility aliasing/shims introduced. The bootstrap skill's CHC-emission guidance simply documents the new schema's shape; no migration path for old bundles is described (no production bundles exist per SPEC-79 §10).

## Verification Layers

1. The bootstrap reference file no longer mentions `associated_commitment_block` → codebase grep-proof: `grep -n "associated_commitment_block" .claude/skills/branching-story-bootstrap/` returns zero matches.
2. The replacement note correctly cites the new field set for the CHC shape → manual review of the updated paragraph against SPEC-79 §5.1's prescribed language.
3. The skill's other Phase 9 guidance (grounded_in.records, affordance_ordinals, success_policy, rhetorical-mark prose) is unchanged → manual review of the unchanged paragraphs in the same file.

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

- At line 25, replace the §4.5.12 CHC-shape enumeration paragraph:
  - **Old**: *"Each `CHC` carries the shared contract §4.5.12 shape: `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families` (a non-empty list using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `associated_commitment_block` (`SLT-<integer>` if known, else null — turn-cycle will JIT), `grounded_in`, and optional `success_policy` when a later `SE.outcome_route` resolves the choice through `attempt`."*
  - **New**: *"Each `CHC` carries the shared contract §4.5.12 shape: `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families` (a non-empty list using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `grounded_in`, and optional `success_policy` when a later `SE.outcome_route` resolves the choice through `attempt`. CHCs do not name a specific SLT; selection happens at turn-cycle resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records."*
- Operational consequence: bootstrap's `create_chc_record` patch-plan op payloads drop the `associated_commitment_block` key. No source code in the bootstrap skill itself needs editing — the skill is markdown-only; the operational change is enforced by 001's schema rejection plus this updated guidance.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The shared contract template update (handled in 001).
- Turn-cycle skill updates (handled in 006).
- Health-audit skill update (handled in 007).
- Docs update (handled in 008).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "associated_commitment_block" .claude/skills/branching-story-bootstrap/` returns zero matches.
2. A bootstrap dry-run against a representative world produces CHCs without `associated_commitment_block` and the resulting bundle passes all 8 shared hard gates (the post-001 schema validation is the upstream enforcement).
3. The §4.5.12 CHC-shape enumeration paragraph reads as prescribed in SPEC-79 §5.1, with the FOUNDATIONS-aligned note about resolution-time selection.

### Invariants

1. The bootstrap skill's documented CHC shape matches the post-removal shared-contract template at every CHC-emission site.
2. Bootstrap operators following this Phase 9 guidance produce CHCs that pass schema validation at patch-engine submission.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "associated_commitment_block" .claude/skills/branching-story-bootstrap/`
2. Bootstrap dry-run (manual): invoke `/branching-story-bootstrap` against a test world and verify the produced CHCs lack the field.
