# SPEC76TURDRIPRI-008: Turn-cycle skill — Phase 0 (Driver Evaluation) + `action_source_mode` argument

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/SKILL.md` (substantial Phase 0 addition + new orthogonal argument + Phase 1 carve-out + Phase 8 amendment)
**Deps**: archive/tickets/SPEC76TURDRIPRI-002.md

## Problem

The `branching-story-turn-cycle` skill currently declares Phase 1 as "Resolve the action" at `.claude/skills/branching-story-turn-cycle/SKILL.md:60`, treating every turn as initiated by a chosen CHC or write-in. There is no Phase 0 for evaluating non-player drivers — active high-urgency STPLAN / STEMO / CLK / THR records cannot become the turn's causal initiator. SPEC-76 §3.3 prescribes a new Phase 0 (Driver Evaluation) before Phase 1 that enumerates due drivers and selects exactly one for the turn (player or non-player), a new orthogonal `action_source_mode` argument, a Phase 1 skip for non-player drivers, and a Phase 8 amendment requiring response/continuation CHCs when the driver is non-player.

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/branching-story-turn-cycle/SKILL.md:60` currently declares `Phase 1: Resolve the action → outcome_route`. The Phase structure spans lines 60-91 with 10 phases (Resolve action, Select/JIT commitment, Apply state delta, Update new-class state, Classify mystery/canon authority, Materialize next page snapshot, Author page plan, Generate next choices, Validate against shared hard gates, HARD-GATE atomic patch). The existing `execution_mode` argument at lines 21-22 has values `authoring | interactive_runtime | batch`. Phase 8 currently handles choice generation. No existing references to `turn_driver`, `Phase 0`, `driver evaluation`, or `action_source_mode`. Verified via reassess-spec Agent 2 in this session.
2. SPEC-76 §3.3 prescribes the Phase 0 pseudocode verbatim (including the player+non-player driver-disposition discipline added during reassessment), the `action_source_mode` enum (`resolve_selected_choice | resolve_write_in | advance_initiative | repair_turn`) as orthogonal to the existing `execution_mode`, the Phase 1 skip-when-non-player rule, and the Phase 8 amendment requiring response/continuation CHCs.
3. **Cross-skill / cross-artifact boundary**: this skill consumes the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` (Gate 9 added by SPEC76TURDRIPRI-002, §7a page-plan section also added by SPEC76TURDRIPRI-002). It also coordinates with `branching-story-bootstrap` (SPEC76TURDRIPRI-009 — bootstrap omits §7a for story_start SE-1) and `branching-story-health-audit` (SPEC76TURDRIPRI-010 — Reactivity Inertness pass scans for chains of pages where Phase 0 only selects player drivers). The shape under audit is the turn-cycle authoring procedure — Phase 0's driver-selection logic, the action_source_mode argument's XOR-with-existing-args constraint, the §7a active-pressure-disposition obligation flowing through to Phase 7 page-plan authoring.
4. **FOUNDATIONS principle**: §Story Bundles §5c (Present Causal State, Not Narrative Shape — including the "Driver salience is local." extension landed by SPEC-78 at `docs/FOUNDATIONS.md:668`) governs this ticket. Per §5c's "Driver salience is local" doctrine: "Multi-source causality — player action plus active non-player pressure (NPC plans stepping, clocks firing, secrets reveal-ready, threads escalating, obligations falling due) — does not invite a global planner. Driver selection (which active record becomes this turn's causal initiator) is a prior local-salience-ranking pass before SLT selection: rank due drivers by urgency, break by player action when supplied, decline drivers whose access route is illegible." Phase 0 is the structural enforcement of this doctrine — driver selection is local salience ranking, not a global planner.

## Architecture Check

1. **Phase 0 before Phase 1, orthogonal mode argument**: Phase 0 evaluates due drivers and selects one before Phase 1 runs (Phase 1 is now downstream of Phase 0's selection). This preserves the existing turn-cycle's phase structure while adding the driver-evaluation layer; non-player drivers flow into Phase 2 (commitment-block selection) by skipping Phase 1's player-action resolution. The new `action_source_mode` argument is orthogonal to the existing `execution_mode` — `execution_mode` governs WHEN the skill runs (authoring vs runtime vs batch); `action_source_mode` governs WHAT the turn's driver source is (player choice vs write-in vs non-player initiative vs repair). Alternatives considered and rejected: (a) shoehorn driver evaluation into Phase 1 — rejected, conflates driver SELECTION with action RESOLUTION; (b) make `action_source_mode` a value of `execution_mode` (e.g., `advance_initiative` as an `execution_mode` enum member) — rejected per SPEC-76 §3.3 explicit "orthogonal `action_source_mode`" guidance; the two arguments answer different questions and conflating them would force unrelated downstream code to branch on a single enum.
2. **No backwards-compatibility aliasing**: Phase 0 is added structurally (a new step, not a hidden default); the `action_source_mode` argument is new (no fallback to a "legacy mode"); Phase 1's skip-when-non-player is a direct logic change (no permissive bridge).

## Verification Layers

1. **Invariant**: Phase 0 (Driver Evaluation) appears before Phase 1 in the SKILL.md process flow → grep-proof for "Phase 0" header.
2. **Invariant**: `action_source_mode` argument with 4 values (`resolve_selected_choice | resolve_write_in | advance_initiative | repair_turn`) is declared in the skill's arguments block → grep-proof for the argument name + value enumeration.
3. **Invariant**: Phase 1 skip-when-non-player is documented in the Phase 1 prose → grep-proof for "Phase 1 is **skipped**" or equivalent phrasing.
4. **Invariant**: Phase 8 amendment requires response/continuation CHCs when driver is non-player → grep-proof for the response-mode emission rule.
5. **Invariant**: SKILL.md cross-references the shared contract's Gate 9 (Turn-Driver Lawfulness) → grep-proof for "Gate 9" mention.
6. **Invariant**: Phase 0 documents `world_logic_rationale` as the carrier for driver-justification (the source-report `why_now` content fold) → grep-proof for the `world_logic_rationale` reference in Phase 0 prose.

## What to Change

### 1. Add Phase 0 (Driver Evaluation)

Insert a new Phase 0 section before the existing Phase 1 at SKILL.md:60, with the pseudocode from SPEC-76 §3.3 verbatim (including the player+non-player driver-disposition discipline added during reassessment):

```
Phase 0: Evaluate due drivers
  - Enumerate active high-urgency records on parent PG.state_snapshot:
    STPLAN with current_step due, STEMO with high intensity + behavioral pressure,
    CLK at threshold, THR active, STSEC reveal-ready, STQ payoff-due, OBL/CNSQ urgent.
  - Combine with player action source (chosen CHC or write-in, if supplied).
  - Select exactly one driver for this turn:
    * If chosen_choice_id or manual_action_text supplied: driver = player_action / player_write_in.
    * Else: select the highest-urgency due non-player driver.
  - If multiple non-player records at equal urgency fire simultaneously,
    classify as multi_actor_collision and list all in driver_records.
  - Record selected / deferred / rejected dispositions for every active high-urgency record;
    these populate page-plan §7a active-pressure table.
  - Player action does not exempt non-player records from disposition: when the driver is
    player_action / player_write_in, any high-urgency non-player records active on parent
    PG.state_snapshot must still appear in §7a's active-pressure table as `selected: no — player won`
    (the implicit case when the player drives the turn), `deferred` (with expiry), or `rejected`
    (with reason).
  - Populate `world_logic_rationale` on the new SE.turn_resolution event to articulate why this
    driver was selected this turn (the source-report `why_now` content folds into this existing
    required field per §3.1).
