# OBSFWSTSTAT-001: Observer firewall must recognize direct-observation access route to entity STSTAT

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/observer-firewall.ts` (`actorCanUseStatus` helper); validator tests in `tools/validators/tests/structural/`.
**Deps**: None

## Problem

Before this ticket, the `observer_firewall` validator narrowed FOUNDATIONS §Story Bundles §6b's access-route contract. §6b explicitly lists "direct observation" as a valid access route alongside `BEL` records, accessible artifacts, testimony, documents, and inference. `STSTAT` records an entity's life / agency / location — observable state. When an actor has a `BEL` with `access_route: direct_observation` and `access_records[]` containing the entity's `STENT-<integer>`, the actor has by definition observed that entity's life/agency/location and therefore has FOUNDATIONS-conformant access to the entity's active `STSTAT`. At intake, the `actorCanUseStatus` helper required the literal `STSTAT-<integer>` id to appear in some `BEL.basis.access_records[]`, which forced authors to add `STSTAT` references to every belief about an observed entity or stitch a synthetic `BEL` whose only purpose is to enumerate `STSTAT` in `access_records`.

Historical observed failure: at the `red-bunny` PG-3 turn-cycle, `CHC-5.grounded_in.records` cited `STSTAT-1` (Ane's status, committed at PG-2 grounding without firing the validator). When `CHC-5` became the resolved choice for `SE-3`, the validator fired `observer_firewall_violation_no_access_route` because none of Jon's active beliefs literally listed `STSTAT-1`, even though `BEL-2` (`access_route: direct_observation`, `access_records: [STENT-1, STLOC-1]`) records Jon's direct observation of the entity whose status `STSTAT-1` represents. Adding `STSTAT-1` to `BEL-11.basis.access_records[]` discharged the validator but pushed a `STSTAT` reference into an interior belief about Jon's own commitment, which is semantically incoherent.

This narrowed §6b at the validator level below the prose contract authors were working from.

## Assumption Reassessment (2026-05-26)

1. At intake, the `observer_firewall` validator's `actorCanUseStatus` helper checked only two paths: (a) the STSTAT's `entity` field equals the actor (self-status), (b) `actorHasAccessRecord` finds the STSTAT's literal id in some same-actor BEL's `basis.access_records[]`. The companion helper `actorHasObservabilityRouteTo` already implemented direct-observation-route recognition for `STENT` references (it requires `basis.access_route` ∈ `OBSERVABILITY_ACCESS_ROUTES` and the STENT id in `basis.access_records`). The landed extension reuses `actorHasObservabilityRouteTo`'s pattern against the STSTAT's `entity` field.
2. `docs/FOUNDATIONS.md` §Story Bundles §6b (lines 688-694) is the contract under audit: "Storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity. Before selecting an `SLT`, binding an actor to a move, emitting a `CHC`, or resolving a character action, story-pipeline skills must confirm that the actor's active `BEL` state, page-state affordances, accessible artifacts, **direct observation**, testimony, documents, inference, surveillance, institutional channels, magic/tech, or another canonically valid mechanism gives that actor an access route to the load-bearing information." (Emphasis added.) "Direct observation" is named verbatim as a lawful access route.
3. Cross-skill / cross-artifact boundary: this ticket modifies the validator surface consumed by `branching-story-bootstrap`, `branching-story-turn-cycle`, `commitment-block-authoring`, and `branching-story-health-audit` (every story-pipeline skill that emits or validates `CHC.grounded_in.records[]`). The shared contract is FOUNDATIONS §6b as quoted above; no story-skill `SKILL.md` carries a stricter rule than §6b. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §5 + §11a does not redefine the access-route enumeration; it cites the FOUNDATIONS firewall.
4. FOUNDATIONS principle restated: §6b lists "direct observation" as one of the lawful access routes; the validator must recognize all named routes, not only the BEL.basis.access_records literal-id path. The change does not weaken §6b — every existing access path still works; the change adds the §6b-named "direct observation" path the validator was missing.
5. Schema extension classification: this ticket does NOT extend the `BEL` schema. `BEL.basis.access_route` and `BEL.basis.access_records[]` are unchanged; only the validator's interpretation of those existing fields is corrected. The fix is purely a validator semantic change, not a data-model change.
6. Adjacent contradictions surfaced: `actorHasObservabilityRouteTo` already implemented direct-observation route recognition for STENT references but was not consulted from `actorCanUseStatus`. This was the gap, not a separate bug. The fix unifies the validator's behavior across `STENT` and `STSTAT` reference resolution.
7. Reassessment correction before implementation: the live validator test directory is `tools/validators/tests/structural/`, not the drafted `tools/validators/test/structural/`. The package script `npm test -- observer-firewall` does not narrow to the observer-firewall file; it passes the extra argument after the compiled glob and still runs the full validators suite. The focused proof surface is `npm run build` followed by `node --test dist/tests/structural/observer-firewall.test.js`; the broad validators suite remains `npm test`.
8. HARD-GATE-facing validation signal check: `observer_firewall.applies_to` runs in `pre-apply` for `create_se_record` and `create_slt_record`, so this semantic widening can affect `validate_patch_plan` / `submit_patch_plan`. `docs/HARD-GATE-DISCIPLINE.md` was read before source edits. The change preserves fail-closed behavior for absent records and for actors without a BEL observability route; it only accepts FOUNDATIONS §Story Bundles §6b's explicit direct-observation route when the observed entity id is recorded in `BEL.basis.access_records[]`.

## Architecture Check

1. Cleaner than alternatives because (a) the fix unifies the validator's behavior with the existing `actorHasObservabilityRouteTo` pattern rather than introducing a new mechanism, (b) it aligns the validator with FOUNDATIONS §6b's explicit "direct observation" route rather than forcing authors to thread synthetic STSTAT references through every observation-grounded belief, and (c) it removes the inconsistent failure surface where the same CHC.grounded_in.records[] grounding passes validation at emission time and fails at resolution time.
2. No backwards-compatibility shim introduced. The validator's recognition surface widens; pre-existing patterns (literal STSTAT id in BEL.basis.access_records[]) continue to work without modification.

## Verification Layers

1. FOUNDATIONS §6b "direct observation" recognized → FOUNDATIONS alignment check (§Story Bundles §6b lines 688-694 cited verbatim against the validator's access-route enumeration).
2. `actorCanUseStatus` recognizes transitive STSTAT access → schema validation (a unit test against `tools/validators/src/structural/observer-firewall.ts` with a BEL of `access_route: direct_observation` and `access_records: [STENT-X]` resolves access to the active `STSTAT-Y` whose `entity: STENT-X`).
3. Self-status path preserved → schema validation (existing test for `STSTAT.entity == actor` continues to pass).
4. Existing literal-STSTAT-in-access_records path preserved → schema validation (existing tests that include STSTAT literal ids in BEL.basis.access_records[] continue to pass).
5. CHC.grounded_in.records[] resolution-time consistency with emission-time → focused synthetic validator proof. The original red-bunny envelope is historical intake evidence, not a portable active proof artifact in this repo checkout.

## Landed Changes

### 1. Extend `actorCanUseStatus` in `observer-firewall.ts`

Added a third recognition path: if the STSTAT's `entity` field resolves to an active `STENT-<integer>` AND the actor has a `BEL` with `basis.access_route` ∈ `OBSERVABILITY_ACCESS_ROUTES` whose `basis.access_records[]` includes that STENT id, then the actor has direct-observation access to the entity's STSTAT.

The existing helpers `actorHasAccessRecord` and `actorHasObservabilityRouteTo` were reused without duplicating `OBSERVABILITY_ACCESS_ROUTES`.

### 2. Added unit tests in `tools/validators/tests/structural/observer-firewall.test.ts`

The test file now covers the four status-access cases against the modified `actorCanUseStatus`:

1. Self-status: `STSTAT.entity == actor` → PASS (existing behavior preserved).
2. Literal STSTAT in BEL.basis.access_records[]: → PASS (existing behavior preserved).
3. New direct-observation path: BEL with `access_route: direct_observation` and `access_records: [STENT-X]`, against `STSTAT-Y.entity == STENT-X` → PASS (new behavior).
4. No access at all: actor has no BEL referencing STSTAT-Y, STENT-X, or being the entity → FAIL with `observer_firewall_violation_no_access_route` (existing failure path preserved).

The live validator test convention is one `*.test.ts` per validator under `tools/validators/tests/structural/` matching the validator filename.

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (modify — extend `actorCanUseStatus`)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify — add direct-observation STSTAT regression coverage)
- `archive/tickets/OBSFWSTSTAT-001.md` (modify — reassessment, closeout truthing, and archival)

## Out of Scope

- Any change to the `BEL` schema, `STSTAT` schema, or `basis.access_records[]` field shape — the data model is unchanged.
- Any change to the related `turn_driver_pov_observer_firewall` validator — that validator handles `pov_visibility` consistency for non-player drivers and is governed by §6b paragraph 2 (event-level driver declaration), not the choice-grounding path this ticket fixes.
- Resolution-time vs emission-time CHC validation timing — this ticket does not change WHEN the validator runs; it changes WHAT the validator accepts. The resolution-time / emission-time asymmetry observed at PG-3 is resolved as a side effect of widening the accepted access routes.
- Inference / testimony / document / surveillance access routes named in §6b but not currently in `OBSERVABILITY_ACCESS_ROUTES` — those are separate gaps for separate tickets if/when authors encounter validator failures using them.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js` — focused observer-firewall tests pass, including self-status, literal-STSTAT access, direct-observation STSTAT access, and no-access rejection.
2. `cd tools/validators && npm test` — the validators package builds and the full validator suite passes (no regression on existing structural validators or the literal-id-in-access_records path).
3. The red-bunny PG-3 envelope smoke is not an active acceptance gate in this ticket because no portable rebuilt envelope path exists in the repo; the synthetic focused validator test proves the same `BEL.access_route: direct_observation` + `access_records: [STENT-X]` -> `STSTAT.entity == STENT-X` invariant.

