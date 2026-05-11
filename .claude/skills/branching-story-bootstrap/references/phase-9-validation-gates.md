# Phase 9: Validation Gates (Canon Safety Check phase)

Reference for `branching-story-bootstrap` Phase 9 — the 18-gate canon-safety audit that gates HARD-GATE Phase 10 approval. Each gate must record PASS with a one-line rationale into `STORY_KERNEL.md`'s `validation_trace` field. Any FAIL halts the bootstrap and routes to the responsible upstream phase. A bare "PASS" without rationale is treated as FAIL per the FOUNDATIONS skill discipline.

---

| # | Gate | Check | Routes to on FAIL |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | No `forbidden`-status M-NNNN resolved by any storylet, fact, obligation, or page | Phase 4 |
| 2 | Invariant compatibility (Rule 4) | Every initial SF, THR, OBL, SLT precondition, PG-0001 `state_snapshot` field, and CHC `likely_effects` is compatible with every loaded INV's `break_conditions`; the Phase 5 emitted records (THR + OBL) match the Phase 4 audited sketch (`audited_thread_obligation_sketch`) | Phase 4 |
| 3 | Content policy presence | content_policy block embedded verbatim in STORY_KERNEL.md AND in every assembled LLM prompt this run | Pre-flight |
| 4 | ID uniqueness | Allocated IDs do not collide with any existing record in this story | Pre-flight |
| 5 | Branch path consistency | `PG-0001.branch_path == [PG-0001]` AND `parent_page_id == null` AND `branch_id == BR-0001` | Phase 7 |
| 6 | Cast intention coverage | Every protagonist + major has a non-empty bare-numeric `STINT-NNNN` record whose `stent_id` points to its STENT | Phase 2 |
| 7 | Obligation salience (Rule 5) | Every initial OBL declares salience, urgency, ≥2 payoff_modes | Phase 5 |
| 8 | Epistemic class declared (Rule 1) | Every initial SF declares `epistemic_class` | Phase 3 |
| 9 | Storylet diversity | Seed pool covers ≥5 distinct `arc_contract.commitment_class` values when `target_pool_size >= 8`; no single commitment_class exceeds 30% of the seed batch unless the batch is smaller than 20 and records the documented small-batch relaxation (≤40%) with rationale. Every SLT still has `shape: scene_commitment_arc`; shape distribution is degenerate and not a diversity axis. Arc-archetype distribution is delegated to Phase 6 storylet-pool-authoring's Phase 5 (≤25% per archetype); see `storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` Phase 5 diversity axes for the archetype check that complements this gate's commitment_class coverage. | Phase 6 |
| 10 | Prose ledger consistency | PG-0001 prose introduces no entity as physically present unless in `cast_present`; load-bearing factual claims are state-snapshot-grounded; resolves no mystery | Phase 7 |
| 11 | Choice consequence-capacity | Every emitted CHC's `continuation_capacity` block is populated and either `valid_seed_storylets` is non-empty (each named SLT's `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` pass under the post-choice delta) or `jit_shape_spec` is non-empty with a one-line shape sketch | Phase 8 |
| 12 | Recursive reference closure | Closure traversal roots at PG-0001 itself, expanding through `state_snapshot`, `storylet_realized`, `applied_event_ops`, and `emitted_choices`, then through every CHC's `likely_effects`, `uses_fact`, `target`, and `actor`; every non-PG story-local ID encountered either has `created_at_page == null` (globally legal — author-pool storylets only) or `created_at_page == PG-0001`; every PG reference is allowed when that PG id is in the root `branch_path` (`[PG-0001]`) because the page record's own id is its branch anchor. Mirrors page-cycle gate 3; the bootstrap PG-0001 template records this as the `recursive_reference_closure` trace key. | Phase 7 |
| 13 | State_snapshot integrity | `current_location`, `entity_status`, `relationships_current`, and the epistemic-faceted fact lists populated on `state_snapshot`; empty `entity_status: {}` is legal at PG-0001 root and inherits to PG-0002 via snapshot-replay equality (per Phase 9.5 check #10), with subsequent pages populating per-STENT sub-keys as state changes accumulate. Mirrors page-cycle gate 10; the bootstrap PG-0001 template records this as the `state_snapshot_integrity` trace key. | Phase 7 |
| 14 | `arc_envelope_conformance` | PG-0001 root special case: no arc has been selected, so the gate auto-PASSes with rationale `"PG-0001 root special case — no arc selected"`. Non-root enforcement is owned by page-cycle Phase 9. | Phase 7 |
| 15 | `effect_model_replay_safety` | PG-0001 root-page exception accepts `state_snapshot.applied_effect_variant: null` when `id == PG-0001`; no effect model replay occurs at the scene-setter. | Phase 7 |
| 16 | `arc_trace_evidence_alignment` | PG-0001 root special case: no ARC_TRACE is emitted, so the gate auto-PASSes with rationale that there is no trace evidence to align. | Phase 7 |
| 17 | `narrative_point_classification` | PG-0001 defaults to `NATURAL_COMMITMENT_HINGE` because it is the first commitment surface; the closed-enum value is recorded on `state_snapshot.narrative_point_classification`. | Phase 8 |
| 18 | `choice_worthiness_completeness` | Every `choice_kind: scene_commitment` CHC emitted at PG-0001 has non-empty `likely_effects` and a populated `choice_worthiness` block; the displayed menu collectively covers at least two distinct `strong_axes`. | Phase 8 |

---

**Whole-class loads from Pre-flight power gates 1, 2, and 9**: M-record full bodies for gate 1's `forbidden`-status check + `M_resolution_claims` interrogation; INV-record full bodies for gate 2's `break_conditions` audit across the initial SF / THR / OBL / SLT-precondition / state_snapshot / CHC-likely-effects surface. Without those whole-class loads, Phase 4 and Phase 9 cannot honor their canon-safety contract.

**Gates 14-18 — PG-0001 scene-commitment validator alignment**: these five gates mirror the SPEC-20 / SPEC-22 page-cycle validator surfaces at the bootstrap root. Four are root-special-case gates because PG-0001 has no selected arc and no ARC_TRACE. `choice_worthiness_completeness` applies non-vacuously to the emitted CHCs.
