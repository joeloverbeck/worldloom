# Phases 4 and 5: Canon Safety Checks

Phase 4 is the per-storylet Canon Safety Check (9 gates per candidate). Phase 5 is the batch-level Canon Safety Check (six diversity-axis checks plus a batch-level branch-contamination audit, with audit-mode RSP visibility-match overlay).

## Phase 4: Per-Storylet Validation Gates (Canon Safety Check phase, per-storylet)

Each candidate SLT runs all **9** gates. A failed gate either HARD-REJECTs the candidate (replaced with a fresh seed from Phase 1's next-priority gap) or routes to revise (LLM re-prompted with the failure inlined; up to 2 retries per gate).

For `mode=jit`, run this structural precondition before gate 1: `visibility.scope` MUST be `branch_scoped`, `provenance.origin` MUST be `runtime_jit`, and `provenance.created_at_page` MUST equal the supplied `created_at_page`. Failure is a structural HARD-REJECT and re-prompt, not a new 10th gate. Gate 8 remains the general branch-contamination enforcement surface.

| # | Gate | Check | On fail |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | `mystery_safety.forbidden_M_resolved == false` AND no entry in `M_resolution_claims` whose `resolution_safety_per_M[m_id] == forbidden` per the whole-class M load | HARD-REJECT |
| 2 | Resolution-authority declaration (Rule 7) | For every `M_resolution_claims` entry: if `resolution_authority == canon_candidate` then `requires_canon_promotion == true` AND visibility scope MUST be `branch_scoped` (NEVER `global_author_pool`); if `apparent` or `branch_local_counterfactual` then `requires_canon_promotion == false` AND `resolution_safety_per_M[m_id] ∈ {low, medium, high}` matching the M record's actual `future_resolution_safety` | HARD-REJECT |
| 3 | Invariant compatibility (Rule 4) | Every entry in `fact_effects` and `relationship_effects` respects every INV record's `break_conditions` from the whole-class INV load | HARD-REJECT |
| 4 | Consequence capacity (Rule 5) | Applying the storylet's exit state to the bundle's current state leaves at least one continuation storylet eligible (in the current pool OR JIT-generatable per a brief LLM probe). Verified by a deterministic eligibility check over the post-application state-snapshot shape | HARD-REJECT or revise |
| 5 | Dedup | Candidate is not a near-duplicate of an existing pool entry. Similarity threshold: ≥80% overlap across the union of `hard_preconds` predicate-form set + `tone_tags` + `theme_tags` + `shape` + cast_required STENT ids | reject; replace with under-represented seed from Phase 1's gap matrix |
| 6 | Content-intensity coherence | Storylet's `content_intensity` is within the story's allowed range — `STORY_KERNEL.content_intensity_baseline` ± 1 band, further constrained by `content_intensity_override` when supplied. A `tame`-tagged storylet whose `fact_effects` describe explicit-band content fails here | HARD-REJECT or downgrade content_intensity |
| 7 | Predicate DSL parsability (Rule 1) | Every predicate in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions parses against the Predicate DSL grammar in `templates/predicate-dsl.md` (core forms + documented extensions; closed predicate forms/operators/enums plus documented open typed values) | HARD-REJECT (re-prompt LLM with grammar inlined) |
| 8 | Branch-contamination (Rule 4 at story scope) | If `visibility.scope == global_author_pool`, the storylet may NOT directly reference any story-local record id (`SF-NNNN`, `OBL-NNNN`, `STENT-NNNN`, `STOBJ-NNNN`, `STLOC-NNNN`, `SREL-NNNN`) whose `created_at_page` is non-null. Global storylets may use abstract role-matchers (`role:protagonist`), world/root facts, and STENT ids declared at bootstrap (i.e., `created_at_page == PG-0001` is permitted; later pages are not) | HARD-REJECT (force `visibility.scope: branch_prefix_scoped` or revise to abstract matchers) |
| 9 | Schema completeness (Rule 1) | All mandatory fields per `templates/storylet-record.yaml` are present, including the `mystery_safety`, `provenance`, and `visibility` blocks | revise (re-prompt LLM with explicit constraint) |

**HARD-REJECT vs revise**:

- **HARD-REJECT** → candidate does not enter pool; replaced with a fresh seed drawn from Phase 1's next-priority gap. Replacement seeds re-enter Phase 3.
- **revise** → LLM re-prompted with the failed gate's reason inlined; up to 2 retries per gate. After 2 failed retries on the same gate, the candidate is HARD-REJECTed.

**Whole-class loads from Pre-flight power gates 1, 2, and 3**: M-record full bodies for the `forbidden`-status check (gate 1) and the `resolution_safety_per_M[m_id]` cross-check against each M's `future_resolution_safety` (gate 2); INV-record full bodies for the `break_conditions` audit (gate 3). Without those whole-class loads, Phase 4 cannot honor its canon-safety contract.

## Phase 5: Diversity Audit (Canon Safety Check phase, batch-level)

Across the surviving SLT records in this batch, verify the batch-level checks that apply to its mode. **Seed/focus batches require six diversity-axis checks plus one batch-level branch-contamination audit before Phase 6. Audit batches bypass the six diversity axes but still require batch-level branch-contamination and RSP visibility-match PASS.**

For `mode=jit`, bypass Phase 5 diversity audit. A single runtime storylet has no meaningful batch diversity surface; Phase 4 gate 8 already covers the only branch-contamination check meaningful for one branch-scoped record. Record the bypass in the internal validation packet as `Phase 5: BYPASSED — single-storylet runtime JIT sub-routine`.

For `mode=audit`, bypass the six diversity-axis checks because the batch is target-shaped by RSP cards and often has one storylet per audit finding. Still run the batch-level branch-contamination audit and the audit-mode RSP visibility-match check below. Record the bypass as `Phase 5 diversity axes: BYPASSED — audit remediation batch shaped by RSP cards`.

### Diversity-axis checks

- **Shape distribution**: no single `shape` exceeds 40% of the batch (seed mode allows `entry_pressure + cast_introduction` combined up to 50% per the bootstrap-mix loading concentration).
- **Tone distribution**: no single dominant tone tag exceeds 40%.
- **Content_intensity distribution**: matches the per-band gap targets emitted by Phase 1 §Content_intensity gaps (NOT the abstract baseline distribution). A batch may legitimately be 0% in a band the existing pool already over-represents and heavily-biased toward a band the existing pool under-represents, provided the batch + existing-pool combined distribution converges toward the abstract baseline target (20/30/50 for `explicit` baseline, 30/50/20 for `mature` baseline, 60/30/10 for `tame` baseline; ±1 band per `content_intensity_override`). The baseline distribution is the convergence target across the pool's full lifetime; this batch's standalone distribution can deviate sharply from that target when Phase 1 diagnoses an over-representation in the existing pool that needs to be counter-biased.
- **OBL-engagement distribution**: in seed mode, batch must engage ≥60% of currently-open OBLs across `pays_off_obligations + complicates_obligations + transfers_obligations + opens_obligations`. In focus mode, batch MUST hit every `source_obligations` id at least once. When `mode=seed` and `source_obligations` is supplied (the seed-mode-with-source_obligations top-up shape), the seed-mode 60% threshold still applies — `source_obligations` narrows the FOCUS of new storylets but does NOT relax the diversity threshold. With narrow `source_obligations` (1–2 OBLs) on a story with many open OBLs, satisfying the 60% rule typically requires extending storylet engagement beyond the source set via natural cross-OBL coupling — e.g., a Marisa-phone storylet engaging both OBL-0006 (Marisa's surveillance secret, source-obligation territory) and OBL-0003 (Ane's day-pressure character_goal, naturally compounded by the phone landing); a McCarthy-anchor storylet engaging both OBL-0010 (Jon's discipline-load secret, source-obligation territory) and OBL-0002 (encounter reader_expectation, naturally complicated by the geometry-narrowing). This is expected behavior, not a relaxation of the rule. Precedent: SLB-0001 hit 87.5% (7/8) and SLB-0002 hit 75% (6/8) under similar narrow-source-obligations top-up conditions per their batch manifests.
- **Theme distribution**: no single theme tag exceeds 50%.
- **Cast usage**: no STENT whose `STORY_KERNEL.cast_bind_list` `role_in_story` is `protagonist`, `major`, or `antagonist` is engaged by zero storylets in the batch (engagement = appearance in `cast_required` or `cast_optional`). The `role_in_story` enum is defined by `branching-story-bootstrap` Phase 2 STENT binding as `protagonist | major | supporting | antagonist | foil`; the three load-bearing roles (`protagonist | major | antagonist`) are subject to this rule, while `supporting | foil` STENTs are exempt — supporting and foil cast can be engaged by zero storylets in a given batch without failing the diversity audit, because the pool's lifetime composition (across multiple batches) handles their coverage rather than any single batch.

### Batch-level branch-contamination audit

Beyond per-storylet branch-contamination (Phase 4 gate 8), the batch as a whole is audited:

- For every storylet with `visibility.scope: global_author_pool`: confirm that none of its `hard_preconds`, `soft_preconds`, `fact_templates`, `obligation_matchers`, `relationship_effects`, or `location_requirements` name a record id whose `created_at_page` is non-null.
- For every storylet with `visibility.scope: branch_prefix_scoped`: confirm `visibility.visible_branch_path_prefix` is a real prefix of at least one current branch's `branch_path`.
- For audit-mode batches: confirm every storylet's `visibility` block matches its source RSP card's `proposed_visibility` block — no audit-mode storylet silently defaults to `global_author_pool` when the RSP requested branch-local scope.

### Audit-mode RSP visibility-match check

For every `mode=audit` storylet:

- `provenance.origin` is `audit_remediation`.
- `provenance.source_audit` equals the source card's `audit_id`.
- `provenance.source_rsp` equals the source card's `rsp_id`.
- `visibility.scope` equals `RSP.proposed_visibility.scope`.
- `visibility.visible_branch_path_prefix` equals `RSP.proposed_visibility.visible_branch_path_prefix` whenever the RSP scope is `branch_prefix_scoped` or `branch_scoped`.
- `provenance.created_at_page` is null for `global_author_pool` and `branch_prefix_scoped`; for `branch_scoped`, it is the leaf page from the RSP-visible branch prefix or the specific leaf named in `target_branch`.

### On Phase 4 surplus

The +30% Phase 2 buffer (per `references/phase-2-generation-seeds.md`) is structural — it absorbs Phase 4 rejections so a single rejection does not force a stop-and-redraft cycle. When Phase 4 produces ZERO rejects (uncommon but observed in practice — e.g., SLB-0003 candidate set of 30 with 30 survivors), Phase 5 has a surplus of M survivors > `target_pool_size` and must cull down to target. **Cull on dedup-adjacency-against-existing-pool grounds**: rank survivors by their dedup-adjacency to the existing pool (most-adjacent first) and drop the top `M − target_pool_size` candidates. Each drop records a one-line rationale in the SLB manifest under a `## Phase 5 dedup-adjacency drops` table that names the dropped candidate's working title, shape, intensity, and the most-adjacent existing SLT id (the "reason" the drop was selected over a co-survivor). Worked precedent: SLB-0003 (red-bunny) culled 7 candidates from 30 → 23 on dedup-adjacency grounds (e.g., C11 dropped because SLT-0068's framing-test-against-specific-person captured the same vector at higher intensity; C26 dropped because SLT-0041's Pure-O-fires-on-wrong-cohort already covered the inverse alignment); the manifest's `## Phase 5 dedup-adjacency drops` table named each drop's adjacency-reason explicitly.

Over-deliver-all-M (return all 30 survivors when target is 23) is **NOT** a permitted alternative path — batch-size predictability is load-bearing for INDEX.md updates, ID-allocation arithmetic, and the `branching-story-health-audit` SAU-cross-batch reconciliation that reads SLB manifests by their declared `target_pool_size`. The user-facing `target_pool_size` in the audit's Phase 6 HARD-GATE summary IS the contract; surplus survivors must be culled to honor it.

This is a Phase 5 sub-step that fires AFTER the six diversity-axis checks pass and BEFORE the Phase 5b engine pre-validation. If the cull violates a diversity axis (e.g., dropping the only `confrontation`-shape survivor would push shape distribution to 0% in a band where the rule expects ≥1), prefer the next-most-adjacent drop instead and document the substitution in the manifest's drops table. After 2 cull-substitution iterations without convergence, escalate to the user via the same "diversity failure" path below.

### On diversity failure

- Replace overrepresented entries with under-represented shape/tone/intensity seeds drawn from Phase 1's gap matrix.
- Re-run Phase 3 + Phase 4 on the replacement seeds.
- Up to 2 diversity-correction iterations before escalating to the user with the failed axes inlined.
