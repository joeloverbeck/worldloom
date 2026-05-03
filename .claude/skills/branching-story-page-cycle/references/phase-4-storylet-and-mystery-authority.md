# Phase 4: Storylet Selection (with Phase 4.5 Mystery Resolution Authority)

## Hard Filters (engine, deterministic)

A storylet is **eligible** if all of:
- `hard_preconds` are satisfied against the new state (after applying ProposedEvent).
- `cast_requirements` can be satisfied by `cast_present` ∪ {newly entering cast}.
- `location_requirements` are satisfied.
- `mystery_safety.forbidden_M_resolved == false`.
- If `mystery_safety.M_resolution_claims` is non-empty: routes per Phase 4.5.
- `content_intensity` is within ±1 band of story baseline (or matches `content_intensity_override`).
- Is not in the recent-history avoid list (last ~5 storylets — prevents immediate repetition).
- Is visible from this page's branch_path per the storylet's `visibility` block (per `references/pre-flight-and-prerequisites.md` §World-State Prerequisites).

## Salience Scoring (engine, deterministic)

```
score(storylet) =
+ 4.0 * obligation_relevance(storylet, open_obligations)
+ 3.0 * causal_relevance(storylet, pending_consequences)
+ 2.5 * character_goal_relevance(storylet, active_intentions)
+ 2.0 * reader_knowledge_relevance(storylet, reader_known_facts)
+ 1.5 * thematic_continuity(storylet, active_themes)
+ 1.5 * tension_fit(storylet, current_tension_target)
+ 1.0 * novelty(storylet, recent_history)
- 3.0 * contradiction_risk(storylet)
- 2.0 * unresolved_debt_increase(storylet)
- 1.0 * repetition_penalty(storylet)
```

The `governor_nudge` from the previous turn's Phase 6 (or, on first turn, from the bootstrap's storylet-pool seed bias) adjusts the weights — e.g., "story has 3 high-salience unresolved obligations and rising threat pressure; favor choices that pay off or escalate one of those" boosts `obligation_relevance` and `tension_fit` by 1.5x.

## Weighted-Pick from Top-K

Pick K = 5. Weight each by score (softmax-style). Sample one. **NEVER always-take-top** — predictability becomes brittleness; weighted-pick lets the story breathe while still favoring relevance.

## JIT Expansion Trigger

If no candidate scores above threshold (typically: top-K all score below `(median(score) + 1.0)`), AND the consequence-capacity check (Phase 3) passed only by JIT-generatable continuation, invoke `storylet-pool-authoring` as the **single-storylet JIT generator**:

- Call shape: `mode='jit'`, `parent_skill_invocation=true`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, `caller_state_snapshot=<this_state_snapshot>`, plus the current branch-local pool/OBL/CNSQ/THR/cast/recent-prose context already assembled by this phase.
- The delegated call returns exactly ONE approved SLT record plus its internal validation packet. The returned SLT carries `provenance.origin: runtime_jit`, `provenance.created_at_page: <this_PG_id>`, and `visibility.scope: branch_scoped`; a global-author-pool JIT result is structurally invalid.
- `storylet-pool-authoring` runs its Phase 4 9-gate set over the candidate, including mystery firewall, resolution-authority declaration, predicate parsability, and branch-contamination. Its Phase 5 diversity audit is bypassed because a single runtime storylet has no batch diversity surface.
- Selection then picks this JIT storylet. Phase 5 applies its effects, Phase 9 rechecks the full page-cycle validation gates, and Phase 11 writes the returned SLT-NNNN.yaml inside the same page-tick transaction as the new PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/CHC records.

JIT generation is not free — it expands the engine prompt budget and may produce lower-quality storylets than the author pool. `branching-story-health-audit` consumes the `flagged_for_audit` and high-JIT-rate signals.

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