```

### 2. Add the `action_source_mode` argument

In the skill's arguments block (currently containing `execution_mode` at lines 21-22), add a new orthogonal `action_source_mode` argument:

```yaml
action_source_mode:
  - resolve_selected_choice   # XOR with manual_action_text; current default when chosen_choice_id supplied
  - resolve_write_in          # current default when manual_action_text supplied
  - advance_initiative        # no player action; driver = non-player; both chosen_choice_id and manual_action_text absent
  - repair_turn               # for system_repair / audit_repair flows
```

Document the argument's orthogonality with `execution_mode` and the XOR constraints with `chosen_choice_id` / `manual_action_text`.

### 3. Phase 1 skip-when-non-player

Amend the existing Phase 1 ("Resolve the action") prose to clarify that Phase 1 becomes downstream of Phase 0's driver selection: when `driver.kind = player_action | player_write_in`, Phase 1 resolves the action as today; when the driver is non-player, Phase 1 is **skipped** and Phase 2 receives the driver directly as the commitment-block selection input.

### 4. Phase 8 amendment — response/continuation CHCs for non-player drivers

Amend Phase 8 (choice generation) to add: when `driver.kind` is non-player, emitted CHCs must have `player_response_mode: responds | witnesses | chooses_continuation`. At least one emitted CHC must materially respond to the driver (e.g., an `oppose / protect / evade / communicate / investigate` action family that targets the driver's `initiator` or `driver_records`).

### 5. Cross-reference Gate 9 + §7a

Add a brief mention in the skill's pre-flight / opening prose that Gate 9 (Turn-Driver Lawfulness) and the §7a page-plan section are the contract surfaces enforced by the structural validators (cross-reference to `_shared-templates/story-state-contract.md` §7 / §8 / §7a).

### 6. Update the process-flow diagram (if present)

If the skill's SKILL.md contains a process-flow diagram (ascii or ordered list), update it to show Phase 0 → Phase 1 with the skip-when-non-player branch.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- Bootstrap skill §7a carve-out for story_start — ship in SPEC76TURDRIPRI-009.
- Health-audit Reactivity Inertness pass — ship in SPEC76TURDRIPRI-010.
- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- Contract amendments (`_shared-templates/story-state-contract.md` §4/§7/§8/§16a) — ship in SPEC76TURDRIPRI-002.
- New structural validators — shipped in SPEC76TURDRIPRI-003 through archive/tickets/SPEC76TURDRIPRI-006.md.
- Existing-validator updates — ship in SPEC76TURDRIPRI-007.
- Golden fixture (Red Kiln Ambush) — ship in SPEC76TURDRIPRI-011.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^Phase 0: Evaluate due drivers" .claude/skills/branching-story-turn-cycle/SKILL.md` returns exactly 1 match.
2. `grep -nE "action_source_mode" .claude/skills/branching-story-turn-cycle/SKILL.md` returns multiple matches (argument declaration + cross-references).
3. `grep -nE "advance_initiative|resolve_selected_choice|resolve_write_in|repair_turn" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least 4 matches covering the enum values.
4. `grep -nE "Phase 1 is \*\*skipped\*\*|Phase 1 is skipped" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least 1 match.
5. `grep -nE "player_response_mode: responds" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least 1 match (Phase 8 amendment).
6. `grep -nE "Gate 9|Turn-Driver Lawfulness" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least 1 match (cross-reference).
7. `grep -nE "world_logic_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md` returns at least 1 match (Phase 0 driver-justification carrier).

