# BSPAGE-003: Fix stale "Phase 7 prose render" language in `phase-4-storylet-and-mystery-authority.md`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — documentation fix inside `.claude/skills/branching-story-page-cycle/references/`.
**Deps**: None.

## Problem

`references/phase-4-storylet-and-mystery-authority.md:64` reads:

> After Phase 4 selects arc `SLT-NNNN`, select exactly one row from `arc.effect_model.variants[]` before Phase 7 **prose render** fires.

This is stale post-PROSESPLIT-007 language. Phase 7 no longer renders prose — it authors a comprehensive plan. The skill's current contract is documented at:

- `SKILL.md:303` ("Phase 7 — Multi-Beat Arc Plan Authoring ... The LLM **populates the canonical plan template** ... NOT prose")
- `SKILL.md:481` ("Phase 7 produces a plan, not prose")
- `references/phase-7-page-plan.md:5` ("Phase 7 produces a plan; it does NOT render prose")
- `references/governance-and-foundations.md:49` ("Phase 7 produces a plan, not prose")

The Phase 4b language contradicts the rest of the skill. A reader of this sentence would mistakenly believe Phase 7 emits rendered prose at plan-commit time, which would corrupt their mental model of where the 8-axis prose critic runs (it now runs in finalize Phase 3, not page-cycle Phase 7).

## Assumption Reassessment (2026-05-11)

1. `references/phase-4-storylet-and-mystery-authority.md:64` contains the literal string `"before Phase 7 prose render fires"`. Confirmed by direct read.
2. `SKILL.md` and the rest of `references/phase-7-*.md` consistently describe Phase 7 as plan-authoring only post-PROSESPLIT-007. Confirmed by direct read across `SKILL.md:40,303,481,489-491` and `phase-7-page-plan.md:2,5,60,161`.
3. Shared boundary: `phase-4-storylet-and-mystery-authority.md` is a page-cycle-internal reference; no sibling skill cites this file path directly (verified: `grep -rn "phase-4-storylet-and-mystery-authority" .claude/skills/ docs/ specs/` returns only intra-skill matches). Fix is local.
4. The wording "before Phase 7 ... fires" is semantically correct — Phase 4b runs after Phase 4 and before Phase 7 — only the noun "prose render" is the stale piece. Replace with "plan authoring" (the post-PROSESPLIT-007 deliverable name).
5. Mismatch + correction: One-noun-replace in line 64.

## Architecture Check

1. The fix preserves the surrounding sentence structure and only replaces the stale noun; no contract change.
2. No backwards-compatibility aliasing introduced.

## Verification Layers

1. `phase-4-storylet-and-mystery-authority.md` post-edit no longer contains `"Phase 7 prose render"` → `grep -c "Phase 7 prose render" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns `0`.
2. Post-edit, the line names the post-PROSESPLIT-007 deliverable (`"plan authoring"` or equivalent) → `grep -c "Phase 7 plan authoring\|Phase 7 plan-authoring" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns ≥1.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`

Change line 64 from:

```
After Phase 4 selects arc `SLT-NNNN`, select exactly one row from `arc.effect_model.variants[]` before Phase 7 prose render fires.
```

to:

```
After Phase 4 selects arc `SLT-NNNN`, select exactly one row from `arc.effect_model.variants[]` before Phase 7 plan authoring fires.
```

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` (one-noun edit on line 64).

## Acceptance Criteria

- `grep -c "Phase 7 prose render" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns `0`.
- `grep -c "Phase 7 plan authoring" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` returns ≥1.
- Manual read: the sentence flows naturally with the replacement noun.

## Test Plan

- A future skill-audit drift scan re-running the Phase 3 path/name-drift pattern on this file no longer reports the stale-noun finding.
