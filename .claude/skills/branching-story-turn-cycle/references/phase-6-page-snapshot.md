# Phase 6: Materialize Next Page Snapshot

Draft `SE-<integer>` per shared contract §4.3:

> **Authoritative record shapes via typed schema discovery.** For the full, current field shape of the `SE` and `PG` records drafted here (and the `CHC` records emitted in Phase 7) — including the per-`turn_driver.kind` `driver_records` requirements and the `outcome_route`→`resolution` conditionals — retrieve the live schema with `mcp__worldloom__get_record_schema(node_type='story_event_record' | 'page_record' | 'choice_record')` or `mcp__worldloom__describe_envelope_schema(op_kind='create_se_record' | 'create_pg_record' | 'create_chc_record')`. The skeleton below is a drafting aid, not the full conditional schema; prefer typed schema discovery over reading the schema JSON files directly.

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

`commitment` is required on every emitted event. For turn-cycle events, `selected_slt_id` names the chosen author-pool or JIT `SLT`, `selection_source` records whether the block came from the chosen `CHC`, the author pool, runtime JIT creation, system repair, or audit repair, and `alias_bindings` records the concrete record id chosen for each selected-block existential binding that must be preserved on the event. `commitment.alias_bindings` MUST contain one entry per hard existential precondition alias (`any_*`) bound to its matched active record, even when no `effects` entry references `bound:<alias>`. It also MUST contain every soft existential alias referenced by `bound:<alias>` in `effects` or `exit_options[].likely_effects`. Use `alias_bindings: {}` (empty object) only when the selected `SLT` has no hard existential predicates and no effect-referenced soft existential aliases; the field is required-as-object per shared contract §4.3, not optional or null. Do not duplicate actor or target bindings inside `commitment`; `SE.actor` and `SE.targets` remain authoritative for those bindings.

## Turn-driver `pov_visibility` for non-player drivers

When `turn_driver.kind` is non-player, set `pov_visibility` from the POV actor's access to the **driving event**, not from the privacy of the driver records:

- **`perceived_directly`** when the driver is an on-stage act the POV witnesses first-hand — e.g. an `npc_action` performed in the POV's presence. Interior driver records (`STEMO` / `BEL` / `STINT` / `THR` / `SREL`) do **not** downgrade this: they are the normal unobservable substrate of any observed action, and the `turn_driver_pov_observer_firewall` validator does not treat them as hidden. The POV's inferences about those motives are carried by `BEL` records and prose, never by leaking the NPC's private records into the page or choices.
- **`inferred_from_trace` / `reported` / `discovered_after` / `withheld`** when the POV did **not** witness the driving event — e.g. an `offstage_action`, or a driver whose `driver_records[]` include a hidden `STSEC` (status `hidden`/`unrevealed`/`concealed`) or an offstage `STPLAN`. `offstage_action` never uses `perceived_directly`. For `inferred_from_trace` / `reported`, the validator requires an active public-coverage `BEL` (visibility `public`/`shared`/`factional`/`rumored`, or holder = the POV actor) whose `basis.access_records[]` names each such driver record — supply that BEL or the validator fails with `turn_driver_missing_access_route`.

Note: this rule matches both the enforced `turn_driver_pov_observer_firewall` validator and FOUNDATIONS §Story Bundles §6b. §6b's downgrade-trigger list is a closed set — hidden `STSEC`, offstage `STPLAN`, or an unwitnessed offstage driving event — so interior `STEMO`/`BEL`/`STINT`/`THR`/`SREL` driver records of an on-stage act do not downgrade `perceived_directly`.

## Turn-driver shape for player drivers

When `turn_driver.kind` is a player source (`player_action` or `player_write_in`), the committed `SE.turn_driver` uses exactly the canonical player shape (shared schema §4.3):

```yaml
turn_driver:
  kind: player_action | player_write_in
  initiator: player
  driver_records: []
  player_response_mode: initiates
  pov_visibility: perceived_directly
```