### Invariants

1. Phase 0 evaluates due drivers and selects exactly one per turn; selection is local salience ranking per FOUNDATIONS §5c "Driver salience is local."
2. `action_source_mode` is orthogonal to `execution_mode` — the two arguments answer different questions and are XOR-validated against `chosen_choice_id` / `manual_action_text` per their respective enum values.
3. Phase 1 skip-when-non-player preserves the existing player-action resolution semantics for player-driver turns; non-player drivers bypass Phase 1 and feed directly into Phase 2 (commitment-block selection).
4. Phase 8's response/continuation CHC requirement structurally forbids non-responsive choices on non-player-driver pages (per Rule 5 No Consequence Evasion at the story-pipeline level).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. The 7 grep-proofs enumerated in Acceptance Criteria, run as one batched command: `grep -nE "^Phase 0: Evaluate due drivers|action_source_mode|advance_initiative|resolve_selected_choice|resolve_write_in|repair_turn|Phase 1 is \*\*skipped\*\*|player_response_mode: responds|Gate 9|Turn-Driver Lawfulness|world_logic_rationale" .claude/skills/branching-story-turn-cycle/SKILL.md`
2. Manual review of the new Phase 0 prose — confirm the pseudocode block matches SPEC-76 §3.3 verbatim and the player+non-player driver-disposition discipline is present.
