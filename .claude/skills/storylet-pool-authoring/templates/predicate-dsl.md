# Predicate DSL — Storylet Pool Authoring

Storylet `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, choice-template preconditions, and v2 `arc.stop_policy.*.predicate` entries all depend on engine-checkable predicates. The runtime `branching-story-page-cycle`'s choice-validation, consequence-capacity, invariant-compatibility, and SPEC-20 Phase 7.6 stop-condition checks consume these predicates. Free-form prose predicates make the engine LLM-dependent for what should be deterministic — the DSL closes the grammar.

The DSL has three tiers:

1. **Core forms** — the original eleven `pred` types used for storylet eligibility.
2. **Documented extensions** — additional eligibility forms used by the bootstrap-seed pool and supported by the runtime page-cycle's Phase 4 selection.
3. **Stop predicates** — SPEC-19 v2 `arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate` forms evaluated by the SPEC-20 Phase 7.6 stop-condition evaluator.

All tiers are part of the documented DSL grammar; LLM proposers MAY use the tier appropriate to the field they are filling, but they may NOT invent new `pred` types beyond what this document enumerates. Extending the DSL further is an authorial change to this document, not a runtime act.

The closed surface is the structural grammar: supported `pred` forms, recursive combinators, required fields, operator sets, record-id shapes, and fixed small enums such as epistemic class and obligation status. The open surface is story/world-local typed vocabulary: narrative-time tags, event-kind strings, world-state scalar names, location kinds/classes, role matchers, and relationship-state properties where no bundle registry fixes the list. Open values must still use the documented typed-string mini-format or an existing bundle/state-schema source; they are not free-form prose.

This file is inlined verbatim into Phase 3's LLM prompt and consulted by Phase 4 gate 7 (Predicate DSL parsability).

## Core Predicate Forms

```yaml
- pred: fact_true
  fact: SF-NNNN

- pred: fact_matches
  subject: STENT-NNNN | role:<role>
  predicate: alive | present | has_object | knows | believes | relationship_axis | location
  object: <value or record-id>

- pred: entity_state
  entity: STENT-NNNN | role:<role>
  property: alive | conscious | present | willing | armed | injured | mobile | restrained | mode | visible | visible_to_protagonist | present_count
  op: == | != | > | < | >= | <=
  value: <value>

- pred: relationship
  from: STENT-NNNN | role:<role>
  to: STENT-NNNN | role:<role>
  axis: trust | fear | desire | debt | intimacy | loyalty | resentment | power_imbalance | attention | familiarity | approval | respect | obligation | hostility
  op: == | != | > | < | >= | <=
  value: <number>

- pred: consequence_pending
  kind: <CNSQ kind>
  salience_min: 0..10

- pred: obligation_open
  matcher: {...}                    # OBL field-matcher — see "Obligation matcher schema" below

- pred: location
  current_location: STLOC-NNNN | role:<location-role>

- pred: epistemic
  fact: SF-NNNN
  class: objective | belief | rumor | reader_inference | apparent | disputed
  certainty_min: 0.0..1.0

- pred: not
  predicate: {...}

- pred: all
  predicates: [...]

- pred: any
  predicates: [...]