### Invariants

1. The validator MUST recognize at least the `BEL.basis.access_route` set listed in FOUNDATIONS §Story Bundles §6b for `STSTAT` access route resolution (currently: at minimum "direct observation"; the set is the existing `OBSERVABILITY_ACCESS_ROUTES` constant).
2. The validator MUST NOT require a STSTAT's literal id in `BEL.basis.access_records[]` when an observation-route access path through the STSTAT's `entity` exists.
3. The validator MUST preserve the existing self-status path (`STSTAT.entity == actor`) without modification.
4. FOUNDATIONS §Story Bundles §6.1 line 680 invariant preserved: `STCHAR` must not appear in `BEL.basis.access_records[]`; this ticket does not introduce a STCHAR path.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` — new test case for the direct-observation route to STSTAT (case 3 above); rationale: covers the new validator path with the exact BEL / STENT / STSTAT shape FOUNDATIONS §6b licenses.
2. `tools/validators/tests/structural/observer-firewall.test.ts` — existing regression tests cover the self-status path, the literal-id-in-access_records path, and the no-access failure path (cases 1, 2, 4); rationale: confirms no regression on existing accepted paths and on the failure path.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js` — focused validator test pass.
2. `cd tools/validators && npm test` — broad validators package regression pass.
3. Manual FOUNDATIONS alignment review against `docs/FOUNDATIONS.md` §Story Bundles §6b lines 688-694 — confirms direct observation remains a lawful access route and the validator remains fail-closed when no route exists.

