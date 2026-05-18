<!-- spec-drafting-rules.md not present; using SPEC-46's structure (Status / Phase / Depends on / Blocks / Source header + Problem Statement + Key Design Decisions + Approach + per-phase sections + FOUNDATIONS Alignment + Out of Scope + Deliverables + Risks & Open Questions + Test Plan). -->

# SPEC-47: Actor-Owned Tactical Plans (`STPLAN`) and Affective State (`STEMO`)

**Status**: PROPOSED
**Phase**: wave-2 active-record additions (two new story-bundle record classes built on SPEC-46's machine-facing retrieval foundation)
**Depends on**: SPEC-46 (machine-facing layer foundation fixes — all Phase B summaries and Phase C edges this spec extends from are landed); SPEC-42 (precedent pattern for adding new active record classes — `CLK`, `STSEC`, `STQ`); SPEC-45 (story-state provenance edge precedent)
**Blocks**: follow-up spec for present-causal-situation packet (depends on `STPLAN.objective` / `STPLAN.current_step` / `STPLAN.blockers` to populate `active_actor_wants` and `opposition`); follow-up `get_page_render_packet` aggregator spec (depends on both new classes + the Priority 2 packets)
**Source**: `reports/new-story-structures-proposal.md` §1 `STPLAN` + §2 `STEMO`; SPEC-46 §Out of Scope items 1 + 2 (deferred to follow-up specs on stated grounds); prior triage at this conversation's Wave 2 routing recommendation. Brainstorm-resolved decisions verified against `docs/FOUNDATIONS.md` §Story Bundles §5a / §5b / §5c / §6a / §6b, `.claude/skills/_shared-templates/story-state-contract.md` §3 / §4.5.2 (`STINT`) / §5 (closed predicate DSL) / §5a (mid-story tag grammar) / §7 (eight hard gates) / §8 (page plan contract) / §10 (shared write order), `.claude/skills/_shared-templates/story-record-schemas.md` (verified current `STINT` field count = 8; verified `SE` tag-pattern precedents at `non_propagation:` and `intro:<CLASS>(...)`), and `tools/validators/src/structural/midstory-introduction-utils.ts` parser surface.

---

## Problem Statement

Worldloom's story-bundle ontology already records what characters **want** (`STINT`), **believe** (`BEL`), **owe** (`OBL`), **feel-relationally** (`SREL`), and **physically can do** (`STSTAT`, `STLOC`, `STOBJ`, `DA`, affordances). The proposal at `reports/new-story-structures-proposal.md` identifies two genuine gaps that the existing classes do not own:

1. **Actor-owned tactical agency over multiple pages.** Current `STINT` (verified at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.2 — 8 fields: `id`, `story_id`, `created_at_page`, `supersedes`, `holder`, `intent`, `urgency`, `expires_when`) records *what* an actor wants. It does not record *how* the actor is presently trying to pursue it: the tactical step now in motion, the resources/leverage they are wielding, the blockers they have identified, the fallback they would attempt if the current step fails, and which beliefs the plan rests on. `SLT` is a reusable commitment block, not an actor-owned present strategy. `SE` is one event, not a persistent plan. The result is medium-range agency that is inferred by skill judgment or invented by the external prose LLM rather than carried as queryable engine state.

2. **Causal emotional state.** Current `BEL` records cognitive appraisal; `SREL` records durable relational valence; `STSTAT` records material life/agency/location. None records the *transient affective pressure causally biasing the actor's next action*. Without an affective-state record, validators cannot distinguish calm strategic deception from panic-driven concealment, shame-driven withdrawal from anger-driven confrontation, or grief-driven recklessness from relief-driven confession — these are different causal states, not just prose tones. The prose renderer must invent emotional transitions, and the engine has no surface to validate that invented affect matches branch state.

These gaps are addressed by adding two new active story-bundle record classes — `STPLAN` and `STEMO` — bundled into one spec because they share infrastructure surface (patch-engine ops + ID allocations + record specs, world-index edges, MCP context-packet summaries, page-plan template revision, tag-grammar extension, predicate DSL extension, validator chain). Splitting into two specs would duplicate ~70% of the cross-cutting work and create an ordering question between them; their semantics are also coupled (`STPLAN.belief_basis` and `STEMO.appraisal_basis` both index against the SPEC-46 `active_beliefs_by_holder` Phase B projection).

### Key design decisions

- **Considered the proposal's full ~15-field STPLAN schema; chose strict-minimalist 11-field v1 schema.** Dropped fields without proven §5b-class consumers: `risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`. SPEC-46 explicitly flagged these as lacking named-validator consumers; brainstorm verification confirmed three of the four are unused in the proposal's own validator/predicate/audit sections, and the fourth (`risk_posture`) is cited only in page-plan render templates — §5b explicitly excludes render-only consumption from the load-bearing categories (validation gate, replay primitive, predicate, fork operation, audit-trail discipline). The dropped fields move to an extension list with consumer-justification gating: each may land in a follow-up spec that names a concrete validator / MCP / render-guidance consumer.
- **Considered open vocabularies for STEMO's `affect_kind` and `behavioral_pressure`; chose research-backed closed enums.** Cross-taxonomy convergence research (Ekman 1972/1999, Plutchik wheel, OCC, Geneva Emotion Wheel, Cowen & Keltner 2017 27-category bridged-gradient study, Inside Out 2 consultancy) produced an 18-value `affect_kind` closed enum: `fear, anxiety, anger, disgust, grief, shame, guilt, humiliation, hope, relief, joy, awe, tenderness, desire, envy, contempt, confusion, dread`. Parallel research on action tendencies (Frijda 1986/1987, Roseman 2011, Lazarus-Folkman 1984, Skinner et al. 2003, Gray-McNaughton BIS/BAS/FFFS, Taylor 2000 tend-and-befriend, Gross 1998/2015) produced an 18-value `behavioral_pressure` closed enum: `approach, flee, freeze, attack, reject, dominate, submit, seek_contact, protect_other, seek_help, confess, conceal, withdraw_socially, plan, accommodate, self_soothe, ruminate, collapse`. Closed enums are validator-checkable and predicate-DSL-queryable; each value is non-redundant under the queryable-predicate test and backed by primary sources cited inline in the spec body. Two derivative calls: `numbness` is not an `affect_kind` value (it is the *absence* of affect — represented as `status: dissociated` with `affect_kind: null`); `surprise` is not an `affect_kind` value (it is a brief valence-ambiguous event-level appraisal switch, already adequately recorded at `SE.event_kind` / `SE.world_logic_rationale`).
- **Considered introducing structured `SE.record_introductions[]` field in SPEC-47; chose to extend the existing §5a `intro:<CLASS>(...)` tag grammar instead.** Verification surfaced that the proposal's `SE.record_introductions[]` sketch is *not* a strict superset of the current §5a tag grammar — it drops the two load-bearing fields (`trigger` closed-enum + `distinct_from` anti-duplication discipline) that anchor §5c discipline, and adds a `rationale` field that overlaps with existing `SE.world_logic_rationale`. The structured replacement is a separable design concern (proposal item 11) whose design is not settled. Extending the proven §5a grammar with `intro:STPLAN(...)` and `intro:STEMO(...)` requires only a small parser extension at `tools/validators/src/structural/midstory-introduction-utils.ts`, parallels six existing classes (CLK/STSEC/STQ/THR/STENT/SREL), and decouples SPEC-47 from item 11's design. When item 11 eventually lands (with `trigger` + `distinct_from` properly preserved), it migrates all eight classes uniformly in one pass.
- **Considered placing `plan_relation` (advances/tests/blocks/revises/fulfills/abandons/ignores) on a new structured `SE.plan_relations[]` field; chose the parallel parseable-tag pattern in `SE.world_logic_rationale`.** Follows directly from the §5a tag-grammar extension decision above. The new tag pattern `plan_relation:<relation>(plan=STPLAN-<integer>)` reuses the same parser surface, applies the same closed-enum vocabulary discipline (7 closed relations), and lands in the same migration when item 11 eventually unifies all `SE.world_logic_rationale` tag patterns into structured fields. Without `plan_relation`, the proposal's health-audit check ("flag actions by major actors that ignore active plans without rationale") and the validator ("SE that claims to advance a plan must cite active plan and create/supersede relevant records") have no consumer surface.
- **Considered validator-enforced numeric caps on bootstrap-time `STPLAN`/`STEMO` seeding; chose skill-prose discipline + health-audit drift check.** The proposal's "load-bearing only" bootstrap discipline ("player-proxy plan, main opposing actor plan, one hidden/partial plan if dramatic irony matters; do not create plans for every cast member") does not naturally express as a numeric cap (the right number depends on cast size, premise, opening situation). Enforcement lives in `branching-story-bootstrap` SKILL.md prose (parallel to how `character-generation` carries its own load-bearing discipline) plus a new `branching-story-health-audit` check that flags `STPLAN` / `STEMO` records seeded at story_start that were never queried, superseded, or consumed across the bundle's branch tree (post-hoc bloat detection). Per-actor opt-in via new `STENT` fields was rejected as schema inflation with no other consumer.
- **Considered staging the 6 new predicate-DSL extensions across multiple specs; chose all-6-in-v1.** Each predicate (`plan_active`, `plan_blocked`, `any_plan_active`, `emotion_active`, `any_emotion_active`, `emotion_pressure`) has a named consumer in `SLT` preconditions for plan/emotion-aware commitment blocks; without them, `STPLAN` / `STEMO` records would be MCP-queryable (via the Phase C summaries below) but not author-pool-queryable, blocking plan/emotion-aware storylets from day 1 — the precise value proposition the new classes exist to deliver. Closed grammar grows from 33 individual predicates to 39 (combinators `not | all | any` unchanged at 3, for 42 total entries).
- **Considered including the proposal's 8 judgment-based audits in v1 (plan plausibility, cleverness, fallback character-specificity, plan-produces-choice-pressure, emotion psychological-truth, intensity-appropriateness, prose-specificity, repetition/melodrama); chose to defer all 8.** These are non-deterministic by nature (the proposal itself classifies them as judgment-based, not deterministic). `branching-story-health-audit` SAU mode can adopt them iteratively as authoring evidence accumulates. v1 SAU integration is limited to the bootstrap-drift check described above.
- **Considered making STPLAN/STEMO promotion-to-canon a first-class concern; chose minimal promotion integration.** STPLAN and STEMO themselves rarely promote to world canon (an actor's tactical approach and transient affective state are branch-local). What may promote is a derived `SF` / `SREL` / `character_outcome` arising from the plan's execution or the emotion's downstream consequence. `story-fact-promotion-to-canon` treats both classes as evidence context (citable in promotion proposal rationale) but not as promotion source classes. `story-promotion-closeout` integration: when a canon verdict invalidates a plan's `belief_basis` or an emotion's `appraisal_basis`, the closeout flow may supersede the affected `STPLAN` with `plan_status: abandoned` or the affected `STEMO` with `status: transformed` (with the canon verdict as the closure-event citation). No new promotion source-kind value is added.

---

## Approach

Three additive phases. All changes are **additive** — no existing record schema is altered, no existing validator changes behavior, no existing context-packet field is renamed. Bundles without `STPLAN` / `STEMO` records remain valid; consumers unaware of the new classes / edges / predicates / page-plan sections continue to work.

### A. Schemas, patch-engine, ID allocation, source-directory layout

**Site**: `.claude/skills/_shared-templates/story-record-schemas.md` (new sections §4.5.17 + §4.5.18); `tools/validators/src/schemas/` (two new JSON schemas); `tools/patch-engine/src/` (`IdAllocations`, `OPERATION_KINDS`, `PatchOperation`, `STORY_RECORD_SPECS`); `mcp__worldloom__allocate_next_id` allocator surface; `.claude/skills/_shared-templates/story-state-contract.md` §3 record-class inventory.

**STPLAN schema** (v1, strict-minimalist, 11 fields counting composite fields as one each):

```yaml
id: STPLAN-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
created_by_event: SE-<integer>*               # introducing event provenance
supersedes: STPLAN-<integer> | null           # default null
holder: STENT-<integer>*
root_intention: STINT-<integer>*
objective: string*                            # natural-language plan objective
plan_status: active | blocked | suspended | fulfilled | failed | abandoned | revised*
belief_basis: [BEL-<integer>]*                # default []; non-empty when plan_status: active
resource_basis:                                # composite; all sub-lists default []
  facts: [SF-<integer>]
  objects: [STOBJ-<integer>]
  locations: [STLOC-<integer>]
  artifacts: [DA-<integer>]
  relationships: [SREL-<integer>]
  obligations: [OBL-<integer>]
blockers: [<record_id>]                       # default []
current_step:                                  # composite; required when plan_status: active
  action_family: <action_family>*              # closed enum per story-state-contract.md §4.4a
  target_records: [<record_id>]                # default []
  success_condition:
    predicates: [<predicate object>]*          # closed predicate DSL per §5
fallback_steps:                                # default []; 0+ entries
  - action_family: <action_family>*
    trigger_predicates: [<predicate object>]*
    target_records: [<record_id>]
expires_when: string*                         # natural-language supersession trigger
derived_from: [<record_id>]                   # default []
```

**STEMO schema** (v1, research-backed closed enums):

```yaml
id: STEMO-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
created_by_event: SE-<integer>*
supersedes: STEMO-<integer> | null            # default null
holder: STENT-<integer>*
status: active | suppressed | settled | transformed | dissociated*
affect_kind: <closed enum 18 values> | null   # null only when status: dissociated
                                              # values: fear | anxiety | anger | disgust | grief |
                                              #         shame | guilt | humiliation | hope | relief |
                                              #         joy | awe | tenderness | desire | envy |
                                              #         contempt | confusion | dread
intensity: low | medium | high | extreme*     # required when affect_kind != null
orientation:
  toward_records: [<record_id>]               # default []; observer firewall input
appraisal_basis: [BEL-<integer>]              # default []; required non-empty unless status: dissociated
trigger_event: SE-<integer>*                  # must resolve to SE on branch path or same-event
behavioral_pressure: [<closed enum 18 values>] # default []; required non-empty unless status: dissociated
                                              # values: approach | flee | freeze | attack | reject |
                                              #         dominate | submit | seek_contact |
                                              #         protect_other | seek_help | confess |
                                              #         conceal | withdraw_socially | plan |
                                              #         accommodate | self_soothe | ruminate | collapse
agency_effect: none | constraining*
expires_when: string*
derived_from: [<record_id>]                   # default []
```

**Patch-engine surface additions**:
- `IdAllocations`: add `STPLAN` and `STEMO` classes (story-bundle-scoped allocation per `allocate_next_id(world_slug, id_class, story_slug)`)
- `OPERATION_KINDS`: add `create_stplan_record`, `create_stemo_record`
- `PatchOperation`: extend discriminated union with the two new op shapes
- `STORY_RECORD_SPECS`: register both classes with source subdirs `_source/plans/` and `_source/emotions/`
- `envelope_schema_description` (`describe-envelope-schema` MCP surface): enumerate both new op kinds
- Patch-engine commit ordering: STPLAN/STEMO follow the same write-order as other active classes (per shared write order at story-state-contract.md §10)

**Source-directory layout**:
- `worlds/<slug>/stories/<story-slug>/_source/plans/STPLAN-<integer>.yaml`
- `worlds/<slug>/stories/<story-slug>/_source/emotions/STEMO-<integer>.yaml`

Hook 3 blocks raw `Edit`/`Write` on both new subdirs (extends the existing `_source/<class>/*.yaml` Hook 3 pattern).

### B. Validators, predicate-DSL extension, tag-grammar extension

**Site**: `tools/validators/src/` (~20 new validator registrations across the deterministic chain); `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (`PREDICATE_NAMES` closure + `PREDICATE_ARG_SCHEMAS`); `tools/validators/src/schemas/story-storylet.schema.json` (predicate-discovery surface); `tools/validators/src/structural/midstory-introduction-utils.ts` (parser extension); `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (consumes the extended parser).

**Deterministic validator coverage (v1)**:

STPLAN validators (12):
1. `stplan_schema_compliance` — JSON schema validation
2. `stplan_id_uniqueness_and_append_only` — file-level append-only lifecycle
3. `stplan_holder_exists_and_active` — `holder` resolves to active `STENT`
4. `stplan_root_intention_grounded` — `root_intention` exists, is active, belongs to same `holder`
5. `stplan_belief_basis_grounded` — every `belief_basis[]` resolves to active `BEL` accessible to `holder` (per observer-firewall access-route check)
6. `stplan_resource_basis_grounded` — every `resource_basis.*[]` entry resolves to an active record accessible to `holder` OR appears in `blockers[]` (resource is desired-but-unavailable)
7. `stplan_blockers_grounded` — every `blockers[]` entry resolves to an active record
8. `stplan_current_step_targets_grounded` — every `current_step.target_records[]` resolves
9. `stplan_no_future_page_ids` — no field anywhere in the record references a PG id later than `created_at_page` on the branch path
10. `stplan_supersession_chain_valid` — `supersedes` chain has no cycles, prior record was active when superseded
11. `stplan_closure_status_requires_closure_event` — `plan_status: fulfilled | failed | abandoned` requires an `SE` event citing the plan with `plan_relation:fulfills | abandons | blocks`
12. `stplan_event_plan_relation_consistency` — when an `SE.world_logic_rationale` carries `plan_relation:advances(plan=X)`, the SE must create/supersede at least one record cited by plan X's `current_step.target_records[]` or `success_condition.predicates[]`

STEMO validators (8):
13. `stemo_schema_compliance` — JSON schema validation
14. `stemo_holder_exists_and_active` — `holder` resolves to active `STENT`
15. `stemo_trigger_event_on_branch_path` — `trigger_event` exists on the branch path leading to `created_at_page` OR is the same SE as `created_by_event`
16. `stemo_appraisal_basis_accessible_to_holder` — every `appraisal_basis[]` BEL is accessible to `holder` (observer firewall), unless `status: dissociated`
17. `stemo_orientation_records_exist` — every `orientation.toward_records[]` entry resolves
18. `stemo_enum_compliance` — `affect_kind`, `intensity`, `status`, `behavioral_pressure[]`, `agency_effect` all match closed enums; `affect_kind: null` allowed iff `status: dissociated`
19. `stemo_no_future_page_ids` — same discipline as STPLAN
20. `stemo_supersession_lifecycle_valid` — supersession chain valid; `status: settled | transformed | dissociated` requires a closure/transition event
21. `stemo_agency_effect_compatibility` — when `agency_effect: constraining`, holder's active `STSTAT.agency` must be compatible (e.g., `constrained` / `coerced`) OR the same-event `SE.world_logic_rationale` must include a plan-relation or non-propagation rationale explaining why action still occurs

Shared validator updates (5):
22. `ACTIVE_RECORDS_CLASSES` includes both new classes; `active_records_full_shape` recognizes both
23. `state_delta_class_integrity` includes both classes in the create/supersede/close vocabulary
24. `snapshot_replay_equality` walks both classes during deterministic replay
25. `midstory_record_introduction_grounding` recognizes `intro:STPLAN(...)` and `intro:STEMO(...)` tags + their class-specific trigger vocabularies
26. `observer_firewall` understands `STPLAN.belief_basis[]` and `STEMO.appraisal_basis[]` as access-route inputs (a plan/emotion-driven move can be grounded by the holder having access to one of the cited beliefs)

(That's 21 + 5 = 26 validator touches. The "~20 deterministic validators" headline counts the new validators per class; the shared updates extend existing validators rather than introducing new ones.)

**Predicate DSL extensions (6 new)**:

| Predicate | Shape | Consumed by |
|---|---|---|
| `plan_active(holder, plan?)` | Actor has an active `STPLAN`. When `plan` is supplied, matches that specific plan id; otherwise matches any. | turn-cycle eligibility, plan grounding |
| `plan_blocked(holder)` | Actor has at least one active `STPLAN` with `plan_status: blocked`. | turn-cycle eligibility |
| `any_plan_active(alias, holder_role?)` | Actor-unbound existential over active `STPLAN`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `emotion_active(holder, kind?, min_intensity?)` | Actor has an active `STEMO`. `kind` filters by closed-enum `affect_kind`; `min_intensity` is one of `low | medium | high | extreme` and matches that intensity or higher. | turn-cycle eligibility, plan grounding |
| `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` | Actor-unbound existential over active `STEMO`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `emotion_pressure(holder, pressure)` | Actor has an active `STEMO` whose `behavioral_pressure[]` includes the named closed-enum pressure. | turn-cycle eligibility |

Closed grammar grows from 33 individual predicates to 39 (combinators `not | all | any` unchanged at 3, for 42 total entries). Each new predicate registers in `PREDICATE_NAMES` + `PREDICATE_ARG_SCHEMAS` + the schema-discovery surface at `tools/validators/src/schemas/story-storylet.schema.json`.

**Tag-grammar extension (§5a)**:

The current grammar (per `.claude/skills/_shared-templates/story-state-contract.md` §5a) supports 6 classes. SPEC-47 extends the `class` enum to 8:

```text
intro_tag    := "intro:" class "(" args ")"
class        := "CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL" | "STPLAN" | "STEMO"
args         := id_arg "," trigger_arg "," evidence_arg "," distinct_arg
```

New STPLAN trigger vocabulary (6 entries):

| Trigger | Present-causal meaning |
|---|---|
| `tactical_approach_committed` | Actor moves from open intention to a specific multi-step tactical approach in the accepted event. |
| `resource_gained_enables_plan` | Actor acquired a resource / leverage / ally / piece of information in this event that newly makes a previously-blocked plan tractable. |
| `blocker_requires_plan` | Actor encountered an obstacle in this event that requires explicit planning (negotiation, deception, alliance-building) rather than ad-hoc reaction. |
| `pressure_forces_plan` | External pressure produced by this event (clock fires, deadline declared, antagonist move) forces the actor to formalize a tactical response. |
| `opportunity_recognized` | The event surfaced a specific opportunity in the current state that warrants planned (vs. reactive) pursuit. |
| `counterparty_plan_observed` | Actor inferred another actor's plan from this event and forms a counter-plan in response. |

New STEMO trigger vocabulary (7 entries):

| Trigger | Present-causal meaning |
|---|---|
| `event_revealed_truth_to_actor` | Actor learned something new in the event (witness, reveal, document discovery, testimony); affective shift is appraisal-driven. |
| `event_threatened_actor_or_charge` | Actor or someone they are responsible for came under threat in the event. |
| `event_harmed_actor_or_charge` | Actor or someone they care about was harmed, lost, or damaged in the event. |
| `event_relieved_pressure_on_actor` | Pressure on the actor was removed in the event (rescue, deadline averted, threat neutralized, accusation withdrawn). |
| `event_violated_actor_principle_or_value` | Actor's belief, principle, oath, or value was violated by the event. |
| `event_changed_relationship_with_other` | Relationship state with another actor moved on a load-bearing axis in this event (betrayal, intimacy, debt, authority shift). |
| `accumulated_pressure_crossed_threshold` | Sustained pressure (clock value rising across pages, repeated micro-stresses) became affectively load-bearing without a single triggering event; the cited `trigger_event` names the latest contributing SE. |

New `plan_relation:` tag pattern (parallel to `non_propagation:` and `intro:` patterns; rides on `SE.world_logic_rationale`):

```text
plan_relation_tag := "plan_relation:" relation "(plan=" record_id ")"
relation         := "advances" | "tests" | "blocks" | "revises" | "fulfills" | "abandons" | "ignores"
record_id        := "STPLAN-" positive_integer
```

Worked example:
```text
plan_relation:advances(plan=STPLAN-12)
```

Parser: extends `tools/validators/src/structural/midstory-introduction-utils.ts` with parser functions for both the extended `intro:` grammar and the new `plan_relation:` pattern. Class-specific validators compose the same parser rather than re-implementing the grammar (parallel to how SPEC-42 / SPEC-43 extensions are organized).

### C. MCP context-packet, world-index edges, page-plan template, skill prose

**Site**: `tools/world-mcp/src/context-packet/story-bundle-context.ts` (2 new builders + type-extension parallel to SPEC-46 Phase B pattern); `tools/world-index/src/schema/types.ts` (`STORY_EDGE_TYPES` extension); `tools/world-index/src/parse/atomic.ts` (`edgesForStoryRecord` switch + per-class helpers); `.claude/skills/_shared-templates/story-state-contract.md` §8 (page-plan template revision); seven story-pipeline skill SKILL.md files (prose updates).

**MCP context-packet summaries (2 new)**:

Following the SPEC-46 Phase B builder pattern:

| New field | Projection shape | Consumers |
|---|---|---|
| `active_actor_plans` | `[{id, holder, root_intention, objective, plan_status, current_step_action_family}]` | turn-cycle eligibility for `plan_active` predicate prefiltering; turn-cycle plan-relation citation; bootstrap-drift health-audit check; future present-causal-situation packet (`active_actor_wants` field) |
| `active_emotional_states` | `[{id, holder, status, affect_kind, intensity, behavioral_pressure, agency_effect}]` | turn-cycle eligibility for `emotion_active` / `emotion_pressure` predicate prefiltering; observer firewall (when `STPLAN`/`SE` cites an `STEMO.appraisal_basis` route); future dramatic-irony packet |

`ContextPacketStoryBundleContextSummary` parallel id-list extensions: `active_plan_ids`, `active_plan_holders`, `active_emotion_ids`, `active_emotion_holders`. Token-budget discipline mirrors SPEC-46: each new summary is independently omittable under pressure; summary-level fallback covers each new full summary.

**World-index edge extraction (14 new edges)**:

Combined with SPEC-46's 36, `STORY_EDGE_TYPES.length` becomes 50.

STPLAN edges (8):

| Edge type | Source field | Source class | Target class |
|---|---|---|---|
| `plan_holder` | `STPLAN.holder` | `STPLAN` | `STENT` |
| `plan_root_intention` | `STPLAN.root_intention` | `STPLAN` | `STINT` |
| `plan_belief_basis` | `STPLAN.belief_basis[]` | `STPLAN` | `BEL` |
| `plan_resource_basis` | `STPLAN.resource_basis.*[]` | `STPLAN` | `SF` / `STOBJ` / `STLOC` / `DA` / `SREL` / `OBL` |
| `plan_blocker` | `STPLAN.blockers[]` | `STPLAN` | record (any) |
| `plan_current_step_target` | `STPLAN.current_step.target_records[]` | `STPLAN` | record (any) |
| `plan_created_by_event` | `STPLAN.created_by_event` | `STPLAN` | `SE` |
| `plan_supersedes` | `STPLAN.supersedes` | `STPLAN` | `STPLAN` |

STEMO edges (6):

| Edge type | Source field | Source class | Target class |
|---|---|---|---|
| `emotion_holder` | `STEMO.holder` | `STEMO` | `STENT` |
| `emotion_trigger_event` | `STEMO.trigger_event` | `STEMO` | `SE` |
| `emotion_appraisal_basis` | `STEMO.appraisal_basis[]` | `STEMO` | `BEL` |
| `emotion_oriented_toward` | `STEMO.orientation.toward_records[]` | `STEMO` | record (any) |
| `emotion_supersedes` | `STEMO.supersedes` | `STEMO` | `STEMO` |
| `emotion_derived_from` | `STEMO.derived_from[]` | `STEMO` | record (any) |

Per-class helpers: `edgesForStoryPlan` and `edgesForStoryEmotion`, wired into the existing `edgesForStoryRecord` switch at `tools/world-index/src/parse/atomic.ts`. Idempotent rebuild via `world-index build`; no bundle migration required.

**Page-plan template revision (`story-state-contract.md` §8)**:

The 19-section page-plan minimum contract grows by 2 sections to 21. Both new sections are per-page-computed (not inlined verbatim — parallel to §10b's per-page-computed pattern, not §2/§3/§19's inlined-verbatim pattern). Both are **omitted entirely** when the bundle has no active records of the respective class — no empty placeholder.

§9b (after current §9 Relationship and belief context):

```text
## 9b. Active actor plans / tactical agency

- STPLAN-<integer> — Holder: STENT-<integer>.
  - Objective:
  - Root intention:
  - Current step (action_family + target_records):
  - Belief basis:
  - Resources/leverage (resource_basis projection):
  - Blockers:
  - Fallbacks currently available:
  - This page's plan_relation: advances | tests | blocks | revises | fulfills | abandons | ignores
  - Prose must show:
  - Prose must not imply:
```

§9c (after §9b):

```text
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

`branching-story-turn-cycle` owns the rendering procedure for both sections (parallel to its existing §10b rendering ownership). The plan must not expose engine jargon to prose beyond what §15 frontmatter permits.

**Skill prose updates (7 story-pipeline skills)**:

- **`branching-story-bootstrap`**: load-bearing STPLAN/STEMO discipline ("seed plans for actors whose medium-range agency matters at story start; seed emotions only where load-bearing for choice / prose / state interpretation"); first-page plan §9b/§9c render integration.
- **`branching-story-turn-cycle`**: STPLAN/STEMO maintenance lifecycle (create/supersede on belief-basis / resource-basis / blocker / status change for plans; create/supersede on causal affective shift for emotions); `intro:STPLAN(...)` / `intro:STEMO(...)` tag emission for mid-story introductions; `plan_relation:` tag emission for SE events citing active plans; §9b/§9c render procedure.
- **`branching-story-prose-attach`**: prose-validation against §9b "Prose must show / must not imply" and §9c "Prose must render / must avoid" sections; no engine-jargon leak; affective transition presence when §9c marks it required.
- **`branching-story-health-audit`**: bootstrap-drift check (STPLAN/STEMO seeded at story_start never queried / superseded / consumed across branch tree); stale-active-plan check (STPLAN with `plan_status: active` whose belief-basis / resource-basis records are inactive or superseded); stale-active-emotion check (STEMO with `status: active` for many pages with no reflection / transformation / suppression); SE-plan-relation consistency walk.
- **`commitment-block-authoring`**: 6 new predicates available for SLT preconditions; plan/emotion-aware authoring patterns; coverage targets unchanged (the existing 11 causal-function coverage targets cover plan/emotion-driven moves under the existing taxonomy without adding a new family).
- **`story-fact-promotion-to-canon`**: STPLAN/STEMO are evidence context only (citable in promotion-proposal rationale); not promotion source classes.
- **`story-promotion-closeout`**: when a canon verdict invalidates a plan's `belief_basis` or an emotion's `appraisal_basis`, the closeout flow may supersede the affected STPLAN with `plan_status: abandoned` or STEMO with `status: transformed`, citing the canon verdict (`PA-<integer>`) as closure-event evidence in the supersession's `SE.world_logic_rationale`.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5b Schema-Minimalism | **aligns** | Every v1 STPLAN/STEMO field has a named §5b-class consumer (validator / replay primitive / predicate / fork operation / audit-trail discipline). Excluded fields (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`, `orientation.toward_claim`) are deferred to an extension list with consumer-justification gating — each may land in a follow-up spec that names a concrete §5b-class consumer. Closed enums on `affect_kind` (18) / `behavioral_pressure` (18) / `status` (5) / `intensity` (4) / `agency_effect` (2) are each predicate-DSL-queryable and validator-checkable. |
| §Story Bundles §5c Present Causal State, Not Narrative Shape | **aligns** | STPLAN expresses *what an actor is presently trying*, not future plot. Schema-level guards: no future PG ids in any field (`stplan_no_future_page_ids`, `stemo_no_future_page_ids` validators); `plan_status` enum has no "planned climax" / "expected outcome" / "target_act_position" values; supersession-on-revision discipline prevents in-place plan rewriting; trigger vocabularies are event-shape anchors, not narrative-shape framings. STEMO records *current affective pressure*, not narrative emotional arc; `affect_kind` enum is appraisal-anchored per the cited literature, not mood-arc-anchored; `accumulated_pressure_crossed_threshold` trigger names the latest contributing SE rather than asserting cumulative-arc framing. |
| §Story Bundles §5a Commitment Blocks Are Causal Moves | **aligns** | `SLT` schema is unchanged. The 6 new predicates extend the closed DSL without changing the commitment-block shape; new predicates compose with existing predicates through the existing `all` / `any` / `not` combinators (e.g., `all[plan_active(holder=alpha, plan=STPLAN-12), emotion_pressure(holder=alpha, pressure=conceal)]`). |
| §Story Bundles §6a Belief vs. Fact | **aligns** | `STPLAN.belief_basis[]` cites `BEL` records (preserving the §6a distinction — actor's belief, not branch truth); `STEMO.appraisal_basis[]` cites `BEL` records (same). Neither class records facts — they record actor-owned tactical plans and affective state respectively. `STPLAN.resource_basis.facts[]` cites `SF` records when the plan rests on branch-local truth; `STPLAN.belief_basis[]` is for the plan's *appraisal* basis. |
| §Story Bundles §6b Information / Observer Firewall | **aligns** | Validators enforce that `STPLAN.belief_basis[]` BELs must be accessible to `holder` (`stplan_belief_basis_grounded`); `STEMO.appraisal_basis[]` BELs must be accessible to `holder` (`stemo_appraisal_basis_accessible_to_holder`); `STEMO.trigger_event` must be on the branch path or same-event-created (`stemo_trigger_event_on_branch_path`); `STPLAN.resource_basis.*[]` records must be accessible to `holder` OR explicitly listed in `blockers[]` (`stplan_resource_basis_grounded`). The observer-firewall validator additionally treats both classes' basis fields as legitimate access-route inputs for downstream plan/emotion-driven actor moves. |
| §Story Bundles §4a Plan-Authority Boundary | **aligns (N/A)** | Page-plan commit semantics unchanged; STPLAN/STEMO records are committed at patch-engine submission like all other story-bundle records. The fork primitive remains the `PG` snapshot. |
| §Story Bundles §5 (Rule 5 — No Consequence Evasion at story scope) | **aligns** | Per-page consequence capacity is unaffected; new active classes increase the *available* state surface without changing the "at least one continuation storylet eligible" requirement. The proposal's plan-driven choice-pressure framing is captured by the new predicates' role in `SLT.preconditions`, not by adding a new gate. |
| Rule 1 (No Floating Facts) | **aligns** | Every STPLAN/STEMO field references back to grounding records: `holder` (STENT), `root_intention` (STINT), `belief_basis` (BEL), `resource_basis.*` (SF/STOBJ/STLOC/DA/SREL/OBL), `blockers` (any record), `current_step.target_records` (any record), `created_by_event` / `trigger_event` (SE), `supersedes` (same class), `appraisal_basis` (BEL), `orientation.toward_records` (any record), `derived_from` (any record). No free-form claim without record citation. |
| Rule 4 (No Globalization by Accident) | **aligns** | STPLAN/STEMO are story-bundle-scoped: per-bundle ID allocation via `allocate_next_id(world_slug, id_class, story_slug)`; branch-isolated (no cross-branch reference); world-index edges carry `story_slug`; new predicates respect bundle scope through the existing branch-state-filtering pattern. |
| Rule 6 (No Silent Retcons) | **aligns** | Append-only at file level (Hook 3 blocks raw `Edit`/`Write` on `_source/plans/*.yaml` and `_source/emotions/*.yaml`); supersession-on-revision discipline (changes produce a new record citing `supersedes`); closure status requires closure event citation (no silent status flip). |
| §Tooling Recommendation — "LLM agents should never operate on prose alone" | **aligns** | The 2 new MCP context-packet summaries extend the documented context-packet surface to cover the new classes; the 14 new world-index edges make plan/emotion ownership / provenance / access relations queryable via `get_neighbors` and graph-walking helpers. Both classes are first-class members of the targeted-retrieval surface from day 1. |

---

## Out of Scope

The following items are **explicitly out of scope** for SPEC-47 and routed as named below:

1. **STPLAN extension fields** (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`) — captured as a named extension list. Each may land in a follow-up spec that names a concrete §5b-class consumer (validation gate / replay primitive / predicate / fork operation / audit-trail discipline). Render-only consumption does not satisfy §5b.
2. **STEMO `orientation.toward_claim` free-form string** — deferred. No §5b-class consumer in v1; the closed `orientation.toward_records[]` list covers the observer-firewall input use case.
3. **Judgment-based audits** (proposal §STPLAN Risks + Audits, §STEMO Risks + Audits: plan plausibility / cleverness / fallback character-specificity / plan-produces-choice-pressure / emotion psychological-truth / intensity-appropriateness / prose-specificity / repetition-or-melodrama — 8 total) — deferred to follow-up `branching-story-health-audit` SAU iterations as authoring evidence accumulates.
4. **`get_plan_dependency_tree` and other graph-traversal helpers** on the MCP surface — deferred until a concrete consumer surfaces. v1 surface is the 2 context-packet summaries + the 14 edges traversable via existing `get_neighbors`.
5. **Present-causal-situation packet** (proposal §3) — separate spec, depends on this one (the packet's `active_actor_wants` and `opposition` fields project from STPLAN state). Routed to Wave 3 per the prior triage.
6. **Other Priority 2 packets** (dramatic-irony, reader-expectation, social-pressure, branch-possibility-space, pressure-texture) — each is its own brainstorm + spec per the prior triage.
7. **`get_page_render_packet` aggregator** (proposal §non-state-support) — separate spec, depends on this one + Priority 2 packets.
8. **`SE.record_introductions[]` structured replacement** (proposal Priority 0 item 5; SPEC-46 §Out of Scope item 11) — separate brainstorm. When it lands, it migrates all 8 §5a tag patterns uniformly (including the STPLAN/STEMO classes and the new `plan_relation:` pattern this spec adds).
9. **Existing-bundle migration** — none required. STPLAN/STEMO are optional active classes; bundles without either remain valid. The `active_records_full_shape` validator does not require either class to be present.
10. **Promotion source-kind extension** — STPLAN/STEMO do not become promotion source classes. `story-fact-promotion-to-canon` continues to treat the 6 existing source kinds (`story_fact`, `mystery_resolution`, `character_outcome`, `artifact_canonization`, `relationship_or_institutional_outcome`, `other_branch_claim`) as the closed set.

---

## Deliverables

Per-phase deliverables that will be decomposed into implementation tickets by a subsequent `spec-to-tickets` invocation:

### Phase A: Schemas, patch-engine, ID allocation, source-directory layout

- D-A1: Add `STPLAN` schema as §4.5.17 in `.claude/skills/_shared-templates/story-record-schemas.md` (parallel placement to §4.5.14 `CLK` / §4.5.15 `STSEC` / §4.5.16 `STQ` from SPEC-42).
- D-A2: Add `STEMO` schema as §4.5.18 in the same file.
- D-A3: Add both classes to the §3 record-class inventory in `.claude/skills/_shared-templates/story-state-contract.md`.
- D-A3b: Update `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes) to add `STPLAN` and `STEMO` to the per-bundle records enumeration. Opportunistically backfill `CLK`, `STSEC`, `STQ` (from SPEC-42) and story-local `DA` (from SPEC-38) — pre-existing drift in §6 that SPEC-47 inherits and should close in one pass so the canonical FOUNDATIONS list reflects the actual set of story-bundle record classes after this spec lands. Current §6 lists 17 classes; post-SPEC-47 should list 23 classes (17 existing + CLK + STSEC + STQ + story-local DA + STPLAN + STEMO = 23).
- D-A4: Author `tools/validators/src/schemas/story-plan.schema.json` matching the §4.5.17 field list with closed-enum / required-field discipline.
- D-A5: Author `tools/validators/src/schemas/story-emotion.schema.json` matching §4.5.18 with the closed 18-value `affect_kind` and 18-value `behavioral_pressure` enums.
- D-A6: Register both classes in the patch-engine `IdAllocations`, `OPERATION_KINDS`, `PatchOperation` discriminated union, and `STORY_RECORD_SPECS` map; new operation kinds are `create_stplan_record` and `create_stemo_record`.
- D-A7: Add both classes to the `mcp__worldloom__allocate_next_id` allocator's recognized story-bundle-scoped class list.
- D-A8: Update `mcp__worldloom__describe_envelope_schema` to enumerate the 2 new operation kinds in its emitted schema description.
- D-A9: Verify Hook 3 covers the new `_source/plans/` and `_source/emotions/` subdirs at integration test (cross-phase D-X2). **No code change required** — Hook 3 at `tools/hooks/src/hook3-guard-direct-edit.ts:30-55` already pattern-matches `**/stories/<slug>/_source/**/*.yaml` generically via the `classifyPath` function (regex `/^stories\/[^/]+\/_source\//` + `.yaml`/`.yml` suffix check), so new `_source/plans/` and `_source/emotions/` subdirs are automatically blocked from raw `Edit`/`Write` without any hook-code edit.

### Phase B: Validators, predicate DSL, tag-grammar extension

- D-B1: Register 12 new STPLAN deterministic validators (per the Approach §B table).
- D-B2: Register 8 new STEMO deterministic validators.
- D-B3: Extend 5 shared validators (`active_records_full_shape`, `state_delta_class_integrity`, `snapshot_replay_equality`, `midstory_record_introduction_grounding`, `observer_firewall`) to recognize both new classes per the Approach §B detail.
- D-B4: Register 6 new predicates in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (`PREDICATE_NAMES` + `PREDICATE_ARG_SCHEMAS`); update `tools/validators/src/schemas/story-storylet.schema.json` predicate-discovery surface to enumerate them.
- D-B5: Extend `tools/validators/src/structural/midstory-introduction-utils.ts` parser with the 2 new `class` enum values + 6 STPLAN triggers + 7 STEMO triggers + new `plan_relation:` tag pattern with 7 closed relations. Add named exports `MIDSTORY_TRIGGERS_STPLAN` and `MIDSTORY_TRIGGERS_STEMO` following the existing per-class export convention (`MIDSTORY_TRIGGERS_CLK`, `MIDSTORY_TRIGGERS_SREL`, `MIDSTORY_TRIGGERS_STENT`, `MIDSTORY_TRIGGERS_STQ`, `MIDSTORY_TRIGGERS_STSEC`, `MIDSTORY_TRIGGERS_THR`).
- D-B6: Extend `tools/validators/src/structural/midstory-record-introduction-grounding.ts` to consume the extended parser without re-implementing the grammar.
- D-B7: Update `.claude/skills/_shared-templates/story-state-contract.md` §5 closed-predicate-DSL table with the 6 new predicates and their consumer annotations; update §5a tag grammar specification with the 2 new class entries, their trigger vocabularies, and the new `plan_relation:` pattern.

### Phase C: MCP context-packet, world-index edges, page-plan template, skill prose

- D-C1: Implement `buildActiveActorPlans` and `buildActiveEmotionalStates` builders in `tools/world-mcp/src/context-packet/story-bundle-context.ts`, modeled after the SPEC-46 Phase B builder pattern.
- D-C2: Wire both builders into `buildStoryBundleContext`; extend `ContextPacketStoryBundleContext` type with the 2 new optional summary fields; extend `ContextPacketStoryBundleContextSummary` partial with `active_plan_ids`, `active_plan_holders`, `active_emotion_ids`, `active_emotion_holders`.
- D-C3: Update `tools/world-mcp/src/tools/describe-capabilities.ts` to enumerate the 2 new context-packet fields and their projection shapes.
- D-C4: Document both new summaries in `docs/CONTEXT-PACKET-CONTRACT.md` under the `story_bundle_context` section.
- D-C5: Extend `STORY_EDGE_TYPES` at `tools/world-index/src/schema/types.ts` with the 14 new edge type strings; assert `STORY_EDGE_TYPES.length === 50` in a registry-completeness test.
- D-C6: Implement `edgesForStoryPlan` and `edgesForStoryEmotion` per-class edge extractor helpers in `tools/world-index/src/parse/atomic.ts`, modeled after SPEC-46 Phase C's per-class helper pattern.
- D-C7: Wire both new helpers into the existing `edgesForStoryRecord` dispatch.
- D-C8: Update `docs/MACHINE-FACING-LAYER.md` story-edge enumeration to list the 14 new edge types and their semantic shapes.
- D-C9: Update `.claude/skills/_shared-templates/story-state-contract.md` §8 page-plan minimum contract: re-word the contract preamble to *"19 numbered sections plus optional §9b, §9c, §10b when relevant story-state records are active or relevant"* (parallel to the existing §10b "plus optional" framing — §9b and §9c are per-page-computed sub-sections, not new top-level sections); add §9b and §9c definitions per the Approach §C templates; both sections are per-page-computed (parallel to §10b) and omitted entirely when no active records of the respective class exist.
- D-C10: Update all 7 story-pipeline SKILL.md files (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) per the Approach §C skill-prose-updates list.

### Cross-phase

- D-X1: Run `world-index build` regression on a representative test world with at least one STPLAN and one STEMO record; assert the 14 new edges appear in the rebuilt index without rebuild errors and without disturbing existing edges.
- D-X2: Fixture-bundle integration test: bootstrap a bundle with seeded STPLAN/STEMO, run turn-cycle with an SE carrying `plan_relation:advances(plan=STPLAN-X)` and `intro:STEMO(id=STEMO-Y, ...)` tags, assert validators pass at all 8 hard gates, snapshot replay equality holds, MCP context-packet returns both new summaries, page plan renders §9b and §9c, and `world-index build` extracts the expected new edges.

---

## Risks & Open Questions

- **R-1: Author over-seeding at bootstrap.** Without a machine cap, authors may seed STPLAN/STEMO for every cast member at story_start, producing the mood-board / outline drift the load-bearing discipline forbids. **Mitigation**: skill-prose discipline in `branching-story-bootstrap` SKILL.md plus the SAU bootstrap-drift check that flags story_start-seeded records never queried / superseded / consumed across the branch tree. Post-hoc detection, but the audit surface makes the drift visible. Per-actor opt-in via STENT fields was considered and rejected (schema inflation with no other consumer); validator-enforced numeric caps were considered and rejected (no §5b justification for any specific number).
- **R-2: STPLAN becomes an author plot plan.** The proposal flags this risk explicitly. Schema-level guards: `stplan_no_future_page_ids` validator forbids forward PG references in any field; `plan_status` enum has no "planned climax" / "expected outcome" / "target_act_position" values; supersession-on-revision discipline prevents in-place plan rewriting; trigger vocabulary is event-shape anchors, not narrative-shape framings (no `setup_for_midpoint` / `climax_planted` / etc.). **Mitigation**: §5c lint pass (per Test Plan T-9) asserts no STPLAN field name or enum value carries narrative-shape framing.
- **R-3: STEMO becomes mood-board state.** Without discipline, every passing affect becomes a record. **Mitigation**: skill-prose discipline at `branching-story-bootstrap` / `branching-story-turn-cycle` ("create STEMO only for affect that changes choices, prose rendering, or state interpretation"); SAU stale-active-emotion check flags extreme emotions active for many pages with no reflection / transformation / suppression.
- **R-4: Token-budget pressure from 2 new context-packet summaries.** SPEC-46 added 7 summaries on top of 12 existing; SPEC-47 adds 2 more on top of that 19. The per-summary independent-omittability pattern remains in place; per-field omission under budget pressure is the existing pattern. **Mitigation**: implementation tickets verify `get_context_packet` budget-management remains correct after the additions; summary-level fallback (`ContextPacketStoryBundleContextSummary`) covers both new summaries via the parallel id-list fields.
- **R-5: Closed-enum vocabulary lockout.** Authors hitting a literary edge case the 18 `affect_kind` or 18 `behavioral_pressure` enums do not cover may be tempted to amend the closed set ad-hoc. The research synthesis includes a "Coverage gaps" section per enum; the spec lists specific gap-handling guidance (e.g., `numbness` → `status: dissociated`; sexual arousal → `desire` with body-annotation; sacrifice → compose `protect_other` + `submit` on the same STEMO). **Mitigation**: enum extension requires an amendment to this spec (or a follow-up spec) with a research-backed justification — parallel to how the closed predicate DSL is amended.
- **R-6: Tag-grammar parser breakage from extension.** Extending `midstory-introduction-utils.ts` with 2 new classes + 13 new triggers + the new `plan_relation:` pattern adds parser surface. **Mitigation**: parser unit tests per new class and per new trigger (positive + negative cases); regex-witness invariant testing (the regex from §5a continues to match all valid tags); cross-bundle regression with an existing fixture bundle that uses the legacy 6-class grammar.
- **R-7: Predicate DSL extension breakage from 6 new predicates.** Closed-grammar growth from 33 individual predicates to 39 (combinators `not | all | any` unchanged at 3) changes the `PREDICATE_NAMES` closure. **Mitigation**: schema-discovery surface regeneration; existing storylet predicate validation passes unchanged (additive); SLT-grammar unit tests cover each new predicate's positive + negative arg-schema cases.
- **Q-1: Should `STPLAN.current_step.success_condition.predicates[]` reuse the closed predicate DSL or have its own (smaller) closed sub-grammar?** Implementation ticket evaluates whether all 28 predicates make sense in a plan-success-condition context, or whether a subset would be more disciplined.
- **Q-2: Should `STEMO.behavioral_pressure[]` allow same-record duplicates (e.g., `[conceal, conceal]`) or enforce uniqueness in the validator?** Defaulting to uniqueness; implementation ticket confirms or reverses with rationale.
- **Q-3 (resolved at reassessment)**: `compute-pg-hashes.ts` is section-shape-agnostic by construction. Verified at `tools/world-mcp/src/cli/compute-pg-hashes.ts:20, 34, 126-131`: the helper reads plan files via `readFileSync(filePath)` and computes `plan_hash` as `sha256` over the **exact UTF-8 bytes** of the page-plan body with explicit *"no normalization, no trimming"* discipline. Adding §9b and §9c sections to the page-plan template does NOT require any coordinated update to `compute-pg-hashes.ts` — the hash binds whatever bytes the rendered template produces. No implementation-ticket investigation needed.

---

## Test Plan

- **T-1 (STPLAN schema fidelity)**: Fixture-load 8 representative `STPLAN` records spanning the `plan_status` enum (`active`, `blocked`, `suspended`, `fulfilled`, `failed`, `abandoned`, `revised`, and one with a populated `fallback_steps[]`); assert JSON-schema validation passes; assert no fabricated keys; assert all required fields present.
- **T-2 (STEMO schema fidelity)**: Fixture-load 10 representative `STEMO` records spanning the `status` enum (including 2 `dissociated` records with `affect_kind: null`); assert closed-enum validation rejects values not in the 18-value `affect_kind` and 18-value `behavioral_pressure` lists; assert `dissociated` status is the only status that permits `affect_kind: null`.
- **T-3 (Replay invariance)**: Build a bundle with 5 STPLAN supersessions and 5 STEMO supersessions across 3 branches; assert `snapshot_replay_equality` passes (cumulative state at each PG snapshot deterministically reconstructible from SE state-deltas alone).
- **T-4 (Predicate-DSL parsability)**: For each of the 6 new predicates, paired positive test (well-formed predicate object → parser accepts + arg-schema validation passes) and negative test (missing required arg, wrong arg type, value outside closed-enum → parser rejects with named-rule failure).
- **T-5 (Tag-grammar extension)**: For each of the 2 new `intro:<CLASS>(...)` class values, paired positive test (`intro:STPLAN(id=STPLAN-1, trigger=tactical_approach_committed, evidence=[...], distinct_from=[...])` parses) and negative test (unknown trigger name → parser rejects). For the new `plan_relation:` tag pattern, positive test per relation value + negative test for unknown relation.
- **T-6 (Edge-extraction registry completeness)**: Assert `STORY_EDGE_TYPES.length === 50` and `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length`.
- **T-7 (Edge extraction per-type)**: For each of the 14 new edge types, paired positive test (fixture record with the field populated → edge emitted with correct source/target/`edge_type`/`story_slug`) and negative test (fixture record with the field empty → no edge emitted).
- **T-8 (MCP context-packet summary fidelity)**: Fixture-load a bundle with active STPLAN and STEMO records; call `mcp__worldloom__get_context_packet({task_type: 'page_authoring', seed_nodes: [...], story_slug: ...})`; assert `active_actor_plans` and `active_emotional_states` summary shapes match the Approach §C tables; assert `active_plan_ids` / `active_emotion_ids` / `active_plan_holders` / `active_emotion_holders` enumerate the corresponding ids/holders without orphans or omissions.
- **T-9 (FOUNDATIONS §5c lint pass)**: Lint pass over the new STPLAN/STEMO schema, validator names, predicate names, edge type names, page-plan section names, and trigger vocabularies asserting no narrative-shape framing tokens (`act_*`, `climax_*`, `beat_position_*`, `arc_*`, `expected_outcome_*`, `target_curve_*`, `planned_resolution_*`, `setup_for_*`, `payoff_at_*`). Codifies §5c discipline structurally.
- **T-10 (No-regression sweep)**: Existing test suites for `world-mcp`, `world-index`, `patch-engine`, `validators`, and the 7 story-pipeline skills pass unchanged after this spec's deliverables land. STORY_EDGE_TYPES.length === 36 → 50 transition validated by the edge-completeness test (T-6) rather than by removing or renaming any SPEC-46 edge.
