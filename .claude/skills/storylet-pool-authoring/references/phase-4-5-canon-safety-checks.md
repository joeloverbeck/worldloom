# Phases 4 and 5: Canon Safety Checks

Phase 4 is the per-arc Canon Safety Check for candidate SLT records. Phase 5 is the batch-level diversity and branch-contamination audit. Under the scene-commitment-arc schema, every candidate is a multi-beat arc (`shape: scene_commitment_arc`) and Phase 4 runs **14 gates** per candidate.

SPEC-22 Track 2 backstops several Phase 4 gates through engine validators (`arc_schema_compliance`, `stop_policy_parsability`, `effect_model_legality`) during Phase 5b. Gate 10 (`Arc envelope conformance`) and gate 14 (`Rule 11 spectator-caste leverage`) are skill-internal checks for this authoring reference until a later SPEC-22 reassessment adds any engine-level validator.

## Phase 4: Per-Storylet Validation Gates (Canon Safety Check phase, per arc)

Each candidate SLT runs all **14** gates. A failed gate either HARD-REJECTs the candidate or routes to revise. Revise means the LLM is re-prompted with the failed gate's reason inlined. Each gate gets up to 2 revise retries; after the second failed retry on the same gate, the candidate is HARD-REJECTed and replaced with an under-represented seed from Phase 1's gap matrix.

For `mode=jit`, run this structural precondition before gate 1: `visibility.scope` MUST be `branch_scoped`, `provenance.origin` MUST be `runtime_jit`, and `provenance.created_at_page` MUST equal the supplied `created_at_page`. Failure is a structural HARD-REJECT and re-prompt, not a numbered gate. Gate 8 remains the general branch-contamination enforcement surface.

For bootstrap seed mode (`parent_skill_invocation: true`, `mode=seed`, `focus_area=bootstrap_mix`), run this structural Rule 4 precondition before gate 1: every candidate's hard/soft preconditions, OBL targeting, THR targeting, and new fact/relationship/effect-model outputs must remain compatible with the parent-supplied `audited_thread_obligation_sketch`. Compatibility means the candidate engages the same initial THR/OBL branch or a directly implied payoff/escalation mode already audited in the sketch; it must not introduce a new distribution claim, INV branch, or global-author-pool precondition that bootstrap Phase 4 did not audit. Failure routes back to bootstrap Phase 4 re-audit or candidate replacement; do not launder the divergence into a globally visible seed storylet.

