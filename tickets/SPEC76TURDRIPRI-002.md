# SPEC76TURDRIPRI-002: Contract amendments — Gate 9 + §7a turn-driver section + §16a label tightening

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` (shared story state contract, consumed by all 8 Skill Category 2c story-pipeline skills)
**Deps**: SPEC76TURDRIPRI-001

## Problem

The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` is authoritative for story-bundle record schemas per FOUNDATIONS §Story Bundles §5b. With SPEC76TURDRIPRI-001 landing the new `turn_driver` field on the SE record and per-`kind` constraints, the contract must (a) document the new `turn_driver` shape and collapsed `event_kind` enum in §4, (b) introduce a new shared hard gate "Gate 9: Turn-Driver Lawfulness" in §7 (joining the existing 8 gates), (c) introduce a required §7a "Turn driver / initiative trace" section in §8 page-plan structure with an active-pressure disposition table, and (d) tighten §16a STCHAR packet labels to a closed vocabulary that fails on unknown labels (current behavior at line 519 warns).

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/_shared-templates/story-state-contract.md` currently has §4 record schemas at lines 70-76 (cross-referencing the sibling `story-record-schemas.md` template); §7 shared hard gates at lines 391-404 with exactly 8 named gates (input legality / parent snapshot compatibility / mystery / invariant firewall / branch isolation / append-only delta / consequence capacity or terminal proof / plan grounding / canon promotion hold); §8 page-plan structure at lines 408-550 with 19 numbered sections plus optional §9b/§9c/§10b; §16a STCHAR packet labels at line 519 emits a warning on unknown labels (verified via reassess-spec Agent 2 in this session).
2. SPEC-76 §3.2 prescribes the contract amendments verbatim — Gate 9 ("Turn-Driver Lawfulness"), §7a section with required content lines + active-pressure disposition table, §16a tightening from warn → fail.
3. **Cross-skill / cross-artifact boundary**: this contract is consumed by all 8 story-pipeline skills (Skill Category 2c per FOUNDATIONS §Story Bundles §7) — `story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`. Each skill that references §7 hard gates (typically `branching-story-turn-cycle`, `branching-story-bootstrap`, `branching-story-prose-attach`) will pick up Gate 9 automatically without skill-side edits. The skills that produce or validate page plans (`branching-story-turn-cycle`, `branching-story-health-audit`, the page_plan_turn_driver_consistency validator in SPEC76TURDRIPRI-005) consume §7a's required content shape.
4. **FOUNDATIONS principle**: §Story Bundles §4a (Plan-Authority Boundary) and §5c (Present Causal State, Not Narrative Shape — including the "Driver salience is local." extension landed by SPEC-78) jointly govern this ticket. §4a establishes that turn-driver lives on `SE` (causal event); page-plan §7a is a render-side projection of `SE.turn_driver`, validated for consistency by SPEC76TURDRIPRI-005 — the plan does not become a second state engine. §5c's "Driver salience is local" doctrine grounds Gate 9: driver-then-SLT selection is a prior local-salience-ranking pass before SLT selection, gated by Gate 9's lawfulness check.
5. **HARD-GATE semantics**: Gate 9 is a new shared hard gate added to §7. The eight existing gates remain unchanged; Gate 9 specifically requires every `turn_resolution` SE event to carry a well-formed `turn_driver` whose driver records are active on the parent page snapshot, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall). Gate 9 is enforced at page-plan commit by the structural validators landing in SPEC76TURDRIPRI-003 + SPEC76TURDRIPRI-004; this ticket establishes the contractual gate text, not the enforcement code. The §16a tightening from warn → fail is a behavior change on the existing `page_plan_stchar_packet_integrity` validator — that validator's source code change is NOT in this ticket; it lands as a sub-task of the validator's natural maintenance cycle or as a follow-up if SPEC-76 implementation does not naturally include it (note: the validator change does not have a separate SPEC-76 deliverable — the contract text is the authoritative source and the validator's compliance with the contract is itself the implementation requirement).

## Architecture Check

1. **Contract as authoritative source**: amending the shared contract first establishes the record-schema, gate, and page-plan-section shapes that downstream skills + validators consume. Per FOUNDATIONS §Story Bundles §5b, "skills must not add fields to those schemas without amending the contract first" — the contract amendment IS the precondition for the validators landing in SPEC76TURDRIPRI-003 through 006. Alternatives considered and rejected: (a) document Gate 9 only in `branching-story-turn-cycle/SKILL.md` — rejected, gate semantics are shared across all 8 story-pipeline skills and the contract is the canonical home; (b) defer §16a tightening to a future spec — rejected, SPEC-76 §3.2 explicitly raises it under the new contract.
2. **No backwards-compatibility aliasing**: §7 grows from 8 to 9 gates additively; §8 grows by a single new §7a section; §16a's warn→fail change is a behavior tightening, not a backwards-compatible deprecation path.

## Verification Layers

1. **Invariant**: §4 documents the new `turn_driver` shape and collapsed `event_kind` enum → grep-proof against the contract file for the new field names + retired enum values absent from §4.
2. **Invariant**: §7 contains exactly 9 named gates (the original 8 + Gate 9: Turn-Driver Lawfulness) → manual review of §7 + count assertion.
3. **Invariant**: §8 introduces §7a "Turn driver / initiative trace" with the required content lines + active-pressure disposition table → grep-proof for the §7a header + the required content keys (`Driver kind:`, `Initiator:`, `Driver records:`, `Player response mode:`, `POV visibility:`, `Observer-firewall note:`).
4. **Invariant**: §16a documents the warn→fail upgrade on unknown `Required because:` labels → grep-proof for the updated §16a paragraph's wording change.
5. **Invariant**: Gate 9's enforcement surface is named in the contract text → cross-reference to the structural validators landing in SPEC76TURDRIPRI-003 + SPEC76TURDRIPRI-004.

## What to Change

### 1. §4 — Document the new `turn_driver` shape and collapsed `event_kind` enum

Amend §4's record-schema documentation (or the sibling `story-record-schemas.md` template the §4 paragraph references, if the schemas live there per the contract's cross-reference) to document the SE record's new shape: collapsed `event_kind` enum (per SPEC76TURDRIPRI-001), required `turn_driver` object when `event_kind = turn_resolution`, extended `selection_source` enum. Per the contract's authoritative role, the §4 documentation should mirror the JSON schema's field shapes and per-kind constraints; the JSON schema is the source of truth, the contract documents the shape for skill-side authoring.

### 2. §7 — Add Gate 9: Turn-Driver Lawfulness

After the existing eighth gate (canon promotion hold), append:

```
9. **Turn-Driver Lawfulness** — every `turn_resolution` event must carry a well-formed `turn_driver` whose driver records are active on the parent page snapshot, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall). Enforced by `turn_driver_schema_compliance` (cross-record-boundary constraints) and `turn_driver_pov_observer_firewall` (POV access-route consistency) at page-plan commit.
```

Update any introductory text in §7 that names the gate count (e.g., "the eight shared hard gates") to read "the nine shared hard gates."

### 3. §8 — Introduce §7a Turn driver / initiative trace

Insert a new sub-section between §7 (page-plan §6 sub-sections / §7) and the existing §8 / §9 numbering (the section number §7a indicates an "inserted between 7 and 8" position in the page-plan structure rather than a renumbering of §8+ sections). The §7a content shape, per SPEC-76 §3.2:

```
## 7a. Turn driver / initiative trace

