# SPEC27FOUCAN-007: Information / Observer Firewall on move generation §6b

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §6b), `.claude/skills/_shared-templates/story-state-contract.md` (§5/§7), `.claude/skills/branching-story-turn-cycle`, `.claude/skills/branching-story-health-audit`.
**Deps**: None

## Problem

The `expected_witnesses` mechanism (`branching-story-turn-cycle` Phase 4, landed via SPEC-26 D5) ensures that after an event, every witness group gets a `BEL` record — it covers belief propagation. But nothing gates whether an emitted `CHC` or a selected `SLT`'s actor-binding respects the acting entity's own `BEL` state: an NPC action or a player-facing choice can be generated using knowledge the actor cannot possess.

## Assumption Reassessment (2026-05-14)

1. `expected_witnesses` (turn-cycle Phase 4, landed via SPEC-26 D5) covers post-event belief propagation; `BEL.visibility` feeds the social-state firewall for storylet precondition filtering — but no check gates `CHC` emission or `SLT` actor-binding against the acting entity's own `BEL` state. Confirmed via the SPEC-27 brainstorm verification pass.
2. `docs/FOUNDATIONS.md` §Story Bundles §6a (Belief vs. Fact) is the precedent neighbor; the spec's D7 adds §6b after it (§6a exists; §6b is new).
3. Shared boundary under audit: the closed predicate DSL + `CHC` emission contract + `SLT` actor-binding (canonically `story-state-contract.md` §5 for the DSL, §4 for the schemas), consumed by `branching-story-turn-cycle` (move generation) and `commitment-block-authoring` (precondition authoring); the new firewall gates move/choice generation in turn-cycle and is audited in health-audit.
4. FOUNDATIONS principle under audit: §Story Bundles §6a Belief vs. Fact — the new §6b extends the `BEL` / `SF` separation from post-event propagation to move/choice generation.
5. Enforcement surface touched: `story-state-contract.md` §5/§7 (the DSL + hard-gate set) + `branching-story-turn-cycle` (move generation) + `branching-story-health-audit`. The change adds a knowledge-access gate on move generation; it does not weaken the Mystery Reserve firewall — it strengthens the adjacent observer firewall.

## Architecture Check

1. Gating move/choice generation against the acting entity's knowledge state closes the half of the observer firewall that `expected_witnesses` does not cover — `expected_witnesses` is post-event (who comes to know), §6b is pre-move (what the actor may act on). The two compose into a complete firewall.
2. No backwards-compatibility aliasing — a new §6b clause + a §5/§7 gate; the `expected_witnesses` mechanism is unchanged (the firewall is explicitly scoped to move generation so it does not duplicate the propagation side).

## Verification Layers

1. A storylet selection / emitted `CHC` / character action does not rely on information unavailable to the acting entity unless the plan records a valid access route -> skill dry-run (turn-cycle move generation) + manual review.
2. `branching-story-health-audit` flags a move generated on knowledge the actor cannot possess -> skill dry-run.
3. `docs/FOUNDATIONS.md` §Story Bundles §6b carries the Observer Firewall clause and explicitly notes `expected_witnesses` covers the propagation side -> FOUNDATIONS alignment check.
4. Cross-skill boundary: the firewall is named consistently in `story-state-contract.md` §5/§7, `branching-story-turn-cycle`, and `branching-story-health-audit` -> codebase grep-proof.

## What to Change

### 1. FOUNDATIONS §Story Bundles §6b — Observer Firewall

- In `docs/FOUNDATIONS.md` §Story Bundles, add §6b "Information / Observer Firewall" after §6a, scoped to move/choice generation: a storylet selection, an emitted choice, or a character action must not rely on information unavailable to the acting entity unless the plan records a valid access route (direct observation, testimony, document, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism). The clause notes that the existing `expected_witnesses` mechanism already covers the post-event belief-propagation side.

### 2. story-state-contract §5/§7 — generation gate

- In `.claude/skills/_shared-templates/story-state-contract.md` §5/§7, add the gate on `CHC` emission and `SLT` actor-binding against the acting entity's `BEL` state.

### 3. turn-cycle enforcement

- In `.claude/skills/branching-story-turn-cycle/SKILL.md`, enforce the observer firewall during move/choice generation.

### 4. health-audit

- In `.claude/skills/branching-story-health-audit/SKILL.md`, audit move generation for actor-knowledge violations.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Modifying the `expected_witnesses` mechanism — §6b is scoped to move generation; `expected_witnesses` covers post-event propagation and is unchanged.
- Changing `BEL.visibility` / `BEL.truth_relation` semantics.

## Acceptance Criteria

### Tests That Must Pass

1. A `branching-story-turn-cycle` dry-run blocks an emitted `CHC` / selected `SLT` actor-binding that relies on knowledge the acting entity lacks with no recorded access route.
2. A `branching-story-health-audit` dry-run flags a move generated on unavailable knowledge.
3. `grep -rn "Observer Firewall" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns the gate in all four surfaces.

### Invariants

1. The firewall is scoped to move/choice generation; the `expected_witnesses` propagation mechanism is untouched.
2. The gate is named consistently across the contract, turn-cycle, and health-audit.

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract ticket; verification is skill dry-run + grep-proof. Zero production story bundles exist, so verification is contract-and-prose conformance (per spec §Verification).`

### Commands

1. `grep -rn "Observer Firewall" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `cd tools/validators && npm test` — confirms no story-state-contract schema regression.
