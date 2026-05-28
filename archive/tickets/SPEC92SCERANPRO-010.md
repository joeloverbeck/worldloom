# SPEC92SCERANPRO-010: FOUNDATIONS + cross-cutting docs for the scene render layer

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — docs only (`docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md`).
**Deps**: archive/tickets/SPEC92SCERANPRO-008.md, archive/tickets/SPEC92SCERANPRO-009.md

## Problem

The scene render layer needs its FOUNDATIONS + docs surfaces landed atomically once the implementation + skills exist: the SCN ID class (§6), the +2 skill roster (§7), scene plans hosting §2/§3/§render-time (§9), a new Scene Render Layer sub-section with the §5a/§5c guard, plus WORKFLOWS / REPOSITORY-MAP / prose-renderer-README entries.

## Assumption Reassessment (2026-05-28)

1. At intake, `docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/REPOSITORY-MAP.md`, and `docs/prose-renderer-contract/README.md` all existed. FOUNDATIONS §Story Bundles §6 listed story-bundle ID classes with `SCN` absent; §7 listed 8 Skill Category 2c skills; §9 hosted the prose-length + verbatim-section discipline. This ticket updated those surfaces to the completed SPEC-92 scene-layer state.
2. SPEC-92 §7 (Files-to-touch FOUNDATIONS + docs) defines the amendments. The two new skills (-008 / -009) must exist before §7's roster update + WORKFLOWS invocation entries land — hence the Deps.
3. Cross-artifact boundary under audit: FOUNDATIONS + the three docs are consumed pipeline-wide (every story skill reads FOUNDATIONS; WORKFLOWS lists skill invocations; REPOSITORY-MAP lists the skill taxonomy + scene directories; prose-renderer README notes the contract blocks now inline into scene plans too). This is the cross-cutting docs ticket — it lands once all upstream surfaces exist coherently.
4. FOUNDATIONS §Story Bundles §6 (SCN ID class) + §7 (roster +2) + §9 (scene plans host §2/§3/§render-time) + a new Scene Render Layer sub-section (derived non-authoritative rendering + §5a/§5c guard) are the amendments. They are additive — the page-plan §9 hosting language is preserved (SPEC-93 handles its removal); the verbatim-inlining decision is preserved (cold-paste per scene).

## Architecture Check

1. A single cross-cutting docs ticket lands the FOUNDATIONS + docs surfaces atomically after the implementation + skills exist, avoiding a window where §7's roster cites skills that don't yet exist. Acceptance is grep-proof against the post-implementation tree.
2. No shims: amendments are additive (new §6 row, +2 §7 roster, new sub-section); nothing removed (SPEC-93 owns removals).

## Verification Layers

1. FOUNDATIONS §6 lists SCN; §7 roster = 10; §9 references scene plans; new Scene Render Layer sub-section present -> grep-proof.
2. WORKFLOWS lists the two new skills; REPOSITORY-MAP lists scene directories + skill taxonomy -> grep-proof.
3. prose-renderer README notes contract blocks inline into scene plans -> grep-proof.

## Landed Changes

### 1. docs/FOUNDATIONS.md (modified)

Added `SCN` to the story-bundle ID class list, updated Skill Category 2c from eight to ten skills with `branching-story-scene-plan` and `branching-story-scene-prose-attach`, and extended §9 so scene plans host the same renderer-bound Content Policy, Prose Craft Contract, and Render-Time Instruction blocks. Added the Scene Render Layer prose under §4: `SCN` is a derived non-authoritative render-membership record over committed PG ranges, with a §5a/§5c guard backed by `scn_no_narrative_shape_language` and the scene-plan HARD-GATE affirmation.

### 2. docs/WORKFLOWS.md + docs/REPOSITORY-MAP.md + docs/prose-renderer-contract/README.md (modified)

WORKFLOWS now lists invocation entries for the two new scene skills and shows the scene-plan -> external render -> scene-prose-attach loop. REPOSITORY-MAP now lists `_source/scenes`, `scene-prose-plans/`, `scene-prose/`, and `scene-prose-receipts/`, and names the two scene skills in the story-pipeline taxonomy. The prose-renderer README now states that the shared renderer-bound blocks inline into scene plans as well as page plans, and names `scene_plan_verbatim_section_integrity` as the scene-plan byte-equality check.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/WORKFLOWS.md` (modify)
- `docs/REPOSITORY-MAP.md` (modify)
- `docs/prose-renderer-contract/README.md` (modify)

## Out of Scope

- Any code (validators / ops / schemas / skills — -002 through -009).
- Removing page-plan FOUNDATIONS language (SPEC-93's subtractive scope).
- The capstone (-011).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "SCN" docs/FOUNDATIONS.md` shows SCN in §6; the §7 roster includes both new skills.
2. `grep -n "branching-story-scene-plan\|branching-story-scene-prose-attach" docs/WORKFLOWS.md` shows both invocation entries.
3. The new Scene Render Layer sub-section + §5a/§5c guard present in FOUNDATIONS (grep-proof).

### Invariants

1. Amendments are additive — page-plan FOUNDATIONS language is unchanged (coexistence).
2. The §7 roster count is updated consistently wherever the count is stated.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-proof against the post-implementation tree, per Assumption Reassessment.`

### Commands

1. `grep -n "SCN\|Scene Render Layer\|scene-plan\|scene-prose-attach" docs/FOUNDATIONS.md`
2. `grep -n "branching-story-scene-plan\|branching-story-scene-prose-attach" docs/WORKFLOWS.md docs/REPOSITORY-MAP.md`

## Outcome

Completed: 2026-05-28

Landed the additive SPEC-92 cross-cutting documentation layer after the scene-plan and scene-prose-attach skills existed. FOUNDATIONS now describes `SCN` as a non-authoritative scene render unit over committed `PG` ranges, records the §5a/§5c guard, includes `SCN` in story-bundle ID classes, updates the Skill Category 2c roster to ten skills, and states that scene plans host the renderer-bound contract blocks.

WORKFLOWS, REPOSITORY-MAP, and the prose-renderer README now expose the scene planning and scene attach paths, the new story-bundle directories, and the cold-context renderer contract at scene granularity.

## Verification Result

1. `grep -n "SCN\|Scene Render Layer\|scene-plan\|scene-prose-attach" docs/FOUNDATIONS.md` — PASS: FOUNDATIONS contains the `SCN` ID-class entry, the Scene Render Layer subsection, the scene-plan roster/scope language, and the scene-prose-attach references.
2. `grep -n "branching-story-scene-plan\|branching-story-scene-prose-attach" docs/WORKFLOWS.md docs/REPOSITORY-MAP.md` — PASS: both new skill names are present in the workflow invocation docs and repository taxonomy.
3. `grep -n "scene-prose-plans\|scene_plan_verbatim_section_integrity\|scene-prose-receipts" docs/prose-renderer-contract/README.md docs/REPOSITORY-MAP.md` — PASS: the renderer README and map name the scene plan/prose/receipt surfaces and the scene-plan verbatim validator.
4. `git diff --check -- docs/FOUNDATIONS.md docs/WORKFLOWS.md docs/REPOSITORY-MAP.md docs/prose-renderer-contract/README.md archive/tickets/SPEC92SCERANPRO-010.md` — PASS.

## Deviations

None. The ticket stayed docs-only and additive; page-plan language was preserved for coexistence, with SPEC-93 still owning subtractive removal.
