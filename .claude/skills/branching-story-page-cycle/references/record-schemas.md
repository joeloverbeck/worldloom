# Record Schemas

This skill's outputs are story-bundle records. None are Canon Fact Records or Change Log Entries (canon-reading skill — N/A on those two; the world-canon promotion route hands off to `story-fact-promotion-to-canon`).

## Page Record (PG-NNNN)

```yaml
id: PG-0042
story_id: STORY-001
branch_id: BR-0007                                    # the branch this page belongs to
parent_page_id: PG-0017
branch_path: [PG-0001, PG-0005, PG-0017, PG-0042]
chosen_choice_id: CHC-0098                            # null at root only
write_in_used: false                                  # true if Path B was the route
write_in_routing: null | accept | accept_but_transform | treat_as_attempt | refuse_only_through_world_logic
storylet_realized: SLT-0019
applied_event_ops: [SE-0042]                          # event records own the structured ops
state_hash: <hash>
parent_state_hash: <hash>
branch_terminal: false                                # true if this page is terminal (Phase 3 §Terminal Feasibility)
terminal_reason: null | resolved | tragic_end | dead_end_acknowledged | player_choice | invariant_block
state_snapshot:
  canon_revision: CH-NNNN | null                      # which world canon CH was visible at this tick (audit trail)
  objective_facts: [SF-NNNN, ...]
  apparent_facts: [SF-NNNN, ...]
  disputed_facts: [SF-NNNN, ...]
  reader_known_facts: [SF-NNNN, ...]                  # SFs with visible_to_reader: true
  belief_state_by_actor:
    STENT-NNNN: [SF-NNNN, ...]
  rumor_state: [SF-NNNN, ...]
  obligations_open: [OBL-NNNN, ...]
  obligations_paid_off: [OBL-NNNN, ...]
  obligations_complicated: [OBL-NNNN, ...]
  obligations_abandoned: [OBL-NNNN, ...]
  consequences_pending: [CNSQ-NNNN, ...]
  consequences_addressed: [CNSQ-NNNN, ...]
  threads_active: [THR-NNNN, ...]
  relationships_current: [SREL-NNNN, ...]
  intentions_current: [STINT-NNNN, ...]
  cast_present: [STENT-NNNN, ...]
  current_location: STLOC-NNNN
  accessible_locations: [STLOC-NNNN, ...]
  objects_in_scope: [STOBJ-NNNN, ...]
  inventory_by_entity:
    STENT-NNNN: [STOBJ-NNNN, ...]
  entity_status:
    STENT-NNNN:
      alive: true
      conscious: true
      present: true
      mobile: true
      restrained: false
prose_path: pages-prose/PG-0042.md
emitted_choices: [CHC-NNNN, ...]
narrative_health: {...}                              # see Phase 6
governor_nudge_applied: <description>
storylet_selection_audit_trail:                      # Phase 4 weighted-pick discipline persistence
  top_k_considered: [SLT-NNNN, SLT-NNNN, ...]        # K = 5 by Phase 4 default; storylets that passed hard filters and ranked top-K
  scores: {SLT-NNNN: 0.85, SLT-NNNN: 0.45, ...}      # post-governor-nudge salience scores per the Phase 4 scoring formula
  governor_nudge_bias: <one-line summary of which scoring dimensions the prior turn's governor_nudge boosted>
  jit_expansion_fired: false                          # true if the JIT generator was delegated; top_k_considered then includes the JIT-trigger condition
  weighted_pick_seed: <optional engine-internal seed for replay reproducibility>
content_intensity: tame | mature | explicit
validation_trace:                                    # Phase 9 gates 1-12 with one-line PASS rationales
  mystery_firewall: PASS — <rationale>
  invariant_compatibility: PASS — <rationale>
  recursive_reference_closure: PASS — <rationale>
  snapshot_replay_equality: PASS — <rationale>
  id_uniqueness: PASS — <rationale>
  content_policy_presence: PASS — <rationale>
  prose_ledger_consistency: PASS — <rationale>
  choice_contract_integrity: PASS — <rationale>
  choice_consequence_capacity: PASS — <rationale>
  state_snapshot_integrity: PASS — <rationale>
  epistemic_class_declared: PASS — <rationale>
  consequence_persistence: PASS — <rationale>
created_at: <iso8601>
```

Page records do not carry `created_at_page`. The page record's own PG id is its branch anchor, and recursive reference closure authorizes PG references by checking that the referenced PG id appears in `branch_path`.

## Story Event Record (SE-NNNN)

The skill's replay-equality contract is `parent.snapshot + applied_event_ops == this_page.snapshot`. For replay to be computable and auditable, applied_event_ops must be **structured**, not opaque payloads. The page record cites the event by ID; the event owns the structured ops.

