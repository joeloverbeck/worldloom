# SPEC76TURDRIPRI-010: Health-audit skill — Reactivity Inertness sub-phase

**Status**: COMPLETED
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
5. Live implementation required one same-file contract hygiene update beyond the drafted Reactivity Inertness prose: the health-audit World-State Prerequisites still said the shared contract had "§7 eight hard gates" after archive/tickets/SPEC76TURDRIPRI-002.md introduced Gate 9. This ticket corrected that phrase to "§7 nine hard gates" in the same skill file. The HARD-GATE block was updated only to add the new Phase 2n completion requirement and the 13→14 sub-phase count; approval timing, write surfaces, and deliverable-summary approval semantics remain unchanged.

## Architecture Check

1. **Chain-level scan distinct from per-page Phase 2l**: Phase 2l (Active-state underuse warnings) detects per-page cases where active records aren't being exercised; Reactivity Inertness detects multi-page patterns where the player drives every turn despite non-player pressure being available. The two passes have orthogonal scopes (per-page vs chain-level) and orthogonal output (warning vs remediation-proposal card). Alternatives considered and rejected: (a) extend Phase 2l in-place to add chain-level scanning — rejected per SPEC-76 §3.5 explicit "new sub-phase" framing and the Q3=(a) reassessment decision; the two passes should be auditable as separate concerns; (b) defer Reactivity Inertness to a follow-up spec — rejected, the source report's §5.7 explicitly names this as the audit-side complement to the active-pressure handling discipline; deferring would leave the audit-side gap open.
2. **Remediation-proposal output, not hard fail**: per SPEC-76 §3.5 explicit guidance and the spec's §9 Risk "False reactivity in audit" mitigation — the pass emits an RSP card the operator can dismiss with reason; it is not a hard-fail gate. The structural fix (archive/tickets/SPEC76TURDRIPRI-006.md's validator) is the gate; this audit is the safety net.

## Verification Layers

1. **Invariant**: Reactivity Inertness sub-phase is added to the audit's Phase 2 sub-phases (e.g., Phase 2n or after Phase 2m) → grep-proof for the new sub-phase header.
2. **Invariant**: SKILL.md cites Phase 2l explicitly and names the orthogonality (per-page vs chain-level) → grep-proof for the Phase 2l reference + the orthogonality sentence.
3. **Invariant**: SKILL.md documents the 3+ consecutive pages threshold → grep-proof for "3+ consecutive pages" or equivalent phrasing.
4. **Invariant**: SKILL.md documents the RSP card emission as the output (not a hard fail) → grep-proof for "remediation-storylet-proposal" or "RSP".

## Landed Changes

### 1. Added the Reactivity Inertness sub-phase

Inserted Phase 2n after Phase 2m "STCHAR authority health". The new sub-phase follows SPEC-76 §3.5:

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

### 2. Cited Phase 2l explicitly

Added an orthogonality paragraph immediately after the new sub-phase declaration:

> This pass is distinct from the existing Phase 2l ("Active-state underuse warnings"): Phase 2l is per-page underuse detection, while Reactivity Inertness is a chain-level scan for consecutive non-player-driver absence. The two are orthogonal and run alongside each other — Phase 2l fires when an individual page has active records that aren't being exercised; Reactivity Inertness fires when a multi-page chain shows the player driving every turn despite non-player pressure being available.

### 3. Documented the RSP card emission

Documented the RSP card output shape per the existing convention at `worlds/<slug>/stories/<story-slug>/audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md`. The RSP card content names the page range that triggered the pattern, the active non-player records that were not selected as drivers, and a suggested storylet or repair-turn shape that responds to the inertness (for example, a `commitment-block-authoring` `audit_repair` candidate).

### 4. Updated the audit-pass count and summary surfaces

Updated the description, HARD-GATE phase-completion list, process-flow diagram, Phase 2 count prose, SAU report template, Rule 5 alignment prose, and FOUNDATIONS alignment table from the old 13-sub-phase surface to the new 14-sub-phase surface.

### 5. Truthed the shared-gate count in the health-audit prerequisite list

