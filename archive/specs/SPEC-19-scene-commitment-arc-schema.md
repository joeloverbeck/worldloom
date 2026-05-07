<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-19: Scene-Commitment Arc Schema & Vocabulary

**Status**: COMPLETED
**Phase**: completed foundation tier of the scene-commitment-arc pivot
**Depends on**: archived SPEC-13 (atomic-source migration — establishes the per-record-per-file `_source/<class>/<ID>.yaml` pattern for world canon); PEENH-001 (extends the same pattern to story-bundle records — the surface this spec extends with `arc-traces/`, per `docs/FOUNDATIONS.md` §Story Bundles §4)
**Blocks**: SPEC-20 (runtime pipeline cannot bind to arc-shape until the schema is in place), SPEC-21 (authoring cannot generate v2 records without the schema), SPEC-22 (engine ops + validators consume the schema)
**Source**: `reports/scene-arc-storylet-research-brief.md` (research brief authored 2026-05-06; pacing-pathology evidence + design direction); `reports/scene-commitment-arc.md` (ChatGPT-Pro deep-research proposal, 2026-05-06); cross-checked against `docs/FOUNDATIONS.md` §Story Bundles, §Canonical Storage Layer, §Validation Rules, and `docs/CONTEXT-PACKET-CONTRACT.md`.

## Problem Statement

The current `branching-story-page-cycle` pipeline emits 4-6 structured choices per page, and pages are produced one storylet (one beat) at a time. Empirical evidence from the test story bundle at `worlds/erotica-world/stories/red-bunny/` (scheduled for deletion in Tier 2 per `specs/IMPLEMENTATION-ORDER.md` §Track 5; the bundle is preserved on disk through SPEC-19 Tier 1 so the diagnosis remains reproducible) shows the pathology:

- 30 emitted choice records across 8 pages at brief-authoring snapshot 2026-05-06 (5 per page, every page); reverified at SPEC-19 reassessment 2026-05-07 with the bundle continuing to grow under the v1 pipeline (40 CHC across the same 8 PG records). The qualitative diagnosis is unchanged at the new sample size.
- `likely_effects` populated in **0 / 30** records at brief snapshot — the schema's effect field exists but is never filled. Reverified 2026-05-07: 40 / 40 still empty.
- `success_policy: guaranteed` on the majority of records.
- `minimum_state_change` includes `intention` on ~28 / 30 and `fact` on ~27 / 30 — almost every record claims to change state, but in late-page choices the differences are postural / verbal-register / silence-vs-speech only.
- Only the first-page menu produces meaningfully different downstream situations.

The deeper diagnosis: the schema treats a **storylet as a beat** (`shape: entry_pressure | cast_introduction | ...`) and a **choice as a beat-granular option**. Phase 8 is then asked to manufacture agency every 500-1500 words whether or not the story has reached a meaningful hinge. Tightening Phase 8's emission policy ("Approach A" in the research brief) does not fix the cadence; introducing autoplay-with-execution-constraints ("Approach B") preserves the per-beat page artifact and its LLM cost.

The structural fix is to **redefine the storylet as a scene-commitment arc** — a multi-beat dramatic unit that plays out one selected commitment from activation to natural close — and to **redefine the choice as a commitment-class selector**. Phase 8's role shifts from agency-generator to choice-surface validator: a menu emerges only at a commitment hinge, and the arc itself owns the per-beat execution envelope.

This spec is the foundation tier: it defines the data-model contract that the runtime pipeline (SPEC-20), authoring skill (SPEC-21), and engine surface (SPEC-22) consume. SPEC-19 itself ships **schema text only** (template files + spec-prose record schemas + DSL grammar text). The TypeScript implementation of canonical-vocabularies + types and all schema-completeness validators are owned by SPEC-22 Tier 2 per `specs/IMPLEMENTATION-ORDER.md`; this spec lists them as cross-references in §Deliverables and §Verification so the contract is grep-discoverable from both directions.

## Approach

Three additive changes to the story-bundle schema layer plus one canonical-vocabulary extension. All changes are **forward-only** — the existing test story bundle is discarded (SPEC-22 §Migration), and no v1 SLT or CHC records survive the cutover.

### A. Storylet Record (SLT) v2

Introduce a new SLT record version, `record_version: 2`, addressed by a new shape value: `shape: scene_commitment_arc`. The legacy shape enum (`entry_pressure`, `cast_introduction`, `threat_escalation`, `relational_dynamics`, `routine_disruption`, `aftermath_sequel`, `reflection_dilemma`, `mystery_edge_brush`, `fork_recovery`, `thread_resolution`, `aftermath_residue`, `intimacy`, `confrontation`, `other`) is supplanted by the new `commitment_class` field on the v2 record. Worlds that bootstrap after the cutover emit v2 records exclusively. The legacy v1 schema is retired and not preserved as a parallel format.

