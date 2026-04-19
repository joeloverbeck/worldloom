# Example — post-canon-addition audit run

This example walks through a realistic continuity-audit invocation on a
synthetic world ("Ashen Dunes") after canon-addition accepted CH-0019, which
introduced a regional institutional CF. The trigger_context is
`post-canon-addition`; the cutoff is `CH-0018` (the CH immediately before
the new acceptance); the severity_floor is `3`; the audit_scope is `all`.

This example illustrates:
- Phase 2 change-log delta analysis on a narrow window (1 CH)
- Phase 4 sub-category passes producing findings of varying severity
- Phase 6 burden-debt analysis surfacing drift across prior canon
- Phase 7-8 producing a retcon card keyed to a severity-3 finding
- Phase 12 validation all passing
- Phase 13 deliverable summary and drop-list behavior

Worked input, intermediate phase output, and final artifacts are synthetic.
File paths reference `worlds/ashen-dunes/` as the hypothetical world directory.

---

## Parameters file — `briefs/ashen-dunes-audit-2026-04-19.md`

```markdown
audit_scope: all
severity_floor: 3
trigger_context: post-canon-addition
recent_canon_addition_cutoff: CH-0018
focus_domains: []
```

## Pre-flight Check output

- `worlds/ashen-dunes/` exists: YES
- 12 mandatory world files readable: YES
- Sub-directory listings readable when present: `characters/` (present, 7 dossiers),
  `diegetic-artifacts/` (present, 3 artifacts), `proposals/` (present, 2 open cards),
  `adjudications/` (present, 12 records), `audits/` (absent — this is the first
  audit; skill creates the directory at Phase 13).
- FOUNDATIONS.md loaded.
- AU-NNNN allocation: **AU-0001** (no prior audits).
- RP-NNNN range reservation: **RP-0001 through RP-0020** (no prior retcon cards
  anywhere in the world).
- Cutoff verification: `grep ^change_id: CH-0018 CANON_LEDGER.md` returns match
  at line 814. Cutoff valid.
- Templates loaded: `canon-fact-record.yaml`, `change-log-entry.yaml`,
  `audit-report.md`, `retcon-proposal-card.md`.

## Phase 2 — Change Log Delta Analysis

Delta window: CH entries newer than CH-0018. One CH in window:

### CH-0019 — "Scribes' Guild of the Ember Coast established"

- **affected_fact_ids**: [CF-0087 (new — the Guild institution), CF-0023 (existing
  — scripted-literacy distribution CF that the new institution references)]
- **invariants_touched**: DIS-2 (Literacy is elite) — the new CF is consistent
  (the Guild is an elite institution that PRESERVES the invariant by formalizing
  elite literacy control rather than expanding it). No invariant violations.
- **mystery_reserve_interactions**: none (CH-0019 does not touch M-1 or M-2,
  the two active mysteries in MYSTERY_RESERVE.md).
- **required_world_updates** (per CH-0019 entry): [INSTITUTIONS.md, EVERYDAY_LIFE.md,
  ECONOMY_AND_RESOURCES.md, TIMELINE.md].
- **patch_attribution_status**:
  - INSTITUTIONS.md: attributed (new `§Scribes' Guild` section carries
    `<!-- added by CF-0087 -->`).
  - EVERYDAY_LIFE.md: attributed (cluster updates carry attribution).
  - ECONOMY_AND_RESOURCES.md: attributed.
  - TIMELINE.md: **MISSING** — CH-0019 declared a TIMELINE update but the
    recent-past layer does not carry a Guild-founding-year entry. This is a
    Phase 4 category 6 (Institutional Contradictions) candidate finding.

## Phase 3 — Continuity Lint Sweep

Selected non-empty questions (questions with no anchors return empty, not shown):

- **Q1** (recent change should appear elsewhere): TIMELINE.md §Recent Past is
  missing a Guild-founding entry despite CH-0019's required_world_updates list
  naming TIMELINE.md. → feeds 4e.
