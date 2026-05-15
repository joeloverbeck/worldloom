# SPEC30STOCONHAR-011: Saliency Selection Rationale + `saliency_starvation` Audit

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle/SKILL.md` SE-emission / Phase 9 prose + `branching-story-health-audit/SKILL.md` Phase 2 + `SPEC-30` status note (no schema change)
**Deps**: None

## Problem

At intake, SPEC-28 D2 had added `SE.commitment.selected_slt_id` and `selection_source` but no "why this block over other eligible high-salience blocks" rationale. When a high-urgency `OBL/CNSQ/THR/STINT` was repeatedly outranked by lower-urgency blocks, there was no recorded reason to surface to author or audit. This ticket added the prose-only requirement in `SE.world_logic_rationale` and the `saliency_starvation` audit finding (warning).

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:205-208` carries the SPEC-28 D2 `commitment` block (`selected_slt_id`, `selection_source`, `alias_bindings`); `:214` carries `world_logic_rationale` as a required non-empty field. The existing surface is the right vehicle for selection rationale; no schema field is added.
2. Verified `branching-story-turn-cycle/SKILL.md` has an SE-emission section in Phase 6 and Phase 9 currently lists 9 turn-cycle-additional checks. The new rationale-clause requirement extends SE prose and adds a tenth Phase 9 additional check because selection-rationale presence is a turn-cycle validation discipline.
3. Verified `branching-story-health-audit/SKILL.md` Phase 2c (Debt health, line 178-182) already classifies debt salience via the `urgency` field on OBL/CNSQ/THR/STINT records. The `saliency_starvation` finding rides on the same salience model — high-urgency debts outranked across N consecutive pages.
4. Cross-skill / cross-artifact boundary under audit: the rationale spans turn-cycle (prose enforcement) + health-audit (replay flag); both read from `SE.world_logic_rationale` (existing field).
5. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) — recording the rationale when a high-salience debt is outranked is the structural alternative to silent prioritization. §6b firewall already audits prose for access citations; the same surface absorbs selection rationale.
6. HARD-GATE / Mystery Reserve firewall verification: `docs/HARD-GATE-DISCIPLINE.md` and `.codex/skills/implement-ticket/references/hard-gate-read-triage.md` were read because the turn-cycle `<HARD-GATE>` check count/list must move from 9 to 10 additional checks. The change adds a stricter Phase 9 check and leaves approval timing, write order, submit/validate semantics, approval-token behavior, and Mystery Reserve firewall behavior unchanged.
7. Schema extension classification: NOT a schema extension. Schemas unchanged. The future-deferral note (spec D9 item 4) is captured here for traceability: if prose audit proves too fuzzy after first production stories, promote to structured `SE.commitment.selection_rationale` in a follow-up spec.
8. Adjacent contradictions classification: no cross-ticket dependencies; D9 is independent of D10 (no SREL surface), D8 (different concern; same prose vehicle but different content), and D5 (mystery surface, different concern). Because the user explicitly supplied `specs/SPEC-30*`, `archive/specs/SPEC-30-story-contract-hardening-ii.md` is same-seam closeout scope for a dated D9 implementation note; broad row-by-row spec rewriting remains historical proposal context.
9. Proof-surface correction: the repo has skill prose but no executable skill dry-run harness in this Codex context. The acceptance surface is therefore manual contract review plus grep/stale-anchor proof over the edited skill/spec/ticket surfaces, not an executed turn-cycle or audit dry-run.

## Architecture Check

1. Prose-only enrichment of `world_logic_rationale` keeps schemas minimal and reuses the existing required-clause surface. The alternative — a structured `SE.commitment.selection_rationale` field — would add a schema field for a discipline whose audit surface today is prose; spec explicitly prefers prose-only with structured-field deferred.
2. No backwards-compatibility shim: future turn-cycle and health-audit runs gain a prose-level selection-rationale discipline; existing SE records (none in production) need no migration.

## Verification Layers

1. Turn-cycle prose discipline → codebase grep-proof: `grep -nE "Selection Rationale|selection.{0,10}rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new requirement heading.
2. Audit finding → codebase grep-proof: `grep -n "saliency_starvation" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
3. Manual contract review → turn-cycle Phase 6 / Phase 9 prose requires an SE selecting SLT-1 over SLT-2 to produce `world_logic_rationale` naming both and explaining why SLT-1 won.
4. Manual contract review → audit Phase 2 prose defines `saliency_starvation` for a branch with OBL-1 (urgency: high) open across pages 5/6/7/8 while SLT-2/SLT-3 (urgency: medium) are selected without rationale, producing one warning citing OBL-1 with the four-page window.
5. FOUNDATIONS alignment check: Rule 6 prose at `docs/FOUNDATIONS.md` is unchanged; this ticket operationalizes the prose-rationale surface to record selection retcon attribution without modifying the source rule.

## Landed Changes