Required content (all lines must appear; values are page-author-supplied):

- Driver kind: <one of player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision>
- Initiator: <STENT-<integer> | player | world | system | unknown>
- Driver records: <comma-separated record ids; matches SE.turn_driver.driver_records>
- Player response mode: <initiates | responds | witnesses | chooses_continuation | none>
- POV visibility: <perceived_directly | inferred_from_trace | reported | discovered_after | withheld>
- Observer-firewall note: <one sentence on the access route for non-player drivers; "n/a" for player_action / player_write_in>

The SE.turn_resolution event's `world_logic_rationale` (an existing required field on SE) is the carrier for the driver-justification (the source-report `why_now` content folds into it per §3.1); §7a's `Driver kind:` and `Driver records:` lines together with `world_logic_rationale` form the complete driver provenance.

Active-pressure disposition (every high-urgency active record on parent PG.state_snapshot must appear in exactly one row):

| Record | Disposition | Reason / expiry |
|---|---|---|
| <ID> | selected | became this turn's driver |
| <ID> | deferred | <expires after PG-<integer> or condition> |
| <ID> | rejected | <one-sentence reason> |
```

Carve-out: §7a is omitted when SE-1 is `story_start` (driver-less) per SPEC76TURDRIPRI-009 (bootstrap skill).

### 4. §16a — Tighten `Required because:` label vocabulary to FAIL

Amend the existing §16a paragraph that currently states "Labels outside the closed vocabulary emit a warning" (line 519) to read "Labels outside the closed vocabulary FAIL under the new contract." Adjacent prose should reference the implementing validator (`page_plan_stchar_packet_integrity`) and note that the new contract raises the previous warn behavior to a hard fail.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- The structural validators that enforce Gate 9 — ship in SPEC76TURDRIPRI-003 (`turn_driver_schema_compliance`) and SPEC76TURDRIPRI-004 (`turn_driver_pov_observer_firewall`).
- The page_plan_turn_driver_consistency validator that parses §7a — ships in SPEC76TURDRIPRI-005.
- The active_pressure_handling_discipline validator that enforces the §7a active-pressure table — ships in SPEC76TURDRIPRI-006.
- `page_plan_stchar_packet_integrity` validator source change (warn → fail) — out of scope; the validator's behavior is dictated by the contract text amended here; the validator's source code update lands in its own maintenance cycle or as a sibling follow-up if not absorbed elsewhere.
- Skill SKILL.md edits — ship in SPEC76TURDRIPRI-008/009/010.
- Schema JSON file changes — ship in SPEC76TURDRIPRI-001.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "9\. \*\*Turn-Driver Lawfulness\*\*" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 1 match.
2. `grep -nE "^## 7a\. Turn driver" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 1 match.
3. `grep -nE "the eight shared hard gates" .claude/skills/_shared-templates/story-state-contract.md` returns 0 matches (replaced by "nine shared hard gates" where applicable).
4. `grep -nE "Labels outside the closed vocabulary.*FAIL" .claude/skills/_shared-templates/story-state-contract.md` returns at least 1 match.
5. `grep -nE "turn_driver" .claude/skills/_shared-templates/story-state-contract.md` returns multiple matches across §4 and §7a (the contract documents the field shape).

### Invariants

1. The shared story state contract is the single authoritative source for story-bundle record schemas, hard gates, and page-plan structure; downstream skills + validators reference the contract rather than re-declaring conventions.
2. Gate 9 joins the existing 8 gates additively; no existing gate is renamed, renumbered, or removed.
3. §7a is the render-side projection of `SE.turn_driver`, validated for consistency by SPEC76TURDRIPRI-005 — preserving the §4a Plan-Authority Boundary.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "9\. \*\*Turn-Driver Lawfulness\*\*|^## 7a\. Turn driver|the eight shared hard gates|Labels outside the closed vocabulary.*FAIL|turn_driver" .claude/skills/_shared-templates/story-state-contract.md` — covers all 5 Acceptance Criteria grep-proofs in a single command.
2. Manual review of §7 gate listing — confirm 9 gates named in sequence and the introductory text references "nine shared hard gates" consistently.