```

## Predicate axis enum vs. `axes_delta` open vocab

`pred: relationship` and `pred: relationship_state` validate `axis:` and `property:` differently — and the difference matters at authoring time.

- `pred: relationship`'s `axis:` field is **closed runtime grammar**: only the values listed in §Core Predicate Forms (`trust | fear | desire | debt | intimacy | loyalty | resentment | power_imbalance | attention | familiarity | approval | respect | obligation | hostility`) are accepted. Phase 4 gate 7 (predicate DSL parsability) HARD-REJECTs any other value because the runtime page-cycle's deterministic eligibility evaluation depends on a fixed axis set the engine can route against `state_snapshot.relationships_current`.
- `pred: relationship_state`'s `property:` field is **open vocab** (validated by `requireOpenLabel`). Authors may use `prior_meeting`, `prior_meeting_count`, or any kebab-case relationship-state property that the runtime can resolve against an SREL record's named field at evaluation time.
- A storylet's `relationship_effects.axes_delta` keys are **open vocab** at the storylet schema level (the storylet record's effects field is not gated by the predicate-DSL validator) — they are SREL-record axis names that produce or update relationship state when the storylet is applied.

The asymmetry's failure mode: an author can write `axes_delta: {<axis_name>: 2}` in `relationship_effects` (open vocab — storylet effects accept it) and then write `pred: relationship axis: <axis_name>` in `hard_preconds` or `soft_preconds` (closed enum — predicate DSL rejects it if `<axis_name>` is not in the enumerated list above). The skill's Phase 4 gate 7 catches this at engine-submit time with `axis must be one of <enumerated list>`. To avoid the late surface, when authoring a storylet that gates eligibility on a relationship axis, confirm the axis name is in the closed enum BEFORE writing the predicate. If the bootstrap pool or runtime SREL records use an axis name that is not in the enum, the predicate must use `pred: relationship_state` (open-vocab `property:`) instead of `pred: relationship` (closed-enum `axis:`), or the enum must be extended in lockstep across this file AND `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `RELATIONSHIP_AXES` constant (followed by `npm run build` in `tools/validators/`).

## Documented Extensions

These forms are part of the operational DSL — supported by the runtime page-cycle's Phase 4 selection and used by the bootstrap-seed pool. They are equally valid as core forms in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions.

```yaml
- pred: relationship_state
  between: [STENT-NNNN, STENT-NNNN] | [role:<role>, role:<role>]
  property: prior_meeting | prior_meeting_count | intimacy | trust | desire | <other relationship axis>
  op: == | != | > | < | >= | <=
  value: <value>

- pred: time_of_day
  op: == | != | in
  value: morning | late_morning | afternoon | late_afternoon | evening | early_evening | late_evening | dusk | night | late_night | <list when op=in>

- pred: time_of_week
  op: == | != | in
  value: monday | tuesday | wednesday | thursday | friday | saturday | sunday | weekday | weekend | <list when op=in>

- pred: time_in_story
  op: == | != | in
  value: pre_ebau | ebau_window | post_ebau | <story-specific narrative-time tag>

- pred: time_since_event
  event_kind: <event-class string — e.g., prior_encounter, prior_encounter_with_antagonist, first_intimacy_with_antagonist>
  op: == | != | > | < | >= | <=
  value: hours:<n> | days:<n> | weeks:<n>

- pred: world_property
  property: ambient_register | <other world-state-snapshot scalar>
  op: == | != | > | < | >= | <=
  value: <value>

- pred: obligation_state
  obligation_id: OBL-NNNN
  property: status | salience | urgency
  op: == | != | > | < | >= | <=
  value: open | paid_off | complicated | abandoned | <numeric for salience/urgency>

- pred: location_kind
  location: role:current_location | STLOC-NNNN
  op: == | in
  value: cafe | gallery | hotel_lobby | terraza | public_path | gym | school | family_home | study_space | cuadrilla_bar | bedroom | walking_path | taxi_back_seat | surf_watch_spot | centro_residential_street | <list when op=in>

- pred: location_id
  op: ==
  value: entity:<world-entity-slug>           # binds to a world-level named entity (e.g., entity:gaztelufit)

- pred: location_class
  location: role:current_location | STLOC-NNNN
  op: ==
  value: centro_wealth_register | gros_working_class_register | irun_border_register | <other location-class label>
```

## Stop Predicates (third tier — v2 SLT arc.stop_policy)

Stop predicates are used only at these v2 SLT sites:

- `arc.stop_policy.normal_exits[].predicate`
- `arc.stop_policy.interrupt_before[].predicate`
- the runtime page-cycle's SPEC-20 Phase 7.6 stop-condition evaluator

They do not replace or broaden eligibility predicates in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, or choice-template preconditions. Stop predicates evaluate against story state, the selected commitment, the arc-local trace, mystery safety, the effect model, and participant/location changes. Those surfaces are not consulted by the eligibility-tier predicates above.

