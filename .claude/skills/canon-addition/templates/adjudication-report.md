<!--
Adjudication Report — template

Emitted by canon-addition at Phase 13a (accept branch) or Phase 12b (non-accept
branch). One report per proposal, filename: PA-NNNN-<verdict>.md under
worlds/<world-slug>/adjudications/. <verdict> uses underscore-separated form
matching established filesystem precedent: accept, accept_with_required_updates,
accept_as_local_exception, accept_as_contested_belief, revise_and_resubmit,
reject. (Example files on disk: PA-0001-accept_with_required_updates.md,
PA-0002-accept_with_required_updates.md, PA-0003-accept_with_required_updates.md.)

Matches canon-addition/SKILL.md §"Record Schemas". Sections marked (required)
must be present in every report. Sections marked (conditional) appear only
under the named condition.
-->

# Discovery (required)

<!--
This top-of-file index makes the adjudication record grep-discoverable by
future canon-addition runs. Populate at Phase 13a from the proposal's actual
touch surfaces. List one item per line under each tag so future runs can
grep `worlds/<world-slug>/adjudications/*.md` for "M-2", "ONT-1", "CF-0021",
etc. and find every prior adjudication that touched the same surface.
-->

- **mystery_reserve_touched**: [M-?, M-?]   <!-- e.g., [M-1, M-2, M-5, M-6] -->
- **invariants_touched**: [???-?, ???-?]    <!-- e.g., [ONT-1, ONT-2, CAU-1, SOC-4, AES-3] -->
- **cf_records_touched**: [CF-????]         <!-- new + modified, e.g., [CF-0021, CF-0022, CF-0023, CF-0003, CF-0004, CF-0008, CF-0019] -->
- **open_questions_touched**: [???]         <!-- list of OPEN_QUESTIONS.md sections committed or newly added -->
- **change_id**: CH-NNNN                    <!-- the Change Log Entry id this adjudication produced (accept branches only) -->

---

# Proposal (required)

- **Proposal ID**: PA-NNNN
- **Date**: ISO date
- **Source**: path to proposal_path OR "elicited via Phase 0 interview"

<!-- Verbatim copy of the proposed canon fact as stated by the user.
     If elicited via interview, the normalized one-paragraph statement. -->

## User-Stated Constraints

- Preferred scope:
- Desired rarity:
- Dramatic purpose:
- Revision appetite:
- Other:

---

# Phase 0–11 Analysis (required)

## Phase 0: Normalize the Proposal

### Statement

### Underlying World-Change

### Canon Fact Type(s)

### Additional Domain Files Loaded

## Phase 1: Scope Detection

- Geographic / Temporal / Social:
- Visibility / Reproducibility / Institutional awareness / Secrecy / Diffusion risk:

## Phase 2: Invariant Check

- Classification (compatible / local-only / belief-only / invariant-revised / incompatible):
- Invariants tested:
- Hard rejection triggers hit (if any):

## Phase 3: Underlying Capability / Constraint Analysis

## Phase 4: Prerequisites and Bottlenecks

## Phase 5: Diffusion and Copycat Analysis

## Phase 6: Consequence Propagation

### First-Order

### Second-Order

### Third-Order

## Phase 7: Counterfactual Pressure Test

### Stated Stabilizers

## Phase 8: Contradiction Classification

## Phase 9: Repair Pass

### Options Considered

### Options Declined (and why)

### Options Adopted (and what they preserve vs sacrifice)

## Phase 10: Narrative and Thematic Fit

---

# Phase 14a Validation Checklist (required for accept branches; conditional for non-accept)

<!--
Required for any accept-branch outcome (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES /
ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF). For non-accept outcomes,
populate the subset that was actually evaluated (Phase 13b runs a smaller checklist).

Each line records one of the 10 Phase 14a tests as PASS or FAIL with a one-line
rationale. A PASS without rationale is treated as FAIL. The user reads this
section at Phase 15a HARD-GATE; absent or undocumented validation breaks the
audit trail.
-->

