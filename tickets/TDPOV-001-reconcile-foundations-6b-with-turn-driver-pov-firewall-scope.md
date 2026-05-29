# TDPOV-001: Reconcile FOUNDATIONS §6b observer-firewall breadth with turn_driver_pov_observer_firewall's enforced scope

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` §Story Bundles §6b wording; optionally `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts` comments; no behavior change unless the decision is to broaden the validator.
**Deps**: none (complements `OBSFW-001`; not blocked by it)

## Problem

FOUNDATIONS §Story Bundles §6b describes the turn-driver POV firewall broadly: a non-player driver whose `driver_records[]` "cite hidden state (an unrevealed `STSEC`, an offstage `STPLAN` outside POV observation, **an active record the POV actor lacks an access route to**)" must declare a `pov_visibility` matching the actor's access posture, "`perceived_directly` only when the POV actor has direct observation." Read literally, *any* private interior driver record (a private `STEMO`, `BEL`, `STINT`) would force a downgrade away from `perceived_directly`.

The implemented validator `turn_driver_pov_observer_firewall` is narrower: its `perceived_directly` leak check (`turn_driver_hidden_state_leak`) treats a driver record as "hidden" **only** for a hidden-status `STSEC` or an offstage-scoped `STPLAN` (`isHiddenDriverRecord`, `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts:182-196`). Ordinary interior `STEMO`/`BEL`/`STINT`/`THR`/`SREL` driver records do not downgrade `perceived_directly`.

This divergence actively misled authoring during the `red-bunny` PG-2 → PG-3 turn: reading §6b literally, the author chose `inferred_from_trace` for an on-stage `npc_action` whose driver records were the NPC's private `STEMO`/`BEL`/`STINT`. That tripped `turn_driver_missing_access_route` (the `inferred_from_trace`/`reported` path requires a public-coverage BEL whose `basis.access_records[]` names each driver record — impossible for an NPC's private interior). The correct value was `perceived_directly` (the POV directly witnesses the NPC's act; the interior substrate of any observed action is normally unobservable and is carried into the POV's own `BEL`, not leaked). The documented contract and the enforced validator must say the same thing.

## Assumption Reassessment (2026-05-29)

1. **Code**: `turn-driver-pov-observer-firewall.ts` — `VISIBILITIES_REQUIRING_ACCESS_ROUTE = {inferred_from_trace, reported}` (`:21`); `perceived_directly` branch filters by `isHiddenDriverRecord` (`:129-138`); `isHiddenDriverRecord` returns true only for `story_secret_record` with status ∈ `{hidden, unrevealed, concealed}` or `audience_visibility: hidden`, and for offstage-scoped `story_plan_record` (`:182-196`); every other driver class → not hidden.
2. **Docs**: `docs/FOUNDATIONS.md` §Story Bundles §6b (the "event-level driver declaration" paragraph) uses the broad "an active record the POV actor lacks an access route to" phrasing. The turn-cycle skill had **no** rule for choosing `pov_visibility` on non-player drivers until the companion doc fix added one (`.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md`, "Turn-driver `pov_visibility` for non-player drivers"), which this ticket is cited from.
3. **Shared boundary under audit**: the meaning of `pov_visibility` — whether it describes the POV's access to the *driving event* (validator's effective model) or to each *driver record's content* (literal §6b reading). These differ only for interior records of an on-stage actor.
4. **FOUNDATIONS principle**: §6b is the firewall under audit. The validator's narrower model is defensible and arguably correct (the POV perceives an NPC's on-stage act directly; the NPC's motives are the normal unobservable substrate and are surfaced through the POV's own inferential `BEL`, never by leaking the NPC's private records into the page/choices). This ticket does not weaken the Mystery Reserve firewall: hidden `STSEC` driver records remain "hidden" and still force a downgrade.
5. **Enforcement surface**: `turn_driver_pov_observer_firewall` (and `pg_se_turn_driver_consistency`, `turn_driver_schema_compliance`). The recommended resolution is documentation-aligning (narrow §6b's wording to the STSEC/offstage-STPLAN scope the validator enforces), not loosening any check.
8. **Adjacent contradiction**: this is a doc-vs-validator wording divergence, not a separate bug. The companion authoring rule already added to `phase-6-page-snapshot.md` references this ticket; closing it should remove that "until it lands" hedge.

## Architecture Check

1. Preferred resolution: **narrow the §6b prose to match the implemented scope** — state that `perceived_directly` is lawful for an on-stage driving event the POV witnesses, that interior `STEMO`/`BEL`/`STINT`/`THR`/`SREL` driver records do not downgrade it (they are surfaced through the POV's own `BEL`), and that only hidden `STSEC`, offstage `STPLAN`, or an unwitnessed offstage driving event require a downgraded `pov_visibility` plus a BEL access route. This is cleaner than broadening the validator, which would force authors to mint public BELs naming every private NPC motive (impossible/incoherent) and contradict the "system knows the full trace; the POV renders only the licensed surface" design already in §6b.
2. No backwards-compatibility shim; this is a wording/contract clarification (and optional code-comment alignment), not an alias.

## Verification Layers

1. §6b wording matches validator scope → FOUNDATIONS alignment check: the revised §6b enumerates exactly hidden-`STSEC` / offstage-`STPLAN` / unwitnessed-offstage as the downgrade triggers.
2. The validator's behavior is unchanged (no code regression) → run existing `turn-driver-pov-observer-firewall.test.ts` green.
3. The skill authoring rule no longer hedges on "until it lands" → grep `phase-6-page-snapshot.md` for the `TDPOV-001` reference and update it on close.

## What to Change

### 1. FOUNDATIONS §Story Bundles §6b wording

Replace the broad "an active record the POV actor lacks an access route to" clause with an explicit, closed downgrade-trigger list aligned to the validator: hidden-status `STSEC`, offstage-scoped `STPLAN`, or a driving event the POV did not witness (`offstage_action`, or an event reaching the POV only by trace/report/later discovery). State that interior affective/epistemic/intentional driver records (`STEMO`, `BEL`, `STINT`, `THR`, `SREL`) of an on-stage actor do not downgrade `perceived_directly`; the POV's read of those motives lives in the POV's own `BEL` records, not in the driver declaration.

### 2. (Optional) Code comment alignment

Add a short comment in `turn-driver-pov-observer-firewall.ts` near `isHiddenDriverRecord` pointing to the revised §6b clause as the authority for the STSEC/STPLAN-only scope.

### 3. Close the hedge in the skill

On landing, drop the "until it lands, follow the rule above" sentence in `phase-6-page-snapshot.md` and cite §6b directly.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — §Story Bundles §6b)
- `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts` (modify — comment only, optional)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify — remove hedge)

## Out of Scope

- The emitted-choice actor-resolution defect (`OBSFW-001`).
- Any change to the `inferred_from_trace`/`reported` access-route requirement, which is correct as-is.
- Broadening the validator to treat interior records as hidden (explicitly rejected by the Architecture Check).

## Acceptance Criteria

### Tests That Must Pass

1. Existing `turn-driver-pov-observer-firewall.test.ts` stays green (no behavior change).
2. Dry-run of an on-stage `npc_action` turn with private-interior driver records and `pov_visibility: perceived_directly` → `status: pass` (regression guard matching the red-bunny PG-3 shape).
3. FOUNDATIONS §6b read-through: the downgrade triggers it lists are exactly {hidden STSEC, offstage STPLAN, unwitnessed offstage event}.

### Invariants

1. Documented §6b downgrade triggers == validator-enforced "hidden driver record" set.
2. Mystery Reserve firewall intact: hidden `STSEC` driver records still force a `pov_visibility` downgrade (FOUNDATIONS Rule 7).

## Test Plan

### New/Modified Tests

1. `None for new behavior — documentation-alignment ticket; verification is the existing validator suite staying green plus a regression dry-run.` Add one regression fixture/test only if the team wants the perceived_directly+private-interior case pinned in `turn-driver-pov-observer-firewall.test.ts`.

### Commands

1. `npm test --workspace tools/validators -- turn-driver-pov-observer-firewall` — confirms no regression.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root . /tmp/<npc-turn-perceived-directly-envelope>.json` — confirms the aligned posture validates.