The v2 SLT record extends the v1 envelope (id, story_id, title, content_intensity, hard_preconds, soft_preconds, cast_requirements, location_requirements, tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety, choice_templates, provenance, visibility, notes — all preserved as field names) with **seven new blocks**:

```yaml
record_version: 2
shape: scene_commitment_arc

arc_contract:                                # what the user committed to (mirrors selected CHC)
  commitment_class: <commitment_class enum>  # closed enum — see canonical-vocabularies
  arc_archetype: <arc_archetype enum>        # closed enum
  actor: STENT-NNNN | role:<role>
  target: STENT-NNNN | role:<role> | null
  user_intent: >                             # the user-side commitment encoded by this arc
    Free-form prose; reused verbatim if the arc is the chosen commitment from a CHC
    whose choice_contract.user_intent matches.
  strategic_question_answered: >             # what the arc answers, in scene-question form
    Free-form prose.
  commitment_scope: scene | sequence         # default: scene — most arcs close within the scene
  success_policy: uncontested | contested | costly | uncertain
  allowed_outcome_band:                      # closed enum — see canonical-vocabularies §strong_outcome
    - <strong_outcome enum value>            # one or more

dramatic_unit:                               # why this arc is a scene-level unit
  scene_question: >                          # the dramatic-question form of strategic_question_answered
    Free-form prose, phrased as a yes/no or alternative question.
  entry_pressure:
    thread: THR-NNNN | null
    description: >                           # what is unstable on entry
  value_delta_target:                        # what changes when the arc closes successfully
    relationship:                            # optional
      axis: <relationship axis enum>
      direction: increase_small | decrease_small | increase_large | decrease_large | stabilize
    thread_pressure:                         # optional
      id: THR-NNNN
      direction: increase | decrease | stabilize
    obligation:                              # optional
      delta: created | accepted | deferred | refused | discharged | complicated
    information_posture:                     # optional
      delta: revealed | concealed | investigated | misdirected | confessed | tested
  natural_close_definition: >
    Prose description of the conditions under which the arc has played out and the
    next commitment hinge is exposed.

beat_plan:
  mode: ordered_soft                         # only supported value in v1; future modes may add `branchy_dag`
  min_beats: <int 2..6>
  max_beats: <int 3..8>
  beats:                                     # 3-8 entries
    - id: B1
      function: <beat_function string>       # open-vocab kebab-case (see references/beat-functions.md)
      required: true | false
      state_significance: none | <strong_axis enum>

execution_envelope:                          # what governs prose render under this commitment
  invariants:                                # MUST be true throughout every beat
    - <invariant_directive kebab-case string>
  required_functions:                        # MUST occur at least once across the arc
    - <required_function kebab-case string>
  allowed_tactics:                           # MAY occur (style/blocking flexibility)
    - <tactic kebab-case string>
  prohibited_actions:                        # MUST NOT occur in any beat
    - <prohibited_action kebab-case string>
  style_directives:                          # prose-craft hints (non-validator-bound)
    - <style_directive kebab-case string>
  mystery_preservation:
    forbidden_resolutions:                   # M-NNNN ids whose `forbidden`-status must be preserved
      - M-NNNN
    allowed_claims:                          # which resolution_authority values are legal in this arc
      - apparent | branch_local_counterfactual | canon_candidate

stop_policy:
  normal_exits:                              # any of these closes the arc cleanly
    - id: <kebab-case stop id>
      predicate: <stop_predicate enum>       # closed enum — grammar in §D; enum implementation in SPEC-22
      args: {...}                            # predicate-specific args
  interrupt_before:                          # any of these interrupts the arc before completion
    - id: <kebab-case interrupt id>
      predicate: <interrupt_predicate enum>
      args: {...}
  safety_valves:
    max_internal_beats: <int>                # default: 6 (matches max_beats above; safety-valve)
    max_words: <int>                         # default: 2200 (multi-beat target ~1500-2000 words)

effect_model:
  selected_before_render: true               # MUST be true for v2; replay-equality contract
  variants:                                  # 1..N rows; the runtime selects ONE at Phase 4b before render
    - id: <kebab-case variant id>
      maps_to_outcome: <strong_outcome enum> # entry from arc_contract.allowed_outcome_band
      probability_weight: <float 0..1>       # used by Phase 4b weighted pick when multi-variant
      required_effects:                      # arc-level effects applied at Phase 5 state mutation
        - type: relationship_axis_shift | thread_pressure_delta | obligation_status_change |
                fact_create | fact_invalidate | consequence_open | consequence_address |
                cast_change | location_change | mystery_progress
          ...                                # type-specific args mirroring SE.deterministic_payload
      forbidden_effects:                     # MUST NOT happen under this variant
        - type: <effect type as above>
          ...

exit_portfolio:
  native_seeds:                              # arc-author-declared next-commitment options
    - id: <kebab-case seed id>
      commitment_class: <commitment_class enum>
      strategy_cluster: <kebab-case open-vocab tag>
      expected_state_delta: {...}            # per-strong-axis projection
      continuation_arc_selector:
        include_tags: [...]                  # open-vocab arc tags
        require_arc_archetype: <arc_archetype enum> | null
  engine_discovered_exit_budget:
    min: 0
    max: 2                                   # default; STORY_KERNEL.cadence_policy may override
    allowed_sources:
      - urgent_obligation
      - high_salience_thread
      - unresolved_consequence
      - user_write_in
```