The player's motivation grounding lives in `world_logic_rationale` prose, not in `driver_records` — `driver_records` is empty for player turns. Do **not** carry over the `initiator`/`driver_records` hint values used when building the `turn_driver` argument for `mcp__worldloom__select_storylet_candidates` (those are projection-filter hints, a different shape — see `references/phase-2-3-commitment-and-state-delta.md` Phase 2). This shape is enforced by `turn_driver_schema_compliance`, `pg_se_turn_driver_consistency`, and `turn_driver_pov_observer_firewall` (Gate 9, Turn-Driver Lawfulness).

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
- `state_hash_parent: parent.state_hash` copied exactly from the already-committed parent PG; `state_hash` is the final sha256 computed per shared contract §4.2a after `validation_trace` is finalized.
- Full `state_snapshot`: `canon_revision` copied from the current world-canon revision loaded in Pre-flight; `active_records` MUST materialize every active-record class key from shared contract §4.2 / `ACTIVE_RECORDS_CLASSES`: `STENT`, `STCHAR`, `STINT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `STSTAT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`. Use `[]` for classes with no active records on this page. `active_records_full_shape.active_records_class_key_missing` and `compatibility_drift.compat_requires_migration_patch` enforce this current-contract shape. `entity_status` is derived from active `STSTAT` records, one entry per active `STENT`; `visible_affordances` are recomputed for the new location/context (each entry's `grounded_in[]` accepts only `STLOC` and `STOBJ` ids per the shared contract's `$defs.PageAffordance.grounded_in.items.pattern` `^(STLOC|STOBJ)-[0-9]+$`; STENT actors go in `available_to`; STEMO / STPLAN / CLK / STSEC / STQ are interior or temporal state and belong in CHC grounding, not in `visible_affordances.grounded_in`); `unresolved_mystery_claims` updated; `continuation` (`has_eligible_commitment_block`, `terminal_status`, `terminal_rationale`).
- Omit `plan.plan_hash` and `prose_plan_path` for new planless `PG` records. Existing legacy `PG`s may carry those fields, but turn-cycle no longer creates them.
- `validation_trace`: populated by Phase 9.

### Derive `active_records` with `compute-pg-snapshot` (do not hand-compute)

`active_records` is a **deterministic** projection of `parent.active_records + SE.state_delta` — `create` added, `supersede ∪ close` dropped, **and** the non-obvious inactive-status exclusion (a supersession-create whose lifecycle status is inactive — `CLK status: resolved`, `STQ status: answered`, `STEMO status: settled`, `STSEC` no longer hidden, `STPLAN` no longer active — is created but omitted from `active_records`). Do not compute this by hand: it is the most error-prone field in the turn and a wrong include/exclude is only caught at dry-run by `snapshot_replay_equality`, forcing an edit → recompute-hash → re-validate loop.

Instead, derive it by tool — the authoring analogue of the `compute-pg-hashes` step Phase 9 prescribes for `state_hash`:

```bash
node tools/world-mcp/dist/src/cli/compute-pg-snapshot.js <envelope.json>
```

Assemble the patch envelope JSON first (the same envelope Phase 9 uses for the hash; it must carry the single `create_pg_record` patch plus the `create_se_record` patch and every record-create patch this turn). The CLI reads the parent page's `active_records` from disk, applies `SE.state_delta` through the single canonical `replayActiveRecords` helper the validator gates on, and prints the computed `active_records` map. Paste that map onto the `PG` record. Because the CLI and `snapshot_replay_equality` call the same helper, the inactive-status exclusion is handled for you and the drafted snapshot cannot disagree with the gate.

The snapshot is the future fork point — complete enough to be a valid parent for any subsequent turn-cycle invocation regardless of whether its prose is ever rendered (per FOUNDATIONS §Story Bundles §4a).
