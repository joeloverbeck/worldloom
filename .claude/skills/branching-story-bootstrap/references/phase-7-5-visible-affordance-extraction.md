# Phase 7.5: Visible Affordance Extraction

Reference for `branching-story-bootstrap` Phase 7.5, the deterministic post-Phase-7 step that parses the rendered PG-0001 prose for visible affordances and maps each to a state id or rejects it as ungrounded, feeding the result to Phase 8 as additional choice-generation anchors.

This phase runs after Phase 7's prose render and post-LLM cross-check and before Phase 8's delegated choice generation. It does not write to disk; the Visible Affordance Map is a memory-only working-buffer artifact consumed by Phase 8 and discarded.

---

## Inputs

- The Phase 7 prose buffer: PG-0001.md as rendered, not yet written to disk.
- `PG-0001.state_snapshot`: `cast_present`, `current_location`, `accessible_locations`, `objects_in_scope`, `intentions_current`, `threads_active`, `obligations_open`, and `reader_known_facts`.
- The selected root storylet's `choice_templates`: the upstream choice anchors.

## Process

For each visually salient element the prose emphasizes, attempt to map it to a state id:

| Affordance type | Map to | Reject if ungrounded |
|---|---|---|
| Named character actor / addressee | STENT id from `cast_present` | Re-prompt Phase 7: ungrounded actor |
| Named object emphasized in prose | STOBJ id from `objects_in_scope` | Re-prompt Phase 7: ungrounded object |
| Named location reference: door, exit, named place | STLOC id from `accessible_locations` or `current_location` | Re-prompt Phase 7: ungrounded location |
| Visible tension: unspoken offer, pending threat, withheld information | Existing OBL / THR / SREL / mystery-edge in state | Allowed; Phase 8 maps it to an existing tension |
| Question explicitly asked or implied by the prose | Existing OBL / mystery-edge / belief gap | Allowed |
| Exit / next-move possibility | `accessible_locations` plus `cast_present` | Re-prompt Phase 7: ungrounded exit |

Output: the Visible Affordance Map, a list of `(affordance_text, mapped_state_id_or_rejection_reason)` pairs.

## Routing

- All affordances grounded: Phase 8 receives the Visible Affordance Map as an additional input alongside `state_snapshot` and the storylet's `choice_templates`. Phase 8's diversification and consequence-capacity contract may now produce a CHC anchored on a prose-emphasized affordance that the storylet template did not enumerate.
- Any affordance ungrounded: re-prompt Phase 7 with the explicit constraint: `the prose introduced an ungrounded <object/actor/location>; either ground it in state by adding the corresponding STOBJ/STENT/STLOC at Phase 5 retroactively, or re-render without it`. Up to 3 Phase-7-cycle re-prompts share the existing Phase 7 budget; if exhausted, escalate to the user with the unmapped affordances inlined.
- Atmospheric prose with no specific affordance: no entry in the map; Phase 8 falls back to its standard state and storylet inputs.

## Failure Mode

If the prose is purely atmospheric, with no object, exit, actor address, or question, and the selected storylet's beat is naturally complete, Phase 7.5 emits an empty Visible Affordance Map. Phase 8 proceeds as today. This is the tone-only opening case, rare but legitimate; no re-prompt fires.