`probability_weight` feeds Phase 4b's stochastic-or-deterministic selector (per `STORY_KERNEL.cadence_policy`, owned by SPEC-20). Replay equality is preserved by recording the chosen variant id in `PG.state_snapshot.applied_effect_variant` (PG-schema extension owned by SPEC-20 / SPEC-22), not by making selection deterministic. When `variants[]` has N=1, weights are unused and the single variant is implicitly chosen.

The v1 fields (hard_preconds, soft_preconds, cast_requirements, location_requirements, fact_effects, relationship_effects, choice_templates, etc.) remain on the v2 record as **field names** (the envelope is a superset of v1, so authoring tooling and downstream consumers do not have to special-case missing fields). Their semantics shift slightly:
- `fact_effects` and `relationship_effects` become **default per-arc effect packages** that map onto the variant rows in `effect_model.variants[]` at authoring time. Authors may inline-promote them into a single-variant `effect_model` if the arc has no outcome non-determinism.
- `choice_templates` are no longer used for runtime CHC proposal scaffolding (that role moves to `exit_portfolio.native_seeds`). v2 SLTs **MUST omit** `choice_templates`; presence is HARD-REJECTed by the `arc_schema_compliance` validator (defined in SPEC-22). The forward-only cutover (no v1 records survive) means there is no migration audience to tolerate the legacy field.

### B. Choice Record (CHC) v2

Extend the existing CHC record schema with **four new fields** plus a structural mandate. The legacy `choice_contract` and `continuation_capacity` blocks are preserved; the addition is additive.

```yaml
record_version: 2
choice_kind: scene_commitment | tactical_beat   # `scene_commitment` is the standard for v2;
                                                # `tactical_beat` is reserved for narrow cases where
                                                # a true beat-granular choice is structurally required
                                                # (e.g., terminal-branch acknowledgment); v2 LLM
                                                # proposers default to scene_commitment.
commitment_class: <commitment_class enum>       # required when choice_kind == scene_commitment
strategy_cluster: <kebab-case open-vocab tag>   # required when choice_kind == scene_commitment
choice_worthiness:                              # required when choice_kind == scene_commitment
  strategic_question_answered: >                # one-line scene-question
  strong_axes:                                  # ≥1 entry from the strong_axis enum
    - <strong_axis enum>
  expected_state_delta:                         # per-axis projection; non-empty
    relationship: { possible: [...], magnitude: small | medium | large } | null
    obligation:   { possible: [...], magnitude: small | medium | large } | null
    thread:       { possible: [...], magnitude: small | medium | large } | null
    information:  { possible: [...] }                                    | null
    risk:         { possible: [...] }                                    | null
    route:        { possible: [...] }                                    | null
    irreversibility: <bool>                                              | null
    intention:    { possible: [...] }                                    | null
  why_not_microbeat: >                          # author-side argument the choice is not a gesture
  foreseeable_difference: >                     # what the user can foresee will differ from sibling choices

# v1 fields (preserved):
choice_contract: {...}                          # user_intent, guaranteed_action, success_policy,
                                                # allowed_outcome_band, forbidden_outcomes, minimum_state_change
likely_effects: [...]                           # MANDATORY non-empty under v2
                                                # (legacy gap: empty in 0/30 of test story at brief snapshot
                                                # 2026-05-06; reverified 40/40 at SPEC-19 reassessment); validator
                                                # `choice_worthiness_completeness` HARD-REJECTs empty arrays
continuation_capacity: {...}                    # post_choice_delta, valid_seed_storylets, jit_shape_spec
```

