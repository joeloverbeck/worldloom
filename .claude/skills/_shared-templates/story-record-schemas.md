# Story Record Schemas

This file holds §4 of the Story State Contract verbatim — the full schema enumeration for all 20 story-bundle record classes plus the prose-receipt direct-write artifact. It is the canonical source the main contract's §4 stub points to, and the file every story-pipeline skill loads when it needs a record schema (rather than the eight hard gates at §7, the predicate DSL at §5, the page-plan minimum contract at §8, or the other shorter sections that remain in the main contract).

Subsection numbering matches the original `§4.X` form (e.g. `§4.6 prose receipt`, `§4.2 PG`, `§4.4 SLT`) so cross-references in skill prose, validator source, and other shared templates continue to resolve verbatim. The split is purely structural — §4 is overwhelmingly the bulk of the contract, and the bundled file exceeded the per-call read limit of bulk-loading tools at HEAD.

Authority and supersession discipline live in the main contract's §1; schema-minimalism doctrine lives in §2; the record class inventory lives in §3. Read those alongside this file when authoring or reading bundles.

---

## 4. Record Schemas

Required fields are marked `*`. Fields not listed are not part of the schema. All YAML strings supporting natural language remain free-form unless an enum is named. All 20 story-bundle record classes listed in §3 have field schemas defined below: §4.1-§4.4 cover the four classes with pre-existing closed schemas, §4.5 covers the 16 additional classes, and §4.6 covers the prose receipt direct-write artifact.

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
    CLK: [CLK-<integer>]
    STSEC: [STSEC-<integer>]
    STQ: [STQ-<integer>]
    STPLAN: [STPLAN-<integer>]         # active tactical plans on the branch at this page
    STEMO: [STEMO-<integer>]           # active causal affective states on the branch at this page
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
      evidence_records: [SF-<integer> | BEL-<integer> | DA-<integer> | SE-<integer>]  # defaults to []; MUST be non-empty for clue_added, narrowed, apparent_resolution, or held_for_promotion; every id MUST resolve to a story-local record in this bundle
  continuation:                        # *
    has_eligible_commitment_block: true | false
    terminal_status: open | branch_pause | terminal_closed
    terminal_rationale: null | string
plan:
  plan_hash: sha256*
prose_plan_path: pages-prose-plans/PG-<integer>.md*   # stable plan address; included in state_hash payload
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

Rendered prose and prose receipts are publication artifacts discovered by deterministic paths: `pages-prose/PG-<integer>.md` and `pages-prose-receipts/PG-<integer>.yaml`. They are not page-state fields and are not included in `PG`. `INDEX.md` may render publication status for human navigation; `PG` remains the authoritative fork-state record.

There is no nested rendered-prose block, no `prose_status` field, no `state_delta_summary` field (`SE.state_delta` is authoritative), and no `open_debt` field on the snapshot (open obligations / consequences / threads are derived from `state_snapshot.active_records.OBL / CNSQ / THR`).

`state_snapshot.canon_revision` is the page's world-canon baseline. It records the latest governing `CH-<integer>` visible to the page-planning context at commit time, or `null` only for worlds with no change-log entry. A child page must compare the parent snapshot's `canon_revision` against the current world-canon revision at turn start and classify drift as `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict` before treating parent story-local assumptions as current world-valid truth.

When `parent.state_snapshot.canon_revision != current_world_canon_revision`,
drift classification MUST retrieve every CH entry newer than the parent
baseline before classifying compatibility. Each CH names
`affected_fact_ids: [CF-<integer>]`; affected M / INV / SEC records are
discovered by traversing from each CF id through `touched_by_cf[]`
back-pointers on SEC / M / INV records, using
`mcp__worldloom__find_sections_touched_by(cf_id)` or equivalent targeted
retrieval. The latest CH from the context packet is only the trigger for drift
detection; the CH window and CF graph reverse lookup are the evidence for
classification. A `compatible` or `grandfathered` classification over a window
of two or more intervening CH entries MUST cite at least one specific CH id from
the window in `validation_trace.parent_snapshot_compatibility` or the
page-producing SE rationale.

Branch-scope vocabulary:

- `bundle_genesis_record`: a story-bundle record whose `created_at_page` is `PG-1`, where `PG-1` is the `root_page_id` of the root branch. Genesis records sit in every branch's `branch_path` and are visible to all branches unless later superseded or closed.
- `branch_local_record`: a record created after `PG-1` whose `created_at_page` is not in the active `branch_path`, or, for an `SLT`, not in the `visible_branch_path_prefix` authorized for that block.

