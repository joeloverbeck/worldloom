# STEMOAGENCY-002: Restamp red-bunny constraining STEMOs with downstream grounding

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — story-bundle content repair through the MCP surgical-maintenance workflow introduced by `archive/tickets/MCPENH-068.md`.
**Deps**: `archive/tickets/STEMOAGENCY-001.md`, `archive/tickets/MCPENH-068.md`

## Problem

At intake, `STEMOAGENCY-001` had replaced the old `SE.non_propagation_facts[]` / `SE.state_relations[]` escape hatch in `stemo_agency_effect_compatibility` with downstream-grounding evidence. The post-change live-corpus check:

```bash
node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'
```

returned `2`. The failing live story records were red-bunny `STEMO-3` and `STEMO-4`; both needed an engine-routed story-bundle repair that either grounded the constraining affect in an emitted `CHC`, holder-matched `STPLAN`, or holder-participating `SREL`, or revised the `agency_effect` claim if the constraint was not actually downstream-visible.

## Assumption Reassessment (2026-05-25)

1. `STEMOAGENCY-001` deliberately keeps story `_source` content out of scope; story-bundle `_source` writes are engine-only under `AGENTS.md` and `docs/HARD-GATE-DISCIPLINE.md`.
2. The intake validator failure was real live-corpus fallout from the new package behavior, not a package test failure: the validators package suite passed, while `world-validate erotica-world` reported two `stemo_agency_effect_compatibility.unexplained_constraining_effect` findings.
3. The repair owner is story-bundle maintenance for `worlds/erotica-world/stories/red-bunny`, not a direct source edit from this ticket.
4. The earlier phrase "approved story workflow" was ambiguous. The completed `archive/tickets/MCPENH-068.md` work adds a dedicated MCP planning surface for surgical story-state maintenance, so this repair no longer needs to route through a full `.claude/skills/branching-story-turn-cycle` repair turn unless the fictional state genuinely requires a new causal tick.
5. Live reassessment selected the minimum lawful downstream-grounding surface: create one holder-participating `relationship_record_story` (`SREL-4`) with `derived_from: [STEMO-3, STEMO-4, ...]`. This satisfies `stemo_agency_effect_compatibility` without inventing a new `PG`, `SE`, `CHC`, or `STPLAN`, and without weakening validator semantics.
6. `mcp__worldloom__submit_patch_plan` is not exposed in this Codex toolset, so the documented CLI fallback path from `docs/HARD-GATE-DISCIPLINE.md` / `references/patch-engine-codex-fallback.md` was used: generate a `plan_story_state_maintenance` patch plan, validate it, obtain explicit user approval, sign the exact plan, and submit through `submit-patch-plan`.

## Architecture Check

1. Engine-routed repair preserves the story-bundle append-only `_source` boundary and HARD-GATE approval discipline.
2. No backwards-compatibility shim or validator weakening is introduced.
3. The repair uses the completed `archive/tickets/MCPENH-068.md` maintenance surface rather than laundering a surgical data repair through a narrative turn.

## Verification Layers

1. Red-bunny STEMO cleanup complete -> full-world validator check reports zero `stemo_agency_effect_compatibility.unexplained_constraining_effect` findings for `erotica-world`.
2. Engine discipline preserved -> repair is performed through the `archive/tickets/MCPENH-068.md` surgical maintenance path, not direct `_source` edits.

## Landed Changes

### 1. Restamp the affected story-bundle state

Used the completed `archive/tickets/MCPENH-068.md` MCP / patch-engine maintenance path to repair red-bunny `STEMO-3` and `STEMO-4`.

The repair created `SREL-4` as append-only story-state maintenance:

- `axis: fear`
- `participants: [STENT-1, STENT-2]`
- `direction: { kind: directed, from: STENT-1, to: STENT-2 }`
- `derived_from: [STEMO-3, STEMO-4, BEL-4, BEL-5, BEL-6, CNSQ-1, SREL-2, SREL-3]`

