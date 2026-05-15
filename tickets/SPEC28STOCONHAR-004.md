# SPEC28STOCONHAR-004: Count and citation cascade cleanup (completes SPEC-27 D6)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle` SKILL.md (HARD-GATE block count); `branching-story-health-audit` SKILL.md (sub-phase count + §4.5 → §4.6 citation correction).
**Deps**: SPEC28STOCONHAR-001

## Problem

SPEC-27 D6 added "Canon Baseline Drift" as `branching-story-turn-cycle`'s 7th turn-cycle-additional check (Phase 9) and `branching-story-health-audit`'s 8th structural sub-phase (2h) but left the summary-count prose stale:

- `branching-story-turn-cycle`'s HARD-GATE block still says "the 6 turn-cycle-additional checks" while Phase 9 enumerates seven.
- `branching-story-health-audit` still says "Seven sub-phases run in sequence" while its process flow lists 2a–2h (eight).

Separately, `branching-story-health-audit` cites the prose receipt as `§4.5`; `story-state-contract.md` defines the prose receipt at `§4.6`. SPEC-28 D4.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/branching-story-turn-cycle/SKILL.md`: the HARD-GATE block says "the 6 turn-cycle-additional checks" but Phase 9 lists seven (the 7th is "Canon Baseline Drift" landed by SPEC-27 D6 / SPEC27FOUCAN-006). Verified against `.claude/skills/branching-story-health-audit/SKILL.md`: "Seven sub-phases run in sequence" vs the actual `2a, 2b, 2c, 2d, 2e, 2f, 2g, 2h` enumeration in the process flow; the line citing prose receipt at `§4.5` should be `§4.6` (the prose receipt's actual section in `story-state-contract.md` per ticket 001 / D1 and the brainstorm verification).
2. Verified against `archive/specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` D6: D6 added "Canon Baseline Drift" as the seventh turn-cycle-additional check AND the eighth structural sub-phase (2h) but did not update the HARD-GATE summary count or the "Seven sub-phases" line — SPEC-28 D4 explicitly frames this ticket as completing SPEC-27 D6's incomplete cascade.
3. Cross-artifact shared boundary: this ticket touches `branching-story-turn-cycle/SKILL.md` and `branching-story-health-audit/SKILL.md` — the same two SKILL.md files that SPEC28STOCONHAR-002 (D2) and SPEC28STOCONHAR-003 (D3) touch, at different sections. D4 targets the HARD-GATE block (top-of-skill) of turn-cycle and the sub-phase-count overview line + the prose-receipt §-citation of health-audit; D2 / D3 target Phase 2 / Phase 4 of turn-cycle and replay / Phase 2d of health-audit. Different sections → parallel-safe edits; D4 lands last for clean rebase. The `§4.5 → §4.6` citation references the prose-receipt schema in `.claude/skills/_shared-templates/story-state-contract.md` (the same file ticket 001's D1 amends — D4's citation update is independent of D1's content change, but D1 should land first to settle the prose-attach deterministic-check count for the cross-file sweep below).
4. HARD-GATE enforcement surface: D4 edits the turn-cycle HARD-GATE block's count language but does not change HARD-GATE semantics — the Phase 9 checks already enumerate seven; the HARD-GATE block's count is being reconciled to match Phase 9's actual enumeration. Gate logic is unchanged; the Mystery Reserve firewall is untouched (the count fix is purely textual reconciliation of the summary count with the enumerated checks).

## Architecture Check

1. Reconciling the HARD-GATE count text to match Phase 9's actual enumeration (rather than removing "Canon Baseline Drift" from Phase 9, the alternative shape) is cleaner because SPEC-27 D6 deliberately added the 7th check; the staleness is in the summary count alone. The fix is textual and surgical — no semantic change.
2. No backwards-compatibility shims or alias paths — the stale counts and citations are corrected in place; no parallel "the old count was N" footnote is added.

## Verification Layers

1. turn-cycle count reconciled -> codebase grep-proof: `grep -n "6 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no hits; `grep -nE "7 turn-cycle-additional|seven turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least one hit.
2. health-audit sub-phase count reconciled -> codebase grep-proof: `grep -nE "Seven sub-phases|seven sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` returns no hits; `grep -nE "Eight sub-phases|eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` returns at least one hit.
3. prose-receipt citation reconciled -> codebase grep-proof: every `§4.5` reference to the prose receipt in `.claude/skills/branching-story-health-audit/SKILL.md` is replaced with `§4.6`.
4. Cross-file count sweep is clean post-D1 -> codebase grep-proof: any reference to prose-attach's deterministic-check count outside `branching-story-prose-attach` agrees with D1's post-001 count of 8 (most likely zero such references exist; the sweep is a discipline gate, not a behavior change).

