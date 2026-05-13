# Shared Story State Contract — v1

## Purpose

This contract is shared by bootstrap, turn-cycle, commitment-block authoring, health audit, prose attach, and story-canon promotion. It is the only place that defines page lifecycle, branch snapshots, event deltas, branch isolation, and minimal validation gates.

## Authority model

There are three layers:

1. **World canon** — authoritative world-level truth. Story skills may read it but never mutate it.
2. **Story state** — authoritative branch-local narrative state inside a story bundle. This is written through story-bundle `_source` records.
3. **Rendered prose** — authorial surface text. It can reveal, dramatize, omit, or stylize story state, but it does not create story state by itself.

A page plan is an engine artifact. A prose page is a rendering artifact. A prose receipt is an audit artifact.

## Record classes

Keep the current story classes:

- `STENT` — story-local entity mirror or story-local entity.
- `STINT` — intention.
- `SF` — branch/story-local fact.
- `SE` — event.
- `OBL` — obligation.
- `CNSQ` — consequence.
- `THR` — thread.
- `SREL` — relationship.
- `STLOC` — location.
- `STOBJ` — object.
- `DA` — story-local diegetic artifact.
- `BR` — branch.
- `PG` — page / causal tick snapshot.
- `CHC` — emitted choice.
- `SLT` — storylet id class, now also used by `shape: commitment_block` records.

Add one story-local class:

- `BEL` — belief, knowledge, suspicion, public claim, lie, witness memory, or misconception.

`BEL` is the missing coherence primitive. It lets the system model consequences from deception, secrecy, discovery, public acts, mistaken blame, concealed deaths, and relationship fallout without inventing plot rails.

## `BEL` record shape

```yaml
id: BEL-NNNN
story_id: STORY-NNNN
created_at_page: PG-NNNN
supersedes: BEL-NNNN | null
holder: STENT-NNNN | group:<name> | public | narrator
claim: >
  Natural-language statement of what the holder believes, knows, suspects, denies, or is deceived about.
truth_relation: true | false | partly_true | unknown | contested | branch_counterfactual
basis:
  source_event: SE-NNNN
  witnessed_page: PG-NNNN | null
  told_by: STENT-NNNN | null
  inferred_from: [SF-NNNN, BEL-NNNN]
confidence: certain | likely | suspected | rumor | performative_lie
visibility: private | shared | public | concealed | suppressed
consequences:
  opens: [OBL-NNNN, THR-NNNN, CNSQ-NNNN]
  constrains_choices: [CHC-NNNN]
notes: >
  Why this belief matters structurally.
```

## Page record shape

A `PG` record is a materialized state snapshot after exactly one committed causal tick.

```yaml
id: PG-NNNN
story_id: STORY-NNNN
branch_id: BR-NNNN
parent_page_id: PG-NNNN | null
turn_index: 0
input:
  kind: story_start | choice | write_in | system_repair
  choice_id: CHC-NNNN | null
  manual_action_text: null | string
  resolved_event_id: SE-NNNN
state_hash_parent: null | sha256
state_hash: sha256
canon_revision_at_plan_time: string
state_snapshot:
  active_records:
    STENT: [STENT-NNNN]
    STINT: [STINT-NNNN]
    SF: [SF-NNNN]
    BEL: [BEL-NNNN]
    OBL: [OBL-NNNN]
    CNSQ: [CNSQ-NNNN]
    THR: [THR-NNNN]
    SREL: [SREL-NNNN]
    STLOC: [STLOC-NNNN]
    STOBJ: [STOBJ-NNNN]
    DA: [DA-NNNN]
  entity_status:
    STENT-NNNN:
      life: alive | dead | incapacitated | missing | unknown
      agency: free | constrained | captive | unconscious | dead
      location: STLOC-NNNN | unknown
  visible_affordances:
    - id: AFF-PG-NNNN-01
      label: "door to the alley"
      grounded_in: [STLOC-NNNN, STOBJ-NNNN]
      available_to: [STENT-NNNN]
      action_families: [escape, hide, pursue]
  unresolved_mystery_claims:
    - mystery_id: M-NNNN
      authority: apparent | branch_local_counterfactual | canon_candidate
      status: preserved | advanced | held_for_promotion
  open_debt:
    obligations: [OBL-NNNN]
    consequences: [CNSQ-NNNN]
    threads: [THR-NNNN]
  continuation:
    has_eligible_commitment_block: true
    terminal_status: open | branch_pause | terminal_closed
    terminal_rationale: null | string
state_delta_summary:
  creates: [SE-NNNN, BEL-NNNN]
  supersedes: [SREL-NNNN]
  closes: [OBL-NNNN]
plan:
  path: pages-prose-plans/PG-NNNN.md
  plan_hash: sha256
rendered_prose:
  path: pages-prose/PG-NNNN.md | null
  receipt_path: pages-prose-receipts/PG-NNNN.yaml | null
emitted_choices: [CHC-NNNN]
validation_trace:
  input_legality: PASS
  branch_isolation: PASS
  append_only_delta: PASS
  mystery_firewall: PASS
  invariant_check: PASS
  continuation_or_terminal: PASS
  plan_grounding: PASS
  canon_promotion_hold: PASS | NOT_APPLICABLE
```

`rendered_prose.path` is informational and may be null. It is not a lifecycle status. If the file exists, the index can show it. If a receipt exists, the index can show validation status.

## Event delta shape

