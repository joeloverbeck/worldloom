# Phase 6: Materialize Next Page Snapshot

Draft `SE-<integer>` per shared contract §4.3:

```yaml
id: SE-<integer>
event_kind: selected_choice | write_in_attempt | system_repair | audit_repair
actor: STENT-<integer> | system | unknown
targets: [<record id>]
commitment:
  selected_slt_id: SLT-<integer>
  selection_source: emitted_choice | author_pool | runtime_jit | system_repair | audit_repair
  alias_bindings:
    <alias>: <record id>
outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal
resolution:
  result: success | partial_success | failure | impossible | transformed | held_for_promotion
  player_visible_feedback: <one-sentence player-legible consequence feedback>
world_logic_rationale: <why this route follows from current state + world canon>
state_delta:
  create: [<every record id created this turn>]
  supersede: [<every record id that received a supersession>]
  close: [<every record id closed this turn>]
promotion_claims:
  - source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>
    authority: apparent | branch_local_counterfactual | canon_candidate
```

`resolution` follows the shared contract §4.3 route table: required for `attempt` / `accommodate` / `world_block`, absent for `accept`, and optional for `promotion_hold` / `terminal` when an explicit held-or-terminal result must be visible.

`commitment` is required on every emitted event. For turn-cycle events, `selected_slt_id` names the chosen author-pool or JIT `SLT`, `selection_source` records whether the block came from the chosen `CHC`, the author pool, runtime JIT creation, system repair, or audit repair, and `alias_bindings` records the concrete record id chosen for every `bound:<alias>` used by the selected block. Use `alias_bindings: {}` (empty object) when the selected `SLT` declares no `bound:<alias>` references in its `effects` — the field is required-as-object per shared contract §4.3, not optional or null. Do not duplicate actor or target bindings inside `commitment`; `SE.actor` and `SE.targets` remain authoritative for those bindings.

## Selection Rationale

When `selected_slt_id` was chosen over one or more eligible competing blocks of equal-or-higher local salience, `SE.world_logic_rationale` MUST include a selection-rationale clause naming the selected block, at least one outranked competing block, and the reason the selected block won. Example: `selected SLT-12 over SLT-7 because SLT-7's obligation_open(OBL-3) predicate failed in the current visibility state.` When selection is uncontested because only one block was eligible, no selection-rationale clause is required.

Prose-only by current design; if audit-time prose matching proves too fuzzy after first production stories, the rationale gets promoted to a structured `SE.commitment.selection_rationale` field in a follow-up spec.

## Motivation Grounding

For every non-system character action, `SE.world_logic_rationale` MUST cite at least one active motivation or affordance source that belongs to, involves, or is immediately available to the acting `STENT`:

- an `STINT-<integer>` held by the actor;
- a `BEL-<integer>` held by the actor with relevant content;
- an `STPLAN-<integer>` held by the actor whose current step, blocker, fallback, or basis explains the action;
- a `STEMO-<integer>` held by the actor whose affect kind, intensity, appraisal, or behavioral pressure explains the action;
- an `OBL-<integer>`, `CNSQ-<integer>`, or `THR-<integer>` involving the actor;
- an `SREL-<integer>` whose structured `direction.from` or `direction.to` includes the actor, or whose `participants[]` includes the actor for bidirectional/mutual relationships;
- an immediate physical affordance available to the actor at the page location.

Citation form is prose inside `world_logic_rationale`, for example: `STENT-1 acts on STINT-3 because ...`, `BEL-4 lets STENT-1 infer ...`, or `SREL-2.direction.from includes STENT-1, so ...`. System events (`story_start`, `system_repair`, `audit_repair`, `prose_attach`, `promotion_closeout`) are exempt. If no textual grounding source is cited for a non-system character action, `branching-story-health-audit` reports `motivation_ungrounded` as a WARNING audit signal, not a commit-blocking validator error.

## Draft the new PG

Draft `PG-<integer>` per shared contract §4.2:

- `parent_page_id: <parent>`, `branch_id: <active or new>`, `turn_index: parent.turn_index + 1`.
- `input.choice_id` OR `input.manual_action_text` (exactly one non-null), `input.resolved_event_id: SE-<integer>`.
- `state_hash_parent: parent.state_hash` copied exactly from the already-committed parent PG; `state_hash` is the final sha256 computed per shared contract §4.2a after `plan.plan_hash` and `validation_trace` are finalized.
- Full `state_snapshot`: `canon_revision` copied from the current world-canon revision loaded in Pre-flight; `active_records` (per-class lists including `BEL` and `STSTAT` keys); `entity_status` derived from active `STSTAT` records, one entry per active `STENT`; `visible_affordances` recomputed for the new location/context; `unresolved_mystery_claims` updated; `continuation` (`has_eligible_commitment_block`, `terminal_status`, `terminal_rationale`).
- `plan.plan_hash: <final sha256 computed per shared contract §4.2a after the page plan bytes are finalized>`.
- `prose_plan_path: pages-prose-plans/PG-<integer>.md` (canonical top-level plan address; see `mcp__worldloom__describe_envelope_schema(op_kind='create_pg_record')` for the current machine-readable op shape).
- `validation_trace`: populated by Phase 9.

The snapshot is the future fork point — complete enough to be a valid parent for any subsequent turn-cycle invocation regardless of whether its prose is ever rendered (per FOUNDATIONS §Story Bundles §4a).
