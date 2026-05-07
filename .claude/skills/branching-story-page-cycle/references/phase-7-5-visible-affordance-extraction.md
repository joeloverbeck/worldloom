# Phase 7.5: Visible Affordance Extraction

Reference for `branching-story-page-cycle` Phase 7.5, the deterministic post-Phase-7 step that parses the rendered page prose for visible affordances and maps each to state ids or explicit rejection/routing reasons before Phase 8 emits CHCs.

This phase runs after Phase 7's prose render, prose critic, post-render claim classification, and fail-fast checks, and before Phase 8 choice generation. It does not write to disk; the Visible Affordance Map is a memory-only working-buffer artifact consumed by Phase 8 and discarded.

---

## Inputs

- The Phase 7 prose buffer: the next page's prose as rendered, not yet written to `pages-prose/PG-NNNN.md`.
- The current and next page state surfaces: parent `state_snapshot`, the computed next `state_snapshot`, `cast_present`, `current_location`, `accessible_locations`, `objects_in_scope`, open obligations, active threads, current intentions, known secrets/facts visible to POV, and relationship state visible in the scene.
- Newly-created or superseding records planned this turn by Phase 5 and Phase 7 claim classification: SF / STOBJ / STLOC / SREL / DA / OBL / THR / STINT records that will be present in the Phase 11 envelope if this page is accepted.
- The selected storylet and its `choice_templates`.
- The Phase 6 governor nudge and Phase 6.5 closure-readiness signal.

## Process

For each visually or psychologically salient element the prose emphasizes, attempt to map it to a state id or a record that this turn has already planned to create:

| Affordance type | Map to | Route if ungrounded |
|---|---|---|
| Named character actor / addressee | STENT id from `cast_present`, or a newly-entering STENT/SF state record planned this turn | Re-prompt Phase 7: ungrounded actor or unsupported cast entry |
| Named object emphasized in prose | STOBJ id from `objects_in_scope`, inventory, location state, or a planned STOBJ / DA record | Route through Phase 7 claim classification if load-bearing and recordable this turn; otherwise re-prompt Phase 7 to remove |
| Named location reference: door, exit, named place | STLOC id from `accessible_locations`, `current_location`, or a planned STLOC record | Route through the existing claim-record path when the location/exit is being created this turn; otherwise re-prompt Phase 7 |
| Visible tension: offer, threat, withheld information, emotional rupture | Existing or planned OBL / THR / SREL / STINT / mystery-edge in state | Allowed when grounded; otherwise re-prompt Phase 7 or escalate if it implies unauthorized mystery resolution |
| Question explicitly asked or implied by the prose | Existing or planned OBL / THR / mystery-edge / belief gap | Allowed when grounded; mystery-resolution risk routes through Phase 4.5 and Phase 9, not Phase 8 |
| Exit / next-move possibility | `accessible_locations`, current cast, planned STLOC/STOBJ/DA affordance, or closure-readiness branch option | Re-prompt Phase 7: ungrounded exit or impossible move |

Output: the Visible Affordance Map, a list of `(affordance_text, affordance_type, mapped_state_id_or_planned_record_id, grounding_source, phase_8_hint)` entries. Rejected affordances record `(affordance_text, rejection_reason, routing_phase)` for the Phase 7 re-prompt or escalation trail.

## Routing

- All load-bearing affordances grounded: Phase 8 receives the Visible Affordance Map as an additional input alongside `state_snapshot`, the selected storylet's `choice_templates`, `governor_nudge`, and closure-readiness signal. Phase 8 may emit CHCs anchored on prose-emphasized affordances that the storylet template did not enumerate.
- Ungrounded actor/object/location/exit: route back to Phase 7 with the explicit constraint: `the prose introduced an ungrounded <actor/object/location/exit>; either route it through the existing load-bearing claim-record path before Phase 8, or re-render without it`. This shares the existing Phase 7 re-prompt budget; it does not create a new budget.
- Mystery-risk affordance: do not convert it into a choice anchor. Route through Phase 4.5 authority classification and Phase 9 mystery firewall. Forbidden-status M remains unresolved.
- Purely atmospheric prose with no specific action affordance: emit an empty Visible Affordance Map and proceed to Phase 8 with the standard state/storylet/governor inputs.

## Phase 8 Contract

The map is an anchor source, not a prescription. Phase 8 still enforces hard preconditions, CHC v2 choice-worthiness, strong-axis collective difference, `choice_contract`, `likely_effects`, `continuation_capacity`, and all Phase 9 validation gates.

If a grounded visible affordance is ignored by every surviving CHC, prefer a valid CHC anchored on that affordance over a purely storylet-template-driven option when doing so preserves:

- the CHC's hard preconditions;
- populated `choice_worthiness`, including at least one `strong_axes` entry for ordinary scene-commitment CHCs;
- a menu that collectively differs across at least two distinct `strong_axes`;
- high-salience OBL coverage;
- populated `choice_contract`;
- non-empty `likely_effects`;
- populated `continuation_capacity` with seed-storylet or JIT evidence.

## Memory-Only Boundary

The Visible Affordance Map is discarded after Phase 8. It is not persisted to PG, CHC, SLT, SF, OBL, THR, SREL, STINT, DA, BR, `pages-prose/`, or `INDEX.md`. If an affordance needs durable state, that state must be represented by the existing Phase 5 / Phase 7 claim-record path before the map feeds Phase 8.
