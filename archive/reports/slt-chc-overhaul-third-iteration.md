**Status**: COMPLETED

# **1. Executive verdict**

The post-SPEC-79/80/81/82 architecture is **basically right**. The major conceptual flaw from the previous iteration—direct CHC-to-SLT coupling through `CHC.associated_commitment_block`—has been removed. Current `CHC` records are player-facing affordance/intent/grounding records; the actual selected storylet now lives in `SE.commitment.selected_slt_id`, with `selection_source` and `alias_bindings` carrying trace closure. The current implementation is much closer to the architecture Worldloom should keep.

The right next architecture is **not** a sweeping redesign. It is a hardening pass around the landed design:

parent PG snapshot  
 -> Phase 0 local driver evaluation  
 -> projection-only SLT candidate retrieval  
 -> deterministic legality checks: scope, branch, driver, predicate shape, active records, mystery/canon, cooldown  
 -> full-body fetch for shortlist only  
 -> turn-cycle predicate / alias / observer-firewall evaluation  
 -> selected or JIT SLT  
 -> SE.commitment.selected_slt_id + alias_bindings + state_delta  
 -> child PG snapshot + page plan §7a driver trace  
 -> emitted CHCs as next-page player-facing affordances

Breaking changes are **not warranted** for `CHC`, `SLT.grounding`, or persistent selection-trace records. The live implementation order explicitly says SPEC-79/80/81/82 are complete, rejects a hybrid `CHC.binding` object, rejects rich SLT grounding, rejects a persistent `SSEL` record class, and treats live global-pool replay semantics as a consequence of removing direct CHC→SLT association. That rejection is now supported by live code: the simpler architecture works and is more schema-minimal.

What is incomplete is mostly proof and diagnostics, not core design:

* `select_storylet_candidates` proves projection-scale filtering with a 1,000-SLT synthetic pool, but not yet with a rich authored branching fixture.  
* Non-player drivers are schema- and validator-backed, but the only rich golden fixture is `npc_action` via Red Kiln Ambush. Offstage, clock, secret, and multi-actor collision need equivalent fixtures.  
* Replay/fork behavior for newer global SLTs is now conceptually correct, but it is not proven by a golden fixture.  
* There is a concrete bug/mismatch: the MCP cooldown filter currently blocks any previously selected SLT with `cooldown_pages > 0` forever, instead of honoring the numeric page window.

The preferred next iteration is: **preserve the landed minimal schema, fix the cooldown bug, add replay/fork and non-player-driver golden fixtures, strengthen validator diagnostics, and improve retrieval trace explainability without adding new record classes.**

# **2. Evidence discipline**

Mission prompt and manifest came from the uploaded files:

Repository metadata was resolved through the GitHub Git app. The repository is `joeloverbeck/worldloom`; current `main` resolves to the supplied target commit:

16a1b69bc326c12249f73abb9ec52dbf9aeba01c

The fetched commit metadata for `main` reports that exact SHA, so this audit uses `16a1b69` throughout.

No clone was used. No GitHub code search or snippet-based repository search was used as evidence. Repository search was used only to locate the installed repository; file evidence came from direct `fetch_file` calls at the verified SHA.

Directly fetched live files included:

docs/FOUNDATIONS.md  
docs/CONTEXT-PACKET-CONTRACT.md  
docs/HARD-GATE-DISCIPLINE.md  
docs/MACHINE-FACING-LAYER.md  
docs/ID-ALLOCATION.md  
docs/WORKFLOWS.md  
.claude/skills/_shared-templates/story-state-contract.md  
.claude/skills/_shared-templates/story-record-schemas.md

.claude/skills/branching-story-bootstrap/SKILL.md  
.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md  
.claude/skills/branching-story-turn-cycle/SKILL.md  
.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md  
.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md  
.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md  
.claude/skills/commitment-block-authoring/SKILL.md  
.claude/skills/branching-story-health-audit/SKILL.md  
.claude/skills/branching-story-prose-attach/SKILL.md  
.claude/skills/story-character-profile/SKILL.md

tools/validators/src/schemas/story-choice.schema.json  
tools/validators/src/schemas/story-storylet.schema.json  
tools/validators/src/schemas/story-event.schema.json  
tools/validators/src/schemas/story-page.schema.json  
tools/validators/src/schemas/story-plan.schema.json  
tools/validators/src/schemas/story-emotion.schema.json  
tools/validators/src/schemas/story-question.schema.json  
tools/validators/src/schemas/story-secret.schema.json  
tools/validators/src/schemas/story-pressure-clock.schema.json  
tools/validators/src/schemas/story-character-authority.schema.json

tools/validators/src/public/registry.ts  
tools/validators/src/structural/turn-driver-schema-compliance.ts  
tools/validators/src/structural/turn-driver-pov-observer-firewall.ts  
tools/validators/src/structural/active-pressure-handling-discipline.ts  
tools/validators/src/structural/page-plan-active-pressure.ts  
tools/validators/src/structural/slt-grounding-minimal-integrity.ts  
tools/validators/src/structural/slt-grounding-utils.ts  
tools/validators/src/structural/chc-slt-selected-commitment-trace.ts  
tools/validators/src/rules/rule_choice_set_noncollapse.ts

tools/world-index/src/schema/migrations/007_slt_projection_columns.sql  
tools/world-index/src/schema/types.ts  
tools/world-index/src/parse/atomic.ts  
tools/world-index/tests/storylet-projection-roundtrip.test.ts

tools/world-mcp/src/tools/select-storylet-candidates.ts  
tools/world-mcp/src/server.ts  
tools/world-mcp/src/context-packet/story-bundle-context.ts  
tools/world-mcp/tests/tools/select-storylet-candidates.test.ts  
tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts

tools/validators/tests/fixtures/red-kiln-ambush/README.md  
tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts  
tools/validators/tests/integration/spec79-chc-removal.test.ts  
tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts  
tools/validators/tests/schemas/story-storylet-grounding.test.ts

archive/reports/slt-chc-overhaul-second-iteration.md  
specs/IMPLEMENTATION-ORDER.md

Active reports were treated as context only. Live contracts, schemas, validators, MCP/index code, skills, and tests won whenever there was a conflict.

# **3. Current implemented architecture map**

## **Current SE / PG / SLT / CHC / STPLAN / STEMO / STCHAR flow**

Worldloom’s authority stack is now clear:

world canon  
 -> story state records  
 -> committed PG snapshot  
 -> page plan  
 -> optional rendered prose + prose receipt

Story state, not prose, is authoritative at page-plan commit. Any committed `PG` can be a fork parent, including a page whose prose has not been attached. `WORKFLOWS.md` states that branching is plan-first and that rendered prose and prose receipts are evidence/publication artifacts, not gates for future page planning.

`PG` is the snapshot primitive. It records parent/branch lineage, input, resolved event, state snapshot, emitted choices, continuation status, plan hash, state hash, and validation trace. Active records include `STPLAN`, `STEMO`, `CLK`, `STSEC`, `STQ`, `STCHAR`, and other story-state classes.

