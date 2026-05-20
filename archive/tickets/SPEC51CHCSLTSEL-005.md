# SPEC51CHCSLTSEL-005: Stale skill-reference predicate + motivation alignment

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — skill-prose only; aligns three story-skill predicate enumerations and one motivation-grounding list to the canonical shared story-state contract. No code, no schema, no validator changes.
**Deps**: None

## Problem

At intake, three story skills enumerated only the six original social-state existential predicates and omitted the five added since (`any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`), diverging from the canonical 11-predicate DSL in `.claude/skills/_shared-templates/story-state-contract.md` §5. Separately, the Phase-6 motivation-grounding list omitted `STPLAN`/`STEMO` as valid direct motivation sources for `SE.world_logic_rationale`, although plan-driven and emotion-driven actions are first-class. An operator following the stale local prose would have built eligibility / motivation logic against an incomplete predicate set despite the correct master contract (SPEC-51 §Approach D).

## Assumption Reassessment (2026-05-20)

1. Stale enumeration sites (verified): `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md:10`, `.claude/skills/branching-story-health-audit/SKILL.md:248`, `.claude/skills/branching-story-bootstrap/SKILL.md:313` — each lists six existential predicates, omitting the five SPEC-42/SPEC-47 families. `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md:39-49` lists motivation sources (STINT/BEL/OBL/CNSQ/THR/SREL/physical affordances) and omits STPLAN/STEMO. `commitment-block-authoring` already lists all 11 — it is the correct exemplar. The reassessment confirmed Phase-7 §9b/§9c is already current (SPEC-51 D.3 no-op — not touched here).
2. SPEC-51 §Approach D.1/D.2/D.3; the canonical source is `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 158-199, 11 existential predicates).
3. Cross-artifact boundary under audit: the skill prose is a consumer of the shared predicate-DSL contract. The fix aligns local enumerations to the contract (or replaces inline lists with a citation to it) so the prose cannot drift from the master DSL again.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §6b Information/Observer Firewall — the Phase-6 motivation-grounding list defines which active records may ground a character action's `world_logic_rationale`; omitting STPLAN/STEMO understates the lawful motivation sources for plan-/emotion-driven actions. Restate before trusting the spec narrative: the alignment widens the documented motivation surface to match first-class STPLAN/STEMO, never narrows the firewall.

## Architecture Check

1. Aligning the three enumerations to all 11 predicates (or replacing inline lists with a citation to the shared contract) eliminates the drift class at its source; a citation is more drift-resistant than a synced copy. Adding STPLAN/STEMO to the Phase-6 list matches the contract's first-class treatment of plan-/emotion-driven actions.
2. No backwards-compatibility shim: stale enumerations are corrected in place; no parallel "old list" is retained.

## Verification Layers

1. Three enumeration sites list all 11 existential predicates (or cite the contract) -> grep-proof for the five previously-omitted predicate names at each site.
2. Phase-6 motivation list includes STPLAN + STEMO -> grep-proof at `phase-6-page-snapshot.md`.
3. No inline story-skill existential list omits a contract §5 predicate -> manual review of the remaining story-skill predicate-list grep hits (FOUNDATIONS §6b alignment: the documented motivation/eligibility surface matches the canonical DSL).
4. Single-layer per site (prose alignment); additional layer mapping is not applicable because there is no executable surface — verification is grep-proof against the contract.

## Landed Changes

### 1. Aligned the three predicate enumerations (D.1)

In `phase-2-3-commitment-and-state-delta.md`, `branching-story-health-audit/SKILL.md`, and `branching-story-bootstrap/SKILL.md`, the local existential-predicate prose now cites shared contract §5 and includes all 11 actor-unbound existential predicates, including the five previously omitted SPEC-42/SPEC-47 families.

### 2. Extended the Phase-6 motivation list (D.2)

In `phase-6-page-snapshot.md`, `STPLAN` and `STEMO` are now valid direct motivation sources for `SE.world_logic_rationale`.

### 3. Phase-7 (D.3) — no change

Phase-7 §9b/§9c already carries the shared-contract obligations (reassessment-confirmed). Do NOT modify it; recorded here so it is not re-litigated.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)

## Out of Scope

- The Phase-7 page-plan reference (already current — D.3 no-op).
- `commitment-block-authoring` (already lists all 11 — the exemplar, unchanged).
- Any change to the canonical contract `story-state-contract.md` §5 (it is correct; the skills lag it).
- The trace validator (002), MCP parity (003), world-index fix (004).

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: each of the three enumeration sites contains all five previously-omitted predicate names (`any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`) OR a citation to `story-state-contract.md` §5.
2. Grep-proof: `phase-6-page-snapshot.md` motivation list includes `STPLAN` and `STEMO`.
3. Grep-proof: Phase-7 reference is unchanged (no accidental edit to D.3's no-op surface).

### Invariants

1. No story-skill inline existential-predicate enumeration omits a contract §5 predicate after this ticket.
2. The shared contract `story-state-contract.md` §5 remains the single source of truth — skills cite or mirror it, never redefine it.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "any_clock_active|any_secret_unrevealed|any_story_question_open|any_plan_active|any_emotion_active" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md`
2. `grep -nE "STPLAN|STEMO" .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md`
3. Narrow boundary: grep-proof is the correct verification surface — these are skill-prose edits with no executable test target; existing pipeline coverage of the predicate DSL lives in the validators package, untouched here.

## Outcome

Completed: 2026-05-20

The three stale story-skill predicate references were aligned to the canonical 11 existential predicates in shared contract §5, and Phase-6 page-snapshot motivation grounding now recognizes `STPLAN` and `STEMO` as lawful direct motivation sources for non-system character actions. No schema, validator, tool, or world-content changes were made.

## Verification Result

1. PASS — `grep -nE "any_clock_active|any_secret_unrevealed|any_story_question_open|any_plan_active|any_emotion_active" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md` returned hits in all three target files, proving the five previously omitted predicates are now present on each target surface.
2. PASS — `grep -nE "STPLAN|STEMO" .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` returned both motivation-source lines.
3. PASS — manual review of `rg -n "any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention|any_clock_active|any_secret_unrevealed|any_story_question_open|any_plan_active|any_emotion_active" .claude/skills --glob '*.md' --glob 'SKILL.md'` confirmed the remaining current-contract all-predicate surfaces either include the SPEC-42/SPEC-47 predicates or cite shared contract §5. Narrow debt-specific examples that intentionally name only debt predicates were not all-predicate enumerations.
4. PASS — Phase-7 was not modified; `git diff --name-only -- .claude/skills/branching-story-turn-cycle/references` listed only the Phase 2-3 and Phase 6 reference files.
5. PASS — `git diff --check -- .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md archive/tickets/SPEC51CHCSLTSEL-005.md` reported no whitespace errors.

## Deviations

- The ticket was implemented as prose/contract alignment only. No executable package tests were run because no code, schema, validator, or package behavior changed.
