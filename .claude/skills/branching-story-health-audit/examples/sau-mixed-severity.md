<!--
Worked example: a SAU-0003 audit on a hypothetical 47-page bundle with mixed
severities including one branch-isolation error, two coverage warnings, two
remediation cards, and one manual-intervention flag.

Illustrates: severity floors (branch-isolation = error), drop-list discipline
(F-04 dropped by user with reason marker preserved), prior-audit-delta
cross-reference (F-02 re-surfaces from SAU-0002), RSP card routing intent,
manual-intervention flag for findings without clean storylet remediation.
-->
---
audit_id: SAU-0003
story_slug: "the-marsh-vow"
world_slug: "fenmoor"
date: "2026-04-12"
audit_focus: all
severity_threshold: warning
branches_audited:
  count: 3
  leaf_ids: [PG-0042, PG-0047, PG-0031]
pages_walked: 47
finding_count_by_severity:
  error: 2
  warning: 4
  info: 1
flagged_pages:
  - page_id: PG-0023
    branch_leaf_id: PG-0047
    flagged_at: "2026-04-11"
high_jit_rate_branches:
  - branch_leaf_id: PG-0042
    jit_page_count: 7
    window_page_count: 20
    rate: 0.35
rsp_card_ids: [RSP-0001, RSP-0002]
dropped_finding_ids: [F-04]
dropped_card_ids: [RSP-0003]
prior_sau_referenced: [SAU-0002]
cross_story_scope: false
user_approved: true
---

# Story Audit SAU-0003

**Story**: `the-marsh-vow` in `fenmoor`
**Date**: 2026-04-12
**Audit focus**: all
**Severity threshold**: warning
**Branches audited**: 3 (paths: PG-0042, PG-0047, PG-0031)
**Pages walked**: 47
**Cross-story scope**: false

## Summary

| Severity | Count |
|---|---|
| ERROR   | 2 |
| WARNING | 4 |
| INFO    | 1 |

## Flagged Pages

- PG-0023 (branch PG-0047) — flagged at 2026-04-11

## High JIT-Rate Branches

- Branch leaf PG-0042: 7 of last 20 pages used runtime JIT expansion (35%)

## Out of Scope Due to Focus

N/A — audit_focus was all.

## Findings

### Errors

#### F-01: PG-0033 reaches OBL-0066 via SF-0089.evidence whose created_at_page is on sibling branch

- **Category**: branch_isolation_recursive
- **Branch**: PG-0042 (the leaf of branch B)
- **Pages affected**: PG-0033 (transitively); PG-0029 (the originating page for SF-0089)
- **Records affected**: SF-0089 (created on this branch), OBL-0066 (sibling branch B' — leaf PG-0047), SF-0089.evidence[2].event_id → SE-0044 (sibling)
- **Description**: Phase 4's recursive walk of `PG-0033.state_snapshot` reached `SF-0089` (legitimately created on this branch's `PG-0029`), then walked `SF-0089.evidence[2].event_id == SE-0044`. SE-0044 was created on sibling branch B' (its `created_at_page == PG-0019`, which is NOT in this branch's `branch_path`). Top-level provenance check at Phase 2 missed this because SF-0089 is on-branch; the leak is one hop deeper. Recursive reference closure violated.
- **Proposed remediation**: manual-flag (engine-level — RSP cards do not address structural-integrity bugs).
- **Prior audit reference**: none.

#### F-05: OBL-0042 (salience 9, urgency 7) has no payoff route in current pool