- **Q2** (capability consequence-free): CF-0051 ("itinerant scribes"), accepted
  at CH-0007, has not been cross-referenced by any subsequent CF despite CF-0087's
  Guild explicitly monopolizing scripted literacy in the Ember Coast region. →
  feeds Phase 6.
- **Q6** (regions under-updated after global change): none — CH-0019 is regional,
  not global.
- **Q10** (mysteries to protect): CF-0087's `notes` field touches on "the Guild's
  foundational archive, sealed to all but Guild Masters" — is this adjacent to
  M-2 (the lost library of the First Cities)? Check needed. → feeds 4h.

## Phase 4 — Category Passes (selected, non-empty)

### 4a Ontological Contradictions

No findings. Audited and clean. (CF-0087 introduces an institution, not an
entity or metaphysical rule; no ontological conflict possible.)

### 4e Institutional Contradictions

#### F-01 — "TIMELINE.md missing Guild-founding entry despite CH-0019's required update"

- **Category**: 4e
- **Cited CFs / anchors**: CF-0087; CH-0019 §required_world_updates;
  TIMELINE.md §Recent Past ¶1-4 (no mention of Guild founding).
- **Description**: CH-0019's change log entry lists TIMELINE.md in
  `required_world_updates` and notes the Guild's founding as a Recent Past
  event. TIMELINE.md §Recent Past contains four paragraphs covering the last
  50 years; none mentions the Guild. The prose gap means an in-world observer
  reading TIMELINE.md would not know the Guild exists — an institutional
  contradiction at the ordinary-readability level.
- **Severity**: 3
- **Severity rationale**: Structural Tension — a domain file must be revised.
  Not severity 4 (World-Identity Risk) because the Guild's existence is
  cited elsewhere (INSTITUTIONS.md); TIMELINE.md simply omits the event.
- **Prior audit reference**: None (first audit).

### 4h Mystery Corruption

#### F-02 — "Guild 'foundational archive' language adjacent to M-2 forbidden-answers"

