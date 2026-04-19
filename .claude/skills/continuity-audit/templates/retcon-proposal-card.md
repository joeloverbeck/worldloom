<!--
Retcon-Proposal Card — template (EMITTED by continuity-audit Phase 8 / Phase 13)

This file is a candidate canon change produced by a continuity-audit run. Written to:
  worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md

CF-SCHEMA PARITY (load-bearing design constraint — preserve across schema evolution):
The frontmatter below is structurally parallel to templates/canon-fact-record.yaml.
Matching fields use matching names (type, scope, truth_scope, domains_affected,
distribution, costs_and_limits, visible_consequences, required_world_updates,
source_basis, contradiction_risk, notes) so that when canon-addition accepts an
RP-NNNN card, its Phase 0 normalization can field-copy from the card into a new
CF record rather than field-re-derive. Retcon-specific fields (retcon_type,
target_cf_ids, severity_before_fix, severity_after_fix, audit_origin, finding_id)
are additive — canon-addition consumes them at adjudication time and then discards
them from the emitted CF (they carry over into the Change Log Entry instead).

STATUS FIELD NAMING: this template uses `proposed_status` (not `status`) to make
the candidacy explicit at file-read time. A reader of this file should never
mistake it for an accepted CF — the `proposed_` prefix is the mnemonic. When
canon-addition accepts, it drops the prefix and writes `status` to the new CF.
For Type A Clarificatory retcons that do not change the target CF's status
(e.g., domain-file-patch clarifications, modification_history-only retcons),
use `proposed_status: unchanged` — canon-addition's Phase 0 Normalization treats
this as a signal to preserve the target CF's current `status` field unchanged.

SUB-DIRECTORY CONTEXT: RP-NNNN cards live under audits/AU-NNNN/retcon-proposals/
rather than in a flat cards/ directory, so each audit run's recommendations stay
grouped. Deleting a stale audit run's subdirectory is safe; deleting the audit
report without the subdirectory is not.
-->

---
id: RP-NNNN                                 # monotonic across all RP-NNNN cards globally in this world
title: ""                                   # short human label; same naming conventions as CF title
proposed_status: hard_canon                 # hard_canon | soft_canon | contested_canon | mystery_reserve | unchanged
                                            # (if different from target CF's current status, this retcon is a
                                            # re-classification — typically retcon_type: B or C)
                                            # `unchanged` means "same status as target CF" — use for Type A
                                            # Clarificatory retcons that modify domain-file patches or add
                                            # modification_history entries without changing the CF's status field.
type: ""                                    # matches CF types enum: capability | artifact | law | belief |
                                            # event | institution | species | ritual | taboo | technology |
                                            # resource_distribution | hidden_truth | local_anomaly | metaphysical_rule

statement: >
  The proposed REVISED statement for the target CF. One paragraph maximum.
  This is what the target CF's statement field should become if the retcon
  is accepted. Must be unambiguous enough for canon-addition's adjudicator
  to cite.

# Retcon-specific fields
retcon_type: B                              # A: Clarificatory | B: Scope | C: Perspective |
                                            # D: Cost | E: Chronology | F: Ontology
                                            # Must match the Phase 7 repair-menu-to-type mapping.

target_cf_ids:                              # CFs being modified by this retcon. Every id must exist in
  - CF-NNNN                                 # CANON_LEDGER.md (Phase 12 test 6 verifies this).

severity_before_fix: 0                      # 0-5 (see SKILL.md Phase 5 Severity Classification)
severity_after_fix: 0                       # projected severity if this retcon is accepted and downstream
                                            # updates applied

audit_origin: AU-NNNN                       # the audit run that produced this card
finding_id: F-NN                            # the finding within that audit run this card addresses

# CF-schema-parallel fields (match canon-fact-record.yaml for canon-addition field-copy)
scope:
  geographic: local                         # local | regional | global | cosmic
  temporal: current                         # ancient | historical | current | future | cyclical
  social: public                            # restricted_group | public | elite | secret | rumor

truth_scope:
  world_level: true                         # true | false | uncertain
  diegetic_status: objective                # objective | believed | disputed | propagandistic | legendary

domains_affected:                           # at least one — Rule 2 (No Pure Cosmetics)
  - labor

prerequisites: []                           # knowledge / tools / materials / conditions needed

distribution:                               # required for capability/artifact types — Rule 4 (No Globalization by Accident)
  who_can_do_it: []
  who_cannot_easily_do_it: []
  why_not_universal: []

costs_and_limits: []                        # stabilizers — Rule 3 (No Specialness Inflation)
                                            # For retcon_type: D (Cost Retcon), this field is typically
                                            # where the post-hoc burden lands.

visible_consequences: []                    # ordinary-life signals — Rule 5 (No Consequence Evasion)

