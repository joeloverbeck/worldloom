# BSAUD-001: Add prose-ledger consistency audit to branching-story-health-audit

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — `.claude/skills/branching-story-health-audit/SKILL.md`, its audit report/example surfaces, and this ticket closeout only.
**Deps**: `archive/tickets/BSBOOT-006.md`

## Problem

`BSBOOT-006` aligned `branching-story-bootstrap` Phase 7 to the runtime page-cycle contract: prose may mention absent/offstage entities when grounded in state, but may not stage an entity as physically present, acting, speaking, directly perceived, or immediately interactable unless that entity is in `cast_present`.

At intake, downstream audit coverage was incomplete. `branching-story-health-audit` read `pages-prose/PG-*.md`, but its documented prose checks were limited to mystery-firewall-vs-prose, repetition/similar-scene clustering, and content-intensity drift. It did not define a post-hoc `prose_ledger_consistency` audit category that could flag:

- page prose physically staging an entity not in `state_snapshot.cast_present`;
- load-bearing factual claims absent from `state_snapshot` grounding (`objective_facts`, `apparent_facts`, `disputed_facts`, `reader_known_facts`, `belief_state_by_actor`, DA content, or POV-accessible world context);
- mystery-risk prose that should remain under the existing Rule 7 error path.

This gap mattered because page-cycle and bootstrap both use the prose-ledger gate as a canon-safety surface, while health-audit is the later diagnostic tool expected to find story-bundle drift after pages exist.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-006.md` completed the contract correction for bootstrap Phase 7: offstage mentions are allowed only when grounded, while physical staging outside `cast_present` remains rejected.
2. `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` already permits offstage references and named absent characters, and forbids depicting an entity as physically present unless included in `cast_present`; no page-cycle follow-up is needed for this issue.
3. Cross-skill boundary: `branching-story-health-audit` consumes pages created by `branching-story-bootstrap` and `branching-story-page-cycle`, so its audit categories should include the same prose-ledger consistency invariant those producer skills gate at render time.
4. FOUNDATIONS principle: Rule 1 (No Floating Facts) requires every fact to carry scope and prerequisites; Rule 7 (Preserve Mystery Deliberately) requires unresolved mysteries to remain protected. A prose-ledger audit should preserve both by distinguishing allowed grounded offstage references from ungrounded physical staging, ungrounded load-bearing facts, and unauthorized mystery resolution.
5. Before this ticket, `branching-story-health-audit/SKILL.md` listed `pages-prose/PG-*.md` as inputs for Phase 5 repetition, Phase 3 mystery-firewall-vs-prose, and Phase 4 content-intensity drift, but not for prose-ledger consistency.
6. Before this ticket, `branching-story-health-audit/SKILL.md` `audit_focus` lacked a `prose_ledger_consistency` category, and Phase 3 Coverage Analysis had no sub-check for physical-staging-vs-`cast_present` or load-bearing factual claims absent from `state_snapshot`.
7. `storylet-pool-authoring` does not render page prose; it authors SLT records and choice templates. No downstream change is warranted there from `BSBOOT-006`.
8. `story-fact-promotion-to-canon` promotes story-local facts, mystery resolutions, character arcs, or artifacts into world canon. It is a canon-promotion bridge, not a page-prose ledger validator. No downstream change is warranted there from `BSBOOT-006`.
9. Active-ticket scan found no existing ticket owning health-audit prose-ledger consistency; `BSBOOT-014` owns Phase 7.5 visible-affordance extraction in bootstrap, not post-hoc health-audit diagnosis.
10. `docs/HARD-GATE-DISCIPLINE.md` confirms the health-audit HARD-GATE remains absolute. This ticket adds Rule 1 / prose-ledger evidence to the existing read-only audit validation surface; it does not weaken user approval, write ordering, Mystery Reserve firewall, or any canon/story `_source` mutation gate.

## Architecture Check

1. Adding the audit category to `branching-story-health-audit` keeps producer gates and diagnostic audit aligned without weakening render-time HARD-GATE behavior. The audit remains read-only and reports drift instead of mutating story state.
2. No backwards-compatibility aliasing/shims introduced. Existing audit focuses remain valid; `prose_ledger_consistency` is an additive audit focus and a default `all` sub-check.

## Verification Layers

1. Audit focus surface includes `prose_ledger_consistency` -> codebase grep-proof over `branching-story-health-audit/SKILL.md` and report/example surfaces.
2. Physical-staging rule is aligned to page-cycle and bootstrap wording -> manual review plus grep-proof for `physically present`, `cast_present`, and offstage-reference grounding language.
3. Rule 1 / Rule 7 preservation -> FOUNDATIONS alignment check: load-bearing claims must be state-grounded; mystery-resolution findings stay under the existing Rule 7 error path.
4. Downstream non-owner skills remain unchanged -> codebase grep-proof / manual review that `branching-story-page-cycle` already matches and that `storylet-pool-authoring` / `story-fact-promotion-to-canon` do not own rendered page-prose validation.

## Landed Changes

### 1. `.claude/skills/branching-story-health-audit/SKILL.md`

- Added `prose_ledger_consistency` to the `audit_focus` argument enum and the Inputs section.
- Added prose-ledger consistency to the top-level purpose summary and process flow as a Phase 3 diagnostic.
- Updated the `pages-prose/PG-*.md` world-state prerequisite to say page prose is also read for prose-ledger consistency.
- Added a Phase 3 sub-check:
  - `error`: page prose stages an entity as physically present, acting, speaking, directly perceived, or immediately interactable when not in `state_snapshot.cast_present`;
  - `warning` or `error` depending severity: page prose makes a load-bearing factual claim absent from state grounding (`objective_facts`, `apparent_facts`, `disputed_facts`, `reader_known_facts`, `belief_state_by_actor`, DA content, or POV-accessible world context);
  - preserve existing `mystery-risk` / unauthorized M resolution as `error` under Mystery Firewall Integrity rather than duplicating it.
- Updated Phase 7 self-check/severity wording so prose-ledger findings cite page id, prose excerpt, state field, and rationale.
- Updated FOUNDATIONS Alignment rows for Rule 1 and Rule 7 to name the new audit surface.
- Kept the skill read-only; findings may propose manual remediation or page-cycle re-render, but the audit must not edit page prose or state records.

### 2. `.claude/skills/branching-story-health-audit/templates/story-audit-report.md`

- Added `prose_ledger_consistency` as a valid category value in body category guidance.
- Added guidance that findings report page id, excerpt, missing/violated state anchor, and recommended remediation (`manual-flag` or page-cycle re-render).

### 3. `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md`

- Added one example finding showing the new distinction:
  - allowed: grounded offstage reference remains clean;
  - violation: physical staging outside `cast_present` or ungrounded load-bearing claim is reported.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)
- `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` (modify)
- `archive/tickets/BSAUD-001.md` (modify closeout / archive handoff)

## Out of Scope

- Editing `branching-story-page-cycle`; it already carries the correct mention-vs-depiction contract.
- Editing `storylet-pool-authoring`; it does not render page prose and has no direct responsibility for prose-ledger validation.
- Editing `story-fact-promotion-to-canon`; canon-promotion impact analysis is a different surface from rendered page-prose ledger consistency.
- Adding a runtime validator or package code. This is a prose-workflow skill contract update.
- Changing existing `branching-story-bootstrap` behavior from `BSBOOT-006`.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'prose_ledger_consistency|physically present|cast_present|offstage reference|reader_known_facts|belief_state_by_actor' .claude/skills/branching-story-health-audit` returns the new audit-focus, Phase 3, template/example, and FOUNDATIONS alignment anchors.
2. `rg -n 'mention any character' .claude/skills/branching-story-health-audit .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon` returns no live stale "mention-forbid" contract.
3. Manual review confirms `branching-story-page-cycle` remains unchanged and already aligned, while `storylet-pool-authoring` and `story-fact-promotion-to-canon` remain out of scope.

