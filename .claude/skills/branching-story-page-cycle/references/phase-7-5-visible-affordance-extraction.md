# Phase 7.5: Declared-Affordance Validation

Reference for `branching-story-page-cycle` Phase 7.5, the deterministic post-Phase-7 step that validates the plan's declared `declared_visible_affordances[]` frontmatter array against story-bundle state, then forwards the validated Visible Affordance Map to Phase 8 as additional choice-generation anchors.

This phase runs after Phase 7's plan-authoring and plan-completeness check, and before Phase 8's choice generation. It does not write to disk; the Visible Affordance Map is a memory-only working-buffer artifact consumed by Phase 8 and discarded.

Post-rework, Phase 7.5 is deterministic frontmatter-readout rather than LLM prose-parsing. The plan author (LLM) declares the visible affordances explicitly in `frontmatter.declared_visible_affordances[]`; Phase 7.5 verifies each declaration resolves to a real state id or a record this turn has already planned to create. There is no parse-from-prose ambiguity to debug, and no "the prose accidentally introduced an ungrounded object" failure class at plan commit.

---

## Inputs

- The Phase 7 plan buffer: the populated copy of `.claude/skills/_shared-templates/page-plan.md` not yet written to disk. Specifically, `frontmatter.declared_visible_affordances[]`.
- The current and next page state surfaces: parent `state_snapshot`, the computed next `state_snapshot` from Phase 5, `cast_present`, `current_location`, `accessible_locations`, `objects_in_scope`, open obligations, active threads, current intentions, known secrets/facts visible to POV, relationship state visible in the scene, and the working buffer's `mysteries_in_play[]`.
- Newly-created or superseding records planned this turn by Phase 5: SF / STOBJ / STLOC / SREL / DA / OBL / THR / STINT records that will be present in the Phase 11 envelope if this page is accepted.
- The selected arc record (the `SLT-NNNN` Phase 4 picked) and the chosen variant's `required_effects[]`.
- The Phase 6 governor nudge and Phase 6.5 closure-readiness signal.

## Process

For each entry in `frontmatter.declared_visible_affordances[]`, validate the declared `mapped_state_id` against state by `affordance_type` and `grounding_source`:

| Affordance type | mapped_state_id must resolve in | grounding_source must equal | Reject if unresolvable |
|---|---|---|---|
| `actor` | STENT id from `cast_present` (next snapshot), or a newly-entering STENT planned this turn | `cast_present` | Re-prompt Phase 7: ungrounded actor declared |
| `object` | STOBJ id from `objects_in_scope` or `inventory_by_entity` (next snapshot), or a planned STOBJ / DA record | `objects_in_scope` | Re-prompt Phase 7: ungrounded object declared |
| `location` | STLOC id from `accessible_locations` or `current_location` (next snapshot), or a planned STLOC record | `accessible_locations` | Re-prompt Phase 7: ungrounded location declared |
| `exit` | STLOC id from `accessible_locations` (next snapshot), or a planned STLOC record | `accessible_locations` | Re-prompt Phase 7: ungrounded exit declared |
| `tension` | OBL id from `obligations_open` OR THR id from `threads_active` OR SREL id from `relationships_current` OR STINT id from `intentions_current` OR M id from `mysteries_in_play` (next snapshot or planned this turn) | `obligations_open` / `threads_active` / `mysteries_in_play` | Re-prompt Phase 7: ungrounded tension declared |
| `question` | OBL id from `obligations_open` OR M id from `mysteries_in_play` (belief gap routed through `reader_known_facts` also legal) | `obligations_open` / `mysteries_in_play` | Re-prompt Phase 7: ungrounded question declared |

Output: the Visible Affordance Map, a list of `(affordance_text, affordance_type, mapped_state_id, grounding_source, validation_status)` tuples. `validation_status: grounded` for entries that resolved; `validation_status: ungrounded` for entries that did not (which also fail Phase 7.5 and re-prompt Phase 7).

## Routing

- All declared affordances resolved: Phase 8 receives the Visible Affordance Map as an additional input alongside `state_snapshot`, the selected arc's `choice_templates` / commitment-class affordances, `governor_nudge`, and closure-readiness signal. Phase 8's choice-surface gate may now produce a CHC anchored on a plan-declared affordance when it also satisfies choice-worthiness and continuation capacity.
- Any declared affordance fails to resolve: re-prompt Phase 7 with the explicit constraint: `the plan declared an ungrounded <actor/object/location/exit/tension/question> with mapped_state_id=<id>; either ground it in state by adding the corresponding STOBJ/STENT/STLOC/etc. at Phase 5 retroactively, or re-author the plan with corrected declared affordances`. Up to 3 Phase-7-cycle re-prompts share the existing Phase 7 budget; if exhausted, escalate to the user with the unmapped affordances inlined.
- Mystery-risk affordance: do not convert it into a choice anchor. Route through Phase 4.5 authority classification and Phase 9 mystery firewall. Forbidden-status M remains unresolved.
- Empty `declared_visible_affordances[]` array: legal when entry pressure is built from atmospheric / interiority framing alone, but operationally thin for a runtime page tick. Phase 7.5 emits an empty Visible Affordance Map and Phase 8 proceeds from `state_snapshot`, obligations, threads, the selected arc's storylet template affordances, and the governor nudge. The Phase 10 deliverable summary flags this as a NOTE (not a halt) so the user can elect ACCEPT or REVISE-narrow back to Phase 7.

## Phase 8 Contract

The map is an anchor source, not a prescription. Phase 8 still enforces hard preconditions, CHC choice-worthiness, strong-axis collective difference, `choice_contract`, `likely_effects`, `continuation_capacity`, and all Phase 9 validation gates.

If a grounded visible affordance is ignored by every surviving CHC, prefer a valid CHC anchored on that affordance over a purely storylet-template-driven option when doing so preserves:

- the CHC's hard preconditions;
- populated `choice_worthiness`, including at least one `strong_axes` entry for ordinary scene-commitment CHCs;
- a menu that collectively differs across at least two distinct `strong_axes`;
- high-salience OBL coverage;
- populated `choice_contract`;
- non-empty `likely_effects`;
- populated `continuation_capacity` with seed-storylet or JIT evidence.

## Memory-Only Boundary

The Visible Affordance Map is discarded after Phase 8. It is not persisted to PG, CHC, SLT, SF, OBL, THR, SREL, STINT, DA, BR, `pages-prose-plans/`, `pages-prose/`, or `INDEX.md`. If an affordance needs durable state, that state must be represented by the existing Phase 5 / Phase 7 claim-record path before the map feeds Phase 8.

---

## Cross-references

- Canonical plan template (frontmatter shape for `declared_visible_affordances[]`): `.claude/skills/_shared-templates/page-plan.md`
- Phase 7 plan authoring (where the affordances are first declared): `references/phase-7-page-plan.md`
- Phase 8 choice generation (consumer of the Visible Affordance Map): `references/phase-8-choice-generation.md`
- Bootstrap analogue (root-case shape, same validation logic): `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`
