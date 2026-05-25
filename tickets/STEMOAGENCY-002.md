# STEMOAGENCY-002: Restamp red-bunny constraining STEMOs with downstream grounding

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — story-bundle content repair through the MCP surgical-maintenance workflow introduced by `archive/tickets/MCPENH-068.md`.
**Deps**: `archive/tickets/STEMOAGENCY-001.md`, `archive/tickets/MCPENH-068.md`

## Problem

`STEMOAGENCY-001` replaced the old `SE.non_propagation_facts[]` / `SE.state_relations[]` escape hatch in `stemo_agency_effect_compatibility` with downstream-grounding evidence. The post-change live-corpus check:

```bash
node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'
```

returns `2`. The failing live story records are red-bunny `STEMO-3` and `STEMO-4`; both need an engine-routed story-bundle repair that either grounds the constraining affect in an emitted `CHC`, holder-matched `STPLAN`, or holder-participating `SREL`, or revises the `agency_effect` claim if the constraint is not actually downstream-visible.

## Assumption Reassessment (2026-05-25)

1. `STEMOAGENCY-001` deliberately keeps story `_source` content out of scope; story-bundle `_source` writes are engine-only under `AGENTS.md` and `docs/HARD-GATE-DISCIPLINE.md`.
2. The validator failure is real live-corpus fallout from the new package behavior, not a package test failure: the validators package suite passes, while `world-validate erotica-world` reports two `stemo_agency_effect_compatibility.unexplained_constraining_effect` findings.
3. The repair owner is story-bundle maintenance for `worlds/erotica-world/stories/red-bunny`, not a direct source edit from this ticket.
4. The earlier phrase "approved story workflow" was ambiguous. The completed `archive/tickets/MCPENH-068.md` work adds a dedicated MCP planning surface for surgical story-state maintenance, so this repair no longer needs to route through a full `.claude/skills/branching-story-turn-cycle` repair turn unless the fictional state genuinely requires a new causal tick.

## Architecture Check

1. Engine-routed repair preserves the story-bundle append-only `_source` boundary and HARD-GATE approval discipline.
2. No backwards-compatibility shim or validator weakening is introduced.
3. The repair uses the completed `archive/tickets/MCPENH-068.md` maintenance surface rather than laundering a surgical data repair through a narrative turn.

## Verification Layers

1. Red-bunny STEMO cleanup complete -> full-world validator check reports zero `stemo_agency_effect_compatibility.unexplained_constraining_effect` findings for `erotica-world`.
2. Engine discipline preserved -> repair is performed through the `archive/tickets/MCPENH-068.md` surgical maintenance path, not direct `_source` edits.

## What to Change

### 1. Restamp the affected story-bundle state

Use the completed `archive/tickets/MCPENH-068.md` MCP / patch-engine maintenance path to repair red-bunny `STEMO-3` and `STEMO-4` so each constraining affect has matching downstream grounding, or no longer claims `agency_effect: constraining`.

The full `.claude/skills/branching-story-turn-cycle` `repair_turn` mode remains a lawful fallback only if the repair is genuinely a new causal tick. This ticket is not allowed to invent a synthetic turn merely to satisfy the validator.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/**` (engine-routed modify/create as determined by the repair plan)
- `worlds/erotica-world/stories/red-bunny/INDEX.md` (modify only if the maintenance workflow requires an index update)

## Out of Scope

- Changing `stemo_agency_effect_compatibility` semantics.
- Direct-editing story-bundle `_source` YAML outside the patch engine.
- Cleaning unrelated red-bunny page-plan validator failures reported by `page_plan_stchar_packet_integrity` or active-pressure validators.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'` returns `0`.

### Invariants

1. Story-bundle `_source` mutations are engine-routed and HARD-GATE approved.
2. Each remaining `agency_effect: constraining` STEMO is grounded by compatible external agency or downstream CHC/STPLAN/SREL evidence.
3. The repair does not create a new story turn unless the chosen maintenance plan proves the fictional state actually requires one.

## Test Plan

### New/Modified Tests

1. None — live story-bundle repair; verification is validator-command based.

### Commands

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'`