### Invariants

1. Health-audit flags physical staging outside `cast_present` without forbidding grounded offstage mention.
2. Health-audit flags ungrounded load-bearing prose claims as Rule 1 drift.
3. Mystery-resolution / mystery-risk prose remains an error under the existing Rule 7 firewall path.
4. The audit stays read-only against story state and emits findings/RSP/manual flags only.

## Test Plan

### New/Modified Tests

1. None — documentation-only workflow ticket; verification is grep/manual contract review over the affected skill, template, and example surfaces.

### Commands

1. `rg -n 'prose_ledger_consistency|physically present|cast_present|offstage reference|reader_known_facts|belief_state_by_actor' .claude/skills/branching-story-health-audit`
2. `rg -n 'mention any character' .claude/skills/branching-story-health-audit .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon`
3. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md archive/tickets/BSAUD-001.md`

## Outcome

Completed: 2026-05-06.

`branching-story-health-audit` now has a read-only `prose_ledger_consistency` audit focus that checks rendered page prose against `state_snapshot.cast_present` and state/POV grounding. Physical staging outside `cast_present` is an `error`; grounded offstage references remain clean; ungrounded load-bearing prose claims become `warning` or `error`; mystery-risk prose stays under the existing `mystery_firewall` Rule 7 error path.

The report template and mixed-severity example now document how to report page id, prose excerpt, missing/violated state anchor, and remediation route.

## Verification Result

Passed on 2026-05-06:

1. `rg -n 'prose_ledger_consistency|physically present|cast_present|offstage reference|reader_known_facts|belief_state_by_actor' .claude/skills/branching-story-health-audit` — returned the new audit-focus, Phase 3, template/example, and FOUNDATIONS alignment anchors.
2. `rg -n 'mention any character' .claude/skills/branching-story-health-audit .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon` — returned no matches, confirming no live stale mention-forbid contract on the checked surfaces.
3. Manual review against `docs/FOUNDATIONS.md` Rule 1 and Rule 7 plus `docs/HARD-GATE-DISCIPLINE.md` — prose-ledger drift is Rule 1 grounding evidence, mystery-risk evidence remains Rule 7, and the health-audit HARD-GATE remains read-only and approval-bound.
4. Manual review confirmed `branching-story-page-cycle` remains aligned and unchanged, while `storylet-pool-authoring` and `story-fact-promotion-to-canon` remain outside this page-prose validation boundary.
5. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md archive/tickets/BSAUD-001.md` — passed after archival path update.

## Deviations

None.
