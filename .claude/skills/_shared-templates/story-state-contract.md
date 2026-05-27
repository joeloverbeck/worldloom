# Story State Contract

Shared by every state-changing skill in the worldloom story-skill family. This is the only place where the page lifecycle, branch snapshots, event deltas, record schemas, predicate DSL, action-routing semantics, nine hard gates, and shared write order are defined. Each skill's `SKILL.md` references this contract for those concerns; the contract does not describe per-skill workflows.

Authored to support the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`.

## 1. Authority Model

Three layers, in strict precedence:

1. **World canon** — authoritative world-level truth, stored as atomic YAML under `worlds/<slug>/_source/` (CF / CH / INV / M / OQ / ENT / SEC records per FOUNDATIONS §Mandatory World Files). Story skills may read it. They never mutate it directly. The only lawful story-to-world canon mutation path is `story-fact-promotion-to-canon` → `canon-addition` → optional `story-promotion-closeout`.
2. **Story state** — authoritative branch-local narrative state inside a story bundle at `worlds/<slug>/stories/<story-slug>/_source/`. Written through story-bundle record-ops on the patch engine.
3. **Rendered prose** — authorial surface text at `pages-prose/PG-<integer>.md`. It can reveal, dramatize, omit, or stylize story state, but **it does not create story state by itself**. Prose is a rendering of state, not a second state engine.

**Plan-authority boundary.** Story state is authoritative at page-plan commit. A `PG` record is real the moment the patch engine accepts the page-cycle plan. Rendered prose is supplied externally (manual or LLM) and attached later via a prose receipt. The page snapshot is the fork primitive — any committed page is a valid parent for the next turn-cycle invocation, regardless of whether its prose has been rendered.

## 2. Schema-Minimalism Doctrine

Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval.

The field lists below are canonical. Skills must not add fields to these schemas without first amending this contract. A skill that needs a one-off field for its own workflow records the need in its `SKILL.md` and motivates the amendment.

**`visible_affordances[].grounded_in[]` is STLOC/STOBJ-only.** Page affordance grounding names the physical scene referents that make an action available, so `grounded_in[]` accepts only active `STLOC-<integer>` or `STOBJ-<integer>` ids. Actors are carried by the same affordance's `available_to[]` field as active `STENT-<integer>` ids. Other actors' presence in the scene is represented through active `STENT` records plus their `STSTAT.location`; affordances whose label mentions another actor still ground in the relevant scene location or object, not in that actor's STENT. Interior or temporal state classes such as `STEMO`, `STPLAN`, `CLK`, `STSEC`, and `STQ` belong in choice grounding or page-plan prose, not in page-affordance grounding.

## 3. Record Class Inventory

Story-bundle record classes allocate via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`.

Core page-cycle state records:

| Class | Purpose |
|---|---|
| `STENT` | Story-local entity mirror or story-local entity. |
| `STCHAR` | Stable story-local character authority profile; hybrid markdown artifact under `story-characters/`. |
| `STSTAT` | Story-local entity life / agency / location status. |
| `STINT` | Intention held by an entity. |
| `SF` | Branch / story-local fact (what is true in the branch). |
| `BEL` | Belief, knowledge, suspicion, public claim, lie, witness memory, or misconception (what a holder believes about the world). |
| `SE` | Event; the single causal tick that produced a page. |
| `OBL` | Obligation. |
| `CNSQ` | Consequence. |
| `THR` | Thread. |
| `CLK` | Pressure clock — staged danger, faction, deadline, exposure, pursuit, or mission pressure with value / max / threshold tracking. |
| `STSEC` | Story secret — story-local hidden truth binding BEL / SF / DA anchors with clue-carrier support and Mystery Reserve references. |
| `STQ` | Story question / open setup — present-causal open setup state with typed setup-to-payoff links and explicit §5c discipline. |
| `SREL` | Relationship. |
| `STLOC` | Location. |
| `STOBJ` | Object. |
| `DA` | Story-local diegetic artifact. |
| `STPLAN` | Actor-owned tactical plan over multiple pages; carries belief basis, resource basis, blockers, current step, fallback steps. |
| `STEMO` | Actor-owned transient affective state; carries closed-enum affect_kind, intensity, behavioral_pressure, appraisal basis. |
| `BR` | Branch. |
| `PG` | Page / causal-tick state snapshot. |
| `CHC` | Emitted choice. |
| `SLT` | Commitment block (causal move with preconditions, beats, effects, exits, saliency). |

Auxiliary story-bundle records:

| Class | Purpose |
|---|---|
| `SLB` | Storylet / commitment-block batch manifest. |
| `SAU` | Story-bundle health audit. |
| `SP` | Story-promotion record. |
| `RSP` | Remediation-storylet proposal card scoped under an audit. |

`SF` records what *is* true in the branch. `BEL` records what a holder *believes / claims / witnesses / lies about*. `STCHAR` records stable story-local persona authority, not knowledge. These classes are kept separate so that lies, secrets, betrayals, witness asymmetry, contested public claims, and character voice remain coherent without inventing plot rails.

**Append-only / supersession discipline.** Once a record is committed it is not edited in place. Changes are expressed by writing a new record (next `<CLASS>-<integer>` id) whose `supersedes` field names the prior record. The patch engine enforces this at the file level for `_source/<class>/*.yaml`. `STCHAR` is a hybrid story-bundle authority artifact, created/superseded by patch-engine hybrid operations and participating in `PG.state_snapshot.active_records`.

## 4. Record Schemas

The full record-schema enumeration for all 21 story-bundle record classes plus the prose-receipt direct-write artifact lives in a sibling shared template at `.claude/skills/_shared-templates/story-record-schemas.md`. That file preserves §4.X subsection numbering verbatim (so existing citations to §4.1 `BEL`, §4.2 `PG`, §4.2a deterministic PG hash computation, §4.3 `SE`, §4.3a audit-only SE events, §4.4 `SLT`, §4.4a shared `action_family` taxonomy, §4.4b `STENT` role and `SREL` axis taxonomies, §4.5.1 through §4.5.13, and §4.6 prose receipt all resolve without rewording in consumer skills, validators, and other shared templates). SPEC-42 adds `CLK` as §4.5.14, `STSEC` as §4.5.15, and `STQ` as §4.5.16 in the schema file without renumbering the existing prose-receipt §4.6 section; SPEC-56 adds `STCHAR` as §4.5.19.

Consumers that need only the authority model (§1), schema-minimalism doctrine (§2), record class inventory (§3), closed predicate DSL (§5), action routing (§6), nine shared hard gates (§7), page-plan minimum contract (§8), branching procedure (§9), shared write order (§10), mystery and canon authority (§11), or skill-usage overview (§12) can read this main contract alone; consumers that need any record schema additionally load `story-record-schemas.md`.

The split is purely structural — §4 is overwhelmingly the bulk of the contract, and the bundled file exceeded the per-call read limit of bulk-loading tools at HEAD. No schema content changed in the move; this stub is the navigational pointer.

### 4.5.10a `DA` Rule-Of-Use Commentary

The `DA` field list remains defined in
`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.10. This
subsection records the cross-skill rules of use for those existing fields; it
does not add or remove schema fields.

- `truth_relation` is the relation of the artifact content to branch or canon
  truth, not the reader's belief about that content. Reader belief lives in
  `BEL.belief_mode`, `BEL.truth_relation`, and `BEL.confidence`.
- `circulation` is the artifact's actual access or distribution state, not its
  intended audience. `intended_audience` records who the artifact was meant
  for; `circulation` records who can actually access or receive it now.
- Claims inside a `DA` do not become `SF` or `CF` automatically. Promotion to
  world canon routes through `story-fact-promotion-to-canon` to
  `canon-addition`; branch-truth establishment uses `SF` records that may cite
  the DA in `derived_from` but stand on independent branch evidence.
- `circulation: public` and `circulation: factional` trigger
  `expected_witness_coverage`: the same event must create BEL propagation
  through an indirect access route (`document`, `object_trace`,
  `location_trace`, `rumor`, `surveillance`, `institutional_channel`, or
  `magic_tech`) or `SE.non_propagation_facts[]` must include a structured
  entry with `reason: event_leaves_no_accessible_trace`, a witness-group
  `group`, and supporting `records[]`. See §5a.3 for the complete
  `expected_witness_coverage` trigger set and the public-BEL requirement.
- `derived_from: [DA-N]` is ambiguous between world-level diegetic artifacts
  (`worlds/<slug>/diegetic-artifacts/DA-N.md`) and story-local artifact records
  (`worlds/<slug>/stories/<story>/_source/artifacts/DA-N.yaml`). Until namespace
  resolution exists, prefer body annotation such as `Story-local copy of
  world-level DA-12: Council Edict of the Salt Charter` over a bare
  `derived_from` entry for cross-namespace provenance.

For the full triage rubric, decision matrix, field-semantics tables, and patch
obligations, see `.claude/skills/_shared-templates/da-authoring-reference.md`.

## 5. Closed Predicate DSL

`SLT.preconditions.hard | soft` use this closed grammar. No free-form predicate prose.
The table below is compact notation for humans; actual SLT YAML emits flat
predicate objects with `pred: <predicate_name>` plus predicate-specific fields.
`pred` names are closed by `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`
and exposed in the `tools/validators/src/schemas/story-storylet.schema.json`
schema-discovery surface. Do not emit `predicate` / `args` wrapper objects.

Canonical emitted form:

```yaml
preconditions:
  hard:
    - pred: record_active
      record: STENT-1
    - pred: any_belief
      alias: public_belief
      holder_role: witness
      mode: believes
  soft: []
