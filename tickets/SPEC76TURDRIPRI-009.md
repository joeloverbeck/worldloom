# SPEC76TURDRIPRI-009: Bootstrap skill — §7a carve-out for `story_start` SE-1

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` (minor SE-1 documentation + PG-1 page-plan §7a omission rule)
**Deps**: SPEC76TURDRIPRI-002

## Problem

The bootstrap skill creates the opening page (PG-1) and its `SE-1` event always with `event_kind: story_start`. Per SPEC76TURDRIPRI-002's contract amendment, `story_start` events forbid `turn_driver` (the field is restricted to `turn_resolution` events per the JSON schema's conditional rule). The bootstrap's root PG-1 page plan therefore omits the new §7a section — there is no turn driver to declare when SE-1 is `story_start`. SPEC-76 §3.4 prescribes this carve-out documentation explicitly: PG-1 emits choices and waits for player; §7a is omitted; SE-1 only carries `turn_driver` if `story_start` is followed immediately by an `advance_initiative` continuation (an edge case where the world acts before the player's first choice).

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/branching-story-bootstrap/SKILL.md:145` documents `SE-1` as always emitting `event_kind: story_start`. The current SKILL.md does not reference §7a (the section does not yet exist pre-SPEC76TURDRIPRI-002). Verified via reassess-spec Agent 2 in this session.
2. SPEC-76 §3.4 prescribes the carve-out documentation verbatim: "The opening page (PG-1) `SE-1` event always has `event_kind: story_start` (unchanged), but now carries `turn_driver` only when `story_start` is followed immediately by an `advance_initiative` continuation. For the standard 'PG-1 emits choices and waits for player' pattern, `story_start` remains in the carve-out that forbids `turn_driver` per §3.1. The bootstrap's root page plan §7a is omitted when SE-1 is `story_start` (driver-less). Seeded SLTs become eligible for non-player drivers per SPEC-77 (`compatible_turn_drivers` field)."
3. **Cross-skill / cross-artifact boundary**: this skill consumes the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` (§7a added by SPEC76TURDRIPRI-002 — the bootstrap skill's omission rule is the documented exception to §7a's per-page requirement). The shape under audit is the SE-1 + PG-1 root-page authoring procedure — the carve-out preserves the `story_start` / `turn_driver: forbidden` contract while documenting the rare case where SE-1 carries a driver (followed by `advance_initiative`).

## Architecture Check

1. **Documented carve-out, not behavioral exception**: the bootstrap's existing behavior (SE-1 = `story_start`, no driver) is preserved unchanged; this ticket only documents the rule explicitly so future operators know §7a is omitted by design at PG-1. Alternatives considered and rejected: (a) emit a vestigial §7a section with all-null driver fields — rejected, violates the contract's "§7a is the projection of turn_driver, which is forbidden on story_start" semantic; (b) document the carve-out only inline in SPEC-76 without amending the bootstrap SKILL.md — rejected, the carve-out is a recurring authoring decision the bootstrap operator encounters on every world; SKILL.md is the canonical home.
2. **No backwards-compatibility aliasing**: the documentation is additive to the existing bootstrap procedure; no fallback shim is introduced.

## Verification Layers

1. **Invariant**: SKILL.md documents that PG-1's page plan omits §7a when SE-1 = `story_start` → grep-proof for the §7a omission rule.
2. **Invariant**: SKILL.md documents the edge case where SE-1 carries `turn_driver` (only when immediately followed by an `advance_initiative` continuation) → grep-proof for the `advance_initiative` cross-reference.
3. **Invariant**: bootstrap continues to emit SE-1 = `story_start` (existing behavior unchanged) → grep-proof for the existing `event_kind: story_start` declaration at SKILL.md:145.

## What to Change

### 1. Document the §7a omission rule

Add a brief paragraph in the bootstrap SKILL.md near the existing SE-1 declaration (line 145) noting:

> The opening page (PG-1) `SE-1` event always has `event_kind: story_start` (unchanged). Per the shared contract (`_shared-templates/story-state-contract.md` §7a), `story_start` events forbid `turn_driver` — and PG-1's page plan therefore omits the §7a Turn driver / initiative trace section in the standard "PG-1 emits choices and waits for player" pattern. The single edge case where SE-1 carries `turn_driver` is when `story_start` is followed immediately by an `advance_initiative` continuation (the world acts before the player's first choice); in that case, the continuation SE event carries `turn_resolution` + `turn_driver`, not SE-1 itself.

### 2. Document seeded-SLT eligibility for non-player drivers

Per SPEC-76 §3.4 final sentence, note that seeded SLTs become eligible for non-player drivers per SPEC-77's `compatible_turn_drivers` field (a forward reference; the bootstrap doesn't itself need to populate the field, but the SLT seed shape changes once SPEC-77 lands). The reference should be brief — the bootstrap doesn't enforce the field; SPEC-77's tickets will introduce the seed authoring.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- Contract amendments (§7a section itself) — ship in SPEC76TURDRIPRI-002.
- Turn-cycle skill Phase 0 — ship in SPEC76TURDRIPRI-008.
- Health-audit Reactivity Inertness pass — ship in SPEC76TURDRIPRI-010.
- SPEC-77's `compatible_turn_drivers` SLT-seed-authoring change — out of scope; the bootstrap notes the future surface but does not implement it.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "§7a" .claude/skills/branching-story-bootstrap/SKILL.md` returns at least 1 match (omission rule documented).
2. `grep -nE "advance_initiative" .claude/skills/branching-story-bootstrap/SKILL.md` returns at least 1 match (edge case documented).
3. `grep -nE "event_kind: story_start" .claude/skills/branching-story-bootstrap/SKILL.md` returns the existing declaration at line 145 (existing behavior unchanged).
4. Manual review confirms the new paragraph reads coherently in context.

### Invariants

1. Bootstrap continues to emit SE-1 = `story_start` (no behavioral change).
2. PG-1's page plan omits §7a when SE-1 = `story_start` (documented carve-out).
3. The advance_initiative edge case is documented but not implemented by the bootstrap — it falls under the turn-cycle skill's Phase 0 logic per SPEC76TURDRIPRI-008.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "§7a|advance_initiative|event_kind: story_start" .claude/skills/branching-story-bootstrap/SKILL.md` — covers all 3 Acceptance Criteria grep-proofs.
2. Manual review of the inserted paragraph for prose coherence.