### 1. Turn-cycle SE-emission sub-section

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, added a "Selection Rationale" subsection under SE materialization. When `selected_slt_id` is chosen over one or more eligible competing blocks of equal-or-higher local salience, `SE.world_logic_rationale` must name why the selected block won. When selection is uncontested because only one block is eligible, no clause is required.

### 2. Audit Phase 2 `saliency_starvation` finding

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2c, added `saliency_starvation` (severity: warning). The audit replays branch page chains and flags high-urgency `OBL / CNSQ / THR / STINT` records that remain open across `N=3` consecutive pages while lower-urgency blocks are repeatedly selected without `world_logic_rationale` citing why the high-urgency record was outranked.

### 3. Future-deferral note in turn-cycle prose

Added the prose-only deferral note in the turn-cycle Selection Rationale subsection, anchored on `SE.commitment.selection_rationale`.

### 4. SPEC-30 implementation note

Added a dated D9 implementation note to `archive/specs/SPEC-30-story-contract-hardening-ii.md`. The note records the landed skill surfaces, the 10 turn-cycle-additional checks count, the `N=3` audit threshold, and the unchanged schema / validator / patch-plan boundary.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — SE-emission Selection Rationale sub-section + future-deferral note)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2 prose adds `saliency_starvation` with threshold `N=3`)
- `archive/specs/SPEC-30-story-contract-hardening-ii.md` (modify — dated D9 implementation note)

## Out of Scope

- Any structured `SE.commitment.selection_rationale` field (deliberately deferred; future-spec promotion path documented in the prose).
- Any change to `SE.commitment.selected_slt_id` / `selection_source` / `alias_bindings` semantics or schema.
- Cross-bundle saliency analysis (per-branch only).
- A new validator under `tools/validators/src/rules/` (audit surface is the agreed read).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "saliency_starvation" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
2. `grep -nE "Selection Rationale|selection.{0,10}rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new subsection heading and Phase 9 check.
3. `grep -nE "N=3|three consecutive pages|three-page window" .claude/skills/branching-story-health-audit/SKILL.md` returns the threshold documentation.
4. `grep -n "selection_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the future-deferral note's anchor reference.
5. Manual review confirms `branching-story-turn-cycle` now lists 10 turn-cycle-additional checks and preserves HARD-GATE approval timing / patch submission behavior.

### Invariants

1. The `SE.world_logic_rationale` field is unchanged at schema level; it now also carries selection-rationale clauses when applicable.
2. Schema minimalism preserved — no `selection_rationale` field added.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and manual-review-based. No executable skill dry-run harness is available in this Codex context.`

### Commands

1. `grep -nE "saliency_starvation|Selection Rationale|N=3|selection_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. The narrow command is correct because the change is skill prose only; no validator or schema surface to typecheck.
3. Manual review of `.claude/skills/branching-story-turn-cycle/SKILL.md` confirms Phase 9 now lists 10 turn-cycle-additional checks and preserves HARD-GATE approval timing / patch submission behavior.

## Outcome

Completed. `branching-story-turn-cycle` now requires Selection Rationale in `SE.world_logic_rationale` when a selected `SLT` outranks eligible equal-or-higher-salience competitors, and Phase 9 now has 10 turn-cycle-additional checks. `branching-story-health-audit` now reports `saliency_starvation` in Phase 2c with an `N=3` consecutive-page threshold. `SPEC-30` now has a dated D9 implementation note.

## Verification Result

1. `grep -nE "saliency_starvation|Selection Rationale|N=3|selection_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — passed; returned Selection Rationale, `selection_rationale`, Phase 9 `saliency_starvation`, and health-audit `N=3` hits.
2. `grep -nE "10 turn-cycle-additional|Selection Rationale|saliency_starvation|D9 landed" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md archive/specs/SPEC-30-story-contract-hardening-ii.md` — passed; returned the updated HARD-GATE count, process-flow count, Phase 9 count, audit finding, and SPEC-30 D9 note.
3. `rg -n "9 turn-cycle-additional|Phase 9 now has 9|Plus 9 turn-cycle" .claude/skills/branching-story-turn-cycle/SKILL.md archive/specs/SPEC-30-story-contract-hardening-ii.md archive/tickets/SPEC30STOCONHAR-011.md` — reviewed; remaining hits are historical D8/spec context or this ticket's reassessment record, not current turn-cycle guidance.

## Deviations

- The drafted skill dry-runs were not executable in this Codex context because the repo provides prose skills, not a skill runner harness. Verification used manual contract review plus grep/stale-anchor proof.
- `docs/HARD-GATE-DISCIPLINE.md` was read because the turn-cycle `<HARD-GATE>` count/list changed. The landed edit preserves approval timing, submit/validate flow, approval-token behavior, write order, and Mystery Reserve firewall behavior.
- `archive/specs/SPEC-30-story-contract-hardening-ii.md` was added to the touched file set because the user explicitly supplied `specs/SPEC-30*` as authority and the spec has current implementation notes. Remaining D9 proposal prose is historical context under the new dated note.