#### 4.2a Deterministic PG hash computation

Every `PG` record must carry final lowercase sha256 values before any `create_pg_record` patch plan is validated or submitted. Placeholder, uppercase, non-hex, missing, or stale hash values are hard-stop authoring errors; the skill must repair the draft in working memory before `mcp__worldloom__validate_patch_plan`.

Compute `plan.plan_hash` first. It is sha256 over the exact UTF-8 bytes of the page plan body that will later be written to `pages-prose-plans/PG-<integer>.md`. Because the page plan is a direct-write artifact after patch submission (§10), the skill drafts the complete plan bytes in working memory, hashes those exact bytes, places the hash in `PG.plan.plan_hash`, and after patch success writes the same bytes to disk without reformatting.

Compute `state_hash` second from the PG fork-state payload after `plan.plan_hash` is final. The fork-state payload is the complete PG mapping except `state_hash` itself. Rendered prose and prose receipts are not PG fields and therefore are not hash inputs.

All other PG fields are included, including `id`, `story_id`, `branch_id`, `parent_page_id`, `branch_path`, `turn_index`, `input`, `state_hash_parent`, `state_snapshot`, `plan.plan_hash`, `prose_plan_path`, `emitted_choices`, and `validation_trace`.

Pre-SCAUD-001 PG records retain their original `state_hash` values, computed against the old nested prose-receipt payload. Those values are read as opaque strings; no re-hashing is performed. Post-SCAUD-001 PG records use the payload definition above. The `snapshot_replay_equality` validator must tolerate this discontinuity.

The state payload serialization is deterministic canonical JSON: objects serialized with keys sorted lexicographically at every depth, arrays kept in authored order, strings emitted as UTF-8 JSON strings, no insignificant whitespace, no comments, and no YAML anchors or aliases. Hash the resulting UTF-8 bytes with sha256 and encode as 64 lowercase hex characters.

For root pages, compute both hashes after `PG-1`, the final page-plan bytes, emitted `CHC` records, and `PG-1.validation_trace` are finalized in working memory, then validate/submit the patch plan. For child pages, copy `state_hash_parent` exactly from the already-committed parent PG's `state_hash`, finalize the new PG and plan bytes, compute `plan.plan_hash`, compute `state_hash`, then validate/submit. If any later edit changes an included PG field or the page-plan bytes before submission, recompute the affected hash values before validation.

**Tooling.** Every PG-authoring OR PG-verifying skill (PG-authoring: `branching-story-bootstrap` Phase 7 hash steps, `branching-story-turn-cycle` Phase 9; PG-verifying: `branching-story-prose-attach` Phase 2 `computed_state_hash` recomputation against the committed `PG.state_hash` for `hash_integrity` check) MUST compute these hashes through the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, not through ad-hoc one-off scripts. The PG-verifying case requires the same canonical-JSON serializer as the PG-authoring case — hand-rolling the serializer at verification time produces drift between committed and recomputed hashes that the receipt would misclassify as `hash_integrity: FAIL` when no actual drift exists. Implementation source: `tools/world-mcp/src/cli/compute-pg-hashes.ts`; runtime invocation after build: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-md-path> --pg <pg-record-path>`. The TS source path is the canonical reference for code authors; the dist JS path is the runtime invocation. Both are correct in their respective contexts. The CLI reuses the same `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator package (`snapshot_replay_equality`) uses for drift detection, so authoring-time hashes and validation-time drift comparisons are byte-identical by construction. Skill invocation pattern:

```
node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \
  --plan <path-to-page-plan-bytes>.md \
  --pg   <path-to-pg-draft>.{yaml,json}
```

The CLI emits `{plan_hash, state_hash}` as JSON to stdout (exit 0 on success). Pass a draft PG record that contains placeholder values for both hashes (or omits them entirely); the CLI ignores the input's `state_hash` field and overwrites the input's `plan.plan_hash` in the canonical payload with the value computed from `--plan`, so a single CLI invocation yields the pair the skill stamps onto the final record. Hand-rolling the canonical-JSON serializer is a known source of drift bugs (truncated strings, locale-sensitive sort orders, accidentally-included publication artifacts) and is forbidden; if the CLI does not fit a workflow, the workflow is incomplete — open a CLI-extension ticket before bypassing it.

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
record_introductions:                  # optional; records newly introduced CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO state
  - record_id: CLK-<integer>
    class: CLK | STSEC | STQ | THR | STENT | SREL | STPLAN | STEMO
    trigger: <closed trigger for class, per story-state-contract §5a>
    evidence: [record_id]
    distinct_from: [record_id]
    rationale: string                  # optional prose; no structural meaning