## Outcome

Implemented. `actorCanUseStatus` now preserves the existing self-status and literal-STSTAT access paths, then accepts a FOUNDATIONS §6b direct-observation route when the STSTAT's `entity` is named in an actor-held BEL's `basis.access_records[]` with an observability `basis.access_route`.

Added a focused regression test proving that a choice grounded in another entity's `STSTAT` passes when the acting entity directly observed that status entity through `BEL.basis.access_route: direct_observation` and `BEL.basis.access_records: [STENT-X]`.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js` — PASS: 24 tests passed, including the new direct-observation STSTAT case plus the existing self-status, literal-STSTAT, and no-access cases.
3. `cd tools/validators && npm test` — PASS: 1048 tests passed.
4. Manual FOUNDATIONS alignment review against `docs/FOUNDATIONS.md` §Story Bundles §6b — PASS: direct observation is an explicit lawful access route, and the validator remains fail-closed when no same-actor BEL observability route exists.

## Deviations

- The drafted `tools/validators/test/structural/observer-firewall.spec.ts` path was stale; the live path is `tools/validators/tests/structural/observer-firewall.test.ts`.
- The drafted `npm test -- observer-firewall` command is not a targeted observer-firewall proof in this package because the extra argument is passed after the compiled test glob and the command still runs the full validators suite. The accepted focused proof is `npm run build` followed by `node --test dist/tests/structural/observer-firewall.test.js`.
- The drafted red-bunny PG-3 envelope smoke was replaced with a portable synthetic validator test because no rebuilt envelope path is present in the repo. The synthetic test covers the same access-route invariant; it does not prove CLI argv handling or the historical local envelope's current submitability.
