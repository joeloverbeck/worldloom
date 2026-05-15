# SPEC30STOCONHAR-011: Saliency Selection Rationale + `saliency_starvation` Audit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle/SKILL.md` SE-emission prose + `branching-story-health-audit/SKILL.md` Phase 2 (no schema change)
**Deps**: None

## Problem

SPEC-28 D2 added `SE.commitment.selected_slt_id` and `selection_source` but no "why this block over other eligible high-salience blocks" rationale. When a high-urgency `OBL/CNSQ/THR/STINT` is repeatedly outranked by lower-urgency blocks, there's no recorded reason to surface to author or audit. This ticket adds the prose-only requirement (in `SE.world_logic_rationale`) and the `saliency_starvation` audit finding (warning).

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:205-208` carries the SPEC-28 D2 `commitment` block (`selected_slt_id`, `selection_source`, `alias_bindings`); `:214` carries `world_logic_rationale` as a required non-empty field. The existing surface is the right vehicle for selection rationale; no schema field is added.
2. Verified `branching-story-turn-cycle/SKILL.md` has an SE-emission section (Phase 5 / Phase 9 around SE emission per spec narrative). The new rationale-clause requirement extends that prose.
3. Verified `branching-story-health-audit/SKILL.md` Phase 2c (Debt health, line 178-182) already classifies debt salience via the `urgency` field on OBL/CNSQ/THR/STINT records. The `saliency_starvation` finding rides on the same salience model — high-urgency debts outranked across N consecutive pages.
4. Cross-skill / cross-artifact boundary under audit: the rationale spans turn-cycle (prose enforcement) + health-audit (replay flag); both read from `SE.world_logic_rationale` (existing field).
5. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) — recording the rationale when a high-salience debt is outranked is the structural alternative to silent prioritization. §6b firewall already audits prose for access citations; the same surface absorbs selection rationale.
6. HARD-GATE / Mystery Reserve firewall verification: this ticket adds a turn-cycle prose requirement and an audit-time warning. No canon-safety check is weakened.
7. Schema extension classification: NOT a schema extension. Schemas unchanged. The future-deferral note (spec D9 item 4) is captured here for traceability: if prose audit proves too fuzzy after first production stories, promote to structured `SE.commitment.selection_rationale` in a follow-up spec.
8. Adjacent contradictions classification: no cross-ticket dependencies; D9 is independent of D10 (no SREL surface), D8 (different concern; same prose vehicle but different content), and D5 (mystery surface, different concern).

## Architecture Check

1. Prose-only enrichment of `world_logic_rationale` keeps schemas minimal and reuses the existing required-clause surface. The alternative — a structured `SE.commitment.selection_rationale` field — would add a schema field for a discipline whose audit surface today is prose; spec explicitly prefers prose-only with structured-field deferred.
2. No backwards-compatibility shim: existing dry-runs gain a new lint-style check; existing SE records (none in production) need no migration.

## Verification Layers

1. Turn-cycle prose discipline → codebase grep-proof: `grep -nE "Selection Rationale|selection.{0,10}rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new requirement heading.
2. Audit finding → codebase grep-proof: `grep -n "saliency_starvation" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
3. Skill dry-run → turn-cycle dry-run: an SE selecting SLT-1 over SLT-2 produces `world_logic_rationale` naming both and explaining why SLT-1 won.
4. Skill dry-run → audit replay: a branch with OBL-1 (urgency: high) open across pages 5/6/7/8 while SLT-2/SLT-3 (urgency: medium) are selected without rationale → `saliency_starvation` (one finding citing OBL-1 with the four-page window).
5. FOUNDATIONS alignment check: Rule 6 prose at `docs/FOUNDATIONS.md` is unchanged; this ticket operationalizes the prose-rationale surface to record selection retcon attribution without modifying the source rule.

## What to Change

### 1. Turn-cycle SE-emission sub-section

In `.claude/skills/branching-story-turn-cycle/SKILL.md` (the SE-emission section around Phase 5 / Phase 9 per spec narrative), add a sub-section "Selection Rationale" requiring: when `selected_slt_id` was chosen *over* one or more eligible competing blocks of equal-or-higher local salience, `SE.world_logic_rationale` MUST include a clause naming why the selected block won. Example: *"selected SLT-12 over SLT-7 because SLT-7's `obligation_open(OBL-3)` predicate failed in current visibility state."* When selection is uncontested (only one eligible block), no clause is required.

### 2. Audit Phase 2 `saliency_starvation` finding

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 (an appropriate sub-section, e.g., adjacent to Phase 2c Debt health or as a new Phase 2 sub-section "Saliency Health"), add `saliency_starvation` (severity: warning). Replay SE records and flag patterns where a high-urgency `OBL / CNSQ / THR / STINT` remains open across N consecutive pages while lower-urgency blocks are repeatedly selected without `world_logic_rationale` citing the starvation. Tunable threshold (default `N=3`); document the threshold in the audit prose.

### 3. Future-deferral note in turn-cycle prose

Add a one-line internal note in the new Selection Rationale sub-section: *"Prose-only by current design; if audit-time prose matching proves too fuzzy after first production stories, the rationale gets promoted to a structured `SE.commitment.selection_rationale` field in a follow-up spec."* This makes the deferral traceable in the skill prose itself, not just the spec.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — SE-emission Selection Rationale sub-section + future-deferral note)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2 prose adds `saliency_starvation` with threshold `N=3`)

## Out of Scope

- Any structured `SE.commitment.selection_rationale` field (deliberately deferred; future-spec promotion path documented in the prose).
- Any change to `SE.commitment.selected_slt_id` / `selection_source` / `alias_bindings` semantics or schema.
- Cross-bundle saliency analysis (per-branch only).
- A new validator under `tools/validators/src/rules/` (audit surface is the agreed read).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "saliency_starvation" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
2. `grep -nE "Selection Rationale|selection.{0,10}rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new sub-section heading.
3. `grep -nE "N=3|three consecutive pages|three-page window" .claude/skills/branching-story-health-audit/SKILL.md` returns the threshold documentation.
4. `grep -n "selection_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the future-deferral note's anchor reference.

### Invariants

1. The `SE.world_logic_rationale` field is unchanged at schema level; it now also carries selection-rationale clauses when applicable.
2. Schema minimalism preserved — no `selection_rationale` field added.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and skill dry-run-based. Existing turn-cycle + health-audit dry-runs exercise the prose path.`

### Commands

1. `grep -nE "saliency_starvation|Selection Rationale|N=3|selection_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. The narrow command is correct because the change is skill prose only; no validator or schema surface to typecheck.