state_relations:                       # optional; records this event's relation to an existing state record
  - relation: advances | tests | blocks | revises | fulfills | abandons | ignores
    target_record: STPLAN-<integer>
non_propagation_facts:                 # optional; records why expected witness propagation did not occur
  - reason: no_witness | witness_incapacitated | evidence_concealed | institution_suppresses_report | event_leaves_no_accessible_trace
    group: string
    records: [record_id]
state_delta:
  create: [record_id]                  # accepts the lifecycle-managed story-state classes, including STPLAN/STEMO
  supersede: [record_id]               # same class set as create
  close: [record_id]                   # same class set as create
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

`world_logic_rationale` is required (no silent rejection — see §6) and is prose-only: validators MUST NOT parse it for structural facts. `commitment` records which causal move produced the event and the concrete predicate-DSL alias bindings selected for that move. `selection_source: none` and `selected_slt_id: null` are used exactly for `event_kind: story_start | prose_attach | promotion_closeout`; all other event kinds name the selected or generated `SLT`. Every `bound:<alias>` referenced by the selected block's preconditions, effects, or likely effects must appear in `alias_bindings` with the concrete record id used for this event. Actor and target binding stay in the existing `actor` and `targets` fields — do not duplicate them under `commitment`.

`commitment.alias_bindings` accepts the existing selected-move binding classes plus the five existential-predicate-bindable classes `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`, so author-pool prefilter aliases can become exact event bindings without bypassing branch-local validation.

`record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]` are optional structured fields. Their closed enums, per-class trigger vocabulary, and full validation shape are defined in `tools/validators/src/schemas/story-event.schema.json`; the authoring contract and trigger tables live in `story-state-contract.md` §5a.

Worked `record_introductions[]` example:

```yaml
record_introductions:
  - record_id: CLK-7
    class: CLK
    trigger: deadline_declared
    evidence: [SE-11, OBL-3]
    distinct_from: []
```

Worked `state_relations[]` example:

```yaml
state_relations:
  - relation: advances
    target_record: STPLAN-5
```

Worked `non_propagation_facts[]` example:

```yaml
non_propagation_facts:
  - reason: event_leaves_no_accessible_trace
    group: direct_witnesses
    records: [DA-4]
```

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

#### 4.3a Audit-only SE events

`event_kind: prose_attach` and `event_kind: promotion_closeout` are audit-only
event records. They do NOT produce a page, do NOT appear in any
`PG.input.resolved_event_id`, and do NOT alter branch snapshots.

Required shape:
- `commitment.selected_slt_id: null`
- `commitment.selection_source: none`
- `commitment.alias_bindings: {}`
- `outcome_route: accept`
- `resolution` absent
- `state_delta.create: []`
- `state_delta.supersede: []`
- `state_delta.close: []`
- `promotion_claims: []`
- `parent_page_id` names the page whose prose or promotion closeout is being
  audited; null only when the bundle has no relevant page anchor.

`snapshot_replay_equality` ignores audit-only SE records except as ledger
evidence. Health-audit's structural-replay phases (2a, 2c, 2d) treat
audit-only SEs as no-op walkable events that do not alter cumulative state.

### 4.4 `SLT` commitment block (~18 sub-paths)

