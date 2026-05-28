# SPEC92SCERANPRO-010: FOUNDATIONS + cross-cutting docs for the scene render layer

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — docs only (`docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md`).
**Deps**: SPEC92SCERANPRO-008, SPEC92SCERANPRO-009

## Problem

The scene render layer needs its FOUNDATIONS + docs surfaces landed atomically once the implementation + skills exist: the SCN ID class (§6), the +2 skill roster (§7), scene plans hosting §2/§3/§render-time (§9), a new Scene Render Layer sub-section with the §5a/§5c guard, plus WORKFLOWS / REPOSITORY-MAP / prose-renderer-README entries.

## Assumption Reassessment (2026-05-28)

1. `docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md` all exist at HEAD (verified). FOUNDATIONS §Story Bundles §6 currently lists story-bundle ID classes (SCN absent); §7 lists 8 Skill Category 2c skills (the two new skills bring it to 10); §9 hosts the prose-length + verbatim-section discipline.
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

## What to Change

### 1. docs/FOUNDATIONS.md (modify)

§Story Bundles §6: add SCN to the story-bundle ID class list. §7: add `branching-story-scene-plan` + `branching-story-scene-prose-attach` to the Skill Category 2c roster (8 → 10, updated consistently wherever the count is stated). §9: note scene plans host §2/§3/§render-time verbatim (cold-paste per scene; additive to page plans). Add a new §Story Bundles "Scene Render Layer" sub-section: SCN is a derived non-authoritative render-membership record over committed PG ranges; the §5a/§5c guard (token-validator backstop + scene-plan HARD-GATE §5c affirmation).

### 2. docs/WORKFLOWS.md + docs/REPOSITORY-MAP.md + docs/prose-renderer-contract/README.md (modify)

WORKFLOWS: invocation entries for the two new skills. REPOSITORY-MAP: scene directories + the two skills in the taxonomy. prose-renderer README: the contract blocks now inline into scene plans too.

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
