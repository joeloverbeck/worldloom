# MCPENH-073: Correct commitment-block-authoring SLT inventory projection fields after dotted list_records support

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md` (projection-field prose correction only).
**Deps**: `archive/tickets/MCPENH-072.md` (dotted-path `list_records.fields` projection is the enabling package behavior).

## Problem

`archive/tickets/MCPENH-072.md` completed dotted-path projection for `mcp__worldloom__list_records` on parsed atomic/story-bundle records. The downstream `commitment-block-authoring` skill still asks for `fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']` in its direct-batch SLT pool inventory, but only `move_family` is a top-level SLT body field. After MCPENH-072, `compatible_turn_drivers` should be requested as `grounding.compatible_turn_drivers`; `predicate_classes` and `action_families` are still derived concepts, not parsed body fields, and must remain parent-object/full-body follow-up reads unless a later derived-projection ticket implements them.

Without this correction, the skill's pre-flight guidance still names invalid projection fields and can drive operators back into `invalid_input` errors or over-fetching fallbacks despite the package-side fix.

## Assumption Reassessment (2026-05-26)

1. **Skill prose checked against live file**. `.claude/skills/commitment-block-authoring/SKILL.md` has the stale projection list at lines 36, 112, 128, and 175, and follow-on gap-diagnosis prose at lines 177 and 208 that names `compatible_turn_drivers`, `predicate_classes`, and `action_families` as projected fields.
2. **Package contract checked against completed dependency**. `archive/tickets/MCPENH-072.md` records that `list_records.fields` now accepts top-level parsed-record keys or dotted parsed-body paths, preserves requested dotted keys as response keys, and leaves derived projection and array-element projection out of scope.
3. **Shared-boundary identification**. The shared boundary is the `list_records.fields` projection contract in `tools/world-mcp/src/tools/list-records.ts` and its consumer guidance in `.claude/skills/commitment-block-authoring/SKILL.md`. This ticket owns only the skill prose consumer side; the package behavior is already completed by MCPENH-072.
4. **Adjacent contradiction classification**. `grounding.compatible_turn_drivers` is same-seam fallout from MCPENH-072 and should be corrected directly in the skill. `predicate_classes` and `action_families` are separate derived/array projection concerns explicitly out of scope for MCPENH-072, so this ticket should not invent package behavior; it should instruct the skill to load parent fields such as `preconditions` / `exit_options` or full bodies when those derived coverage checks are needed.

## Architecture Check

1. Correcting the consumer prose is cleaner than adding aliases or derived projection shims: it keeps the machine-facing API truthful and makes the skill request fields that actually exist.
2. No backwards-compatibility aliases or shims are introduced; the skill should use the canonical dotted path for the one nested field MCPENH-072 made addressable.

## Verification Layers

1. **Stale projection list removed** -> grep-proof: no current operational line in `.claude/skills/commitment-block-authoring/SKILL.md` should contain `fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']`.
2. **Dotted driver field adopted** -> grep-proof/manual review: the direct-batch SLT inventory call uses `grounding.compatible_turn_drivers` and explains that the projected response key is dotted.
3. **Derived fields remain honest** -> manual review: `predicate_classes` and `action_families` are described as computed from parent/full-body data, not as direct projection fields.

## What to Change

### 1. `.claude/skills/commitment-block-authoring/SKILL.md`

Update the direct-batch pool-wide SLT inventory examples and surrounding prose:

- Replace invalid `compatible_turn_drivers` projection entries with `grounding.compatible_turn_drivers`.
- Remove `predicate_classes` and `action_families` from direct `fields=[...]` lists unless the skill is explicitly projecting parent objects that carry the needed source data.
- Clarify how Phase 1 computes driver-kind, active-record-class, and exit-option coverage from the returned projection/full-body data.
- Preserve the existing distinction between pool-wide `list_records` inventory and per-page `select_storylet_candidates` eligibility.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Package behavior changes in `tools/world-mcp`.
- Derived projection support for `predicate_classes`.
- Array-element or wildcard projection for `exit_options[*].action_family`.
- Running a full commitment-block authoring workflow; this is a skill-prose contract correction.

## Acceptance Criteria

### Tests That Must Pass

1. `! rg -n -F "fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']" .claude/skills/commitment-block-authoring/SKILL.md`
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

1. `! rg -n -F "fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families']" .claude/skills/commitment-block-authoring/SKILL.md`
2. `rg -n -F "grounding.compatible_turn_drivers" .claude/skills/commitment-block-authoring/SKILL.md`
3. `git diff --check -- .claude/skills/commitment-block-authoring/SKILL.md tickets/MCPENH-073.md`
