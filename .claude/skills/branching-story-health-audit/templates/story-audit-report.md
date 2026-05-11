<!--
Story audit report — template
Authored for branching-story-health-audit Phase 10 step 2.
Hybrid YAML frontmatter + markdown body. Direct-`Write` is the correct mutation
surface (audits/ lives outside _source/, so Hook 3 doesn't apply — parallels
continuity-audit's audit-report.md template).
Required sections are load-bearing — preserve verbatim so future audits' cross-
audit grep continues to work, and so re-reading a SAU report produces a
deterministic snapshot of the audit's findings at the moment it ran.
-->
---
audit_id: SAU-NNNN
story_slug: "<story-slug>"
world_slug: "<world-slug>"
date: "YYYY-MM-DD"
audit_focus: all                     # or one of the audit_focus enum values
severity_threshold: warning          # info | warning | error
branches_audited:
  count: 0
  leaf_ids: []                       # list of PG-NNNN leaf ids
pages_walked: 0
rendered_page_count: 0               # in-scope PGs with prose_status: rendered (or missing field — pre-PROSESPLIT grandfathered)
pending_page_count: 0                # in-scope PGs with prose_status: pending; excluded from prose-coupled sub-checks
pending_page_ids: []                 # list of PG-NNNN ids with prose_status: pending; informational only
story_kernel_sketch_status: unchecked   # unchecked | present | missing_legacy | missing_new_bundle | malformed | drift
story_kernel_discipline_status: unchecked # unchecked | present | missing_legacy | missing_new_bundle | incomplete | bare_pass | malformed
finding_count_by_severity:
  error: 0
  warning: 0
  info: 0
flagged_pages: []                    # page-cycle narrative_health.flagged_for_audit inventory; items carry page_id, branch_leaf_id, flagged_at if known
high_jit_rate_branches: []           # items carry branch_leaf_id, jit_page_count, window_page_count, rate
choice_cadence_summary: []            # per-branch arc-unit cadence metrics; no word-count metrics
arc_conformance_summary: []           # per-branch ARC_TRACE semantic critic, envelope, and realized-beat metrics
commitment_class_coverage_summary: [] # per-branch and bundle commitment_class distribution metrics
rsp_card_ids: []                     # list of non-dropped RSP-NNNN ids written under audits/SAU-NNNN/remediation-storylet-proposals/
dropped_finding_ids: []              # finding-IDs the user dropped at Phase 9 — still appear in body marked "(dropped by user at Phase 9)"
dropped_card_ids: []                 # RSP-NNNN ids the user dropped at Phase 9 — never written; appear here and in Remediation Proposals Index marked "(dropped by user at Phase 9)"
prior_sau_referenced: []             # SAU-NNNN ids cited by re-surfaced findings (prior-audit-delta cross-reference)
cross_story_scope: false
user_approved: true                  # always true on a written report — written only after Phase 9 ACCEPT
---

# Story Audit SAU-NNNN

**Story**: `<story-slug>` in `<world-slug>`
**Date**: YYYY-MM-DD
**Audit focus**: <focus>
**Severity threshold**: <threshold>
**Branches audited**: <count> (paths: <leaf id list>)
**Pages walked**: <count>
**Story kernel sketch status**: <unchecked | present | missing_legacy | missing_new_bundle | malformed | drift>
**Story kernel discipline status**: <unchecked | present | missing_legacy | missing_new_bundle | incomplete | bare_pass | malformed>
**Cross-story scope**: <true | false>

## Summary

| Severity | Count |
|---|---|
| ERROR   | N |
| WARNING | N |
| INFO    | N |

## Coverage

| Metric | Value |
|---|---|
| Total in-scope pages | N |
| Rendered pages | N |
| Pending pages | N |

**Pending pages** (when `pending_page_count > 0`): PG-NNNN, PG-NNNN, ...

### `pending_prose_count` (informational only)

When `pending_page_count > 0`, this section reproduces the load-bearing fact that `<N>` in-scope pages have `prose_status: pending` and their `pages-prose/PG-*.md` files were not read at Pre-flight. These pages were excluded from all prose-coupled sub-checks:

- Phase 3 mystery-firewall-vs-prose (prose-walking sub-step only; event-walking sub-steps still ran)
- Phase 3 prose-ledger consistency (entirely)
- Phase 4 content-intensity drift (entirely)
- Phase 5 similar-scene clustering (entirely)

Remediation: run `branching-story-page-prose-finalize` on each listed page to bring it into prose-coupled audit coverage on the next audit run. This entry is informational, NOT severity-bearing — it does not feed the severity histogram, does not block Phase 8 remediation proposals, and does not warrant an RSP card.

When `pending_page_count == 0`, record: "Coverage: <N> in-scope pages, all rendered." (For pre-PROSESPLIT bundles whose PG records lack the `prose_status` field, the audit treats them as `rendered` per the grandfather rule; the count appears under "Rendered pages" and the pending row is `0`.)

## Flagged Pages

- PG-NNNN (branch <leaf-id>) — flagged at <YYYY-MM-DD or unknown>

(empty section is recorded as "No flagged pages this bundle." — never silently omitted)

## High JIT-Rate Branches

- Branch leaf PG-NNNN: <count> of last 20 pages used runtime JIT expansion (<rate>%)

(empty section is recorded as "No high-JIT-rate branches this bundle." — never silently omitted)

## Out of Scope Due to Focus

- Branch leaf PG-NNNN — no flagged page in branch_path

(section appears only when `audit_focus=flagged_pages_priority`; otherwise record "N/A — audit_focus was <focus>.")

## Findings

### Errors

#### F-01: <one-line title>

- **Category**: <category; valid values include obligation_payoff_coverage, thread_coverage, character_motivation_coverage, mystery_firewall, prose_ledger_consistency, bootstrap_rule4_sketch_integrity, bootstrap_discipline_trace_integrity, branch_isolation_recursive, snapshot_integrity, consequence_coverage, choice_continuation_capacity, choice_pair_distance, choice_cadence, arc_conformance, commitment_class_coverage, relationship_continuity, storylet_scope_leakage, terminal_health, content_intensity_drift, canon_baseline_drift, repetition, debt_level>
- **Branch**: <branch_path leaf id> (or `all-branches` when shared across audited branches)
- **Pages affected**: <list of PG-NNNN ids>
- **Records affected**: <list of record ids — OBL-NNNN, THR-NNNN, M-NNNN, etc.>
- **Description**: <one paragraph; cites the structural rule violated and the specific evidence>
- **Proposed remediation**: <RSP-NNNN | manual-flag | none>
- **Prior audit reference**: <SAU-NNNN if this finding re-surfaces from an earlier audit; absent otherwise>

For `prose_ledger_consistency` findings, include page id, short prose excerpt, missing or violated state anchor (`cast_present`, `objective_facts`, `apparent_facts`, `disputed_facts`, `reader_known_facts`, `belief_state_by_actor`, DA content, or POV-accessible world context), and recommended remediation (`manual-flag` or page-cycle re-render). `prose_ledger_consistency` findings fire ONLY on pages with `prose_status: rendered` (or pre-PROSESPLIT grandfathered pages with no `prose_status` field); pending pages have no prose to compare against and are excluded from this finding type entirely — they are surfaced through the informational `pending_prose_count` Coverage entry instead. When the missing or violated state anchor is `reader_known_facts`, cite the SF id and the missing/invalid `visible_to_reader` / `reader_visibility_basis` value; clean reader-known grounding requires the cited SF to be in `reader_known_facts`, carry `visible_to_reader: true`, and use a positive basis (`shown_in_pg0001`, `known_to_pov`, `dramatic_irony`, or `diegetic_artifact_visible`). Grounded offstage references are not findings. Mystery-risk prose remains `mystery_firewall`, not `prose_ledger_consistency`.

For `bootstrap_rule4_sketch_integrity` findings, include `STORY_KERNEL.md`, `story_kernel_sketch_status`, compared THR/OBL ids, whether the bundle is new/uncertain or explicit legacy, and whether the finding is a new-bundle missing/malformed/drift issue or an info-only pre-`BSBOOT-007` legacy notation. Do not propose direct `STORY_KERNEL.md` mutation from the audit; remediation is manual/bootstrap review.

For `bootstrap_discipline_trace_integrity` findings, include `STORY_KERNEL.md`, `story_kernel_discipline_status`, the missing/malformed `discipline_validation_trace` check key(s), whether the bundle is new/uncertain or explicit legacy, and whether the finding is a new-bundle missing/incomplete/bare-PASS/malformed issue or an info-only pre-`BSBOOT-015` legacy notation. Do not propose direct `STORY_KERNEL.md` mutation from the audit; remediation is manual/bootstrap review.

For `choice_pair_distance` findings, include page id, both CHC ids, the same/different axis summary for `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change`, `choice_contract.success_policy`, `choice_mode`, and `poetic_effect`, whether at least one structural axis 1-6 differs, severity rationale, and recommended remediation (`branching-story-page-cycle` re-render / re-derive or manual intervention). Do not propose direct CHC mutation, CHC overwrite, or hand-edited persisted choice repair from the audit.

For `choice_cadence` findings, include branch leaf id, mean arcs between menus, counts of CONTINUE_ARC / CONTINUE_ONLY_PAUSE / INTERRUPT_HINGE pages, menu-emitting page ratio, cited `STORY_KERNEL.cadence_policy.max_arcs_without_menu_soft`, and severity rationale. Do not include word-count metrics.

For `arc_conformance` findings, include page id, ARCTRACE id, `semantic_critic_verdict.status`, offending `possible_violations[].envelope_item`, evidence_span, severity, and realized-beat evidence when relevant. High-severity envelope violations are always errors.

For `commitment_class_coverage` findings, include branch leaf id, realized-arc count, commitment_class distribution, missing commitment classes, over-represented class if any, and severity rationale.

(repeat per error finding)

#### F-NN: (dropped by user at Phase 9)

- **Original category**: <category>
- **Original severity**: error
- **User reason**: <one-line if user supplied; else "no reason given">

(dropped findings persist in the body — audits are epistemic artifacts; honesty about what was surfaced is load-bearing)

### Warnings

(same structure as Errors)

### Info

(same structure as Errors; only present when severity_threshold ≤ info)

## Remediation Proposals Index

| RSP id | Title | Shape | Intensity | Target branch | Addresses findings |
|---|---|---|---|---|---|
| RSP-0001 | <title> | <shape> | <intensity> | <branch_path or "all branches" or "global pool"> | F-NN, F-NN |

(dropped RSP rows appear with "(dropped by user at Phase 9)" inline)

Routing: each non-dropped RSP-NNNN-<slug>.md card under `audits/SAU-NNNN/remediation-storylet-proposals/` is directly consumable as `storylet-pool-authoring`'s `source_audit_path` input.

## Manual Intervention Flags

- F-NN: <description>; action required: <recommendation>

(empty section is recorded as "No manual intervention flags this audit." — never silently omitted)

## Prior-Audit Delta

- F-NN re-surfaced from SAU-NNNN (originally dropped by user / not yet remediated / new evidence in current state)

(empty section is recorded as "No prior-audit re-surfaced findings." when this is not the first audit on the bundle, OR "Initial audit on this bundle — no prior audits to compare against." when this IS the first audit)

## Choice Cadence

| Branch | Mean arcs between menus | Menu-emitting page ratio | CONTINUE_ARC | CONTINUE_ONLY_PAUSE | INTERRUPT_HINGE |
|---|---:|---:|---:|---:|---:|
| <leaf-id> | 0.00 | 0% | N | N | N |

(arc-unit metrics only; word-count metrics are not recorded)

## Arc Conformance

| Branch | ARC_TRACE count | Critic pass rate | Realized-beat rate | High envelope violations | Medium envelope violations | Low envelope violations |
|---|---:|---:|---:|---:|---:|---:|
| <leaf-id> | N | 0% | 0% | N | N | N |

(empty section is recorded as "No ARC_TRACE records available for audited branches." only for explicit legacy or no-trace bundles)

## Commitment-Class Coverage

| Scope | Realized arcs | Top commitment class | Missing commitment classes | Over-represented classes |
|---|---:|---|---|---|
| <leaf-id or bundle> | N | <commitment_class> (N) | <count or none> | <class list or none> |

## Health Snapshot at audit time

| Branch | Open OBL | High-salience unpaid | Avg OBL age | Tension (0..1) | Agency (0..1) |
|---|---|---|---|---|---|
| <leaf-id> | N | N | N pages | 0.00 | 0.00 |

(one row per audited branch)

## Notes

<free-form rationale; what the audit revealed; recommended next moves; any audit-time anomalies the auditor encountered (e.g., "Phase 4 recursive walk hit an unexpected number of orphan SREL records — investigate as separate ticket"); any cross-story-scope observations when cross_story_scope: true>