```

Combinator emission. `all` and `any` wrap a list of inner predicate objects under the `predicates:` key; `not` wraps a single inner predicate object under the `predicate:` key (singular). Each inner predicate is itself a flat predicate object per the canonical form above — combinators do not introduce a new wrapper shape, they only nest. An existential `any_*` predicate inside a combinator binds its `alias` for the same-block effect references described below; the validator collects every alias from every nested branch into a single bound-alias set, so the same `alias` may legitimately re-use across sibling branches of one `any[…]` combinator (the runtime selects whichever branch matched and the alias resolves to that branch's matched record). Canonical emitted form:

```yaml
preconditions:
  hard:
    - pred: any
      predicates:
        - pred: any_relationship_axis
          alias: tension_axis
          axis: hostility
          comparator: ">="
          value: medium
        - pred: any_relationship_axis
          alias: tension_axis
          axis: fear
          comparator: ">="
          value: medium
    - pred: not
      predicate:
        pred: record_active
        record: STENT-7
  soft: []
```

(Argument-name shapes per `PREDICATE_ARG_SCHEMAS` in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`: `all: required ["predicates"]`, `any: required ["predicates"]`, `not: required ["predicate"]`. The plural/singular split is load-bearing — `all`/`any` with a singular `predicate:` key, or `not` with a plural `predicates:` key, fails predicate-DSL parsability validation.)

| Predicate | Shape | Consumed by |
|---|---|---|
| `fact_true(SF-<integer>)` | Branch-local fact must be currently active. | turn-cycle eligibility |
| `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` | Actor-specific BEL grounding must be held with the optional `belief_mode` and at least the named confidence. | turn-cycle eligibility, social-state firewall (actor-specific BEL grounding) |
| `entity_status(STENT-<integer>, field, value)` | Resolves against active `STSTAT` records; `field` is one of `life | agency | location`. | turn-cycle eligibility |
| `relationship_axis(SREL-<integer>, axis, comparator, value)` | Comparator is one of `>= | <= | == | !=`. | turn-cycle eligibility |
| `obligation_open(OBL-<integer>)` | Obligation must be in an open state. | turn-cycle eligibility |
| `consequence_pending(CNSQ-<integer>)` | Consequence must be pending (unresolved). | turn-cycle eligibility |
| `thread_active(THR-<integer>)` | Thread must be active. | turn-cycle eligibility |
| `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)` | Actor-unbound existential predicate over open `OBL` records; role filters use §4.4b role values. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `any_consequence_pending(alias, kind?, urgency?, derived_from?)` | Actor-unbound existential predicate over pending `CNSQ` records. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `any_thread_active(alias, tag?, urgency?)` | Actor-unbound existential predicate over active `THR` records. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `any_relationship_axis(alias, axis, comparator, value, participant_role?)` | Actor-unbound existential predicate over active `SREL` records; comparator is one of `>= | <= | == | !=`; role filters use §4.4b role values. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` | Actor-unbound existential predicate over active `BEL` records using `belief_mode`, `truth_relation`, and `visibility` filters. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `any_intention(alias, holder_role?, urgency?)` | Actor-unbound existential predicate over active `STINT` records. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `clock_at_least(CLK-<integer>, value)` | Named pressure clock's active `value` must be greater than or equal to `value`. | turn-cycle eligibility |
| `clock_below(CLK-<integer>, value)` | Named pressure clock's active `value` must be less than `value`. | turn-cycle eligibility |
| `clock_full(CLK-<integer>)` | Named pressure clock must be active and at its `max` value. | turn-cycle eligibility |
| `any_clock_active(alias, kind?, salience?)` | Actor-unbound existential predicate over active `CLK` records, optionally filtered by `clock_kind` and `salience`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `secret_unrevealed(STSEC-<integer>)` | Named story secret must be active and not yet fully revealed. | turn-cycle eligibility |
| `secret_revealed(STSEC-<integer>)` | Named story secret must be active with `status: revealed`. | turn-cycle eligibility |
| `revelation_ready(STSEC-<integer>)` | Named story secret must have enough discovered clue carriers to support revelation under the active validator policy. | turn-cycle eligibility |
| `any_secret_unrevealed(alias, salience?, kind?)` | Actor-unbound existential predicate over unrevealed active `STSEC` records, optionally filtered by `salience` and `secret_kind`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `story_question_open(STQ-<integer>)` | Named story question / open setup must be active with `status: open` or `status: complicated`. | turn-cycle eligibility |
| `story_question_status(STQ-<integer>, status)` | Named story question / open setup must be active with the named lifecycle `status`. | turn-cycle eligibility |
| `any_story_question_open(alias, salience?, setup_kind?)` | Actor-unbound existential predicate over open or complicated active `STQ` records, optionally filtered by `salience` and `setup_kind`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `promise_due(STQ-<integer>, age_pages)` | Named promise-like `STQ` must be at least `age_pages` old in the evaluating branch path. | turn-cycle eligibility, debt-pressure maturation |
| `location(STENT-<integer>, STLOC-<integer>)` | Entity must currently be at location. | turn-cycle eligibility |
| `has_affordance(<action_family>)` | The current page's `visible_affordances` must include an affordance whose `action_families` contain the named family. | turn-cycle eligibility, plan grounding |
| `record_active(<record_id>)` | Named record must be active in the current `PG.state_snapshot`; accepts STENT / STCHAR / STINT / SF / BEL / OBL / CNSQ / THR / CLK / STSEC / STQ / SREL / STPLAN / STEMO / STLOC / STOBJ / DA / STSTAT ids. | turn-cycle eligibility |
| `record_age(<record_id \| bound:<alias>>, >= \| <= \| == \| !=, <integer_pages>)` | Derived age check over the record's `created_at_page` and the evaluating page's position in `branch_path`; `bound:<alias>` may reference a same-block existential match. | turn-cycle eligibility, debt-pressure maturation |
| `intention_active(STINT-<integer>)` | Named intention must be currently active. | turn-cycle eligibility |
| `object_accessible(STENT-<integer>, STOBJ-<integer>)` | Entity must have page-state access to the named object. | turn-cycle eligibility, plan grounding |
| `artifact_accessible(STENT-<integer>, DA-<integer>)` | Entity must have access to the named story-local diegetic artifact. | turn-cycle eligibility, plan grounding |
| `affordance_available_to(STENT-<integer>, <action_family>)` | Actor-specific affordance grounding must exist for the named action family. | turn-cycle eligibility, plan grounding |
| `plan_active(holder, plan?)` | Actor has an active `STPLAN`. When `plan` is supplied, matches that specific plan id; otherwise matches any. | turn-cycle eligibility, plan grounding |
| `plan_blocked(holder)` | Actor has at least one active `STPLAN` with `plan_status: blocked`. | turn-cycle eligibility |
| `any_plan_active(alias, holder_role?)` | Actor-unbound existential over active `STPLAN`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `emotion_active(holder, kind?, min_intensity?)` | Actor has an active `STEMO`. `kind` filters by closed-enum `affect_kind`; `min_intensity` is one of `low | medium | high | extreme` and matches that intensity or higher. | turn-cycle eligibility, plan grounding |
| `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` | Actor-unbound existential over active `STEMO`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `emotion_pressure(holder, pressure)` | Actor has an active `STEMO` whose `behavioral_pressure[]` includes the named closed-enum pressure. | turn-cycle eligibility |
| `all[…]`, `any[…]`, `not[…]` | Boolean composition. | combinator |

Closed grammar contains 39 individual predicates plus 3 combinators (`not`, `all`, `any`) for 42 total entries.

`has_affordance(<action_family>)` and the `any_*` existential predicates are valid only for `global_author_pool` and `branch_prefix_scoped` prefiltering when an actor is not yet bound. Branch-execution eligibility checks use exact-ID predicates (for example `affordance_available_to(<actor>, <family>)`, `obligation_open(OBL-<integer>)`, `plan_active(holder=STENT-1, plan=STPLAN-4)`, or `belief_record(holder, BEL-<integer>)`) so plan-time grounding is actor-specific. Free-claim string matching is not a lawful predicate; the only belief-family predicates are `belief_record` (exact BEL-id) and `any_belief` (existential alias-binding).

**Information / Observer Firewall.** At move-generation time, every selected `SLT` actor-binding and every emitted `CHC` must be grounded in information available to the acting entity. Valid access routes include the actor's active `BEL` records, direct observation from active location/status, accessible `DA` / `STOBJ` evidence, testimony, document access, inference from known facts, surveillance, institutional channel, magic/tech, or another canonically valid mechanism named in the plan. A `BEL` or `DA` may ground a move only when the actor can access it; narrator-only knowledge, hidden branch state, and facts known only to another actor cannot license that actor's move unless a valid access route is recorded.

An existential predicate binds its `alias` to the matched active record during block selection. `SLT.effects.create`, `SLT.effects.supersede`, `SLT.effects.close`, and `SLT.exit_options[].likely_effects` may reference that matched record as `bound:<alias>`. Every `bound:<alias>` reference must resolve to an alias bound by a hard or soft precondition on the same `SLT`.

When the selected block becomes an `SE`, `SE.commitment.alias_bindings` records the exact matched ids. The event schema accepts `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` for the corresponding `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, and `any_emotion_active` aliases, in addition to the pre-existing selected-move binding classes.

