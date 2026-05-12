# Record Schemas

This skill's outputs are story-bundle records. None are Canon Fact Records or Change Log Entries (canon-reading skill — N/A on those two; the world-canon promotion route hands off to `story-fact-promotion-to-canon`).

## Page Record (PG-NNNN)

```yaml
id: PG-0042
story_id: STORY-0001
branch_id: BR-0007                                    # the branch this page belongs to
parent_page_id: PG-0017
branch_path: [PG-0001, PG-0005, PG-0017, PG-0042]
chosen_choice_id: CHC-0098                            # null at root only
write_in_used: false                                  # true if Path B was the route
write_in_routing: null | accept | accept_but_transform | treat_as_attempt | refuse_only_through_world_logic
storylet_realized: SLT-0019                          # null only at PG-0001 root special case (bootstrap genesis); non-null on every non-root page
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
  # reader_known_facts entries carry a positive reader_visibility_basis: shown_in_pg0001, known_to_pov, dramatic_irony, or diegetic_artifact_visible.
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
  applied_effect_variant: <variant id> | null         # Phase 4b chosen arc.effect_model variant; null only at PG-0001 root
  narrative_point_classification: CONTINUE_ARC | NATURAL_COMMITMENT_HINGE | INTERRUPT_HINGE | CONTINUE_ONLY_PAUSE | TERMINAL_OR_CHAPTER_CLOSE
  arc_trace_id: ARCTRACE-NNNN | null                  # populated only when Phase 7.6 emits an ARC_TRACE
  arc_trace_emitted: true | false                     # false when low-budget interactive_runtime omits derived ARC_TRACE persistence
prose_plan_path: pages-prose-plans/PG-0042.md       # always set at plan-commit; the comprehensive plan written by Phase 7
prose_path: pages-prose/PG-0042.md | null            # null at plan-commit; finalize sets to pages-prose/PG-NNNN.md
prose_status: pending | rendered | superseded        # pending at plan-commit; finalize Phase 7 flips to rendered
deferred_validation_trace:                           # DEFERRED at plan-commit; finalize Phase 5 flips each to PASS/FAIL
  prose_ledger_consistency: "DEFERRED — awaiting prose render"
  arc_trace_evidence_alignment: "DEFERRED — awaiting prose render"
  prose_critic_8_axis: "DEFERRED — awaiting prose render"
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
validation_trace:                                    # Phase 9 gates 1-19 with one-line PASS rationales
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
  arc_envelope_conformance: PASS — <rationale>
  effect_model_replay_safety: PASS — <rationale>
  arc_trace_evidence_alignment: PASS — <rationale>
  narrative_point_classification: PASS — <rationale>
  choice_worthiness_completeness: PASS — <rationale>
  plan_completeness_check: PASS — <rationale>
  cast_material_reality_consistency: PASS — <rationale>
created_at: <iso8601>
```

Page records do not carry `created_at_page`. The page record's own PG id is its branch anchor, and recursive reference closure authorizes PG references by checking that the referenced PG id appears in `branch_path`.

`state_snapshot.applied_effect_variant` records the selected `arc.effect_model.variants[].id` chosen by Phase 4b and consumed by Phase 5 replay. It is required for non-root pages that realize an arc; PG-0001 uses `null` because the bootstrap root page is a scene-setter and no arc has closed yet.

`state_snapshot.narrative_point_classification` records the Phase 8 narrative point for the page. The closed enum is `CONTINUE_ARC`, `NATURAL_COMMITMENT_HINGE`, `INTERRUPT_HINGE`, `CONTINUE_ONLY_PAUSE`, and `TERMINAL_OR_CHAPTER_CLOSE`; validators compare menu-emitting classifications against ARC_TRACE stop-condition categories when a trace is present.

`state_snapshot.arc_trace_id` points to the derived `ARCTRACE-NNNN` record emitted for this page. It is `null` when `arc_trace_emitted: false` or at PG-0001's no-arc root.

`state_snapshot.arc_trace_emitted` records whether an ARC_TRACE has been persisted for this page. Page-cycle always sets `arc_trace_emitted: false` at plan-commit because Layer 2 / Layer 3 ARC_TRACE extraction requires rendered prose and DEFERS to `branching-story-page-prose-finalize` Phase 4. Finalize Phase 7 emits the `create_arc_trace_record` op (when `PG.storylet_realized != null`) and updates this field to `true` along with `state_snapshot.arc_trace_id: ARCTRACE-NNNN` via `update_record_field` ops.

`prose_plan_path` is set at plan-commit to `pages-prose-plans/PG-NNNN.md` and is the path to the comprehensive plan authored by Phase 7. The external prose renderer reads this file verbatim as its prompt.

`prose_path` is `null` at plan-commit. After the user supplies the rendered prose at `pages-prose/PG-NNNN.md` and runs `branching-story-page-prose-finalize`, finalize Phase 7 sets `prose_path: pages-prose/PG-NNNN.md` via `update_record_field`.