| # | Gate | Check | On fail |
|---|---|---|---|
| 1. | Mystery firewall (Rule 7; dual-field discipline) | Validate BOTH the storylet-level `mystery_safety` block and the envelope-level `execution_envelope.mystery_preservation` block. The storylet-level block must have `forbidden_M_resolved == false`, no forbidden resolution claims, `resolution_safety_per_M{}` matching each cited M record's actual `future_resolution_safety`, and `M_resolution_claims[].requires_canon_promotion == true` iff `resolution_authority == canon_candidate`. The envelope-level block must list every `forbidden`-status M id from the world's whole-class M load in `forbidden_resolutions[]`, and `allowed_claims[]` must be a non-empty subset of `{apparent, branch_local_counterfactual, canon_candidate}` consistent with the storylet-level claim authorities. | HARD-REJECT |
| 2. | Resolution-authority declaration (Rule 7) | For every `M_resolution_claims` entry: if `resolution_authority == canon_candidate`, then `requires_canon_promotion == true` and visibility scope MUST be `branch_scoped` (NEVER `global_author_pool`); if `apparent` or `branch_local_counterfactual`, then `requires_canon_promotion == false` and `resolution_safety_per_M[m_id]` must match the M record's actual `future_resolution_safety`. | HARD-REJECT |
| 3. | Invariant compatibility (Rule 4) | Every `fact_effects` / `relationship_effects` entry and every `effect_model.variants[].required_effects[]` entry respects every INV record's `break_conditions` from the whole-class INV load. | HARD-REJECT |
| 4. | Consequence capacity (Rule 5) | Applying the arc's exit state to the bundle's current state leaves at least one continuation storylet eligible (in the current pool OR JIT-generatable per a brief LLM probe). Verified by deterministic eligibility over the post-application state-snapshot shape. | HARD-REJECT or revise |
| 5. | Dedup | Candidate is not a near-duplicate of an existing pool entry. Dedup is keyed primarily by `(arc_contract.commitment_family, arc_contract.commitment_class, arc_contract.arc_archetype, target_obligation)` plus overlap in hard/soft predicate forms, tone tags, theme tags, and required cast STENT ids. `commitment_detail` may strengthen a near-duplicate judgment but cannot make an otherwise duplicate base route unique by itself. | reject; replace with under-represented seed from Phase 1's gap matrix |
| 6. | Content-intensity coherence | Storylet's `content_intensity` is within the story's allowed range: `STORY_KERNEL.content_intensity_baseline` +/- 1 band, further constrained by `content_intensity_override` when supplied. A `tame`-tagged storylet whose effects or envelope describe explicit-band content fails here. | HARD-REJECT or downgrade content_intensity |
| 7. | Predicate DSL parsability (Rule 1) | Every predicate in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and `stop_policy.normal_exits[].predicate` / `stop_policy.interrupt_before[].predicate` parses against `templates/predicate-dsl.md`. Stop-policy predicates must use the SPEC-19 stop-predicate third tier and their args must match the per-predicate args schema. SPEC-22's `stop_policy_parsability` validator backstops the stop-policy portion in Phase 5b. | HARD-REJECT (re-prompt LLM with grammar inlined) |
| 8. | Branch-contamination (Rule 4 at story scope) | If `visibility.scope == global_author_pool`, the storylet may NOT directly reference any story-local record id (`SF-NNNN`, `OBL-NNNN`, `CNSQ-NNNN`, `THR-NNNN`, `STENT-NNNN`, `STOBJ-NNNN`, `STLOC-NNNN`, `DA-NNNN`, `SREL-NNNN`) whose `created_at_page` is non-null and not the root `PG-0001`. Global author-pool arcs may use abstract role-matchers, world/root facts, and story-local ids declared at bootstrap/root state. | HARD-REJECT (force branch-prefixed/branch-scoped visibility or revise to abstract matchers) |
| 9. | Schema completeness (Rule 1 + Rule 7) | All mandatory fields per `templates/storylet-record.yaml` are present, including `mystery_safety`, `provenance`, `visibility`, and all seven structural arc blocks: `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, and `exit_portfolio`. Fact-template create entries declare `visible_to_reader` and `reader_visibility_basis`; `visible_to_reader: true` requires a positive basis, while `unrevealed_objective_truth` is valid only with `visible_to_reader: false`. SPEC-22's `arc_schema_compliance` validator backstops required sub-field completeness in Phase 5b. | revise (re-prompt LLM with explicit constraint) |
| 10. | Arc envelope conformance | `execution_envelope.invariants[]` and `execution_envelope.required_functions[]` are kebab-case strings, not free-form prose paragraphs, and reference the documented open-vocabulary contract for envelope items. `allowed_tactics`, `prohibited_actions`, `style_directives`, and `mystery_preservation` must be structurally populated and must not contradict gates 1, 3, 6, or 8. This gate is skill-internal-only until a later SPEC-22 reassessment adds an engine-level validator. | HARD-REJECT |
| 11. | Stop-policy parsability | Every stop-policy entry has a stable id, a predicate from the stop-predicate tier, and args matching that predicate's schema. `normal_exits[]`, `interrupt_before[]`, and `safety_valves[]` must be distinguishable; free-form prose stops fail. SPEC-22's `stop_policy_parsability` validator backstops this gate in Phase 5b. | HARD-REJECT |
| 12. | Effect-model legality | `effect_model.variants[]` has at least one variant; every variant has at least one `required_effects[]` entry; `required_effects[].type` and `forbidden_effects[].type` come from the closed effect-type enum; `variant.maps_to_outcome` is in `arc_contract.allowed_outcome_band`. SPEC-22's `effect_model_legality` validator backstops this gate in Phase 5b. | HARD-REJECT |
| 13. | Exit-portfolio completeness | `exit_portfolio.native_seeds[]` has at least one native seed, each native seed has `commitment_family`, closed base `commitment_class`, optional `commitment_detail`, `strategy_cluster`, `expected_state_delta`, and `continuation_arc_selector`, and `engine_discovered_exit_budget` is present with min/max/allowed_sources. Required sub-field minimums are also enforced by SPEC-22's `arc_schema_compliance` validator. | HARD-REJECT |
| 14. | Rule 11 spectator-caste leverage | Trigger only when `effect_model.variants[].required_effects[]` includes a `fact_create` op with `args.truth_scope.world_level == true` AND `args.exception_governance` populated. When triggered, `arc.notes` MUST carry a `leverage:`-prefixed line enumerating at least 3 ordinary-actor leverage forms from the canonical permissible set: `locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`. Arcs whose effects include only `mystery_progress`, `relationship_axis_shift`, `thread_pressure_delta`, or other story-local effects do NOT trigger this gate. This is a deliberate non-default story-scope extension of FOUNDATIONS Rule 11; the existing `rule11_action_space` engine validator applies to CF records, not SLTs. | HARD-REJECT |

## Gate 1 dual-field discipline

The storylet-level `mystery_safety` field and the envelope-level `execution_envelope.mystery_preservation` field are not redundant.

- **Storylet-level `mystery_safety`** declares what the storylet as a whole does to mysteries: `forbidden_M_resolved`, `M_touched[]`, `M_progressed[]`, `M_resolution_claims[]`, and `resolution_safety_per_M{}`.
- **Envelope-level `execution_envelope.mystery_preservation`** declares what each beat/render may not do: `forbidden_resolutions[]` and `allowed_claims[]`.

Gate 1 validates both. An SLT missing either field is HARD-REJECTed. An inconsistency between the two is also HARD-REJECTed. Example: if `mystery_safety.forbidden_M_resolved: false` but `execution_envelope.mystery_preservation.forbidden_resolutions[]` is empty while the world has `forbidden`-status M ids, the envelope cannot enforce the declared safety claim and the candidate fails.

Whole-class M loads remain required: M-record full bodies are used for the `forbidden`-status check, `future_resolution_safety` cross-checks, and the envelope `forbidden_resolutions[]` completeness check. Whole-class INV loads remain required for gate 3.

## Phase 5: Diversity Audit (Canon Safety Check phase, batch-level)

Across the surviving SLT records in the batch, verify the batch-level checks that apply to its mode. Seed/focus batches require all diversity-axis checks plus one batch-level branch-contamination audit before Phase 6. Audit batches bypass the diversity axes but still require batch-level branch-contamination and RSP visibility-match PASS.

For `mode=jit`, bypass Phase 5 diversity audit. A single runtime arc has no meaningful batch diversity surface; Phase 4 gate 8 already covers the branch-contamination check meaningful for one branch-scoped record. Record the bypass in the internal validation packet as `Phase 5: BYPASSED - single-storylet runtime JIT sub-routine`.

For `mode=audit`, bypass the diversity-axis checks because the batch is target-shaped by RSP cards and often has one storylet per audit finding. Still run the batch-level branch-contamination audit and the audit-mode RSP visibility-match check below. Record the bypass as `Phase 5 diversity axes: BYPASSED - audit remediation batch shaped by RSP cards`.

### Diversity-axis checks

| Axis | Threshold | Notes |
|---|---|---|
| `commitment_family` distribution | Broad coverage axis; no single family should dominate unless the story premise lawfully has a narrow route surface and the rationale records that limitation. | `commitment_family` is the summary/routing family and may be derived from class for older records. |
| `commitment_class` distribution | <=30% per class for established/top-up batches; <=40% is permitted for batches with `target_pool_size < 20` when recorded as a small-batch relaxation. | `shape` is degenerate because every record has `shape: scene_commitment_arc`. `commitment_detail` is not a diversity quota axis. |
| `arc_archetype` distribution | <=25% per archetype. | New finer-grained structural axis. |
| Tone distribution | <=40% per dominant tone tag. | — |
| Theme distribution | <=50% per theme tag. | Structural source-OBL concentration may exceed 50% only with a PASS WITH RATIONALE notation that names the source-OBL relationship, confirms secondary themes fragment across families, and records that the override is structural rather than authoring-redundancy. |
| Content-intensity distribution | Matches the per-band gap targets emitted by Phase 1 content-intensity gaps. | The abstract baseline distribution is the convergence target across the pool's lifetime; a single batch may counter-bias against existing over-representation. |
| OBL-engagement distribution | In seed mode, engage >=60% of currently open OBLs; in focus mode, hit every `source_obligations` id at least once. | `source_obligations` / `source_threads` narrow the focus but do not relax the seed-mode 60% threshold unless a recorded structural exception applies. |
| Cast usage | No protagonist, major, or antagonist STENT from `STORY_KERNEL.cast_bind_list` has zero engagement. | Engagement means appearance in required/optional cast fields or actor/target/effect surfaces. Supporting and foil cast may be unengaged in a given batch. |
| Dramatic-unit-coverage | Each of the 8 `strong_axis` enum values appears as `beat_plan.beats[].state_significance` on >=30% of the batch's arcs, aggregated across all beats per arc. | The 8 axes are `relationship_trajectory`, `obligation_state`, `information_posture`, `risk_cost_exposure`, `route_or_scene_type`, `thread_pressure`, `irreversibility`, and `character_intention`. Measurement uses `beat_plan.beats[].state_significance`, not the dramatic value-delta block, because that block has only the narrower four-sub-block basis. |

Up to 2 diversity-correction iterations are allowed before escalating to the user with the failed axes inlined.

### Batch-level branch-contamination audit

Beyond per-storylet branch-contamination (Phase 4 gate 8), audit the batch as a whole:

- For every storylet with `visibility.scope: global_author_pool`, confirm that none of its `hard_preconds`, `soft_preconds`, `fact_templates`, `obligation_matchers`, `relationship_effects`, `location_requirements`, `arc_contract`, `beat_plan`, `stop_policy`, `effect_model`, or `exit_portfolio` fields name a record id whose `created_at_page` is non-null.
- For bootstrap seed mode, confirm every `global_author_pool` storylet's preconditions, OBL/THR targets, and effects remain within the parent-supplied `audited_thread_obligation_sketch`; any unaudited initial THR/OBL branch is a Rule 4 failure requiring bootstrap Phase 4 re-audit or replacement.
- For every storylet with `visibility.scope: branch_prefix_scoped`, confirm `visibility.visible_branch_path_prefix` is a real prefix of at least one current branch's `branch_path`.
- For audit-mode batches, confirm every storylet's `visibility` block matches its source RSP card's `proposed_visibility` block; no audit-mode storylet silently defaults to `global_author_pool` when the RSP requested branch-local scope.

### Audit-mode RSP visibility-match check

For every `mode=audit` storylet:

- `provenance.origin` is `audit_remediation`.
- `provenance.source_audit` equals the source card's `audit_id`.
- `provenance.source_rsp` equals the source card's `rsp_id`.
- `visibility.scope` equals `RSP.proposed_visibility.scope`.
- `visibility.visible_branch_path_prefix` equals `RSP.proposed_visibility.visible_branch_path_prefix` whenever the RSP scope is `branch_prefix_scoped` or `branch_scoped`.
- `provenance.created_at_page` is null for `global_author_pool` and `branch_prefix_scoped`; for `branch_scoped`, it is the leaf page from the RSP-visible branch prefix or the specific leaf named in `target_branch`.

### On Phase 4 surplus

The +30% Phase 2 buffer is structural: it absorbs Phase 4 rejections so a single rejection does not force a stop-and-redraft cycle. When Phase 4 produces surplus survivors above `target_pool_size`, Phase 5 culls down to the target.

Cull on dedup-adjacency-against-existing-pool grounds: rank survivors by adjacency to existing pool arcs (most-adjacent first) and drop the top `M - target_pool_size` candidates. Each drop records a one-line rationale in the SLB manifest under `## Phase 5 dedup-adjacency drops`, naming the dropped candidate's working title, `commitment_family`, `commitment_class`, optional `commitment_detail`, `arc_archetype`, intensity, and most-adjacent existing SLT id.

Post-cull SLT id assignment remains deterministic: surviving candidates are assigned `SLT-NNNN` ids in candidate-index order after cull and Phase 5b engine pre-validation confirm the surviving set. Dropped candidate-index labels do not consume SLT ids.

Over-deliver-all-M is not a permitted alternative path. The user-facing `target_pool_size` in the Phase 6 HARD-GATE summary is the contract; surplus survivors must be culled to honor it.

### On diversity failure

- Replace overrepresented entries with under-represented `commitment_family`, `commitment_class`, `arc_archetype`, tone, theme, content-intensity, OBL, cast, or strong-axis seeds drawn from Phase 1's gap matrix.
- Re-run Phase 3 and Phase 4 on the replacement seeds.
- Up to 2 diversity-correction iterations before escalating to the user with the failed axes inlined.

## Cross-references

- `templates/storylet-record.yaml` is the SLT structural authority.
- `templates/predicate-dsl.md` is the Predicate DSL and stop-predicate grammar authority.
- SPEC-22 Track 2 owns the engine validators that backstop `arc_schema_compliance`, `stop_policy_parsability`, and `effect_model_legality`.
- SPEC-21 routes gate 10's missing engine validator to SPEC-22 reassessment; this reference enforces gate 10 skill-side until then.
