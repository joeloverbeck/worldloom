# SPEC35STOPIPEIG-001: Fix observer_firewall current-choice resolution to child page

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`observer-firewall.ts` validator) + test fixture
**Deps**: `archive/specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D1

## Problem

At intake, `tools/validators/src/structural/observer-firewall.ts` (`selectedChoiceForEvent`) resolved the selected choice by reading `event.parent_page_id`, then accessing that parent page's `input.choice_id`. Under the shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4.2 / §4.3, the PG↔SE link is forward: the CHILD page is the page whose `input.resolved_event_id` names the current SE; the child page's `input.choice_id` is the action source. The parent page's input is the action that produced the parent. The validator inspected the previous page's choice instead of the current page's choice — exactly the observer-firewall failure mode the validator is intended to catch (an actor grounding the current action in information that the previous choice's grounding would have masked).

This is SPEC-34 D2 immediate post-merge drift. The deterministic-subset coverage SPEC-34 D2 promised was constructed against the wrong page; the SPEC-34 D2 test fixture's padded-ID rot (addressed separately by SPEC35STOPIPEIG-008) prevented the wrong-page resolution from surfacing in CI.

## Assumption Reassessment (2026-05-16)

1. At intake, `tools/validators/src/structural/observer-firewall.ts` contained `selectedChoiceForEvent` reading `event.parent_page_id` then `parentPage.input.choice_id`. Verified before implementation; confirmed against SPEC-34 D2's archived ticket scope (`archive/tickets/SPEC34STOVALHAR-002.md`).
2. `.claude/skills/_shared-templates/story-state-contract.md` §4.2 (PG schema) defines `input.resolved_event_id` and `input.choice_id` on PG records; there is no nested `PG.SE` link. Verified at story-state-contract path (`63568` bytes, current).
3. Cross-skill boundary under audit: the PG↔SE forward-link convention (child PG's `input.resolved_event_id === SE.id`) — load-bearing for observer_firewall's correctness; producing skills are `branching-story-bootstrap` and `branching-story-turn-cycle`; consumed by every replay surface.
4. Rule 7 (Preserve Mystery Deliberately) and §Story Bundles §6b (Information / Observer Firewall) motivate this ticket: observer_firewall is the standalone deterministic validator that enforces §6b at validator-layer scope (per SPEC-34 D2's intake). Restated: storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity; the validator must locate THE CURRENT acting entity's choice (child PG's `input.choice_id`), not the previous one's, to evaluate `CHC.grounded_in.records[]` against the actor's accessible BEL state.
5. This ticket touches a structural validator (`observer_firewall`) that gates story-bundle record writes at engine pre-apply time — a Canon Safety Check surface for story records. The fix STRENGTHENS the firewall by correctly resolving the current acting entity's choice; the validator does not interact with the Mystery Reserve firewall directly, so no MR weakening is possible from this change.

## Architecture Check

1. The fix preserves observer_firewall as a deterministic-subset validator (no semantic-plausibility judgment) while correcting the resolution direction: forward via `input.resolved_event_id === SE.id` matches the contract's PG↔SE link convention exactly. Alternative considered: maintain `event.parent_page_id` lookup and also check the child page — rejected because the dual-lookup would conflate "what produced the parent state" with "what the actor is doing now", losing the validator's stated semantic (current-action grounding).
2. No backwards-compatibility aliasing introduced. The `pageResolvedByEvent` helper is a new pure function over `RecordMaps`; the old `selectedChoiceForEvent` body is replaced wholesale, not shimmed.

## Verification Layers

1. Observer-firewall validator resolves current-action choice from child page → fixture-driven test where parent `PG-1.input.choice_id: CHC-1` (public grounding) and child `PG-2.input.choice_id: CHC-2` (private-BEL grounding) → expect validator to fail on `CHC-2` private-belief leak, not pass via `CHC-1`.
2. PG↔SE forward-link convention conforms to contract → codebase grep-proof: `selectedChoiceForEvent` body cites `input.resolved_event_id`, not `parent_page_id`.
3. Existing observer-firewall tests still pass with the local helper now supplying `input.resolved_event_id`; broader padded-ID fixture refresh remains owned by SPEC35STOPIPEIG-008 → `npm test` in `tools/validators/`.

## Landed Changes

### 1. Added `pageResolvedByEvent` helper and rewrote `selectedChoiceForEvent`

In `tools/validators/src/structural/observer-firewall.ts`, `selectedChoiceForEvent` now resolves the child page through `input.resolved_event_id === SE.id`, then reads that child page's `input.choice_id`:

```typescript
function pageResolvedByEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
  const eventIdValue = stringValue(event.id);
  if (eventIdValue === undefined) return undefined;
  return (maps.byType.get("page_record") ?? []).find((page) => {
    const input = asPlainRecord(asPlainRecord(page.parsed).input);
    return stringValue(input.resolved_event_id) === eventIdValue;
  });
}

function selectedChoiceForEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
  const childPage = pageResolvedByEvent(event, maps);
  const choiceId = stringValue(asPlainRecord(asPlainRecord(childPage?.parsed).input).choice_id);
  if (choiceId === undefined) return undefined;
  const choice = maps.byId.get(choiceId);
  return choice?.node_type === "choice_record" ? choice : undefined;
}
```

`SE.parent_page_id` remains present on SE fixtures as the state-before anchor, but is not used for choice resolution in observer_firewall.

### 2. Added fixture-driven test for the wrong-page bug

In `tools/validators/tests/structural/observer-firewall.test.ts`, added `observer_firewall uses child page input.choice_id, not parent page`:

- Parent page: `PG-1` with `input.choice_id: CHC-1` where `CHC-1.grounded_in.records[]` cites a publicly-accessible record.
- Child page: `PG-2` with `input.choice_id: CHC-2`, `input.resolved_event_id: SE-2`.
- `CHC-2.grounded_in.records[]` cites a `BEL-X` whose `holder` is NOT the SE.actor (private-belief leak).
- Pre-fix behavior: validator inspected `CHC-1` and passed.
- Post-fix behavior: validator inspects `CHC-2` and emits `observer_firewall_violation_private_belief_leak` for the private-belief leak.

The new fixture uses unpadded IDs and current schema fields. Existing padded fixtures in this same file are still left for SPEC35STOPIPEIG-008's broader fixture refresh; the helper now adds `input.resolved_event_id` so existing observer_firewall coverage continues to exercise the corrected lookup.

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify — new test + local page-helper update; broader fixture refresh remains SPEC35STOPIPEIG-008)

## Out of Scope

- Semantic-plausibility judgment for observer_firewall (`event.actor` *could have* inferred this without an explicit BEL record) — judgment-assisted territory, not deterministic, deferred per SPEC-34's §Out of Scope.
- Full witness coverage (D4's deferred work) — separate validator-hardening-II spec.
- Fixture refresh for the rest of `observer-firewall.test.ts` (existing tests) — owned by SPEC35STOPIPEIG-008's sweep; this ticket's new test must use current schema fields, but the refresh of pre-existing fixtures is delegated.

## Acceptance Criteria

### Tests That Must Pass

1. New test `observer_firewall uses child page input.choice_id, not parent page` passes on the post-fix validator and would fail against the pre-fix parent-page lookup because the parent choice is publicly grounded while the child choice leaks a private BEL.
2. All existing `tools/validators/tests/structural/observer-firewall.test.ts` tests continue to pass after the fix.
3. `npm test` in `tools/validators/` returns green (no regressions across the full structural-validator suite).

### Invariants

1. `selectedChoiceForEvent` resolves the choice from the page whose `input.resolved_event_id` matches the SE's id (the child page), not from `event.parent_page_id` (which anchors state-before, not action-source).
2. `SE.parent_page_id` is never used as the input to choice resolution in observer_firewall after this ticket lands.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` — added `observer_firewall uses child page input.choice_id, not parent page` test exercising the parent-vs-child distinction; updated the local page helper to include `input.resolved_event_id`.

### Commands

1. `cd tools/validators && npm run build` — typechecks the validator change.
2. `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js` — targeted observer_firewall coverage, including the new regression test.
3. `cd tools/validators && npm test` — full validator suite, including the new test and the existing observer-firewall coverage.

## Outcome

Completed: 2026-05-16

`observer_firewall` now resolves the current action's choice from the child page whose `input.resolved_event_id` matches the SE id. The validator no longer uses `SE.parent_page_id` as the choice source. Added regression coverage where `PG-1.input.choice_id` points at a harmless public BEL and `PG-2.input.choice_id` points at a private BEL leak for `SE-2`; the validator now flags the child choice (`CHC-2`) with `observer_firewall_violation_private_belief_leak`.

## Verification Result

- `cd tools/validators && npm run build` — pass.
- `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js` — pass, 8 tests.
- `cd tools/validators && npm test` — pass, 303 tests.

## Deviations

- Existing padded IDs in pre-existing observer-firewall fixtures were not fully refreshed here; SPEC35STOPIPEIG-008 owns the broader fixture rot sweep. This ticket updated the local page helper so existing observer_firewall tests remain meaningful under the corrected child-page lookup, and the new regression fixture uses unpadded IDs.