No new fictional turn was created. No existing story `_source` record was overwritten.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/relationships/SREL-4.yaml` (created by patch-engine submit)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact synced by patch-engine submit)
- `archive/tickets/STEMOAGENCY-002.md` (closeout / archive move)

## Out of Scope

- Changing `stemo_agency_effect_compatibility` semantics.
- Direct-editing story-bundle `_source` YAML outside the patch engine.
- Cleaning unrelated red-bunny page-plan validator failures reported by `page_plan_stchar_packet_integrity` or active-pressure validators.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'` prints `0`.
2. `if node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep 'stemo_agency_effect_compatibility.unexplained_constraining_effect'; then exit 1; fi` exits `0`.

### Invariants

1. Story-bundle `_source` mutations are engine-routed and HARD-GATE approved.
2. Each remaining `agency_effect: constraining` STEMO is grounded by compatible external agency or downstream CHC/STPLAN/SREL evidence.
3. The repair does not create a new story turn unless the chosen maintenance plan proves the fictional state actually requires one.

## Test Plan

### New/Modified Tests

1. None — live story-bundle repair; verification is validator-command based.

### Commands

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'`
2. `if node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep 'stemo_agency_effect_compatibility.unexplained_constraining_effect'; then exit 1; fi`

## Outcome

Implemented. The engine-routed maintenance plan created `worlds/erotica-world/stories/red-bunny/_source/relationships/SREL-4.yaml` as downstream SREL grounding for both red-bunny `STEMO-3` and `STEMO-4`.

The patch plan was validated before approval, explicitly approved by the user, signed with `sign-approval-token`, and submitted through `submit-patch-plan`. The patch-engine receipt wrote `SREL-4`, consumed `srel_ids: [SREL-4]`, and synced the world index.

## Verification Result

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'` — intake baseline printed `2`.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/STEMOAGENCY-002-plan.json` — passed with `status: "pass"` and no verdicts.
3. User approval: `approved` — received before signing/submitting the plan.
4. `node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/STEMOAGENCY-002-plan.json` — signed the exact validated plan.
5. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/STEMOAGENCY-002-plan.json /tmp/STEMOAGENCY-002-token.txt` — passed. Receipt wrote `/home/joeloverbeck/projects/worldloom/worlds/erotica-world/stories/red-bunny/_source/relationships/SREL-4.yaml`, consumed `srel_ids: [SREL-4]`, and synced the index in 689 ms.
6. Direct record inspection of `worlds/erotica-world/stories/red-bunny/_source/relationships/SREL-4.yaml` — confirmed `derived_from` includes `STEMO-3` and `STEMO-4`.
7. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep -c 'stemo_agency_effect_compatibility.unexplained_constraining_effect'` — printed `0` after submit. The pipeline exit is nonzero because `grep -c` returns no-match status when the count is zero.
8. `if node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep 'stemo_agency_effect_compatibility.unexplained_constraining_effect'; then exit 1; fi` — passed with no output, proving zero remaining STEMO agency-effect findings.

## Deviations

1. The repair used a single downstream `SREL` rather than superseding `STEMO-3` / `STEMO-4`. This is still inside the ticket's accepted CHC/STPLAN/SREL grounding boundary and avoids unnecessary story-state churn.
2. The direct MCP submit tool was unavailable in this Codex session, so the documented CLI fallback path was used. The path preserved validate, explicit approval, token signing, patch-engine submit, and index sync.
3. `world-validate erotica-world` still reports 18 unrelated failures after this repair, all in the previously excluded page-plan / active-pressure surfaces. The `stemo_agency_effect_compatibility.unexplained_constraining_effect` count is now zero.
4. Post-ticket review created `tickets/PPLAN-008-red-bunny-pg2-page-plan-validator-cleanup.md` to own the unrelated red-bunny PG-2 page-plan / active-pressure validator cleanup.