```yaml
id: SE-0042
story_id: STORY-001
branch_id: BR-0007
created_at_page: PG-0042

source:
  parent_page_id: PG-0017
  chosen_choice_id: CHC-0098 | null
  write_in_text_hash: <hash> | null
  storylet_realized: SLT-0019

actor: STENT-NNNN | system | environment
action: <canonical verb>
target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract | null
instrument: STENT-NNNN | STOBJ-NNNN | SF-NNNN | null

preconditions_checked:
  - predicate: <engine-checkable predicate per templates/predicate-dsl.md in `.claude/skills/storylet-pool-authoring/`>
    result: pass | fail
    evidence: <record-id>

ops:
  - op_id: OP-0001
    op_type: fact_create | fact_invalidate |
             obligation_open | obligation_pay_off | obligation_complicate | obligation_supersede | obligation_transfer |
             consequence_open | consequence_address |
             thread_supersede |
             relationship_supersede |
             intention_refresh |
             cast_change |
             location_change |
             inventory_change |
             canon_sync
    input_records: [SF-NNNN, OBL-NNNN, ...]
    output_records: [SF-NNNN, OBL-NNNN, ...]
    deterministic_payload: {...}                       # structured fields per op_type; no free-form prose

state_hash_before: <hash>
state_hash_after: <hash>

notes: >
  ...
```

The `op_type` enum is closed; LLM proposers may not invent new op types. The `deterministic_payload` is structured per op type (e.g., `fact_create.deterministic_payload` carries the new SF's epistemic_class, subject, predicate, object, certainty, known_by; `consequence_open.deterministic_payload` carries CNSQ kind, subjects, scope, urgency, salience). This is what makes replay equality computable and audit-checkable.

## Choice Record (CHC-NNNN)

Schema reproduced in `references/phase-8-choice-generation.md` §Step 5; carries the `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change). The contract is enforced at the next turn's Phase 1 (REFUSE/TRANSFORM/ATTEMPT/ACCEPT routing) and Phase 7 (post-render fail-fast checks).

## Other story-bundle records

The remaining classes (SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, DA-story-local, BR) are emitted by this skill but their schemas are owned by `branching-story-bootstrap/templates/story-records.yaml` — the bootstrap skill is the schema authority for shared classes; this skill is the runtime authority for PG/SE/CHC. Per-turn emission rules:

- **SF-NNNN** — append-only; supersession on certainty change; declares `epistemic_class`, `truth_value`, `certainty`, `known_by`, `subject/predicate/object`, `derived_from_cf | canon_relation`, `created_at_page`.
- **OBL-NNNN** — append-only; supersession on status change (open → paid_off / complicated / transferred / abandoned_with_acknowledgment); declares `salience`, `urgency`, ≥2 `possible_payoff_modes`.
- **CNSQ-NNNN** — append-only; supersession on `consequence_address` op; carries `kind`, `subjects`, `scope`, `urgency`, `salience`, `created_at_page`, branch-scoped visibility.
- **THR-NNNN** — append-only; supersession on `status` or `current_pressure` change.
- **SREL-NNNN** — append-only; supersession on `axes` / `public_status` / `private_status_by_actor` change.
- **STINT-NNNN** — append-only; supersession on intention refresh; `stent_id` points to the story entity this snapshot drives, with `world_character_id` as the optional world CHAR anchor; per-page logical chain via `logical_id` / `supersedes`. The patch engine's `create_stint_record` op enforces strict `^STINT-\d{4}$` (the bare-numeric form). Pre-SPEC-13 records on disk using the legacy `STINT-NNNN-<char>` form remain on disk as immutable history. The MCP retrieval surface (`get_record`, `list_records`, `get_records`) enforces the strict `^STINT-\d{4}$` pattern and rejects legacy ids with `invalid_input` — fall back to direct file Read at `_source/intentions/STINT-NNNN-<char>.yaml` for state-snapshot-cited legacy records. The world.db indexer logs `schema_pattern_mismatch` warnings on every patch-plan submit while legacy files remain — these are informational (pre-existing files, not the current write); the warning surface in the engine output is expected and not a blocker. The `mcp__worldloom__allocate_next_id(id_class='STINT')` allocator likewise counts only conforming bare-numeric ids; legacy suffixed ids do not shift the counter, so the next allocated STINT id is the next-after-the-highest-bare-numeric-on-disk regardless of legacy ids present. New supersession chains link bare-numeric IDs to legacy IDs via `logical_id`; once every legacy id has been superseded by a bare-numeric one, the warnings cease.
- **SLT-NNNN (JIT only)** — branch-scoped (`visibility.scope: branch_scoped`); carries `provenance.origin: runtime_jit` and `created_at_page: this_PG`; produced by `storylet-pool-authoring` `mode=jit` and written by this skill in Phase 11.
- **STLOC-NNNN / STOBJ-NNNN** — append-only; introduced when a new story-local location/object enters scope.
- **DA-NNNN (story-local)** — created when a diegetic artifact is authored in-story this turn; carries `story_id` (distinct from world-level DA).
- **BR-NNNN** — new on fork; superseder of `current_leaf_page_id` (and `status` if terminal) on continuation.

No Canon Fact Record template; no Change Log Entry template — both N/A in the FOUNDATIONS Alignment table.
