# STOTURNCYC-002: Surface the canonical player-driver `turn_driver` shape in turn-cycle phase references

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — documentation only: `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md`, `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`. No validator/tool/code change.
**Deps**: None

## Problem

When the turn driver is a player source (`player_action` / `player_write_in`), the committed `SE.turn_driver` must use a specific canonical shape: `initiator: player`, `driver_records: []`, `player_response_mode: initiates`, `pov_visibility: perceived_directly`. This shape is documented **only** in the shared schema `story-record-schemas.md` §4.3. The turn-cycle skill's own phase references (Phase 0 driver selection, Phase 1 action resolution, Phase 6 page-snapshot/`SE` drafting) never restate it.

Worse, `references/phase-2-3-commitment-and-state-delta.md` instructs the author to build a `turn_driver` argument for `mcp__worldloom__select_storylet_candidates` whose shape legitimately carries `initiator` and `driver_records` hints for projection filtering — a *different* shape than the committed `SE.turn_driver` for a player turn. During the red-bunny PG-3 → PG-4 run, the `select_storylet_candidates` call was (correctly) made with `initiator: STENT-1` and populated `driver_records` as filter hints; the committed `SE.turn_driver` then had to be corrected to `initiator: player` / `driver_records: []`. The correct shape was recovered only by reading shared schema §4.3 before drafting the `SE`. An author who carries the `select_storylet_candidates` hint shape straight into `SE.turn_driver` produces a Gate 9 turn-driver-lawfulness violation.

This is FOUNDATIONS §Story Bundles §6b / shared-contract Gate 9 (Turn-Driver Lawfulness) working correctly at the validator layer (`turn_driver_schema_compliance`, `pg_se_turn_driver_consistency`, `turn_driver_pov_observer_firewall`); the gap is that the player-driver shape and the SLT-selection-hint-vs-committed-driver distinction are not surfaced where the turn-cycle author drafts the event.

## Assumption Reassessment (2026-05-29)

1. **Canonical shape source (docs).** `.claude/skills/_shared-templates/story-record-schemas.md` §4.3: *"Player driver kinds (`player_action`, `player_write_in`) use `initiator: player`, empty `driver_records`, `player_response_mode: initiates`, and `pov_visibility: perceived_directly`."* This is the single authoritative statement.
2. **Turn-cycle phase references (skills).** `references/phase-6-page-snapshot.md` documents `pov_visibility` for **non-player** drivers in detail but never states the player-driver shape; `references/phase-1-action-resolution.md` covers action routing but not the `turn_driver` field shape; `references/phase-2-3-commitment-and-state-delta.md` instructs building a `turn_driver` for `select_storylet_candidates` (the SLT-selection hint shape) without flagging that this is not the committed `SE.turn_driver` shape for player turns. Shared boundary under audit: turn-cycle phase docs ↔ the SE `turn_driver` schema/validators.
3. **Tool-input vs record-field divergence (codebase).** `mcp__worldloom__select_storylet_candidates`'s `turn_driver` input schema requires `kind` + `driver_records` and accepts an `initiator`; these are projection-filter hints and are intentionally looser than `SE.turn_driver`. `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` lines 118-124 confirm the committed-record contract: for player driver kinds the response-choice grounding check is a no-op and `driver_records` is expected empty. `turn_driver_schema_compliance` / `pg_se_turn_driver_consistency` / `turn_driver_pov_observer_firewall` enforce the committed shape. This is an information-path divergence: the same conceptual "driver" is expressed in two shapes across two surfaces, and only the committed one is validated.
4. **FOUNDATIONS principle restated.** FOUNDATIONS §Story Bundles §6b (Observer Firewall / driver-visibility) and shared-contract Gate 9 (Turn-Driver Lawfulness): a `turn_resolution` event's `turn_driver` must lawfully match its source of initiative and the POV's information access. The player shape (`initiator: player`, empty `driver_records`, `perceived_directly`) is the correct expression for player-initiated acts. This ticket documents, not changes, that contract.

## Architecture Check