Updated the same skill's shared-contract prerequisite reference from "§7 eight hard gates" to "§7 nine hard gates" so the health-audit skill matches archive/tickets/SPEC76TURDRIPRI-002.md.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- Contract amendments — ship in SPEC76TURDRIPRI-002.
- New structural validators (including `active_pressure_handling_discipline` per-page enforcement) — shipped in SPEC76TURDRIPRI-003 through archive/tickets/SPEC76TURDRIPRI-006.md.
- Existing-validator updates — shipped in archive/tickets/SPEC76TURDRIPRI-007.md.
- Turn-cycle skill Phase 0 — shipped in archive/tickets/SPEC76TURDRIPRI-008.md.
- Bootstrap skill §7a carve-out — shipped in archive/tickets/SPEC76TURDRIPRI-009.md.
- Phase 2l ("Active-state underuse warnings") modifications — explicitly NOT modified per Q3=(a) reassessment decision; Phase 2l remains as-is.
- `commitment-block-authoring` audit_repair flow changes to consume the new RSP card — out of scope; the existing RSP consumption convention already handles this audit's RSP cards.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Reactivity Inertness" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 2 matches (sub-phase header + cross-reference paragraph).
2. `grep -nE "Phase 2l" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 1 NEW match in the new Reactivity Inertness sub-phase context (orthogonality citation; the existing Phase 2l declaration is preserved).
3. `grep -nE "3\+ consecutive pages" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 1 match.
4. `grep -nE "remediation-storylet-proposal|RSP-" .claude/skills/branching-story-health-audit/SKILL.md` returns at least 1 match (RSP emission documented).
5. Manual review confirms the new sub-phase reads coherently in the Phase 2 sequence after Phase 2m.

### Invariants

1. Reactivity Inertness is a new sub-phase, not a Phase 2l modification — preserves Phase 2l's per-page underuse semantics unchanged.
2. The pass emits RSP cards (not hard fails) per SPEC-76 §3.5 and the §9 Risk "False reactivity in audit" mitigation.
3. The 3+ consecutive pages threshold is documented and reproducible.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. The 4 grep-proofs enumerated in Acceptance Criteria, run as one batched command: `grep -nE "Reactivity Inertness|Phase 2l|3\+ consecutive pages|remediation-storylet-proposal|RSP-" .claude/skills/branching-story-health-audit/SKILL.md`
2. Stale-count/gate hygiene: `rg -n "13 structural|Thirteen sub-phases|Phase 2 \\[structural; default\\]: 13|§7 eight hard gates|eight hard gates|8 shared hard gates|eight shared" .claude/skills/branching-story-health-audit/SKILL.md` returns no matches.
3. Manual review of the new sub-phase prose for placement coherence and Phase 2l orthogonality framing.

## Outcome

Completed: 2026-05-23

Added Phase 2n: Reactivity Inertness to `.claude/skills/branching-story-health-audit/SKILL.md`. The health audit now checks for 3+ consecutive player-driven pages despite available high-urgency non-player pressure, records the branch/page/record evidence, and routes findings to RSP cards when remediation output is enabled. Updated the skill's structural phase count, process-flow diagram, SAU report template, Rule 5 alignment prose, and same-file shared-contract gate-count reference.

## Verification Result

- `grep -nE "Reactivity Inertness|Phase 2l|3\+ consecutive pages|remediation-storylet-proposal|RSP-" .claude/skills/branching-story-health-audit/SKILL.md` — PASS; found the Phase 2n listing and header, the Phase 2l orthogonality references, the 3+ consecutive pages threshold, and RSP/remediation-storylet-proposal output references.
- `rg -n "13 structural|Thirteen sub-phases|Phase 2 \\[structural; default\\]: 13|§7 eight hard gates|eight hard gates|8 shared hard gates|eight shared" .claude/skills/branching-story-health-audit/SKILL.md` — PASS; no stale owned-surface count/gate hits.
- Manual review — PASS; Phase 2n sits after Phase 2m, leaves Phase 2l's per-page underuse semantics unchanged, emits WARNING/RSP rather than hard fail, and preserves the health-audit HARD-GATE approval timing and write surfaces.

## Deviations

- Same-file hygiene widened the landed edit to update one stale "§7 eight hard gates" prerequisite phrase to "§7 nine hard gates"; this aligns the health-audit skill with archive/tickets/SPEC76TURDRIPRI-002.md and does not change this ticket's behavior beyond truthful guidance.
- No executable skill dry-run exists for `.claude/skills/branching-story-health-audit/SKILL.md` in this repo context, so verification is grep-proof plus manual contract review as planned.