`SE` is the committed causal move. For `turn_resolution`, it requires `turn_driver` and `commitment`; for `story_start`, `prose_attach`, and promotion/closeout event kinds, `turn_driver` is forbidden. `SE.commitment` holds `selected_slt_id`, `selection_source`, and `alias_bindings`. Selection source can be player choice, author pool, runtime JIT, NPC initiative, offstage initiative, clock fire, world pressure, secret reveal, system repair, audit repair, or none.

`SLT` is the causal move template. It has scope, move family, preconditions, beats, effects, exits, salience, mystery policy, provenance, and minimal grounding. Scope is explicit: `global_author_pool`, `branch_prefix_scoped`, or `branch_scoped`.

`CHC` is no longer a storylet pointer. It is a player-facing choice surface with `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, and `grounded_in`. There is no `associated_commitment_block`.

`STPLAN` and `STEMO` are actor-local pressure records. `STPLAN` records holder, root intention, objective, current step, belief basis, blockers, resources, and status. `STEMO` records holder, trigger event, appraisal, orientation, affect kind, intensity, behavioral pressure, and agency effect.

`STCHAR` is durable story-local character authority, not current state. The story-character-profile skill explicitly says normal runtime skills consume active `STCHAR` profiles and must not use world `CHAR-*` as operational characterization authority; it also says ordinary `STEMO`, `BEL`, `STPLAN`, `STINT`, `SREL`, `STSTAT`, page events, and page-local prose are not regeneration reasons unless durably consolidated.

## **Current driver flow**

The turn-cycle skill now starts with Phase 0 due-driver evaluation. It supports `action_source_mode` values `resolve_selected_choice`, `resolve_write_in`, `advance_initiative`, and `repair_turn`. If a player action is present, it selects a player driver, but it still records high-urgency non-player pressure dispositions. If no player action is present, it selects the highest-urgency eligible non-player pressure; equal competing pressures can become `multi_actor_collision`.

Current `SE.turn_driver.kind` values are:

player_action  
player_write_in  
npc_action  
offstage_action  
world_pressure  
clock_fire  
secret_reveal  
multi_actor_collision

The schema has per-kind constraints: player drivers must have empty `driver_records`, `npc_action` must cite an active pressure/actor-authority record, `clock_fire` must cite a `CLK`, `secret_reveal` must cite `STSEC`, and `multi_actor_collision` must cite multiple driver records.

Registered validators enforce the driver layer:

turn_driver_schema_compliance  
turn_driver_pov_observer_firewall  
page_plan_turn_driver_consistency  
active_pressure_handling_discipline  
slt_grounding_minimal_integrity

These are present in the public registry, so they actually run through the validator surface.

## **Current SLT applicability pipeline**

Current turn-cycle Phase 2 does this:

1. Call select_storylet_candidates.  
2. Use projection-only shortlist, capped by max_candidates.  
3. Fetch full SLT bodies only for requires_full_body_ids.  
4. Apply full hard predicates against parent PG snapshot.  
5. Bind existential aliases.  
6. Enforce observer/mystery/canon legality.  
7. Enforce cooldown.  
8. Rank by driver fit, action-family fit, salience, urgency, and diversity.  
9. Select existing SLT or create branch-scoped runtime JIT SLT.  
10. Write selected_slt_id + alias_bindings into SE.commitment.

The skill explicitly says the MCP tool applies story scope, branch visibility, driver kind, optional action family, predicate shape/class, source-record id, mystery policy, cooldown, and salience/diversity filters, while full predicate evaluation and alias binding remain in the turn-cycle evaluator.

This split is sound. MCP/index does cheap symbolic prefiltering; turn-cycle does full legality and narrative judgment.

## **Current CHC binding / promise model**

The current promise model is:

CHC freezes:  
 - the player-facing surface label  
 - visible intent  
 - target/action families  
 - likely pressure direction  
 - accessible grounding records / affordance ordinals  
 - optional success_policy

CHC does not freeze:  
 - selected SLT  
 - actual alias bindings  
 - route outcome  
 - state_delta  
 - exact prose realization

The turn-cycle choice-generation reference is explicit: CHCs no longer bind to a specific SLT; they resolve late at the next turn cycle against the live pool filtered by the parent PG snapshot, action/target families, grounded records, and active state.

This is the correct model. A CHC is an intent/surface promise, not an outcome promise.

## **Current candidate retrieval / index pipeline**

`world-index` has an `slt_projections` table with compact columns:

node_id  
world_slug  
story_slug  
scope_visibility  
scope_branch_id  
scope_visible_branch_path_prefix  
provenance_origin  
move_family  
urgency  
cooldown_pages  
mystery_policy_allowed_authority  
candidate_projection_hash

It also indexes story/scope, move family, and salience.

SLT driver, predicate, predicate-class, and action-family data are projected as edges:

storylet_compatible_driver  
storylet_predicate_pred  
storylet_predicate_class  
storylet_action_family  
storylet_predicate_ref  
storylet_effect_ref  
storylet_exit_likely_effect_ref

The parser emits those edges from SLT bodies, and the machine-facing docs describe them as the storylet-candidate retrieval surface.

`select_storylet_candidates` takes `world_slug`, `story_slug`, `parent_page_id`, `turn_driver`, optional `intent_signature`, and `max_candidates`. It returns `filter_trace`, compact projection records, shortlisted IDs, and `requires_full_body_ids`; it never returns full SLT bodies.

The context packet integrates this: when a parent page is available, `story_bundle_context.selection_shortlist` carries a projection-only shortlist capped at 24, while the broader visible storylet summary is capped at 50.

## **Current validators and what they really enforce**

The validator surface is now substantial:

* `turn_driver_schema_compliance` enforces per-kind driver constraints and active parent-record membership.  
* `turn_driver_pov_observer_firewall` prevents non-player drivers from leaking hidden/offstage state under direct POV and requires BEL/access-route evidence for inferred/reported visibility.  
* `active_pressure_handling_discipline` checks high-urgency active pressure records against page-plan §7a selected/deferred/rejected dispositions.  
* `slt_grounding_minimal_integrity` enforces non-empty compatible drivers, valid driver enums, minimum `reason_to_exist`, banned generic phrases, and singleton JIT driver compatibility.  
* `chc_slt_selected_commitment_trace` validates selected SLT existence, active exact predicate references, existential alias bindings, bound effects, CHC grounding overlap, orphan aliases, and cross-branch alias hygiene.  
* `choice_set_noncollapse` detects full choice-set collapse by comparing action families, grounding records, and likely pressure, with rhetorical/expressive exceptions.

The validators are strong on structural lawfulness. They do **not** validate literary quality, which is correct.

## **Current tests and fixtures**

Current proof is meaningful but incomplete.

Proven:

* SPEC-79 removal: a capstone test greps tracked operational surfaces and ensures the retired `associated_commitment_block` field is absent except in historical/allowed contexts.  
* SPEC-81 retrieval: a synthetic 1,000-SLT pool proves projection filtering to a capped shortlist and full-body fetch only for shortlisted candidates.  
* SLT projection roundtrip: world-index tests prove projection columns and edges roundtrip.  
* Driver schema: schema tests cover representative driver kinds and invalid per-kind cases.  
* SLT grounding: schema tests require grounding and reject additional grounding properties.  
* Red Kiln Ambush: rich `npc_action` fixture verifies driver trace, page-plan §7a, active pressure handling, and post-SPEC-79 choices.

Not yet proven:

* replay/fork from an older page selecting a newer global SLT;  
* branch-scoped and branch-prefix-scoped SLT exclusion across sibling branches;  
* non-player driver fixtures for `offstage_action`, `clock_fire`, `secret_reveal`, and `multi_actor_collision`;  
* authored large-pool filtering, not just synthetic projection rows;  
* stale-choice resolution when the emitted CHC is still legal but a newer better-fitting global SLT exists;  
* cooldown window correctness.

# **4. What the previous recommendations now appear to have implemented / made obsolete**

## **Implemented recommendations**

The previous concern that `CHC.associated_commitment_block: SLT|null` remained required is now obsolete. The current `story-choice` schema has no such field; SPEC-79 tests enforce its removal from operational surfaces.

Driver-aware causality is implemented. `SE.turn_driver` exists with eight kinds and per-kind constraints; the turn-cycle has Phase 0 due-driver evaluation; Red Kiln proves `npc_action`; validators enforce driver schema, POV firewall, page-plan consistency, and active-pressure disposition.

Minimal `SLT.grounding` exists and is intentionally narrow: `compatible_turn_drivers[]` plus `reason_to_exist`, with `additionalProperties: false`. Richer grounding fields were explicitly rejected.

Indexed candidate retrieval exists. `select_storylet_candidates` is present, registered, integrated into context packets, and tested against a 1,000-SLT synthetic pool.

Storylet-pool coverage moved into bootstrap, commitment-block authoring, and health audit. Bootstrap now has driver-kind × pressure-source coverage gates, and health audit treats storylet-pool coverage as a Rule 5 consequence-capacity concern.

## **Partially implemented recommendations**

Replay/fork live global pool semantics are implemented by architecture but not sufficiently proven. The implementation order says a separate replay/fork spec was subsumed by CHC removal, but no golden fixture yet proves the behavior.

Non-player driver semantics are implemented structurally, but only `npc_action` has a rich fixture. The other driver kinds need their own authored tests.

Large-pool retrieval is implemented with projection filtering, but current proof is synthetic. That is acceptable for SPEC-81, not enough for long-term confidence.

## **Still-live recommendations**

The still-live work is:

- replay/newer-global-SLT golden fixture  
- branch-scoped and branch-prefix-scoped exclusion fixture  
- offstage/clock/secret/multi-actor driver fixtures  
- cooldown-window fix  
- candidate-retrieval diagnostic richness  
- authored large-pool fixture  
- deterministic stale-choice tests  
- non-player response-choice quality checks

## **Recommendations now proven wrong or unnecessary**

A hybrid `CHC.binding` object is no longer the right target. The direct association has been removed, and adding a new binding object would reintroduce the same temptation in a more elaborate form.

A persistent `SSEL` selection-trace record is unnecessary right now. `SE.commitment`, `alias_bindings`, `state_delta`, `CHC.grounded_in`, and MCP per-call `filter_trace` already carry the essential trace. The implementation order explicitly rejected `SSEL`, and live validators now enforce trace closure without it.

Rich SLT grounding is premature. The current `SLT.grounding` is intentionally minimal, and the fields previously proposed—pressure classes, role lanes, actor binding policy, source records—were rejected because no deterministic consumer justified them yet.

# **5. Research synthesis**

## **Storylets / quality-based narrative**

Emily Short’s definition of storylets—content units with prerequisites and effects—maps directly onto Worldloom’s `SLT` design. Her argument that storylets are “atomic, robust, and recombinable” and can be extended after they are written strongly supports Worldloom’s shift away from CHCs frozen to specific storylets.

The practical implication for Worldloom is clear: **newer global-author-pool SLTs should be eligible on replay/fork when they lawfully apply to the old parent snapshot.** Direct CHC→SLT binding was the anti-storylet design; SPEC-79 fixed it.

## **Interactive fiction and choice design**

Ink separates choice text from resulting flow and supports conditional/sticky choices and state tracking. Its docs explicitly distinguish choice presentation, flow, labels, and global variables, which supports Worldloom’s separation between CHC surface promise and later stateful resolution.

ChoiceScript uses variables to make scenes and decisions more than simple “choose a path” books; earlier choices can affect later story through state checks. That reinforces that choices can be intent inputs while consequences are mediated by current state.

Twine’s official homepage frames it as a tool for nonlinear stories extendable with variables and conditional logic; for Worldloom, the lesson is not “be Twine,” but “choice text, passage structure, and state variables are separable layers.”

## **Drama management / experience management**

Classic interactive-storytelling architectures often separate drama manager, user model, and agent model; the drama manager guides coherent narrative while the agent model handles character knowledge and behavior.

Façade is the cautionary comparison. It integrated believable agents and interactive plot with a drama manager that guided events toward dramatic tension/resolution. Worldloom should **not** import a global drama manager because FOUNDATIONS explicitly rejects act structure, target narrative shape, and global drama-manager rails. What Worldloom should keep is local experience management: driver selection is a local salience decision, not an imposed plot arc.

## **BDI / believable agents / affective agents**

BDI separates beliefs, desires/goals, intentions, and plans; it also separates plan selection from execution. That maps cleanly to Worldloom’s `BEL`, `STINT`, `STPLAN`, `STEMO`, `STCHAR`, and `SE.turn_driver` split.

The implication is: NPC initiative should not be menu inertia. An `npc_action` driver should cite actor-local belief/plan/emotion/pressure records, select an SLT compatible with that driver, and produce response CHCs. Worldloom’s current Red Kiln fixture proves the first slice of that.

## **GOAP / HTN / planning**

F.E.A.R.’s GOAP is relevant because it used goals, actions, preconditions, and effects to let NPCs choose plans at runtime rather than hand-code transitions. HTN planning likewise decomposes compound tasks into executable primitive actions under constraints and preconditions.

Worldloom should not become a planner. But SLT retrieval should continue to look planner-like: symbolic preconditions, effects, scope, driver kind, action families, active record classes, and cooldown before LLM judgment.

## **Multi-agent narrative planning**

Riedl and Young’s IPOCL work argues that successful narrative plans need both causal plot progression and character believability, with character actions perceived as intentional. This directly supports Worldloom’s driver-first architecture: non-player moves must cite local intentions, beliefs, emotions, clocks, threats, secrets, or questions.

The implication is that `world_logic_rationale` and `SE.turn_driver.driver_records` are not decorative. They are the minimum evidence that NPC/world pressure is causally and intentionally legible.

## **LLM agent memory/planning/retrieval systems**

Generative Agents separate memory storage, reflection, retrieval, and planning; the paper reports that observation, planning, and reflection each contribute to believability. For Worldloom, this supports separation between stable `STCHAR`, current `BEL`/`STPLAN`/`STEMO`, retrieved SLT candidates, and final narrative realization.

Recent LLM interactive drama work frames immersion and agency as central and uses reflection to align agent reactions with player intentions. Drama Llama is especially relevant: it combines storylet structures with LLM generation to keep authorial control while supporting responsiveness.

The implication is conservative: LLMs should judge narrative fit after symbolic filtering, not decide legality from the full pool.

## **Practical interactive narrative systems**

Practical systems converge on the same rule: keep player-facing surfaces, state, and content availability separate. Ink, ChoiceScript, and Twine all support state-mediated branching/availability; storylet systems support future extension and recombination.

Worldloom’s current architecture is aligned with that: CHC is surface/intent, SLT is causal move, SE is committed event, PG is snapshot, and MCP retrieves candidates rather than flooding context.

# **6. Current pain points**

## **Remaining CHC binding / promise risks**

The direct schema problem is solved. The remaining risk is **semantic overpromising**: a CHC label or `player_visible_intent` can still read like an outcome promise even though the schema no longer binds it to an exact storylet.

Bad CHC surface:

surface_label: "Force Maren to confess everything"  
player_visible_intent: "Maren will reveal the full conspiracy."

Better CHC surface:

surface_label: "Press Maren on the ledger"  
player_visible_intent: "Try to turn the ledger discrepancy into pressure she must answer."

The first promises an outcome. The second promises an attempt/intent.

## **Large storylet pool scaling**

The current retrieval pipeline is good enough for hundreds and probably low thousands, because it uses `slt_projections` plus edges and proves a 1,000-SLT synthetic pool.

The remaining risk is not “the LLM will see thousands of SLTs.” It will not. The risk is **diagnostic opacity** when lawful candidates are filtered out for compound reasons. `filter_trace` has counts, but future health/audit work needs better representative rejection reason samples per stage.

## **Replay/fork semantics**

The architecture now implies branch-safe live global pool. But no rich fixture proves it.

This is a serious test gap because replay/fork is the exact place where stale binding used to break the model.

## **Non-player driver storylet applicability**

`npc_action` is proven. The rest are not.

The biggest risk is `offstage_action`: it can easily leak hidden intent into player-visible prose unless the page plan and prose receipt are strict. The structural driver firewall handles page-commit-time direct leakage, but prose-attach does not yet have a specialized non-player-driver hidden-mind leak pass. That was explicitly deferred in implementation order.

## **Storylet generation diversity after SPEC-80**

SPEC-80 narrowed pool coverage to driver-kind × pressure-source-class. That was a good call. The 8-axis matrix from the old report would overfit and create checklist storylets.

Still, coverage can remain too shallow if a pool technically covers `clock_fire` but every clock storylet is “panic escalates” with no recovery, de-escalation, or aftermath moves. This should be health-audit warning territory, not schema law.

## **SLT grounding limits or overgrowth**

Current `SLT.grounding` is intentionally minimal and should stay that way. The pain point is not missing fields; it is **consumer discipline**. Any proposed grounding field must name its deterministic validator, MCP/index consumer, skill consumer, or replay purpose. No consumer, no field.

## **Choice quality**

`choice_set_noncollapse` catches full material collapse, but not:

- outcome-promising labels  
- fake agency under non-player initiative  
- all choices being different phrasings of submission  
- response choices that ignore the driver  
- stale affordances that are grounded but irrelevant

Some of that can be deterministic warnings. Most of it remains judgment-assisted review.

## **Player agency contract under non-player initiative**

The Player Agency Contract must distinguish:

player as initiator  
player as responder  
player as witness  
player as continuation confirmer  
player as constrained write-in author

The schema has `player_response_mode`, but the STORY_KERNEL agency contract needs clearer prose obligations so page plans and prose receipts evaluate the correct agency surface.

## **Validation blind spots**

The main blind spots are:

- replay/new-global behavior  
- branch-prefix exclusion on replay  
- cooldown window correctness  
- offstage/clock/secret/multi-driver fixtures  
- stale CHC semantic promise  
- response-choice relevance under non-player drivers  
- generic storylet spam beyond grounding.reason_to_exist  
- filter-trace explainability

## **Repo-specific bugs or mismatches found**

The MCP cooldown logic is wrong. It loads prior selected storylet IDs and then treats any prior occurrence as blocked whenever `cooldown_pages > 0`; it does not compare against the numeric cooldown window.

# **7. Architectural alternatives**

## **Alternative A — Preserve current implementation, fix bugs, add tests**

Description: Keep current CHC/SLT/SE schemas. Fix cooldown. Add golden fixtures and validator diagnostics.

CHC promise semantics: CHC remains intent/surface/grounding only.

Replay/fork behavior: branch-safe live global pool; branch-scoped records excluded by scope.

SLT filtering/scaling: current projection + edge + shortlist pipeline.

Non-player driver behavior: current driver-first flow.

Storylet generation policy: SPEC-80 coverage plus health warnings.

Validator implications: add no new record class; add targeted validators/tests.

Pros:

- Minimal schema churn.  
- Fits implementation order.  
- Preserves schema-minimalism.  
- Directly hardens real gaps.

Cons:

- Selection trace remains partly transient.  
- Some CHC semantic risks remain judgment-assisted.

Research support: strong. Storylet theory supports late availability; IF systems support state-mediated resolution; GOAP/BDI support symbolic action selection before execution.

Repository fit: excellent.

## **Alternative B — Enrich current implementation without breaking schema**

Description: Keep schemas, but add stronger health-audit diagnostics, page-plan §7a trace requirements, and candidate filter trace snapshots in non-schema artifacts.

CHC promise semantics: unchanged.

Replay/fork behavior: unchanged, but proven by fixtures.

SLT filtering/scaling: add better rejection summaries and authored large-pool tests.

Non-player driver behavior: add per-kind page-plan/prose audit expectations.

Storylet generation policy: add audit warnings for recovery/aftermath diversity without schema fields.

Validator implications: mostly warning-level validators and health-audit checks.

Pros:

- Best near-term practical route.  
- Avoids new record classes.  
- Makes failures explainable.

Cons:

- Non-schema traces are less machine-authoritative than records.

Research support: strong, especially from LLM-agent retrieval/planning separation and knowledge-graph-assisted storytelling.

Repository fit: excellent.

## **Alternative C — Add a compact persistent selection trace field to SE**

Description: Extend `SE.commitment` with a small `candidate_trace` object containing filter hash, candidate IDs considered, rejected counts, and final rationale.

CHC promise semantics: unchanged.

Replay/fork behavior: easier forensic replay.

SLT filtering/scaling: stronger diagnostics.

Non-player driver behavior: trace can record driver-specific filter reasons.

Storylet generation policy: unchanged.

Validator implications: schema change; validators must check trace consistency.

Pros:

- Better auditability.  
- Easier stale-choice debugging.

Cons:

- Breaks schema-minimalism unless a concrete consumer requires it.  
- Reopens the persistent-trace debate rejected in implementation order.  
- Can fossilize ranking internals.

Research support: mixed. Planning systems like traces; storylet systems benefit from extensibility. But Worldloom already has `SE.commitment` plus MCP `filter_trace`.

Repository fit: weak right now.

## **Alternative D — Reintroduce hybrid CHC binding object**

Description: Add `CHC.binding.mode` with `late_bound_intent`, `candidate_set`, `exact_slt`, `continuation_only`.

CHC promise semantics: explicit.

Replay/fork behavior: configurable.

SLT filtering/scaling: CHC could supply candidate list or intent signature.

Non-player driver behavior: CHCs can be witness/response/continuation surfaces.

Storylet generation policy: unchanged.

Validator implications: significant new validation.

Pros:

- Expressive.  
- Exact frozen choices become possible.

Cons:

- Reintroduces the coupling SPEC-79 removed.  
- Implementation order explicitly rejected it.  
- More machinery than current evidence justifies.

Research support: only partial. Some authored set pieces need exact binding, but storylet systems generally benefit from recombinability.

Repository fit: poor.

## **Alternative E — Rich SLT grounding / pattern-instance split**

Description: Add fields such as `pressure_source_classes`, `role_lanes`, `actor_binding_policy`, `required_active_record_classes`, `replay_policy`, and split reusable patterns from branch-local instances.

CHC promise semantics: unchanged.

Replay/fork behavior: richer policy possible.

SLT filtering/scaling: more indexed fields.

Non-player driver behavior: easier role-lane filtering.

Storylet generation policy: stronger matrix.

Validator implications: many new validators.

Pros:

- More expressive.  
- Could help large pools later.

Cons:

- Premature.  
- Current implementation order rejected rich grounding.  
- Pattern/instance split is a large redesign without evidence of current failure.

Research support: plausible from GOAP/HTN, but current Worldloom already gets the essential precondition/effect/predicate/class surface.

Repository fit: poor for now.

## **Alternative F — Server-side full predicate evaluation**

Description: Move hard predicate evaluation and alias binding into `select_storylet_candidates`.

CHC promise semantics: unchanged.

Replay/fork behavior: deterministic server-side legality.

SLT filtering/scaling: stronger shortlist, fewer full bodies.

Non-player driver behavior: cleaner.

Storylet generation policy: unchanged.

Validator implications: MCP must understand full predicate DSL and state snapshots.

Pros:

- Stronger determinism before LLM.  
- Better diagnostics.

Cons:

- Implementation order explicitly deferred it pending profiling evidence.  
- Duplicates turn-cycle evaluator complexity.  
- Risky because alias binding and observer firewall need full story-state context.

Research support: strong in planning systems; weaker in repository fit.

Repository fit: medium later, not now.

# **8. Recommended architecture**

Pick Alternative B on top of Alternative A:

Preserve the current implementation.  
Fix the cooldown bug.  
Add golden fixtures.  
Improve diagnostics.  
Do not add CHC.binding.  
Do not add SSEL.  
Do not expand SLT.grounding.  
Do not add a global drama manager.

Rejected alternatives are weaker because they solve problems the current architecture has already solved or create fields without deterministic consumers. The current implementation order’s rejections are not bureaucratic; they are architecturally correct under schema-minimalism.

## **What should happen to CHC binding semantics**

Keep current semantics:

CHC = player-facing affordance / intent / pressure surface.  
SE.commitment = selected causal move trace.  
SLT = reusable causal move template.

Do not add `CHC.binding`. Do not add `CHC.late_bound`. The absence of a selected SLT on CHC is the late-bound default.

## **Replay policy for newer global SLTs**

Adopt and prove:

When replaying/forking from older PG-X:  
 - load PG-X snapshot and branch path;  
 - consider current global_author_pool SLTs, including newer ones;  
 - reject global SLTs with exact branch-local record refs;  
 - accept only if predicates pass against PG-X snapshot;  
 - accept only if driver, action family, mystery/canon, cooldown, and observer-firewall checks pass;  
 - exclude unrelated branch_scoped SLTs;  
 - include branch_prefix_scoped SLTs only when PG-X branch path has the required prefix.

## **Non-player drivers selecting SLTs**

Every `turn_resolution` should have an SLT unless `selection_source: none` is used for schema-exception event kinds. Allowing driver-resolved events without storylets would undermine commitment trace closure.

Driver mapping:

npc_action:  
 selected SLT is the NPC’s committed move.

offstage_action:  
 selected SLT is an offstage causal packet; PG/prose reveal only player-accessible evidence.

world_pressure:  
 selected SLT is a world/pressure move from THR/OBL/CNSQ/CLK/etc.

clock_fire:  
 selected SLT is the threshold consequence packet.

secret_reveal:  
 selected SLT is the reveal mechanism under observer/mystery firewall.

multi_actor_collision:  
 selected SLT is a local collision resolution among active pressures, not global drama management.

repair_turn/audit_repair:  
 selected SLT repairs causal capacity or structural drift; it must still be lawful.

## **Large-pool filtering**

Recommended pipeline:

Stage 0: load parent PG snapshot and turn_driver.  
Stage 1: query slt_projections by story_slug + scope/branch.  
Stage 2: filter compatible driver edges.  
Stage 3: filter action-family edges from CHC/write-in intent_signature when present.  
Stage 4: filter predicate pred/class edges against active record classes and driver records.  
Stage 5: reject global SLTs with branch-local exact refs.  
Stage 6: reject mystery-policy conflicts.  
Stage 7: apply cooldown window correctly.  
Stage 8: rank by urgency, action fit, driver fit, branch locality, diversity.  
Stage 9: return projection shortlist only.  
Stage 10: fetch full bodies for shortlist.  
Stage 11: turn-cycle evaluates predicates, alias bindings, observer firewall, effects, and final narrative fit.

Embeddings should not be legality filters. They are only acceptable later as a diversity or semantic-neighbor pass after symbolic legality.

# **9. Concrete schema/contract changes**

## **`tools/validators/src/schemas/story-choice.schema.json`**

Current shape: CHC has surface/intention/action-family/pressure/grounding fields and no `associated_commitment_block`.

Proposed shape: **no schema change**.

Breaking impact: none.

Why: the schema is now correct.

Example valid record:

id: CHC-18  
story_id: STORY-1  
created_at_page: PG-7  
surface_label: "Press Maren on the ledger"  
player_visible_intent: "Try to turn the ledger discrepancy into pressure she must answer."  
target_or_action_families:  
 - investigate  
 - communicate  
likely_state_pressure: "May expose a contradiction or force Maren to redirect."  
grounded_in:  
 records:  
   - DA-3  
   - BEL-11  
 affordance_ordinals: [2]  
success_policy: attempt

Example invalid record:

id: CHC-19  
story_id: STORY-1  
created_at_page: PG-7  
surface_label: "Make Maren confess the conspiracy"  
player_visible_intent: "Maren will reveal everything."  
associated_commitment_block: SLT-44

Invalid because the retired field reappears and the wording promises an outcome.

## **`tools/validators/src/schemas/story-storylet.schema.json`**

Current shape: `grounding` contains only `compatible_turn_drivers[]` and `reason_to_exist`, with `additionalProperties: false`.

Proposed shape: **no schema change**.

Breaking impact: none.

Why: richer grounding remains unjustified without deterministic consumers.

Example valid grounding:

grounding:  
 compatible_turn_drivers:  
   - npc_action  
 reason_to_exist: "Lets an active actor plan force a visible response without treating the player as initiator."

Example invalid grounding:

grounding:  
 compatible_turn_drivers:  
   - npc_action  
 reason_to_exist: "advance the plot"  
 role_lanes:  
   - antagonist_pressure

Invalid because `reason_to_exist` is generic and `role_lanes` is not a current field.

## **`tools/validators/src/schemas/story-event.schema.json`**

Current shape: `SE.commitment` holds `selected_slt_id`, `selection_source`, and `alias_bindings`.

Proposed shape: **no schema change now**.

Breaking impact: none.

Why: persistent trace records/fields are not yet justified. Use page-plan §7a and validator diagnostics for now.

Example valid commitment:

commitment:  
 selected_slt_id: SLT-12  
 selection_source: npc_initiative  
 alias_bindings:  
   threatened_actor: STENT-4  
   pressure_plan: STPLAN-9  
   active_clock: CLK-3

Example invalid commitment:

commitment:  
 selected_slt_id: null  
 selection_source: npc_initiative  
 alias_bindings: {}

Invalid because non-`none` selection sources require a selected SLT.

## **`tools/validators/src/schemas/story-page.schema.json`**

Current shape: `PG.validation_trace` exists but does not persist full candidate retrieval trace.

Proposed shape: **no schema change**. Add fixture/test expectations around page-plan §7a and MCP `filter_trace`, not `PG` schema.

Breaking impact: none.

## **Shared story-state / record contracts**

Current shape: contracts already state bind-first/select-second/instantiate-third discipline and schema-minimalism.

Proposed contract additions, no schema change:

- CHC is never an outcome promise.  
- CHC is never an exact SLT promise unless a future schema explicitly reintroduces exact binding.  
- Replay/fork from old pages may see newer global_author_pool SLTs when lawful.  
- Branch-scoped SLTs are invisible outside their branch; branch-prefix-scoped SLTs are visible only inside the matching prefix.  
- Page-plan §7a must name candidate filtering summary for the selected driver: driver kind, candidate count before/after, selected SLT, and top rejection reason classes.

## **MCP/index edge/projection contracts**

Current shape: compact `slt_projections` plus edge projections.

Proposed change: fix cooldown semantics and enrich `filter_trace` diagnostics, not schema columns.

Example diagnostic shape:

filter_trace:  
 source_pool_count: 1000  
 after_scope: 740  
 after_driver: 118  
 after_action_family: 51  
 after_predicate_shape: 31  
 after_mystery_policy: 29  
 after_cooldown: 24  
 rejection_samples:  
   driver_mismatch:  
     - SLT-44  
   branch_scope_mismatch:  
     - SLT-81  
   cooldown_active:  
     - SLT-102

This is MCP response contract, not a persisted story record.

## **Player Agency Contract**

Current shape: loaded by prose-attach and required by story workflows.

Proposed addition:

### Player Agency Modes

On each page, the player-facing agency mode is one or more of:

- initiator: the player chooses the next action.  
- responder: a non-player/world/clock/secret pressure has acted; the player chooses how to respond.  
- witness: the player observes lawful consequences and may choose attention, interpretation, or next focus.  
- continuation_confirmer: the player confirms continuation after a terminal/near-terminal or constrained beat.  
- constrained_write_in_author: the player may propose an action inside the stated write-in envelope.

A CHC must not promise success, hidden knowledge, NPC interiority, or world-state outcomes beyond its visible intent and pressure direction.

# **10. Skill changes**

## **`branching-story-bootstrap`**

Keep SPEC-80 coverage gates. Add one more instruction: seed pools should include at least one recovery/de-escalation/aftermath-compatible SLT when the premise starts with acute threat. This should be a health warning unless the selected coverage profile says `standard`.

## **`branching-story-turn-cycle`**

Change:

- After select_storylet_candidates, record candidate filter summary in working memory.  
- In page-plan §7a, include driver kind, selected SLT, candidate-count summary, and whether JIT was needed.  
- Enforce cooldown window semantics once MCP is fixed.  
- For non-player drivers, ensure emitted CHCs use responder/witness/continuation language, not initiator language.

The skill already requires `select_storylet_candidates` and full-body fetch only for `requires_full_body_ids`.

## **`commitment-block-authoring`**

Keep projection-first pool diagnosis. Add an audit warning category for “coverage present but monotonous”:

driver kind covered, but all eligible SLTs share same move_family + action_family + no recovery/aftermath options.

Do not add schema fields.

## **`branching-story-health-audit`**

Add explicit findings:

cooldown_window_misapplied  
replay_global_slt_unproven  
branch_prefix_leakage  
non_player_driver_response_choices_weak  
candidate_filter_trace_missing  
authored_large_pool_unproven

The health audit already treats storylet-pool coverage as Rule 5 consequence-capacity evidence.

## **`branching-story-prose-attach`**

Add a non-player-driver prose warning pass:

non_player_hidden_mind_leak:  
 WARN when prose strongly implies offstage/NPC interiority not available to player POV;  
 FAIL when prose reveals hidden driver content contradicted by turn_driver.pov_visibility or §7a.

This should not mutate PG/SE. Prose-attach is already receipt-only and never mutates page state.

## **`story-character-profile`**

No change unless future validators need STCHAR role-lane projections. Keep the durable-authority boundary strict.

## **Shared templates**

Update the shared story-state contract and record-schemas template with:

- CHC surface promise doctrine.  
- Branch-safe live global SLT replay doctrine.  
- Page-plan §7a candidate-filter summary requirement.  
- Non-player agency modes.

# **11. MCP / index / retrieval changes**

## **What projections currently exist**

Current compact projection columns:

scope visibility  
scope branch id  
visible branch path prefix  
provenance origin  
move_family  
urgency  
cooldown_pages  
mystery-policy authority  
projection hash

Current edge projections:

compatible driver  
predicate pred  
predicate class  
action family  
exact predicate/effect refs  
selected storylet  
alias binding  
choice grounding

These are enough for the current architecture.

## **What new projections are needed**

No new columns are needed now.

Possible future column only if profiling demands it:

last_selected_page_by_branch_path

But even that is probably better computed through event/page history because cooldown is branch-history-dependent.

## **What SLT fields should be indexed**

Already indexed:

scope  
branch visibility  
move family  
urgency  
cooldown  
mystery policy  
compatible drivers  
predicate opcodes/classes  
action families  
exact predicate/effect refs

Do not index `reason_to_exist`; it is for validator/authoring anti-generic discipline, not retrieval.

## **Candidate filtering API**

Keep `select_storylet_candidates` but fix/enrich:

- honor cooldown_pages as a branch-window, not a forever ban;  
- include representative rejection samples by stage;  
- expose whether branch-prefix eligibility was matched by prefix;  
- expose global-author-pool branch-local-ref rejection count;  
- keep full bodies out of response.

## **Avoid loading thousands of full SLTs**

Current behavior already does this. SPEC-81 proves full-body reads are limited to shortlisted candidate IDs.

## **Selection traces**

Do not create `SSEL`. Use:

transient MCP filter_trace  
page-plan §7a summary  
SE.commitment.selected_slt_id  
SE.commitment.selection_source  
SE.commitment.alias_bindings  
validator diagnostics

## **Tests proving retrieval correctness**

Add:

tools/world-mcp/tests/integration/spec83-replay-live-global-storylets.test.ts  
tools/world-mcp/tests/integration/spec84-branch-scoped-storylet-exclusion.test.ts  
tools/world-mcp/tests/integration/spec85-authored-large-pool-filtering.test.ts  
tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts

# **12. Validator changes**

## **`candidate_filter_trace_shape`**

Severity: warning.

Applies to: story health audit and turn-cycle validation trace.

Required inputs:

parent PG  
turn_driver  
select_storylet_candidates response  
page-plan §7a

Failure codes:

candidate_filter_trace_missing  
candidate_filter_trace_selected_slt_mismatch  
candidate_filter_trace_no_rejection_counts

Example diagnostic:

PG-14 §7a names selected SLT-22, but candidate filter trace is absent; replay can prove selected_slt_id but not candidate retrieval discipline.

Suggested fix:

Re-run turn-cycle with select_storylet_candidates and include the filter summary in §7a.

Negative tests:

- page-plan §7a omits candidate counts  
- selected SLT not in shortlisted_candidate_ids  
- requires_full_body_ids exceeds max_candidates

## **`storylet_cooldown_window_lawfulness`**

Severity: hard fail for MCP unit tests; warning in health audit until fixed.

Required inputs:

parent PG branch path  
prior SE selected_slt_id history  
SLT.cooldown_pages  
candidate filter result

Failure codes:

cooldown_window_ignored  
cooldown_expired_but_rejected  
cooldown_active_but_allowed

Example diagnostic:

SLT-9 has cooldown_pages=2 and was last selected 5 pages ago on this branch; select_storylet_candidates rejected it as cooldown_active.

Suggested fix:

Compute distance from parent page to last selected occurrence on the same branch path and compare against cooldown_pages.

## **`replay_live_global_pool_lawfulness`**

Severity: hard fixture validator.

Required inputs:

old parent PG  
newer global_author_pool SLT  
selection trace / selected SE

Failure codes:

newer_global_slt_illegally_excluded  
newer_global_slt_illegally_selected  
global_slt_branch_local_dependency

Example diagnostic:

Replay from PG-3 selected SLT-41, but SLT-41 is global_author_pool and has hard predicate ref STPLAN-12, a branch-local record not active in PG-3.

## **`branch_scoped_slt_exclusion`**

Severity: hard fail.

Failure codes:

branch_scoped_storylet_leak  
branch_prefix_storylet_leak  
branch_prefix_storylet_wrong_prefix

## **`non_player_response_choice_relevance`**

Severity: warning by default, hard fail only when no response choice exists.

Required inputs:

SE.turn_driver  
child PG emitted_choices  
CHC.grounded_in  
page-plan §13

Failure codes:

non_player_driver_no_response_choice  
response_choice_ignores_driver_record  
response_choice_initiator_language_under_witness_mode

## **`choice_outcome_promise_leak`**

Severity: warning.

Required inputs:

CHC.surface_label  
CHC.player_visible_intent  
CHC.success_policy  
page-plan §13

Failure codes:

choice_promises_success  
choice_promises_secret_reveal  
choice_promises_npc_compliance  
choice_promises_world_state

This must not be hard schema law because language is contextual.

## **Things that must never be hard-validated**

- literary quality  
- emotional subtlety  
- “best” salience choice among lawful candidates  
- exact prose rhythm  
- thematic resonance  
- whether the player will enjoy a choice

Those belong to judgment-assisted review.

# **13. Choice semantics and quality model**

## **CHC as intent promise**

A CHC promises:

- what the player can try, attend to, say, refuse, inspect, or prioritize;  
- what known record(s) make the affordance visible;  
- the pressure direction the player can reasonably expect;  
- the success policy envelope: attempt, guaranteed small action, constrained response, etc.

## **CHC must not promise**

- success;  
- exact outcome;  
- exact SLT;  
- hidden knowledge;  
- NPC compliance;  
- secret revelation;  
- canon promotion;  
- safety from non-player initiative.

## **Response / witness / continuation surfaces**

Under non-player drivers, CHCs should read like:

responds:  
 "Step between Maren and the witness."  
witnesses:  
 "Watch who reaches for the broken seal first."  
chooses_continuation:  
 "Stay with the aftermath at the kiln."

They should not read like the player caused the non-player event that already happened.

## **Deterministic choice-quality axes**

Hard/warning validators can check:

- material noncollapse  
- grounded_in accessibility  
- action-family diversity  
- driver-record response relevance  
- outcome-promise leak  
- duplicate labels  
- no meaningful response after non-player driver

## **Judgment-assisted choice review**

Judgment-assisted review should assess:

- whether choices create distinct imagined futures;  
- whether pressure is legible without exposition;  
- whether write-in envelope feels honest;  
- whether choices are not checklist variants;  
- whether response/witness modes still feel agentic.

# **14. Driver-aware SLT selection model**

## **Player driver**

Current: selected from CHC/write-in intent, action families, grounding, parent snapshot.

Recommended: keep current. CHC supplies intent signature; SLT selected late.

## **NPC driver**

Current: schema/validator requires active driver records; Red Kiln proves one rich fixture.

Recommended: selected SLT represents NPC move. It must cite active `STPLAN`, `STEMO`, `BEL`, `CLK`, `THR`, or `STCHAR` access as appropriate.

## **Offstage driver**

Current: supported by schema and firewall, not richly fixture-proven.

Recommended: selected SLT represents offstage causal packet. Player sees consequence through report, trace, discovery, or delayed evidence. No direct hidden mind.

## **World pressure**

Current: supported.

Recommended: selected SLT represents non-actor pressure: institution, environment, threat, obligation, consequence, thread, clock-adjacent movement.

## **Clock fire**

Current: schema requires `CLK`.

Recommended: selected SLT represents threshold consequence, not the clock record itself and not merely response CHCs.

## **Secret reveal**

Current: schema requires `STSEC`.

Recommended: selected SLT represents reveal mechanism and boundary. It must respect mystery firewall and observer access.

## **Multi-actor collision**

Current: supported by schema; no rich fixture.

Recommended: selected SLT represents local collision among multiple active pressures. No global drama manager. Combine only pressures active in parent PG snapshot.

## **Repair/audit cases**

`system_repair` and `audit_repair` can select/JIT SLTs, but they must still be causal moves. They are not a license to patch outcome holes with author fiat.

# **15. Storylet generation / pool diversity model**

## **Bootstrap seed policy**

Keep:

- minimal: 4-8 seed SLTs  
- standard: 8-14 seed SLTs  
- global_author_pool  
- no exact branch-local references  
- existential predicates preferred  
- driver-kind × pressure-source coverage

This is already in bootstrap references.

## **Direct batch policy**

Commitment-block-authoring should continue to use projection-first pool diagnosis and draft new SLTs only for diagnosed gaps.

## **Audit repair policy**

RSP cards should remain repair requests, not full SLT inflation. The health audit already states RSP cards are repair requests and commitment-block-authoring owns SLT drafting.

## **Runtime JIT policy**

JIT remains branch-scoped, singleton driver-compatible, and exact enough to satisfy the current turn without polluting the global pool.

## **Driver-kind × pressure-source × role-lane coverage**

Do not add role-lane schema yet. Use audit warnings:

- no NPC-driven storylets for active STPLAN pressure  
- no offstage consequence storylets  
- no clock threshold aftermath storylets  
- no secret reveal reaction storylets  
- no recovery/de-escalation moves after repeated high-pressure pages

## **Anti-generic policy**

Keep `reason_to_exist` banned generic phrase validation. It already rejects empty dramatic filler phrases.

## **Reusable pattern vs branch-local specificity**

Global SLTs should use existential predicates and bound aliases. Branch-local/JIT SLTs may use exact records. This is already the right split.

# **16. Replay / fork semantics**

## **Newer global SLTs**

Policy: eligible on replay/fork if lawful against the parent PG snapshot.

Reason: that is the value of storylets and the consequence of removing CHC→SLT association.

## **Branch-scoped SLTs**

Policy: visible only on the same branch. Never visible to sibling branches.

## **Branch-prefix-scoped SLTs**

Policy: visible only when the parent page’s branch path matches the prefix. This is distinct from same-branch visibility.

## **Exact/frozen choices**

Current policy: none at CHC level.

Recommendation: keep none. Future exact binding would require a new schema and strong use case, such as a tutorial or set-piece where the player-facing promise is truly exact. Do not add it now.

## **Late-bound choices**

All normal CHCs are late-bound. Late binding is constrained by parent snapshot and lawfulness.

## **Historical reproducibility vs improved author-pool availability**

Worldloom should prefer lawful live-pool availability over historical freeze, because PG snapshots preserve state, not historical authoring-pool inventory. Historical reproducibility is preserved by exact PG/SE records already committed, not by freezing future replay candidate availability.

## **Validation and fixtures**

Needed fixtures:

- older PG + newer global SLT lawful and selected  
- older PG + newer global SLT rejected due branch-local exact ref  
- branch_scoped SLT from sibling rejected  
- branch_prefix_scoped SLT accepted/rejected by prefix  
- cooldown active/expired by page distance

# **17. Implementation order**

## **SPEC-83 — Candidate retrieval cooldown correctness**

Acceptance criteria:

- select_storylet_candidates computes cooldown by branch path/page distance.  
- Expired cooldown SLTs are eligible.  
- Active cooldown SLTs are rejected with trace reason.  
- Unit tests cover selected 1, 2, and N pages ago.

## **SPEC-84 — Replay/fork live global pool fixtures**

Acceptance criteria:

- authored fixture with PG-3 parent, newer SLT added after PG-3, replay selects it lawfully.  
- illegal newer global SLT with branch-local exact ref is rejected.  
- test proves no CHC exact storylet field is used.

## **SPEC-85 — Branch-scoped / branch-prefix scoped exclusion fixtures**

Acceptance criteria:

- branch_scoped sibling SLT excluded.  
- branch_prefix_scoped matching prefix included.  
- branch_prefix_scoped nonmatching prefix excluded.  
- validator emits branch leakage diagnostics.

## **SPEC-86 — Non-player driver fixture suite**

Acceptance criteria:

- offstage_action fixture  
- clock_fire fixture  
- secret_reveal fixture  
- multi_actor_collision fixture  
- each proves selected SLT, page-plan §7a, response CHCs, observer firewall

## **SPEC-87 — Candidate filter trace diagnostics**

Acceptance criteria:

- filter_trace includes per-stage rejection counts.  
- trace includes small rejection samples by code.  
- context packet preserves projection-only discipline.  
- no full SLT bodies in shortlist response.

## **SPEC-88 — Choice promise / non-player response quality validators**

Acceptance criteria:

- warning validator for outcome-promising CHC language.  
- warning/hard validator for non-player pages with no meaningful response CHC.  
- tests for false positives on rhetorical/expressive choices.

## **SPEC-89 — Authored large-pool fixture**

Acceptance criteria:

- authored story bundle with hundreds of SLTs, not just synthetic rows.  
- selection shortlist capped.  
- full-body reads capped.  
- chosen SLT passes predicates/alias/firewall.

# **18. Golden fixtures / tests**

## **Replay/newer-global-SLT fixture**

Scenario:

PG-3: player has BEL-2, DA-1, STPLAN-4 active.  
After PG-3 was committed, author adds SLT-88 global_author_pool:  
 compatible_turn_drivers: [player_action]  
 hard predicates: any_belief(holder_role:player, kind:ledger_contradiction)  
 exit action_family: investigate  
Replay from PG-3 via CHC-7 selects SLT-88.

Negative variant:

SLT-89 global_author_pool hard-predicates exact STPLAN-99 from a sibling branch.  
Expected: rejected as global_slt_branch_local_dependency.

## **Branch exclusion fixture**

BR-1 path: root/a  
BR-2 path: root/b

SLT-20 branch_scoped BR-1  
Replay from BR-2 parent: reject.

SLT-21 branch_prefix_scoped prefix root/a  
Replay from root/a/child: accept.  
Replay from root/b: reject.

## **Non-player driver fixture**

Use four pages:

offstage_action:  
 STPLAN enemy offstage sabotages bridge; player sees delayed report.

clock_fire:  
 CLK threshold reached; consequence closes route; CHCs respond.

secret_reveal:  
 STSEC partial reveal through DA clue; CHCs choose how to handle knowledge.

multi_actor_collision:  
 NPC plan + clock + obligation collide; selected SLT resolves local collision.

## **Large synthetic + authored pool fixture**

Keep the 1,000 synthetic projection test. Add authored 300-SLT fixture with real YAML bodies and branch scopes.

## **Negative tests**

stale exact binding:  
 CHC tries to include associated_commitment_block -> schema fail.

branch leakage:  
 selected SLT references sibling branch alias -> fail.

generic SLT:  
 reason_to_exist: "advance the plot" -> fail.

observer firewall:  
 offstage driver direct hidden interiority -> fail.

choice collapse:  
 three CHCs same families + grounding + pressure -> fail/warn as current rule dictates.

cooldown:  
 expired cooldown rejected -> fail.

# **19. Non-goals**

Reject explicitly:

- outcome-promising CHCs;  
- reintroducing CHC.associated_commitment_block;  
- hybrid CHC.binding without a new hard use case;  
- persistent SSEL record class;  
- global drama manager / target narrative shape planner;  
- turning STCHAR into current state;  
- making NPCs omniscient;  
- validating literary quality as hard schema law;  
- loading thousands of full storylets into LLM context;  
- generic storylet generation without driver/pressure/cast grounding;  
- embeddings as legality filters;  
- backwards-compatibility shims for retired CHC fields;  
- rich SLT grounding fields without deterministic consumers.

# **20. Open questions**

1. Should MCP eventually perform full predicate evaluation server-side? Current evidence says no; revisit only after profiling shows full-body fetch or turn-cycle predicate evaluation is the bottleneck.  
2. Should `filter_trace` become persisted in `SE.commitment`? Current evidence says no; revisit only if replay/debugging failures cannot be diagnosed from transient MCP traces, page-plan §7a, and validators.  
3. How aggressive should warning-level choice-language validation be? Outcome-promising CHCs are bad, but language is subtle; this should start warning-level with carefully curated false-positive fixtures.  
4. Should pool diversity warnings expand beyond SPEC-80’s driver-kind × pressure-source coverage? Yes, but only in health audit, not schema. Recovery, aftermath, and de-escalation diversity are valuable, but not hard law.  
5. Should authored large-pool testing use 300, 1,000, or more SLTs? The current synthetic proof covers 1,000; the authored fixture should start at 300 because authored YAML richness matters more than raw count.

## Outcome

Archived on 2026-05-25 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