`prose_status` carries the transitional state of the prose:
- `pending` at plan-commit — plan exists, rendered prose does not.
- `rendered` after finalize Phase 7 runs successfully.
- `superseded` reserved for a future revision flow (not used by page-cycle or finalize directly).

`deferred_validation_trace` carries the three keys whose verdicts cannot be computed at plan-commit because they require rendered prose:
- `prose_ledger_consistency` — DEFERRED at plan-commit; finalize Phase 5 runs the deterministic prose-claim-vs-state comparison and flips to PASS/FAIL.
- `arc_trace_evidence_alignment` — DEFERRED at plan-commit; finalize Phase 5 validates the Phase-4-extracted ARCTRACE's `evidence_span` byte offsets and flips to PASS/FAIL.
- `prose_critic_8_axis` — DEFERRED at plan-commit; finalize Phase 3 runs the 8-axis prose critic and flips to PASS/SOFT_FAIL/HARD_FAIL.

## Story Event Record (SE-NNNN)

The skill's replay-equality contract is `parent.snapshot + applied_event_ops == this_page.snapshot`. For replay to be computable and auditable, applied_event_ops must be **structured**, not opaque payloads. The page record cites the event by ID; the event owns the structured ops.

```yaml
id: SE-0042
story_id: STORY-0001
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

Schema reproduced in `references/phase-8-choice-generation.md` §Step 5; carries the `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change) and the `continuation_capacity` block (`post_choice_delta`, `valid_seed_storylets`, `jit_shape_spec`, `validation_basis`). The choice contract is enforced at the next turn's Phase 1 (REFUSE/TRANSFORM/ATTEMPT/ACCEPT routing) and Phase 7 (post-render fail-fast checks). The continuation-capacity block is enforced at this turn's Phase 8 / Phase 9 gate 9 so persisted runtime CHCs carry the same post-choice seed/JIT viability evidence as bootstrap CHCs.

### CHC fields (record_version: 2)

SPEC-19 defines the CHC schema for the scene-commitment-arc contract. The scene-commitment fields (`choice_kind`, `commitment_family`, closed base `commitment_class`, optional `commitment_detail`, `strategy_cluster`, `choice_worthiness`) sit alongside the load-bearing `choice_contract`, `likely_effects`, and `continuation_capacity` blocks.

```yaml
record_version: 2
choice_kind: scene_commitment | tactical_beat   # scene_commitment is the standard;
                                                # tactical_beat is reserved for narrow cases
commitment_family: <commitment_family enum>     # required when choice_kind == scene_commitment; closed family enum — fetch values via mcp__worldloom__get_canonical_vocabulary(class='commitment_family'); the COMMITMENT_CLASS_TO_FAMILY mapping at tools/world-index/src/public/canonical-vocabularies.ts:229 enforces the commitment_class → commitment_family relation
commitment_class: <commitment_class enum>       # required when choice_kind == scene_commitment
commitment_detail: <string>                     # optional story-specific precision label; OMIT entirely when not used (do NOT serialize as null — the schema rejects null and requires non-empty string when the field is present); never a deterministic join key
strategy_cluster: <kebab-case open-vocab tag>   # required when choice_kind == scene_commitment
choice_worthiness:
  strategic_question_answered: >                # one-line scene question
  strong_axes:                                  # >=1 entry from the strong_axis enum
    - relationship_trajectory | obligation_state | information_posture |
      risk_cost_exposure | route_or_scene_type | thread_pressure |
      irreversibility | character_intention
  expected_state_delta:                         # per-axis projection; non-empty
    relationship: { possible: [...], magnitude: small | medium | large } | null
    obligation:   { possible: [...], magnitude: small | medium | large } | null
    thread:       { possible: [...], magnitude: small | medium | large } | null
    information:  { possible: [...] } | null
    risk:         { possible: [...] } | null
    route:        { possible: [...] } | null
    irreversibility: true | false | null
    intention:    { possible: [...] } | null
  why_not_microbeat: >                          # why this is not merely a gesture
  foreseeable_difference: >                     # what sibling choices will foreseeably change

# Load-bearing blocks:
choice_contract: {...}
likely_effects: [...]                           # MANDATORY non-empty when choice_kind == scene_commitment
continuation_capacity: {...}
```

Every `choice_kind: scene_commitment` CHC must carry a populated `choice_worthiness` block and a non-empty `likely_effects` array. SPEC-22's `choice_worthiness_completeness` validator HARD-REJECTs empty or missing fields. This closes the SPEC-19 empirical gap that motivated the schema (40/40 pre-cutover CHC records in the discarded red-bunny test bundle had `likely_effects: []` at reassessment on 2026-05-07).

`scene_commitment` is the default for LLM proposers. `tactical_beat` is reserved for structurally narrow cases such as a terminal-branch acknowledgment. Per SPEC-20 Phase 8, a menu's CHCs must collectively differ on at least two strong axes; this section documents only the per-CHC contract.

## Field Naming Disambiguations

### `success_policy` — two distinct enums

Two records carry a field named `success_policy` with non-overlapping enum values:

- **`CHC.choice_contract.success_policy`** (transaction-level — choice scope): enum `{guaranteed, attempted, uncertain, opposed}`. Captures whether the player's intent in choosing this option is mechanically guaranteed to land, attempted with possible failure, uncertain, or opposed by the world.
- **`SLT.arc_contract.success_policy`** (commitment-level — arc scope): enum `{uncontested, contested, costly, uncertain}` (per `storylet-pool-authoring/templates/storylet-record.yaml`). Captures the contract under which the storylet's commitment is offered — uncontested guarantee, contested with opposition, costly even on success, or uncertain outcome.

The shared value `uncertain` is intentional and means different things at the two scopes: at choice scope, "the transaction may not resolve as proposed"; at arc scope, "the commitment's outcome at the arc level cannot be guaranteed". An operator authoring CHC records MUST use the four-value transaction-level enum; an operator authoring SLT records MUST use the four-value commitment-level enum. Cross-emission (e.g., emitting `attempted` as an SLT `arc_contract.success_policy` value, or `costly` as a CHC `choice_contract.success_policy` value) is invalid record content; the validators' `record_schema_compliance` check catches this at submit time.

Inline cross-disambiguation comments at `branching-story-bootstrap/templates/story-records.yaml` (CHC schema) and `storylet-pool-authoring/templates/storylet-record.yaml` (SLT schema) carry the same warning at the schema-template authoring surface; the parallel authoring-side note lives in `storylet-pool-authoring/references/governance-and-foundations.md` §Field Naming Disambiguation.

## ARC_TRACE Record (story-bundle-scoped)

ARC_TRACE is a derived post-render trace extracted by SPEC-20 Phase 7.6. It is non-authoritative for replay: replay equality is preserved by `effect_model.variants[]` determinism on the parent SLT record plus the chosen variant id recorded in `PG.state_snapshot.applied_effect_variant`. ARC_TRACE records may be deleted, regenerated, or omitted in low-cost runtime modes without breaking replay.

Storage path:

```text
worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml
```

Allocate ids through `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)`. The patch-engine op `create_arc_trace_record` is owned by SPEC-22 Track 1; validators `arc_trace_evidence_alignment` and `effect_model_replay_safety` are owned by SPEC-22 Track 2; indexer and MCP retrieval support for `list_records('arc_trace_record', story_slug)` is owned by SPEC-22 Track 3.

```yaml
id: ARCTRACE-NNNN
story_id: STORY-NNNN
created_at_page: PG-NNNN                       # page whose render this trace describes
arc_realized: SLT-NNNN                         # arc selected at SPEC-20 Phase 4
effect_variant_applied: <variant id>           # from arc.effect_model.variants[]

realized_beats:
  - beat_id: B1
    function: <beat_function string>
    evidence_span: { start: <char offset>, end: <char offset> }
    realized: "true" | "partially" | "not"  # quoted enum-string

observed_actions:
  - actor: STENT-NNNN
    action: <canonical verb>
    target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract | null
    evidence_span: { start: <char offset>, end: <char offset> }

observed_claims:
  - claim: >                                   # structured-form claim extracted from prose
    source: narrator | character | inference
    canon_status: story_local | apparent | forbidden_risk
    evidence_span: { start: <char offset>, end: <char offset> }

possible_violations:
  - envelope_item: invariant_directive | required_function | prohibited_action
    severity: low | medium | high
    evidence_span: { start: <char offset>, end: <char offset> }

stop_condition_hit:
  id: <kebab-case stop id from arc.stop_policy>
  category: normal_exit | interrupt_before | safety_valve
  evidence_span: { start: <char offset>, end: <char offset> }

effect_evidence:
  - effect_ref: <N>  # integer index into chosen variant's required_effects[]
    realized: "true" | "partially" | "not"  # quoted enum-string
    evidence_span: { start: <char offset>, end: <char offset> }

semantic_critic_verdict:
  status: pass | revise_prose | reject_arc | promote_interrupt
  reasons: [...]
  required_revision_constraints: [...]

notes: >
  Free-form authorial or debugger notes.
```

Every claim in `observed_actions[]`, `observed_claims[]`, `possible_violations[]`, `stop_condition_hit`, and `effect_evidence[]` carries an `evidence_span` with byte offsets into the rendered prose. `observed_claims[].canon_status` uses the story-local Mystery Reserve safety taxonomy `story_local | apparent | forbidden_risk`; `forbidden_risk` is a protective annotation for claims that may resolve a forbidden mystery and routes to SPEC-20 Phase 7.6 `revise_prose` or `reject_arc`.

## Other story-bundle records

The remaining classes (SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, DA-story-local, BR) are emitted by this skill but their schemas are owned by `branching-story-bootstrap/templates/story-records.yaml` — the bootstrap skill is the schema authority for shared classes; this skill is the runtime authority for PG/SE/CHC. Per-turn emission rules:

- **SF-NNNN** — append-only; supersession on certainty change; declares `epistemic_class`, `truth_value`, `certainty`, `known_by`, `subject/predicate/object`, `derived_from_cf | canon_relation`, `visible_to_reader`, `reader_visibility_basis`, `created_at_page`.
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
