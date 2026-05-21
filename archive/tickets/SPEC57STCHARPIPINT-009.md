# SPEC57STCHARPIPINT-009: FOUNDATIONS §7 + cross-skill-consistency enumeration update

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes (docs) — updates `docs/FOUNDATIONS.md` §7 and `.claude/skills/skill-audit/references/cross-skill-consistency.md`; no production code.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (the new skill must exist to be enumerated).

## Problem

At intake, SPEC-57 introduced `story-character-profile` as a new story-pipeline (Skill Category 2c) skill, but FOUNDATIONS §7 enumerated exactly "seven story-pipeline skills" and the skill-audit cross-skill-consistency reference listed the same seven. Adding the skill without updating these enumerations would have been silent drift (Rule 6). This ticket landed the enumeration updates (SPEC-57 Definition of Done).

## Assumption Reassessment (2026-05-21)

1. At intake, `docs/FOUNDATIONS.md` §7 read "The seven story-pipeline skills constitute Skill Category 2c per `.claude/skills/skill-audit/references/cross-skill-consistency.md`: branching-story-bootstrap, branching-story-turn-cycle, branching-story-prose-attach, commitment-block-authoring, branching-story-health-audit, story-fact-promotion-to-canon, and story-promotion-closeout." `cross-skill-consistency.md` §Skill Category Classification (2c) listed the same seven. Both now add `story-character-profile` (making eight).
2. SPEC-57 §Definition of Done requires updating the §7 enumeration and the cross-skill-consistency Category 2c list to include the new skill. The skill's primary mutation surface (`worlds/<slug>/stories/<slug>/story-characters/`) places it squarely in Category 2c (story-pipeline content-generation reading world `CHAR` only at authoring time).
3. Cross-skill boundary under audit: FOUNDATIONS §7 and the skill-audit cross-skill-consistency reference are the canonical enumerations of Skill Category 2c, consumed by skill-audit's category-classification step. Both restate the same membership list and must stay aligned.
4. FOUNDATIONS §7 (Story-Pipeline Skill Category) is the principle under audit; Rule 6 (No Silent Retcons) requires the enumeration change be explicit (the count moves from seven to eight, and the new member is named) rather than left implicit.
5. Live reassessment also found `docs/FOUNDATIONS.md` §9 ("Prose Length Discipline At Story Scope") repeating the old seven-skill scope list. That list is the same Category 2c membership surface and was corrected in this ticket so FOUNDATIONS does not contradict its own §7 enumeration. `docs/FOUNDATIONS.md` §6 already named `STCHAR` in Story-Bundle ID Classes, so no §6 edit was needed.

## Architecture Check

1. Updating both enumerations in one ticket keeps the canonical FOUNDATIONS list and its skill-audit consumer aligned in a single reviewable diff, preventing the split-brain where one names eight and the other seven.
2. No backwards-compatibility shim: the count is updated in place ("seven" → "eight") with the new skill named; no alias retained.

## Verification Layers

1. Both enumerations name `story-character-profile` and read "eight" → grep-proof (`grep -n "story-character-profile" docs/FOUNDATIONS.md .claude/skills/skill-audit/references/cross-skill-consistency.md`).
2. Count line updated → grep-proof (`grep -n "eight story-pipeline\|seven story-pipeline" docs/FOUNDATIONS.md` shows the corrected count, no stale "seven").
3. Single-layer note: docs-only ticket; the proof surface is grep against the two enumeration sites.

## What to Change

### 1. docs/FOUNDATIONS.md §7 and §9

Updated the §7 enumeration from "seven" to "eight" and added `story-character-profile` to the member list. Also updated §9's story-pipeline scope list to include `story-character-profile`. §6 already named `STCHAR`, so no §6 edit was required.

### 2. cross-skill-consistency.md Category 2c list

Added `story-character-profile` to the §Skill Category Classification (2c) member list, updated "seven" to "eight", and added `STCHAR` to the story-bundle record-class summary in the same line.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/skill-audit/references/cross-skill-consistency.md` (modify)
- `archive/tickets/SPEC57STCHARPIPINT-009.md` (modify closeout)

## Out of Scope

- The new skill's content (archive/tickets/SPEC57STCHARPIPINT-001.md).
- Per-skill FOUNDATIONS Alignment tables (those land in each skill's own ticket: -003 through -008).
- Any non-enumeration content of FOUNDATIONS or cross-skill-consistency.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "story-character-profile" docs/FOUNDATIONS.md .claude/skills/skill-audit/references/cross-skill-consistency.md` returns matches in both files.
2. `grep -n "seven story-pipeline\|eight story-pipeline" docs/FOUNDATIONS.md` confirms the count is updated to eight with no stale operational "seven" phrase in FOUNDATIONS.
3. The cross-skill-consistency Category 2c list includes the new skill and records `STCHAR` among story-bundle record classes.

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

## Outcome

Completed 2026-05-21. `docs/FOUNDATIONS.md` now names eight story-pipeline skills in §7 and includes `story-character-profile` in the §9 prose-length scope list. `.claude/skills/skill-audit/references/cross-skill-consistency.md` now matches the eight-skill Category 2c membership and includes `STCHAR` in its story-bundle record-class summary.

## Verification Result

- `grep -n "story-character-profile\|seven story-pipeline\|eight story-pipeline" docs/FOUNDATIONS.md` — PASS; FOUNDATIONS live prose names `story-character-profile` and `eight story-pipeline`, with no stale operational `seven story-pipeline` hit.
- `grep -n "story-character-profile" .claude/skills/skill-audit/references/cross-skill-consistency.md` — PASS; Category 2c includes the new skill.
- `git diff --check -- docs/FOUNDATIONS.md .claude/skills/skill-audit/references/cross-skill-consistency.md tickets/SPEC57STCHARPIPINT-009.md` — PASS before archival; no whitespace errors in owned tracked edits.

## Deviations

- The ticket also updated `docs/FOUNDATIONS.md` §9's repeated story-pipeline scope list because live reassessment showed it was the same Category 2c membership surface. This is same-seam docs truthing, not a new behavior change.
- The drafted mention of a cross-skill-consistency "Quick-reference 2c list" was stale; the live reference has a single load-bearing Category 2c line, so that line was the corrected implementation surface.
