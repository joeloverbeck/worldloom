# OBSFW-001: introduction_observer_firewall must resolve emitted-choice actor as the player-proxy, not the event actor

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/introduction-observer-firewall.ts`; new/updated validator unit test; no schema change.
**Deps**: none

## Problem

On a non-player-driver turn (`SE.turn_driver.kind ∈ {npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision}`), the emitted `CHC` records are the **player's** responses, performed by the player-proxy entity. But `introduction_observer_firewall` attributes choice-grounding access to `SE.actor` — which on these turns is the **NPC initiator**, not the player-proxy. As a result, a player-response choice that grounds in a freshly-introduced record the *player-proxy* legitimately holds (e.g. the player-proxy's own newly-created `STEMO`) is wrongly rejected with `intro_observer_no_access_route`, because the NPC event-actor cannot access it.

Observed in the `red-bunny` PG-2 → PG-3 turn (advance_initiative, `npc_action` by STENT-2 / Ane): grounding Jon's (STENT-1, the `player_proxy`) deflect/withdraw choices `CHC-13`/`CHC-15` in his own freshly-introduced exposure-anxiety `STEMO-5` failed the firewall. The author was forced to drop the `STEMO` citation, which is a weaker grounding than the CHC-grounding discipline (`story-state-contract.md` §11a, `phase-8-choice-generation.md`) prefers: "Choices grounded materially in active … emotion (`STEMO`) … MUST cite the relevant record."

This makes the entire non-player-driven-turn class unable to ground player-response choices in any record freshly introduced by that same event for the player-proxy — directly weakening choice grounding for exactly the turns where initiative passes to the world.

## Assumption Reassessment (2026-05-29)

1. **Code**: `tools/validators/src/structural/introduction-observer-firewall.ts:69` computes `const actor = actorForChoice(choiceParsed) ?? actorForEvent(parsed);`. `actorForChoice` (`:124`) reads `choice.actor` and a singleton `choice.available_to`; **neither field exists on the `CHC` schema** (`tools/validators/src/schemas/story-choice.schema.json` properties: `created_at_page, grounded_in, id, likely_state_pressure, player_visible_intent, record_kind, story_id, success_policy, supersedes, surface_label, target_or_action_families`). So `actorForChoice` always returns `undefined` for current CHC records and the code falls back to `actorForEvent` = `SE.actor`. `actorForChoice` is a vestigial hook for a per-CHC actor field that the schema never shipped.
2. **Docs/spec**: `story-state-contract.md` §11a ("Non-player driver discipline") states emitted CHCs are "for the player's response side"; `STORY_KERNEL.md` `## Player Agency Contract` names the agency surface (`player_agency_surface: [STENT-1]`). The player-proxy is also discoverable structurally: `STENT.role_in_story` includes the closed enum value `player_proxy` (`tools/validators/src/schemas/story-entity.schema.json:21`).
3. **Shared boundary under audit**: the contract between `SE.actor`, the emitted `CHC` set, and the firewall's notion of "the acting entity." For a turn-resolution event, the acting entity of an emitted choice is the player-proxy, not necessarily the event actor.
4. **FOUNDATIONS principle**: §Story Bundles §6b — "Storylet selection, emitted choices, and character actions must not rely on information unavailable to **the acting entity**." For an emitted choice the acting entity is the entity who would perform it (the player-proxy), so resolving choice access against `SE.actor` (an NPC on non-player turns) is the misalignment this ticket corrects. The fix tightens, not weakens, the firewall: it continues to require an access route, only against the correct actor.
8. **Adjacent contradiction**: `actorForChoice`'s dependence on non-existent CHC fields is a latent bug independent of the npc-turn symptom; resolving it here is a required consequence, not a separate ticket.

## Architecture Check

1. Resolving the player-proxy from indexed `STENT.role_in_story` (rather than re-introducing a per-CHC `actor` field) avoids a schema amendment, keeps `CHC` minimal per §5b, and is robust because the proxy is already first-class story state. It is cleaner than adding a `CHC.actor` field (which would duplicate agency-surface information already in STENT + STORY_KERNEL and burden every CHC).
2. No backwards-compatibility shim: `actorForChoice`'s dead `choice.actor` / `choice.available_to` branches are removed, not aliased.

## Verification Layers

