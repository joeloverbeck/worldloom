# SPEC30STOCONHAR-010: Motivation Grounding (Turn-Cycle Check + Audit Warning)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle/SKILL.md` Phase 6/Phase 9 prose + `branching-story-health-audit/SKILL.md` Phase 2d (no schema or validator change) + SPEC-30 implementation note
**Deps**: archive/tickets/SPEC30STOCONHAR-009.md

## Problem

At intake, no current rule required non-system character actions to be grounded in active STINT, BEL, OBL, CNSQ, THR, SREL, or immediate physical affordance. Characters could act because the system needed a beat — violating the §Story Bundles intentionality contract. This ticket adds the rule at the turn-cycle SE-emission / validation phase (cite grounding in `SE.world_logic_rationale`) and the audit Phase 2d belief / visibility health phase (flag actions whose `world_logic_rationale` cites nothing in the grounding set).

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:221` requires `SE.world_logic_rationale` as a natural-language justification of why the route follows from world canon + branch state. The existing surface is the right vehicle for grounding citations; no schema field is added.
2. Verified `branching-story-turn-cycle/SKILL.md` has Phase 6 SE emission and Phase 9 validation surfaces that the new rule extends. SREL matching by actor depends on `archive/tickets/SPEC30STOCONHAR-009.md`'s structured `direction.from` / `direction.to` (Deps explicit).
3. Verified `branching-story-health-audit/SKILL.md` Phase 2 has sub-checks 2a-2h. The live placement for `motivation_ungrounded` is Phase 2d Belief / visibility health, because it extends the existing Information / Observer Firewall audit surface rather than snapshot replay/hash comparison.
4. Cross-skill / cross-artifact boundary under audit: the rule spans turn-cycle (prose enforcement) + health-audit (replay flag). Both surfaces read from `SE.world_logic_rationale` (existing field).
5. FOUNDATIONS principle under audit: §6b Information / Observer Firewall extends to motive grounding per spec FOUNDATIONS Alignment row. §Story Bundles intentionality contract is the prose discipline. Rule 4 (No Capability Creep): no new field added; the rule rides on existing surface. Rule 6 (No Silent Retcons): the rule extension is cited explicitly under §What to Change; not silent.
6. HARD-GATE / Mystery Reserve firewall verification: this ticket adds a turn-cycle prose check and an audit-time warning. It does NOT weaken any canon-safety check, approval checkpoint, patch-plan behavior, or Mystery Reserve firewall; severity is `warning` because prose-level natural-language grounding may evade textual matching.
7. Schema extension classification: NOT a schema extension. Schemas unchanged. Verification is prose-based; the warning is the audit signal.
8. Adjacent contradictions classification: D8 depends on D10's structured SREL `direction.from` / `direction.to` to match SREL by actor. Without ticket 009 (D10), the rule could only match SREL by `participants[]`. Listing 009 as `Deps` aligns the rule with the structured form from the start; no transitional free-string matching is implemented.

## Architecture Check

1. Prose-only grounding citation (in `SE.world_logic_rationale`) keeps schemas minimal and reuses the existing §6b firewall pattern (which audits prose for access citations). The alternative — a new structured `SE.commitment.motivation_grounding: [record_id]` field — would add a schema field for a discipline that is already cited in prose; spec explicitly prefers prose-only.
2. No backwards-compatibility shim: the rule extends turn-cycle authoring prose; future skill invocations gain a new warning-backed prose discipline.

## Verification Layers

1. Turn-cycle prose discipline → codebase grep-proof: `grep -nE "Motivation Grounding|motivation.{0,10}ground" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new sub-section heading.
2. Audit finding → codebase grep-proof: `grep -n "motivation_ungrounded" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
3. Turn-cycle checklist sync → codebase grep-proof: `grep -n "9 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the count-sensitive hard-gate/process prose moved with the new check.
4. Manual contract review → review the landed skill prose and confirm an SE for a character action grounded in an active STINT/BEL/OBL/CNSQ/THR/SREL/affordance must cite that grounding in `world_logic_rationale`, while an ungrounded character action emits `motivation_ungrounded` as a warning during audit.
5. FOUNDATIONS alignment check: §6b discipline at `_shared-templates/story-state-contract.md:664` is unchanged; this ticket extends the discipline's application surface (from knowledge access to motive grounding) without rewriting the source rule.

## Landed Changes

### 1. Turn-cycle motivation-grounding prose