- **Category**: obligation_payoff_coverage
- **Branch**: PG-0047 (branch B' leaf)
- **Pages affected**: PG-0023 through PG-0047 (OBL-0042 has been open for 24 pages)
- **Records affected**: OBL-0042 (`type: protect-the-confidant`, `subjects: [STENT-0003]`)
- **Description**: Phase 3's obligation-payoff coverage check found zero compatible storylets in the current 38-storylet pool whose `pays_off_obligations` matcher matches OBL-0042's `type` + `subjects` constraints. JIT-probable check returned zero (the open OBL's predicate set requires a confidant-cast member who is currently 17 pages distant on this branch). With salience 9 + age 24 pages, this is a dead-end obligation: the branch cannot honor the promise the bootstrap installed.
- **Proposed remediation**: RSP-0001.
- **Prior audit reference**: none.

### Warnings

#### F-02: SLT-0019 over-used (selected in 7 of last 20 pages on branch B)

- **Category**: repetition
- **Branch**: PG-0042 (branch B leaf)
- **Pages affected**: PG-0023, PG-0026, PG-0028, PG-0033, PG-0036, PG-0039, PG-0042
- **Records affected**: SLT-0019 (`shape: relational_dynamics`, `tone_tags: [intimate, restrained]`)
- **Description**: Phase 5 storylet-reuse tabulation found SLT-0019 selected in 7 of the last 20 pages (35%, above the 25% threshold). Branch is at risk of pool homogenization at the active tip — re-surfaces from SAU-0002's F-07. Originally dropped by the user in SAU-0002 with reason "intentional thematic anchor; check again in 10 pages." Ten pages have passed; the over-use signal has continued.
- **Proposed remediation**: RSP-0002 (additional `relational_dynamics` storylets with adjacent tone-tags to dilute SLT-0019's selection rate).
- **Prior audit reference**: SAU-0002 (F-07).

#### F-03: high_salience_unpaid_count has been ≥4 for 14 pages on branch B

- **Category**: debt_level
- **Branch**: PG-0042 (branch B leaf)
- **Pages affected**: PG-0029 through PG-0042
- **Records affected**: OBL-0019, OBL-0027, OBL-0033, OBL-0042 (the four sustained-unpaid)
- **Description**: Phase 5's narrative-debt-evolution scan plotted `high_salience_unpaid_count` per page. Branch B has carried 4-5 high-salience open obligations for 14 consecutive pages (above the 10-page warning threshold). Combined with F-05's dead-end on OBL-0042, the branch's debt is structurally sustained and risks losing coherence.
- **Proposed remediation**: RSP-0001 closes OBL-0042 (largest contributor); other three obligations have viable existing payoff routes per Phase 3's coverage scan.
- **Prior audit reference**: none.

#### F-04: (dropped by user at Phase 9)

- **Original category**: relationship_continuity
- **Original severity**: warning
- **User reason**: "SREL-0007 between protagonist and the priest IS supposed to be stagnant — designing principle is 'intimacy advances only through forbidden practical cooperation,' and they have not yet co-operated. Re-check after the harvest sequence."

#### F-06: PG-0041 sits 2 bands away from baseline (mature → tame)

- **Category**: content_intensity_drift
- **Branch**: PG-0042 (branch B leaf)
- **Pages affected**: PG-0041
- **Records affected**: PG-0041 (`content_intensity: tame`)
- **Description**: Phase 4's content-intensity drift check found PG-0041 at `tame` band against bundle baseline `mature`. Single-page drift, not a sustained pattern (PG-0042 returned to `mature`). Recorded for visibility; not a sustained-drift `error`.
- **Proposed remediation**: none (single-page drift; no structural intervention needed).
- **Prior audit reference**: none.

#### F-07: THR-0004 (`type: threat`, status: pressured) has no closure path on branch B'

- **Category**: thread_coverage
- **Branch**: PG-0047 (branch B' leaf)
- **Pages affected**: PG-0019 through PG-0047 (THR-0004 has been pressured for 28 pages)
- **Records affected**: THR-0004 (`title: The Reeve's Investigation`)
- **Description**: Phase 3's thread-coverage scan found zero closure-candidate storylets in the current pool for THR-0004. Branch B' has carried this thread at `pressured` for 28 pages without escalation OR closure. Manual flag rather than `error` because branch-isolation closure paths exist in principle (the thread can resolve through cast cooperation), but no current storylet shape matches.
- **Proposed remediation**: manual-flag (recommended action: author a `thread_resolution`-shape storylet via storylet-pool-authoring `mode: focus, focus_area: thread_resolution_options`).
- **Prior audit reference**: none.

### Info

#### F-08: Pool under-utilization (12 of 38 pool storylets never realized on this bundle)

- **Category**: repetition (storylet-reuse sub-check)
- **Branch**: all-branches
- **Pages affected**: N/A (pool-wide)
- **Records affected**: 12 SLT records (list elided)
- **Description**: Phase 5's pool-utilization scan found 12 of 38 author-pool storylets never realized on any branch. Below the 30% under-utilization threshold; recorded as `info` for visibility.
- **Proposed remediation**: none (informational).
- **Prior audit reference**: none.

## Remediation Proposals Index

| RSP id | Title | Shape | Intensity | Target branch | Addresses findings |
|---|---|---|---|---|---|
| RSP-0001 | The Confidant's Return | thread_resolution | mature | PG-0047 (branch B') | F-05, F-03 |
| RSP-0002 | Quiet Provocation | relational_dynamics | mature | PG-0042 (branch B) | F-02 |
| RSP-0003 | (dropped by user at Phase 9) — would have addressed F-08 with three pool-fillers; user preferred to leave the pool slightly under-utilized as evidence of designing-principle constraint | | | | |

Routing: each non-dropped RSP-NNNN-<slug>.md card under `audits/SAU-0003/remediation-storylet-proposals/` is directly consumable as `storylet-pool-authoring`'s `source_audit_path` input in `mode=audit`.

## Manual Intervention Flags

- F-01: Branch-isolation breach via SF-0089.evidence[2] referencing SE-0044 on sibling branch. Action required: investigate engine bug; do NOT continue branch B until resolved. Likely cause: a recent `branching-story-page-cycle` run on branch B' wrote SE-0044 with output_records that this branch's SF-0089 was already citing — engine should have allocated a fresh SE for branch B's evidence chain. Recommend filing as engine ticket against `branching-story-page-cycle`.
- F-07: THR-0004 has no closure path. Action required: author one `thread_resolution`-shape storylet via `storylet-pool-authoring world_slug=fenmoor story_slug=the-marsh-vow mode=focus focus_area=thread_resolution_options source_threads=THR-0004`.

## Prior-Audit Delta

- F-02 re-surfaces from SAU-0002 (originally dropped by user with reason "intentional thematic anchor; check again in 10 pages"). 10 pages elapsed; over-use signal has continued; this audit re-emits.

## Health Snapshot at audit time

| Branch | Open OBL | High-salience unpaid | Avg OBL age | Tension (0..1) | Agency (0..1) |
|---|---|---|---|---|---|
| PG-0042 (branch B) | 11 | 4 | 14 pages | 0.78 | 0.62 |
| PG-0047 (branch B') | 9 | 3 | 19 pages | 0.84 | 0.55 |
| PG-0031 (branch C) | 7 | 2 | 8 pages | 0.45 | 0.81 |

## Notes

The branch-isolation breach at F-01 is the load-bearing finding — this is the kind of recursive-reference-closure violation that the proposal's primary structural check was designed to catch. Top-level provenance at Phase 2 was clean; the leak materialized one hop deeper through SF-0089's evidence chain. Without Phase 4's recursive walk, this would have stayed silent until a future cross-branch promotion attempted to canonize SF-0089 and found its evidence chain crossed branches.

User dropped F-04 with a designing-principle rationale that should be auditable in any future re-audit — the prior-audit-delta cross-reference will surface it again automatically if SREL-0007 stagnates beyond the user's "harvest sequence" expectation.

User dropped RSP-0003 because the pool-fill would have erased a deliberate designing-principle constraint. The audit's job is to surface; the user's job is to choose; F-08 stays in the report as an honest record of what was surfaced.
