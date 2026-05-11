# Phase 4: Arc Selection (with Phase 4.5 Mystery Resolution Authority)

## Hard Filters (engine, deterministic)

A storylet is eligible only when it is a scene-commitment arc:

- `shape: scene_commitment_arc`.
- `arc.hard_preconds` parse and evaluate to true against the current `state_snapshot`.
- `arc.cast_requirements` are satisfied by `cast_present`.
- `arc.location_requirements`, when present, are satisfied by `current_location` and `accessible_locations`.
- `arc.mystery_safety.forbidden_M_resolved == false`.
- `arc.execution_envelope.mystery_preservation.forbidden_resolutions[]` covers every whole-class Mystery Reserve record whose `status: forbidden`; absence of a forbidden-status M id is a hard-filter failure, not a Phase 7 prose concern.
- If `mystery_safety.M_resolution_claims` is non-empty: routes per Phase 4.5.
- `content_intensity` is within ±1 band of story baseline (or matches `content_intensity_override`).
- Is not in the recent-history avoid list (last ~5 realized arcs — prevents immediate repetition).
- `arc.visibility` permits use along this page's `branch_path` per `references/pre-flight-and-prerequisites.md` §World-State Prerequisites.
- `arc.arc_contract.commitment_class` matches the chosen CHC's `commitment_class` when Phase 1 Path A consumed a structured choice, OR matches the classified commitment class from Phase 1 Path B's write-in classifier. If the write-in cannot classify into a legal commitment class, Phase 1 routes through `REFUSE_ONLY_THROUGH_WORLD_LOGIC`; Phase 4 does not admit a beat-action bypass.

## Salience Scoring (engine, deterministic)

```
score(arc) =
+ 4.0 * obligation_relevance(arc, open_obligations)
+ 3.0 * causal_relevance(arc, pending_consequences)
+ 2.5 * character_goal_relevance(arc, active_intentions)
+ 2.0 * reader_knowledge_relevance(arc, reader_known_facts)
+ 1.5 * thematic_continuity(arc, active_themes)
+ 1.5 * tension_fit(arc, current_tension_target)
+ 1.25 * commitment_class_continuity(arc, current_scene_question)
+ 1.0 * exit_portfolio_richness(arc.exit_portfolio.native_seeds)
+ 1.0 * novelty(arc, recent_history)
- 3.0 * contradiction_risk(arc)
- 2.0 * unresolved_debt_increase(arc)
- 1.0 * repetition_penalty(arc)
```

`commitment_class_continuity` gives a bonus when the arc's `arc_contract.commitment_class` aligns with the current scene question, recency-weighted from the parent page's realized arc when present. `exit_portfolio_richness` gives a bonus when `arc.exit_portfolio.native_seeds[]` contains at least 3 viable next-commitment seeds, because richer native exits reduce Phase 8 JIT pressure after this arc closes.

The `governor_nudge` from the previous turn's Phase 6 (or, on first turn, from the bootstrap's storylet-pool seed bias) adjusts the weights — e.g., "story has 3 high-salience unresolved obligations and rising threat pressure; favor arcs that pay off or escalate one of those" boosts `obligation_relevance` and `tension_fit` by 1.5x.

## Weighted-Pick from Top-K

Pick K = 5. When the engine implements stochastic selection, weight each eligible arc by score (softmax-style) and sample one. When the LLM-operator selects without an RNG, take top-1 ONLY when its score margin over top-2 is ≥1.0 point AND its narrative fit is unambiguous; otherwise consult `weighted_pick_seed` (deterministic per-page) to break ties between close-scored candidates and document the seed-driven rationale in `storylet_selection_audit_trail`. Predictability becomes brittleness when the engine collapses to top-1 across all turns; weighted-pick (or judgment-with-tiebreak) lets the story breathe while still favoring relevance.

Persist the top-K candidate ids + per-candidate scores + governor-nudge bias summary + jit-expansion-fired flag + `weighted_pick_seed` to the new page's `storylet_selection_audit_trail` field (per `references/record-schemas.md` §Page Record). This makes the weighted-pick discipline auditable retrospectively — `branching-story-health-audit` can verify the realized SLT was sampled from the distribution rather than always taken top, and reproduce the selection deterministically when a seed is recorded. Without this persistence, the discipline lives only in the operator's transient prose at Phase 10's deliverable summary; the persisted PG record loses the rejection-set evidence needed to confirm the pick was a sample rather than a deterministic top-1.

## JIT Expansion Trigger

If no candidate scores above threshold (typically: top-K all score below `(median(score) + 1.0)`), AND the consequence-capacity check (Phase 3) passed only by JIT-generatable continuation, invoke `storylet-pool-authoring` as the **single-storylet JIT generator**:

- Call shape: `mode='jit'`, `parent_skill_invocation=true`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, `caller_state_snapshot=<this_state_snapshot>`, plus the current branch-local pool/OBL/CNSQ/THR/cast/recent-prose context already assembled by this phase and the missing commitment-class / arc-archetype pressure discovered by the filters.
- The delegated call returns exactly ONE approved SLT record plus its internal validation packet. The returned SLT carries `shape: scene_commitment_arc`, `provenance.origin: runtime_jit`, `provenance.created_at_page: <this_PG_id>`, and `visibility.scope: branch_scoped`; a global-author-pool JIT result is structurally invalid for this turn.
- `storylet-pool-authoring` runs its Phase 4 gate set over the candidate, including mystery firewall, resolution-authority declaration, predicate parsability, branch-contamination, and arc-schema compliance. Its Phase 5 diversity audit is bypassed because a single runtime arc has no batch diversity surface.
- Selection then picks this JIT arc. Phase 4b selects its effect variant, Phase 5 applies the chosen variant's required effects, Phase 9 rechecks the full page-cycle validation gates, and Phase 11 writes the returned SLT-NNNN.yaml inside the same page-tick transaction as the new PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/CHC records.

