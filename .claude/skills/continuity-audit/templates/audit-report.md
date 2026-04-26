<!--
Audit Report — template (EMITTED by continuity-audit Phase 11 / Phase 13)

This file is the primary output artifact of a continuity-audit run. Written to:
  worlds/<world-slug>/audits/AU-NNNN-<YYYY-MM-DD>.md

Named sections below are load-bearing: future audit runs grep prior AU-NNNN
reports for cross-audit continuity (did AU-0003's recommendation get applied?).
Preserve section names verbatim when drafting a new audit. Field additions to
frontmatter are permitted; field deletions break the schema.

The <AU-NNNN>, <WORLD_SLUG>, etc. placeholders below are replaced by Phase 11
at draft time. Do NOT copy them literally into the written report.
-->

---
audit_id: AU-NNNN
world_slug: <world-slug>
date: YYYY-MM-DD
parameters:
  audit_scope: all                          # all | [list of category numbers 1-10]
  severity_floor: 3                         # 1-5, findings at or above this emit retcon cards
  focus_domains: []                         # optional list narrowing Phase 4
  trigger_context: periodic                 # post-canon-addition | pre-publication | periodic | user-suspected-contradiction
  recent_canon_addition_cutoff: ""          # CH-NNNN id OR ISO date; empty = full log
trigger_context: periodic
severity_floor: 3
categories_audited:                         # which of the 10 Phase 4 categories actually ran
  - 1   # Ontological Contradictions
  - 2   # Causal Contradictions
  - 3   # Distribution Contradictions
  - 4   # Timeline Contradictions
  - 5   # Institutional Contradictions
  - 6   # Everyday-Life Contradictions
  - 7   # Tone / Identity Drift
  - 8   # Mystery Corruption
  - 9   # Diegetic Leakage
  - 10  # Local/Global Drift
categories_deferred: []                     # list of {category_number, rationale} objects for Phase 1 deferrals
finding_count_by_severity:
  severity_1: 0
  severity_2: 0
  severity_3: 0
  severity_4: 0
  severity_5: 0
retcon_card_ids: []                         # list of RP-NNNN ids written to audits/AU-NNNN/retcon-proposals/
dropped_finding_ids: []                     # populated at Phase 13 from user's drop-list
dropped_card_ids: []                        # populated at Phase 13 from user's drop-list
user_approved: false                        # set true only at Phase 13 after HARD-GATE approval
---

# Continuity Audit AU-NNNN — <World-Slug-TitleCased>

**Date**: YYYY-MM-DD
**Trigger**: <trigger_context>
**Scope**: <all | "categories X, Y, Z">
**Severity floor for retcon-card emission**: <severity_floor>

One-paragraph executive summary: what this audit was run for, what it found at
the highest severity level, and how many retcon cards it produced. Written after
Phase 11 assembly completes; must cite the highest-severity finding's CF ids.

---

## Change Log Delta Trace

One subsection per CH-NNNN in the Phase 2 delta window. For each CH, record:

### CH-NNNN — <one-line summary>

- **affected_fact_ids**: [CF-NNNN, CF-NNNN, ...]
- **invariants_touched**: [ONT-N, CAU-N, ...] (or "none")
- **mystery_reserve_interactions**: narrows | expands | none
- **required_world_updates** (from the CH entry): [SEC-XXX-NNN, ...]
- **patch_attribution_status**: per SEC record in required_world_updates, does
  it carry the originating CF in its `touched_by_cf[]` array (verified via
  `find_sections_touched_by(cf_id)`)? Record each as `SEC-XXX-NNN: attributed`
  or `SEC-XXX-NNN: MISSING`. Missing bidirectional pointers feed Phase 4
  category 4j (Local/Global Drift) and Hidden Retcons candidate findings.

If the delta window is empty (no CHs since cutoff), record "Empty delta — no change
log entries newer than <cutoff>." Empty delta is legitimate, not a bug.

---

## Continuity Lint Sweep Summary

Phase 3 candidate-finding generator output. Run the 10 lint questions mechanically;
each question produces zero or more candidate anchors:

- **Q1** (recent change should now appear elsewhere): [anchors]
- **Q2** (capability become consequence-free): [anchors]
- **Q3** (institution failed to respond): [anchors]
- **Q4** (facts now redundant): [anchors]
- **Q5** (facts silently imply broader adoption): [anchors]
- **Q6** (regions under-updated after global change): [anchors]
- **Q7** (species/classes absent from consequences): [anchors]
- **Q8** (earlier facts need scoping/limiting/reclassification): [anchors]
- **Q9** (diegetic texts should be re-read as biased): [anchors]
- **Q10** (mysteries to protect from overexposure): [anchors]

Each anchor is a record id (CF-NNNN, M-NNNN, OQ-NNNN, ENT-NNNN, SEC-XXX-NNN,
DA-NNNN, CHAR-NNNN) or a record-plus-section reference (e.g., `SEC-GEO-007 ¶3`).
Un-anchored candidates are discarded — Phase 3 rule.

---

## Per-Category Findings

One subsection per audited Phase 4 sub-category. Categories in `categories_deferred`
are skipped here; they appear in the Categories Deferred section instead.

### 4a — Ontological Contradictions

For each finding:

#### F-NN — <one-line title>

- **Category**: 4a
- **Cited CFs / anchors**: CF-NNNN, SEC-XXX-NNN ¶N, M-NNNN, etc.
- **Description**: one-paragraph description of the contradiction, naming the specific
  invariant or CF statements in conflict.
- **Severity**: N (1-5)
- **Severity rationale**: one-line rationale citing the specific drift mechanism. Must
  name why this severity rather than an adjacent level (e.g., "Severity 3, not 4,
  because no other CF depends on the regional reading").
- **Prior audit reference**: AU-NNNN F-NN (if this finding was surfaced by a prior audit
  and was not resolved). Empty otherwise.

Repeat for 4b through 4j. Categories with no findings produce the subsection header
plus "No findings. Audited and clean." — do NOT omit the subsection, per guardrail
(empty findings are diagnostic signals).

---

## Burden Debt Trace

Phase 6 findings, separated because they cross-cut Phase 4 categories.

### F-NN — <one-line title>

- **Target CF (the capability drifting)**: CF-NNNN
- **Accepted stabilizers** (from CF's costs_and_limits and distribution.why_not_universal):
  [list]
- **Subsequent CFs treating target as consequence-free**: [CF-NNNN, CF-NNNN, ...]
- **SEC-record prose drifting from stabilizers**: [SEC-XXX-NNN ¶N, ...]
- **Severity**: N
- **Severity rationale**: one-line

---

## Update Priority List

Phase 10 bucketed list. Sort key: severity × domain_weight (invariants 3x >
mystery-reserve 2.5x > core-pressure 2x > ledger-integrity 1.5x >
single-domain 1x; unmatched findings default to single-domain 1x). Ties break
on finding_id ascending.

### now

Findings at severity ≥ 4, OR trigger_context: pre-publication with severity ≥ 3.

- **F-NN** (severity N): one-line summary → retcon card RP-NNNN (if emitted)

### next-batch

Findings at severity 3 (non-pre-publication).

- **F-NN**

### deferred

Findings at severity 2 (surfaced only; no retcon card unless severity_floor was lowered).

- **F-NN**

### cosmetic

Findings at severity 1 (report-body mention only).

- **F-NN**

---

## Retcon Proposals Index

One line per surviving RP-NNNN card. Links are relative paths so the index resolves
against the AU-NNNN-<date>.md file location. Dropped cards appear marked `(dropped by
user at Phase 13)` and carry no functional link.

| RP-NNNN | Card | Retcon Type | Target CFs | Severity Before → After | Finding |
|---------|------|-------------|------------|------------------------|---------|
| RP-NNNN | [link](./AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md) | A/B/C/D/E/F | CF-NNNN | N → M | F-NN |

If no retcon cards were emitted (all findings below severity_floor or all escalated
to "requires user design decision"), record: "No retcon cards emitted. See Per-Category
Findings and Update Priority List for surfaced issues."

---

## Self-Check Trace (Phase 9)

Each test records PASS with one-line rationale OR FAIL with the responsible loop-back
phase. Bare PASS is FAIL.

1. **Every finding cites anchor**: PASS — all F-NN entries carry either a CF id or a
   record-plus-section reference (e.g., SEC-XXX-NNN ¶N).
2. **Every severity has rationale**: PASS — every severity claim in the Per-Category
   Findings section has a rationale line.
3. **Retcon type matches repair**: PASS — spot-check of RP-NNNN cards against the
   Phase 7 mapping table.
4. **Retcon policy checklist is justified**: PASS — every RP-NNNN body carries
   one-line justifications, no bare booleans.
5. **No retcon increases net contradictions**: PASS — no escalations to "requires
   user design decision" OR [list of escalations].
6. **CF-schema parity preserved**: PASS — every RP-NNNN frontmatter carries the
   required CF-schema fields.

---

## Validation Trace (Phase 12)

Populated after Phase 12 runs, before Phase 13 commit.

**Per-finding tests**:

1. Citation completeness: PASS — <rationale>
2. Severity rationale: PASS — <rationale>

**Per-retcon-card tests**:

3. CF-schema parity: PASS — <rationale>
4. Retcon policy checklist complete: PASS — <rationale>
5. Retcon type conformance: PASS — <rationale>
6. target_cf_ids exist: PASS — <rationale>

**Audit-level tests**:

7. AU-NNNN uniqueness: PASS — <rationale>
8. finding_count_by_severity accuracy: PASS — <rationale>
9. retcon_card_ids matches card files: PASS — <rationale>
10. categories_deferred accuracy: PASS — <rationale>
11. Report body internal consistency: PASS — <rationale>

---

## Categories Deferred

Phase 1 deferrals with one-line rationale each. This section is critical for the
"no findings" misread prevention: a reader must be able to tell whether a category
was audited-and-clean (appears in Per-Category Findings with "No findings") or
never audited (appears here).

- **Category N — <name>**: deferred because <rationale from Phase 1>.

If no deferrals (audit_scope was `all` and no focus_domains narrowing), record:
"No categories deferred — full audit scope executed."
