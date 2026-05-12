# STPOOL-010: Reframe Final Rule to avoid paraphrasing HARD-GATE pass conditions

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — SKILL.md edit only.
**Deps**: None

## Problem

At intake, `.claude/skills/storylet-pool-authoring/SKILL.md`'s "Final Rule" closing section paraphrased the HARD-GATE pass conditions in prose form. Specifically:

- "the firewall is intact (every M's `forbidden` status respected; no `canon_candidate` authority on author-pool storylets)" — paraphrases gates 1 + 2.
- "the mode-appropriate batch checks pass (seed/focus diversity axes, audit RSP visibility-match, and branch-contamination for every direct batch)" — paraphrases Phase 5 audit.
- "every predicate parses against the engine-checkable Predicate DSL" — paraphrases gate 7.
- "the branch-isolation invariant holds (no `global_author_pool` storylet leaks branch-local IDs)" — paraphrases gate 8.
- "the user has explicitly approved the batch through this skill's direct HARD-GATE or through the parent skill's HARD-GATE when `parent_skill_invocation: true`" — paraphrases the HARD-GATE itself.

The paraphrase was rhetorically effective as a closing reminder, but it created a drift hazard: if the 14-gate set acquires a 15th gate, if Phase 5 acquires a new diversity axis, or if the HARD-GATE pass conditions evolve in any other way, the Final Rule could silently drift away from the HARD-GATE block at SKILL.md:57 (the authoritative pass-condition source).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-09.

## Assumption Reassessment (2026-05-12)

1. At intake, verified `.claude/skills/storylet-pool-authoring/SKILL.md:391-393` was the Final Rule closing paragraph; line 393 carried the paraphrased pass-condition list.
2. Verified `SKILL.md:57` (HARD-GATE block, condition (b)) is the authoritative 14-gate + Phase 5 + Phase 6-approval pass-condition enumeration.
3. The Final Rule's rhetorical role is to close the SKILL.md document with a thematic statement of the skill's purpose — that role does not require restating the pass conditions.
4. Selected Option A: replace the paraphrase with a thematic close that cites the HARD-GATE block as the authoritative pass-condition source without enumerating individual gates, batch axes, predicates, branch-isolation checks, or approval paths.
5. `docs/HARD-GATE-DISCIPLINE.md` was read during implementation because this ticket edits skill-local HARD-GATE-adjacent wording; the change preserves the top HARD-GATE block as the authority and does not alter approval, validation, or write behavior.

## Architecture Check

1. The HARD-GATE block at the top of the file is the single source of truth for pass conditions; the Final Rule does not need to restate them.
2. No backwards-compatibility shim — SKILL.md prose edit.

## Verification Layers

1. **Final Rule no longer enumerates gates** — `awk '/## Final Rule/,0' .claude/skills/storylet-pool-authoring/SKILL.md | { grep -cE "gate [0-9]|forbidden|canon_candidate|global_author_pool|Predicate DSL|branch-isolation" || test $? -eq 1; }` prints `0` and exits 0.
2. **HARD-GATE block remains authoritative** — `SKILL.md:57` HARD-GATE pass-condition list is unchanged.

## Landed Changes

### 1. Reframe the Final Rule as a thematic close

In `.claude/skills/storylet-pool-authoring/SKILL.md`, replaced the Final Rule with a thematic statement that names the skill's purpose without restating gates:

```
## Final Rule

A storylet pool is not authored because storylets were generated. It is authored only
when the HARD-GATE block at the top of this file says the candidate pool may proceed.
That block is the authoritative pass-condition source; this closing rule is only the
discipline it protects. A brittle pool produces a brittle story, so the skill's final
act is to preserve the structural gate instead of summarizing it.
```

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)

## Out of Scope

- Editing the HARD-GATE block itself.
- Changing other skills' Final Rule patterns (they may have the same hazard; out of scope for this audit's follow-up).

## Acceptance Criteria

### Tests That Must Pass

1. `awk '/## Final Rule/,0' .claude/skills/storylet-pool-authoring/SKILL.md | { grep -cE "gate [0-9]|forbidden|canon_candidate|global_author_pool|Predicate DSL|branch-isolation" || test $? -eq 1; }` prints `0` and exits 0.
2. `awk '/## Final Rule/,0' .claude/skills/storylet-pool-authoring/SKILL.md | grep -c "HARD-GATE block at the top of this file"` prints `1`.
3. The HARD-GATE block at SKILL.md:57 is unchanged.

### Invariants

1. The HARD-GATE block is the single source of truth for pass conditions.
2. The Final Rule does not silently drift from the HARD-GATE block.

## Test Plan

### New/Modified Tests

1. None — SKILL.md prose edit.

### Commands

1. Visual review of the rewritten Final Rule against the HARD-GATE block to confirm the drift hazard is removed.
2. The grep commands from Acceptance Criteria.

## Outcome

Completion date: 2026-05-12.

COMPLETED. The Final Rule in `.claude/skills/storylet-pool-authoring/SKILL.md` now closes thematically and points to the top HARD-GATE block as the authoritative pass-condition source. It no longer enumerates individual gates, mystery-firewall checks, `canon_candidate` authority, Predicate DSL parsing, branch isolation, batch axes, or approval paths.

## Verification Result

1. Visual review confirmed the `.claude/skills/storylet-pool-authoring/SKILL.md` diff is limited to the Final Rule paragraph; the top HARD-GATE block is unchanged.
2. `awk '/## Final Rule/,0' .claude/skills/storylet-pool-authoring/SKILL.md | { grep -cE "gate [0-9]|forbidden|canon_candidate|global_author_pool|Predicate DSL|branch-isolation" || test $? -eq 1; }` printed `0`.
3. `awk '/## Final Rule/,0' .claude/skills/storylet-pool-authoring/SKILL.md | grep -c "HARD-GATE block at the top of this file"` printed `1`.

## Deviations

The drafted negative `grep -c` proof was adjusted to tolerate grep's no-match exit code while preserving the required `0` output.
