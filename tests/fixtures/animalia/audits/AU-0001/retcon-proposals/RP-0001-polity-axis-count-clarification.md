---
id: RP-0001
title: Polity-Asymmetric Axis Count Clarification (Inherited CH-0005/CH-0006 Drift)
proposed_status: clarification_annotation  # no CF status change; adds clarificatory annotations to CF-0031 and CF-0032 domain-file patches
type: clarification
statement: >
  The polity-asymmetric stress-register axis count in CF-0031- and CF-0032-era
  domain-file annotations (TIMELINE.md line 137; INSTITUTIONS.md lines 40 and
  169; CF-0031 and CF-0032 record prose in CANON_LEDGER.md) is corrected: at
  the time of CF-0031 adoption (CH-0005), FOUR parallel axes were already
  established (CF-0021 crafter-tolerance + CF-0024 mercenary-licensure +
  CF-0028/CF-0030 funder-primacy + CF-0031 contamination-registry), not three.
  The "three parallel polity-asymmetries" phrasing in these domain patches
  omitted CF-0028/CF-0030 funder-primacy (established CH-0004 as the third
  axis). At the time of CF-0032 adoption (CH-0006), the "mirror image of the
  three disagreement-asymmetries" framing likewise omitted CF-0028/CF-0030.
  This clarification is Type-A Clarificatory — makes explicit what was already
  implicitly true at CH-0005 and CH-0006 — and is issued per the explicit
  acknowledgement in PA-0006 (CH-0007 adjudication) that no correction was
  attempted at that time and a separate workflow would be required.
scope:
  geographic: global
  temporal: historical  # reaches back to CH-0005/CH-0006 state
  social: public
truth_scope:
  world_level: true
  diegetic_status: objective
domains_affected:
  - ledger_integrity
  - polity_asymmetric_stress_register
  - charter_era_regional_variation_pattern
prerequisites:
  - prior ledger state at CH-0006 (four axes actually established)
  - CH-0007 onward correctly count to five
distribution:
  who_can_do_it: [not_applicable]
  who_cannot_easily_do_it: [not_applicable]
  why_not_universal: [not_applicable]
costs_and_limits:
  - must preserve PA-0006 acknowledgement of inherited-drift status
  - must not silently rewrite TIMELINE / INSTITUTIONS prose; patch must carry attribution comment `<!-- clarified by CH-0011 (inherited CH-0005/CH-0006 drift) -->`
  - must not modify CF-0031 / CF-0032 `statement` fields themselves; scope of change is the domain-file patches those CFs generated
visible_consequences:
  - TIMELINE.md line 137 annotated — "three parallel polity-asymmetries" corrected to "four parallel polity-asymmetries (CF-0021 / CF-0024 / CF-0028+CF-0030 / CF-0031)"
  - INSTITUTIONS.md line 40 annotated — "a third axis of Charter-Era regional-variation friction" corrected to "a fourth axis" with explicit enumeration of the prior three
  - INSTITUTIONS.md line 169 annotated — "mirror image of the three disagreement-asymmetries CF-0021 / CF-0024 / CF-0028 / CF-0031" corrected to "mirror image of the four disagreement-asymmetries CF-0021 / CF-0024 / CF-0028+CF-0030 / CF-0031" (count corrected to match enumeration)
  - CF-0031 record prose in CANON_LEDGER.md receives a `modification_history` entry documenting the clarification
  - CF-0032 record prose in CANON_LEDGER.md receives a `modification_history` entry documenting the clarification
required_world_updates:
  - TIMELINE.md
  - INSTITUTIONS.md
  - CANON_LEDGER.md  # new CH-0011 change log entry + modification_history additions on CF-0031 and CF-0032
source_basis:
  direct_user_approval: true  # approved at AU-0001 Phase 13 HARD-GATE, 2026-04-19
  derived_from:
    - CF-0031
    - CF-0032
    - CH-0004  # the axis CH-0005/CH-0006 miscounted
    - PA-0006  # explicit prior acknowledgement of inherited drift
  audit_origin: AU-0001
  finding_id: F-02
contradiction_risk:
  hard: false
  soft: false  # correction of known inherited drift, not a new contradiction