required_world_updates: []                  # files that must be updated if canon-addition accepts this retcon.
                                            # canon-addition's Phase 12a will re-check this list against actual
                                            # patches it generates.
  # - INSTITUTIONS.md
  # - EVERYDAY_LIFE.md

source_basis:
  direct_user_approval: false               # set true at Phase 13 after HARD-GATE approval (means "user kept
                                            # this card in the audit's recommendations" — NOT "canon-addition
                                            # has accepted this retcon")
  derived_from:                             # parent CF ids this retcon modifies (usually matches target_cf_ids)
    - CF-NNNN

contradiction_risk:
  hard: false                               # does accepting this retcon create any hard-canon contradictions?
  soft: false

notes: >
  Free-form notes: the continuity-audit's reasoning for this repair choice,
  alternative repairs considered and rejected, any inherited-drift
  annotations (per SKILL.md Guardrails §Inherited-drift handling).
---

# RP-NNNN — <card title>

## Cited Finding

**Finding ID**: F-NN (from AU-NNNN)
**Category**: Phase 4 sub-category (e.g., 4j Local/Global Drift)

One-paragraph description of the finding as it appears in the audit report's
Per-Category Findings section. Quote or paraphrase the audit's description here
so the card is self-contained — canon-addition's adjudicator should not need to
open the parent audit report to understand the context.

## Proposed Revision

The precise text of what the target CF's statement should become, and which
other CFs (if any) need cross-referenced `modification_history` entries when
canon-addition processes this card.

**Target CF (CF-NNNN)** — statement revision:
> <the new statement text that would replace the current CF's statement>

**Other CFs requiring modification_history entries** (via canon-addition's
Phase 12a modification_history scan):
- CF-NNNN — <one-line describing what qualifies this CF under axis (a), (b), or (c)>

If no other CFs need modification_history entries, record "None — the target
CF is the sole affected record."

## Retcon Policy Checklist

Per FOUNDATIONS Rule 6 (No Silent Retcons) and SKILL.md Phase 8. Each item MUST
carry a one-line justification. Bare `true` / `false` fails Phase 9 test 4.

- [x] **no_silent_edit**: <one-line justification — e.g., "This retcon emits a
  Change Log Entry (via canon-addition) whose summary names the rewording and
  cites F-NN as origin.">
- [x] **replacement_noted**: <one-line — e.g., "The old statement is preserved
  in the target CF's modification_history; no content is deleted without
  replacement.">
- [x] **no_stealth_diegetic_rewrite**: <one-line — e.g., "World-level truth
  narrows from 'global' to 'regional' via explicit retcon_type: B, not via
  a diegetic text claiming the narrowing.">
- [x] **no_net_contradiction_increase**: <one-line — e.g., "Scanning proposed
  statement against all 47 CFs shows zero new contradictions introduced; the
  revision resolves 1 existing soft contradiction (F-NN).">
- [x] **world_identity_preserved**: <one-line — e.g., "The kernel's tonal
  contract and primary difference remain intact; this retcon narrows a detail
  rather than shifting the world's identity surface.">

If ANY checklist item would be `false`, the card CANNOT be emitted. Phase 8
rule escalates the finding to "requires user design decision" status in the
audit report, and no RP-NNNN id is consumed.

## Downstream Updates

Files requiring patches if canon-addition accepts this retcon. Matches the
frontmatter `required_world_updates` list — reproduced here with one-line
descriptions for the canon-addition adjudicator.

- **FILE.md**: <one-line describing what patch this file will receive — e.g.,
  "narrow Section 3 ¶2 from 'practiced across the continent' to 'practiced in
  the Eastern Reach'">

If no downstream updates are needed (pure clarificatory retcon with no
domain-file prose to adjust), record "None — the target CF's statement
revision is self-contained."

## Operator Notes for Canon-Addition

A brief paragraph the downstream canon-addition adjudicator will read at the
start of its Phase 0 Normalization. Include:

- The audit origin (AU-NNNN) and why this audit was run (trigger_context).
- The severity calculus: why severity_before_fix was assigned N and why
  severity_after_fix is projected as M.
- Critical-path decisions: any Phase 7 repair alternatives considered and
  rejected, and why the chosen repair is the lightest viable.
- Any inherited-drift annotations: if the finding surfaced pre-existing
  ledger inconsistency that this retcon does NOT silently correct, name the
  inheritance chain explicitly (per SKILL.md Guardrails §Inherited-drift
  handling).

This paragraph is advisory, not authoritative — canon-addition's Phase 0
Normalization treats retcon-card self-assessments as input to later phases,
not as findings (per canon-addition SKILL.md §"Proposal self-assessment is
advisory, not authoritative").