### §5a. Mid-Story Introduction Structured Fields

Mid-story first introductions of `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, or `STEMO` records are recorded on `SE.record_introductions[]`. A supersession-create whose new record body carries `supersedes: <prior-id>` is a lifecycle transition, not a first introduction; its lineage is recorded by the new record's `supersedes` field plus `SE.state_delta.supersede[]`. Relations from an event to an active plan are recorded on `SE.state_relations[]`. Explicit non-propagation assertions are recorded on `SE.non_propagation_facts[]`. These fields carry the machine-readable WHAT; `SE.world_logic_rationale` carries the human-readable WHY.

`SE.state_delta.create[]`, `SE.state_delta.supersede[]`, and `SE.state_delta.close[]` accept the same lifecycle-managed story-state class set, including `STCHAR`, `STPLAN`, and `STEMO`; the event schema and `state_delta_class_integrity` validator must move together with this contract.

`SE.world_logic_rationale` is prose-only. Validators MUST NOT attempt to parse `world_logic_rationale` for structural facts. The structured WHAT lives in `record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]`; the prose WHY lives in `world_logic_rationale`.

`tools/validators/src/schemas/story-event.schema.json` is the schema-level source of truth for the structured field shapes, required keys, record-id patterns, closed enums, and per-class trigger constraints. Introduction-grounding validators consume `SE.record_introductions[]` through `tools/validators/src/structural/midstory-introduction-utils.ts`; plan-relation validators consume `SE.state_relations[]`; witness/non-propagation validators consume `SE.non_propagation_facts[]`.

`record_introductions[]` entries have this shape:

```yaml
record_id: CLK-12
class: CLK
trigger: deadline_declared
evidence: [SE-31, OBL-7, THR-9]
distinct_from: [CLK-3]
rationale: "Optional per-introduction prose context."
```

The `class` field is one of `CLK | STSEC | STQ | THR | STENT | STCHAR | SREL | STPLAN | STEMO`. The `trigger` field MUST match the closed trigger vocabulary for that class below. `evidence[]` names story-local records that ground why the new record is lawful now. `distinct_from[]` names similar existing records that do not already cover the introduced record. `rationale` is optional prose and carries no structural meaning.

### CLK Triggers

| Trigger | Present-causal meaning |
|---|---|
| `deadline_declared` | A deadline becomes explicit in the accepted event. |
| `pursuit_started` | An active pursuit begins and will constrain later choices. |
| `exposure_accumulation_started` | Exposure or discovery risk starts accumulating from this event. |
| `faction_mobilized` | A faction begins a pressure-producing mobilization. |
| `environmental_degradation_started` | A worsening environment becomes trackable pressure. |
| `mission_or_race_started` | A mission or race enters active timed pressure. |
| `staged_danger_became_trackable` | A danger was already staged and now becomes measurable. |

### STSEC Triggers

| Trigger | Present-causal meaning |
|---|---|
| `lie_made_hidden_truth_branch_relevant` | A lie makes a hidden truth branch-relevant. |
| `hidden_truth_constrains_action` | A hidden truth now constrains lawful future action. |
| `clue_carrier_enters_play` | A clue carrier enters the branch and makes the secret trackable. |
| `holder_access_changed` | Someone's access to the secret changes in this event. |
| `protected_mystery_story_secret_needed` | A protected mystery needs story-local secret tracking without resolving world canon. |

### STQ Triggers

| Trigger | Present-causal meaning |
|---|---|
| `promise_made` | A promise creates a present open setup. |
| `explicit_question_raised` | A concrete question is raised in the branch. |
| `unexplained_evidence_introduced` | Evidence enters play and creates a specific open question. |
| `affordance_setup_introduced` | A new affordance setup becomes trackable. |
| `open_decision_created` | A decision point is created but not yet resolved. |

### THR Triggers

| Trigger | Present-causal meaning |
|---|---|
| `new_ongoing_causal_concern` | A new ongoing concern begins to constrain the branch. |
| `investigation_line_opened` | An investigation line opens from the accepted event. |
| `recovery_line_opened` | A recovery effort becomes an active thread. |
| `negotiation_line_opened` | A negotiation becomes an ongoing thread. |
| `mission_line_opened` | A mission line becomes active without requiring a clock. |
| `social_fallout_line_opened` | Social fallout becomes an ongoing branch concern. |

### STENT Triggers

| Trigger | Present-causal meaning |
|---|---|
| `actor_enters_branch` | A new actor enters the branch as persistent state. |
| `witness_needed` | A witness needs explicit story-state representation. |
| `information_source_enters` | A new information source enters play. |
| `pressure_driver_enters` | A new entity becomes a pressure driver. |
| `counterparty_enters` | A counterparty enters a negotiation, debt, conflict, or exchange. |
| `choice_target_enters` | A new entity becomes a lawful target for future choices. |

### SREL Triggers

| Trigger | Present-causal meaning |
|---|---|
| `alliance_forms` | An alliance becomes true in branch state. |
| `rivalry_forms` | A rivalry becomes true in branch state. |
| `debt_relation_forms` | A debt relation between participants becomes active. |
| `authority_relation_forms` | Authority between participants becomes active. |
| `trust_axis_becomes_relevant` | Trust becomes a load-bearing relationship axis. |
| `fear_axis_becomes_relevant` | Fear becomes a load-bearing relationship axis. |
| `desire_axis_becomes_relevant` | Desire becomes a load-bearing relationship axis. |
| `intimacy_axis_becomes_relevant` | Intimacy becomes a load-bearing relationship axis. |
| `loyalty_axis_becomes_relevant` | Loyalty becomes a load-bearing relationship axis. |
| `resentment_axis_becomes_relevant` | Resentment becomes a load-bearing relationship axis. |
| `power_imbalance_axis_becomes_relevant` | Power imbalance becomes a load-bearing relationship axis. |
| `attention_axis_becomes_relevant` | Attention becomes a load-bearing relationship axis. |
| `familiarity_axis_becomes_relevant` | Familiarity becomes a load-bearing relationship axis. |
| `approval_axis_becomes_relevant` | Approval becomes a load-bearing relationship axis. |
| `respect_axis_becomes_relevant` | Respect becomes a load-bearing relationship axis. |
| `obligation_axis_becomes_relevant` | Obligation becomes a load-bearing relationship axis. |
| `hostility_axis_becomes_relevant` | Hostility becomes a load-bearing relationship axis. |

### STPLAN Triggers

| Trigger | Present-causal meaning |
|---|---|
| `tactical_approach_committed` | Actor moves from open intention to a specific multi-step tactical approach in the accepted event. |
| `resource_gained_enables_plan` | Actor acquired a resource / leverage / ally / piece of information in this event that newly makes a previously-blocked plan tractable. |
| `blocker_requires_plan` | Actor encountered an obstacle in this event that requires explicit planning (negotiation, deception, alliance-building) rather than ad-hoc reaction. |
| `pressure_forces_plan` | External pressure produced by this event (clock fires, deadline declared, antagonist move) forces the actor to formalize a tactical response. |
| `opportunity_recognized` | The event surfaced a specific opportunity in the current state that warrants planned pursuit rather than ad-hoc reaction. |
| `counterparty_plan_observed` | Actor inferred another actor's plan from this event and forms a counter-plan in response. |

### STEMO Triggers

| Trigger | Present-causal meaning |
|---|---|
| `event_revealed_truth_to_actor` | Actor learned something new in the event (witness, reveal, document discovery, testimony); affective shift is appraisal-driven. |
| `event_threatened_actor_or_charge` | Actor or someone they are responsible for came under threat in the event. |
| `event_harmed_actor_or_charge` | Actor or someone they care about was harmed, lost, or damaged in the event. |
| `event_relieved_pressure_on_actor` | Pressure on the actor was removed in the event (rescue, deadline averted, threat neutralized, accusation withdrawn). |
| `event_violated_actor_principle_or_value` | Actor's belief, principle, oath, or value was violated by the event. |
| `event_changed_relationship_with_other` | Relationship state with another actor moved on a load-bearing axis in this event (betrayal, intimacy, debt, authority shift). |
| `accumulated_pressure_crossed_threshold` | Sustained pressure (clock value rising across pages, repeated micro-stresses) became affectively load-bearing without a single triggering event; the cited `trigger_event` names the latest contributing SE. |

#### §5a.1 `state_relations[]` Field

`state_relations[]` records this event's relation to a target story-state record, currently the plan-related relation domain consumed by `stplan-event-plan-relation-consistency`, `stplan-closure-status-requires-closure-event`, and `stemo-agency-effect-compatibility`.

Each entry has this shape:

```yaml
relation: advances
target_record: STPLAN-12
```

`relation` is one of `advances | tests | blocks | revises | fulfills | abandons | ignores`. `target_record` is a record id; the plan-relation validators require the target to be the relevant `STPLAN-*` record for this relation domain.

#### §5a.2 `non_propagation_facts[]` Field

When an expected witness group receives no `BEL` create/supersession, record the explicit non-propagation assertion in `SE.non_propagation_facts[]`.

Each entry has this shape:

```yaml
reason: event_leaves_no_accessible_trace
group: direct_witnesses
records: [DA-4]
```

`reason` is one of `no_witness | witness_incapacitated | evidence_concealed | institution_suppresses_report | event_leaves_no_accessible_trace`. `group` is one of the computed direct-witness group labels accepted by `expected_witness_coverage`: `direct`, `direct_witnesses`, `direct:<STLOC-id>`, or `location:<STLOC-id>`. The `direct` and `direct_witnesses` forms are bundle-stable; the location-bearing forms are computed at validation time from the event actor's active `STSTAT.location`. Free-form descriptive labels are not accepted; put descriptive context in `records[]` and `world_logic_rationale`. `records[]` names the story-local records that justify or contextualize the non-propagation fact. `expected_witness_coverage` and `non_propagation_facts_completeness` consume this field directly.

#### §5a.3 Witness Trigger Conditions and Public BEL Requirement

The `expected_witness_coverage` validator activates for an `SE` record when any of these conditions holds:

1. The event creates a `BEL` whose `basis.source_event` is that `SE` and whose `visibility` is in the validator's `PUBLIC_BEL_VISIBILITIES` public-coverage set: `public`, `shared`, `factional`, or `rumored`.
2. The event creates a story-local `DA` with `circulation: public` or `circulation: factional`.
3. The event creates or supersedes an active `STENT`.
4. The event supersedes a `STSTAT` whose `entity` is not the event's `actor`.

The validator computes the direct-witness group from active `STENT` records at the actor's active `STSTAT.location`, excluding the actor and excluding entities whose active status is unavailable (`unconscious`, `dead`, or `incapacitated`). When the validator is active and direct witnesses exist, every direct witness must be covered by one of two lawful discharge paths:

- A same-event public-coverage `BEL` with `visibility` in `public`, `shared`, `factional`, or `rumored`, whose `holder` is that witness, `public`, or `group:direct_witnesses`.
- An `SE.non_propagation_facts[]` entry whose `reason` is closed-set per §5a.2, whose `group` is one of the computed direct-witness group labels from §5a.2, and whose `records[]` contains every direct witness in the computed group.

Private, concealed, and suppressed `BEL` records do not discharge `expected_witness_coverage`, even when their `holder` is one of the direct witnesses. A private interior belief can satisfy FOUNDATIONS §Story Bundles §6a (Belief vs. Fact) because it records what a character believes; it does not prove public or shared witness propagation. The layers are intentionally separate: FOUNDATIONS §Story Bundles §6a says what epistemic state must be recorded, while this validator-level rule says whether observable witness coverage has been discharged.

For a non-actor status-supersession with no plausible external observation, such as an interior-state-only update or a relocation whose public trace is intentionally absent, use `SE.non_propagation_facts[]` with `reason: event_leaves_no_accessible_trace`, a legal computed direct-witness `group`, and `records[]` containing every computed direct witness. Do not rely on a private `BEL` to discharge this validator path.

**System-actor `story_start` case.** When `actor: system` (the canonical bootstrap genesis configuration — `SE-1` with `event_kind: story_start`), the system actor has no `STSTAT` and therefore no `STSTAT.location`. The direct-witness group computation at the actor's `STSTAT.location` returns an empty set, and the discharge requirement is structurally satisfied with no explicit `non_propagation_facts[]` entry required even when the triggering conditions fire (e.g., trigger 3, "the event creates or supersedes an active `STENT`", is unavoidably satisfied at genesis because every initial `STENT` is first-introduced via `SE-1.state_delta.create`). Bootstrap-skill operators MAY emit a defensive `non_propagation_facts[]` entry of the canonical shape `{reason: event_leaves_no_accessible_trace, group: direct_witnesses, records: []}` for explicit-discharge audit-trail visibility; the `records: []` empty-list form is the lawful canonical shape for the empty-witness-group case (every computed direct witness is in the list because the list is empty). The defensive entry adds no validation strength — the structural discharge is sufficient on its own — but it makes the genesis event's empty-witness-group rationale audit-readable rather than computable-only.

## 6. Action Routing

When a player selects a `CHC` or supplies a write-in, the turn-cycle resolves it to exactly one of six outcomes:

| Route | Meaning |
|---|---|
| `accept` | The action can happen as stated. |
| `accommodate` | The intent is honored but transformed by world constraints. |
| `attempt` | Success is uncertain; resolve by state, capability, opposition, luck policy, and consequences. |
| `world_block` | The action is impossible in the current world / state; the page dramatizes the failed attempt or the impossibility itself. |
| `promotion_hold` | The action asserts a world-level truth or canon mystery resolution and pauses for `story-fact-promotion-to-canon`. |
| `terminal` | The action coherently closes the branch. |

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route and a page plan that dramatizes the outcome. A skill that drops a player action without producing a page is broken.

**Choice Consequence Integrity.** An accepted `CHC` selection or accepted write-in must not be cosmetic-only. At page-plan commit, it must produce at least one grounded consequence: a non-empty `SE.state_delta`, a new / superseded / closed story-bundle record, a changed visibility or affordance state, or a recorded failure / refusal / block that is itself the consequence. A purely rhetorical or expressive choice is lawful only when the parent page plan explicitly marked that choice as rhetorical before selection.

`outcome_route: world_block` is still the routing value for impossible actions. It does not pair with an event-kind value named `world_block`; `SE.event_kind: turn_resolution` records ordinary turn resolution while `SE.turn_driver.kind` distinguishes player selections, write-ins, and non-player drivers. Repair flows continue to use `system_repair` or `audit_repair`.

## 7. Nine Shared Hard Gates

Every PG-authoring story skill (`branching-story-bootstrap` and `branching-story-turn-cycle`) validates these nine hard gates at page-plan commit; gate results are recorded in the flat `PG.validation_trace` mapping using the nine schema keys defined in §4.2 (one entry per gate, keyed by the gate name), and each gate's pass entry requires a one-line rationale (per AGENTS.md "Validation test PASS entries require a one-line rationale"). The rationale prose target form is one sentence per gate, <= 30 words, with no semicolon-chained sub-clauses; `validation_trace_shape_compliance` enforces only the flat nine-key mapping shape, so rationale length is authoring-side discipline. Gate FAIL produces a direct-artifact partial failure under HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). Non-PG story skills (`branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) preserve the same invariants — branch isolation, Mystery Reserve firewall, observer firewall, schema compliance, replay consistency, choice-set non-collapse, motivation grounding, terminal proof, and turn-driver lawfulness when they emit or audit turn-resolution state — through their own skill-local validation phases and HARD-GATE discipline. When non-PG skills emit audit-only SE records, §4.3a applies.

