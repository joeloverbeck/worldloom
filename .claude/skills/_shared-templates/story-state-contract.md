# Story State Contract

Shared by every state-changing skill in the worldloom story-skill family. This is the only place where the page lifecycle, branch snapshots, event deltas, record schemas, predicate DSL, action-routing semantics, eight hard gates, and shared write order are defined. Each skill's `SKILL.md` references this contract for those concerns; the contract does not describe per-skill workflows.

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

## 3. Record Class Inventory

Story-bundle record classes allocate via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`.

Core page-cycle state records:

| Class | Purpose |
|---|---|
| `STENT` | Story-local entity mirror or story-local entity. |
| `STSTAT` | Story-local entity life / agency / location status. |
| `STINT` | Intention held by an entity. |
| `SF` | Branch / story-local fact (what is true in the branch). |
| `BEL` | Belief, knowledge, suspicion, public claim, lie, witness memory, or misconception (what a holder believes about the world). |
| `SE` | Event; the single causal tick that produced a page. |
| `OBL` | Obligation. |
| `CNSQ` | Consequence. |
| `THR` | Thread. |
| `SREL` | Relationship. |
| `STLOC` | Location. |
| `STOBJ` | Object. |
| `DA` | Story-local diegetic artifact. |
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

`SF` records what *is* true in the branch. `BEL` records what a holder *believes / claims / witnesses / lies about*. The two classes are kept separate so that lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent without inventing plot rails.

**Append-only / supersession discipline.** Once a record is committed it is not edited in place. Changes are expressed by writing a new record (next `-NNNN` id) whose `supersedes` field names the prior record. The patch engine enforces this at the file level for `_source/<class>/*.yaml`.

## 4. Record Schemas

Required fields are marked `*`. Fields not listed are not part of the schema. All YAML strings supporting natural language remain free-form unless an enum is named. All 17 story-bundle record classes listed in §3 have field schemas defined below: §4.1-§4.4 cover the four classes with pre-existing closed schemas, §4.5 covers the 13 additional classes, and §4.6 covers the prose receipt direct-write artifact.

### 4.1 `BEL` (13 fields)

```yaml
id: BEL-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: BEL-<integer> | null            # default null
holder: STENT-<integer> | group:<name> | public | narrator   # *
claim: >                               # * natural-language statement
belief_mode: knows | believes | suspects | doubts | denies | reports | claims | deceives | misremembers | interprets   # *
truth_relation: true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent   # *
confidence: certain | high | medium | low | uncommitted   # *
visibility: private | shared | factional | public | rumored | concealed | suppressed   # *
basis:
  source_event: SE-<integer>*               # the event that established this belief
  access_route: direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization*
  access_records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | DA-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>]
consequences:
  opens: [OBL-<integer> | THR-<integer> | CNSQ-<integer>]
  constrains_choices: [CHC-<integer>]
```

The `belief_mode` field separates sincerity / epistemic stance from `confidence`, which is only the holder's subjective certainty axis. The `truth_relation` field distinguishes belief from truth; the `visibility` field is consumed by the social-state firewall. `basis.source_event` is the strongest replay anchor. `basis.access_route` records how the holder gained access to the belief, and `basis.access_records` cites the enabling story records when the route depends on a witness, location, object, artifact, prior belief, story fact, or event. `branching-story-health-audit` Phase 2d consumes these fields when reporting `observer_firewall_violation` findings, so the §6b observer firewall remains auditable after the turn lands.

### 4.2 `PG` (~22 sub-paths)

```yaml
id: PG-<integer>*
story_id: STORY-<integer>*
branch_id: BR-<integer>*
parent_page_id: PG-<integer> | null         # * null only for PG-1
branch_path: [PG-<integer>]*           # * ordered list of pages from root to here on this branch; for root page (PG-1) contains exactly [PG-1]; turn-cycle extends the parent page's branch_path by appending the new PG id. Referenced from §4.4 SLT.scope.visible_branch_path_prefix as the canonical prefix source; read by recursive_reference_closure to authorize in-branch references.
turn_index: 0*
input:
  # Input legality:
  # - If resolved_event.event_kind == story_start (i.e., parent_page_id == null, only PG-1):
  #     choice_id == null
  #     manual_action_text == null
  # - Otherwise:
  #     exactly one of choice_id / manual_action_text is non-null
  choice_id: CHC-<integer> | null
  manual_action_text: null | string
  resolved_event_id: SE-<integer>*
state_hash_parent: null | sha256       # null only for PG-1
state_hash: sha256*
state_snapshot:
  canon_revision: CH-<integer> | null  # latest governing world-canon change-log id loaded at page-plan commit; null only when no CH exists
  active_records:                      # *
    STENT: [STENT-<integer>]
    STINT: [STINT-<integer>]
    SF: [SF-<integer>]
    BEL: [BEL-<integer>]
    OBL: [OBL-<integer>]
    CNSQ: [CNSQ-<integer>]
    THR: [THR-<integer>]
    SREL: [SREL-<integer>]
    STLOC: [STLOC-<integer>]
    STOBJ: [STOBJ-<integer>]
    DA: [DA-<integer>]
    STSTAT: [STSTAT-<integer>]
  entity_status:                       # * derived projection of active STSTAT; one entry per active STENT
    STENT-<integer>:
      life: alive | dead | unknown
      agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown
      location: STLOC-<integer> | unknown | concealed | offstage
  visible_affordances:                 # *
    - ordinal: 0                       # page-local index, not an allocated id
      label: "door to the alley"
      grounded_in: [STLOC-<integer>, STOBJ-<integer>]
      available_to: [STENT-<integer>]
      action_families: [<action_family>]
  unresolved_mystery_claims:           # *
    - mystery_id: M-<integer>
      authority: apparent | branch_local_counterfactual | canon_candidate
      status: preserved | clue_added | narrowed | apparent_resolution | held_for_promotion
  continuation:                        # *
    has_eligible_commitment_block: true | false
    terminal_status: open | branch_pause | terminal_closed
    terminal_rationale: null | string
plan:
  plan_hash: sha256*
prose_plan_path: pages-prose-plans/PG-<integer>.md*   # stable plan address; included in state_hash payload
prose_path: pages-prose/PG-<integer>.md | null        # default null; excluded from state_hash payload
prose_receipt_path: pages-prose-receipts/PG-<integer>.yaml | null   # default null; excluded from state_hash payload
emitted_choices: [CHC-<integer>]*
validation_trace:                      # * one entry per shared gate with PASS + one-line rationale
  input_legality: "PASS: <rationale>"
  parent_snapshot_compatibility: "PASS: <rationale>"
  mystery_invariant_firewall: "PASS: <rationale>"
  branch_isolation: "PASS: <rationale>"
  append_only_delta: "PASS: <rationale>"
  consequence_or_terminal: "PASS: <rationale>"
  plan_grounding: "PASS: <rationale>"
  canon_promotion_hold: "PASS: <rationale>" | "NOT_APPLICABLE: <rationale>"
```

`prose_path` and `prose_receipt_path` are informational publication receipts. They are not lifecycle status. There is no nested rendered-prose block, no `prose_status` field, no `state_delta_summary` field (`SE.state_delta` is authoritative), and no `open_debt` field on the snapshot (open obligations / consequences / threads are derived from `state_snapshot.active_records.OBL / CNSQ / THR`).

`state_snapshot.canon_revision` is the page's world-canon baseline. It records the latest governing `CH-<integer>` visible to the page-planning context at commit time, or `null` only for worlds with no change-log entry. A child page must compare the parent snapshot's `canon_revision` against the current world-canon revision at turn start and classify drift as `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict` before treating parent story-local assumptions as current world-valid truth.

Branch-scope vocabulary:

- `bundle_genesis_record`: a story-bundle record whose `created_at_page` is `PG-1`, where `PG-1` is the `root_page_id` of the root branch. Genesis records sit in every branch's `branch_path` and are visible to all branches unless later superseded or closed.
- `branch_local_record`: a record created after `PG-1` whose `created_at_page` is not in the active `branch_path`, or, for an `SLT`, not in the `visible_branch_path_prefix` authorized for that block.

#### 4.2a Deterministic PG hash computation

Every `PG` record must carry final lowercase sha256 values before any `create_pg_record` patch plan is validated or submitted. Placeholder, uppercase, non-hex, missing, or stale hash values are hard-stop authoring errors; the skill must repair the draft in working memory before `mcp__worldloom__validate_patch_plan`.

Compute `plan.plan_hash` first. It is sha256 over the exact UTF-8 bytes of the page plan body that will later be written to `pages-prose-plans/PG-<integer>.md`. Because the page plan is a direct-write artifact after patch submission (§10), the skill drafts the complete plan bytes in working memory, hashes those exact bytes, places the hash in `PG.plan.plan_hash`, and after patch success writes the same bytes to disk without reformatting.

Compute `state_hash` second from the PG fork-state payload after `plan.plan_hash` is final. The fork-state payload is the complete PG mapping except:

- exclude `state_hash` itself;
- exclude `prose_path` (mutable publication receipt);
- exclude `prose_receipt_path` (mutable publication receipt).

All other PG fields are included, including `id`, `story_id`, `branch_id`, `parent_page_id`, `branch_path`, `turn_index`, `input`, `state_hash_parent`, `state_snapshot`, `plan.plan_hash`, `prose_plan_path`, `emitted_choices`, and `validation_trace`.

Pre-SCAUD-001 PG records retain their original `state_hash` values, computed against the old nested prose-receipt payload. Those values are read as opaque strings; no re-hashing is performed. Post-SCAUD-001 PG records use the payload definition above. The `snapshot_replay_equality` validator must tolerate this discontinuity.

The state payload serialization is deterministic canonical JSON: objects serialized with keys sorted lexicographically at every depth, arrays kept in authored order, strings emitted as UTF-8 JSON strings, no insignificant whitespace, no comments, and no YAML anchors or aliases. Hash the resulting UTF-8 bytes with sha256 and encode as 64 lowercase hex characters.

For root pages, compute both hashes after `PG-1`, the final page-plan bytes, emitted `CHC` records, and `PG-1.validation_trace` are finalized in working memory, then validate/submit the patch plan. For child pages, copy `state_hash_parent` exactly from the already-committed parent PG's `state_hash`, finalize the new PG and plan bytes, compute `plan.plan_hash`, compute `state_hash`, then validate/submit. If any later edit changes an included PG field or the page-plan bytes before submission, recompute the affected hash values before validation.

**Tooling.** Every PG-authoring skill (`branching-story-bootstrap` Phase 7 hash steps, `branching-story-turn-cycle` Phase 9) MUST compute these hashes through the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, not through ad-hoc one-off scripts. The CLI reuses the same `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator package (`snapshot_replay_equality`) uses for drift detection, so authoring-time hashes and validation-time drift comparisons are byte-identical by construction. Skill invocation pattern:

```
node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \
  --plan <path-to-page-plan-bytes>.md \
  --pg   <path-to-pg-draft>.{yaml,json}
```

The CLI emits `{plan_hash, state_hash}` as JSON to stdout (exit 0 on success). Pass a draft PG record that contains placeholder values for both hashes (or omits them entirely); the CLI ignores the input's `state_hash` field and overwrites the input's `plan.plan_hash` in the canonical payload with the value computed from `--plan`, so a single CLI invocation yields the pair the skill stamps onto the final record. Hand-rolling the canonical-JSON serializer is a known source of drift bugs (truncated strings, locale-sensitive sort orders, accidentally-included publication-receipt blocks) and is forbidden; if the CLI does not fit a workflow, the workflow is incomplete — open a CLI-extension ticket before bypassing it.

### 4.3 `SE` (~15 sub-paths)

```yaml
id: SE-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
parent_page_id: PG-<integer> | null         # * null only for SE-1
event_kind: story_start | selected_choice | write_in_attempt | system_repair | audit_repair | prose_attach | promotion_closeout   # *
actor: STENT-<integer> | system | unknown   # *
targets: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer>]
commitment:
  selected_slt_id: SLT-<integer> | null   # * null iff selection_source is none
  selection_source: emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none   # *
  alias_bindings:
    <alias>: <record_id>
outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal   # *
resolution:
  result: success | partial_success | failure | impossible | transformed | held_for_promotion
  player_visible_feedback: >          # * one-sentence player-legible consequence feedback
world_logic_rationale: >               # * natural-language justification of why this route follows from world canon + branch state
state_delta:
  create: [record_id]
  supersede: [record_id]
  close: [record_id]
promotion_claims:
  - source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>
    authority: apparent | branch_local_counterfactual | canon_candidate
```

Per-source-kind `promotion_claims[].source_record` requirements:

| source_kind | Required | Permitted supporting |
|---|---|---|
| `story_fact` | SF | none |
| `mystery_resolution` | SF or BEL | none |
| `character_outcome` | STENT | STSTAT as supersession-chain evidence; STENT alone is sufficient |
| `artifact_canonization` | DA | none |
| `relationship_or_institutional_outcome` | SREL | BEL, SF |
| `other_branch_claim` | any `promotion_claims[].source_record` class | none |

`world_logic_rationale` is required (no silent rejection — see §6). `commitment` records which causal move produced the event and the concrete predicate-DSL alias bindings selected for that move. `selection_source: none` and `selected_slt_id: null` are used exactly for `event_kind: story_start | prose_attach | promotion_closeout`; all other event kinds name the selected or generated `SLT`. Every `bound:<alias>` referenced by the selected block's preconditions, effects, or likely effects must appear in `alias_bindings` with the concrete record id used for this event. Actor and target binding stay in the existing `actor` and `targets` fields — do not duplicate them under `commitment`.

There is no `input_surface` block on SE; the PG record's `input.resolved_event_id` is the authoritative PG-to-SE link. There is no `state_delta.no_change` list — absence from `create / supersede / close` is the no-change signal. There is no `required_action` on promotion claims — `authority == canon_candidate` implies `run_story_fact_promotion_to_canon`.

`resolution` makes non-accept outcomes structurally auditable. It is required when `outcome_route` is `attempt`, `accommodate`, or `world_block`; it is absent for `accept`; it is optional for `promotion_hold` and `terminal` subject to the route consistency table below. `player_visible_feedback` is the one-sentence statement of what the player should be able to perceive about why the action resolved this way. It is consumed by page-plan §7, prose-attach, and promotion evidence review; do not add a `reason_class` field.

| `outcome_route` | Allowed `resolution.result` |
|---|---|
| `accept` | `resolution` absent |
| `attempt` | `success`, `partial_success`, `failure` |
| `accommodate` | `partial_success`, `transformed` |
| `world_block` | `impossible`, `failure` |
| `promotion_hold` | `resolution` absent or `held_for_promotion` |
| `terminal` | `resolution` absent, `success`, `partial_success`, `failure`, `transformed` |

### 4.4 `SLT` commitment block (~18 sub-paths)

```yaml
id: SLT-<integer>*
story_id: STORY-<integer>*
scope:
  visibility: global_author_pool | branch_prefix_scoped | branch_scoped   # *
  branch_id: BR-<integer> | null            # * null only for global_author_pool
  visible_branch_path_prefix: [PG-<integer>] # * branch_prefix_scoped only; non-empty ordered prefix of PG.branch_path
created_at_page: PG-<integer> | null        # null only for global_author_pool
title: string*
move_family: orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery   # *
preconditions:
  hard: [<predicate>]*                 # see §5 closed predicate DSL
  soft: [<predicate>]
beats:                                 # * 1-5 beats per block
  - beat_id: B1*
    function: setup | action | pressure | turn | consequence | exit   # *
    instruction: >                     # * prose-facing beat instruction, no engine jargon
effects:                               # mirrors SE.state_delta
  create: [record_id | bound:<alias>]
  supersede: [record_id | bound:<alias>]
  close: [record_id | bound:<alias>]
exit_options:                          # *
  - action_family: <action_family>*    # see §4.4a shared taxonomy
    surface_hint: string*
    likely_effects: [record_id | bound:<alias>]
saliency:
  urgency: low | medium | high*
  cooldown_pages: 0*
  tags: [<string>]
mystery_policy:
  forbidden_resolutions: [M-<integer>]
  allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none   # *
provenance:
  origin: bootstrap_seed | manual_authoring | author_batch | audit_repair | runtime_jit   # *
```

`move_family` values:

| Value | Operational definition |
|---|---|
| `orient` | Establishes where the actors are, what matters now, or what changed since the prior page. |
| `world_pressure` | Brings an external pressure, hazard, institution, scarcity, or deadline to bear. |
| `pursuit` | Advances a chase, search, pursuit, or closing distance toward a target. |
| `investigation` | Tests, searches, questions, traces, or compares evidence to learn something. |
| `disclosure` | Reveals, withholds, reframes, or forces acknowledgement of information. |
| `negotiation` | Trades offers, terms, leverage, concessions, threats, or agreements. |
| `bond_shift` | Changes trust, intimacy, loyalty, resentment, fear, or obligation between actors. |
| `status_shift` | Changes rank, legitimacy, public standing, access, or institutional position. |
| `conflict` | Directly contests another actor, force, institution, obstacle, or claim. |
| `evasion` | Avoids pursuit, exposure, obligation, danger, or unwanted contact. |
| `protection` | Shields a person, place, object, secret, bond, or resource from harm or exposure. |
| `resource_exchange` | Gains, spends, transfers, loses, withholds, or bargains over a concrete resource. |
| `transformation` | Changes a condition, object, relationship, environment, or capability. |
| `ritual_protocol` | Performs a formal, magical, legal, social, religious, or institutional procedure. |
| `decision` | Forces, delays, clarifies, or commits to a consequential choice. |
| `recovery` | Restores capacity, repairs damage, regroups, heals, rests, or stabilizes after pressure. |

There is no `record_version` (greenfield resets to 1; no v2 / v3 history). There is no `shape` discriminator (single shape — reintroduce only if a second shape is ever needed). There is no `required_context` block (redundant with predicate preconditions). There is no `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, or `stop_policy` — these are arc / plot-rail framings that commitment blocks deliberately reject. There is no `safety_valves.max_words` ceiling — the engine does not enforce word counts.

Commitment blocks are reusable causal moves, not dramatic acts, arcs, mini-stories, or plot rails. A good block says: "when these conditions hold, this kind of action can happen, these beats dramatize it, these state effects follow." A bad block says: "advance Act II" or "raise stakes before midpoint."

### 4.4a Shared `action_family` taxonomy

`action_family` is the shared coarse taxonomy used by `PG.visible_affordances[].action_families` and `SLT.exit_options[].action_family`. Per-affordance `surface_hint: string` carries local specificity; `likely_effects` names record ids or `bound:<alias>` targets.

| Value | Operational definition |
|---|---|
| `move` | Change physical position or navigate to a different place, route, stance, or cover. |
| `evade` | Avoid detection, pursuit, contact, obligation, or immediate danger. |
| `pursue` | Follow, chase, track, shadow, or close distance toward a target. |
| `perceive` | Look, listen, sense, inspect, notice, or attend to available evidence. |
| `investigate` | Test a hypothesis, interrogate evidence, search a location, or reconstruct causes. |
| `communicate` | Say, signal, write, reveal, ask, report, warn, or otherwise convey information. |
| `persuade` | Try to change another actor's belief, stance, permission, or willingness. |
| `negotiate` | Exchange terms, bargain, compromise, threaten, or settle conditions. |
| `bond` | Strengthen, strain, repair, acknowledge, or redefine a relationship. |
| `oppose` | Resist, challenge, block, refuse, undercut, or contest another actor or force. |
| `harm` | Damage, wound, sabotage, degrade, or impose a cost. |
| `protect` | Defend, shield, hide, preserve, escort, or secure something at risk. |
| `control` | Restrain, command, contain, direct, lock down, or otherwise govern behavior or access. |
| `transfer` | Give, take, trade, steal, lend, return, or move possession / custody. |
| `use` | Employ an object, place, capability, relationship, or institution for its ordinary function. |
| `make_change` | Alter a material, social, informational, or environmental state. |
| `ritual_protocol` | Perform a formalized procedure with magical, legal, social, religious, or institutional force. |
| `recover` | Rest, heal, repair, regain, stabilize, resupply, or de-escalate damage. |
| `wait` | Hold, observe, delay, defer, maintain position, or let a condition mature. |
| `decide` | Choose, commit, prioritize, accept, reject, or resolve between alternatives. |

`attempt` is an `SE.outcome_route` per §6, not an `action_family`. `CHC` records carrying an action that may resolve through `outcome_route: attempt` use the action family describing the attempted action, such as `pursue`, `persuade`, or `harm`.

### 4.4b STENT role and SREL axis taxonomies

`STENT.role_in_story` is a closed list field, not a scalar. A story-local entity may carry more than one role when that role is operationally useful.

| Value | Operational definition |
|---|---|
| `viewpoint` | The entity can anchor scene perception or page-plan point of view. |
| `player_proxy` | The entity is the user's primary agency surface in the story bundle. |
| `primary_actor` | The entity can initiate major page actions or state changes. |
| `opposing_actor` | The entity actively resists or pressures a primary actor's goals. |
| `allied_actor` | The entity materially supports a primary actor's goals. |
| `authority` | The entity can grant, deny, enforce, or legitimate permissions and consequences. |
| `dependent` | The entity's safety, access, or agency depends on another actor or institution. |
| `witness` | The entity can observe and later testify, remember, report, or misreport events. |
| `information_source` | The entity is a likely source of branch-relevant knowledge. |
| `pressure_source` | The entity generates urgency, danger, obligation, scarcity, or social pressure. |
| `social_bridge` | The entity connects otherwise separate actors, groups, institutions, or locations. |
| `background` | The entity is present for continuity, texture, or constraints but is not currently action-driving. |

`SREL.axis` is a closed relationship-axis list:

| Value | Operational definition |
|---|---|
| `trust` | Degree of reliance on another actor's honesty, competence, or follow-through. |
| `fear` | Degree of apprehension, intimidation, dread, or threat sensitivity. |
| `desire` | Degree of wanting, attraction, envy, ambition, or motivated pull. |
| `debt` | Degree of owed favor, compensation, restitution, gratitude, or liability. |
| `intimacy` | Degree of private knowledge, emotional closeness, bodily closeness, or vulnerability. |
| `loyalty` | Degree of durable allegiance, duty, or willingness to prioritize the relation. |
| `resentment` | Degree of grievance, bitterness, jealousy, humiliation, or stored anger. |
| `power_imbalance` | Degree of asymmetry in command, leverage, dependency, status, or coercive capacity. |
| `attention` | Degree of focus, surveillance, fascination, neglect, or scrutiny. |
| `familiarity` | Degree of personal knowledge, routine contact, recognition, or ease. |
| `approval` | Degree of praise, sanction, endorsement, acceptance, or social permission. |
| `respect` | Degree of esteem, deference, credibility, or perceived worth. |
| `obligation` | Degree of duty, promise, role-bound responsibility, or expected performance. |
| `hostility` | Degree of active antagonism, aggression, rivalry, contempt, or intent to harm. |

### 4.5 Additional Story-Bundle Record Schemas

The following classes share the same append-only rule from §3: committed records are not edited in place; later changes create a new record with `supersedes` when the class schema includes that field.

#### 4.5.1 `STENT` (story-local entity)

Mirrors a world-level `CHAR` dossier into the bundle for branch-local entity state, or defines a wholly story-local entity.

```yaml
id: STENT-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STENT-<integer> | null            # default null
display_name: string*                          # cast roster label
bound_char_id: CHAR-<integer> | null          # null only for wholly story-local entities
role_in_story: [<role>]*                       # closed list per §4.4b; one or more
```

No `notes` field: authorial notes belong in the page plan or another load-bearing record.

#### 4.5.2 `STINT` (intention)

Tracks an entity's active goal-state at a page.

```yaml
id: STINT-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STINT-<integer> | null            # default null
holder: STENT-<integer>*
intent: string*                                # natural-language goal statement
urgency: low | medium | high*
expires_when: string*                          # natural-language supersession trigger
```

#### 4.5.3 `SF` (story-local fact)

Records what is true in the branch. Use `BEL` for what a holder believes, claims, witnesses, suspects, or lies about.

```yaml
id: SF-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: SF-<integer> | null               # default null
statement: string*                             # natural-language branch-local truth
authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked*   # default branch_local
derived_from: [CF-<integer> | <story-local record id>]   # default []; non-empty for mirrored or derived facts
```

No `certainty`, `scope`, `who_knows`, `derived_from_cf`, `why_it_matters_at_opening`, or `trace_records` fields. CF mirrors and branch-derived facts both use `derived_from`.

Use `branch_local` for ordinary story-local truths, `branch_local_counterfactual` for deliberately branch-only contradictions, `canon_candidate` for claims held for promotion, and `canon_linked` only after canon acceptance. A `canon_linked` `SF` must include at least one parent `CF-<integer>` in `derived_from`; no separate canon-link field exists.

#### 4.5.4 `OBL` (obligation)

Tracks promised, owed, or required behavior that constrains future choice.

```yaml
id: OBL-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: OBL-<integer> | null              # default null
status: open | closed | escalated | abandoned | transferred*
obligation_kind: string*                       # open vocabulary
description: string*
owed_by: STENT-<integer> | group:<name> | public | null*
owed_to: STENT-<integer> | group:<name> | public | null*
trigger_to_close: string*                      # natural-language supersession trigger
urgency: low | medium | high*
```

No `introduced_at_page` field; `created_at_page` is the only creation provenance.

#### 4.5.5 `CNSQ` (consequence)

Tracks a realized or pending effect from a prior event or state.

```yaml
id: CNSQ-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: CNSQ-<integer> | null             # default null
status: pending | resolved | escalated | abandoned*
consequence_kind: string*                      # open vocabulary
description: string*
urgency: low | medium | high*
resolves_when: string*                         # natural-language supersession trigger
derived_from: [<record_id>]                    # default []; record ids that caused this consequence
```

#### 4.5.6 `THR` (thread)

Tracks an active narrative tension across pages.

```yaml
id: THR-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: THR-<integer> | null              # default null
status: active | resolved | escalated | abandoned*
title: string*
summary: string*
urgency: low | medium | high*
derived_from: [<record_id>]                    # default []
```

#### 4.5.7 `SREL` (relationship)

Tracks a directed or symmetric relation between entities along a closed taxonomy axis.

```yaml
id: SREL-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: SREL-<integer> | null             # default null
axis: <axis>*                                  # §4.4b closed enum
participants: [STENT-<integer>]*              # exactly 2 participants
direction: string*                             # "STENT-<from> -> STENT-<to>" | "bidirectional"
value: none | trace | low | medium | high | extreme*
valence: symmetric | asymmetric | bidirectional | adversarial*
description: string*
derived_from: [<record_id>]                    # default []
```

No `magnitude` or `trace_records` fields; use `value` and `derived_from`.

#### 4.5.8 `STLOC` (story-local location)

Tracks a spatial referent grounded in world canon or wholly story-local.

```yaml
id: STLOC-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STLOC-<integer> | null            # default null
label: string*                                 # short display name
description: string*                           # natural-language description
bound_ent: ENT-<integer> | null               # null for wholly story-local locations
```

No `open_at_opening` field; active locations are open by virtue of page state.

#### 4.5.9 `STOBJ` (story-local object)

Tracks a movable or grounded object referenced by affordances or possession state.

```yaml
id: STOBJ-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STOBJ-<integer> | null            # default null
label: string*                                 # short display name
description: string*                           # natural-language description
owner: STENT-<integer> | group:<name> | public | null*
current_location: STLOC-<integer> | offstage | unknown | carried_by:STENT-<integer>*
```

#### 4.5.10 `DA` (story-local diegetic artifact)

Tracks an in-story text or artifact whose authorship is diegetic.

```yaml
id: DA-<integer>*                              # story-local id; distinct from world-level DA
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: DA-<integer> | null               # default null
title: string*                                 # display label
author: STENT-<integer> | group:<name> | unknown | anonymous*
genre: string*                                 # open vocabulary
body: string*                                  # diegetic text content
intended_audience: STENT-<integer> | group:<name> | public | self | none*
circulation: private | factional | public | concealed | suppressed*
truth_relation: true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent*
derived_from: [<record_id>]                    # default []
```

#### 4.5.11 `BR` (branch)

Tracks a causal lineage of pages. Branches fork; they do not supersede.

```yaml
id: BR-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
label: string*                                 # short display name
description: string                            # optional free-form
parent_branch_id: BR-<integer> | null*        # null only for root branch
forked_at_page_id: PG-<integer> | null*       # null only for root branch
root_page_id: PG-<integer>*                   # first page on this branch
```

#### 4.5.12 `CHC` (emitted choice)

Tracks a page-emitted choice selectable by the player on the next turn-cycle invocation.

```yaml
id: CHC-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: CHC-<integer> | null              # default null
surface_label: string*                         # short display label
player_visible_intent: string*                 # natural-language statement of what the player commits to
target_or_action_families: [<action_family>]*  # non-empty list; §4.4a closed enum
likely_state_pressure: string*                 # natural-language pressure description
associated_commitment_block: SLT-<integer> | null*   # SLT id if known, null if turn-cycle will JIT
grounded_in:
  records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | BEL-<integer> | OBL-<integer> | CNSQ-<integer> | THR-<integer> | SREL-<integer> | DA-<integer>]*  # non-empty; active records grounding this choice
  affordance_ordinals: [integer]               # optional; ordinals from PG.state_snapshot.visible_affordances
success_policy: string                         # optional; only present when the resolving SE.outcome_route is `attempt`
```

No `target_or_action_family` singular field, `choice_contract`, `choice_worthiness`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity`, `likely_effects`, `record_version`, `strategy_cluster`, `emitted_at_branch`, or `emitted_by_page` fields.

#### 4.5.13 `STSTAT` (story-local entity status)

Tracks the active life / agency / location state for one story-local entity. `PG.state_snapshot.entity_status` is a derived projection from active `STSTAT` records and is replay-checked with `state_snapshot.active_records`.

```yaml
id: STSTAT-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STSTAT-<integer> | null            # default null
entity: STENT-<integer>*
life: alive | dead | unknown*
agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown*
location: STLOC-<integer> | unknown | concealed | offstage*
derived_from: [SE-<integer> | <record_id>]     # default []
```

No `display_name`, `role_in_story`, or `bound_char_id` fields: identity stays on `STENT`.

### 4.6 Prose receipt

Stored at `pages-prose-receipts/PG-<integer>.yaml` (direct-write artifact; not an atomic `_source/` record).

```yaml
page_id: PG-<integer>*
story_id: STORY-<integer>*
plan_path: pages-prose-plans/PG-<integer>.md*
prose_path: pages-prose/PG-<integer>.md*
plan_hash: sha256*
prose_hash: sha256*
state_hash_at_plan_time: sha256*
checked_at: iso8601*
strict: true | false*
verdict: PASS | WARN | FAIL*
checks:
  hash_integrity: PASS | WARN | FAIL
  engine_jargon_leak: PASS | WARN | FAIL
  forbidden_mystery_resolution: PASS | FAIL
  required_event_rendered: PASS | WARN | FAIL
  choice_consequence_visibility: PASS | WARN | FAIL
  entity_status_consistency: PASS | WARN | FAIL
  invented_structural_fact: PASS | WARN | FAIL
  canon_claim_without_authority: PASS | FAIL
  craft_critic: PASS | WARN | FAIL | NOT_RUN
notes: [<string>]
repair_recommendation: none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon
```

The `checks` mapping contains eight deterministic prose/state checks plus the optional `craft_critic` result. `hash_integrity` is `PASS` when the recorded `PG.plan.plan_hash` and `PG.state_hash` are lowercase sha256-shaped and match the recomputed plan/state hashes, `WARN` when drift is accepted because `accept_plan_drift=true`, and `FAIL` when drift is not accepted or either PG hash field is missing, placeholder, or non-sha256. `choice_consequence_visibility` verifies that rendered prose realizes `SE.resolution.player_visible_feedback`; it does not mutate `PG` state or re-author the selected event.

A failed receipt blocks publication only if the attaching skill ran with `strict=true`. **A receipt never mutates `PG` state.**

## 5. Closed Predicate DSL

`SLT.preconditions.hard | soft` use this closed grammar. No free-form predicate prose.

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
| `location(STENT-<integer>, STLOC-<integer>)` | Entity must currently be at location. | turn-cycle eligibility |
| `has_affordance(<action_family>)` | The current page's `visible_affordances` must include an affordance whose `action_families` contain the named family. | turn-cycle eligibility, plan grounding |
| `record_active(<record_id>)` | Named record must be active in the current `PG.state_snapshot`; accepts STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA / STSTAT ids. | turn-cycle eligibility |
| `record_age(<record_id \| bound:<alias>>, >= \| <= \| == \| !=, <integer_pages>)` | Derived age check over the record's `created_at_page` and the evaluating page's position in `branch_path`; `bound:<alias>` may reference a same-block existential match. | turn-cycle eligibility, debt-pressure maturation |
| `intention_active(STINT-<integer>)` | Named intention must be currently active. | turn-cycle eligibility |
| `object_accessible(STENT-<integer>, STOBJ-<integer>)` | Entity must have page-state access to the named object. | turn-cycle eligibility, plan grounding |
| `artifact_accessible(STENT-<integer>, DA-<integer>)` | Entity must have access to the named story-local diegetic artifact. | turn-cycle eligibility, plan grounding |
| `affordance_available_to(STENT-<integer>, <action_family>)` | Actor-specific affordance grounding must exist for the named action family. | turn-cycle eligibility, plan grounding |
| `all[…]`, `any[…]`, `not[…]` | Boolean composition. | combinator |

`has_affordance(<action_family>)` and the `any_*` existential predicates are valid only for `global_author_pool` and `branch_prefix_scoped` prefiltering when an actor is not yet bound. Branch-execution eligibility checks use exact-ID predicates (for example `affordance_available_to(<actor>, <family>)`, `obligation_open(OBL-<integer>)`, or `belief_record(holder, BEL-<integer>)`) so plan-time grounding is actor-specific. Free-claim string matching is not a lawful predicate; the only belief-family predicates are `belief_record` (exact BEL-id) and `any_belief` (existential alias-binding).

**Information / Observer Firewall.** At move-generation time, every selected `SLT` actor-binding and every emitted `CHC` must be grounded in information available to the acting entity. Valid access routes include the actor's active `BEL` records, direct observation from active location/status, accessible `DA` / `STOBJ` evidence, testimony, document access, inference from known facts, surveillance, institutional channel, magic/tech, or another canonically valid mechanism named in the plan. A `BEL` or `DA` may ground a move only when the actor can access it; narrator-only knowledge, hidden branch state, and facts known only to another actor cannot license that actor's move unless a valid access route is recorded.

An existential predicate binds its `alias` to the matched active record during block selection. `SLT.effects.create`, `SLT.effects.supersede`, `SLT.effects.close`, and `SLT.exit_options[].likely_effects` may reference that matched record as `bound:<alias>`. Every `bound:<alias>` reference must resolve to an alias bound by a hard or soft precondition on the same `SLT`.

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

`outcome_route: world_block` is still the routing value for impossible actions. It no longer pairs with the retired event-kind value named `world_block`; the `SE.event_kind` records the event source (`selected_choice`, `write_in_attempt`, `system_repair`, or `audit_repair`) while the route records the impossibility.

## 7. Eight Shared Hard Gates

Every state-changing skill validates against these eight gates at page-plan commit. Each gate's pass entry on `PG.validation_trace` requires a one-line rationale (per CLAUDE.md "PASS entries require a one-line rationale").

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

A skill that bypasses any gate is broken. Hook 3 structurally enforces patch-engine-only writes to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml`, so a malformed plan is rejected at the patch engine before any record lands.

## 8. Page Plan Minimum Contract

`pages-prose-plans/PG-<integer>.md` is a direct-write artifact (not an atomic `_source/` record). It is the prompt package for the external prose renderer. Each plan body has 19 sections:

| § | Section | Source |
|---|---|---|
| 1 | Story kernel excerpt | `STORY_KERNEL.md` slice |
| 2 | **Content Policy** | **inlined verbatim from `reports/prose-quality-instructions.md` §Content Policy** |
| 3 | **Prose Craft Contract** | **inlined verbatim from `reports/prose-quality-instructions.md` §Prose Craft Contract** |
| 4 | Relevant world-canon excerpt | context packet |
| 5 | Active cast and entity statuses | `state_snapshot.entity_status` |
| 6 | Current location and affordances | `state_snapshot.visible_affordances` |
| 7 | Selected event and state delta | `SE` |
| 8 | Required beats from the commitment block | selected `SLT.beats` |
| 9 | Relationship and belief context | active `SREL`, `BEL` |
| 10 | Open obligations, consequences, threads | active `OBL`, `CNSQ`, `THR`, including each record's `urgency` |
| 11 | Forbidden mystery resolutions | `mystery_policy.forbidden_resolutions` |
| 12 | Stopping point | from commitment block + author judgment |
| 13 | Next choices to foreshadow or make available | emitted `CHC[]` |
| 14 | Recent prose continuity (optional, when parent prose is rendered) | recent `pages-prose/*.md` |
| 15 | Plan frontmatter (engine fields, hash, page id) | engine |
| 16 | Cast material reality projection (optional) | per-skill |
| 17 | Style and register notes (optional) | per-skill |
| 18 | Anti-pathology checklist | per-skill |
| 19 | **Render-time instruction block** | **inlined verbatim from `reports/prose-quality-instructions.md` §Render-Time Instruction Template** |

**§2, §3, and §19 are inlined verbatim on every page plan.** This is operationally load-bearing: the external prose renderer has no cross-plan state — every page render is a cold context. Compacting these sections on subsequent pages would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across pages.

The plan must not expose engine jargon to prose. Engine terms (record ids, gate names) may appear in §15 frontmatter only.

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
6. Update bundle `INDEX.md` last.
7. Update per-world `stories/INDEX.md` only when story visibility changed (new bundle, archived bundle).

Hook 3 blocks raw `Edit` / `Write` on `_source/<class>/*.yaml`. Story-bundle markdown surfaces (`STORY_KERNEL.md`, `INDEX.md`, `pages-prose/`, `pages-prose-plans/`, `audits/`, `storylet-batches/`, `story-promotions/`, `pages-prose-receipts/`) remain direct-write surfaces.

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

## 12. How Skills Use This Contract

Each story-skill `SKILL.md` references this contract for: record schemas (§4), predicate DSL (§5), action-routing semantics (§6), the eight hard gates (§7), the page plan §19-section contract (§8), branching procedure (§9), shared write order (§10), and mystery/canon authority (§11).

Skills must not duplicate the contract's content. They cite it. If a skill needs a deviation, the deviation is amended into this contract first.

The contract does not describe:

- Per-skill workflow phases (each skill's `SKILL.md` owns these).
- Per-skill validation traces beyond the eight shared gates.
- Per-skill input / output specifications.
- Mode-specific behavior (e.g., `commitment-block-authoring` modes).
- Examples of skill invocations.

When `docs/FOUNDATIONS.md` and this contract disagree, FOUNDATIONS wins. Open the amendment by editing FOUNDATIONS first and propagating the change here.