The stop-policy grammar is finite. LLM-side invention is HARD-REJECTed by SPEC-22's `stop_policy_parsability` validator, which inherits the grammar-loading discipline from the existing `storylet_predicate_dsl_parsability` validator. Validator implementation and per-predicate args enforcement are owned by SPEC-22 Track 2; this file is the schema-text authority for the grammar.

Closed-vs-open args discipline:

- `<commitment_class enum>` and `<strong_axis enum>` are closed values from canonical vocabularies.
- Kebab-case class labels such as `reason_class`, `demand_class`, `disclosure_class`, `goal`, `cost_class`, `boundary_class`, `violation_kind`, and `envelope_item` are open typed vocabulary unless a bundle registry closes them later.
- Record ids (`STENT-NNNN`, `THR-NNNN`, `M-NNNN`) and `role:<role>` matchers retain their documented id/matcher shapes.

### Normal-exit predicates (`stop_policy.normal_exits[].predicate`)

```yaml
- pred: commitment_satisfied
  args: {commitment_class: <commitment_class enum>}        # closed enum

- pred: commitment_blocked
  args: {commitment_class: <commitment_class enum>, reason_class: <kebab-case open-vocab>}

- pred: commitment_overturned
  args: {by_actor: STENT-NNNN | role:<role>, new_commitment_class: <commitment_class enum>}

- pred: npc_makes_demand
  args: {npc: STENT-NNNN | role:<role>, demand_class: <kebab-case open-vocab>}

- pred: npc_makes_disclosure
  args: {npc: STENT-NNNN | role:<role>, disclosure_class: <kebab-case open-vocab>}

- pred: participant_exits
  args: {participant: STENT-NNNN | role:<role>}

- pred: scene_goal_resolves
  args: {goal: <kebab-case open-vocab>}

- pred: scene_goal_changes
  args: {from: <kebab-case open-vocab>, to: <kebab-case open-vocab>}

- pred: new_obligation_created
  args: {salience_min: <int 0..10>}

- pred: open_thread_reprioritized
  args: {thread: THR-NNNN, direction: increase | decrease}

- pred: time_or_location_changes
  args: {axis: time | location}
```

Semantic glosses:

- `commitment_satisfied`: closes when the selected commitment has achieved its intended class of outcome.
- `commitment_blocked`: closes when the selected commitment cannot proceed for a named open-vocab reason class.
- `commitment_overturned`: closes when an actor changes the commitment into a new closed commitment class.
- `npc_makes_demand`: closes when the named NPC/role creates a demand that exposes the next commitment hinge.
- `npc_makes_disclosure`: closes when the named NPC/role discloses information that changes the scene's strategic posture.
- `participant_exits`: closes when a participant leaves the scene or active exchange.
- `scene_goal_resolves`: closes when the open-vocab scene goal has been answered or exhausted.
- `scene_goal_changes`: closes when the scene's open-vocab goal shifts from one target to another.
- `new_obligation_created`: closes when the arc creates a new obligation at or above the required salience.
- `open_thread_reprioritized`: closes when the named thread's pressure is raised or lowered enough to expose a new hinge.
- `time_or_location_changes`: closes when the arc changes the time or location axis.

### Interrupt-before predicates (`stop_policy.interrupt_before[].predicate`)

```yaml
- pred: irreversible_cost_imminent
  args: {cost_class: <kebab-case open-vocab>}

- pred: consent_boundary_imminent
  args: {boundary_class: <kebab-case open-vocab>}

- pred: violence_or_harm_imminent
  args: {target: STENT-NNNN | role:<role>}

- pred: forbidden_mystery_resolution_risk
  args: {mystery: M-NNNN}

- pred: protagonist_goal_change_required
  args: {from: <kebab-case open-vocab>, to: <kebab-case open-vocab>}

- pred: selected_commitment_would_be_violated
  args: {violation_kind: <kebab-case open-vocab>}

- pred: user_write_in_conflicts_with_envelope
  args: {envelope_item: <kebab-case open-vocab>}

- pred: only_next_action_would_create_major_state_change
  args: {axis: <strong_axis enum>}           # closed enum
```

Semantic glosses:

- `irreversible_cost_imminent`: interrupts before the next beat would impose an irreversible cost of the named class.
- `consent_boundary_imminent`: interrupts before the next beat would cross a consent boundary.
- `violence_or_harm_imminent`: interrupts before the next beat would bring violence or harm to the target.
- `forbidden_mystery_resolution_risk`: interrupts before the render risks resolving the named `M-NNNN`. This is a structural Mystery Reserve firewall mechanism per FOUNDATIONS Story Bundles Rule 7; Phase 7.6 routes the page-cycle to `revise_prose` or `reject_arc` rather than letting an MR-forbidden answer leak into prose.
- `protagonist_goal_change_required`: interrupts when continuing would require changing the protagonist's goal from one open-vocab class to another.
- `selected_commitment_would_be_violated`: interrupts when the only continuation would violate the selected commitment.
- `user_write_in_conflicts_with_envelope`: interrupts when a user write-in conflicts with a named execution-envelope item.
- `only_next_action_would_create_major_state_change`: interrupts when the only valid next action would create a major state change on the named strong-axis enum.

### Safety-valve thresholds (`stop_policy.safety_valves`)

Safety valves are inline thresholds, not DSL predicates. They are documented here for stop-policy completeness but are evaluated by the runtime stop-condition evaluator without parsing through the predicate-DSL grammar.

- `max_internal_beats_reached` — fires when the prose render's beat count exceeds `arc.beat_plan.max_beats`. Default upper bound: 6 per SPEC-19 §A.
- `max_words_reached` — fires when the prose render exceeds `arc.stop_policy.safety_valves.max_words`. Default: 2200 per SPEC-19 §A; multi-beat target is roughly 1500-2000 words.
- `no_valid_continuation_after_effect` — fires when applying the selected `effect_variant` leaves no eligible continuation arc and no valid JIT spec. Phase 3 continuation feasibility is owned by SPEC-20.
- `validation_confidence_low` — fires when the SPEC-20 Phase 7.6 Layer 3 semantic critic returns confidence below a per-execution-mode threshold.

## Validation Rules

