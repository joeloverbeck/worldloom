<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-20: Scene-Commitment Arc Runtime Pipeline (Page-Cycle Rewrite)

**Status**: PROPOSED (2026-05-07)
**Phase**: runtime tier of the scene-commitment-arc pivot
**Depends on**: archived SPEC-19 (schemas + canonical vocabularies), SPEC-22 (engine ops + validators)
**Blocks**: none — SPEC-21 (authoring) and SPEC-20 (runtime) are independent given SPEC-19 + SPEC-22
**Source**: `reports/scene-arc-storylet-research-brief.md`; `reports/scene-commitment-arc.md`; current pipeline at `.claude/skills/branching-story-page-cycle/SKILL.md` and `references/`; cross-checked against `docs/FOUNDATIONS.md` §Story Bundles, `docs/HARD-GATE-DISCIPLINE.md`.

## Problem Statement

The current `branching-story-page-cycle` is structurally beat-paced. Phase 4 selects one beat-granular SLT, Phase 7 renders one beat as ~500-1500 words of prose, Phase 8 always emits 4-6 structured choices, and the user is asked to commit to one before another beat-render can fire. This produces:

- **Beat-cadence agency theater**: 30 emitted choices over 8 pages, with `likely_effects` empty in 30/30 records (test-story evidence).
- **Late-page collapse**: by page 4 of the test story, choices have collapsed from "what kind of scene are we playing?" to postural/verbal-register variants ("Hold the silence," "Take a half-step back," "Give his name back," "Ask two words").
- **Token-cost amplification**: ~5 LLM calls per beat (Phase 7 render + critic + Phase 8 proposer + Phase 8 label render + Phase 9 critic), repeated N times per dramatic scene.
- **HARD-GATE noise**: `authoring`-mode users approve every beat, accumulating ~5x more pause-points than the dramatic scene structure warrants.

The fix is structural: rewrite the runtime so that **one Phase 4 selection drives one multi-beat render** under an arc-owned execution envelope, and **Phase 8 emits a menu only at a commitment hinge**. This spec defines the rewritten phase semantics and the new validation gates that protect replay equality, branch isolation, and the HARD-GATE discipline at arc cadence.

## Approach

The page-cycle's structural skeleton (Pre-flight → Phase 1 → Phases 2-3 → Phase 4 → Phase 4.5 → Phase 5 → Phase 6 → Phase 6.5 → Phase 7 → Phase 7.5 → Phase 8 → Phase 9 → Phase 10 → Phase 11) is preserved. Six phases are rewritten or extended:

- **Phase 4 — Arc Selection** (was: storylet selection at beat granularity)
- **Phase 4b — Effect-Variant Selection Before Render** (NEW)
- **Phase 5 — State Mutation at Arc-Close** (extended to apply variant.required_effects)
- **Phase 7 — Multi-Beat Arc Render** (was: single-beat render)
- **Phase 7.6 — ARC_TRACE Extraction + Three-Layer Validation** (NEW)
- **Phase 8 — Choice-Surface Gate** (was: habitual menu emission)

Plus a STORY_KERNEL.md extension (`cadence_policy` + `menu_policy` blocks) and a Phase 1 write-in routing extension (commitment-class classification before arc selection).

### A. Phase 4 — Arc Selection

The Phase 4 skeleton (hard filters → salience scoring → weighted-pick from top-K → JIT expansion when pool-thin) is preserved. The unit changes from beat-SLT to arc-SLT (`shape: scene_commitment_arc`).

**Hard filters** (drop a candidate arc if any fail):
1. `arc.hard_preconds` parse and evaluate to true against `state_snapshot`.
2. `arc.cast_requirements` are satisfied by `cast_present`.
3. `arc.location_requirements` (when present) are satisfied by `current_location` and `accessible_locations`.
4. `arc.mystery_safety.forbidden_M_resolved == false` and `arc.execution_envelope.mystery_preservation.forbidden_resolutions[]` ⊇ all `forbidden`-status M ids in the world's whole-class M load.
5. `arc.visibility` permits use along the current `branch_path` (existing visibility-scope discipline preserved).
6. `arc.arc_contract.commitment_class` matches the chosen CHC's `commitment_class` field (when Path A) or the classified commitment-class from Phase 1 Path B's write-in classifier (see §G).

