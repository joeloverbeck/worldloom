# Story State Contract

Shared by every state-changing skill in the worldloom story-skill family. This is the only place where the page lifecycle, branch snapshots, event deltas, record schemas, predicate DSL, action-routing semantics, nine hard gates, and shared write order are defined. Each skill's `SKILL.md` references this contract for those concerns; the contract does not describe per-skill workflows.

Authored to support the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`.

## 1. Authority Model

Three layers, in strict precedence:

1. **World canon** — authoritative world-level truth, stored as atomic YAML under `worlds/<slug>/_source/` (CF / CH / INV / M / OQ / ENT / SEC records per FOUNDATIONS §Mandatory World Files). Story skills may read it. They never mutate it directly. The only lawful story-to-world canon mutation path is `story-fact-promotion-to-canon` → `canon-addition` → optional `story-promotion-closeout`.
2. **Story state** — authoritative branch-local narrative state inside a story bundle at `worlds/<slug>/stories/<story-slug>/_source/`. Written through story-bundle record-ops on the patch engine.
3. **Rendered prose** — authorial surface text at `pages-prose/PG-<integer>.md` or `scene-prose/SCN-<integer>.md`. It can reveal, dramatize, omit, or stylize story state, but **it does not create story state by itself**. Prose is a rendering of state, not a second state engine.

**Plan-authority boundary.** Story state is authoritative at `PG`-record commit. A `PG` record is real the moment the patch engine accepts the bootstrap or turn-cycle state patch. No page-plan render artifact is part of the state turn. Rendered prose is planned and attached at scene scope after one or more committed `PG` records exist. The page snapshot is the fork primitive — any committed page is a valid parent for the next turn-cycle invocation, regardless of whether its prose has been rendered.

**Scene render layer.** An `SCN` record is a derived render-unit membership record over committed `PG` ranges. It records which already-committed causal ticks form one reader-facing scene and where the scene-plan/prose/receipt artifacts live; it never creates causal state, never changes a `PG`, and never carries future dramatic obligation or target narrative shape.

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
| `SCN` | Scene render-unit membership over an ordered contiguous range of committed `PG` records. |

`SF` records what *is* true in the branch. `BEL` records what a holder *believes / claims / witnesses / lies about*. `STCHAR` records stable story-local persona authority, not knowledge. These classes are kept separate so that lies, secrets, betrayals, witness asymmetry, contested public claims, and character voice remain coherent without inventing plot rails.

**Append-only / supersession discipline.** Once a record is committed it is not edited in place. Changes are expressed by writing a new record (next `<CLASS>-<integer>` id) whose `supersedes` field names the prior record. The patch engine enforces this at the file level for `_source/<class>/*.yaml`. `STCHAR` is a hybrid story-bundle authority artifact, created/superseded by patch-engine hybrid operations and participating in `PG.state_snapshot.active_records`.

## 4. Record Schemas

The full record-schema enumeration for all 22 story-bundle record classes plus the prose-receipt and scene-prose-receipt direct-write artifacts lives in a sibling shared template at `.claude/skills/_shared-templates/story-record-schemas.md`. That file preserves §4.X subsection numbering verbatim (so existing citations to §4.1 `BEL`, §4.2 `PG`, §4.2a deterministic PG hash computation, §4.3 `SE`, §4.3a audit-only SE events, §4.4 `SLT`, §4.4a shared `action_family` taxonomy, §4.4b `STENT` role and `SREL` axis taxonomies, §4.5.1 through §4.5.13, and §4.6 prose receipt all resolve without rewording in consumer skills, validators, and other shared templates). SPEC-42 adds `CLK` as §4.5.14, `STSEC` as §4.5.15, and `STQ` as §4.5.16 in the schema file without renumbering the existing prose-receipt §4.6 section; SPEC-56 adds `STCHAR` as §4.5.19; SPEC-92 adds `SCN` as §4.5.20 and the scene-prose receipt as §4.7.

Consumers that need only the authority model (§1), schema-minimalism doctrine (§2), record class inventory (§3), closed predicate DSL (§5), action routing (§6), nine shared hard gates (§7), scene-plan minimum contract (§8a), branching procedure (§9), shared write order (§10), mystery and canon authority (§11), or skill-usage overview (§12) can read this main contract alone; consumers that need any record schema additionally load `story-record-schemas.md`.

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

When the selected block becomes an `SE`, `SE.commitment.alias_bindings` records the exact matched ids. Soft preconditions that do not match any active record do not require a `commitment.alias_bindings` entry unless the alias is referenced by `bound:<alias>` in the SLT's `effects` or `exit_options[].likely_effects`; in that case, the binding is required to prevent a dangling downstream reference. The event schema accepts `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` for the corresponding `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, and `any_emotion_active` aliases, in addition to the pre-existing selected-move binding classes.

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

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route and a `PG` state snapshot that records the outcome. A skill that drops a player action without producing a page is broken.

**Choice Consequence Integrity.** An accepted `CHC` selection or accepted write-in must not be cosmetic-only. At `PG`-record commit, it must produce at least one grounded consequence: a non-empty `SE.state_delta`, a new / superseded / closed story-bundle record, a changed visibility or affordance state, or a recorded failure / refusal / block that is itself the consequence. A purely rhetorical or expressive choice is lawful only when the parent `CHC` or selected commitment trace explicitly marked that choice as rhetorical before selection.

`outcome_route: world_block` is still the routing value for impossible actions. It does not pair with an event-kind value named `world_block`; `SE.event_kind: turn_resolution` records ordinary turn resolution while `SE.turn_driver.kind` distinguishes player selections, write-ins, and non-player drivers. Repair flows continue to use `system_repair` or `audit_repair`.

## 7. Nine Shared Hard Gates

Every PG-authoring story skill (`branching-story-bootstrap` and `branching-story-turn-cycle`) validates these nine hard gates at `PG`-record commit; gate results are recorded in the flat `PG.validation_trace` mapping using the nine schema keys defined in §4.2 (one entry per gate, keyed by the gate name), and each gate's pass entry requires a one-line rationale (per AGENTS.md "Validation test PASS entries require a one-line rationale"). The rationale prose target form is one sentence per gate, <= 30 words, with no semicolon-chained sub-clauses; `validation_trace_shape_compliance` enforces only the flat nine-key mapping shape, so rationale length is authoring-side discipline. Gate FAIL rejects the patch plan before any story `_source` record lands under HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). Non-PG story skills (`branching-story-scene-plan`, `branching-story-scene-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) preserve the same invariants — branch isolation, Mystery Reserve firewall, observer firewall, schema compliance, replay consistency, choice-set non-collapse, motivation grounding, terminal proof, and turn-driver lawfulness when they emit or audit turn-resolution state — through their own skill-local validation phases and HARD-GATE discipline. When non-PG skills emit audit-only SE records, §4.3a applies.

| # | Gate | Checks |
|---|---|---|
| 1 | input legality | Exactly one source action (chosen CHC or write-in) UNLESS the resolved event is `story_start`. Parent page exists and belongs to the named story bundle UNLESS the resolved event is `story_start` (PG-1). The chosen CHC, if any, was emitted by the parent page and not retired. |
| 2 | parent snapshot compatibility | The loaded parent snapshot's `state_hash` matches `PG.state_hash_parent`. The parent `state_snapshot.canon_revision` has been compared against the current world-canon revision and canon-baseline drift is classified before proceeding. |
| 3 | mystery / invariant firewall | No `M-<integer>` with `status: forbidden` is resolved. No INV record is violated. `mystery_policy.forbidden_resolutions` of the selected commitment block is respected. |
| 4 | branch isolation | No record from a sibling branch appears in this page's `state_snapshot.active_records`. No author-pool commitment block references branch-local record ids. |
| 5 | append-only delta | All changes in `SE.state_delta` are creates / supersessions / closes. No in-place mutation of a prior record. |
| 6 | consequence capacity or terminal proof | The new page has at least one eligible commitment block OR `state_snapshot.continuation.terminal_status` is `branch_pause` / `terminal_closed` with a rationale that names how high-salience debts were closed, abandoned, or inherited. Debt salience reads `urgency` uniformly on active `OBL`, `CNSQ`, `THR`, and `STINT` records. Choice Consequence Integrity also applies here: accepted choices and accepted write-ins must produce a grounded consequence unless the parent `CHC` or selected commitment trace marked the choice as rhetorical. |
| 7 | state-delta grounding | The `PG.state_snapshot`, `SE.state_delta`, selected `SLT`, and emitted `CHC[]` are grounded in active story records, loaded canon, and lawful access routes. Observer Firewall also applies here: selected `SLT` actor-bindings, emitted choices, and character actions must rely only on information available to the acting entity or record a valid access route. |
| 8 | canon promotion hold | If `SE.outcome_route == promotion_hold` or any `promotion_claims[].authority == canon_candidate`, the world-level truth is held for promotion (not asserted in this page's state delta as if already canon). Marked `NOT_APPLICABLE` with rationale when no canon claim is in play. |
| 9 | Turn-Driver Lawfulness | Every `turn_resolution` event carries a well-formed `turn_driver` whose driver records are active on the parent page snapshot, whose driver kind matches the source of initiative, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall). Enforced by `turn_driver_schema_compliance`, record-only `pg_se_turn_driver_consistency`, and `turn_driver_pov_observer_firewall` for record-field and POV access-route consistency at `PG`-record commit. Marked `NOT_APPLICABLE` with rationale for `story_start`, repair, and promotion-closeout events that lawfully omit `turn_driver`. |

A skill that bypasses any gate is broken. Hook 3 structurally enforces patch-engine-only writes to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml`, so a malformed plan is rejected at the patch engine before any record lands.

## 8. Retired Page-Plan Contract

The former `pages-prose-plans/PG-<integer>.md` 19-section page-plan contract is retired for new `PG` authoring. `branching-story-bootstrap` and `branching-story-turn-cycle` commit story state as `SE` + `PG` + emitted `CHC` records and validate the nine shared hard gates against those records. They do not author page plans, do not stamp `plan.plan_hash`, and do not set `prose_plan_path`.

Legacy bundles may still contain `pages-prose-plans/`, `pages-prose/`, and `pages-prose-receipts/` artifacts. Those artifacts are read-only legacy publication surfaces for tools that serve old bundles; they are not current state-turn inputs and are not required for a committed `PG` to become a lawful parent.

Current renderer-facing prose planning lives in §8a's scene-plan contract. Scene plans translate committed `PG` ranges into prose direction after state is committed; they do not create or mutate causal story state.

## 8a. Scene-Plan Minimum Contract

Scene plans live at `scene-prose-plans/SCN-<integer>.md` and render one contiguous single-branch `SCN.pg_ids` range. They are direct-write publication-planning artifacts derived from committed `PG` records via retrieval, not from sibling prose plans. The `SCN` record remains the only engine-routed membership artifact; the scene plan itself has no state consequence.

Scene publication state is a read-time indicator, not an `SCN` schema field, validator input, or state-turn authority. Read surfaces derive it as follows:

| Indicator | Derivation |
|---|---|
| `planned` | `prose_path` file absent. |
| `prose-present` | `prose_path` file present, `receipt_path` file absent. |
| `attached:PASS` / `attached:WARN` / `attached:FAIL` | `receipt_path` file present; label carries the receipt `verdict`. |
| `superseded` | The `SCN` is named in another `SCN`'s `supersedes` and is not the latest in its lineage. |

The indicator is presentational only. It deliberately omits any stale/freshness state because that would require hashing editable scene plans, scene prose, or receipts.

Scene-plan bodies are novelist-facing. They must be zero-ID, zero-hash, zero-schema, zero-validator, and zero-lifecycle in prose-facing sections: no record ids, hash strings, patch-engine terms, supersession mechanics, validator names, or state-delta arrays as body shorthand. The scene plan translates committed `PG` events, visible state, forbidden resolutions, character authority, and choice surface into prose direction. Engine fields may appear only in clearly separated frontmatter or validation metadata when a later validator requires that metadata.

Minimum structure:

| Section | Source / role |
|---|---|
| `# Scene: <Title>` | `SCN.title` / human navigation |
| Content Policy | inlined verbatim from `docs/prose-renderer-contract/content-policy.md` |
| Prose Craft Contract | inlined verbatim from `docs/prose-renderer-contract/prose-craft-contract.md` |
| Render Mission | natural-language opening state to stopping point |
| What Changes in This Scene | emotional, relational, practical, and causal turn across the included PGs |
| Where the Scene Begins / Must End | concrete opening image, cast positions, final dramatic condition, and reader-facing choice surface |
| Beat Chain | required moves from the included committed PGs, translated out of record language |
| POV / Observer Firewall | what the POV may know, infer, misread, or not know |
| Cast & Voice | STCHAR-derived scene-local voice and conduct constraints, translated without STCHAR ids in the body |
| Emotional / Relationship Throughline | active relationship, belief, plan, and affect movement across the range |
| Physical Continuity | location, bodies, objects, and continuity facts that must hold through the range |
| Secrets & Forbidden Reveals | included PG forbidden resolutions and observer-firewall limits |
| Choice Surface | end-page playable choices only; intermediate choices are historical/x-ray |
| Render-Time Instruction | inlined verbatim from `docs/prose-renderer-contract/render-time-instruction.md` |

**§2, §3, and Render-Time Instruction are inlined verbatim once per scene plan.** This preserves the cold-context renderer contract at scene granularity. Byte-equality is enforced by `scene_plan_verbatim_section_integrity`; body cleanliness is enforced by `scene_plan_body_engine_vocabulary_cleanliness`.

Scene-scope validation is additive to the nine PG hard gates. `scene_range_contiguity`, `scene_range_single_branch`, and `scene_range_no_sibling` prove the `SCN` range is ordered, contiguous, and branch-local. `scn_no_narrative_shape_language` plus the scene-plan skill's §5c affirmation keep `scene_descriptor`, `boundary_rationale`, and plan body prose descriptive of committed beats rather than future-prescriptive act/arc shape. Scene attach is downstream and non-authoritative: it validates rendered prose and writes a receipt, but it is not a tenth PG gate and it never mutates `PG` or story state.

## 9. Branching and Rewind

To advance the story from any committed page (continuation or fork):

1. Load that page's `state_snapshot`. No sibling-branch records are read.
2. If continuing the existing branch, reuse `parent.branch_id`. If forking, allocate a new `BR-<integer>` whose `parent_branch_id` names the parent's branch and `forked_at_page_id` names the parent page.
3. Resolve the selected `CHC` or write-in via §6 action routing.
4. Select or JIT-create one `SLT` commitment block.
5. Build the state delta, build the next snapshot, generate the next `CHC` set, and compute the new `state_hash`.
6. Validate the `SE` / `PG` / `CHC` record set against §7 hard gates.
7. Submit one patch envelope (§10 write order).

No sibling-branch prose may be read for state assembly. Cross-branch comparison belongs only in audit, not in turn-cycle.

## 10. Shared Write Order

Every state-changing skill follows this order at commit:

1. Build patch plan for story-bundle `_source/<class>/*.yaml` records (creates + supersessions + closes).
2. Dry-run validate via `mcp__worldloom__validate_patch_plan`.
3. Obtain approval token when execution mode requires it.
4. Submit patch plan via `mcp__worldloom__submit_patch_plan`.
5. Write direct-markdown artifacts owned by the skill, such as story kernel updates, manifests, audits, storylet batches, story promotions, scene plans, scene prose, and scene-prose receipts.
6. Update bundle `INDEX.md` last.
7. Update per-world `stories/INDEX.md` only when story visibility changed (new bundle, archived bundle).

Hook 3 blocks raw `Edit` / `Write` on `_source/<class>/*.yaml`. Story-bundle markdown surfaces (`STORY_KERNEL.md`, `INDEX.md`, `pages-prose/`, `audits/`, `storylet-batches/`, `story-promotions/`, `scene-prose-plans/`, `scene-prose/`, `scene-prose-receipts/`) remain direct-write surfaces. Legacy `pages-prose-plans/` and `pages-prose-receipts/` may remain readable for old bundles, but current PG-authoring skills do not create them and no current hook relies on page-plan/prose-receipt hashes.

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

4. **Rendering / surface layer (scene plan + `CHC` wording).** The character-specific surface — viewpoint voice, refusal phrasing, relationship pressure, stance — is expressed through scene-plan rendering direction and CHC authoring. Scene-plan cast/voice requirements carry the renderer-facing STCHAR projection.

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

Each story-skill `SKILL.md` references this contract for: record schemas (§4), predicate DSL (§5), action-routing semantics (§6), the nine hard gates (§7), retired page-plan status and the scene-plan contract (§8/§8a), branching procedure (§9), shared write order (§10), mystery/canon authority (§11), and the character-fit selection contract (§11a).

Skills must not duplicate the contract's content. They cite it. If a skill needs a deviation, the deviation is amended into this contract first.

The contract does not describe:

- Per-skill workflow phases (each skill's `SKILL.md` owns these).
- Per-skill validation traces beyond the nine shared gates.
- Per-skill input / output specifications.
- Mode-specific behavior (e.g., `commitment-block-authoring` modes).
- Examples of skill invocations.

When `docs/FOUNDATIONS.md` and this contract disagree, FOUNDATIONS wins. Open the amendment by editing FOUNDATIONS first and propagating the change here.
