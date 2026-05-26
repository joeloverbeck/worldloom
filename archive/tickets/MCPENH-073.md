# MCPENH-073: Correct commitment-block-authoring SLT inventory projection fields after dotted list_records support

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md` (projection-field prose correction only; no package behavior change).
**Deps**: `archive/tickets/MCPENH-072.md` (dotted-path `list_records.fields` projection is the enabling package behavior).

## Problem

`archive/tickets/MCPENH-072.md` completed dotted-path projection for `mcp__worldloom__list_records` on parsed atomic/story-bundle records. At intake, the downstream `commitment-block-authoring` skill still asked for `fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']` in its direct-batch SLT pool inventory, but only `move_family` is a top-level SLT body field. After MCPENH-072, `compatible_turn_drivers` needed to be requested as `grounding.compatible_turn_drivers`; `predicate_classes` and `action_families` were still derived concepts, not parsed body fields, and needed to remain parent-object/full-body follow-up reads unless a later derived-projection ticket implements them.

Before this correction, the skill's pre-flight guidance still named invalid projection fields and could drive operators back into `invalid_input` errors or over-fetching fallbacks despite the package-side fix.

## Assumption Reassessment (2026-05-26)

1. **Skill prose checked against live file**. At intake, `.claude/skills/commitment-block-authoring/SKILL.md` had the stale projection list in the HARD-GATE pre-flight paragraph, World-State Prerequisites, Pre-flight Check, and Phase 1 SLT-pool load, plus follow-on gap-diagnosis prose that named `compatible_turn_drivers`, `predicate_classes`, and `action_families` as projected fields. This ticket corrected those current operational surfaces.
2. **Package contract checked against completed dependency**. `archive/tickets/MCPENH-072.md` records that `list_records.fields` now accepts top-level parsed-record keys or dotted parsed-body paths, preserves requested dotted keys as response keys, and leaves derived projection and array-element projection out of scope.
3. **Shared-boundary identification**. The shared boundary is the `list_records.fields` projection contract in `tools/world-mcp/src/tools/list-records.ts` and its consumer guidance in `.claude/skills/commitment-block-authoring/SKILL.md`. This ticket owns only the skill prose consumer side; the package behavior is already completed by MCPENH-072.
4. **Adjacent contradiction classification**. `grounding.compatible_turn_drivers` was same-seam fallout from MCPENH-072 and was corrected directly in the skill. `predicate_classes` and `action_families` are separate derived/array projection concerns explicitly out of scope for MCPENH-072, so this ticket did not invent package behavior; it instructed the skill to load parent fields such as `preconditions` / `exit_options` or full bodies when those derived coverage checks are needed.
5. **HARD-GATE reassessment**. The corrected call appears inside the skill's existing `<HARD-GATE>` block, so `docs/HARD-GATE-DISCIPLINE.md` was read. The landed edit preserves gate order, approval timing, deliverable-summary approval, patch submission, approval-token behavior, and validation semantics; it only changes the read-only pre-flight inventory fields.

## Architecture Check

1. Correcting the consumer prose is cleaner than adding aliases or derived projection shims: it keeps the machine-facing API truthful and makes the skill request fields that actually exist.
2. No backwards-compatibility aliases or shims are introduced; the skill should use the canonical dotted path for the one nested field MCPENH-072 made addressable.

## Verification Layers

1. **Stale projection list removed** -> grep-proof: no current operational line in `.claude/skills/commitment-block-authoring/SKILL.md` contains `fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']`.
2. **Dotted driver field adopted** -> grep-proof/manual review: the direct-batch SLT inventory call uses `grounding.compatible_turn_drivers` and explains that the projected response key is dotted.
3. **Derived fields remain honest** -> manual review: `predicate_classes` and `action_families` are described as computed from parent/full-body data, not as direct projection fields.

## Landed Changes

### 1. `.claude/skills/commitment-block-authoring/SKILL.md`

Updated the direct-batch pool-wide SLT inventory examples and surrounding prose:

- Replaced invalid `compatible_turn_drivers` projection entries with `grounding.compatible_turn_drivers`.
- Removed `predicate_classes` and `action_families` from direct `fields=[...]` lists.
- Projected parent objects `preconditions` and `exit_options` for the source data needed to compute predicate-class and action-family coverage.
- Clarified how Phase 1 computes driver-kind, active-record-class, and exit-option coverage from returned projection, parent-object, or mutation-triggered full-body data.
- Preserved the existing distinction between pool-wide `list_records` inventory and per-page `select_storylet_candidates` eligibility.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `archive/tickets/MCPENH-073.md` (modify — closeout truthing)

## Out of Scope

- Package behavior changes in `tools/world-mcp`.
- Derived projection support for `predicate_classes`.
- Array-element or wildcard projection for `exit_options[*].action_family`.
- Running a full commitment-block authoring workflow; this is a skill-prose contract correction.

## Acceptance Criteria

### Tests That Must Pass

1. `if rg -n -F "fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']" .claude/skills/commitment-block-authoring/SKILL.md; then exit 1; fi`
2. `rg -n -F "grounding.compatible_turn_drivers" .claude/skills/commitment-block-authoring/SKILL.md`
3. Manual review confirms `predicate_classes` and `action_families` are no longer described as direct `list_records.fields` projection keys.

### Invariants

1. The skill must not recommend `list_records.fields` keys that the MCP tool rejects.
2. The skill must not imply derived projection support that MCPENH-072 explicitly left out of scope.
3. The pool-wide inventory vs per-page eligibility distinction remains intact.

## Test Plan

### New/Modified Tests

1. None — skill-prose contract correction; verification is grep/manual-review based because there is no executable skill runner in this repo.

### Commands

1. `if rg -n -F "fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']" .claude/skills/commitment-block-authoring/SKILL.md; then exit 1; fi`
2. `rg -n -F "grounding.compatible_turn_drivers" .claude/skills/commitment-block-authoring/SKILL.md`
3. `git diff --check -- .claude/skills/commitment-block-authoring/SKILL.md archive/tickets/MCPENH-073.md`

## Outcome

Completion date: 2026-05-26.

Completed the skill-prose correction for the direct-batch SLT pool inventory.

- The pool-wide `list_records` calls now request `fields=['move_family', 'grounding.compatible_turn_drivers', 'preconditions', 'exit_options']`.
- The skill now states that `grounding.compatible_turn_drivers` is returned under the dotted response key.
- Predicate-class and action-family coverage are now derived from `preconditions` and `exit_options` parent objects, or from full bodies only when mutation planning already requires them.
- The pool-wide inventory vs per-page `select_storylet_candidates` eligibility distinction remains intact.

## Verification Result

Passed:

1. `if rg -n -F "fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']" .claude/skills/commitment-block-authoring/SKILL.md; then exit 1; fi` — no stale direct projection list remains in the operational skill.
2. `rg -n -F "grounding.compatible_turn_drivers" .claude/skills/commitment-block-authoring/SKILL.md` — confirmed the skill uses and explains the dotted projection key in the HARD-GATE, prerequisite, pre-flight, Phase 1, and block-authoring surfaces.
3. Manual review of `.claude/skills/commitment-block-authoring/SKILL.md` — `predicate_classes` and `action_families` are no longer direct `list_records.fields` projection keys; predicate classes are computed from `preconditions.hard[]` / `preconditions.soft[]`, and action families are computed from `exit_options[]`.
4. `git diff --check -- .claude/skills/commitment-block-authoring/SKILL.md archive/tickets/MCPENH-073.md` — passed.

## Deviations

- The edit touched an existing `<HARD-GATE>` block, so the HARD-GATE discipline reference was read even though the landed change does not alter write approval, gate firing, validation semantics, patch submission, or approval-token behavior.
- No package tests were run because this ticket only corrects a skill consumer contract after MCPENH-072 already completed and verified the package-side dotted projection behavior.
