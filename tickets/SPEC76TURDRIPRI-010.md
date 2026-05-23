# SPEC76TURDRIPRI-010: Health-audit skill — Reactivity Inertness sub-phase

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` (new audit sub-phase distinct from existing Phase 2l "Active-state underuse warnings")
**Deps**: archive/tickets/SPEC76TURDRIPRI-002.md, archive/tickets/SPEC76TURDRIPRI-006.md

## Problem

Even with the §7a active-pressure handling discipline structurally enforced by archive/tickets/SPEC76TURDRIPRI-006.md (`active_pressure_handling_discipline` validator), a branching-story bundle could still produce extended chains of pages where every `turn_driver.kind = player_action | player_write_in` despite the presence of high-urgency active non-player records (STPLAN with due step, STEMO at high intensity, CLK at threshold, THR active, STSEC reveal-ready). Each individual page would pass the per-page active-pressure handling validator (records correctly classified as `selected: no — player won`, `deferred`, or `rejected` per the player-action discipline added to SPEC-76 §3.3 Phase 0). But the chain-level pattern — 3+ consecutive pages with no non-player driver firing — is the reactivity-inertness shape the source report's §5.7 first identified, and the audit-side safety net for it. SPEC-76 §3.5 prescribes a new audit sub-phase "Reactivity Inertness" that scans the PG chain and emits a remediation-storylet-proposal card when 3+ consecutive pages match the pattern.

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 currently has 13 sub-phases (2a-2m): Replay events, Branch isolation, Debt health, Belief/visibility health, DA health, Mystery/canon safety, Continuation/terminal proof, Causal dependency health, Canon baseline drift, CLK/STSEC/STQ mechanism health, STPLAN/STEMO health, Active-state underuse warnings (Phase 2l), STCHAR authority health (Phase 2m). No existing "Reactivity Inertness" pass. Verified via reassess-spec Agent 2 in this session.
2. SPEC-76 §3.5 prescribes the new sub-phase verbatim, including the explicit distinction from Phase 2l (added during the reassessment): "This pass is distinct from the existing Phase 2l ('Active-state underuse warnings'): Phase 2l is per-page underuse detection, while Reactivity Inertness is a chain-level scan for consecutive non-player-driver absence. The two are orthogonal and run alongside each other; Reactivity Inertness is named explicitly as a new sub-phase (the bundle-implementation slice may number it Phase 2n or sequence it after Phase 2m STCHAR-authority health)."
3. **Cross-skill / cross-artifact boundary**: this skill consumes the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` (knows the §7a section + active-pressure table semantics). The Reactivity Inertness pass produces a remediation-storylet-proposal card (RSP) at the existing path convention `worlds/<slug>/stories/<story-slug>/audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md`. RSP cards are consumed by `commitment-block-authoring`'s `audit_repair` mode per FOUNDATIONS §Story Bundles §6 / story-state-contract §4. The shape under audit is the audit-pass procedure — chain-level PG scan + RSP emission, distinct from Phase 2l's per-page underuse detection.
4. **FOUNDATIONS principle**: Rule 5 (No Consequence Evasion) governs this ticket. The Reactivity Inertness pass is the audit-side safety net for chain-level non-player-driver absence; the structural fix is the active-pressure handling discipline (archive/tickets/SPEC76TURDRIPRI-006.md), and this audit pass complements it by detecting the chain-level pattern that per-page enforcement cannot see. Per the spec's §FOUNDATIONS Alignment table: "the audit emits a remediation-proposal, not a hard fail; the operator can dismiss with reason. The structural fix (active-pressure handling discipline) does not depend on the audit."

## Architecture Check

1. **Chain-level scan distinct from per-page Phase 2l**: Phase 2l (Active-state underuse warnings) detects per-page cases where active records aren't being exercised; Reactivity Inertness detects multi-page patterns where the player drives every turn despite non-player pressure being available. The two passes have orthogonal scopes (per-page vs chain-level) and orthogonal output (warning vs remediation-proposal card). Alternatives considered and rejected: (a) extend Phase 2l in-place to add chain-level scanning — rejected per SPEC-76 §3.5 explicit "new sub-phase" framing and the Q3=(a) reassessment decision; the two passes should be auditable as separate concerns; (b) defer Reactivity Inertness to a follow-up spec — rejected, the source report's §5.7 explicitly names this as the audit-side complement to the active-pressure handling discipline; deferring would leave the audit-side gap open.
2. **Remediation-proposal output, not hard fail**: per SPEC-76 §3.5 explicit guidance and the spec's §9 Risk "False reactivity in audit" mitigation — the pass emits an RSP card the operator can dismiss with reason; it is not a hard-fail gate. The structural fix (archive/tickets/SPEC76TURDRIPRI-006.md's validator) is the gate; this audit is the safety net.

## Verification Layers

