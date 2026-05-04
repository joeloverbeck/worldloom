# Phase 1: Coverage Diagnosis

Scan the current pool and the open-state for thinness. Emit a structured diagnosis matrix that drives Phase 2 seed generation.

For `parent_skill_invocation: true` from `branching-story-bootstrap`, the "current pool" is empty because the story bundle is not on disk yet. Diagnose against the parent-supplied bootstrap state instead: initial THRs/OBLs, cast-bound STENT/STINT records, imported SFs, premise tone/themes, `mysteries_in_play[]`, and the loaded whole-class M/INV context. The bootstrap-mix weighting in Phase 2 supplies the shape-distribution target.

For `mode=audit`, the validated RSP card frontmatter IS the primary diagnosis. Emit one diagnosis-matrix row per RSP card:

```yaml
gap_kind: <obl_payoff_coverage | thr_coverage | cnsq_coverage | srel_continuity>
target_record_id: <RSP.target_obligation | RSP.target_thread | RSP.target_consequence | RSP.target_relationship>
priority_weight: max
source_rsp: <RSP.rsp_id>
source_audit: <RSP.audit_id>
finding_ids: <RSP.finding_ids>
```

Derive `gap_kind` from the first non-null target field in this priority order: `target_obligation` -> `obl_payoff_coverage`, `target_thread` -> `thr_coverage`, `target_consequence` -> `cnsq_coverage`, `target_relationship` -> `srel_continuity`. If multiple target fields are non-null, keep them all in the row as secondary targets, but use the first target for `target_record_id` and the row's primary `gap_kind`.

For `parent_skill_invocation: true` from `branching-story-page-cycle` with `mode=jit`, diagnosis is reduced to the single continuation failure that triggered JIT. Emit one row:

```yaml
gap_kind: continuation_failure
target_record_id: <caller_state_snapshot.current_storylet_eligibility_failure_reason.record_id | null>
priority_weight: max
```

Use `caller_state_snapshot.current_storylet_eligibility_failure_reason` when present; otherwise derive the row from page-cycle's Phase 3 consequence-capacity result and the failed Phase 4 eligibility/scoring context. Do not run a full pool-health scan or longest-branch recent-history scan inside this sub-routine; page-cycle has already assembled the relevant branch-local state.

**Diagnose**:

- **OBL coverage gaps**: which open OBLs have NO compatible storylet (no SLT in the current pool whose `pays_off_obligations`, `complicates_obligations`, or `transfers_obligations` matches the OBL by `type` + `subjects` + `constraints`)? Each uncovered OBL becomes a Phase 2 seed target.
- **THR escalation gaps**: which active THRs (status ∈ {`active`, `pressured`, `critical`}) have NO escalation storylet (no SLT whose `fact_effects` or `relationship_effects` raise this thread's `current_pressure`)? Each uncovered THR becomes a seed target.
- **Content_intensity gaps**: which `content_intensity` bands are under-represented relative to the story's `content_intensity_baseline`? Targets per baseline: `tame` baseline → 60% tame / 30% mature / 10% explicit; `mature` baseline → 30% / 50% / 20%; `explicit` baseline → 20% / 30% / 50%. `content_intensity_override`, when supplied, shifts the target distribution ±1 band.
- **Shape distribution**: which shapes are over-represented (>40% of pool)? Under-represented (<5%)? Over-represented shapes are deprioritized in Phase 2; under-represented shapes are prioritized.
- **Mystery-edge gaps**: which `mysteries_in_play[]` entries declared in `STORY_KERNEL.md` have NO storylet whose `mystery_safety.M_touched` or `M_progressed` cites them? Each gap is a candidate seed (subject to mystery firewall — `forbidden`-status M entries are NEVER seeded for resolution).
- **Recent-history repetition signal**: scan the last ~10 pages along the longest active branch_path; if any `shape` was used in 3 consecutive pages, mark it for Phase 2 deprioritization (avoid pool homogenization at the recently-active branch tip).

**Seed/focus-mode worked example** (paralleling the audit-mode example block above):

```yaml
- gap_kind: obl_payoff_coverage
  target_record_id: OBL-0010
  priority_weight: high
  source_obligation: OBL-0010
  rationale: "All 4 payoff modes covered structurally by SLT-0023/0024/0025/0026; gap is in real-time-discipline-load registers under post-PG-0003 conditions"
- gap_kind: obl_payoff_coverage
  target_record_id: OBL-0011
  priority_weight: high
  source_obligation: OBL-0011
  rationale: "All 4 permitted payoff modes covered; gap is in renunciation-without-touch + framing-test-against-specific-person registers"
- gap_kind: thr_coverage
  target_record_id: THR-0006
  priority_weight: medium
  source_thread: null
  rationale: "Pressured at 8; storylets must sustain or raise pressure unless paying off"
- gap_kind: content_intensity_distribution
  target_record_id: null
  priority_weight: medium
  rationale: "Match 20/30/50 explicit-baseline target; new batch ≈ 5 tame / 7 mature / 11 explicit for target_pool_size=23"
- gap_kind: shape_distribution_avoid_overflow
  target_record_id: null
  priority_weight: low
  rationale: "Existing pool already 8/45 reflection_dilemma (18%); cap new batch at ≤4 reflection_dilemma; bias toward intimacy / confrontation / fork_recovery / threat_escalation"
- gap_kind: mystery_firewall
  target_record_id: M-3
  priority_weight: hard
  rationale: "Forbidden-status saturation source; never theorize (firewall absolute)"
- gap_kind: mystery_firewall
  target_record_id: M-4
  priority_weight: hard
  rationale: "Forbidden-status intersex variant; never theorize (firewall absolute)"
```

In seed/focus mode the matrix rows are emitted in priority-weight-descending order (`hard` firewall rows first; then `high` OBL/THR coverage rows; then `medium` distribution-shape rows; then `low` deprioritization rows). The `priority_weight` enum is `hard | high | medium | low`. Optional fields (`source_obligation` / `source_thread` / `rationale`) appear when the operator's diagnosis has narrative detail worth preserving for cross-batch reproducibility; minimal-form rows carrying only `gap_kind` + `target_record_id` + `priority_weight` are also acceptable when the diagnosis is purely structural. The audit-mode and jit-mode shapes above remain authoritative for those modes; this seed/focus-mode shape is the diagnosis-row contract for the most-common direct-invocation path.

**Output**: a diagnosis matrix with rows {gap_kind, target_record_id, priority_weight, source_rsp?, source_audit?, finding_ids?, source_obligation?, source_thread?, rationale?} feeding Phase 2 seed selection.
