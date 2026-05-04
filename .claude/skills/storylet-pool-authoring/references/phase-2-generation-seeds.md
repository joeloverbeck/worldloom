# Phase 2: Generation Seeds

Produce N seeds where N = `target_pool_size + ceil(target_pool_size * 0.30)` for seed/focus batches (the +30% buffer absorbs Phase 4 rejections). JIT and audit mode use their mode-specific seed sizing below.

Each seed names:

- **target OBL or THR engaged** (drawn from Phase 1's diagnosis matrix; `source_obligations`/`source_threads`, when supplied, override Phase 1 priority — those OBLs/THRs become mandatory targets).
- **shape** — one of the SLT shape enum (entry_pressure / cast_introduction / threat_escalation / relational_dynamics / routine_disruption / aftermath_sequel / reflection_dilemma / mystery_edge_brush / fork_recovery / thread_resolution / aftermath_residue / intimacy / confrontation / other), biased toward Phase 1's under-represented shapes.
- **tone register** — drawn from `STORY_KERNEL.tone_constraints` + Phase 1's tone-distribution gaps; `tone_override`, when supplied, biases the batch by ±1 register.
- **content_intensity band** — drawn from Phase 1's content_intensity gap analysis.
- **state preconditions** — implied predicates that must hold for the storylet to be eligible (Phase 3 will formalize them into the Predicate DSL).
- **core dramatic transaction** — what changes between the entry-state and exit-state of a page that realizes this storylet (one sentence).

Seeds are proposals, not yet structured records. They live only in the in-memory batch context until Phase 3 turns each into an SLT record.

**Bootstrap-mix shape weighting** (when `mode=seed` or `focus_area=bootstrap_mix`): apply the weighting from the proposal's bootstrap mix table — entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3.

**Precedence when both source-OBL/THR targeting and bootstrap-mix shape weighting apply** (typical seed-mode top-up shape — user supplied `source_obligations` or `source_threads` AND `mode=seed` triggers bootstrap-mix weighting). Mandatory targeting takes precedence: every seed must engage at least one of the supplied source ids via `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `opens_obligations`, or (for source_threads) `fact_effects` / `relationship_effects` that raise the thread's `current_pressure`. Bootstrap-mix shape proportions become advisory rather than required — if mandatory targeting forces a shape skew (e.g., source-OBL targeting a `secret`-type OBL pulls toward `relational_dynamics` / `intimacy` / `confrontation` shapes and away from `entry_pressure` / `cast_introduction`), Phase 5 §Shape distribution checks the batch alone (≤40% per shape) rather than the bootstrap-mix targets. The bootstrap-mix proportions remain authoritative ONLY for fresh-bundle seed mode (the `parent_skill_invocation: true` bootstrap sub-routine path) where no source-OBL/THR targeting is supplied.

**Focus-mode shape weighting** (when `mode=focus` and `focus_area` is a non-bootstrap_mix value): all seeds match the requested `focus_area`'s implied shape, with a 20% off-shape allowance for diversity (e.g., `focus_area=threat_escalation` → ~80% threat_escalation seeds + ~20% adjacent shapes per Phase 1's gap analysis).

**JIT-mode single seed** (when `mode=jit` and `parent_skill_invocation: true`): produce exactly ONE seed sized to the caller's continuation-failure context. `target_pool_size` must be 1. Shape distribution and +30% replacement buffering are bypassed because this is not a batch; the seed should address the failed eligibility / pending-consequence / required-aftermath condition that made page-cycle Phase 3 pass only by JIT-generatable continuation.

**Audit-mode RSP seeds** (when `mode=audit`): default `target_pool_size` to the number of validated RSP cards (one seed per card). If the user supplies a larger `target_pool_size`, distribute extra seeds across the RSP cards in deterministic card order so wide gaps can receive multiple variants without merging unrelated RSPs into one storylet. Each seed carries:

- `source_rsp` and `source_audit` from the RSP card.
- `shape` from `RSP.proposed_shape`.
- `content_intensity` from `RSP.proposed_intensity`, still constrained by Phase 4 gate 6 against the story baseline.
- target fields copied from the RSP card's non-null `target_obligation`, `target_thread`, `target_consequence`, and `target_relationship`.
- state preconditions seeded from `RSP.sketch.hard_preconds`; Phase 3 may elaborate but must preserve the RSP's intended conditions.
- fact/obligation/consequence/choice scaffolds seeded from `RSP.sketch.fact_effects`, `pays_off_obligations`, `opens_obligations`, `addresses_consequences`, and `choice_templates`.
- core dramatic transaction synthesized from `RSP.rationale` plus the `sketch` block, grounded in `STORY_KERNEL.tone_constraints`.