### Inline-vs-delegation seam

**Inline-authoring of a JIT SLT is operationally riskier than delegation to `storylet-pool-authoring mode=jit` and should be reserved for cases where mid-execution sub-skill delegation is not feasible.** The delegation seam exists because (i) `storylet-pool-authoring`'s Phase 3 inlines the closed predicate DSL grammar from `storylet-pool-authoring/templates/predicate-dsl.md` verbatim into the LLM prompt — the operator's safety net against invented predicates that the runtime `storylet_predicate_dsl_parsability` validator would otherwise reject at Phase 11 submit time; (ii) `storylet-pool-authoring`'s Phase 4 14-gate set (mystery firewall, resolution-authority declaration, predicate parsability, branch-contamination, etc.) runs over the candidate — re-running these gates inline duplicates validator logic and risks divergence; (iii) `provenance.origin: runtime_jit`, `provenance.created_at_page: <this_PG_id>`, and `visibility.scope: branch_scoped` are set authoritatively by `storylet-pool-authoring` at JIT-emission time, not negotiated by the caller. An operator who shortcuts to inline authoring (because spawning a sub-routine feels heavier than authoring a single SLT) will hit the validator at Phase 11 with `unknown pred '<invented-name>'` errors and force a re-validate cycle; the delegation cost is the safety net's price.

JIT generation is not free — it expands the engine prompt budget and may produce lower-quality arcs than the author pool. `branching-story-health-audit` consumes the `flagged_for_audit` and high-JIT-rate signals.

## Phase 4b: Effect-Variant Selection Before Render

After Phase 4 selects arc `SLT-NNNN`, select exactly one row from `arc.effect_model.variants[]` before Phase 7 plan authoring fires.

1. **Variant filtering.** Drop variants whose `forbidden_effects[]` would violate the current `state_snapshot`, the world's whole-class INV records, or the world's `forbidden`-status Mystery Reserve preservation discipline. A variant whose `required_effects[]` would require a forbidden mystery resolution is also ineligible.
2. **Probability-weighted pick.** Among surviving variants, weighted-pick by `variant.probability_weight`. Use the page's `weighted_pick_seed` advanced by one deterministic tick after the Phase 4 arc pick. When only one variant survives, that variant is selected and the seed advancement is still recorded for replay auditability.
3. **Persistence.** Record the chosen variant's `id` in the pending PG transaction at `state_snapshot.applied_effect_variant`; the PG record commits at Phase 11. The selected variant id and seed advancement are part of the same audit story as `storylet_selection_audit_trail`.
4. **Render contract.** Phase 7 receives the chosen variant's `required_effects[]` as a constraint on the prose. The prose does not choose the variant, and the engine does not infer the authoritative effect from the rendered prose.

Replay equality at arc cadence depends on this phase: replaying the chain of chosen choices from genesis re-applies each PG's recorded `applied_effect_variant` deterministically. Beat-internal mutations, intermediate fact-claims, and intermediate emotional-state shifts are not authoritative for replay; only `arc.effect_model.variants[<chosen>].required_effects[]` is authoritative. This is a deliberate relaxation of per-op replay discipline because the arc is the unit of state transition, not the beat.

## Phase 4.5: Mystery Resolution Authority

A mystery resolution is not always a canon-promotion event. Branches may produce **apparent** resolutions (the cast believes the mystery is solved but it's not authoritative) or **branch-local counterfactual** resolutions (the branch is exploring "what if it turned out X?" without committing it to world canon). Forcing every interesting branch to route through `canon-addition` collapses the counterfactual nature of branches.

The selected storylet's `mystery_safety.M_resolution_claims` enumerates per-M resolution authority. Routing per claim:

| `resolution_authority` | Routing | Resulting SF epistemic_class | World M status updated |
|---|---|---|---|
| `apparent` | Page-cycle continues. Cast (or some subset) believes the mystery resolved. | `apparent` or `belief` | no |
| `branch_local_counterfactual` | Page-cycle continues only if `STORY_KERNEL.counterfactual_mystery_mode == true`. The branch becomes a "what-if" exploration. | `objective` with `canon_relation: canon_divergent` or `canon_unknown` | no |
| `canon_candidate` | Page-cycle PAUSES. Hands off to `story-fact-promotion-to-canon` regardless of `execution_mode` (HARD-GATE preserved in EVERY mode). | On accept: SF mirrors the new CF with `derived_from_cf: <new-CF-id>` | yes (on user-approved promotion) |

A `forbidden`-status M is **never** resolved at any authority level — hard-rejected by storylet-pool-authoring's Phase 4 gates AND re-rejected here as defense-in-depth.

On promotion non-accept (user rejects via `story-fact-promotion-to-canon`'s HARD-GATE), the storylet is rejected and re-selection runs (Phase 4 re-runs with this storylet excluded).

**Sibling-handoff seam**: on `canon_candidate`, page-cycle PAUSES and presents a handoff message with the arguments to invoke `story-fact-promotion-to-canon` (`world_slug`, `story_slug`, `source_kind=mystery_resolution`, `source_m_id`, `resolving_page_id`, `promotion_branch_path`). The user separately invokes the sibling skill (worldloom skills are non-chaining); on its accept-flavored outcome, the user returns and Phase 4.5 resumes, mirroring the SF with `derived_from_cf: <new-CF-id>`. Pause-and-tell-the-user (rather than silent degrade to `apparent`) preserves the canon-mutation HARD-GATE invariant. A future delegation refactor is tracked at `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md`; until that lands, this pause shape is the correct posture.