| # | Gate | Checks |
|---|---|---|
| 1 | input legality | Exactly one source action (chosen CHC or write-in) UNLESS the resolved event is `story_start`. Parent page exists and belongs to the named story bundle UNLESS the resolved event is `story_start` (PG-1). The chosen CHC, if any, was emitted by the parent page and not retired. |
| 2 | parent snapshot compatibility | The loaded parent snapshot's `state_hash` matches `PG.state_hash_parent`. The parent `state_snapshot.canon_revision` has been compared against the current world-canon revision and canon-baseline drift is classified before proceeding. |
| 3 | mystery / invariant firewall | No `M-<integer>` with `status: forbidden` is resolved. No INV record is violated. `mystery_policy.forbidden_resolutions` of the selected commitment block is respected. |
| 4 | branch isolation | No record from a sibling branch appears in this page's `state_snapshot.active_records`. No author-pool commitment block references branch-local record ids. |
| 5 | append-only delta | All changes in `SE.state_delta` are creates / supersessions / closes. No in-place mutation of a prior record. |
| 6 | consequence capacity or terminal proof | The new page has at least one eligible commitment block OR `state_snapshot.continuation.terminal_status` is `branch_pause` / `terminal_closed` with a rationale that names how high-salience debts were closed, abandoned, or inherited. Debt salience reads `urgency` uniformly on active `OBL`, `CNSQ`, `THR`, and `STINT` records. Choice Consequence Integrity also applies here: accepted choices and accepted write-ins must produce a grounded consequence unless the parent page plan marked the choice as rhetorical. |
| 7 | plan grounding | Every declared affordance, every required beat from the chosen commitment block, and every CHC emitted by this page is grounded in `state_snapshot.active_records` or world canon. Observer Firewall also applies here: selected `SLT` actor-bindings, emitted choices, and character actions must rely only on information available to the acting entity or record a valid access route. |
| 8 | canon promotion hold | If `SE.outcome_route == promotion_hold` or any `promotion_claims[].authority == canon_candidate`, the world-level truth is held for promotion (not asserted in this page's state delta as if already canon). Marked `NOT_APPLICABLE` with rationale when no canon claim is in play. |
| 9 | Turn-Driver Lawfulness | Every `turn_resolution` event carries a well-formed `turn_driver` whose driver records are active on the parent page snapshot, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall). Enforced by `turn_driver_schema_compliance` for cross-record-boundary constraints and `turn_driver_pov_observer_firewall` for POV access-route consistency at page-plan commit. Marked `NOT_APPLICABLE` with rationale for `story_start`, repair, prose-attach, and promotion-closeout events that lawfully omit `turn_driver`. |

