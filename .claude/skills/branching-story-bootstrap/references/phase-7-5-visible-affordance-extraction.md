# Phase 7.5: Declared-Affordance Validation

Reference for `branching-story-bootstrap` Phase 7.5, the deterministic post-Phase-7 step that validates the plan's declared `declared_visible_affordances[]` frontmatter array against story-bundle state, then forwards the validated Visible Affordance Map to Phase 8 as additional choice-generation anchors.

This phase runs after Phase 7's plan-authoring and plan-completeness check, and before Phase 8's delegated choice generation. It does not write to disk; the Visible Affordance Map is a memory-only working-buffer artifact consumed by Phase 8 and discarded.

Post-rework, Phase 7.5 is deterministic frontmatter-readout rather than LLM prose-parsing. The plan author (LLM) declares the visible affordances explicitly in `frontmatter.declared_visible_affordances[]`; Phase 7.5 verifies each declaration resolves to a real state id. There is no parse-from-prose ambiguity to debug, and no "the prose accidentally introduced an ungrounded object" failure class at plan commit.

---

## Inputs

- The Phase 7 plan buffer: the populated copy of `.claude/skills/_shared-templates/page-plan.md` not yet written to disk. Specifically, `frontmatter.declared_visible_affordances[]`.
- `PG-0001.state_snapshot`: `cast_present`, `current_location`, `accessible_locations`, `objects_in_scope`, `intentions_current`, `threads_active`, `obligations_open`, `reader_known_facts`, and the working buffer's `mysteries_in_play[]`.
- The Phase 7 entry-pressure framing (§15-alt of the plan) and seed-pool `commitment_class` affordances: the upstream commitment anchors.

## Process

For each entry in `frontmatter.declared_visible_affordances[]`, validate the declared `mapped_state_id` against state by `affordance_type` and `grounding_source`:

| Affordance type | mapped_state_id must resolve in | grounding_source must equal | Reject if unresolvable |
|---|---|---|---|
| `actor` | STENT id from `cast_present` | `cast_present` | Re-prompt Phase 7: ungrounded actor declared |
| `object` | STOBJ id from `objects_in_scope` | `objects_in_scope` | Re-prompt Phase 7: ungrounded object declared |
| `location` | STLOC id from `accessible_locations` or `current_location` | `accessible_locations` | Re-prompt Phase 7: ungrounded location declared |
| `exit` | STLOC id from `accessible_locations` | `accessible_locations` | Re-prompt Phase 7: ungrounded exit declared |
| `tension` | OBL id from `obligations_open` OR THR id from `threads_active` OR M id from `mysteries_in_play` | `obligations_open` / `threads_active` / `mysteries_in_play` | Re-prompt Phase 7: ungrounded tension declared |
| `question` | OBL id from `obligations_open` OR M id from `mysteries_in_play` (belief gap routed through reader_known_facts also legal) | `obligations_open` / `mysteries_in_play` | Re-prompt Phase 7: ungrounded question declared |

Output: the Visible Affordance Map, a list of `(affordance_text, affordance_type, mapped_state_id, grounding_source, validation_status)` tuples. `validation_status: grounded` for entries that resolved; `validation_status: ungrounded` for entries that did not (which also fail Phase 7.5 and re-prompt Phase 7).

## Routing

- All declared affordances resolved: Phase 8 receives the Visible Affordance Map as an additional input alongside `state_snapshot` and the entry-pressure framing. Phase 8's choice-surface gate may now produce a CHC anchored on a plan-declared affordance when it also satisfies choice-worthiness and continuation capacity.
- Any declared affordance fails to resolve: re-prompt Phase 7 with the explicit constraint: `the plan declared an ungrounded <actor/object/location/exit/tension/question> with mapped_state_id=<id>; either ground it in state by adding the corresponding STOBJ/STENT/STLOC at Phase 5 retroactively, or re-author the plan with corrected declared affordances`. Up to 3 Phase-7-cycle re-prompts share the existing Phase 7 budget; if exhausted, escalate to the user with the unmapped affordances inlined.
- Empty `declared_visible_affordances[]` array: legal at the root case when entry pressure is built from atmospheric framing alone. Phase 7.5 emits an empty Visible Affordance Map. Phase 8 proceeds from `state_snapshot`, obligations, threads, and seed-pool commitment affordances. This is the tone-only opening case, rare but legitimate; no re-prompt fires.

## Failure Mode

If the plan declares zero visible affordances AND the entry pressure framing in §15-alt does not name an obligation / thread / mystery, the deliverable is structurally legal but operationally thin. Surface this to the user at Phase 10's deliverable summary as a NOTE (not a halt): `"Plan declares no visible affordances; Phase 8 will generate choices purely from state and seed-pool commitment classes"`. The user may choose to accept or to REVISE-narrow back to Phase 7 with a directive to declare at least one visible affordance.

---

## Cross-references

- Canonical plan template (frontmatter shape for `declared_visible_affordances[]`): `.claude/skills/_shared-templates/page-plan.md`
- Phase 7 plan authoring (where the affordances are first declared): `references/phase-7-root-page-plan.md`
- Phase 8 initial choice generation (consumer of the Visible Affordance Map): `references/phase-8-choice-generation.md`
- Phase 9.5 `plan_self_containment` check (verifies the declared affordances are also inlined in the plan body's §13 / §10 / §11 / §7): `references/phase-9-5-bootstrap-discipline-validator.md`
