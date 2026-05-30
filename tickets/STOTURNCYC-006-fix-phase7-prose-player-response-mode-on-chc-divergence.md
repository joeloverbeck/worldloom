# STOTURNCYC-006: Fix Phase 7 prose conflating SE.turn_driver.player_response_mode with a non-existent CHC field

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill-prose-only update to `.claude/skills/branching-story-turn-cycle/SKILL.md` line 168
**Deps**: None

## Problem

`SKILL.md` Phase 7 (line 168) instructs authors that "When `driver.kind` is non-player, emitted CHCs must use `player_response_mode: responds | witnesses | chooses_continuation`, and at least one emitted CHC with `player_response_mode: responds` must materially respond to the driver…" — but the CHC schema has no `player_response_mode` field, and the SE schema's `player_response_mode` lives on `SE.turn_driver` (not on CHC) and is const-pinned to `initiates` for player driver kinds. An author following the SKILL.md prose literally would try to set a CHC field that doesn't exist; the contract the prose is actually trying to express ("when parent SE was non-player-driven, at least one emitted CHC must materially respond to the driver via grounded_in.records + action_families") is enforced by `turn_cycle_output_grounding_integrity.chc_response_topical_grounding_missing`, not by any CHC-level mode field. The misleading prose is structurally invisible during player turns and would only surface when an author tries to follow it during an npc-driven emission, making it a latent docs-trap for the next non-player driver flow.

## Assumption Reassessment (2026-05-30)

1. `tools/validators/src/schemas/story-choice.schema.json` (consulted via `mcp__worldloom__describe_envelope_schema(op_kind="create_chc_record")` during the PG-7→PG-8 retrospective session) lists CHC required+optional fields as exactly `{id, story_id, created_at_page, supersedes, surface_label, player_visible_intent, target_or_action_families, likely_state_pressure, grounded_in, success_policy}` with `additionalProperties: false` — there is no `player_response_mode` field. `tools/validators/src/schemas/story-event.schema.json:91,114,133,147` confirm `player_response_mode` is an `SE.turn_driver` field with the schema rules constraining `player_action`/`player_write_in` driver kinds to `player_response_mode: "initiates"` only.
2. `.claude/skills/branching-story-turn-cycle/SKILL.md:168` is the sole conflation site (one assistant grep over the whole skill directory). `references/phase-1-action-resolution.md:44` and `references/phase-6-page-snapshot.md:53` use the field correctly only on `SE.turn_driver`, demonstrating the reference set already carries the right model.
3. Cross-skill audit: this is purely a skill-prose defect inside `branching-story-turn-cycle/SKILL.md`; no other skill or shared template duplicates the misleading prose (grep confirmed). No shared template needs to change.
4. FOUNDATIONS principle under audit: §Schema Minimalism + Rule 6 (No Silent Retcons) — the SKILL.md is the contract surface authors trust; a field-existence claim in skill prose that the schema rejects is a silent contract violation against the validator-enforced reality. Fixing the prose realigns SKILL.md with the schema-of-record.

## Architecture Check

