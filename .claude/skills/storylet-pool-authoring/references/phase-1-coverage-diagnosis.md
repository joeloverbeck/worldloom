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

**Output**: a diagnosis matrix with rows {gap_kind, target_record_id, priority_weight, source_rsp?, source_audit?, finding_ids?} feeding Phase 2 seed selection.