```yaml
id: SLT-<integer>*
story_id: STORY-<integer>*
scope:
  visibility: global_author_pool | branch_prefix_scoped | branch_scoped   # *
  branch_id: BR-<integer> | null            # * null only for global_author_pool
  visible_branch_path_prefix: [PG-<integer>] # * branch_prefix_scoped only; non-empty ordered prefix of PG.branch_path
created_at_page: PG-<integer> | null        # required for provenance.origin: runtime_jit; nullable for page-independent authoring origins
title: string*
move_family: orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery   # *
preconditions:
  hard: [<predicate object>]*          # see §5 closed predicate DSL emitted form
  soft: [<predicate object>]
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

`created_at_page` is provenance for page-local creation, not branch scope. For
`provenance.origin: runtime_jit`, it MUST name the page whose turn created the
block. For `bootstrap_seed`, `author_batch`, `manual_authoring`, and
`audit_repair`, it MAY be null when the block is authored outside a page turn.
Branch legality is determined by `scope.visibility`, `scope.branch_id`, and
`scope.visible_branch_path_prefix`, not by `created_at_page`.

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

**Truth-relation propagation through `derived_from`.** When a `derived_from[]` entry references a `BEL` whose `truth_relation` is anything other than `true` (i.e., `false`, `partly_true`, `unknown`, `contested`, `branch_counterfactual`, or `future_contingent`), the SF MUST use `authority: branch_local_counterfactual` — the `lie_promoted_silently` validator enforces that non-true beliefs cannot be silently promoted into branch-local-true facts. The rule preserves FOUNDATIONS Rule 4 (No Globalization by Accident) at the SF-vs-BEL boundary: a non-true belief is a holder's epistemic state, not a branch-local truth, and an SF that cites it as a source inherits its non-true authority. When a BEL's role in the fact is causal-but-not-truth-bearing (e.g., the holder's belief motivated their action but the action's outcome stands on its own as a branch-local truth), capture the BEL via `BEL.basis.access_records[]` on a downstream witness or interpretation belief rather than via `SF.derived_from[]`; the fact then carries `authority: branch_local` based on its own truth-status and the belief's role is recorded in the belief-state delta without propagating non-true authority to the fact.

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
direction:
  kind: directed | bidirectional*              # directed names an ordered relation; bidirectional is mutual
  from: STENT-<integer> | null*                # required when kind == directed; null when bidirectional
  to: STENT-<integer> | null*                  # required when kind == directed; null when bidirectional
value: none | trace | low | medium | high | extreme*
valence: symmetric | asymmetric | bidirectional | adversarial*
description: string*
derived_from: [<record_id>]                    # default []
```

If `direction.kind: directed`, both `direction.from` and `direction.to` MUST be non-null and reference STENT records in the bundle. If `direction.kind: bidirectional`, both endpoints MUST be null; the mutual participants are documented in `participants[]`.

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
  records: [STENT-<integer> | STSTAT-<integer> | STLOC-<integer> | STOBJ-<integer> | BEL-<integer> | OBL-<integer> | CNSQ-<integer> | THR-<integer> | SREL-<integer> | DA-<integer> | STPLAN-<integer> | STEMO-<integer> | CLK-<integer> | STSEC-<integer> | STQ-<integer> | STINT-<integer> | SF-<integer>]*  # non-empty; active records grounding this choice
  affordance_ordinals: [integer]               # optional; ordinals from PG.state_snapshot.visible_affordances
success_policy: string                         # optional; only present when the resolving SE.outcome_route is `attempt`
```

Use `STSTAT` when the choice's availability, prohibition, risk, or transformation turns on life, agency, or location status. Use `STPLAN` when the choice's availability or salience materially depends on the actor's current tactical plan. Use `STEMO` when the choice exists because of active affective pressure. Use `CLK` for staged pressure, `STSEC` for hidden truth or clue-carrier grounding, `STQ` for an open setup or story question, `STINT` for an active desire/goal, and `SF` for a branch-local fact rather than a belief. Prefer `BEL` when the choice is grounded in the actor's belief, even if the belief is true.

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

#### 4.5.14 `CLK` (pressure clock)

Tracks present-causal pressure that advances over time or through events: danger clocks, faction activity, countdowns, pursuit, exposure, deadlines, and worsening conditions. `CLK` is a state record; active instances appear in `PG.state_snapshot.active_records.CLK`.

```yaml
id: CLK-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: CLK-<integer> | null            # default null
title: string*
clock_kind: danger | racing | mission | faction | exposure | pursuit | deadline*
driver: STENT-<integer> | group:<name> | system | unknown*
linked_records: [THR-<integer> | OBL-<integer> | CNSQ-<integer> | STINT-<integer> | SREL-<integer> | STLOC-<integer> | STOBJ-<integer> | STQ-<integer>]*
value: integer >= 0*
max: integer >= 1*
salience: low | medium | high*
visibility: hidden | holder_specific | public | factional*
thresholds:
  - at: integer >= 1*
    label: string*
    effects:
      create: [<record_id> | bound:<alias>]
      supersede: [<record_id> | bound:<alias>]
      close: [<record_id> | bound:<alias>]
tick_history:
  - event: SE-<integer>*
    delta: nonzero integer*
    cause: string*