A skill that bypasses any gate is broken. Hook 3 structurally enforces patch-engine-only writes to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml`, so a malformed plan is rejected at the patch engine before any record lands.

## 8. Page Plan Minimum Contract

`pages-prose-plans/PG-<integer>.md` is a direct-write artifact (not an atomic `_source/` record). It is the prompt package for the external prose renderer. Each plan body has 19 numbered sections plus required §7a for `turn_resolution` events, and optional §9b, §9c, §10b when relevant story-state records are active or relevant:

| § | Section | Source |
|---|---|---|
| 1 | Story kernel excerpt | `STORY_KERNEL.md` slice |
| 2 | **Content Policy** | **inlined verbatim from `docs/prose-renderer-contract/content-policy.md`** |
| 3 | **Prose Craft Contract** | **inlined verbatim from `docs/prose-renderer-contract/prose-craft-contract.md`** |
| 4 | Relevant world-canon excerpt | context packet |
| 5 | Active cast and entity statuses | `state_snapshot.entity_status` |
| 6 | Current location and affordances | `state_snapshot.visible_affordances` |
| 7 | Selected event and state delta | `SE` translated into renderer-facing prose direction, with record-id grounding allowed where it is load-bearing for state movement; engine state-delta arrays and lifecycle bookkeeping live in §15 frontmatter |
| 7a | Turn driver / initiative trace | `SE.turn_driver` + parent-page active pressure disposition; fixed driver rows and disposition cell shape stay validator-enforced, while reason prose avoids bare record-id rationale where possible |
| 8 | Required beats from the commitment block | selected `SLT.beats` |
| 9 | Relationship and belief context | active `SREL`, `BEL` translated into renderer-facing relationship and knowledge prose, with record-id grounding allowed where it disambiguates load-bearing state |
| 9b | Active actor plans / tactical agency (optional) | per-page-computed from active `STPLAN` records; preserve the structural labels, but write each field as prose-direction content |
| 9c | Emotional causality / affective transition (optional) | per-page-computed from active `STEMO` records; preserve the structural labels, but translate affect and pressure enums into behavior prose |
| 10 | Open obligations, consequences, threads | active `OBL`, `CNSQ`, `THR`, including each record's `urgency` |
| 10b | Open Setups, Active Clocks, Hidden Secrets (optional) | per-page-computed from active `STQ`, `CLK`, and `STSEC`; body uses prose pressure/setup descriptions while numeric fields stay in §15 |
| 11 | Forbidden mystery resolutions | `mystery_policy.forbidden_resolutions` |
| 12 | Stopping point | from commitment block + author judgment |
| 13 | Next choices to foreshadow or make available | emitted `CHC[]` |
| 14 | Recent prose continuity (optional, when parent rendered prose exists) | structured packet derived from parent `pages-prose/PG-<integer>.md` |
| 15 | Plan frontmatter (engine fields, hash, page id) | engine |
| 16 | Cast material reality projection (optional) | per-skill |
| 16a | STCHAR-derived character authority packets (mandatory when relevant) | STCHAR profile + page state |
| 17 | Style and register notes (optional) | per-skill |
| 18 | Anti-pathology checklist | per-skill |
| 19 | **Render-time instruction block** | **inlined verbatim from `docs/prose-renderer-contract/render-time-instruction.md`** |

**§2, §3, and §19 are inlined verbatim on every page plan.** This is operationally load-bearing: the external prose renderer has no cross-plan state — every page render is a cold context. Compacting these sections on subsequent pages would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across pages. Byte-equality between canonical source and inlined section is enforced by the `page_plan_verbatim_section_integrity` structural validator (`tools/validators/src/structural/page-plan-verbatim-section-integrity.ts`); drift fails the gate.

### 14. Recent prose continuity

§14 is optional and appears only when a parent rendered-prose artifact exists on disk at `pages-prose/PG-<parent>.md`. Bootstrap PG-1 omits §14 because it has no parent. A turn-cycle page whose parent prose has not yet been rendered also omits §14; parent page snapshots remain valid fork points with or without rendered prose.

When §14 is present, do not inline full parent prose. Author a structured continuity packet:

```markdown
## 14. Recent prose continuity

### Where the previous page ended
- <Several concise continuity bullets: what happened, where the cast is, what is held.>

### Facts to preserve
- <Object, position, body, relationship, or state facts the next page must honor.>

### Do not reuse these exact prior phrases, anchors, or metaphor stocks
- <Prior phrase, sensory anchor, image, or metaphor stock to avoid repeating.>