The mandatory non-empty `likely_effects` on every CHC v2 closes the most damning gap from the test story (0/40 populated as of 2026-05-07). The `choice_worthiness` block is the structural enforcement of the strong-axis discipline: a choice is choice-worthy only if it changes ≥1 strong axis, and the menu's options must collectively differ on ≥2 strong axes (Phase 8 gate; SPEC-20 §Phase 8).

### C. ARC_TRACE Record (new derived class)

Introduce a new story-bundle record class for the post-render trace extracted by Phase 7.6 (SPEC-20). ARC_TRACE is **non-authoritative for replay** — it is a derived per-page validation/debugging artifact. Replay equality is guaranteed by `effect_model.variants[]` determinism plus the variant chosen at Phase 4b being recorded in `PG.state_snapshot.applied_effect_variant`. ARC_TRACE records may be deleted, regenerated, or omitted in low-cost runtime modes without breaking replay.

```yaml
id: ARCTRACE-NNNN                              # story-bundle-scoped; allocate via allocate_next_id
story_id: STORY-NNN
created_at_page: PG-NNNN                       # the page whose render this trace describes
arc_realized: SLT-NNNN                         # the arc selected at Phase 4
effect_variant_applied: <variant id>           # the variant selected at Phase 4b

realized_beats:
  - beat_id: B1                                # from arc.beat_plan.beats
    function: <beat_function string>
    evidence_span: { start: <char offset>, end: <char offset> }
    realized: true | partially | not

observed_actions:
  - actor: STENT-NNNN
    action: <canonical verb>
    target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract | null
    evidence_span: { start: <char offset>, end: <char offset> }

observed_claims:
  - claim: >                                   # the structured-form claim extracted from prose
    source: narrator | character | inference
    canon_status: story_local | apparent | forbidden_risk
    evidence_span: { start: <char offset>, end: <char offset> }

possible_violations:
  - envelope_item: <invariant_directive | required_function | prohibited_action>
    severity: low | medium | high
    evidence_span: { start: <char offset>, end: <char offset> }

stop_condition_hit:
  id: <kebab-case stop id from arc.stop_policy>
  category: normal_exit | interrupt_before | safety_valve
  evidence_span: { start: <char offset>, end: <char offset> }

effect_evidence:
  - effect_ref: <variants[].required_effects[N]>  # which required_effect this evidence supports
    realized: true | partially | not
    evidence_span: { start: <char offset>, end: <char offset> }

semantic_critic_verdict:                       # Phase 7.6 Layer 3 result
  status: pass | revise_prose | reject_arc | promote_interrupt
  reasons: [...]
  required_revision_constraints: [...]         # used by Phase 7 re-prompt budget

notes: >                                       # free-form authorial / debugger notes
```

ARC_TRACE records live at `worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`. The patch-engine op `create_arc_trace_record` is defined in SPEC-22.

### D. Stop-Predicate DSL Extension

Extend `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` with a third tier: **stop predicates**. These are first-order predicates evaluated against story state, the selected commitment, the arc-local trace, mystery safety, the effect model, and participant/location changes. They are used in `arc.stop_policy.normal_exits[].predicate`, `arc.stop_policy.interrupt_before[].predicate`, and the runtime page-cycle's Phase 7.6 stop-condition evaluator.

#### Normal-exit predicates (`stop_policy.normal_exits[].predicate`)

```yaml
- pred: commitment_satisfied
  args: {commitment_class: <commitment_class enum>}
- pred: commitment_blocked
  args: {commitment_class: <commitment_class enum>, reason_class: <reason kebab-case>}
- pred: commitment_overturned
  args: {by_actor: STENT-NNNN | role:<role>, new_commitment_class: <commitment_class enum>}
- pred: npc_makes_demand
  args: {npc: STENT-NNNN | role:<role>, demand_class: <kebab-case>}
- pred: npc_makes_disclosure
  args: {npc: STENT-NNNN | role:<role>, disclosure_class: <kebab-case>}
- pred: participant_exits
  args: {participant: STENT-NNNN | role:<role>}
- pred: scene_goal_resolves
  args: {goal: <kebab-case>}
- pred: scene_goal_changes
  args: {from: <kebab-case>, to: <kebab-case>}
- pred: new_obligation_created
  args: {salience_min: <int 0..10>}
- pred: open_thread_reprioritized
  args: {thread: THR-NNNN, direction: increase | decrease}
- pred: time_or_location_changes
  args: {axis: time | location}
```

#### Interrupt-before predicates (`stop_policy.interrupt_before[].predicate`)