## What to Change

### 1. Reconcile the turn-cycle HARD-GATE count

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, update the HARD-GATE block's "6 turn-cycle-additional checks" to "7" to match Phase 9's enumeration (which already includes "Canon Baseline Drift" per SPEC-27 D6).

### 2. Reconcile the health-audit sub-phase count and prose-receipt citation

In `.claude/skills/branching-story-health-audit/SKILL.md`, update "Seven sub-phases run in sequence" to "Eight sub-phases" to match the actual `2a–2h` enumeration (which already includes `2h` Canon Baseline Drift per SPEC-27 D6). Correct every reference to the prose receipt that cites it as `§4.5`; the prose receipt lives at `§4.6` in `story-state-contract.md`.

### 3. Cross-file sweep for prose-attach deterministic-check count

After D1 (SPEC28STOCONHAR-001) lands the prose-attach 7 → 8 bump, grep the story-pipeline surfaces for any reference to prose-attach's deterministic-check count outside `branching-story-prose-attach/SKILL.md` and update them to 8. Most likely zero such references exist (the brainstorm verification did not surface any cross-file citations of the prose-attach check count), but the sweep is part of D4's scope per SPEC-28.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- Any additional file surfaced by the §3 cross-file sweep — list at implementation time if any are found; if none are found, document the empty-sweep outcome in the implementation summary.

## Out of Scope

- The prose-attach-internal 7 → 8 deterministic-check count bump — that is SPEC28STOCONHAR-001 (SPEC-28 D1).
- The SE.commitment block and BEL.basis access routes — SPEC28STOCONHAR-002 and -003 (SPEC-28 D2 / D3).
- Adding new turn-cycle-additional checks or new health-audit sub-phases.
- Any change to the actual gate / sub-phase semantics — D4 is text-only reconciliation.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "6 turn-cycle-additional|six turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no hits; `grep -nE "7 turn-cycle-additional|seven turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` returns ≥1 hit.
2. `grep -nE "Seven sub-phases|seven sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` returns no hits; `grep -nE "Eight sub-phases|eight sub-phases" .claude/skills/branching-story-health-audit/SKILL.md` returns ≥1 hit.
3. `grep -nE "prose receipt.*§4\.5|§4\.5.*prose receipt" .claude/skills/branching-story-health-audit/SKILL.md` returns no hits; any prose-receipt section citation in this file reads `§4.6`.

### Invariants

1. The HARD-GATE block's count language in `branching-story-turn-cycle/SKILL.md` matches Phase 9's actual enumeration.
2. The sub-phase count language in `branching-story-health-audit/SKILL.md` matches the actual `2a–2h` enumeration.
3. Every reference to the prose receipt's contract section cites `§4.6` consistently.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "6 turn-cycle-additional|seven sub-phases|Seven sub-phases|§4\.5" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` (must return no hits after the ticket lands).
2. `grep -nE "7 turn-cycle-additional|Eight sub-phases|§4\.6" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` (must return hits).
3. A narrower command is the correct verification boundary: D4 is pure textual reconciliation across two SKILL.md files plus a discipline sweep; grep-proofs against those files fully cover the change.
