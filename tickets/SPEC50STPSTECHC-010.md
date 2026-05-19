# SPEC50STPSTECHC-010: Accept-route consequence-visibility check in prose-attach

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-prose-attach` skill + shared contract §4.6 (`choice_consequence_visibility` check).
**Deps**: None

## Problem

`SE.outcome_route = accept` forbids `SE.resolution`, so `resolution.player_visible_feedback` is unavailable for accepted choices. The `choice_consequence_visibility` check (`.claude/skills/branching-story-prose-attach/SKILL.md:217`) already has an accept-route clause but leans on the selected event remaining legible under `required_event_rendered`; it does not systematically compare the committed `SE.state_delta`/`SE.state_relations` and selected `CHC.likely_state_pressure` against the prose for accepted choices. An accepted choice whose state delta is invisible in the prose can pass under-detected.

## Assumption Reassessment (2026-05-19)

1. Codebase: the `choice_consequence_visibility` check is at `branching-story-prose-attach/SKILL.md:217`; it is one of the 8 deterministic checks listed at `SKILL.md:38`. The accept-route clause exists but is `required_event_rendered`-anchored. Verified this session.
2. Specs/contract: SPEC-50 §D.5; the 8-check contract lives in `.claude/skills/_shared-templates/story-record-schemas.md` §4.6.
3. Cross-artifact boundary: the prose-attach skill's check and the §4.6 contract description of `choice_consequence_visibility` must agree; the check reads `SE.state_delta`/`SE.state_relations`, selected `CHC.likely_state_pressure`, `CHC.grounded_in`, and page-plan §13.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): the check consumes the committed page state + the prose receipt without mutating the `PG` record or introducing a second state-transition pass; story state stays authoritative at page-plan commit. The check asserts the consequence is not invisible, not that it is fully narrated (no exposition-dump pressure).

## Architecture Check

1. Extending the existing `choice_consequence_visibility` check (rather than adding a new check) keeps the 8-check contract stable and localizes the accept-route hardening to the one check that owns consequence visibility.
2. No shim — the accept-route branch is strengthened in place.

## Verification Layers

1. Accepted-choice prose receipt missing any trace of the committed `SE.state_delta` -> the check flags it (WARN/FAIL per the existing ladder).
2. Accepted-choice receipt reflecting the delta -> PASS, without consulting `SE.resolution`.
3. §4a boundary preserved (no PG mutation) -> manual review of the check's read-only inputs.

## What to Change

### 1. Strengthen the accept-route branch (D.5)

For `accept` routes, compare selected `CHC.likely_state_pressure`, `CHC.grounded_in`, page-plan §13, and the resulting `SE.state_delta`/`SE.state_relations` against the prose receipt — do not depend on `SE.resolution`. Presence is deterministic; sufficiency remains a judgment note. Mirror the wording in shared contract §4.6's `choice_consequence_visibility` description.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.6 check description)

## Out of Scope

- The STQ payoff/answer subcheck (SPEC50STPSTECHC-012).
- Adding a new prose-attach check (this strengthens the existing `choice_consequence_visibility`).
- Forcing exposition dumps — the check asserts non-invisibility only.

## Acceptance Criteria

### Tests That Must Pass

1. Accept-route receipt with no trace of the committed `SE.state_delta` → flagged.
2. Accept-route receipt reflecting the delta → PASS; the check does not consult `SE.resolution` for accept routes.
3. `branching-story-prose-attach` dry-run on an accept-route fixture page produces the expected verdict.

### Invariants

1. Accept-route consequence visibility is verified against committed state + receipt, never `SE.resolution`.
2. The check never mutates the `PG` record (§4a).

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract change; verification is a `branching-story-prose-attach` dry-run on an accept-route page and grep-proof of the §4.6 wording, per Assumption Reassessment.`

### Commands

1. `grep -n "choice_consequence_visibility" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-record-schemas.md` — confirm the accept-route branch references `SE.state_delta`/`state_relations`, not `SE.resolution`.
2. `branching-story-prose-attach` dry-run on an accept-route fixture page.