**Salience scoring** (the existing `obligation_relevance + character_goal_relevance + reader_knowledge_relevance + thread_pressure + governor_nudge_alignment` formula is preserved) extends with two new dimensions:
- `commitment_class_continuity`: bonus for arcs whose `commitment_class` aligns with the current scene-question (recency-weighted from the parent page's arc).
- `exit_portfolio_richness`: bonus for arcs whose `exit_portfolio.native_seeds[]` count ≥3 (richer downstream commitment options after this arc closes).

**Weighted-pick from top-K** with K=5 is preserved. JIT expansion via `storylet-pool-authoring mode=jit` (sub-routine; SPEC-21) is preserved when no candidate scores above threshold.

**Persistence**: the page record's `storylet_selection_audit_trail` block (existing field) is reused; `top_k_considered`, `scores`, `governor_nudge_bias`, `jit_expansion_fired`, `weighted_pick_seed` all carry forward unchanged.

### B. Phase 4b — Effect-Variant Selection Before Render

NEW phase between Phase 4 and Phase 4.5.

After Phase 4 selects arc `SLT-NNNN`, the engine selects ONE row from `arc.effect_model.variants[]` BEFORE the prose render fires. The selection is deterministic (replay-equality contract):

1. **Variant filtering**: drop variants whose `forbidden_effects[]` would violate the current `state_snapshot` invariants, the world's whole-class INV records, or the world's `forbidden`-status M preservation discipline.
2. **Probability-weighted pick**: among surviving variants, weighted-pick by `variant.probability_weight`. The seed is the page's `weighted_pick_seed` field (already used by Phase 4); the second pick uses the same seed advanced by one tick.
3. **Persistence**: the chosen variant's `id` is recorded in the pending PG transaction at `state_snapshot.applied_effect_variant`. The PG record will not commit until Phase 11.

The selection is "before render" — i.e., the prose render at Phase 7 receives the chosen variant's `required_effects[]` as a constraint on the prose, not the prose's interpretation as a constraint on the effect. This is the load-bearing replay-equality property: replaying the chain of choices from genesis re-applies each PG's `applied_effect_variant` deterministically.

**Replay equality at arc cadence**: replay produces a state equal to disk at arc-close granularity. Beat-internal mutations (intermediate fact-claims, intermediate emotional-state shifts) are NOT replayed at the engine level, because they are NOT authoritative — only `arc.effect_model.required_effects` for the chosen variant is authoritative. This is a deliberate relaxation of the existing per-op replay discipline; the relaxation is sound because the arc is the unit of state transition, not the beat.

### C. Phase 5 — State Mutation at Arc-Close

Phase 5's structured-op application is preserved but the source-of-truth shifts. Instead of consuming Phase 2's `facts_created/invalidated`, `obligations_*`, `intentions/threads pressure deltas`, and `required_aftermath` at beat granularity, Phase 5 applies the chosen variant's `required_effects[]` as one batch at arc-close.

**Op generation**: each entry in `variants[<chosen>].required_effects[]` maps to one or more `SE.ops` entries (preserving the closed `op_type` enum). The mapping is:

| `required_effects.type` | `SE.op_type` |
|---|---|
| `relationship_axis_shift` | `relationship_supersede` |
| `thread_pressure_delta` | `thread_supersede` |
| `obligation_status_change` | `obligation_pay_off` / `obligation_complicate` / `obligation_supersede` (per status target) |
| `fact_create` | `fact_create` |
| `fact_invalidate` | `fact_invalidate` |
| `consequence_open` | `consequence_open` |
| `consequence_address` | `consequence_address` |
| `cast_change` | `cast_change` |
| `location_change` | `location_change` |
| `mystery_progress` | (no op — recorded via `mystery_safety.M_progressed[]` on a new SF or in the page's `state_snapshot`) |

**STINT updates**: per-character intention refresh runs after the variant ops apply, as today (existing Phase 5 logic preserved).

**Branch-isolation invariant**: every non-PG emergent record carries `created_at_page == this_PG`. ARC_TRACE records (Phase 7.6) also carry `created_at_page`. The recursive reference closure validator (Phase 9 gate 3) enforces.

### D. Phase 7 — Multi-Beat Arc Render

Phase 7's render produces ~1500-2200 words of prose covering all beats of the arc in ONE LLM call. The prompt structure is:

```
[content_policy verbatim]
[story kernel]
[prose craft contract verbatim]
[arc.arc_contract block]                     # commitment_class, user_intent, strategic_question_answered
[arc.dramatic_unit block]                    # scene_question, entry_pressure, value_delta_target
[arc.beat_plan block]                        # beat functions (NOT to be echoed as beat headers in prose)
[arc.execution_envelope block]               # invariants, required_functions, allowed_tactics, prohibited_actions, style_directives
[arc.stop_policy.normal_exits block]         # which exits the LLM may steer toward (the chosen variant determines which)
[chosen variant.required_effects]            # what state must change by arc-close
[scene context — cast, location, current_state highlights]
[recent prose continuity along branch_path only]
[governor_nudge]

INSTRUCTION:
Render the arc as continuous prose, NOT as a beat-headered enumeration. The beat plan
is the structural sketch — the prose should embody the beats as scene movement, not
list them. The arc closes when one of stop_policy.normal_exits[] fires; arrange the
prose to drive toward exactly one exit. Do not exceed max_words. Do not violate any
prohibited_actions. Do not resolve any forbidden mystery.
```

**Post-render fail-fast checks** (existing 7-axis prose critic preserved): filter-word saturation, recurring-metaphor across pages, identical-anchor recurrence, self-narrating-self, bracket-paraphrasing-dialogue, ledger-jargon-leakage, abstract-noun-saturation. Critic budget: up to 3 re-prompts (shared with Phase 7.6's three-layer validation).

**Beat-header policy**: the LLM MUST NOT emit beat headers in the rendered prose. Beat plans live in the prompt; the prose is continuous. Validator: a markdown-header-detection pass on the rendered prose; presence of headers → re-prompt.

**Word-count target**: arc render targets `arc.beat_plan.min_beats * 300` to `arc.beat_plan.max_beats * 350` words by default. `arc.stop_policy.safety_valves.max_words` is the hard cap; over-budget renders are re-prompted with constraint.

### E. Phase 7.6 — ARC_TRACE Extraction + Three-Layer Validation

NEW phase between Phase 7 (render) and Phase 8 (choice-surface gate).

Three layers of validation, in order. Each layer can fail back to Phase 7 with constraint feedback or escalate to user (Phase 10 REJECT route).

**Layer 1 — Deterministic Structural Validation** (engine-only, no LLM):
- Markdown-header absence in prose.
- Word count within `[min_beats * 300, safety_valves.max_words]`.
- All `forbidden_resolutions[]` M ids absent from any extracted claim's `canon_status: forbidden_risk`.
- Branch-scope legality (no sibling-branch references).
- Effect-variant legality (the chosen variant exists in the arc's `effect_model.variants[]`).

**Layer 2 — Post-Render Trace Extraction** (LLM critic call):
The critic LLM receives the rendered prose plus `arc.beat_plan`, `arc.execution_envelope`, `arc.stop_policy`, and `chosen variant.required_effects`. It produces an ARC_TRACE record (SPEC-19 §C):
- `realized_beats[]` with per-beat evidence_span and `realized: true | partially | not`.
- `observed_actions[]` with actor/action/target and evidence_span.
- `observed_claims[]` with claim/source/canon_status and evidence_span.
- `possible_violations[]` with envelope_item/severity and evidence_span.
- `stop_condition_hit` with id/category and evidence_span.
- `effect_evidence[]` per `required_effects[]` entry with realized status and evidence_span.

The critic LLM's output is structurally validated by `arc_trace_evidence_alignment` (SPEC-22): every span must be in-range; every `effect_evidence[]` entry must reference a real `required_effects[N]`.

**Layer 3 — Semantic Conformance Critic** (LLM critic call; per-execution-mode budget):
The critic LLM consumes the ARC_TRACE plus the arc record and renders a verdict:
- `pass` — proceed to Phase 8.
- `revise_prose` — re-prompt Phase 7 with `required_revision_constraints[]`. Re-prompt budget: 3 (shared with Phase 7's prose-critic budget).
- `reject_arc` — Phase 4 selection was structurally wrong; re-run Phase 4 with the current arc excluded.
- `promote_interrupt` — the arc's `interrupt_before` predicates fired earlier than expected; the arc closed at an INTERRUPT_HINGE, not a NATURAL hinge. Phase 8 receives this signal.

Per-mode budget for Layer 3:
- `authoring` (default): always run; max 2 critic calls per arc render (1 initial + 1 after revise).
- `interactive_runtime`: run only if Layer 1 or Layer 2 surfaced a possible violation; max 1 critic call.
- `batch_generation`: skip by default; sample at configured checkpoints.

**ARC_TRACE persistence**: an ARC_TRACE record is created per page (`create_arc_trace_record` op; SPEC-22). The record is non-authoritative for replay; deletion or omission does not break replay-equality. In `interactive_runtime` mode under low-budget configurations, the trace may be omitted (the page's `state_snapshot` records this as `arc_trace_emitted: false`).

### F. Phase 8 — Choice-Surface Gate

Phase 8 stops being an agency-generator and becomes a choice-surface validator. The 5-step Amendment B pipeline (affordance-space collection → salient shortlist → LLM proposer → engine validation → diversification) is REPLACED by:

**Step 1 — Narrative-Point Classification** (engine-deterministic with LLM fallback):
The engine deterministically classifies the current narrative point into one of the five `narrative_point` enum values:

| Class | Trigger |
|---|---|
| `CONTINUE_ARC` | The chosen arc has not yet hit any of its `stop_policy.normal_exits[]` or `interrupt_before[]` predicates. (This case never reaches Phase 8 in the current pipeline because Phase 7 renders the full arc to close — but it's reachable via Phase 7.6's `revise_prose` route or for arcs whose multi-page rendering is split. In v1, this class is emitted only when the Phase 7.6 verdict is `revise_prose` and the operator chooses NOT to revise; the runtime auto-chains another arc tick.) |
| `NATURAL_COMMITMENT_HINGE` | The arc closed at one of its `stop_policy.normal_exits[]`. The default case for a clean arc render. |
| `INTERRUPT_HINGE` | The arc closed via `stop_policy.interrupt_before[]`, OR Phase 7.6 emitted `promote_interrupt`. A menu IS REQUIRED. |
| `CONTINUE_ONLY_PAUSE` | The arc closed at a `safety_valves.max_words_reached` or `safety_valves.max_internal_beats_reached` AND only one plausible next commitment exists in the exit_portfolio. Emit a "Continue" affordance only. |
| `TERMINAL_OR_CHAPTER_CLOSE` | The branch is terminal (existing terminal-branch logic preserved). No menu. |

Engine-deterministic classification is the default; if the engine cannot decide (e.g., ambiguous stop_condition_hit), an LLM classifier provides a verdict subject to engine validation.

**Step 2 — Hybrid Exit Portfolio Composition** (deterministic; engine):
For NATURAL_COMMITMENT_HINGE and INTERRUPT_HINGE, compose the candidate exit set:

1. **Native seeds**: every entry in `arc.exit_portfolio.native_seeds[]` whose `continuation_arc_selector` matches an eligible arc in the storylet pool (deterministic filtering on `arc.tags`, `commitment_class`, etc.).
2. **Engine-discovered exits** (capped at `arc.exit_portfolio.engine_discovered_exit_budget.max`): drawn from the `allowed_sources[]` enum (`urgent_obligation`, `high_salience_thread`, `unresolved_consequence`, `user_write_in`). Each engine-discovered exit corresponds to a CHC v2 record whose `commitment_class` is derived from the source (e.g., `urgent_obligation` → the obligation's `payoff_mode_filter` + the obligation type's commitment-class-mapping).
3. **JIT synthesis**: when the candidate set has fewer than `STORY_KERNEL.menu_policy.min_distinct_commitments` entries (default 2), invoke `storylet-pool-authoring mode=jit` (SPEC-21) to synthesize a missing arc archetype.

**Step 3 — Choice-Worthiness Validation** (engine; HARD-REJECT failures):
For each candidate CHC, verify:
- `likely_effects` non-empty.
- `choice_worthiness.strong_axes[]` has ≥1 entry.
- `choice_worthiness.expected_state_delta` is non-empty.
- `choice_worthiness.foreseeable_difference` is populated.
- The candidate's `commitment_class` differs from at least one other surviving candidate (mechanical pair-distance: at least one pair must differ on `commitment_class`).

**Step 4 — Strong-Axis Pair Distance** (engine; HARD-REJECT failures):
The menu's surviving CHCs must collectively differ on ≥2 distinct `strong_axes`. Two CHCs that both engage only `relationship_trajectory` share the same axis profile; the menu fails the strong-axis-collective-difference check unless ≥2 distinct strong_axes appear across the menu.

**Step 5 — LLM Surface Label Rendering** (preserved from existing Step 5):
For each surviving structured CHC, the LLM writes the user-facing label (5-15 words, faithful to the underlying operation, no outcome preview).

**Step 6 — Write-In Slot** (preserved):
Always offered as choice N+1.

**Menu emission in CONTINUE_ONLY_PAUSE**:
Emit a single CHC with `choice_kind: tactical_beat`, `commitment_class: continue_arc_continuation`, `label: "Continue."`, and a fully-populated `choice_worthiness` block whose `strong_axes: []` and `why_not_microbeat: "CONTINUE_ONLY_PAUSE — only one plausible next commitment"`. The Step 3 validation is BYPASSED for this exact case (validator carve-out for `commitment_class: continue_arc_continuation`).

**Auto-chaining in `interactive_runtime` mode**:
When the narrative point is `CONTINUE_ARC` or `CONTINUE_ONLY_PAUSE`, `interactive_runtime` auto-chains: Phase 11 commits the current page, then immediately re-invokes the page-cycle with `parent_page_id = this_PG` and `chosen_choice_id = the auto-chain CHC`. The user sees one continuous reading flow without intermediate Phase 10 pauses. `authoring` mode never auto-chains; the HARD-GATE always fires.

**Bootstrap PG-0001 special case**:
The `branching-story-bootstrap` skill delegates to this Phase 8 (per its own Phase 8 reference) when emitting PG-0001's initial 4-6 CHCs. PG-0001 has no parent arc and no ARC_TRACE — bootstrap renders PG-0001 as a scene-setter without an arc selection (per SPEC-22 §Track 4 §branching-story-bootstrap Phase 7 amendment). The choice-surface gate applies in PG-0001 special-case mode:

- **Step 1 — Narrative-point classification**: skipped at PG-0001. The classification defaults to `NATURAL_COMMITMENT_HINGE` because the bootstrap IS the hinge — the user must pick the first commitment to start the story.
- **Step 2 — Hybrid exit portfolio composition**: composed without `native_seeds` from a closed arc (no arc was just closed). The candidate set is drawn entirely from:
  - **Initial obligations** (from the bootstrap's Phase 5 obligation generation) with high salience or urgency that the protagonist could engage immediately.
  - **Active threads** (from bootstrap Phase 5) carrying entry pressure.
  - **Seed-pool arc eligibility** — every v2 SLT in the freshly-seeded pool whose `hard_preconds` evaluate to true against PG-0001's `state_snapshot`. Each eligible arc's `arc_contract.commitment_class` becomes a candidate `commitment_class` for an emitted CHC; the CHC's `continuation_capacity.valid_seed_storylets` lists the eligible arc(s).
  - **Optional JIT synthesis** — when fewer than `STORY_KERNEL.menu_policy.min_distinct_commitments` (default 2) candidates pass eligibility, invoke `storylet-pool-authoring mode=jit` to synthesize a missing arc archetype, parallel to the page-cycle Phase 4 JIT pattern.
- **Step 3 — Choice-worthiness validation**: applies normally (mandatory non-empty `likely_effects`, populated `choice_worthiness` block, ≥1 `strong_axes` entry per CHC).
- **Step 4 — Strong-axis collective difference**: applies normally (≥2 distinct `strong_axes` across the menu).
- **Step 5 — LLM surface label rendering**: applies normally.
- **Step 6 — Write-in slot**: not stored as CHC at bootstrap (existing v1 convention preserved per `branching-story-bootstrap/references/phase-8-choice-generation.md`); the slot is presented at runtime when the user reads PG-0001.

PG-0001's `state_snapshot` records `applied_effect_variant: null`, `narrative_point_classification: NATURAL_COMMITMENT_HINGE`, `arc_trace_id: null`, `arc_trace_emitted: false` — these are the PG-0001 root-page markers that distinguish the scene-setter root from page-cycle-produced pages. The `effect_model_replay_safety` validator (SPEC-22) accepts these null values when `id == PG-0001` (root-page exception); the `narrative_point_classification` validator (SPEC-22) accepts the bootstrap-default value for the same exception. The first true arc render and ARC_TRACE emission happen at PG-0002 via page-cycle when the user picks one of PG-0001's commitment-class CHCs.

### G. Phase 1 — Write-In Commitment-Class Classification

Phase 1 Path B's existing four-way routing (`ACCEPT` / `ACCEPT_BUT_TRANSFORM` / `TREAT_AS_ATTEMPT` / `REFUSE_ONLY_THROUGH_WORLD_LOGIC`) is preserved. After the routing decision, an additional **commitment-class classification** step runs:

1. The LLM parser reads the user's free-form `manual_action_text`, the routing verdict, and the arc-eligible `commitment_class` enum.
2. It classifies the manual action's intended commitment into one entry of the `commitment_class` enum.
3. If classification fails (the action does not fit any commitment class), the engine routes via `REFUSE_ONLY_THROUGH_WORLD_LOGIC` even if Step 1 said `ACCEPT`.

The classified `commitment_class` is then handed to Phase 4 as an arc-selection filter (§A hard filter 6). This ensures write-ins do not bypass the arc-cadence discipline — a write-in is a commitment, not a beat-action.

### H. STORY_KERNEL.md `cadence_policy` and `menu_policy` Blocks

Add two optional blocks to `STORY_KERNEL.md` (the per-bundle root config). When absent, defaults apply.

```yaml
cadence_policy:
  default_min_words_between_menus: 1200
  preferred_words_per_arc: [700, 2000]
  max_arcs_without_menu_soft: 2
  max_words_without_player_commitment_soft: 3500
  allow_continue_only_pages: true
  force_menu_only_on_interrupt_hinge: false

menu_policy:
  min_distinct_commitments: 2
  max_displayed_choices: 4
  require_likely_effects: true
  require_strong_axis_difference: true
  require_choice_worthiness: true
```

Defaults (when blocks are absent): the values shown above. The blocks live on STORY_KERNEL.md, not on individual arcs, because they describe per-bundle authorial taste, not per-arc structure.

### I. Phase 11 + Pre-flight Extensions for ARC_TRACE Persistence

The page-cycle's structural Phase 11 staged commit is preserved. Two extensions land for v2:

**Pre-flight ID pre-allocation list extension**: the existing pre-flight pre-allocates `PG-NNNN` always, `BR-NNNN` on fork AND on continuation, and one allocation per id-class (`SF` / `OBL` / `CNSQ` / `THR` / `SREL` / `STINT` / `SE` / `SLT` / `STLOC` / `STOBJ` / `DA` / `CHC`) that this turn will create records in. Under v2, the list extends to include `ARCTRACE` when Phase 7.6 is configured to emit a trace this turn (per the per-execution-mode budget in §E):
- `authoring` mode (default): always pre-allocate `ARCTRACE-NNNN` (Phase 7.6 always runs).
- `interactive_runtime` mode: pre-allocate `ARCTRACE-NNNN` only when Layer 1 or Layer 2 surfaced a possible violation that triggers Phase 7.6 Layer 3; otherwise omit and the PG record's `state_snapshot.arc_trace_emitted: false` reflects the absence.
- `batch_generation` mode: pre-allocate at configured checkpoints only.

When the trace is emitted, allocation routes through `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)` per SPEC-22 §Track 1's id-allocation-race extension. The PG record's `state_snapshot.arc_trace_id: ARCTRACE-NNNN` field is populated at Phase 7.6; Phase 11 §1a's envelope assembly includes the corresponding `create_arc_trace_record` op.

**Phase 11 §1a envelope op-enumeration extension**: the existing Phase 11 §1a per-op list includes `create_pg_record`, `create_se_record`, `create_sf_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_chc_record`, `create_slt_record` (JIT only), `create_stloc_record`, `create_stobj_record`, `append_story_diegetic_artifact_record`, and `create_br_record`. Under v2, the list extends to include:

- `create_arc_trace_record` for `_source/arc-traces/ARCTRACE-NNNN.yaml` (the new ARC_TRACE record from Phase 7.6) — emitted IF the trace was generated this turn (per the Pre-flight pre-allocation rule above). The op shape mirrors other story-bundle ops: `{op: "create_arc_trace_record", target_world, target_file: "worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml", payload: {story_slug, record}}` per SPEC-22 §Track 1.

The op IS NOT emitted when `arc_trace_emitted: false` (the PG record's marker for the omission). The envelope is otherwise unchanged — the engine routes the new op through the same patch-engine transaction as other story-bundle ops; `id_allocation_race` extends to cover ARCTRACE ids per SPEC-22.

**No HARD-GATE change**: ARC_TRACE persistence is a derived per-page artifact (non-authoritative for replay per SPEC-19 §C); its emission does not change the Phase 10 user-approval contract or the Phase 4.5 canon-promotion handoff.

## Deliverables

| File | Action |
|---|---|
| `.claude/skills/branching-story-page-cycle/SKILL.md` | Update Process Flow diagram; update HARD-GATE block; update Phase descriptions for 4, 4b (NEW), 5, 7, 7.6 (NEW), 8 |
| `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` | Rewrite for arc selection; add Phase 4b §Effect-Variant Selection Before Render |
| `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` | Add §Arc-Level Effect Application; preserve existing Phase 2-derived op-generation as a deprecated path retained only for legacy v1 records (which do not exist post-cutover) |
| `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` | Rewrite for multi-beat arc render; add §Beat-Header Policy and §Word-Count Targets |
| `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` | NEW — three-layer validation, per-mode budget, ARC_TRACE record assembly |
| `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` | Rewrite as Phase 8: Choice-Surface Gate; replace Steps 1-4 with the 6-step gate above |
| `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` | Add gates: `arc_envelope_conformance`, `effect_model_replay_safety`, `arc_trace_evidence_alignment`, `narrative_point_classification`, `choice_worthiness_completeness` (5 new gates; total Phase 9 gates: 17) |
| `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` | Add §Write-In Commitment-Class Classification |
| `.claude/skills/branching-story-bootstrap/SKILL.md` (STORY_KERNEL template) | Add `cadence_policy` and `menu_policy` blocks to the STORY_KERNEL.md template |
| `.claude/skills/branching-story-bootstrap/references/phase-X-story-kernel.md` (or equivalent) | Document the new STORY_KERNEL blocks |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §3 Snapshot-replay equality | aligns | Phase 4b records `applied_effect_variant` in PG.state_snapshot; replay re-applies the recorded variant deterministically. Beat-internal mutations are NOT authoritative; only arc-level `required_effects` are. |
| §Story Bundles §4 Write Discipline | aligns | All v2 SLT, CHC v2, ARC_TRACE writes route through `mcp__worldloom__submit_patch_plan` (SPEC-22 ops). Hook 3 surface unchanged — `worlds/<slug>/stories/<slug>/_source/...` covers `arc-traces/` automatically. |
| §Story Bundles §5 Rule 1 (No Floating Facts) | aligns | Phase 8 §Step 3 choice-worthiness validation HARD-REJECTs CHCs with empty likely_effects or missing choice_worthiness fields. The 0/30 pathology is structurally impossible under v2. |
| §Story Bundles §5 Rule 4 (No Globalization by Accident) | aligns | Branch-isolation invariant unchanged. ARC_TRACE records carry `created_at_page`. Phase 9 gate `recursive_reference_closure` extends to ARC_TRACE references. |
| §Story Bundles §5 Rule 5 (No Consequence Evasion) | aligns | Phase 5 applies arc-level `required_effects` at arc-close; the runtime cannot silently elide arc-level effects without failing `effect_model_replay_safety`. |
| §Story Bundles §5 Rule 7 (Preserve Mystery) | aligns | Phase 4.5 mystery resolution authority is preserved; arc-level `execution_envelope.mystery_preservation` propagates Rule 7 to all beats inside the arc. Phase 7.6 Layer 1 fails any prose whose extracted claims include forbidden-M resolution risk. |
| HARD-GATE Discipline | aligns | Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is preserved as never-elided in every execution_mode. Phase 10 user-approval HARD-GATE fires once per arc-page in `authoring` mode (~5x reduction in user pause-points vs beat cadence). |
| Default Reality / Rule 6 (No Silent Retcons) | aligns | Arc-level effects are explicit; ARC_TRACE makes the realized vs intended-effect divergence visible. Promotion paths to world canon (story-fact-promotion-to-canon) operate on arc-level `required_effects[]` not per-beat SF claims (SPEC-22). |

## Verification

- **Snapshot-replay equality**: replay the chain of chosen choices from genesis on a representative arc-cadence story; the resulting state is equal to the on-disk state at every PG record's `state_snapshot`. Beat-internal state need not match (it is non-authoritative). Validator: `effect_model_replay_safety` (SPEC-22).
- **Token-cost reduction**: empirically measure LLM call count per scene (4-5 beats × ~5 calls = ~20 calls per scene under v1; ~4 calls per scene under v2). Per the research brief's design target.
- **Choice-surface gate correctness**: under `interactive_runtime` mode, CONTINUE_ARC and CONTINUE_ONLY_PAUSE pages auto-chain without Phase 10 pause; NATURAL/INTERRUPT/TERMINAL pages fire Phase 10 in `authoring` mode. Manual test: a scene whose arcs span 3-4 beats produces 1 user-facing menu in `interactive_runtime`, 1 menu + 1 implicit Continue in `authoring`.
- **Choice-worthiness enforcement**: every CHC v2 emitted by Phase 8 has non-empty likely_effects and a populated choice_worthiness block. Validator: `choice_worthiness_completeness` (SPEC-22). Empirical: 0 CHCs with empty likely_effects across a 50-page test run.
- **Strong-axis collective difference**: every emitted menu (≥2 CHCs) covers ≥2 distinct `strong_axes`. Validator: extension to existing pair-distance check (SPEC-22).
- **ARC_TRACE evidence alignment**: every ARC_TRACE has all evidence_spans within prose byte-range; every effect_evidence references a real required_effects index. Validator: `arc_trace_evidence_alignment` (SPEC-22).
- **HARD-GATE preservation**: `authoring` mode fires Phase 10 user-approval per page; Phase 4.5 canon-promotion handoff fires per `canon_candidate` route regardless of mode. Test by running a story-fact promotion through a v2 page-cycle.

## Out of Scope

- **Schema definitions** — owned by archived SPEC-19.
- **Authoring-skill rewrite** — owned by SPEC-21.
- **Patch-engine ops + validators + canonical-vocabularies + sibling-skill alignment** — owned by SPEC-22.
- **Migration of existing test story bundle** — owned by SPEC-22 §Migration.
- **Promotion of JIT arcs to author-pool** — deferred follow-on (a runtime arc that validates and is approved may be promoted to a permanent author-pool record by a future skill or a manual workflow; not in v1).
- **Cache arc render packets by branch hash** — deferred follow-on optimization; not in v1.
- **Constrained decoding (NeuroLogic-style)** — deferred per ChatGPT-Pro's §16 guidance; v1 enforces constraints via prompting + post-render validation.

## Risks & Open Questions

- **Critic budget calibration**: Layer 3 (semantic conformance critic) is an additional LLM call per arc render. Under `authoring` (max 2 critic calls per arc), token cost is bounded; under `interactive_runtime` (max 1, only on Layer 1/2 surface), token cost is amortized. The exact budget should be revisited after pilot runs of the v2 pipeline.
- **Beat-header rejection**: the LLM may emit beat headers despite the prompt's prohibition. Re-prompt budget covers most cases; persistent header-leak across 3 re-prompts surfaces to the user as a Phase 7.6 Layer 1 failure with constraint feedback for the next render attempt.
- **`CONTINUE_ARC` reachability**: in v1, this narrative-point class is reachable only through the `revise_prose` → operator-skip path. The class exists in the enum for future expansion (multi-page arcs with explicit pagination); v1 implementations may treat reaching it as an error condition.
- **Auto-chain budget under `interactive_runtime`**: if the chosen `CONTINUE_ONLY_PAUSE` chain spans many auto-pages, the user sees a long unbroken reading flow. The cadence_policy `max_arcs_without_menu_soft: 2` is an advisory upper bound; exceeding it surfaces a soft warning in the page record's `narrative_health` block but does not force a menu. Future tickets may add a hard cap.
- **Write-in commitment-class classification accuracy**: the LLM classifier may misclassify edge cases. The `REFUSE_ONLY_THROUGH_WORLD_LOGIC` fallback when classification fails is a safe default; user-facing UI should make the classification transparent ("Treating your action as a 'bounded_question' commitment — proceed?").
- **STORY_KERNEL block backwards-compat**: existing v1 STORY_KERNEL.md files lack the `cadence_policy` / `menu_policy` blocks. The runtime applies defaults when absent. New stories bootstrapped after the cutover include the blocks (with defaults inlined, allowing per-bundle customization).
- **Pre-empted ARC_TRACE in low-cost runtime modes**: when `arc_trace_emitted: false` (interactive_runtime low-budget configurations), debugging an arc-level pathology requires re-running the page in `authoring` mode to populate the trace. This is acceptable since `authoring` is the canonical authoring surface; `interactive_runtime` is for player-facing reading where trace is unnecessary.