```yaml
- pred: irreversible_cost_imminent
  args: {cost_class: <kebab-case>}
- pred: consent_boundary_imminent
  args: {boundary_class: <kebab-case>}
- pred: violence_or_harm_imminent
  args: {target: STENT-NNNN | role:<role>}
- pred: forbidden_mystery_resolution_risk
  args: {mystery: M-NNNN}
- pred: protagonist_goal_change_required
  args: {from: <kebab-case>, to: <kebab-case>}
- pred: selected_commitment_would_be_violated
  args: {violation_kind: <kebab-case>}
- pred: user_write_in_conflicts_with_envelope
  args: {envelope_item: <kebab-case>}
- pred: only_next_action_would_create_major_state_change
  args: {axis: <strong_axis enum>}
```

#### Safety-valve predicates (`stop_policy.safety_valves`)

Implemented as inline thresholds (not DSL predicates):
- `max_internal_beats_reached` — fires when the prose render's beat count exceeds `arc.beat_plan.max_beats`.
- `max_words_reached` — fires when the prose render exceeds `arc.stop_policy.safety_valves.max_words`.
- `no_valid_continuation_after_effect` — fires when applying the selected effect_variant leaves no eligible continuation arc and no valid JIT spec (Phase 3 continuation feasibility).
- `validation_confidence_low` — fires when the Phase 7.6 Layer 3 semantic critic returns confidence below a per-execution-mode threshold.

The closed grammar is enforced by validator `stop_policy_parsability` (SPEC-22). Free-form predicates are HARD-REJECTed at Phase 4 of storylet-pool-authoring (SPEC-21).

### E. Canonical-Vocabulary Enums

Extend `tools/world-index/src/public/canonical-vocabularies.ts` with the following closed enums (TypeScript implementation owned by SPEC-22 Track 3 per `specs/IMPLEMENTATION-ORDER.md`; SPEC-19 ships the contract text). Initial values are provided; expansion is an append-only authorial change to the vocabulary file (parallels the existing `domain` enum extension pattern from SPEC-14).

`commitment_class` and `arc_archetype` are conceptually distinct: `commitment_class` is the user-side commitment encoded by the chosen CHC and inherited by the arc (what the user committed to do), while `arc_archetype` is the dramatic-shape template the arc plays — dictating the `dramatic_unit` + `beat_plan` skeleton (how the commitment plays out structurally). One commitment_class can play out under multiple archetypes; SPEC-21 §G's archetype library tabulates the legal pairings.

| Enum | Initial values |
|---|---|
| `commitment_class` | `stay_available_without_pressure`, `offer_practical_help`, `ask_one_bounded_question`, `withdraw_without_abandoning`, `confess_one_thing`, `accept_offered_help`, `refuse_with_grace`, `escalate_to_confrontation`, `conceal_under_pressure`, `seek_third_party`, `change_venue`, `make_public_commitment`, `private_betrayal`, `bear_witness`, `release_pressure`, `tighten_pressure`, `defer_decision`, `force_disclosure`, `mirror_acknowledgment`, `intimacy_advance` |
| `arc_archetype` | `fragile_offer`, `bounded_question`, `confession_received`, `refusal_and_aftercare`, `practical_aid_attempt`, `withdrawal_without_abandonment`, `escalation_to_confrontation`, `concealment_under_pressure`, `third_party_intervention`, `investigation_followup`, `aftermath_processing`, `route_change`, `public_commitment`, `private_betrayal`, `intimacy_negotiation`, `boundary_setting`, `restitution_offered`, `silent_witness`, `forced_disclosure`, `pressure_release` |
| `narrative_point` | `CONTINUE_ARC`, `NATURAL_COMMITMENT_HINGE`, `INTERRUPT_HINGE`, `CONTINUE_ONLY_PAUSE`, `TERMINAL_OR_CHAPTER_CLOSE` |
| `strong_axis` | `relationship_trajectory`, `obligation_state`, `information_posture`, `risk_cost_exposure`, `route_or_scene_type`, `thread_pressure`, `irreversibility`, `character_intention` |
| `strong_outcome` | `succeeds`, `partially_succeeds`, `fails_with_consequence`, `backfires`, `accepted_with_limits`, `refused_without_break`, `partially_deflected`, `interrupted_before_resolution` |
| `relationship_axis` (extension) | (existing enum from predicate-dsl.md, no new values added by this spec) |
| `stop_predicate` | union of normal_exit_predicates + interrupt_before_predicates names listed in §D |

`strategy_cluster` remains **open-vocab** (kebab-case strings) — it is a narrative-tagging label rather than an engine-checkable contract surface. Tone and theme tags are the existing precedent for open-vocab discipline.

## Deliverables

### Tier 1 — schema text (SPEC-19 lands)