- **Category**: 4h
- **Cited CFs / anchors**: CF-0087 §notes ("the Guild's foundational archive,
  sealed to all but Guild Masters"); MYSTERY_RESERVE.md M-2 §forbidden-answers
  ("the library of the First Cities was not destroyed; it was sealed and its
  contents preserved").
- **Description**: CF-0087's notes describe a sealed archive kept by an elite
  order. This is *structurally* similar to M-2's forbidden-answer ("the First
  Cities library was sealed, not destroyed"). CF-0087 does NOT resolve M-2 —
  the Guild was founded 40 years ago; the First Cities fell 3000 years ago —
  but the pattern similarity invites in-world readers to draw a connection.
  The connection is not yet canonical and the language does not claim
  continuity, but the surface is close enough to warrant a scope clarification.
- **Severity**: 2
- **Severity rationale**: Soft Contradiction — lore now feels underexplained.
  Not severity 3 (Structural Tension) because no domain file must be revised
  — only CF-0087's notes field would benefit from an explicit disavowal
  ("the Guild claims no continuity with the First Cities library").
- **Prior audit reference**: None.

Below severity_floor (3); does NOT produce a retcon card but is surfaced in
the audit report.

### 4j Local/Global Drift

No findings. Audited and clean. (CF-0087 is scoped `regional` — Ember Coast —
and INSTITUTIONS.md prose consistently qualifies references.)

(Other categories — 4b, 4c, 4d, 4f, 4g, 4i — all returned "No findings.
Audited and clean.")

## Phase 6 — Burden Debt Analysis

### F-03 — "CF-0051 itinerant scribes capability has drifted into consequence-free territory"

- **Target CF**: CF-0051 ("itinerant scribes travel from settlement to settlement,
  offering literacy services for a fee")
- **Accepted stabilizers** (from CF-0051's costs_and_limits and distribution):
  - "itinerant scribe population <100 across the continent"
  - "fees prohibitive for ordinary laborers"
  - "guild-less scribes subject to harassment in city-states"
- **Subsequent CFs treating target as consequence-free**: CF-0065, CF-0072,
  CF-0087 — all three reference "scribes" generically without qualifying itinerant
  vs guild-affiliated. CF-0087 is the proximate trigger: the Guild now monopolizes
  scripted literacy in one region, which should *strengthen* the itinerant-scribe
  harassment condition, but CF-0087's notes treat guild-less scribes as "competitors"
  rather than "harassed".
- **Domain-file prose drifting from stabilizers**: INSTITUTIONS.md §Scribes' Guild
  ¶3 describes "competitive tension with unaffiliated scribes" — softer than the
  stabilizer's "harassment".
- **Severity**: 3
- **Severity rationale**: Structural Tension — CF-0051's stabilizer has effectively
  eroded; INSTITUTIONS.md needs to clarify whether Guild formation intensifies or
  softens the harassment pattern.

## Phase 7 — Repair Menu Application (for findings ≥ severity_floor 3)

Findings at or above severity_floor: F-01 (sev 3), F-03 (sev 3). F-02 is sev 2,
below floor — no repair assigned.

- **F-01**: Insert Historical Change. → retcon_type: **E** (Chronology).
  Add a TIMELINE.md §Recent Past entry for the Guild founding with cited year
  and founding circumstances.
- **F-03**: Add Institutional Response. → retcon_type: **D** (Cost).
  Update CF-0087's notes AND INSTITUTIONS.md §Scribes' Guild ¶3 to explicitly
  adopt CF-0051's harassment posture — the Guild intensifies existing harassment
  of itinerant scribes rather than competing on equal footing.

## Phase 8 — Retcon Card Drafting

### RP-0001 — "Add TIMELINE §Recent Past entry for Scribes' Guild founding"

(Full card frontmatter + body written to
`worlds/ashen-dunes/audits/AU-0001/retcon-proposals/RP-0001-guild-founding-timeline.md`.
Key fields: retcon_type: E, target_cf_ids: [CF-0087], severity_before_fix: 3,
severity_after_fix: 1, audit_origin: AU-0001, finding_id: F-01.
Retcon Policy Checklist: all five items with one-line justifications. Downstream
Updates: TIMELINE.md.)

### RP-0002 — "Clarify Guild posture toward itinerant scribes as harassment-intensifying"

(Full card written. retcon_type: D, target_cf_ids: [CF-0087, CF-0051],
severity_before_fix: 3, severity_after_fix: 1, finding_id: F-03.
Retcon Policy Checklist: all five items. Downstream Updates:
INSTITUTIONS.md, CF-0087 notes, CF-0051 modification_history entry.)

## Phase 9 — Self-Check Trace

1. Every finding cites anchor: PASS — F-01, F-02, F-03 all carry CF ids and file
   anchors.
2. Every severity has rationale: PASS — each severity claim is followed by a
   one-line rationale citing the specific mechanism.
3. Retcon type matches repair: PASS — F-01's "Insert Historical Change" →
   retcon_type E; F-03's "Add Institutional Response" → retcon_type D. Both
   match the Phase 7 mapping.
4. Retcon policy checklist is justified: PASS — RP-0001 and RP-0002 each carry
   five one-line justifications.
5. No retcon increases net contradictions: PASS — both retcons resolve one
   existing soft contradiction and introduce zero new ones (scan against all
   87 CFs complete).
6. CF-schema parity preserved: PASS — RP-0001 and RP-0002 frontmatter carry
   all required CF-schema fields (id/title/proposed_status/type/statement/
   scope/truth_scope/domains_affected/source_basis/required_world_updates).

## Phase 10 — Update Priority List

Sort key: severity × domain_weight. F-01 touches TIMELINE (core-pressure domain,
2x): score 6. F-03 touches INSTITUTIONS + CF distribution (invariants-touching via
DIS-2, 3x): score 9. F-02 touches MYSTERY_RESERVE (2.5x): score 5.

- **now** (severity ≥ 4): none.
- **next-batch** (severity 3): F-03 (score 9), F-01 (score 6).
- **deferred** (severity 2): F-02 (score 5).
- **cosmetic** (severity 1): none.

## Phase 12 — Validation Trace

All 11 tests PASS with one-line rationale each. (Abbreviated for example.)

## Phase 13 — Deliverable Summary (presented to user)

- Audit report body: assembled.
- 2 retcon cards (RP-0001, RP-0002): full frontmatter + body shown.
- Retcon Policy checklists: 10 entries total (5 per card), all justified.
- Phase 9 self-check: 6 PASS. Phase 12 validation: 11 PASS.
- Categories deferred: none (full scope executed).
- Target write paths:
  - Report: `worlds/ashen-dunes/audits/AU-0001-2026-04-19.md`
  - Retcon cards: `worlds/ashen-dunes/audits/AU-0001/retcon-proposals/RP-0001-guild-founding-timeline.md`,
    `.../RP-0002-guild-harassment-posture.md`
  - INDEX.md: `worlds/ashen-dunes/audits/INDEX.md` (created fresh with header).

**User response**: "Approve as-is. No drop-list."

## Phase 13 — Write (executed after HARD-GATE approval)

Write order:
1. `worlds/ashen-dunes/audits/AU-0001/retcon-proposals/RP-0001-guild-founding-timeline.md`
   (create AU-0001/ and retcon-proposals/ subdirectories).
2. `worlds/ashen-dunes/audits/AU-0001/retcon-proposals/RP-0002-guild-harassment-posture.md`.
3. `worlds/ashen-dunes/audits/AU-0001-2026-04-19.md` (full report).
4. `worlds/ashen-dunes/audits/INDEX.md` (created with header
   `# Continuity Audits — Ashen Dunes` + blank line; one row appended).

INDEX.md content after write:

```markdown
# Continuity Audits — Ashen Dunes

- [AU-0001](AU-0001-2026-04-19.md) — post-canon-addition / sev-max 3 / 3 findings / 2 retcon cards
```

Report paths written. No git commit.

---

## Illustrative points for skill readers

1. **Deferred categories are visible** — every Phase 4 sub-category produces a
   subsection even when it has no findings. "4a Ontological Contradictions — No
   findings. Audited and clean." is the discipline that prevents "no findings"
   ambiguity. An empty category section signals audited-and-clean; a missing
   category section would signal never-audited, which is the dangerous misread
   the Categories Deferred section (bottom of report) exists to prevent.

2. **F-02 shows sub-floor-severity handling** — the finding is surfaced and
   recorded in the report body, but because severity 2 is below the
   severity_floor 3, no RP-NNNN is emitted. F-02 is not dropped or lost; it
   simply doesn't escalate to retcon-recommendation status. A user who later
   lowers severity_floor to 2 in a subsequent audit would re-surface F-02
   (and the new audit would cite this prior AU-0001 per the prior-audit-delta
   guardrail).

3. **F-03 demonstrates Burden Debt's distinctness from Phase 4** — F-03 is not
   a Phase 4 finding; it's a Phase 6 finding. CF-0051 was accepted cleanly and
   did not violate any category at that time. The drift accumulated across
   multiple subsequent CFs (CF-0065, CF-0072, CF-0087), none of which
   individually would have triggered a Phase 4 category check. Phase 6 is the
   only surface that catches this cumulative drift.

4. **Retcon cards are candidates, not canon** — the deliverable writes
   RP-0001 and RP-0002 to disk but neither is accepted canon. To accept them,
   the user runs `canon-addition` on each card separately:
   `/canon-addition ashen-dunes worlds/ashen-dunes/audits/AU-0001/retcon-proposals/RP-0001-guild-founding-timeline.md`
   canon-addition's Phase 0 Normalization treats the RP-NNNN card's
   `source_basis.direct_user_approval: true` as "reviewed and kept in the audit", NOT as canon
   acceptance — acceptance is canon-addition's Phase 11 verdict.

5. **Cards-first write order is partial-failure-safe** — if the run is
   interrupted after writing RP-0001 but before RP-0002, recovery is manual:
   either write RP-0002 manually and then the report+INDEX, or delete the
   AU-0001/ subdirectory entirely and re-run the skill (which allocates fresh
   AU-NNNN and RP-NNNN ids). The skill never retries automatically.