- Every predicate MUST be one of the documented forms for its usage site: core or documented-extension forms for eligibility predicates; stop predicates for `arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate`. Unknown `pred` values are HARD-REJECTed by the relevant parser gate (`storylet_predicate_dsl_parsability` for eligibility predicates; SPEC-22's `stop_policy_parsability` for stop-policy predicates). The DSL is finite — extending it requires a documented edit to this file, not LLM-side invention.
- Every `subject` / `entity` / `from` / `to` value MUST be either a `STENT-NNNN` id (declared in this story bundle's `_source/entities/`) OR a `role:<name>` matcher (resolved at runtime by the page-cycle to a STENT bound to that role).
- Every `fact` value MUST be an `SF-NNNN` id (declared in this story bundle's `_source/facts/`) OR a `fact_template` shape consumed by the engine at apply time.
- `op` values are restricted to the six relational operators listed (`==`, `!=`, `>`, `<`, `>=`, `<=`) plus `in` for the time-of and location-kind extensions; arithmetic operators (`+`, `-`, etc.) are NOT permitted.
- `not` takes exactly one nested `predicate`; `all` and `any` take a list of nested predicates (each itself one of the documented forms or a recursive `not`/`all`/`any`).
- Free-form prose anywhere within a predicate body fails parse.

## Location-role matcher pattern

The `location` predicate's `current_location` field accepts either an `STLOC-NNNN` id (a story-bundle-allocated location declared in `_source/locations/`) or a `role:<location-role>` matcher (an abstract location class resolved at runtime to a concrete STLOC by tag / kind / class match against the page's `state_snapshot.current_location`).

For `global_author_pool`-scope storylets that need to reference scenes in locations not yet bootstrap-allocated, the `role:<location-role>` form is REQUIRED — Phase 4 gate 8 (branch-contamination) HARD-REJECTs any direct `STLOC-NNNN` reference whose `created_at_page` is non-null. Use the role-matcher form whenever the storylet's location needs to be expressible across branches that may bootstrap different STLOCs for the same conceptual venue.

The role-name SHOULD be a descriptive kebab-case identifier capturing the location's salient characteristics (genre, register, social class, ambient register), not a proper-noun-like binding to a specific instance:

- ✅ `role:loft_centro_luxury` (captures genre + neighborhood + class register)
- ✅ `role:gros_working_class_district` (captures neighborhood + register)
- ✅ `role:centro_long_tenure_venue` (captures CF-0004 grammar engagement surface)
- ✅ `role:centro_hospitality_or_public_venue` (captures permissive scene-type union)
- ❌ `role:marla_loft` (proper-noun-like — should be an STLOC binding instead, but only in branch-scoped storylets)
- ❌ `role:that_specific_cafe_iker_likes` (proper-noun-like AND scene-context-bound)

**Runtime resolution**: at Phase 4 selection time, `branching-story-page-cycle` matches `role:<location-role>` against the current `state_snapshot.current_location` STLOC by checking the STLOC's `tags`, `kind`, and `class` fields for membership. A storylet with `location: {current_location: role:loft_centro_luxury}` is eligible at any page whose `current_location` STLOC carries `kind: loft` AND `tags` including `centro` AND `class: wealth_register`. This makes role-matchers a tag-and-class union, not a free-text predicate. Authors should pick role-names whose constituent words map cleanly onto the location-tagging vocabulary the bundle uses; the location-tag dictionary lives at `branching-story-bootstrap/templates/story-records.yaml` §STLOC schema.

## Obligation matcher schema

The `obligation_open` predicate's `matcher` field — and the `obligation_id_matcher` field used by SLT records' `pays_off_obligations`, `complicates_obligations`, and `transfers_obligations` arrays — accepts the following keys:

- `id` — an OBL-NNNN id (matches exactly one obligation)
- `type` — an OBL type literal (e.g., `secret`, `reader_expectation`, `relationship_tension`, `motif`, `character_goal`)
- `owner` — a STENT-NNNN id or `role:<role>` matcher binding the obligation's `owner` field
- `subjects` — a list of STENT-NNNN ids or role-matchers (matches obligations whose `subjects` array contains all listed entries)
- `salience_min` — integer 0..10 (matches obligations whose `salience` >= this value)
- `urgency_min` — integer 0..10 (matches obligations whose `urgency` >= this value)
- `status` — `open | paid_off | complicated | abandoned`
- `payoff_mode_filter` — list of payoff-mode strings (e.g., `[literal_fulfillment]`, `[ironic_reversal, symbolic_echo]`); REQUIRED when an OBL has multiple `possible_payoff_modes` and the storylet claims to pay off the OBL via a specific subset

A single matcher may combine multiple keys; all listed keys must match (logical AND). Worked examples:

```yaml
# Match exactly OBL-0006 paid off via literal_fulfillment route
{obligation_id_matcher: {id: OBL-0006, payoff_mode_filter: [literal_fulfillment]}}

# Match any open secret OBL owned by the antagonist, salience >= 6
{matcher: {type: secret, owner: role:antagonist, salience_min: 6, status: open}}

# Match any open OBL whose subjects include both the protagonist and antagonist
{matcher: {subjects: [role:protagonist, role:antagonist], status: open}}
```

## Runtime evaluation mapping

This section documents how each predicate is evaluated against the runtime page-cycle's `state_snapshot` block (the snapshot contract is authoritative at `branching-story-page-cycle/SKILL.md` §Page Record). LLM proposers should write predicates whose runtime evaluation aligns with the data the snapshot actually carries.

| Predicate | Runtime evaluation against state_snapshot |
|---|---|
| `fact_true` | `fact` SF-id appears in any of `state_snapshot.objective_facts`, `state_snapshot.apparent_facts`, or `state_snapshot.disputed_facts` (ignoring epistemic class). Use `epistemic` to filter by class. |
| `fact_matches` (`predicate: knows`) | `fact_template` SF-id (constructed from `subject` + `object`) appears in `state_snapshot.belief_state_by_actor[<subject's STENT id>]` OR is an `objective_fact` whose `epistemic_profile.directly_observable_by` lists `<subject's STENT id>`. |
| `fact_matches` (`predicate: believes`) | `fact_template` SF-id appears in `state_snapshot.belief_state_by_actor[<subject's STENT id>]` regardless of epistemic class — this is weaker than `knows` (covers beliefs that may turn out to be false at the world level). |
| `fact_matches` (`predicate: alive | present | has_object | location | relationship_axis`) | resolved via `state_snapshot.entity_status[<subject's STENT id>]` (for alive/present/mobile/restrained), `state_snapshot.inventory_by_entity[<subject>]` (for has_object), `state_snapshot.current_location` plus `state_snapshot.cast_present` (for location), or `state_snapshot.relationships_current` (for relationship_axis). |
| `entity_state` | direct lookup in `state_snapshot.entity_status[<entity's STENT id>][<property>]`; numeric properties use the `op` comparator, boolean properties use `== / !=` only. |
| `relationship` | linear scan of `state_snapshot.relationships_current` for an SREL whose `from` and `to` match (in either order) and whose axis-value comparison passes. |
| `consequence_pending` | linear scan of `state_snapshot.consequences_pending` for a CNSQ whose `kind` matches and whose `salience >= salience_min`. |
| `obligation_open` | linear scan of `state_snapshot.obligations_open` for an OBL whose fields satisfy the `matcher` (per the Obligation matcher schema above). |
| `location` | direct comparison of `state_snapshot.current_location` to the predicate's `current_location` (STLOC-NNNN exact match, or role-matcher tag-and-class union per the Location-role matcher pattern above). |
| `epistemic` | resolve fact's epistemic class by checking which list it appears in (`objective_facts` → objective; `apparent_facts` → apparent; `disputed_facts` → disputed) and reading the SF record's `certainty` field for the `certainty_min` comparison. |
| `relationship_state` | parallel to `relationship`: linear scan of `state_snapshot.relationships_current` for an SREL whose endpoints match (any order) and whose `<property>` value satisfies the comparison. The `between` field is an unordered pair. |
| `time_of_day` / `time_of_week` / `time_in_story` | resolved against the page's narrative-time metadata (carried in `state_snapshot.narrative_time` per the page-cycle's Page Record schema). The runtime falls back to chronotope-derived defaults when narrative-time is unset. |
| `time_since_event` | resolved by walking the page's branch backward to find the most recent SE record matching `event_kind` and computing the elapsed in-world time per the page records' `created_at` timestamps and the chronotope's time-resolution unit. |
| `world_property` | resolved against `state_snapshot.world_properties` (a top-level dict carrying scalar world-state — e.g., `ambient_register: gold_hour` — the runtime sets at page-emission time). |
| `obligation_state` | direct lookup of OBL by id in `state_snapshot.obligations_open` / `obligations_paid_off` / `obligations_complicated` / `obligations_abandoned`; the `property` field selects which sub-field of the matched OBL is compared. These four arrays are **cumulative-state subsets** of the obligation state space (not per-turn deltas) per `branching-story-page-cycle/references/phase-5-state-mutation.md` §State-subset-list Semantics — an obligation in `obligations_complicated` at PG-N stays there at PG-N+1 unless superseded to a different status. The predicate's lookup reflects current-page cumulative register, not the most-recent transition; storylets gating on `status: complicated` continue to fire on subsequent pages along the branch until the obligation is superseded out. |
| `location_kind` / `location_id` / `location_class` | resolved against the current_location STLOC's `kind` / `id` / `class` fields (the STLOC record carries all three). The `op: in` form on `location_kind` and `location_class` enables list membership; `location_id` is exact-match-only. |
| `not` / `all` / `any` | recursive evaluation: `not` inverts; `all` is logical AND over all nested predicates; `any` is logical OR. Empty `all` is true; empty `any` is false. |

## Why this discipline

The runtime page-cycle's Phase 4 storylet selection scores eligibility against `state_snapshot` deterministically. Free-form prose predicates would force the engine to invoke an LLM for every eligibility check, making selection slow and non-reproducible across re-runs. The DSL keeps selection deterministic, replayable, and auditable; LLM authorial input is preserved for the storylet's *content* (title, prose, choice_templates, tone), not its *eligibility*.