Every state transition has one `SE` event. The event describes what happened and how the engine interpreted the user's action.

```yaml
id: SE-NNNN
story_id: STORY-NNNN
created_at_page: PG-NNNN
parent_page_id: PG-NNNN | null
event_kind: story_start | selected_choice | write_in_attempt | world_block | repair | prose_attach | promotion_closeout
actor: STENT-NNNN | system | unknown
targets: [STENT-NNNN, STLOC-NNNN, STOBJ-NNNN]
input_surface:
  choice_id: CHC-NNNN | null
  manual_action_text: null | string
outcome_route: accept | accommodate | attempt | world_block | terminal | promotion_hold
world_logic_rationale: >
  Why this route follows from current state and world canon.
state_delta:
  create: [record ids]
  supersede: [record ids]
  close: [record ids]
  no_change: [record ids]
promotion_claims:
  - source_record: SF-NNNN | BEL-NNNN | DA-NNNN | null
    authority: apparent | branch_local_counterfactual | canon_candidate
    required_action: none | run_story_fact_promotion_to_canon
```

## Commitment block shape

New `SLT` records should use:

```yaml
id: SLT-NNNN
record_version: 3
shape: commitment_block
story_id: STORY-NNNN
scope:
  visibility: author_pool | branch_scoped
  branch_id: BR-NNNN | null
created_at_page: null | PG-NNNN
title: string
purpose: aftermath | escalation | reveal | refusal | negotiation | flight | investigation | intimacy | conflict | repair | closure | transition
preconditions:
  hard: []
  soft: []
required_context:
  cast: []
  locations: []
  objects: []
  beliefs: []
beats:
  - beat_id: B1
    function: setup | pressure | turn | consequence | exit
    instruction: >
      Prose-facing beat instruction, no engine jargon.
effects:
  create: []
  supersede: []
  close: []
  belief_updates: []
  relationship_updates: []
  consequence_updates: []
exit_options:
  - intent: flee | confront | confess | hide | ask | attack | spare | bargain | wait | custom
    surface_hint: string
    likely_effects: []
saliency:
  tags: []
  urgency: low | medium | high
  cooldown_pages: 0
mystery_policy:
  forbidden_resolutions: [M-NNNN]
  allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none
provenance:
  origin: bootstrap_seed | author_batch | audit_repair | runtime_jit
```

Remove as required fields: `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, separate `stop_policy`, and `ARC_TRACE` expectations. Their useful content is covered by `beats`, `effects`, `exit_options`, and `saliency`.

## Branching and rewind

To fork from any page:

1. Load that page's `state_snapshot`.
2. Create a new `BR` record or supersede a branch record to add a child branch path.
3. Apply the selected choice or write-in from the page snapshot.
4. Create the new `SE`, changed records, next `PG`, and `CHC` records.

No sibling branch prose may be read for state assembly. Cross-branch comparison belongs only in audit.

## Page plan minimum contract

Each page plan must be self-contained enough for an external prose renderer. It contains:

- story kernel excerpt,
- relevant world canon excerpt,
- active cast and entity statuses,
- current location and affordances,
- selected event and state delta,
- required beats from the commitment block,
- relationship and belief context,
- open obligations/consequences/threads that must be honored,
- forbidden mystery resolutions,
- stopping point,
- next choices to foreshadow or make available if appropriate,
- prose craft reminders without word-count targets.

## Prose receipt shape

Prose receipts are direct-write artifacts, not authoritative state records.

Path: `pages-prose-receipts/PG-NNNN.yaml`

```yaml
page_id: PG-NNNN
story_id: STORY-NNNN
plan_path: pages-prose-plans/PG-NNNN.md
prose_path: pages-prose/PG-NNNN.md
plan_hash: sha256
prose_hash: sha256
state_hash_at_plan_time: sha256
checked_at: iso8601
verdict: PASS | WARN | FAIL
checks:
  engine_jargon_leak: PASS | WARN | FAIL
  forbidden_mystery_resolution: PASS | FAIL
  required_event_rendered: PASS | WARN | FAIL
  invented_structural_fact: PASS | WARN | FAIL
  craft_note: PASS | WARN | FAIL | NOT_RUN
notes: []
```

A failed receipt blocks publication if the caller chooses `strict=true`. It does not mutate page state.

## Shared hard gates

State-changing skills must pass:

1. **Input legality** — exactly one source action, valid parent page, valid story bundle.
2. **Snapshot compatibility** — parent hash matches the loaded parent snapshot.
3. **Mystery/invariant firewall** — no forbidden mystery resolution; no invariant violation.
4. **Branch isolation** — no sibling-branch state or branch-local author-pool leakage.
5. **Append-only delta** — all changes are creates/supersessions/closes, never in-place structural mutation.
6. **Consequence capacity** — the next page has at least one eligible continuation block, unless terminal proof is explicit.
7. **Plan grounding** — every declared affordance and required beat is grounded in records or canon.
8. **Canon promotion hold** — world-level truth assertions are held for promotion.

## Shared write order

1. Build patch plan for story `_source` records.
2. Dry-run validate.
3. Obtain approval token when required by execution mode.
4. Submit patch plan.
5. Write direct markdown artifacts: page plan, story kernel, receipts, reports, manifests.
6. Update bundle index last.
7. Update per-world story index last only when story visibility changed.

The individual skills do not repeat patch-token mechanics; they reference this contract.