notes: >
  PA-0006 §Adjudication (CH-0007) at line 296: "pre-existing ledger counting-
  drift ('three axes' prose while naming four) noted as inherited; not created
  by this CF. No correction attempted in this adjudication." This retcon card
  responds to that deferred correction. The card is Clarificatory (Type A) —
  it makes explicit what CH-0004's own CF-0028/CF-0030 adoption already
  established, and what CH-0007 onward correctly count. No world-identity
  change; no CF-statement change; the only changes are annotation patches in
  TIMELINE.md, INSTITUTIONS.md, CANON_LEDGER.md modification_history, and a
  new CH-0011 entry documenting the clarification.

# Retcon-specific fields
retcon_type: A  # Clarificatory
target_cf_ids:
  - CF-0031
  - CF-0032
severity_before_fix: 3
severity_after_fix: 1  # after correction, the inherited drift becomes cosmetic residue in modification_history — reduced to audit-trail note
audit_origin: AU-0001
finding_id: F-02
---

# RP-0001 — Polity-Asymmetric Axis Count Clarification

## Cited Finding

**F-02** (Severity 3, Category 4j Local/Global Drift + Rule 6 adjacent):
TIMELINE.md line 137, INSTITUTIONS.md lines 40 and 169, and CF-0031/CF-0032
record prose in CANON_LEDGER.md each describe the Charter-Era polity-asymmetric
stress register at the time of CF-0031 and CF-0032 as "three parallel
polity-asymmetries" or "three disagreement-asymmetries," omitting or miscounting
CF-0028/CF-0030 funder-primacy (established CH-0004 as the third axis). The
drift was explicitly acknowledged in PA-0006 (CH-0007 adjudication) as
inherited-from-CH-0005/CH-0006, with no correction attempted at that time.
CH-0007 onward correctly count to five; the inherited drift persists in the
named domain-file patches.

## Proposed Revision

### TIMELINE.md line 137 (CF-0031 Layer-4 bullet)

**Current**:
> "...inter-polity migration-gap extradition cases appear on magistrate dockets
> as a third axis of Charter-Era regional-variation friction alongside CF-0021
> crafter-tolerance and CF-0024 mercenary-licensure. Three parallel
> polity-asymmetries now constitute a recognizable Charter-Era stress register."

**Proposed**:
> "...inter-polity migration-gap extradition cases appear on magistrate dockets
> as a fourth axis of Charter-Era regional-variation friction alongside CF-0021
> crafter-tolerance, CF-0024 mercenary-licensure, and CF-0028/CF-0030
> funder-primacy. Four parallel polity-asymmetries now constitute a recognizable
> Charter-Era stress register. <!-- clarified by CH-0011 (inherited CH-0005
> counting-drift; original prose omitted CF-0028/CF-0030) -->"

### INSTITUTIONS.md line 40 (CF-0031 Law/Custom bullet)

**Current**:
> "...migration-gap extradition dispute class — a third axis of Charter-Era
> regional-variation friction alongside CF-0021 crafter-tolerance and CF-0024
> mercenary-licensure."

**Proposed**:
> "...migration-gap extradition dispute class — a fourth axis of Charter-Era
> regional-variation friction alongside CF-0021 crafter-tolerance, CF-0024
> mercenary-licensure, and CF-0028/CF-0030 funder-primacy. <!-- clarified by
> CH-0011 (inherited CH-0005 counting-drift) -->"

### INSTITUTIONS.md line 169 (CF-0032 Trade/Guilds subsection bullet)

**Current**:
> "The reciprocal circuit is an AGREEMENT pattern (cross-polity guild-internal
> coordination, mirror image of the three disagreement-asymmetries CF-0021 /
> CF-0024 / CF-0028 / CF-0031)..."

**Proposed**:
> "The reciprocal circuit is an AGREEMENT pattern (cross-polity guild-internal
> coordination, mirror image of the four disagreement-asymmetries CF-0021 /
> CF-0024 / CF-0028+CF-0030 / CF-0031). <!-- clarified by CH-0011 (inherited
> CH-0006 counting-drift; original prose enumerated four but called them
> 'three') -->..."

### CANON_LEDGER.md CF-0031 and CF-0032 records

Append `modification_history` entries on each, citing CH-0011 as the
clarification source with the same `<!-- clarified by CH-0011 -->` attribution.

### New CH-0011 Change Log Entry