1. Player-response choice may ground in a same-event-introduced record the player-proxy holds → validator unit test (npc_action event; player-proxy STENT holds a fresh STEMO cited in a CHC; expect PASS).
2. A choice grounding in a fresh record that *neither* the player-proxy *nor* (for player-driven turns) the event actor can access still fails → validator unit test (expect `intro_observer_no_access_route`).
3. Player-proxy resolution is structural → codebase grep-proof that resolution reads `STENT.role_in_story` containing `player_proxy`, not a CHC field.
4. FOUNDATIONS alignment → §6b "acting entity" cited; firewall still requires an access route for the resolved actor.

## What to Change

### 1. Resolve the emitted-choice acting entity as the player-proxy for turn-resolution events

In `introduction-observer-firewall.ts`, when validating emitted choices of a `turn_resolution` event, resolve the choice actor as the bundle's player-proxy STENT — the active `STENT` whose `role_in_story` includes `player_proxy` (there is normally exactly one; if more than one, apply the check to each as a permissive disjunction: a choice passes if any player-proxy has access). Use `SE.actor` only as a fallback when no `player_proxy` STENT is resolvable.

### 2. Remove the dead `actorForChoice` field reads

Drop the `choice.actor` and `choice.available_to` branches (CHC carries neither). If a future per-CHC actor field is ever added, reintroduce via a schema amendment first.

## Files to Touch

- `tools/validators/src/structural/introduction-observer-firewall.ts` (modify)
- `tools/validators/tests/.../introduction-observer-firewall.test.ts` (modify/add — path per existing test layout)

## Out of Scope

- The `turn_driver_pov_observer_firewall` breadth question (tracked in `TDPOV-001`).
- Adding any field to the `CHC` schema.
- Inferential (non-explicit-record-reference) access — Wave 2 scope is explicit-record-reference only and stays unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: `npc_action` event by an NPC; the `player_proxy` STENT holds a freshly-introduced `STEMO` (in `SE.record_introductions[]`) cited in a CHC's `grounded_in.records` → validator PASS.
2. New unit test: same shape but the fresh record is held by a third party neither the player-proxy nor the event actor can access → `intro_observer_no_access_route`.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root . <a regenerated npc-driven turn envelope citing the proxy's fresh STEMO>` → `status: pass`.

### Invariants

1. Emitted-choice observer-firewall access is always evaluated against the player-proxy (acting entity), never against an NPC event actor.
2. The firewall still rejects choices grounded in fresh records that the resolved actor cannot access (no weakening).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/introduction-observer-firewall.test.ts` — add the two cases above; rationale: lock the player-proxy resolution and the still-failing negative case.

### Commands

1. `npm test --workspace tools/validators -- introduction-observer-firewall` (or the repo's validator test runner) — targeted.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root . /tmp/<npc-turn-envelope>.json` — full pre-apply path.

## Implementation Notes (2026-05-29)

- `introduction-observer-firewall.ts`: emitted-choice access now resolves against `resolveChoiceActors()` — for a `turn_resolution` event the active `player_proxy` STENT(s) (resolved structurally from `STENT.role_in_story`, superseded STENTs excluded), falling back to `SE.actor` only when no proxy is resolvable or the event is not a turn resolution. Multiple proxies are a permissive disjunction (a choice passes if any proxy has access). The vestigial `actorForChoice` (`choice.actor` / `choice.available_to`) reads were removed — CHC carries neither field (`additionalProperties: false`).
- **Engine capability gap fixed (aligned with FOUNDATIONS §6b):** `actorHasRecordIntrinsicAccess` had no `story_emotion_record` branch, so even after resolving the player-proxy a choice grounding in the proxy's *own* fresh STEMO would still fail. Added: an entity always has access to its own interior emotion (`STEMO.holder === actor`). This is required for AC#1 and is the exact `red-bunny` PG-2→PG-3 symptom (`CHC-13`/`CHC-15` grounding `STEMO-5`).
- Tests: `tools/validators/tests/structural/introduction-observer-firewall.test.ts` rewritten to the new model (CHC fixtures no longer carry `available_to`; actors designated via player_proxy STENT records / `SE.actor`). Added AC#1 (proxy's own fresh STEMO on `npc_action` → PASS), AC#2 (third-party-held fresh STEMO → `intro_observer_no_access_route`), plus edge cases: multi-proxy disjunction, superseded-proxy exclusion, and SE.actor fallback (accept + reject). Updated integration bullet 16 in `spec43-midstory-introduction.test.ts`. Full validators suite (1077) and world-mcp suite (509) green.
