# STPOOL-010: Reframe Final Rule to avoid paraphrasing HARD-GATE pass conditions

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — SKILL.md edit only.
**Deps**: None

## Problem

`.claude/skills/storylet-pool-authoring/SKILL.md:384-386` (the "Final Rule" closing section) paraphrases the HARD-GATE pass conditions in prose form. Specifically:

- "the firewall is intact (every M's `forbidden` status respected; no `canon_candidate` authority on author-pool storylets)" — paraphrases gates 1 + 2.
- "the mode-appropriate batch checks pass (seed/focus diversity axes, audit RSP visibility-match, and branch-contamination for every direct batch)" — paraphrases Phase 5 audit.
- "every predicate parses against the engine-checkable Predicate DSL" — paraphrases gate 7.
- "the branch-isolation invariant holds (no `global_author_pool` storylet leaks branch-local IDs)" — paraphrases gate 8.
- "the user has explicitly approved the batch through this skill's direct HARD-GATE or through the parent skill's HARD-GATE when `parent_skill_invocation: true`" — paraphrases the HARD-GATE itself.

The paraphrase is rhetorically effective as a closing reminder, but it creates a drift hazard: if the 14-gate set acquires a 15th gate, if Phase 5 acquires a new diversity axis, or if the HARD-GATE pass conditions evolve in any other way, the Final Rule silently drifts away from the HARD-GATE block at SKILL.md:57 (the authoritative pass-condition source).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-09.

## Assumption Reassessment (2026-05-12)

1. Verified `SKILL.md:384-386` is the Final Rule closing paragraph; lines 384-386 carry the paraphrased pass-condition list.
2. Verified `SKILL.md:57` (HARD-GATE block, condition (b)) is the authoritative 14-gate + Phase 5 + Phase 6-approval pass-condition enumeration.
3. The Final Rule's rhetorical role is to close the SKILL.md document with a thematic statement of the skill's purpose — that role does not require restating the pass conditions.
4. Two reframing options:
   - (a) **Replace with a thematic close** that names the skill's purpose without enumerating gates (e.g., "A storylet pool is not authored because storylets were generated. It is authored only when the firewall is intact, the pool covers the open story state, and the user has explicitly approved — the HARD-GATE block at the top of this file is the authoritative pass-condition source.").
   - (b) **Keep the rhetorical paraphrase but explicitly bind it to the HARD-GATE block** with a leading sentence (e.g., "See the HARD-GATE block at top-of-file for the authoritative pass conditions; the conditions below restate the load-bearing ones at the close.").

   Recommended: (a). The Final Rule's rhetorical purpose is satisfied without restating gates; the drift hazard is fully removed.

## Architecture Check

1. The HARD-GATE block at the top of the file is the single source of truth for pass conditions; the Final Rule does not need to restate them.
2. No backwards-compatibility shim — SKILL.md prose edit.

## Verification Layers

1. **Final Rule no longer enumerates gates** — `awk '/## Final Rule/,/^$/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -cE "gate [0-9]|forbidden_M|canon_candidate|global_author_pool|predicate.DSL|branch-isolation"` returns 0 (or, if option b is chosen, returns the bounded set the operator explicitly preserved alongside the HARD-GATE cross-citation).
2. **HARD-GATE block remains authoritative** — `SKILL.md:57` HARD-GATE pass-condition list is unchanged.

## What to Change

### 1. (Option a, recommended) Reframe the Final Rule as a thematic close

In `SKILL.md:384-386`, replace the current Final Rule with a thematic statement that names the skill's purpose without restating gates:

```
## Final Rule

A storylet pool is not authored because storylets were generated. It is authored only
when every per-storylet and batch-level pass condition declared in the HARD-GATE block
at the top of this file has been satisfied with a one-line rationale AND the user has
explicitly approved the batch — directly (this skill's HARD-GATE) or transitively (the
parent skill's HARD-GATE under `parent_skill_invocation: true`). A runtime JIT storylet
is valid only when the same per-storylet pass conditions hold, it is branch-scoped to
the calling page, and `branching-story-page-cycle` Phase 11 commits it. The runtime
page-cycle's salience scoring is only as good as the pool it scores; a brittle pool
produces a brittle story, and the HARD-GATE block is the structural surface that
prevents brittleness from landing.
```

### 2. (Option b alternative, if the rhetorical paraphrase is preferred)

If the user prefers to keep the paraphrased enumeration as a rhetorical close, add a leading sentence binding it to the HARD-GATE block:

```
## Final Rule

The HARD-GATE block at the top of this file is the authoritative pass-condition source;
the conditions below restate the load-bearing ones at the close as a rhetorical reminder
— update both in lockstep if the gate set evolves.
[then the existing paragraph]
```

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)

## Out of Scope

- Editing the HARD-GATE block itself.
- Changing other skills' Final Rule patterns (they may have the same hazard; out of scope for this audit's follow-up).

## Acceptance Criteria

### Tests That Must Pass

1. (Option a) `awk '/## Final Rule/,0' .claude/skills/storylet-pool-authoring/SKILL.md | grep -cE "gate [0-9]|forbidden|canon_candidate|global_author_pool|Predicate.DSL|branch-isolation"` returns 0.
2. (Option b) `awk '/## Final Rule/,/^$/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -c "HARD-GATE block at the top of this file is the authoritative"` returns 1.
3. The HARD-GATE block at SKILL.md:57 is unchanged.

### Invariants

1. The HARD-GATE block is the single source of truth for pass conditions.
2. The Final Rule (whichever option is chosen) does not silently drift from the HARD-GATE block.

## Test Plan

### New/Modified Tests

1. None — SKILL.md prose edit.

### Commands

1. Visual review of the rewritten Final Rule against the HARD-GATE block to confirm the drift hazard is removed.
2. The grep commands from Acceptance Criteria.