### Fresh anchor opportunities
- <Concrete sensory, material, behavioral, dialogue, or subtext opportunity for this page.>
```

Verbatim prior-prose quotation is permitted only when an exact line must be answered in a mid-dialogue continuation, a clue phrase carries legal or social weight, or the renderer must preserve a precise lie, promise, accusation, or question. When quotation is permitted, quote only 1-3 lines and name the trigger condition in the packet. The cap is a leakage-prevention rule for quoted parent prose, not a rendered-prose length target.

### 7. Selected event and state delta

§7 is the renderer-facing translation of the selected event and its state movement. It must tell the prose renderer what changed in the scene, pressure field, and relevant interior state in human prose. Record IDs may appear when they are the load-bearing grounding for a state movement, but do not dump the engine ledger as §7 body text: `state_delta.create[]`, `state_delta.supersede[]`, `state_delta.close[]`, `record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`, and raw field arrays belong in §15 frontmatter or the underlying `SE` record.

Preferred §7 body shape is a short prose-direction packet such as:

```markdown
What changed in <actor>'s interior this page:
- <The actor's intent, appraisal, or pressure changed in story terms.>
- <A new belief, observation, obligation, clock, or consequence becomes renderable as situation, behavior, or perception.>
- <Any non-propagation or witness limit is expressed as what the prose may or may not show, not as YAML.>
```

The body can mention the selected event, route, rationale, player-visible outcome, and the record IDs needed to ground those state movements, but lifecycle arrays, introduction triggers, relation verbs, and non-propagation arrays remain greppable from §15 frontmatter for plan grounding and validation.

### 7a. Turn driver / initiative trace

§7a is a render-side projection of `SE.turn_driver`, not a second state engine. It is required for every `SE.event_kind: turn_resolution` page plan and omitted when `SE-1` is `story_start` with no turn driver. Required content (all lines must appear; values are page-author-supplied):

- Driver kind: <one of player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision>
- Initiator: <STENT-<integer> | player | world | system | unknown>
- Driver records: <comma-separated record ids; matches SE.turn_driver.driver_records>
- Player response mode: <initiates | responds | witnesses | chooses_continuation | none>
- POV visibility: <perceived_directly | inferred_from_trace | reported | discovered_after | withheld>
- Observer-firewall note: <one sentence on the access route for non-player drivers; "n/a" for player_action / player_write_in>

The `SE.turn_resolution` event's `world_logic_rationale` is the carrier for driver justification; §7a's `Driver kind:` and `Driver records:` lines together with `world_logic_rationale` form the complete driver provenance. Do not add a separate `why_now` field.

Active-pressure disposition appears in §7a whenever the parent `PG.state_snapshot` has high-urgency active records. Every high-urgency active record on the parent snapshot appears in exactly one row:

| Record | Disposition | Reason / expiry |
|---|---|---|
| <ID> | selected | became this turn's driver |
| <ID> | deferred | <expires after PG-<integer> or condition> |
| <ID> | rejected | <one-sentence reason> |

The table keeps the closed `Disposition` vocabulary and `Reason / expiry` cell shape enforced by `active_pressure_handling_discipline`. Within that shape, write the reason as prose-facing pressure or scene logic rather than bare record-id rationale where possible. A deferred row may say `until the actor has a private opening to decide whether to approach`, and a selected row may say `became this turn's driver after the observed risk crossed the action threshold`; it must still satisfy the literal `PG-<integer>` or conditional-connective rule when the validator requires it.

### 9. Relationship and belief context

§9 is the renderer-facing account of the relationships, beliefs, suspicions, lies, witness memories, and access routes that matter on this page. Do not enumerate active `SREL` / `BEL` records as the body text. Write the relationship or knowledge state in prose, such as:

```markdown
Jon and Ane have no prior shared history; she has still not noticed him. Jon privately believes she has been on the bench for hours, and Ane believes she is alone in the park.
```

The record ids that ground the statement may appear in §9 when they disambiguate load-bearing state, and also belong in §15 frontmatter and, when they modulate a character authority packet, in §16a `Current-state grounding records:`. §9 must still explain the relationship, belief, lie, suspicion, or public claim by its story meaning rather than making the prose renderer parse id lists as shorthand for human context.

**§9b is per-page-computed, not inlined verbatim.** When present, it renders the current page's relevant active `STPLAN` records — one entry per active plan with sub-bullets per the template below:

```markdown
## 9b. Active actor plans / tactical agency

- STPLAN-<integer> — Holder: STENT-<integer>.
  - Objective:
  - Root intention:
  - Current step:
  - Belief basis:
  - Resources/leverage:
  - Blockers:
  - Fallbacks currently available:
  - This page's plan movement:
  - Prose must show:
  - Prose must not imply:
```

§9b is omitted entirely when no active STPLANs exist on the current branch. Preserve the `STPLAN-<integer> — Holder: STENT-<integer>` heading and the sub-bullet labels above because validators and reviewer discipline depend on the shape. Inside those labels, translate engine fields into prose: `Current step:` describes what the holder is trying next rather than naming an `action_family`; `This page's plan movement:` says how the page advances, tests, blocks, revises, fulfills, abandons, or ignores the plan in story terms rather than exposing `SE.state_relations[]`.

**§9c is per-page-computed, not inlined verbatim.** When present, it renders the current page's relevant active `STEMO` records — one entry per active emotion with sub-bullets per the template below:

```markdown
## 9c. Emotional causality / affective transition

- STEMO-<integer> — Holder: STENT-<integer>.
  - Affect (kind + intensity):
  - Trigger event:
  - Appraisal basis:
  - Behavioral pressure:
  - Transition this page (if any):
  - Prose must render:
  - Prose must avoid:
```

§9c is omitted entirely when no active STEMOs exist on the current branch. Preserve the `STEMO-<integer> — Holder: STENT-<integer>` heading and the sub-bullet labels above. Inside those labels, translate enum-like content into behavior and appraisal prose: `Affect (kind + intensity):` may say "an extreme moral dread"; `Behavioral pressure:` may say "the actor pulls toward staying out of notice and toward physical stillness" rather than `conceal, freeze`; `Transition this page:` names the felt or behavioral change the prose must render. `branching-story-turn-cycle` owns the rendering procedure for both §9b and §9c, parallel to its existing §10b rendering ownership.

**§16a is a page-local projection, not inlined STCHAR or current-state storage.** Every page plan MUST include one STCHAR-derived character authority packet for each viewpoint character, speaker, major actor, direct target, emotionally salient character, or any character whose behavior, voice, appraisal, relationship conduct, perception, embodiment, or agency materially shapes the page. Background-only entities whose behavior and voice do not shape the page may be omitted, but the omission must not ask the prose renderer to infer persona from an id.

§16a composes (1) stable STCHAR authority, (2) active current story-state records in the page snapshot, and (3) this page's rendering needs. STCHAR supplies stable voice, conduct, appraisal, pressure behavior, relationship behavior, perception, embodiment, agency tendencies, capabilities, limits, and anti-generic constraints. Active records supply current physical condition, belief, plan, emotion, relationship state, pressure, secret/question/clock state, location, objects, and causal event. A §16a packet must not imply that current state lives inside STCHAR.

Semantic Preservation Contract: for any STCHAR derived from a world `CHAR` (`source_kind: world_char`), every structured operational source fact must be copied, transformed, compressed, intentionally omitted with rationale, or marked story-irrelevant. No structured operational source fact may survive only in `## Source Distillation` or other audit/commentary prose if page planning, choice grounding, state derivation, or prose rendering may need it. The STCHAR frontmatter `source_operational_fact_map` records this disposition for each present structured `dramatic_core` source field; retained facts target operational STCHAR homes, never `Source Distillation`.

Each §16a packet includes:

```markdown
## 16a. STCHAR-derived character authority packets

- STENT-<integer> / STCHAR-<integer> — <display name>.
  - Required because: viewpoint | speaker | major_actor | direct_target | emotionally_salient | behavior_shapes_page | voice_shapes_page | offstage_causal.
  - Story-facing identity for this page:
  - Stable STCHAR seed used:
  - Current-state grounding records: <STEMO-<integer>, BEL-<integer>, STPLAN-<integer>, SREL-<integer>, STSTAT-<integer>, STOBJ-<integer>, STLOC-<integer>, THR-<integer>, OBL-<integer>, CNSQ-<integer>, CLK-<integer>, STSEC-<integer>, STQ-<integer>, SE-<integer>, PG-<integer>; or `none; stable STCHAR authority only.`>
  - Page-local projection:
  - Relevant appraisal rules:
  - Relevant pressure behavior:
  - Relationship-specific conduct:
  - Perception and embodiment constraints:
  - Agency and planning tendency:
  - Relevant capabilities / limits for this page:
  - Prose must show:
  - Prose must not imply:
  - Anti-generic warnings:
```

When page-local modulation depends on active state, `Current-state grounding records:` names the active records that ground that modulation, cited by id. When no current-state record is needed, the field reads exactly: `Current-state grounding records: none; stable STCHAR authority only.` Page plans must not cite world `CHAR-*` as operational page-plan characterization authority. In §16a packet fields, any `PG-<integer>` or `SE-<integer>` token is treated as an operational current-state citation: cite only the current page's own `PG` or resolved `SE` id there. To discuss earlier pages or events as history, use prose such as "the prior observation beat" or "the parent-page action" rather than a literal page/event id unless that id is deliberately active/current for the packet.