| File | Action | Owner spec section |
|---|---|---|
| `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` | Replace v1 schema with v2 schema (SLT v2) | §A |
| `.claude/skills/branching-story-page-cycle/references/record-schemas.md` | Add CHC v2 fields + ARC_TRACE record class prose anchor | §B, §C |
| `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` | Add stop-predicate tier (normal-exit, interrupt-before, safety-valve) | §D |

### Cross-reference (defined here, implemented downstream)

| Surface | Defined in | Implemented in |
|---|---|---|
| `tools/world-index/src/public/canonical-vocabularies.ts` — closed enums: `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate` | §E | SPEC-22 §Track 3 (TypeScript implementation + indexer + MCP retrieval) |
| `tools/world-index/src/public/types.ts` — TypeScript types for SLT v2, CHC v2, ARC_TRACE | §A, §B, §C | SPEC-22 §Track 3 |
| Schema-completeness validators — `arc_schema_compliance`, `choice_worthiness_completeness`, `stop_policy_parsability`, `effect_model_legality`, `effect_model_replay_safety`, `arc_trace_evidence_alignment`, `narrative_point_classification` | §A, §B, §C, §D | SPEC-22 §Track 2 (validator framework + unit-test fixtures) |
| `arc-archetypes.md` template (initial 14-20 archetype library + commitment_class × archetype pairing table) | (referenced by §E enum framing) | SPEC-21 §G (authoring-skill rewrite owns full content) |
| PG schema extension — `state_snapshot.applied_effect_variant`, `arc_trace_id`, `arc_trace_emitted` | §A `effect_model` clarifying paragraph; §C ARC_TRACE replay-equality contract | SPEC-20 §Phase 4b + SPEC-22 §Track 4 (PG schema extension) |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5 Rule 1 (No Floating Facts) at story scope | aligns | every CHC v2 carries non-empty `likely_effects` + `choice_worthiness` blocks; v2 SLT requires all seven new structural blocks; missing fields → validator HARD-REJECT (SPEC-22) |
| §Story Bundles §5 Rule 4 (No Globalization by Accident) | aligns | v2 SLT preserves `visibility.scope` discipline; ARC_TRACE carries `created_at_page` (branch-isolation invariant) |
| §Story Bundles §5 Rule 5 (No Consequence Evasion) | aligns | `effect_model.required_effects` is applied at Phase 5 state mutation per arc-close (SPEC-20); the runtime cannot silently elide arc-level effects |
| §Story Bundles §5 Rule 7 (Preserve Mystery Deliberately) | aligns | `arc.execution_envelope.mystery_preservation.forbidden_resolutions` propagates Rule 7 across all beats inside the arc; existing Phase 4 gates 1+2 in storylet-pool-authoring extend to arc-level enforcement (SPEC-21) |
| §Story Bundles §3 (Read Discipline) | aligns | ARC_TRACE retrievable via `mcp__worldloom__get_record(record_id)`; whole-class via `list_records('arc_trace_record')` (SPEC-22 indexer extension) |
| §Story Bundles §4 (Write Discipline) | aligns | ARC_TRACE writes route through `mcp__worldloom__submit_patch_plan` with `create_arc_trace_record` op (SPEC-22); Hook 3's pattern `worlds/<slug>/stories/<slug>/_source/...` covers `arc-traces/` automatically — no hook-pattern change needed |
| §Canonical Storage Layer | aligns | ARC_TRACE follows the SPEC-13 atomic-source pattern: one record per file, append-only at the file-system level |
| Rule 11 (No Spectator Castes) | tensions — addressed in SPEC-21 | when an arc's `effect_model.required_effects` introduces exceptional capability use, the arc must declare ≥3 ordinary-actor leverage forms; this is enforced at storylet-pool-authoring Phase 4 (SPEC-21 adds gate 10) |

## Verification

### Tier 1 — schema-text verification (SPEC-19 completion gate)

Per `specs/IMPLEMENTATION-ORDER.md` Tier 1 SPEC-19 completion gate ("schema templates updated; the predicate DSL grammar file lists the stop-predicate tier"), SPEC-19 itself verifies only the **schema text**:

- **SLT v2 envelope text** — `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` contains every block named in §A (`arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`) with each sub-field named in §A's YAML skeleton, the `record_version: 2` and `shape: scene_commitment_arc` discriminants, and the v1 fields preserved as field names (with the `choice_templates` MUST-omit notation).
- **CHC v2 envelope text** — `.claude/skills/branching-story-page-cycle/references/record-schemas.md` documents the CHC v2 additions (`record_version`, `choice_kind`, `commitment_class`, `strategy_cluster`, `choice_worthiness` with all five sub-fields) and notes `likely_effects` MANDATORY-non-empty under v2.
- **ARC_TRACE prose anchor** — `record-schemas.md` documents the ARC_TRACE record class with every block named in §C (id, story_id, created_at_page, arc_realized, effect_variant_applied, realized_beats, observed_actions, observed_claims, possible_violations, stop_condition_hit, effect_evidence, semantic_critic_verdict, notes).
- **Stop-predicate DSL grammar text** — `predicate-dsl.md` contains the third tier (normal-exit, interrupt-before, safety-valve), every predicate name listed in §D, and the per-predicate args schema.

### Cross-reference — downstream verification commitments

The validators and runtime-state checks below are **owned by downstream specs**; SPEC-19 lists them so the contract is grep-discoverable from both directions but does not require their landing as part of its own completion gate:

- **Schema completeness** — every `shape: scene_commitment_arc` SLT must have all seven new blocks populated. The `arc_schema_compliance` validator (owned by SPEC-22 §Track 2) enumerates the required fields and HARD-REJECTs any record missing them.
- **CHC v2 mandatory `likely_effects`** — every `choice_kind: scene_commitment` CHC must have non-empty `likely_effects` and a fully-populated `choice_worthiness` block (strategic_question_answered, ≥1 strong_axes entry, expected_state_delta, why_not_microbeat, foreseeable_difference). The `choice_worthiness_completeness` validator (SPEC-22 §Track 2) HARD-REJECTs empty/missing fields.
- **Stop-predicate parsability** — every entry in `stop_policy.normal_exits[].predicate` and `stop_policy.interrupt_before[].predicate` parses against the extended DSL. The `stop_policy_parsability` validator (SPEC-22 §Track 2) HARD-REJECTs unknown predicate names; it shares the existing `storylet_predicate_dsl_parsability` validator's grammar-loading logic.
- **ARC_TRACE evidence alignment** — every claim in `observed_actions[]`, `observed_claims[]`, `possible_violations[]`, `stop_condition_hit`, and `effect_evidence[]` carries an `evidence_span` with valid `{start, end}` byte offsets pointing into the rendered prose. The `arc_trace_evidence_alignment` validator (SPEC-22 §Track 2) HARD-REJECTs missing or out-of-range spans.
- **Effect-model replay-safety** — every PG record's `state_snapshot.applied_effect_variant` (PG-schema field added by SPEC-20 §Phase 4b + SPEC-22 §Track 4) is a `variants[].id` of the realized arc's `effect_model`. Mismatch → `effect_model_replay_safety` FAIL (SPEC-22).
- **Canonical-vocabulary coverage** — every `commitment_class` / `arc_archetype` / `narrative_point` / `strong_axis` / `strong_outcome` / `stop_predicate` value emitted by storylet-pool-authoring's Phase 3 LLM is in the closed enum. Validator `record_schema_compliance` extension (SPEC-22 §Track 2) HARD-REJECTs unknown enum values.

## Out of Scope

- **Pipeline behavior changes** — Phase 4 arc selection, Phase 4b effect-variant selection, Phase 7 multi-beat render, Phase 7.6 ARC_TRACE extraction, Phase 8 choice-surface gate are all owned by SPEC-20.
- **Authoring-skill rewrites** — coverage diagnosis, generation seeds, structured drafting, per-storylet validation gates, diversity audit, arc-archetype library content (`arc-archetypes.md` creation + 14-20 initial archetype entries + the commitment_class × archetype pairing table) are owned by SPEC-21.
- **Engine ops + cross-skill alignment + TypeScript implementation** — patch-engine `create_arc_trace_record` op, all schema-completeness validators (`arc_schema_compliance`, `choice_worthiness_completeness`, `stop_policy_parsability`, `effect_model_legality`, `effect_model_replay_safety`, `arc_trace_evidence_alignment`, `narrative_point_classification`), `tools/world-index/src/public/canonical-vocabularies.ts` enum implementation, `tools/world-index/src/public/types.ts` TypeScript types for SLT v2 / CHC v2 / ARC_TRACE, indexer parsing of ARC_TRACE, MCP retrieval surface for ARCTRACE ids, branching-story-bootstrap / branching-story-health-audit / story-fact-promotion-to-canon alignment are owned by SPEC-22.
- **PG schema extension** — `state_snapshot.applied_effect_variant`, `arc_trace_id`, `arc_trace_emitted` field additions are owned by SPEC-20 §Phase 4b and SPEC-22 §Track 4.
- **Migration of existing test story** — owned by SPEC-22 §Migration / `specs/IMPLEMENTATION-ORDER.md` §Track 5.
- **STORY_KERNEL.md cadence_policy / menu_policy block** — owned by SPEC-20 §STORY_KERNEL extensions.