1. Documentation-only and additive: it restates an already-enforced shape at the two surfaces where the author drafts the `SE` (Phase 6) and resolves the action (Phase 1), plus a one-line disambiguation where the looser `select_storylet_candidates` hint shape is built (Phase 2-3). Removes a latent Gate 9 failure with zero behavioral risk.
2. No backwards-compatibility shims or aliasing — prose additions only.

## Verification Layers

1. Player-driver shape stated in the doc matches §4.3 and the validators → codebase grep-proof against `story-record-schemas.md` §4.3 and the player-kind handling in `turn-cycle-output-grounding-integrity.ts` (lines 118-124).
2. SLT-selection-hint-vs-committed-driver disambiguation is correct → grep-proof against the `select_storylet_candidates` `turn_driver` input schema (looser) vs the `SE.turn_driver` schema (`story-event.schema.json`).
3. Guidance prevents the failure → skill dry-run: a `player_write_in` turn-cycle envelope whose `SE.turn_driver` uses `initiator: player` / `driver_records: []` / `player_response_mode: initiates` / `pov_visibility: perceived_directly` passes `turn_driver_schema_compliance`, `pg_se_turn_driver_consistency`, and `turn_driver_pov_observer_firewall`.

## What to Change

### 1. `references/phase-6-page-snapshot.md`

Add a "Turn-driver shape for player drivers" note alongside the existing non-player `pov_visibility` guidance: for `player_action` / `player_write_in`, the committed `SE.turn_driver` is exactly `{kind, initiator: player, driver_records: [], player_response_mode: initiates, pov_visibility: perceived_directly}`; the player's motivation grounding lives in `world_logic_rationale` prose, not in `driver_records`.

### 2. `references/phase-1-action-resolution.md`

Add a one-line pointer at action resolution: when the resolved driver is a player source, the resulting `SE.turn_driver` uses the canonical player shape above (link to Phase 6 note / shared schema §4.3).

### 3. `references/phase-2-3-commitment-and-state-delta.md`

Where the `select_storylet_candidates` `turn_driver` argument is constructed, add a caution: the `turn_driver` passed to `select_storylet_candidates` carries `initiator`/`driver_records` only as projection-filter hints and is NOT the committed `SE.turn_driver`; for player turns the committed event still uses `initiator: player` and `driver_records: []`. Do not copy the selection-hint shape onto the event.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)

## Out of Scope

- Changing `select_storylet_candidates`'s input schema or any `turn_driver` validator (both are correct).
- Non-player driver `turn_driver` guidance (already documented in Phase 6).
- The SF/CNSQ/DA `derived_from` grounding gap (tracked in STOTURNCYC-001).

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: the player-driver shape written into the docs matches §4.3 of `story-record-schemas.md` field-for-field (`initiator: player`, `driver_records: []`, `player_response_mode: initiates`, `pov_visibility: perceived_directly`).
2. Skill dry-run: a `player_write_in` envelope with the canonical `SE.turn_driver` passes `turn_driver_schema_compliance`, `pg_se_turn_driver_consistency`, and `turn_driver_pov_observer_firewall`.
3. Full-pipeline: the existing turn-driver validator suite passes unchanged (no behavior change).

### Invariants

1. Player-initiated `turn_resolution` events carry `initiator: player` and empty `driver_records` (Gate 9 / FOUNDATIONS §6b).
2. The `select_storylet_candidates` `turn_driver` hint shape is never conflated with the committed `SE.turn_driver` shape in the authoring docs.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (`turn_driver_schema_compliance`, `pg_se_turn_driver_consistency`, `turn_driver_pov_observer_firewall`) is named in Assumption Reassessment.`

### Commands

1. `grep -n "Player driver kinds" .claude/skills/_shared-templates/story-record-schemas.md` (confirm canonical source the docs must mirror)
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <player-write-in-envelope>.json` (confirm canonical player turn_driver passes all three turn-driver validators)
3. A narrower validator boundary is correct because the change is doc-only; the dry-run proves the documented shape yields a passing player-driver event.