In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 6 SE-emission prose and Phase 9 validation checks, added "Motivation Grounding" requiring: for every non-system character action (i.e., action attributed to a STENT actor, not to system-driven beats), the emitting page's `SE.world_logic_rationale` MUST cite at least one of:

- An `STINT-<integer>` held by the actor.
- A `BEL-<integer>` held by the actor with relevant content.
- An `OBL-<integer>` / `CNSQ-<integer>` / `THR-<integer>` involving the actor.
- An `SREL-<integer>` whose `direction.from` or `direction.to` includes the actor (now structured per `archive/tickets/SPEC30STOCONHAR-009.md`) or whose `participants[]` includes the actor.
- An immediate physical affordance available to the actor at the page location.

Documented the citation form (e.g., "actor STENT-1 acts on STINT-3 because ...") and the audit-side warning severity so authors understand the rule is observability-first.

### 2. Audit Phase 2d `motivation_ungrounded` finding

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d Belief / visibility health, added a finding `motivation_ungrounded` (severity: warning) that replays SE records and flags actions where `world_logic_rationale` doesn't cite any id matching the grounding set. Severity is warning because prose matching may evade exact textual patterns; finding is an audit signal, not a commit gate.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 6 Motivation Grounding prose + Phase 9 additional check/count sync)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2d prose adds `motivation_ungrounded`)
- `specs/SPEC-30-story-contract-hardening-ii.md` (modify — D8 implementation note)

## Out of Scope

- A new `STINT.target_records` structured target list (deferred per spec Out of Scope; D8 audit surface is the substitute).
- A new validator under `tools/validators/src/rules/` (deliberately deferred — spec marks this as "(Optional, deferrable) `tools/validators/src/rules/rule_motivation_grounding.ts`"). If audit-time matching proves stable, promotion to a validator is a follow-up spec.
- Any schema field for motivation grounding (deliberately schema-minimalism preserved).
- Free-string SREL matching (the rule explicitly uses the structured form per ticket 009 Deps).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "motivation_ungrounded" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
2. `grep -nE "Motivation Grounding|motivation.{0,10}grounded" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new sub-section heading and Phase 9 check.
3. `grep -nE "STINT|BEL|OBL|CNSQ|THR|SREL|affordance" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the grounding source list appears in the new sub-section context.
4. `grep -n "direction.from\|direction.to" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the SREL matching uses the structured form (ticket 009 dependency surfaced).
5. `grep -n "9 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms count-sensitive Phase 9 prose is aligned.

### Invariants

1. The `SE.world_logic_rationale` field is unchanged at schema level; it now also carries motivation-grounding citations.
2. Severity discipline: motivation-grounding violations are warnings at audit time, not commit-blocking errors at the validator surface.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command/manual-review based. No executable skill dry-run runner exists in this checkout for these prose-only skills.`

### Commands

1. `grep -nE "motivation_ungrounded|Motivation Grounding|direction.from|direction.to|9 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. The narrow command is correct because the change is skill prose only; no validator or schema surface to typecheck.

## Outcome

Completed. `branching-story-turn-cycle` now requires Motivation Grounding in `SE.world_logic_rationale` for non-system character actions and records the rule as Phase 9 turn-cycle-additional check 5. The Phase 9 count-sensitive hard-gate/process prose now says 9 additional checks. `branching-story-health-audit` now reports `motivation_ungrounded` under Phase 2d Belief / visibility health as a warning-only audit signal. SPEC-30 carries a dated D8 implementation note.

## Verification Result

1. `grep -nE "motivation_ungrounded|Motivation Grounding|direction.from|direction.to|9 turn-cycle-additional" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` passed and returned the landed turn-cycle heading/check/count and audit finding.
2. `grep -nE "STINT|BEL|OBL|CNSQ|THR|SREL|affordance" .claude/skills/branching-story-turn-cycle/SKILL.md` passed and returned the grounding source vocabulary in the landed turn-cycle prose.
3. Manual contract review passed: no schema, validator, patch-plan, approval-token, or canon-mutation surface changed; the health-audit signal is warning-only.
4. `git diff --check` passed.

## Deviations

1. The drafted audit placement referenced Phase 2a or a possible new Phase 2 subsection. Live reassessment placed the finding in Phase 2d Belief / visibility health because the rule extends the Information / Observer Firewall, not snapshot replay/hash comparison.
2. Drafted skill dry-run proof was replaced with manual contract review plus grep proof because this checkout has no executable dry-run runner for these prose-only skills.