## Risks & Open Questions

- **`commitment_class` enum extensibility**: the initial 20-value enum is informed by ChatGPT-Pro's recommended archetype library plus the existing `shape:` enum semantics, but the first runs of arc authoring will likely surface gaps (e.g., genre-specific commitments in erotica or mystery worlds). The enum should be expanded by append-only authorial change to canonical-vocabularies.ts; an out-of-enum value at Phase 4 of storylet-pool-authoring is a HARD-REJECT, not a silent extension. Recommend: track expansion candidates in storylet batch manifests' `notes` field; periodic reconciliation lifts the most common ones into the closed enum.
- **`effect_model.variants[]` semantics for deterministic outcomes**: when an arc's `success_policy: uncontested` and `allowed_outcome_band: [succeeds]` (single-outcome-band), the arc may have exactly one variant. This is fine; `effect_model.variants[]` is a 1..N list. Validators must accept N=1 without warning.
- **CHC v2 field migration**: the cutover discards all v1 CHC records (existing test bundle is discarded). Worlds bootstrapped after the cutover emit v2 records exclusively. There is no parallel-format support.
- **ARC_TRACE size**: a fully-populated ARC_TRACE for a 2000-word arc may carry 30-60 evidence_span entries. Index-builder ingestion cost is bounded but should be measured; the `world-index` builder's per-record performance budget is the relevant gate.
- **Beat-function open vocab**: `beat_plan.beats[].function` is open-vocab (kebab-case), not enum-bound. This mirrors `tone_tags` / `theme_tags` discipline. A future spec may close the grammar if a stable beat-function vocabulary emerges.
- **Stop-predicate args open-vocab**: the `args:` block of each stop predicate is type-checked per-predicate (each predicate has a fixed args schema), but several args use kebab-case open-vocab strings (e.g., `commitment_satisfied.args.commitment_class` is enum-bound; `commitment_blocked.args.reason_class` is open-vocab). The closed-vs-open distinction is documented per-predicate in the extended `predicate-dsl.md`.
- **CLAUDE.md `ARCTRACE-NNNN` ID-class docs gap**: this spec introduces a new story-bundle-scoped record class but does not extend `CLAUDE.md` §ID Allocation Conventions. The docs update is routed through SPEC-22 §Track 3 (canonical-vocabularies + indexer + MCP retrieval) as a docs-update side-deliverable, alongside the `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)` registration in SPEC-22 §Track 1. Failing to land the docs update would leave the new ID class undiscoverable from `CLAUDE.md` — a Rule-6 (No Silent Retcons) risk at the pipeline-conventions level.

## Outcome

Completed 2026-05-07. SPEC-19's schema-text foundation landed through the archived SPEC19SCECOM ticket batch:

1. `archive/tickets/SPEC19SCECOM-001.md` landed the SLT v2 template in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, including `record_version: 2`, `shape: scene_commitment_arc`, the seven scene-commitment-arc structural blocks, `choice_templates` retirement, and a minimal parent-skill transition disclosure.
2. `archive/tickets/SPEC19SCECOM-002.md` landed CHC v2 field documentation and the ARC_TRACE record class prose anchor in `.claude/skills/branching-story-page-cycle/references/record-schemas.md`, plus a minimal parent-skill transition disclosure.
3. `archive/tickets/SPEC19SCECOM-003.md` landed the stop-predicate third tier in `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, including normal-exit predicates, interrupt-before predicates, safety-valve thresholds, closed-vs-open args discipline, and Mystery Reserve firewall semantics.
4. `archive/tickets/SPEC19SCECOM-004.md` corrected the final SLT v2 stop-predicate ownership comment so grammar text points to `templates/predicate-dsl.md` / SPEC-19 and enum / validator implementation remains owned by SPEC-22.

Deviations from the original proposed spec remain intentional boundaries, not unfinished SPEC-19 work: runtime behavior stays owned by SPEC-20, authoring-skill operational rewrite by SPEC-21, and validator / TypeScript / canonical-vocabulary / patch-engine / indexer implementation by SPEC-22.

Verification completed 2026-05-07 by the archived ticket proofs and final archival checks:

1. SLT v2 schema text contains the seven required blocks named in SPEC-19 §A.
2. CHC v2 and ARC_TRACE schema text are documented in the page-cycle record-schema reference.
3. The predicate DSL template contains the stop-predicate third tier and SPEC-22 validator deferral.
4. The stale SPEC-21-only stop-predicate ownership comment was removed from the SLT v2 template.
