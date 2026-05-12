# STPOOL-011: Update predicate-DSL reference to post-prose-strip Phase 7.6 role

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — template doc edit only.
**Deps**: None

## Problem

`.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md:132-138` enumerates the three sites where stop predicates apply, the third bullet being *"the runtime page-cycle's SPEC-20 Phase 7.6 stop-condition evaluator"*.

After the prose-strip rework (`PROSESPLIT-*` tickets), `branching-story-page-cycle` Phase 7.6 runs **Layer 1 only** at plan-commit (deterministic structural validation over the plan's frontmatter and inlined selected-arc record). Layer 2 (post-render trace extraction) and Layer 3 (semantic conformance critic) move to `branching-story-page-prose-finalize` Phase 4. Per `branching-story-page-cycle/SKILL.md:165-173`: *"ARC_TRACE Layer 1 only (Layer 2/3 deferred to finalize) — deterministic structural validation over the plan's frontmatter and inlined selected-arc record."*

The predicate-dsl.md reference still names Phase 7.6 as if it owns runtime stop-condition evaluation, which is technically correct only for Layer 1 (the stop-condition declaration check) — the actual semantic evaluation of whether a stop condition fires against rendered prose moves to finalize's Phase 4 (per `branching-story-page-prose-finalize/...` Phase 4 contracts).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-10. Same drift pattern that the user's rework concern (post-prose-strip references not updated everywhere) anticipated.

## Assumption Reassessment (2026-05-12)

1. Verified `templates/predicate-dsl.md:132-138` lists three stop-predicate-application sites, the third being "the runtime page-cycle's SPEC-20 Phase 7.6 stop-condition evaluator".
2. Verified `branching-story-page-cycle/SKILL.md:165-173` (Phase 7.6 description) confirms Phase 7.6 runs Layer 1 only post-rework; Layer 2/3 deferred to finalize.
3. The line at predicate-dsl.md:132 is informational (where the predicates are consumed downstream), not gate-enforced — but a reader using this document to understand the predicates' lifecycle will form an incorrect mental model of where evaluation happens.
4. The narrower question — what does Phase 7.6 actually evaluate at plan-commit time — is per-skill specific to page-cycle. The predicate-dsl doc's job is to document the predicate grammar; describing the lifecycle of evaluation is secondary.

## Architecture Check

1. Update the reference to reflect the post-rework split: Phase 7.6 does Layer 1 (stop-condition declaration check); `branching-story-page-prose-finalize` Phase 4 does Layer 2/3 (semantic conformance critic against rendered prose).
2. No structural changes to the predicate-dsl grammar itself.

## Verification Layers

1. **Reference accuracy** — the predicate-dsl.md description of where stop predicates are consumed matches the post-prose-strip phase split documented in `branching-story-page-cycle/SKILL.md` and `branching-story-page-prose-finalize/SKILL.md`.

## What to Change

### 1. Update the stop-predicate application sites enumeration

In `templates/predicate-dsl.md:132-138`, replace:

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

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Editing `branching-story-page-cycle`'s or `branching-story-page-prose-finalize`'s SKILL.md (they already document the post-rework phase split correctly).
- Audit-mode predicate-DSL extensions or grammar changes.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Phase 7.6|page-prose-finalize Phase 4" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returns matches that reflect the post-rework Layer 1 / Layer 2-3 split.

### Invariants

1. The predicate-dsl doc's lifecycle description matches the actual phase responsibilities documented in `branching-story-page-cycle/SKILL.md:165-173` and `branching-story-page-prose-finalize/SKILL.md`.

## Test Plan

### New/Modified Tests

1. None — reference doc edit.

### Commands

1. The grep from Acceptance Criteria.
2. Cross-read the corrected predicate-dsl reference against `branching-story-page-cycle/SKILL.md:165-173` and the finalize SKILL.md Phase 4 contract to confirm alignment.