1. The cleanest fix is to rewrite the misleading sentence so it speaks in CHC-grounding-and-action-family terms (which is what the underlying validator `turn_cycle_output_grounding_integrity.chc_response_topical_grounding_missing` actually enforces) instead of inventing a CHC-level mode field. This keeps SKILL.md aligned with the schema-of-record and with `references/phase-8-choice-generation.md`, which already describes the same requirement correctly (it talks about grounding in the driver's `initiator` or `driver_records[]`, not about a CHC field).
2. No backwards-compatibility shims introduced — the misleading prose has never been a real schema feature; nothing consumes it programmatically, so striking and rewording is a clean docs-only change.

## Verification Layers

1. CHC schema field-list invariant (no `player_response_mode` exists) → codebase grep-proof: `grep -n player_response_mode tools/validators/src/schemas/story-choice.schema.json` returns zero matches at HEAD before and after the change.
2. SE.turn_driver.player_response_mode constraint for player drivers stays "initiates"-only → codebase grep-proof: `tools/validators/src/schemas/story-event.schema.json` allOf clauses for `player_action`/`player_write_in` keep `player_response_mode: { const: "initiates" }`.
3. Post-fix SKILL.md line 168 no longer claims CHCs carry a `player_response_mode` field → codebase grep-proof: `grep -n player_response_mode .claude/skills/branching-story-turn-cycle/SKILL.md` returns zero matches after the edit.
4. Underlying contract (response-shaped CHCs must materially respond to non-player driver) still has a single canonical statement in SKILL.md Phase 7, expressed in CHC-grounding-and-action-family terms consistent with `references/phase-8-choice-generation.md` and the `turn_cycle_output_grounding_integrity.chc_response_topical_grounding_missing` validator → manual review of the rewritten sentence + grep `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` for the canonical enforcement code.

## What to Change

### 1. Rewrite `.claude/skills/branching-story-turn-cycle/SKILL.md` line 168

Replace the misleading clause about CHCs "using `player_response_mode`" with a clause that names the actual contract:

- When `driver.kind` on the parent SE is non-player (`npc_action` / `offstage_action` / `world_pressure` / `clock_fire` / `secret_reveal` / `multi_actor_collision`), at least one emitted CHC at the resulting PG MUST materially respond to the driver by grounding `grounded_in.records[]` in the driver's `initiator` STENT or in one of `driver_records[]`, AND by carrying at least one of the response action families (`oppose`, `protect`, `evade`, `communicate`, `investigate`) in `target_or_action_families[]`.
- The enforcement is `turn_cycle_output_grounding_integrity.chc_response_topical_grounding_missing`; cite this validator name in the prose so authors can grep to the source if they want to verify.
- Do not introduce any CHC-level `player_response_mode` (or equivalent) field — `player_response_mode` lives on `SE.turn_driver` only, and for player drivers is schema-pinned to `initiates`.

Keep the rest of the Phase 7 sentence (about grounding STPLAN / STEMO / CLK / STSEC / STQ / STINT / SF / STCHAR records in `grounded_in.records[]`) intact; it is already correct.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- Any change to `references/phase-8-choice-generation.md` (already correct).
- Any change to the validator `turn_cycle_output_grounding_integrity` or the `story-choice.schema.json` / `story-event.schema.json` schemas (no schema gap — the gap is in skill prose).
- Adding a CHC-level response-mode field (explicitly rejected: would expand schema surface for a contract already covered by grounding + action-family enforcement).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n player_response_mode .claude/skills/branching-story-turn-cycle/SKILL.md` → zero matches.
2. `grep -n player_response_mode .claude/skills/branching-story-turn-cycle/references/*.md` → matches limited to `phase-1-action-resolution.md:44` and `phase-6-page-snapshot.md:53` (both on `SE.turn_driver`, both correct).
3. The rewritten Phase 7 sentence in SKILL.md names `turn_cycle_output_grounding_integrity.chc_response_topical_grounding_missing` as the canonical enforcement validator, and names `oppose | protect | evade | communicate | investigate` as the response action families it already enumerates.

### Invariants

1. SKILL.md never asserts a CHC schema field that `story-choice.schema.json` does not carry.
2. The non-player-driver response-CHC contract is stated exactly once in Phase 7 of SKILL.md, consistent with `references/phase-8-choice-generation.md`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n player_response_mode .claude/skills/branching-story-turn-cycle/SKILL.md` (must return zero matches after the edit).
2. `grep -n player_response_mode .claude/skills/branching-story-turn-cycle/references/*.md` (must continue to return exactly the two pre-existing correct matches).
3. `grep -n chc_response_topical_grounding_missing tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (must return a non-empty match — the validator name cited in the rewritten prose must exist).