Emit a new Change Log Entry documenting this clarification, with standard
9-field `retcon_policy_checks`, `change_type: clarification`, and explicit
reference to PA-0006's deferred-correction acknowledgement.

## Retcon Policy Checklist (with per-entry rationale)

- **`no_silent_edit`**: TRUE — every patch carries `<!-- clarified by CH-0011 -->`
  attribution; the CH-0011 change log entry documents the clarification fully;
  PA-0006's prior acknowledgement of the inherited drift is preserved and cited.
  **Rationale**: attribution-preserving patch pattern matches CH-0002 / CH-0004
  / CH-0005 precedent (existing `<!-- added by CF-NNNN -->` annotations in
  domain files); this extends the pattern to `<!-- clarified by CH-NNNN -->`
  for post-hoc corrections of inherited drift.

- **`replacement_noted`**: TRUE — both old and new count language are preserved
  in the CH-0011 record and in the `modification_history` entries on CF-0031
  and CF-0032. **Rationale**: no content is deleted; the "three" language is
  annotated as clarified-to-"four", with a cited reason (PA-0006's deferred
  correction). A reader who checks the provenance chain sees both the original
  drift and the correction.

- **`no_stealth_diegetic_rewrite`**: TRUE — this is a META-level audit-trail
  correction, not a world-level truth change. No diegetic claim is altered; no
  character, artifact, or in-world document has its content changed.
  **Rationale**: the world state at CH-0005 was already "four axes exist" per
  CH-0004's own CF-0028/CF-0030 adoption; the clarification aligns the prose
  counter with the state, not the other way around.

- **`no_net_contradiction_increase`**: TRUE — the correction RESOLVES a
  contradiction (TIMELINE line 137 "three" vs TIMELINE line 138 "formerly
  counted as three or four, now five"; INSTITUTIONS line 40 "three" vs
  INSTITUTIONS line 42 "fifth polity-asymmetric disagreement-axis...
  joining... CF-0028/CF-0030"), creating zero new ones. **Rationale**: the
  drift-to-current-state gap (one-axis miscount in two domain files) collapses
  to zero after patch; no other CF, invariant, or MR entry is affected by the
  change.

- **`world_identity_preserved`**: TRUE — the Charter-Era "polity-asymmetric
  stress register" is a load-bearing world pressure; this clarification
  strengthens it (accurate count) rather than weakening it. No invariant
  revision, no MR firewall change, no Cluster-firewall erosion.
  **Rationale**: accurate count preserves the "register STRAINS, does not
  break" reading. Miscounting downward (three when four) subtly understates
  the Charter-Era stress load; correcting upward restores the designed
  pressure.

## Downstream Updates (Files Requiring Patches if Retcon is Accepted)

- `TIMELINE.md` — line 137 annotation
- `INSTITUTIONS.md` — line 40 annotation and line 169 annotation
- `CANON_LEDGER.md` — new CH-0011 change log entry + `modification_history`
  appends on CF-0031 and CF-0032 records
- NO change to WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md,
  ECONOMY_AND_RESOURCES.md, MAGIC_OR_TECH_SYSTEMS.md, EVERYDAY_LIFE.md,
  GEOGRAPHY.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md

## Operator Notes for Canon-Addition

This card is Type-A Clarificatory and does NOT change any CF's `statement`,
`scope`, `status`, or `distribution` fields. It adds `modification_history`
entries to CF-0031 and CF-0032 and issues a new CH-0011 change log entry
documenting the clarification of inherited drift. The drift was explicitly
acknowledged in PA-0006 (CH-0007 adjudication) and deferred to a separate
workflow; this retcon card IS that separate workflow.

Critical-path decisions at canon-addition adjudication time:

1. Confirm CH-0011 uses the standard 9-field `retcon_policy_checks` schema
   (do NOT mirror CH-0010's drifted schema — see AU-0001 F-01).
2. Confirm the `<!-- clarified by CH-0011 -->` attribution pattern does not
   collide with existing domain-file attribution patterns; if collision, use
   `<!-- clarified by CH-0011 (inherited from CH-0005/CH-0006) -->` form.
3. The CF-0031 record prose inside CANON_LEDGER.md is ledger-locked and must
   NOT be edited in place; the `modification_history` append is the only
   legitimate write to the record itself.