- Test 1 (Rule 2 / domains_affected non-empty): PASS — <one-line rationale>
- Test 2 (Rule 1 / prerequisites + costs_and_limits + visible_consequences populated): PASS — <one-line rationale>
- Test 3 (Rule 4 / capability/artifact distribution.why_not_universal populated): PASS — <one-line rationale>
- Test 4 (Rule 5 / Phase 6 2nd+3rd-order consequences appear in CF or required_world_updates): PASS — <one-line rationale>
- Test 5 (Rule 6 / Change Log Entry retcon_policy_checks all true): PASS — <one-line rationale>
- Test 6 (Rule 7 / no unrepaired forbidden-answer collisions): PASS — <one-line rationale>
- Test 7 (Phase 12a Required Update List + Phase 13a patches present for every required_world_updates entry): PASS — <one-line rationale>
- Test 8 (Phase 7 stabilizers name concrete mechanisms; no hand-waves): PASS — <one-line rationale>
- Test 9 (Verdict reasoning cites specific phase findings; not vague): PASS — <one-line rationale>
- Test 10 (Rule 3 / no unmotivated superlative or ordinal claims in statement/visible_consequences/distribution; superlatives are either stabilizer-backed or softened to pragmatic-scale): PASS — <one-line rationale>

---

# Verdict (required)

**Verdict**: ACCEPT | ACCEPT_WITH_REQUIRED_UPDATES | ACCEPT_AS_LOCAL_EXCEPTION | ACCEPT_AS_CONTESTED_BELIEF | REVISE_AND_RESUBMIT | REJECT

---

# Justification (required)

<!-- Phase-cited reasoning. Every claim here must cite a specific phase finding.
     Vague verdicts are a Phase 14a/13b validation failure. -->

---

# Critic Reports (conditional — only if escalation gate fired)

## Continuity Archivist

## Systems/Economy Critic

## Politics/Institution Critic

## Everyday-Life Critic

## Theme/Tone Critic

## Mystery Curator

## Synthesis (Phase 6b)

<!-- Main agent's integration of the six critic reports. Follow this lightweight
     structure so synthesis is consistent across adjudications:

     **Convergent concerns**: <numbered list; each item names the critics that
     converge and the concern they share — e.g., "1. Rule 3 specialness-
     inflation via <surface> (Continuity Archivist, Politics/Institution,
     Theme/Tone, Mystery Curator)">

     **Productive tensions resolved**: <numbered list; each item names the
     tension between critics and how it was reconciled — e.g., "1. Critic A
     (Charter-Era consolidation reading) vs Critic B (antiquity mystery):
     resolved by distinguishing <X> from <Y>">

     **Required CF-language commitments arising from synthesis**: <bulleted
     list of specific sentences or clauses the CF record or domain-file
     patches must carry to address the convergent concerns; feeds Phase 9
     repair pass>

     Keep the synthesis tight — the critic reports themselves are appended
     above this section and carry the detail. -->

---

# Resubmission Menu (conditional — REVISE_AND_RESUBMIT only)

<!-- Explicit list of what would need to change for resubmission. Name specific
     scope narrowings, cost additions, reclassifications, or splits. Avoid
     vagueness; the user should be able to edit their proposal against this
     list and resubmit without further clarification. -->

---

# Why This Cannot Be Repaired (conditional — REJECT only)

<!-- Name the specific invariants, genre-contract elements, or mystery-reserve
     entries that forbid this fact within the current world. May recommend
     Mystery Reserve placement as an alternative. -->

---

# New Canon Fact Records (conditional — accept outcomes only)

<!-- Summary of each new CF record's id + title + status + scope. Full records
     live in CANON_LEDGER.md. -->

---

# Change Log Entry (conditional — accept outcomes only)

<!-- Summary of the new Change Log Entry's id + change_type + affected_fact_ids +
     downstream_updates. Full entry lives in the change log section of
     CANON_LEDGER.md. -->

---

# Required World Updates Applied (conditional — accept outcomes only)

<!-- List of domain files patched, with a one-paragraph summary of each patch. -->

---

# User Override (conditional — only if verdict was user-overridden at Phase 14b)

<!-- If the user overrode a non-accept verdict to accept at Phase 14b, this
     section logs: original verdict, user-provided override verdict, user's
     reasoning, and the converted accept-branch outputs. Rule 6 compliance:
     override is logged, not silent. -->
