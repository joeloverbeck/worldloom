# SPEC57STCHARPIPINT-009: FOUNDATIONS §7 + cross-skill-consistency enumeration update

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes (docs) — updates `docs/FOUNDATIONS.md` §7 and `.claude/skills/skill-audit/references/cross-skill-consistency.md`; no production code.
**Deps**: SPEC57STCHARPIPINT-001 (the new skill must exist to be enumerated).

## Problem

SPEC-57 introduces `story-character-profile` as a new story-pipeline (Skill Category 2c) skill, but FOUNDATIONS §7 enumerates exactly "seven story-pipeline skills" and the skill-audit cross-skill-consistency reference lists the same seven. Adding the skill without updating these enumerations is a silent drift (Rule 6). This ticket lands the enumeration updates (SPEC-57 Definition of Done).

## Assumption Reassessment (2026-05-21)

1. `docs/FOUNDATIONS.md` line 666 reads "The seven story-pipeline skills constitute Skill Category 2c per `.claude/skills/skill-audit/references/cross-skill-consistency.md`: branching-story-bootstrap, branching-story-turn-cycle, branching-story-prose-attach, commitment-block-authoring, branching-story-health-audit, story-fact-promotion-to-canon, and story-promotion-closeout." `cross-skill-consistency.md` §Skill Category Classification (2c) lists the same seven. Both must add `story-character-profile` (making eight).
2. SPEC-57 §Definition of Done requires updating the §7 enumeration and the cross-skill-consistency Category 2c list to include the new skill. The skill's primary mutation surface (`worlds/<slug>/stories/<slug>/story-characters/`) places it squarely in Category 2c (story-pipeline content-generation reading world `CHAR` only at authoring time).
3. Cross-skill boundary under audit: FOUNDATIONS §7 and the skill-audit cross-skill-consistency reference are the canonical enumerations of Skill Category 2c, consumed by skill-audit's category-classification step. Both restate the same membership list and must stay aligned.
4. FOUNDATIONS §7 (Story-Pipeline Skill Category) is the principle under audit; Rule 6 (No Silent Retcons) requires the enumeration change be explicit (the count moves from seven to eight, and the new member is named) rather than left implicit.

## Architecture Check

1. Updating both enumerations in one ticket keeps the canonical FOUNDATIONS list and its skill-audit consumer aligned in a single reviewable diff, preventing the split-brain where one names eight and the other seven.
2. No backwards-compatibility shim: the count is updated in place ("seven" → "eight") with the new skill named; no alias retained.

## Verification Layers

1. Both enumerations name `story-character-profile` and read "eight" → grep-proof (`grep -n "story-character-profile" docs/FOUNDATIONS.md .claude/skills/skill-audit/references/cross-skill-consistency.md`).
2. Count line updated → grep-proof (`grep -n "eight story-pipeline\|seven story-pipeline" docs/FOUNDATIONS.md` shows the corrected count, no stale "seven").
3. Single-layer note: docs-only ticket; the proof surface is grep against the two enumeration sites.

## What to Change

### 1. docs/FOUNDATIONS.md §7

Update the §Story Bundles §7 enumeration: "seven" → "eight" and add `story-character-profile` to the member list (and to §6 Story-Bundle ID Classes context if the STCHAR class enumeration there needs the skill named — verify at implementation).

### 2. cross-skill-consistency.md Category 2c list

Add `story-character-profile` to the §Skill Category Classification (2c) member list and the §Quick-reference 2c list; update "seven" → "eight" wherever the count appears.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/skill-audit/references/cross-skill-consistency.md` (modify)

## Out of Scope

- The new skill's content (SPEC57STCHARPIPINT-001).
- Per-skill FOUNDATIONS Alignment tables (those land in each skill's own ticket: -003 through -008).
- Any non-enumeration content of FOUNDATIONS or cross-skill-consistency.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "story-character-profile" docs/FOUNDATIONS.md .claude/skills/skill-audit/references/cross-skill-consistency.md` returns matches in both files.
2. `grep -n "seven story-pipeline\|eight story-pipeline" docs/FOUNDATIONS.md` confirms the count is updated to eight with no stale "seven".
3. The cross-skill-consistency Category 2c list and Quick-reference list both include the new skill.

### Invariants

1. The FOUNDATIONS §7 enumeration and the cross-skill-consistency Category 2c enumeration name the identical eight-skill membership.
2. No Category 2c member is removed; only the new skill is added.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against the two enumeration sites named in Assumption Reassessment.`

### Commands

1. `grep -n "story-character-profile\|seven story-pipeline\|eight story-pipeline" docs/FOUNDATIONS.md`
2. `grep -n "story-character-profile" .claude/skills/skill-audit/references/cross-skill-consistency.md`
3. Grep against both enumeration sites is the correct boundary because the deliverable is a docs-enumeration alignment with no executable surface.
