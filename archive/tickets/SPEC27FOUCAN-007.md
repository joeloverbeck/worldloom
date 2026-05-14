# SPEC27FOUCAN-007: Information / Observer Firewall on move generation §6b

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §6b), `.claude/skills/_shared-templates/story-state-contract.md` (§5/§7), `.claude/skills/branching-story-turn-cycle`, `.claude/skills/branching-story-health-audit`, and `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (implementation note).
**Deps**: None

## Problem

At intake, the `expected_witnesses` mechanism (`branching-story-turn-cycle` Phase 4, landed via SPEC-26 D5) ensured that after an event, every witness group gets a `BEL` record — it covered belief propagation. But no shared contract gate ensured that an emitted `CHC` or selected `SLT` actor-binding respected the acting entity's own `BEL` / access state, so an NPC action or player-facing choice could be generated using knowledge the actor could not possess.

## Assumption Reassessment (2026-05-14)

1. `expected_witnesses` (turn-cycle Phase 4, landed via SPEC-26 D5) covers post-event belief propagation; `BEL.visibility` feeds the social-state firewall for storylet precondition filtering. Live reassessment found a partial health-audit warning already present (`choice_relies_on_unestablished_knowledge` in `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d), but `docs/FOUNDATIONS.md` has no §6b Observer Firewall clause, `.claude/skills/_shared-templates/story-state-contract.md` does not name the gate in §5/§7, and `.claude/skills/branching-story-turn-cycle/SKILL.md` does not enforce the firewall during `SLT` selection / `CHC` emission.
2. `docs/FOUNDATIONS.md` §Story Bundles §6a (Belief vs. Fact) is the precedent neighbor; the spec's D7 adds §6b after it (§6a exists; §6b is new).
3. Shared boundary under audit: the closed predicate DSL + `CHC` emission contract + `SLT` actor-binding (canonically `story-state-contract.md` §5 for the DSL, §4 for the schemas), consumed by `branching-story-turn-cycle` (move generation) and `commitment-block-authoring` (precondition authoring); the new firewall gates move/choice generation in turn-cycle and is audited in health-audit.
4. FOUNDATIONS principle under audit: §Story Bundles §6a Belief vs. Fact — the new §6b extends the `BEL` / `SF` separation from post-event propagation to move/choice generation.
5. Enforcement surface touched: `story-state-contract.md` §5/§7 (the DSL + hard-gate set) + `branching-story-turn-cycle` (move generation) + `branching-story-health-audit`. The change adds a knowledge-access gate on move generation; it does not weaken the Mystery Reserve firewall — it strengthens the adjacent observer firewall. `docs/HARD-GATE-DISCIPLINE.md` was read on 2026-05-15 because this ticket changes story-pipeline validation-gate prose.
6. Reassessment correction: no executable story-skill dry-run runner is available in this Codex context, so the drafted dry-run proof is replaced with manual contract review plus grep proof over the edited docs/skills. This matches SPEC-27 §Verification, which treats D5-D8 as contract-and-prose conformance because zero production story bundles exist.
7. Same-file hygiene: `.claude/skills/branching-story-health-audit/SKILL.md` currently says `7 structural sub-phases` in its HARD-GATE text while the live process flow has eight sub-phases after SPEC27FOUCAN-006. Because this ticket edits the same health-audit validation surface, the stale count is corrected as same-seam closeout hygiene.

## Architecture Check

1. Gating move/choice generation against the acting entity's knowledge state closes the half of the observer firewall that `expected_witnesses` does not cover — `expected_witnesses` is post-event (who comes to know), §6b is pre-move (what the actor may act on). The two compose into a complete firewall.
2. No backwards-compatibility aliasing — a new §6b clause + a §5/§7 gate; the `expected_witnesses` mechanism is unchanged (the firewall is explicitly scoped to move generation so it does not duplicate the propagation side).

## Verification Layers

1. A storylet selection / emitted `CHC` / character action does not rely on information unavailable to the acting entity unless the plan records a valid access route -> manual contract review of turn-cycle move generation plus grep proof.
2. `branching-story-health-audit` flags a move generated on knowledge the actor cannot possess -> manual contract review of Phase 2d plus grep proof.
3. `docs/FOUNDATIONS.md` §Story Bundles §6b carries the Observer Firewall clause and explicitly notes `expected_witnesses` covers the propagation side -> FOUNDATIONS alignment check.
4. Cross-skill boundary: the firewall is named consistently in `story-state-contract.md` §5/§7, `branching-story-turn-cycle`, and `branching-story-health-audit` -> codebase grep-proof.

