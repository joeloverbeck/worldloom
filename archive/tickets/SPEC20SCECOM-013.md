# SPEC20SCECOM-013: Phase 1 Path A — CHC v2 Commitment-Class Handoff

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` Path A standard-choice prose updated to consume CHC v2 fields, including `commitment_class`, instead of stale v1 `choice_mode` / `poetic_effect` framing.
**Deps**: `archive/tickets/SPEC20SCECOM-006.md` (Path B write-in classifier now supplies the write-in side of the Phase 4 commitment-class handoff); `archive/tickets/SPEC20SCECOM-005.md` and `archive/tickets/SPEC20SCECOM-012.md` (Phase 8 emits and label-renders CHC v2 records)

## Problem

At intake, post-ticket review of `archive/tickets/SPEC20SCECOM-006.md` confirmed that Phase 1 Path B classified write-ins into the closed `commitment_class` enum, but the same Phase 1 reference still described Path A as populating `ProposedEvent` from v1 CHC fields: `choice_mode` and `poetic_effect`. The live CHC v2 schema in `record-schemas.md` makes `commitment_class` required for `choice_kind: scene_commitment`, and Phase 4's hard filter consumes the selected CHC's `commitment_class`. This ticket aligned Path A with the same Phase 4 handoff.

## Assumption Reassessment (2026-05-07)

1. At intake, verified `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` Path A said `ProposedEvent` was populated from `operation`, `actor`, `target`, `instrument`, `uses_fact`, `likely_effects`, `choice_mode`, `poetic_effect`, and `choice_contract`, with no `commitment_class` handoff. Landed state now names CHC v2 fields and carries the selected CHC's `commitment_class` to Phase 4.
2. Verified `.claude/skills/branching-story-page-cycle/references/record-schemas.md` documents CHC v2 fields including `record_version`, `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`, `choice_contract`, mandatory non-empty `likely_effects`, and `continuation_capacity`.
3. Cross-artifact boundary: Phase 1 Path A consumes CHC v2 records emitted by Phase 8 and produces the standard-choice commitment-class handoff consumed by Phase 4 hard filters. The shared contract is `chosen CHC.commitment_class -> ProposedEvent / arc-selection filter`.
4. Adjacent contradiction classification: this is a separate follow-up, not unfinished SPEC20SCECOM-006 work. SPEC20SCECOM-006 intentionally owned Path B write-in classification; this ticket owns the standard-choice Path A prose that still names stale v1 CHC fields.

## Architecture Check

1. Updating Path A to name the CHC v2 structural fields is cleaner than preserving v1 aliases because the scene-commitment-arc pivot is forward-only and Phase 4 already consumes `commitment_class`.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Path A standard-choice prose names `commitment_class` and CHC v2 fields -> codebase grep-proof in `phase-1-choice-resolution.md`.
2. Stale v1 Path A fields removed or historicalized from the Path A field list -> negative/targeted grep-proof for `choice_mode` and `poetic_effect` in the Path A paragraph.
3. Phase 4 consumer contract remains aligned -> manual review against `phase-4-storylet-and-mystery-authority.md` §Hard Filters and `record-schemas.md` CHC v2 section.

## Landed Changes

### 1. Path A standard-choice field list

In `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`, Path A now describes selected CHCs as CHC v2 records whose structural fields include `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness`, `choice_contract`, `likely_effects`, and `continuation_capacity`, plus deterministic operation/actor/target payload fields carried by `choice_contract`.

### 2. Phase 4 handoff sentence

Added a handoff sentence stating that the selected CHC's `commitment_class` is carried forward for Phase 4's `arc.arc_contract.commitment_class` hard filter.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` (modify)

## Out of Scope

- Path B write-in classifier (completed by `archive/tickets/SPEC20SCECOM-006.md`).
- Phase 8 label-prompt field cleanup (landed in `archive/tickets/SPEC20SCECOM-012.md`).
- Parent `branching-story-page-cycle/SKILL.md` process-flow integration (owned by `tickets/SPEC20SCECOM-009.md`).
- Runtime validators and capstone fixture proof (SPEC-22 and `tickets/SPEC20SCECOM-011.md`).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: Path A in `phase-1-choice-resolution.md` names `commitment_class` as a selected-CHC field.
2. Documentation proof: Path A no longer presents `choice_mode` / `poetic_effect` as the standard CHC field handoff.
3. Manual review confirms the Path A handoff aligns with Phase 4 hard filter 6 and the CHC v2 schema.

### Invariants

1. Both standard choices and write-ins provide a commitment-class value to Phase 4 before arc selection.
2. No v1 alias path is preserved for `choice_mode` / `poetic_effect` in the Path A standard-choice contract.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual contract review.

### Commands

1. `grep -n "commitment_class" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` — confirms Path A / Phase 1 references the selected CHC commitment class.
2. `! sed -n '5,16p' .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md | grep -E "choice_mode|poetic_effect"` — confirms the Path A field list no longer presents stale v1 fields.
3. Manual review against `.claude/skills/branching-story-page-cycle/references/record-schemas.md` CHC v2 section and `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` §Hard Filters.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` Path A now consumes CHC v2 field vocabulary and explicitly carries the selected CHC's `commitment_class` to Phase 4 arc selection.

The landed prose removes `choice_mode` / `poetic_effect` from the Path A standard-choice handoff and keeps parent `branching-story-page-cycle/SKILL.md` process-flow integration in `tickets/SPEC20SCECOM-009.md`.

## Verification Result

1. PASS — `grep -n "commitment_class" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
2. PASS — `! sed -n '5,16p' .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md | grep -E "choice_mode|poetic_effect"`.
3. PASS — `grep -n "arc.arc_contract.commitment_class" .claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md`.
4. PASS — `grep -nE "record_version|choice_kind|commitment_class|strategy_cluster|choice_worthiness|choice_contract|likely_effects|continuation_capacity" .claude/skills/branching-story-page-cycle/references/record-schemas.md`.
5. PASS — manual review against `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §A / §F / §G, `record-schemas.md` CHC v2 section, and `phase-4-storylet-and-mystery-authority.md` §Hard Filters confirmed Path A now matches the selected-CHC commitment-class consumer contract.

## Deviations

1. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` still carries v1 process-flow and Phase 8 summary wording; this remains outside this ticket and is owned by `tickets/SPEC20SCECOM-009.md`.
