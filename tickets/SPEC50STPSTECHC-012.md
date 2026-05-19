# SPEC50STPSTECHC-012: STQ payoff/answer prose-receipt subcheck + page-plan §10b note

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `branching-story-prose-attach` skill + shared contract §4.6 + page-plan §10b contract.
**Deps**: None

## Problem

`branching-story-prose-attach` names secret/clock/plan/emotion subchecks within `required_event_rendered`, but STQ (story-question) payoff rendering has no explicit subcheck. A story question can be opened, narrowed, answered, or paid off in committed state without the rendered prose reflecting it, and nothing flags the setup/payoff state going un-rendered.

## Assumption Reassessment (2026-05-19)

1. Codebase: the 8 deterministic checks are listed at `branching-story-prose-attach/SKILL.md:38`; `required_event_rendered` (`SKILL.md:203`) carries CLK-tick and STSEC-reveal subchecks but no STQ payoff subcheck. Verified this session.
2. Specs/contract: SPEC-50 §E.1; the 8-check contract + subchecks live in `.claude/skills/_shared-templates/story-record-schemas.md` §4.6; page-plan §10b is the clocks/secrets/questions rendering section.
3. Cross-artifact boundary: the prose-attach subcheck, the §4.6 contract, and page-plan §10b must agree on what STQ state must be rendered; the subcheck reads `STQ.status` transitions, `payoff_of`, and `answer_records`.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): the subcheck consumes committed STQ state + the prose receipt read-only; it does not mutate the `PG` record. Presence is deterministic; sufficiency is a judgment note.

## Architecture Check

1. Adding an STQ payoff subcheck under the existing `required_event_rendered` check (parallel to the CLK-tick / STSEC-reveal subchecks) keeps the 8-check contract stable and places STQ rendering where the sibling setup/payoff state subchecks already live.
2. No shim — a new subcheck alongside existing ones.

## Verification Layers

1. A page that answers/pays off an STQ with a receipt that omits it -> flagged.
2. A receipt reflecting the STQ payoff -> PASS.
3. Page-plan §10b names what STQ state must be rendered -> grep-proof of the §10b contract note.

## What to Change

### 1. STQ payoff/answer subcheck (E.1)

Add a `required_event_rendered` subcheck for `STQ.status` transitions, `payoff_of`, and `answer_records`: when committed state opens, narrows, answers, or pays off a story question, the receipt records whether the prose reflects it. Deterministic presence; sufficiency is a judgment note. Mirror in shared contract §4.6.

### 2. Page-plan §10b note

Add a §10b contract note that any STQ touched on the page names what must be rendered.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.6 + page-plan §10b contract)

## Out of Scope

- The accept-route consequence-visibility strengthening (SPEC50STPSTECHC-010).
- Any new top-level prose-attach check (this is a subcheck under `required_event_rendered`).

## Acceptance Criteria

### Tests That Must Pass

1. A page answering an STQ with a receipt that omits the payoff → flagged.
2. A receipt reflecting the STQ payoff → PASS.
3. `branching-story-prose-attach` dry-run on an STQ-payoff fixture page produces the expected verdict.

### Invariants

1. STQ payoff rendering is verified against committed `STQ.status`/`payoff_of`/`answer_records` + the receipt, read-only (§4a).

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract change; verification is a `branching-story-prose-attach` dry-run on an STQ-payoff page and grep-proof of the §4.6 + §10b wording, per Assumption Reassessment.`

### Commands

1. `grep -n "STQ\|payoff_of\|answer_records" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-record-schemas.md` — confirm the subcheck + §10b note landed.
2. `branching-story-prose-attach` dry-run on an STQ-payoff fixture page.