## Landed Changes

### 1. FOUNDATIONS §Story Bundles §6b — Observer Firewall

- `docs/FOUNDATIONS.md` §Story Bundles now has §6b "Information / Observer Firewall" after §6a, scoped to move/choice generation: a storylet selection, emitted choice, or character action must not rely on information unavailable to the acting entity unless the plan records a valid access route. The clause notes that the existing `expected_witnesses` mechanism covers the post-event belief-propagation side.

### 2. story-state-contract §5/§7 — generation gate

- `.claude/skills/_shared-templates/story-state-contract.md` §5/§7 now defines the gate on `CHC` emission and `SLT` actor-binding against the acting entity's available knowledge / access route.

### 3. turn-cycle enforcement

- `.claude/skills/branching-story-turn-cycle/SKILL.md` now applies the observer firewall during `SLT` selection, action resolution, and `CHC` emission.

### 4. health-audit

- `.claude/skills/branching-story-health-audit/SKILL.md` now reports `observer_firewall_violation` for emitted choices or selected `SLT` actor-bindings that rely on unavailable actor knowledge. Its HARD-GATE structural sub-phase count was also corrected from 7 to 8 to match the live post-D6 process flow.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (modify — dated D7 implementation note)

## Out of Scope

- Modifying the `expected_witnesses` mechanism — §6b is scoped to move generation; `expected_witnesses` covers post-event propagation and is unchanged.
- Changing `BEL.visibility` / `BEL.truth_relation` semantics.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review and grep proof show `branching-story-turn-cycle` blocks an emitted `CHC` / selected `SLT` actor-binding that relies on knowledge the acting entity lacks with no recorded access route.
2. Manual review and grep proof show `branching-story-health-audit` flags a move generated on unavailable knowledge.
3. `grep -rn "Observer Firewall" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns the gate in all four surfaces.

### Invariants

1. The firewall is scoped to move/choice generation; the `expected_witnesses` propagation mechanism is untouched.
2. The gate is named consistently across the contract, turn-cycle, and health-audit.

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract ticket; verification is manual contract review + grep-proof. Zero production story bundles exist, so verification is contract-and-prose conformance (per spec §Verification).`

### Commands

1. `grep -rn "Observer Firewall" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `cd tools/validators && npm test` — confirms no story-state-contract schema regression.

## Outcome

Implemented SPEC-27 D7 across the story contract surfaces. `docs/FOUNDATIONS.md` now defines §6b Information / Observer Firewall; the shared story-state contract applies the observer firewall at predicate / plan-grounding time; turn-cycle applies it during `SLT` selection, action resolution, and `CHC` emission; health-audit Phase 2d reports `observer_firewall_violation`; and SPEC-27 carries a dated D7 implementation note. While editing the health-audit validation surface, the stale HARD-GATE count from seven to eight structural sub-phases was corrected.

## Verification Result

1. `grep -rn "Observer Firewall" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — PASS. The Observer Firewall appears in FOUNDATIONS §6b, shared contract §5 / §7, turn-cycle Phase 2 / Phase 8 / Phase 9, and health-audit validation / alignment sections.
2. `rg -n "observer_firewall_violation|Information / Observer Firewall|§Story Bundles §6b|7 structural sub-phases|8 structural sub-phases" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC27FOUCAN-007.md specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` — PASS by manual review. The active operational surfaces use `Information / Observer Firewall` and `observer_firewall_violation`; the only `7 structural sub-phases` hit is the ticket's historical reassessment note, while the health-audit HARD-GATE says `8 structural sub-phases`.
3. `cd tools/validators && npm test` — PASS, 217 tests. This covered the validators TypeScript build and the full validators package test lane.

## Deviations

The drafted skill dry-run proof was replaced with manual contract review plus grep proof because this repo exposes no executable story-skill dry-run runner in the current Codex context. The health-audit surface already had a partial actor-knowledge finding before this ticket; this ticket renamed/broadened it into the D7 `observer_firewall_violation` surface and completed the missing FOUNDATIONS, shared contract, and turn-cycle sides.