status: active | paused | resolved | fired | abandoned | superseded*
resolution_event: SE-<integer> | null
```

`title`, `clock_kind`, and `driver` scope the pressure for humans and future predicates. `linked_records` grounds the clock in existing state. `value` and `max` are present-causal state; `thresholds` names staged effects that become available when value crosses them; `tick_history` is the replay trail; `salience` and `visibility` support terminal-debt and information-firewall checks; `status` and `resolution_event` close the lifecycle. Do not add `deadline.natural_language`, `clock_kind: front`, or `visibility: audience_only`.

#### 4.5.15 `STSEC` (story secret)

Tracks story-local hidden truth: the branch-level secret that multiple BEL, SF, or DA records point toward, plus clue carriers and revelation lifecycle. `STSEC` is story-local. If it touches a world Mystery Reserve entry, `protected_mystery_refs[]` records the referenced `M-*`; the Mystery Reserve firewall remains authoritative and is not bypassed by a story-local reveal.

```yaml
id: STSEC-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STSEC-<integer> | null          # default null
secret_kind: identity | motive | location | event_cause | artifact_truth | relationship | institutional*
secret_claim: string*
truth_anchor: SF-<integer> | BEL-<integer> | DA-<integer> | null
holders: [STENT-<integer> | group:<name> | narrator]*
salience: low | medium | high*
protected_mystery_refs: [M-<integer>]        # default []
clue_carriers:
  - kind: DA | STOBJ | STLOC | BEL | SF | SE*
    record: DA-<integer> | STOBJ-<integer> | STLOC-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>*
    clue_text: string*
    clue_strength: weak | suggestive | confirming | decisive | misleading*
    discovered_by: [STENT-<integer> | group:<name> | public]
    audience_visible: hidden | visible | ambiguous*
    status: available | discovered | destroyed | suppressed | superseded*
