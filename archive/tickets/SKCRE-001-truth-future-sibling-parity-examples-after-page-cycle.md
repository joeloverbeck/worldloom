# SKCRE-001: Truth skill-creator future-sibling parity examples after branching-story-page-cycle shipped

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/skill-creator/SKILL.md` example/provenance wording only
**Deps**: `archive/tickets/BSBOOT-001-delegate-bootstrap-seams-to-page-cycle.md`

## Problem

At intake, post-review of `BSBOOT-001` confirmed that `branching-story-page-cycle` now exists and that `branching-story-bootstrap` consumes its PG/SE/CHC schema authority. The skill-creator guidance still contained a historical example that described `branching-story-bootstrap/templates/story-records.yaml` as an SE-record-schema seam to future `branching-story-page-cycle`.

That example was correct when the downstream sibling did not exist. It is now stale as active guidance because future skill generations could copy the old "future sibling" framing for a sibling that has already shipped.

## Assumption Reassessment (2026-05-02)

1. `archive/tickets/BSBOOT-001-delegate-bootstrap-seams-to-page-cycle.md` records the completed handoff: page-cycle is the runtime authority for PG/SE/CHC, and bootstrap examples were parity-swept to that authority.
2. Live grep during this ticket found `.claude/skills/skill-creator/SKILL.md` still using `branching-story-bootstrap/templates/story-records.yaml` as an example of a future-sibling SE-record-schema seam to `branching-story-page-cycle`.
3. The shared boundary under audit is skill-creator's meta-guidance for future-sibling parity examples. This ticket does not change branching-story-bootstrap or branching-story-page-cycle behavior.
4. No FOUNDATIONS rule directly motivates this cleanup. It is workflow-integrity maintenance: generated skills should not inherit stale sibling-existence examples.
5. This ticket does NOT touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces.
6. No schema, skill, tool, hook, or validator is renamed or removed.
7. Adjacent concern: `.claude/skills/skill-creator/references/gap-filler-interview.md` was already dirty before this ticket was drafted. Reassessment found its page-cycle mentions are current reverse-seam and multi-sibling worked-precedent prose, not active future-sibling guidance. It was reviewed but not edited for this ticket.

## Architecture Check

1. Updating the example/provenance wording is cleaner than preserving a stale historical example because the skill-creator is used to author new skills from current repository state.
2. No backwards-compatibility shims or aliases are introduced. This is guidance truthing only.

## Verification Layers

1. Stale example removal -> codebase grep-proof over `.claude/skills/skill-creator/SKILL.md` and `.claude/skills/skill-creator/references/gap-filler-interview.md` for `branching-story-bootstrap/templates/story-records.yaml` plus `branching-story-page-cycle`.
2. Historical handoff preserved -> manual review that any remaining branching-story examples distinguish shipped page-cycle authority from still-future siblings such as `storylet-pool-authoring`, `story-fact-promotion-to-canon`, and `branching-story-health-audit`.

## What to Change

### 1. Skill-creator examples

Updated the stale future-sibling example in `.claude/skills/skill-creator/SKILL.md` so the active example is now the still-future `storylet-pool-authoring` SLT seam. The former `branching-story-page-cycle` example is preserved only as a historical note stating that BSBOOT-001 closed the PG/SE/CHC seam.

### 2. Gap-filler reference check

Reviewed `.claude/skills/skill-creator/references/gap-filler-interview.md` for the same stale framing. No edit was needed because the remaining page-cycle references describe shipped reverse-seam precedent and still-future sibling handling for `storylet-pool-authoring`, `story-fact-promotion-to-canon`, and `branching-story-health-audit`.

## Files to Touch

- `.claude/skills/skill-creator/SKILL.md` (modify)
- `archive/tickets/SKCRE-001-truth-future-sibling-parity-examples-after-page-cycle.md` (modify)

## Out of Scope

- Changing `branching-story-bootstrap` or `branching-story-page-cycle`.
- Reworking skill-creator's future-sibling parity design beyond the stale example.
- Editing unrelated dirty hunks already present in `gap-filler-interview.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'branching-story-bootstrap/templates/story-records.yaml.*branching-story-page-cycle|SE-record-schema seam to .branching-story-page-cycle' .claude/skills/skill-creator/SKILL.md .claude/skills/skill-creator/references/gap-filler-interview.md` returns no hits.
2. Manual review confirmed remaining branching-story examples distinguish shipped page-cycle authority from still-future sibling seams.
3. `git diff --check -- .claude/skills/skill-creator/SKILL.md` passes, and `rg -n '[[:blank:]]+$' archive/tickets/SKCRE-001-truth-future-sibling-parity-examples-after-page-cycle.md` returns no hits for the archived ticket file.

### Invariants

1. Skill-creator examples must not teach agents to treat a shipped sibling as absent.
2. Still-future sibling guidance remains intact for siblings that have not shipped.

## Test Plan

### New/Modified Tests

1. `None — skill-guidance truthing ticket; verification is grep/manual-review based.`

### Commands

1. `rg -n 'branching-story-bootstrap/templates/story-records.yaml.*branching-story-page-cycle|SE-record-schema seam to .branching-story-page-cycle' .claude/skills/skill-creator/SKILL.md .claude/skills/skill-creator/references/gap-filler-interview.md`
2. `git diff --check -- .claude/skills/skill-creator/SKILL.md`
3. `rg -n '[[:blank:]]+$' archive/tickets/SKCRE-001-truth-future-sibling-parity-examples-after-page-cycle.md`

## Outcome

Completed on 2026-05-02. `.claude/skills/skill-creator/SKILL.md` no longer presents `branching-story-page-cycle` as a future sibling in the active future-sibling parity example. The live example now uses the still-future `storylet-pool-authoring` SLT seam, and the page-cycle relationship is labelled as historical BSBOOT-001 closeout context.

`gap-filler-interview.md` was reviewed but not edited because its page-cycle mentions are current worked-precedent prose rather than stale future-sibling guidance.

## Verification Result

1. `rg -n 'branching-story-bootstrap/templates/story-records.yaml.*branching-story-page-cycle|SE-record-schema seam to .branching-story-page-cycle' .claude/skills/skill-creator/SKILL.md .claude/skills/skill-creator/references/gap-filler-interview.md` returned no hits.
2. Manual review confirmed `SKILL.md` now names `storylet-pool-authoring` as the active not-yet-shipping example, while `gap-filler-interview.md` retains page-cycle only as shipped reverse-seam precedent.
3. `git diff --check -- .claude/skills/skill-creator/SKILL.md` passed.
4. `rg -n '[[:blank:]]+$' archive/tickets/SKCRE-001-truth-future-sibling-parity-examples-after-page-cycle.md` returned no hits.

## Deviations

1. `.claude/skills/skill-creator/references/gap-filler-interview.md` remained untouched after reassessment because it did not contain the stale active-example framing.
