# SPEC27FOUCAN-005: Choice Consequence Integrity (story-scope Rule 5)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §5), `.claude/skills/_shared-templates/story-state-contract.md` (§7), `.claude/skills/branching-story-turn-cycle`, `.claude/skills/branching-story-health-audit`.
**Deps**: None

## Problem

`story-state-contract.md` §4.3 explicitly states there is no `state_delta.no_change` signal — an `accept`-routed choice that creates / supersedes / closes nothing and changes no visibility or affordance is structurally legal. `CHC.grounded_in` is an availability anchor (what makes a choice appear), not a consequence guarantee (what selecting it changes). Nothing forbids fake agency at story scope.

## Assumption Reassessment (2026-05-14)

1. `story-state-contract.md` §4.3 confirms a no-op `SE.state_delta` is legal ("absence from create/supersede/close is the no-change signal"); `CHC.grounded_in` is an availability anchor (§4.5.12); Hard Gate 6 covers future continuation capacity, not current-action consequence. Confirmed via the SPEC-27 brainstorm verification pass.
2. `docs/FOUNDATIONS.md` §Story Bundles §5 (Validation Rules At Story Scope) is the home for the new clause; the spec's D5 adds it under the Rule 5 story-scope paragraph.
3. Shared boundary under audit: the story-state contract §7 hard-gate set and the `SE.state_delta` / `CHC` schemas (canonically `story-state-contract.md` §4), consumed by `branching-story-turn-cycle` (turn commit) and `branching-story-health-audit` (replay). The new gate is added at §7 and enforced/audited in both skills.
4. FOUNDATIONS principle under audit: Rule 5 (No Consequence Evasion) at story scope — the new clause is the story-scope analogue of Rule 2 (No Pure Cosmetics). The spec frames it explicitly as such.
5. Enforcement surface touched: the story-state contract §7 hard-gate set + `branching-story-turn-cycle` Phase 9 + `branching-story-health-audit` replay. The change adds a gate; it does not weaken the Mystery Reserve firewall.

## Architecture Check

1. A dedicated Choice Consequence Integrity gate is cleaner than relying on `CHC.grounded_in`, which structurally cannot carry the guarantee (it anchors availability, not consequence). Forbidding cosmetic accepted choices is the story-scope counterpart of Rule 2.
2. No backwards-compatibility aliasing — a new §7 hard-gate clause; the existing "no `state_delta.no_change`" convention is unchanged (the gate operates on the delta's emptiness, it does not introduce a no-change list).

## Verification Layers

1. Every committed `CHC` selection / accepted write-in produces at least one grounded consequence (non-empty `SE.state_delta`; a new/superseded/closed story-bundle record; a changed visibility/affordance; or a recorded failure/refusal that is itself a consequence) -> schema validation + skill dry-run (turn-cycle Phase 9).
2. `branching-story-health-audit` flags a cosmetic accepted choice on replay -> skill dry-run (health-audit replay check).
3. `docs/FOUNDATIONS.md` §Story Bundles §5 carries the Choice Consequence Integrity clause -> FOUNDATIONS alignment check.
4. Cross-skill boundary: the §7 gate is named identically in `story-state-contract.md`, `branching-story-turn-cycle`, and `branching-story-health-audit` -> codebase grep-proof.

## What to Change

### 1. FOUNDATIONS §Story Bundles §5 — Choice Consequence Integrity clause

- Under the Rule 5 story-scope paragraph in `docs/FOUNDATIONS.md` §Story Bundles §5, add a "Choice Consequence Integrity" clause: no accepted player choice or accepted write-in may be cosmetic-only — every committed `CHC` selection or accepted write-in must produce at least one grounded consequence (a non-empty `SE.state_delta`; a new/superseded/closed story-bundle record; a changed visibility/affordance state; or a recorded failure/refusal/block that is itself a consequence). Purely rhetorical/expressive choice variants are permitted only when the page plan explicitly marks them as such.

### 2. story-state-contract §7 hard-gate clause

- In `.claude/skills/_shared-templates/story-state-contract.md` §7, add a hard-gate clause enforcing Choice Consequence Integrity at turn commit.

### 3. turn-cycle Phase 9 enforcement

- In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 9, add the Choice Consequence Integrity check — reject a committed accepted choice whose effects are cosmetic-only and not plan-marked rhetorical.

### 4. health-audit replay check

- In `.claude/skills/branching-story-health-audit/SKILL.md`, add the corresponding replay finding for cosmetic accepted choices.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Introducing a `state_delta.no_change` list — the gate operates on delta emptiness; it does not add a no-change signal.
- Changing `CHC.grounded_in` semantics — it remains an availability anchor.
- Reviewer Amendment 7 (Authorship/Authority Boundary) — rejected per spec §Out of Scope (already covered by contract §1 / FOUNDATIONS §4a).

## Acceptance Criteria

### Tests That Must Pass

1. A `branching-story-turn-cycle` dry-run rejects a turn whose committed accepted choice produces an empty `SE.state_delta`, no visibility/affordance/record change, and no plan-marked rhetorical exemption.
2. A `branching-story-health-audit` dry-run flags a replayed page with a cosmetic accepted choice.
3. `grep -rn "Choice Consequence Integrity" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns the clause in all four surfaces.

### Invariants

1. A committed accepted `CHC` or write-in always carries at least one grounded consequence OR a plan-marked rhetorical exemption.
2. The gate is named consistently across the contract, turn-cycle, and health-audit.

## Test Plan

### New/Modified Tests

1. `None — skill-prose + contract ticket; verification is skill dry-run + grep-proof. There are zero production story bundles, so verification is contract-and-prose conformance, not bundle replay (per spec §Verification).`

### Commands

1. `grep -rn "Choice Consequence Integrity" docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `cd tools/validators && npm test` — confirms no story-state-contract schema regression.
