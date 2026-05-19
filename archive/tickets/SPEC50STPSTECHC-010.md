# SPEC50STPSTECHC-010: Accept-route consequence-visibility check in prose-attach

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-prose-attach` skill + shared contract §4.6 (`choice_consequence_visibility` check).
**Deps**: None

## Problem

At intake, `SE.outcome_route = accept` forbade `SE.resolution`, so `resolution.player_visible_feedback` was unavailable for accepted choices. The `choice_consequence_visibility` check in `.claude/skills/branching-story-prose-attach/SKILL.md` already had an accept-route clause but leaned on the selected event remaining legible under `required_event_rendered`; it did not systematically compare the committed `SE.state_delta`/`SE.state_relations` and selected `CHC.likely_state_pressure` against the prose for accepted choices. An accepted choice whose state delta was invisible in the prose could pass under-detected.

## Assumption Reassessment (2026-05-20)

1. Codebase: at intake, the `choice_consequence_visibility` check in `.claude/skills/branching-story-prose-attach/SKILL.md` was one of the 8 deterministic checks listed in the HARD-GATE summary and Phase 3. Its accept-route clause was `required_event_rendered`-anchored and the shared §4.6 prose still said the check realized `SE.resolution.player_visible_feedback`, which is absent for `outcome_route: accept`.
2. Specs/contract: SPEC-50 §D.3 is the live deliverable for this ticket; the 8-check receipt contract lives in `.claude/skills/_shared-templates/story-record-schemas.md` §4.6. The original ticket label `D.5` was stale against the final SPEC-50 numbering and is corrected here.
3. Cross-artifact boundary: the prose-attach skill's check and the §4.6 contract description of `choice_consequence_visibility` must agree; the check reads `SE.state_delta`/`SE.state_relations`, selected `CHC.likely_state_pressure`, `CHC.grounded_in`, and page-plan §13.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): the check consumes the committed page state + the prose receipt without mutating the `PG` record or introducing a second state-transition pass; story state stays authoritative at page-plan commit. The check asserts the consequence is not invisible, not that it is fully narrated (no exposition-dump pressure).
5. HARD-GATE discipline: `.claude/skills/branching-story-prose-attach/SKILL.md` is a HARD-GATE workflow. The landed edit changes the deterministic check's read surface only; it does not change the approval checkpoint, write order, receipt schema fields, or any canon/world-content mutation path.
6. Verification boundary: no executable `branching-story-prose-attach` dry-run runner or fixture harness is available in the repo/tool surface for this prose workflow. The accepted proof is manual contract review plus focused grep proof over the skill and shared §4.6 contract; the drafted dry-run acceptance is replaced by that truthful surface.

## Architecture Check

1. Extending the existing `choice_consequence_visibility` check (rather than adding a new check) keeps the 8-check contract stable and localizes the accept-route hardening to the one check that owns consequence visibility.
2. No shim — the accept-route branch is strengthened in place.

## Verification Layers

1. Accepted-choice prose receipt missing any trace of the committed `SE.state_delta` -> the check flags it (WARN/FAIL per the existing ladder).
2. Accepted-choice receipt reflecting the delta -> PASS, without consulting `SE.resolution`.
3. §4a boundary preserved (no PG mutation) -> manual review of the check's read-only inputs.

## What to Change

### 1. Strengthened the accept-route branch (D.3)

For `accept` routes, the prose-attach check now compares selected `CHC.likely_state_pressure`, `CHC.grounded_in.records[]`, page-plan §13, and the resulting `SE.state_delta`/`SE.state_relations[]` against the prose receipt without consulting `SE.resolution`. Presence is deterministic; sufficiency remains a judgment note. The shared contract §4.6 mirrors the same read surface.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.6 check description)

## Out of Scope

- The STQ payoff/answer subcheck (SPEC50STPSTECHC-012).
- Adding a new prose-attach check (this strengthens the existing `choice_consequence_visibility`).
- Forcing exposition dumps — the check asserts non-invisibility only.

## Acceptance Criteria

### Tests That Must Pass

1. Grep proof confirms `choice_consequence_visibility` in the prose-attach skill names the accept-route read surface: `CHC.likely_state_pressure`, `CHC.grounded_in.records[]`, page-plan §13, `SE.state_delta`, and `SE.state_relations[]`.
2. Grep proof confirms the shared §4.6 contract mirrors the same accept-route read surface and scopes `SE.resolution.player_visible_feedback` to non-accept routes.
3. Manual contract review confirms the check remains read-only against committed state + receipt and does not mutate `PG`.

### Invariants

1. Accept-route consequence visibility is verified against committed state + receipt, never `SE.resolution`.
2. The check never mutates the `PG` record (§4a).

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract change; verification is manual contract review plus grep-proof of prose-attach and §4.6 wording, per Assumption Reassessment.`

### Commands

1. `rg -n 'choice_consequence_visibility|CHC\\.likely_state_pressure|CHC\\.grounded_in\\.records\\[\\]|page-plan §13|SE\\.state_delta|SE\\.state_relations|SE\\.resolution\\.player_visible_feedback' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-record-schemas.md archive/tickets/SPEC50STPSTECHC-010.md` — confirm the accept-route and non-accept read surfaces are recorded in the skill, shared contract, and ticket.
2. `rg -n 'dry-run on an accept-route (page|fixture)|produces the expected verdic[t]' archive/tickets/SPEC50STPSTECHC-010.md` — confirm the retired active dry-run acceptance phrases are gone.

## Outcome

Completed on 2026-05-20.

The prose-attach `choice_consequence_visibility` check now distinguishes non-accept routes, which still read `SE.resolution.player_visible_feedback`, from accept routes, which must read selected `CHC.likely_state_pressure`, `CHC.grounded_in.records[]`, page-plan §13, and committed `SE.state_delta` / `SE.state_relations[]`. The shared §4.6 prose-receipt contract mirrors the same distinction. No receipt schema fields, packet surfaces, or PG mutation behavior changed.

## Verification Result

- `rg -n 'choice_consequence_visibility|CHC\.likely_state_pressure|CHC\.grounded_in\.records\[\]|page-plan §13|SE\.state_delta|SE\.state_relations|SE\.resolution\.player_visible_feedback' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-record-schemas.md archive/tickets/SPEC50STPSTECHC-010.md` — PASS; the skill, shared §4.6 contract, and completed ticket name the accept-route state/choice read surface and the non-accept `SE.resolution.player_visible_feedback` surface.
- `rg -n 'dry-run on an accept-route (page|fixture)|produces the expected verdic[t]' archive/tickets/SPEC50STPSTECHC-010.md` — PASS; no retired active dry-run acceptance phrases remain.
- Manual review — PASS; the check remains read-only against committed page state, selected choice/event evidence, rendered prose, and receipt verdicts. It does not mutate `PG` or alter HARD-GATE approval/write ordering.

## Deviations

- The drafted `branching-story-prose-attach` dry-run was not run because no executable dry-run runner or fixture harness exists for this prose workflow in the live repo/tool surface. Verification used manual contract review plus focused grep proof instead.
- The ticket's original `SPEC-50 §D.5` reference was stale; the live spec deliverable is §D.3.