The canonical post-SPEC-71 §16a packet field set is:

- `STENT / STCHAR / display name`
- `Required because:`
- `Story-facing identity for this page:`
- `Stable STCHAR seed used`
- `Current-state grounding records:`
- `Page-local projection`
- `Prose must-show`
- `Prose must-not-imply`
- `Anti-generic warnings`

`Required because:` is parsed as a comma-separated label set drawn from the closed vocabulary above. The `page_plan_stchar_packet_integrity` validator requires voice authority in the stable seed and page-local projection when the set contains any of `speaker`, `viewpoint`, or `voice_shapes_page`, and forbids `offstage_causal` for any STENT whose `location` is not `offstage`. Voice authority is contract-conformant in either of two equivalent forms: a dedicated `- Voice/dialogue authority:` bullet with substantive content, OR substantive inline `Voice Bible` phrasing within the `- Stable STCHAR seed used:` or `- Page-local projection:` bullets. The validator accepts those forms; voice-requiring labels with NO accepted voice-authority signal in any of these surfaces still FAIL. Labels outside the closed vocabulary FAIL under the new contract. The receipt-side verbatim-composite contract in `story-record-schemas.md` §4.6 is unchanged.

For an active offstage character whose offstage activity causally bears on the page, §16a may use a reduced `offstage_causal` packet:

```markdown
- STENT-<integer> / STCHAR-<integer> — <display name>.
  - Required because: offstage_causal.
  - Story-facing identity for this page:
  - Stable STCHAR seed used:
  - Current-state grounding records: <grounding records for the offstage causal projection, or `none; stable STCHAR authority only.`>
  - Page-local projection:
  - Relevant appraisal rules:
  - Relevant pressure behavior:
  - Offstage causal relevance:
  - Relevant capabilities / limits for this page: <include only when the offstage character's capability or limit is the mechanism of their causal bearing on this page>.
  - Prose must not imply:
  - Anti-generic warnings:
```

The reduced packet carries only the offstage operational authority needed for this page: relevant appraisal rules, relevant pressure behavior when applicable, relevant capabilities or limits only when they are the mechanism of the offstage causal bearing, and the offstage causal relevance that explains what the character is doing off page that bears on the page. It omits the voice/dialogue authority content (in either canonical form per the full-packet contract above — dedicated `- Voice/dialogue authority:` bullet or inline `Voice Bible` phrasing within `- Stable STCHAR seed used:` / `- Page-local projection:`) and the on-page rendering lines for perception, embodiment, agency, and dialogue cues because the character is not rendered on the page.

Emit/omit boundary: an active offstage character (`entity_status.location: offstage`) whose offstage activity causally bears on the page should carry an `offstage_causal` packet; an offstage character with no causal bearing on this page may be omitted as background-only. The omission must still not ask the prose renderer to infer persona from an id. Whether offstage activity causally bears on the page is authoring judgment, not validator-graded.

A §16a packet is sufficient page-local authority for prose and prose-attach validation when it names why the character is required, is active in the snapshot, and carries the relevant voice/behavior authority for the page. It is not the default authority for new character-dependent state creation; that requires full or projected STCHAR section retrieval. §16a is the renderer's character voice and behavior authority; it does not replace §5 entity status, §9 relationship/belief context, §9b active plans, §9c emotional transition, §16 cast material reality projection, or §17 style/register notes. Page plans must not cite world `CHAR-*` as operational authority for characterization after STCHAR exists; world `CHAR` may appear only as non-operational provenance on the STCHAR itself or in explicit authoring/promotion/adjudication flows.

**§10b is per-page-computed, not inlined verbatim.** When present, it renders the current page's relevant active `CLK` records, active `STSEC` records, and active `STQ` records as prose pressure, secrecy, and setup/payoff direction. Numeric or closed-field details such as clock `value` / `max`, thresholds, salience, secret status, holder lists, clue-carrier counts, audience visibility, `payoff_of`, and `answer_records[]` stay greppable in §15 frontmatter and the underlying records; the §10b body translates them for the external renderer. For example: "the observation-window pressure has reached the halfway mark; the next noticeable shift comes when a third party enters the privacy of the scene." Subsections appear only for classes with relevant active records; when no `CLK`, `STSEC`, or `STQ` content matters for the render, §10b is omitted rather than emitted as an empty placeholder. `branching-story-turn-cycle` owns the rendering procedure for this section.

The plan must not expose engine jargon to prose-facing sections. Record IDs and schema-field vocabulary may appear in engine-output body sections (§5, §6, §7, §7a, §8, §9, §9b, §9c, §10, §10b, §13, §14) when they are load-bearing grounding; predicate DSL terms remain prohibited outside excluded verbatim/frontmatter sections. Renderer-facing prose sections (§1, §4, §11, §12, §17, §18) translate records into human-readable direction. Structural enforcement: `page_plan_body_engine_vocabulary_cleanliness` scans plan body sections outside §15 / §2 / §3 / §19 verbatim blocks with per-section policy, preserving the §16a `Current-state grounding records:` exemption and blocking the patch envelope at the validation phase when a scanned section has three or more hits.

For non-accept routes, §7 must include `SE.resolution.player_visible_feedback` so the prose renderer has the player-legible outcome receipt it must realize. For `accept`, §7 carries the selected event, route, rationale, and state delta without a `resolution` block.

The plan must not include word-count targets, floors, ceilings, ranges, or budgets. Pacing is expressed structurally through beats and stop conditions. See FOUNDATIONS §Story Bundles §9.

## 9. Branching and Rewind

To advance the story from any committed page (continuation or fork):

1. Load that page's `state_snapshot`. No sibling-branch records are read.
2. If continuing the existing branch, reuse `parent.branch_id`. If forking, allocate a new `BR-<integer>` whose `parent_branch_id` names the parent's branch and `forked_at_page_id` names the parent page.
3. Resolve the selected `CHC` or write-in via §6 action routing.
4. Select or JIT-create one `SLT` commitment block.
5. Build the state delta, build the next snapshot, compute the new `state_hash`.
6. Author the page plan, generate the next `CHC` set, validate against §7 hard gates.
7. Submit one patch envelope (§10 write order).

No sibling-branch prose may be read for state assembly. Cross-branch comparison belongs only in audit, not in turn-cycle.

## 10. Shared Write Order

Every state-changing skill follows this order at commit:

1. Build patch plan for story-bundle `_source/<class>/*.yaml` records (creates + supersessions + closes).
2. Dry-run validate via `mcp__worldloom__validate_patch_plan`.
3. Obtain approval token when execution mode requires it.
4. Submit patch plan via `mcp__worldloom__submit_patch_plan`.
5. Write direct-markdown artifacts: page plan (`pages-prose-plans/PG-<integer>.md`), story kernel updates, receipts, manifests.
5a. Post-write plan-hash verification. Immediately re-read the bytes of `pages-prose-plans/PG-<integer>.md` and recompute its `plan_hash` using the canonical helper at `tools/world-mcp/src/cli/compute-pg-hashes.ts` (CLI: `compute-pg-hashes --plan <plan-md-path> --pg <envelope-extracted-pg-record.json>`). The `--pg` input is JSON-only and must be the committed PG payload from `patches[N].payload.record`, not a YAML draft. The recomputed `plan_hash` MUST equal the committed `PG.plan.plan_hash` (the value the patch plan accepted in step 4) before step 6 runs. If the values differ, this is a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`: do not update `INDEX.md`; surface the mismatch with both the committed and recomputed hashes; repair the file to the already-approved bytes or re-run approval with the corrected bytes. The step 4 patch plan and its committed PG record are unchanged; the disk state is being reconciled to them. Hook 6 also blocks direct `Edit` / `Write` attempts on `pages-prose-plans/PG-<integer>.md` when the pending body does not match the stamped hash, and blocks bundle `INDEX.md` updates while any referenced PG plan is drifted; this hook is a tool-invocation guard, while the skill-level verification remains the authoritative post-write belt-and-suspenders check.
6. Update bundle `INDEX.md` last.
7. Update per-world `stories/INDEX.md` only when story visibility changed (new bundle, archived bundle).

Hook 3 blocks raw `Edit` / `Write` on `_source/<class>/*.yaml`. Story-bundle markdown surfaces (`STORY_KERNEL.md`, `INDEX.md`, `pages-prose/`, `pages-prose-plans/`, `audits/`, `storylet-batches/`, `story-promotions/`, `pages-prose-receipts/`) remain direct-write surfaces, with Hook 6 adding the plan-hash guard for `pages-prose-plans/PG-<integer>.md` and bundle `INDEX.md`, and Hook 7 adding the prose-hash guard for `pages-prose-receipts/PG-<integer>.yaml`.

If patch submission succeeds but a direct-write artifact fails, the story `_source/` records are authoritative and the artifact should be repaired directly. The skill must surface the partial-failure state to the user; silent retry is forbidden.

## 11. Mystery and Canon Authority

Story-local resolution-like claims are classified into four authority levels:

| Authority | Meaning | Promotion path |
|---|---|---|
| `apparent` | What appears to be true in the branch from the cast's epistemic position. May or may not match world canon. | No promotion. Treated as `BEL` if a holder is named. |
| `branch_local_counterfactual` | What is true *only in this branch*; contradicts canon or another branch deliberately. | No promotion. Lives as `SF` with branch-scoped truth. |
| `canon_candidate` | The branch asserts something that may be world-level truth and could be promoted to canon. | Pauses via §7 gate 8 until `story-fact-promotion-to-canon` runs and `canon-addition` adjudicates. |
| `canon_linked` | A prior story-local `SF` whose claim has been accepted into world canon. | Produced only by `story-promotion-closeout` after canon-addition acceptance; the parent CF id rides in `SF.derived_from`. |

Mysteries with `status: forbidden` are never resolved by any authority level. Mysteries with `status: active | passive` may be resolved per the `future_resolution_safety` coupling in FOUNDATIONS §Canon Layers.

## 11a. Character-Fit Selection Contract

The story-skill family selects `SLT` records for a turn through a four-layer mediation model anchored on the durable / current-state separation between `STCHAR` and the temporal record classes (`STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `DA`, `STOBJ`, `STLOC`). This section codifies the contract; per-phase mechanics live in each skill.

### Four-layer mediation model

1. **Stable constraint layer (STCHAR).** A character's stable persona core, emotional appraisal map, pressure behavior, voice bible, perception/embodiment, agency/planning tendencies, relationship-specific behavior, capability/limit, and refusal patterns are durable authority. They do not change page-to-page; they shape *how* current state arises and is surfaced.

2. **Current-state derivation layer (`STPLAN` / `STEMO` / `BEL` / `SREL` / `STINT` / `STSTAT` / `OBL` / `CNSQ` / `THR` / `CLK` / `STSEC` / `STQ` / `DA` / `STOBJ` / `STLOC`).** Active records on the parent PG snapshot are the *operational surface* through which character specificity enters selection. STCHAR explains *why* a plan is blocked, *why* an emotion arose, *why* a relationship is fragile; the current records carry *that it is so right now*.

3. **Eligibility / ranking layer (`SLT` predicates + MCP filter pipeline).** Symbolic legality is decided by the predicate DSL against active records (see §5). Character specificity enters here as **predicate / edge overlap with current state**, not as direct STCHAR predicates in the global pool.

4. **Rendering / surface layer (page plan §16a + `CHC` wording).** The character-specific surface — viewpoint voice, refusal phrasing, relationship pressure, stance — is expressed at page-plan compose time and CHC authoring. §16a's `required_because` vocabulary is the authoring-time discipline for STCHAR packet inclusion.

### Global-pool vs branch-scoped STCHAR predicate discipline

`SLT.preconditions[].hard[]` may use `record_active(STCHAR-<integer>)` **only** when the SLT's `scope.visibility` is `branch_scoped` or `branch_prefix_scoped`. Global-author-pool SLTs (`scope.visibility: global_author_pool`) must express character relevance through:

- existential predicates over current-state classes (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`, `any_obligation_open`, etc.); or
- role-keyed predicates referencing `holder_role: primary_actor` / `holder_role: relevant_actor` plus a current-state class; or
- driver-record overlap (`SE.turn_driver.driver_records[]` is the universal current-state hook that crosses driver kinds).

This is a discipline contract, not a schema contract. The predicate DSL technically accepts `record_active(STCHAR-X)` at any visibility; the discipline above is operational. The `stchar-temporal-reference-boundary` validator enforces the inverse direction (STCHAR body cannot reference temporal records); the in-direction discipline lives here.

### What belongs in STCHAR

Stable persona core; stable appraisal patterns; pressure behavior; voice / dialogue authority; perception / embodiment; agency / planning tendencies; capability limits and costs; relationship-specific conduct; derivation guide; prose-rendering constraints.

### What belongs in current-state records

Current emotion (`STEMO`); current plan (`STPLAN`); current belief / knowledge / access route (`BEL`); current relation state (`SREL`); current intention (`STINT`); current status / location / agency (`STSTAT`); current obligation / consequence / thread (`OBL` / `CNSQ` / `THR`); current clock / secret / question (`CLK` / `STSEC` / `STQ`); current artifact / object / location affordance (`DA` / `STOBJ` / `STLOC`).

### CHC quality discipline (judgment-territory)

A `CHC` freezes intent, stance, accessible grounding, and likely pressure direction (see §4.5.12 in `story-record-schemas.md`). It does not promise exact outcome, hidden truth, success, selected storylet, state delta, NPC inner state without access route, or canonical promotion. Where a CHC's surface depends on character-specific refusal / appetite / fear / relationship pressure / voice / plan / belief / emotion, it cites the active `STCHAR` and the active temporal record(s) that make the choice available now. The `character-grounding-consistency` validator enforces the STCHAR-citation requirement when a CHC's text indicates a persona-specific surface. Deeper judgment criteria (whether choices reveal character, whether alternatives are morally / relationally distinct, whether the menu feels like agency rather than verbs) belong to health-audit and human / LLM review, not hard schema law.

### Non-player driver discipline

Under non-player initiative (`npc_action`, `offstage_action`, `world_pressure`, `clock_fire`, `secret_reveal`, `multi_actor_collision`), the selected SLT represents the initiator's character-specific committed move grounded in active driver records. Emitted CHCs for the player's response side must offer agency through stance variation (oppose, protect, question, withhold, redirect, interpret, refuse, expose, conceal, stay-silent, constrained write-in) and ground in driver records when the response mode is `responds`. The `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing` validator enforces the driver-record grounding requirement; stance-variation richness is health-audit / judgment territory.

### Hard discipline vs warning vs judgment

- **Hard discipline (validator-enforced)**: STCHAR body cannot store temporal state (`stchar-temporal-reference-boundary`); persona-specific CHCs must cite STCHAR (`character-grounding-consistency`); `responds`-mode CHCs must cite driver records (`turn-cycle-output-grounding-integrity`); SLT.grounding must name a reason to exist and avoid banned narrative-shape phrases (`slt-grounding-minimal-integrity`); CHC ↔ selected SLT trace closure (`chc-slt-selected-commitment-trace`); choice-set material noncollapse on the three deterministic axes (`rule_choice_set_noncollapse`).
- **Authoring discipline (skill-prose-enforced)**: the four-layer model above; the global-vs-branch-scoped STCHAR predicate rule above; CHC quality criteria; non-player driver stance variation richness.
- **Judgment territory (health-audit / human / LLM)**: whether a selection is dramatically alive given the active state; whether STCHAR is being operationalized through current state vs. being absorbed by current state; whether a non-player response choice set offers genuine agency vs. topical-but-passive options. The `branching-story-health-audit` structural mode's Phase 2m ("STCHAR authority health") is the current consumer site; deeper character-specificity audits live there if and when validator support lands.

## 12. How Skills Use This Contract

Each story-skill `SKILL.md` references this contract for: record schemas (§4), predicate DSL (§5), action-routing semantics (§6), the nine hard gates (§7), the page plan §19-section contract plus §7a turn-driver trace (§8), branching procedure (§9), shared write order (§10), mystery/canon authority (§11), and the character-fit selection contract (§11a).

Skills must not duplicate the contract's content. They cite it. If a skill needs a deviation, the deviation is amended into this contract first.

The contract does not describe:

- Per-skill workflow phases (each skill's `SKILL.md` owns these).
- Per-skill validation traces beyond the nine shared gates.
- Per-skill input / output specifications.
- Mode-specific behavior (e.g., `commitment-block-authoring` modes).
- Examples of skill invocations.

When `docs/FOUNDATIONS.md` and this contract disagree, FOUNDATIONS wins. Open the amendment by editing FOUNDATIONS first and propagating the change here.
