# STPOOL-011: Update predicate-DSL reference to post-prose-strip Phase 7.6 role

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — template doc edit only.
**Deps**: None

## Problem

At intake, `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` still described stop predicates as evaluated by the runtime page-cycle's SPEC-20 Phase 7.6 stop-condition evaluator. The most visible drift was in the "Stop Predicates" application-sites list, but reassessment also found the same stale lifecycle claim in the introduction, the tier summary, and safety-valve glosses.

After the prose-strip rework (`PROSESPLIT-*` tickets), `branching-story-page-cycle` Phase 7.6 runs **Layer 1 only** at plan-commit (deterministic structural validation over the plan's frontmatter and inlined selected-arc record). Layer 2 (post-render trace extraction) and Layer 3 (semantic conformance critic) move to `branching-story-page-prose-finalize` Phase 4. Per `branching-story-page-cycle/SKILL.md:165-173`: *"ARC_TRACE Layer 1 only (Layer 2/3 deferred to finalize) — deterministic structural validation over the plan's frontmatter and inlined selected-arc record."*

Before this ticket, the predicate-dsl.md reference still named Phase 7.6 as if it owned runtime stop-condition evaluation, which is technically correct only for Layer 1 (the stop-condition declaration check) — the actual semantic evaluation of whether a stop condition fires against rendered prose moved to finalize's Phase 4 (per `branching-story-page-prose-finalize/...` Phase 4 contracts).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-10. Same drift pattern that the user's rework concern (post-prose-strip references not updated everywhere) anticipated.

## Assumption Reassessment (2026-05-12)

1. At intake, verified `templates/predicate-dsl.md` still contained four stale same-seam lifecycle references: the introduction, the tier summary, the "Stop Predicates" application-sites list, and the safety-valve/Layer 3 glosses.
2. Verified `branching-story-page-cycle/SKILL.md` and `branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` confirm Phase 7.6 runs Layer 1 only post-rework; Layer 2/3 deferred to finalize.
3. Verified `branching-story-page-prose-finalize/SKILL.md` and `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md` own rendered-prose Layer 2 extraction, stop-condition-hit evidence, and Layer 3 semantic conformance.
4. The stale predicate-dsl lines are informational (where predicates are consumed downstream), not gate-enforced — but a reader using this document to understand the predicates' lifecycle would form an incorrect mental model of where evaluation happens.
5. The narrower question — what does Phase 7.6 actually evaluate at plan-commit time — is per-skill specific to page-cycle. The predicate-dsl doc's job is to document the predicate grammar; describing the lifecycle of evaluation is secondary. Same-file stale lifecycle references are required consequence fallout for this ticket and are absorbed.

## Architecture Check

1. Updated the predicate-dsl lifecycle references to reflect the post-rework split: Phase 7.6 does Layer 1 (stop-condition declaration check); `branching-story-page-prose-finalize` Phase 4 does Layer 2/3 (trace extraction and semantic conformance critic against rendered prose).
2. No structural changes to the predicate-dsl grammar itself.

## Verification Layers

1. **Reference accuracy** — the predicate-dsl.md description of where stop predicates are consumed matches the post-prose-strip phase split documented in `branching-story-page-cycle/SKILL.md` and `branching-story-page-prose-finalize/SKILL.md`.

## Landed Changes

### 1. Updated predicate-dsl lifecycle references

Updated `templates/predicate-dsl.md` to replace stale Phase 7.6 stop-condition-evaluator references with the post-rework lifecycle split:

```
Stop predicates are used only at these SLT sites:

- `arc.stop_policy.normal_exits[].predicate`
- `arc.stop_policy.interrupt_before[].predicate`
- the runtime page-cycle's SPEC-20 Phase 7.6 stop-condition evaluator
```

with:

```
Stop predicates are used only at these SLT sites:

- `arc.stop_policy.normal_exits[].predicate` — declared on the SLT record at authoring time.
- `arc.stop_policy.interrupt_before[].predicate` — declared on the SLT record at authoring time.
- Lifecycle: `branching-story-page-cycle` Phase 7.6 runs Layer 1 deterministic stop-condition *declaration* checking at plan-commit; `branching-story-page-prose-finalize` Phase 4 runs Layer 2/3 semantic stop-condition *evaluation* against rendered prose. Both consume the predicates declared on the SLT.
```

Also updated the intro/tier summary and safety-valve glosses so no same-file prose still presents Layer 2/3 stop-condition evaluation as a page-cycle Phase 7.6 responsibility.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Editing `branching-story-page-cycle`'s or `branching-story-page-prose-finalize`'s SKILL.md (they already document the post-rework phase split correctly).
- Audit-mode predicate-DSL extensions or grammar changes.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'Phase 7\.6|branching-story-page-prose-finalize|Layer 2/3|Layer 3' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returns matches that reflect the post-rework Layer 1 / Layer 2-3 split.
2. `rg -n 'Phase 7\.6 (stop-condition evaluator|Layer 3|routes the page-cycle)' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returns no matches.

### Invariants

1. The predicate-dsl doc's lifecycle description matches the actual phase responsibilities documented in `branching-story-page-cycle/SKILL.md:165-173` and `branching-story-page-prose-finalize/SKILL.md`.

## Test Plan

### New/Modified Tests

1. None — reference doc edit.

### Commands

1. `rg -n 'Phase 7\.6|branching-story-page-prose-finalize|Layer 2/3|Layer 3' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`
2. `rg -n 'Phase 7\.6 (stop-condition evaluator|Layer 3|routes the page-cycle)' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`
3. Cross-read the corrected predicate-dsl reference against `branching-story-page-cycle/SKILL.md`, `branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`, `branching-story-page-prose-finalize/SKILL.md`, and `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md` to confirm alignment.

## Outcome

Completed on 2026-05-12.

Updated `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` so stop-predicate lifecycle prose now states the post-PROSESPLIT split: page-cycle Phase 7.6 consumes stop predicates only for Layer 1 declaration checks at plan-commit, while `branching-story-page-prose-finalize` Phase 4 consumes them for rendered-prose Layer 2/3 stop-condition evidence and semantic conformance.

## Verification Result

1. `rg -n 'Phase 7\.6|branching-story-page-prose-finalize|Layer 2/3|Layer 3' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returned the corrected lifecycle references at lines 3, 9, 136, 232, and 245.
2. `rg -n 'Phase 7\.6 (stop-condition evaluator|Layer 3|routes the page-cycle)' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returned no matches.
3. Manually cross-read the corrected predicate-dsl references against `branching-story-page-cycle/SKILL.md`, `branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`, `branching-story-page-prose-finalize/SKILL.md`, and `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md`.

## Deviations

- Reassessment widened the edit from the originally named application-sites bullet to all same-file stale Phase 7.6 lifecycle references in `predicate-dsl.md`. No additional files required edits.
