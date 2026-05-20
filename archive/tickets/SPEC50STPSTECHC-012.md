# SPEC50STPSTECHC-012: STQ payoff/answer prose-receipt subcheck + page-plan §10b note

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `branching-story-prose-attach` skill + shared receipt contract §4.6 + shared page-plan §10b contract.
**Deps**: None

## Problem

At intake, `branching-story-prose-attach` named secret/clock/plan/emotion subchecks within `required_event_rendered`, but STQ (story-question) payoff rendering had no explicit subcheck. A story question could be opened, narrowed, answered, or paid off in committed state without the rendered prose reflecting it, and nothing flagged the setup/payoff state going un-rendered.

## Assumption Reassessment (2026-05-20)

1. Codebase: at intake, the 8 deterministic checks were listed in `.claude/skills/branching-story-prose-attach/SKILL.md`, and `required_event_rendered` carried CLK-tick, STSEC-reveal, STPLAN, and STEMO subchecks but no STQ payoff / answer subcheck. The live skill has a `<HARD-GATE>` list that names required subchecks, so `docs/HARD-GATE-DISCIPLINE.md` was read before editing; the change only adds an observed subcheck and does not change approval or write timing.
2. Specs/contract: SPEC-50 §E.1; the 8-check contract + subchecks live in `.claude/skills/_shared-templates/story-record-schemas.md` §4.6; page-plan §10b is defined in `.claude/skills/_shared-templates/story-state-contract.md`, not in the schema mirror.
3. Cross-artifact boundary: the prose-attach subcheck, the §4.6 receipt contract, and page-plan §10b must agree on what STQ state must be rendered; the landed subcheck reads committed `STQ.status` lifecycle changes, `payoff_of`, `answer_records[]`, and §10b render requirements.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): the subcheck consumes committed STQ state + the prose receipt read-only; it does not mutate the `PG` record or any STQ record. Presence is deterministic; sufficiency is a judgment note.
5. Verification drift: the drafted `branching-story-prose-attach` dry-run command is not an executable local runner in this repo context. Acceptance is narrowed to manual contract review plus focused grep/stale-anchor proof over the edited skill and shared contracts.

## Architecture Check

1. Adding an STQ payoff subcheck under the existing `required_event_rendered` check (parallel to the CLK-tick / STSEC-reveal subchecks) keeps the 8-check contract stable and places STQ rendering where the sibling setup/payoff state subchecks already live.
2. No shim — a new subcheck alongside existing ones.

## Verification Layers

1. The prose-attach `required_event_rendered` contract now flags omitted STQ lifecycle/payoff rendering and passes reflected STQ payoff rendering -> manual contract review + grep-proof.
2. The shared §4.6 receipt contract mirrors the STQ payoff/answer observation without adding receipt fields -> manual contract review + grep-proof.
3. Page-plan §10b names what STQ state must be rendered -> grep-proof of the §10b contract note.

## Landed Changes

### 1. STQ payoff/answer subcheck (E.1)

Added a `required_event_rendered` subcheck for STQ lifecycle/payoff transitions: when committed state opens, narrows, answers, pays off, abandons, inherits, or supersedes a story question, the receipt records whether the prose reflects it. Deterministic presence; sufficiency is a judgment note. Mirrored the observation in shared contract §4.6 without adding receipt fields.

### 2. Page-plan §10b note

Added a §10b contract note that any STQ touched by the selected event names what must be rendered for setup/payoff movement.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.6 receipt contract)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — page-plan §10b contract)

## Out of Scope

- The accept-route consequence-visibility strengthening (SPEC50STPSTECHC-010).
- Any new top-level prose-attach check (this is a subcheck under `required_event_rendered`).

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review: the `required_event_rendered` subcheck flags an omitted STQ payoff / answer / lifecycle transition and passes when the prose reflects the committed transition.
2. Focused grep proof: the prose-attach skill and shared contracts name `story_question_payoff_undisclosed`, `payoff_of`, `answer_records[]`, and §10b STQ render requirements.
3. Stale-proof check: no active acceptance text still requires an unavailable `branching-story-prose-attach` dry-run.

### Invariants

1. STQ payoff rendering is verified against committed `STQ.status`/`payoff_of`/`answer_records` + the receipt, read-only (§4a).

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract change; no executable prose-attach dry-run runner exists in this repo context, so verification is manual contract review plus grep-proof of the skill, §4.6 receipt contract, and §10b page-plan wording.`

### Commands

1. `grep -n "story_question_payoff_undisclosed\\|STQ\\|payoff_of\\|answer_records" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/_shared-templates/story-state-contract.md` — confirm the subcheck + §4.6 + §10b wording landed.
2. `grep -n "branching-story-prose-attach.*dry-run\\|dry-run on an STQ-payoff" archive/tickets/SPEC50STPSTECHC-012.md` — discovery sweep; remaining hits must be historical reassessment/deviation text, not active acceptance gates.

## Outcome

Completed 2026-05-20.

`branching-story-prose-attach` now includes a `story_question_payoff_undisclosed` subordinate observation under `required_event_rendered`. The check reads committed STQ lifecycle/payoff state from plan §7 / `SE.state_delta`, `payoff_of`, `answer_records[]`, and the §10b render requirement, emits `WARN` for omitted but otherwise rendered transitions, and emits `FAIL` for contradictions. The prose-attach HARD-GATE completion list now names the STQ payoff / answer subcheck alongside the existing CLK and STSEC checks.

The shared §4.6 prose-receipt contract now mirrors the STQ observation without adding a receipt-schema field. The shared story-state contract §10b now requires any STQ touched by the selected event to name what prose must show for setup/payoff movement.

## Verification Result

1. `grep -n "story_question_payoff_undisclosed\\|STQ\\|payoff_of\\|answer_records" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/_shared-templates/story-state-contract.md` — PASS: found the prose-attach subcheck, the §4.6 receipt-contract mirror, and the §10b render requirement.
2. `grep -n "branching-story-prose-attach.*dry-run\\|dry-run on an STQ-payoff" archive/tickets/SPEC50STPSTECHC-012.md` — PASS by classification: remaining hits are historical reassessment/deviation and this discovery command, not active acceptance gates.
3. Manual FOUNDATIONS alignment review — PASS: the change preserves §Story Bundles §4a because prose-attach records receipt observations only and never mutates `PG` or STQ records.

## Deviations

- The drafted `branching-story-prose-attach` dry-run proof was not run because no executable local prose-attach dry-run runner exists in this repo context. The accepted proof is manual contract review plus focused grep/stale-anchor proof over the edited skill and shared contracts.