source_records: [<record_id>]*
status: hidden | partially_revealed | revealed | disproven | abandoned*
reveal_event: SE-<integer> | null
reveal_records: [BEL-<integer> | SF-<integer> | DA-<integer> | STQ-<integer>]
```

`secret_kind` supports predicate filtering. `secret_claim` gives the human-readable hidden truth. `truth_anchor` distinguishes branch truth from belief-only claims. `holders` records who knows or guards the secret. `salience` and `protected_mystery_refs` support criticality and Mystery Reserve checks. `clue_carriers` is the canonical clue-to-secret binding; do not add a parallel STCLUE record class. `source_records`, `status`, `reveal_event`, and `reveal_records` close the lifecycle. Do not add `audience_state`, `criticality`, `secret_kind: other`, or a parallel `STCLUE` class.

#### 4.5.16 `STQ` (story question / open setup)

Tracks present-causal open-setup state: an element introduced into the branch that remains active until answered, paid off, abandoned, inherited, or superseded. `STQ` is not narrative-debt tracking and not promise-fulfillment expectation.

```yaml
id: STQ-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STQ-<integer> | null           # default null
setup_kind: setup | dramatic_question | promise*
question_or_setup: string*
salience: low | medium | high*
audience_visibility: hidden | implied | explicit*
source_event: SE-<integer>*
source_records: [SF-<integer> | BEL-<integer> | DA-<integer> | THR-<integer> | OBL-<integer> | CNSQ-<integer> | STINT-<integer> | SREL-<integer> | STLOC-<integer> | STOBJ-<integer> | CLK-<integer> | STSEC-<integer>]*
payoff_of: STQ-<integer> | null
status: open | complicated | answered | paid_off | abandoned | inherited | superseded*
answer_event: SE-<integer> | null
answer_records: [<record_id>]
abandonment_rationale: string | null
```

`STQ` tracks present open-setup state, not future dramatic obligation. The engine asks what setups are currently open, what state they license, and what would close them; it does not ask whether the branch is before or after the midpoint, what shape an eventual payoff should take, or what arc position the story occupies.

The following fields are prohibited in STQ schemas, validators, predicates, and skill integrations:

| Prohibited field | Reason |
|---|---|
| `expected_payoff_mode` | Encodes future shape — categorical prediction of how an eventual resolution would be structured. |
| `act_position` / `midpoint` / `climax` | Per §5c, the engine tracks present causal state, not narrative shape. |
| `dramatic_curve_position` / `tension_arc` | Encodes narrative shape rather than present state. |
| `kind: moral_question` | Authorial / subjective; not validator-readable. |
| `expected_chapter` / `scene_sequence` | Per §5a, no `arc_contract`, `dramatic_unit`, or `execution_envelope`. |
| `holders[]` | Audience-vs-character distinction is covered by `audience_visibility` plus `source_records[]` grounding. |

Validators hard-reject any `STQ` record carrying a prohibited field at the `record_schema_compliance` gate.

#### 4.5.17 `STPLAN` (actor-owned tactical plan)

Tracks an actor-owned tactical plan over multiple pages: how a holder is presently trying to pursue an intention, which resources or leverage the plan rests on, what currently blocks it, and what the actor would try if the current step fails. `STPLAN` is strict-minimalist v1 story state per §5b. Do not add `risk_posture`, `visibility`, `current_step.rationale`, or `fallback_steps[*].rationale`; those are extension-list candidates that require a future spec with concrete validator, predicate, MCP, fork-operation, or audit-trail consumers.

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

`objective` is present causal strategy, not future plot shape. `plan_status` has no climax, expected-outcome, act-position, or target-scene values. `belief_basis`, `resource_basis`, `blockers`, and `current_step` ground the plan in accessible branch state so validators and MCP summaries can distinguish an actor's medium-range agency from authorial plot planning.

#### 4.5.18 `STEMO` (actor-owned affective state)

Tracks an actor-owned transient affective state: the current emotional pressure causally biasing the holder's next action. `STEMO` is not a mood arc or prose-tone note. Its closed `affect_kind` enum follows the SPEC-47 convergence review across Ekman 1972/1999, Plutchik, OCC, Geneva Emotion Wheel, and Cowen & Keltner 2017; its closed `behavioral_pressure` enum follows the SPEC-47 action-tendency review across Frijda 1986/1987, Roseman 2011, Lazarus-Folkman 1984, Skinner et al. 2003, Gray-McNaughton, Taylor 2000, and Gross 1998/2015. `numbness` is represented as `status: dissociated` with `affect_kind: null`; `surprise` stays at the event/appraisal surface rather than as a STEMO affect kind.

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

`status`, `trigger_event`, `appraisal_basis`, and `behavioral_pressure` make the emotional state replayable and validator-readable. `orientation.toward_records` feeds observer-firewall checks without adding a free-form `toward_claim` field. Orientation targets must be accessible to the holder under FOUNDATIONS §6b: a `STENT` target is lawful when the holder can directly observe the entity through active co-location, `STSEC` is lawful only for its `holders[]` or another recorded access route, `SF`/`STLOC`/`THR`/`CNSQ` are branch-public active state, and `STQ` is accessible only when `audience_visibility` is `explicit` or `implied` unless another holder-grounded access route exists. `agency_effect` is intentionally binary in v1: either the affect constrains agency or it does not.

### 4.6 Prose receipt

Stored at `pages-prose-receipts/PG-<integer>.yaml` (direct-write artifact; not an atomic `_source/` record). The canonical schema below is mirrored by the structural validator `prose_receipt_schema_compliance`, which validates receipt YAML in full-world runs and receipt-file incremental runs.

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

The `checks` mapping contains eight deterministic prose/state checks plus the optional `craft_critic` result. `hash_integrity` is `PASS` when the recorded `PG.plan.plan_hash` and `PG.state_hash` are lowercase sha256-shaped and match the recomputed plan/state hashes, `WARN` when drift is accepted because `accept_plan_drift=true`, and `FAIL` when drift is not accepted or either PG hash field is missing, placeholder, or non-sha256. `required_event_rendered` includes subordinate receipt observations for committed CLK ticks, STSEC reveals, STPLAN relation movement, STEMO affective transitions, and STQ setup/payoff transitions; the STQ subcheck reads committed `STQ.status` lifecycle changes, `payoff_of`, `answer_records[]`, and page-plan §10b render requirements, records omissions as `notes[]` entries beginning `story_question_payoff_undisclosed:`, and never mutates `PG` or any STQ record. `choice_consequence_visibility` verifies that rendered prose realizes the selected action's consequence without mutating `PG` state or re-authoring the selected event. For non-accept routes it reads `SE.resolution.player_visible_feedback`; for `accept` routes, where `SE.resolution` is absent, it reads the selected `CHC.likely_state_pressure`, `CHC.grounded_in.records[]`, page-plan §13, and committed `SE.state_delta` / `SE.state_relations[]` from plan §7.

Receipt schema drift is checked by `prose_receipt_schema_compliance` in `tools/validators`. A receipt-specific structural smoke uses the compiled validator CLI after the receipt exists, for example:

```bash
node tools/validators/dist/src/cli/world-validate.js <world_slug> --structural --file worlds/<world_slug>/stories/<story_slug>/pages-prose-receipts/PG-<integer>.yaml --json
```

A failed receipt blocks publication only if the attaching skill ran with `strict=true`. **A receipt never mutates `PG` state.**