1. **Invariant**: Reactivity Inertness sub-phase is added to the audit's Phase 2 sub-phases (e.g., Phase 2n or after Phase 2m) → grep-proof for the new sub-phase header.
2. **Invariant**: SKILL.md cites Phase 2l explicitly and names the orthogonality (per-page vs chain-level) → grep-proof for the Phase 2l reference + the orthogonality sentence.
3. **Invariant**: SKILL.md documents the 3+ consecutive pages threshold → grep-proof for "3+ consecutive pages" or equivalent phrasing.
4. **Invariant**: SKILL.md documents the RSP card emission as the output (not a hard fail) → grep-proof for "remediation-storylet-proposal" or "RSP".

## What to Change

### 1. Add the Reactivity Inertness sub-phase

Insert a new sub-phase in the audit's Phase 2 sequence (placement: after Phase 2m "STCHAR authority health", numbered Phase 2n or per the bundle-implementation's preferred numbering scheme). The sub-phase content follows SPEC-76 §3.5:

```
Phase 2n: Reactivity Inertness — scan the PG chain for sequences of pages where every
turn_driver.kind = player_action | player_write_in despite the presence of high-urgency
active non-player records (STPLAN with due step, STEMO at high intensity, CLK at
threshold, THR active, STSEC reveal-ready). Emit a remediation-storylet-proposal card
under audits/SAU-<integer>/remediation-storylet-proposals/ if 3+ consecutive pages
match the pattern. This is the audit-side safety net; the structural fix is the
active-pressure handling discipline (`active_pressure_handling_discipline` validator at
engine pre-apply time).
```

### 2. Cite Phase 2l explicitly

Add an orthogonality paragraph immediately after the new sub-phase declaration:

> This pass is distinct from the existing Phase 2l ("Active-state underuse warnings"): Phase 2l is per-page underuse detection, while Reactivity Inertness is a chain-level scan for consecutive non-player-driver absence. The two are orthogonal and run alongside each other — Phase 2l fires when an individual page has active records that aren't being exercised; Reactivity Inertness fires when a multi-page chain shows the player driving every turn despite non-player pressure being available.

### 3. Document the RSP card emission

Document the RSP card output shape per the existing convention at `worlds/<slug>/stories/<story-slug>/audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md`. The RSP card's content should name the page range that triggered the pattern, the active non-player records that were not selected as drivers, and a suggested storylet shape that would respond to the inertness (e.g., a `commitment-block-authoring` `audit_repair` candidate).

### 4. Update the audit-pass count or summary table (if present)

If the SKILL.md contains a summary table listing all Phase 2 sub-phases, add the new Reactivity Inertness row. Update any prose mentioning the audit-pass count (e.g., "13 sub-phases" → "14 sub-phases" if a count is named).

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- Contract amendments — ship in SPEC76TURDRIPRI-002.
- New structural validators (including `active_pressure_handling_discipline` per-page enforcement) — shipped in SPEC76TURDRIPRI-003 through archive/tickets/SPEC76TURDRIPRI-006.md.
- Existing-validator updates — ship in SPEC76TURDRIPRI-007.
- Turn-cycle skill Phase 0 — ship in SPEC76TURDRIPRI-008.
- Bootstrap skill §7a carve-out — ship in SPEC76TURDRIPRI-009.
- Phase 2l ("Active-state underuse warnings") modifications — explicitly NOT modified per Q3=(a) reassessment decision; Phase 2l remains as-is.
- `commitment-block-authoring` audit_repair flow changes to consume the new RSP card — out of scope; the existing RSP consumption convention already handles this audit's RSP cards.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Reactivity Inertness" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 2 matches (sub-phase header + cross-reference paragraph).
2. `grep -nE "Phase 2l" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 1 NEW match in the new Reactivity Inertness sub-phase context (orthogonality citation; the existing Phase 2l declaration is preserved).
3. `grep -nE "3\+ consecutive pages" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 1 match.
4. `grep -nE "remediation-storylet-proposal|RSP-" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 1 match (RSP emission documented).
5. Manual review confirms the new sub-phase reads coherently in the Phase 2 sequence (placement after Phase 2m or per the bundle-implementation's chosen numbering).

### Invariants

1. Reactivity Inertness is a new sub-phase, not a Phase 2l modification — preserves Phase 2l's per-page underuse semantics unchanged.
2. The pass emits RSP cards (not hard fails) per SPEC-76 §3.5 and the §9 Risk "False reactivity in audit" mitigation.
3. The 3+ consecutive pages threshold is documented and reproducible.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. The 4 grep-proofs enumerated in Acceptance Criteria, run as one batched command: `grep -nE "Reactivity Inertness|Phase 2l|3\+ consecutive pages|remediation-storylet-proposal|RSP-" .claude/skills/branching-story-health-audit/SKILL.md`
2. Manual review of the new sub-phase prose for placement coherence and Phase 2l orthogonality framing.
