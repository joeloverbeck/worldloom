# SPEC79CHCREM-009: Red Kiln Ambush fixture — rewrite CHC-21..25 to schema-conformant shape

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (Red Kiln Ambush test fixture, CHC entries CHC-21 through CHC-25).
**Deps**: SPEC79CHCREM-001

## Problem

The Red Kiln Ambush fixture's five CHC entries (CHC-21 through CHC-25 at lines 180-253) carry pre-removal schema-drifting fields: each entry has `id, story_id, created_at_page, choice_text, player_response_mode, grounded_in.records`. `choice_text` is not a CHC schema field (the canonical field is `surface_label`); `player_response_mode` belongs on `SE.turn_driver` per SPEC-76, not on CHC; and the post-001 required CHC fields (`surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`) are absent. The fixture must be rewritten to the post-removal CHC shape so it validates against the new schema.

The fixture's `pages-prose-plans/PG-2.md` content at JSON line 258 (which contains the §7a turn-driver trace including "Player response mode: responds") is page-plan content, not CHC content; it remains unchanged because `player_response_mode` IS canonical on the page-level turn-driver trace per SPEC-76.

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` lines 180-253 carry five CHC entries (CHC-21 through CHC-25), each with the pre-removal schema-drifting fields. Verified via grep + targeted Read at reassessment time. The PG-2 plan content at line 258 carries the page-level §7a turn-driver trace; this is page-plan content, not CHC content.
2. Confirmed SPEC-79 §6.1 prescribes the per-CHC rewrite shape: each entry needs `id, story_id, created_at_page, surface_label, player_visible_intent, target_or_action_families, likely_state_pressure, grounded_in.records`. The §6.1 worked example covers CHC-21 explicitly; CHC-22 through CHC-25 follow the same shape with their respective `target_or_action_families` and `likely_state_pressure` derived from the existing `grounded_in.records` and the Red Kiln ambush context.
3. Cross-skill boundary: the Red Kiln fixture is consumed by `tools/validators/tests/integration/spec34-integration.test.ts` (turn_driver_hidden_state_leak verification per spec §9 test 3) and other integration tests that exercise the fixture's post-bootstrap state. After this rewrite, the fixture validates against the new CHC schema with zero errors; the existing integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to pass per spec §9 test 3.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the rewrite removes non-schema fields (`choice_text`, `player_response_mode` from CHC) and adds required schema fields. Each CHC entry's `grounded_in.records` is preserved (it was already present pre-rewrite) and carries the storylet-grounding intent the now-removed `associated_commitment_block` formerly hinted at.
5. Removal blast radius (was template item 7): this ticket rewrites five CHC entries in one fixture file. The fixture's other content (the PG-2 plan content, SE records, STENT records, etc.) is unchanged. No other fixture references the removed CHC fields with the same pattern (handled in 010 for fixtures with the simpler key-drop pattern).

## Architecture Check

1. Per-CHC rewrite to the post-removal schema shape is structurally simpler than attempting to migrate the existing fields (the pre-removal fields don't carry the same information as the post-removal fields — `choice_text` is replaced by `surface_label`, but `player_response_mode` has no CHC equivalent post-SPEC-76; the field belongs on `SE.turn_driver`). The rewrite drops the drifting fields and adds the required schema fields with content derived from the existing `grounded_in.records` and the surrounding fixture context.
2. No backwards-compatibility aliasing/shims introduced. The fixture is a test artifact, not a production data store; the rewrite reflects the post-removal schema shape with no migration path needed.

## Verification Layers

1. The fixture validates against the new CHC schema with zero errors → schema validation: `cd tools/validators && npm test -- --test-name-pattern='red-kiln'` passes; the fixture's CHC entries match the post-001 schema's required[] list and properties set.
2. The integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to pass → codebase grep-proof + schema validation: `cd tools/validators && npm test -- --test-name-pattern='spec34-integration'` passes against the rewritten fixture.
3. The fixture's PG-2 plan content (containing the §7a turn-driver trace with "Player response mode: responds") remains unchanged → manual review of the unchanged page-plan content at JSON line 258.
4. The fixture's other content (SE records, STENT records, world-canon excerpts, etc.) remains unchanged → manual review of the unchanged fixture sections outside lines 180-253.

## What to Change

### 1. `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json`

- At lines 180-253, rewrite each of the five CHC entries (CHC-21 through CHC-25) to the post-removal CHC shape. The CHC-21 entry follows the spec §6.1 worked example:
  ```json
  {
    "id": "CHC-21",
    "story_id": "STORY-76",
    "created_at_page": "PG-2",
    "surface_label": "Protect Mara from the shot line.",
    "player_visible_intent": "Intervene to absorb or redirect the incoming shot.",
    "target_or_action_families": ["protect"],
    "likely_state_pressure": "Jon reacts to Varro's shot line under STPLAN-9 pressure.",
    "grounded_in": { "records": ["STPLAN-9"] }
  }
  ```
- For CHC-22 through CHC-25, apply the same shape with each CHC's respective `target_or_action_families` and `likely_state_pressure` derived from its existing `grounded_in.records` and the surrounding Red Kiln Ambush fixture context. Each CHC's `target_or_action_families` should use action-family taxonomy values appropriate to the choice's intent (e.g., `protect`, `evade`, `negotiate`, `oppose`, `perceive`, `investigate`); each `likely_state_pressure` should be a natural-language pressure description grounded in the entry's existing `grounded_in.records`.
- Drop `player_response_mode` from every CHC entry. Drop `choice_text` (replaced by `surface_label`).
- The PG-2 plan content at JSON line 258 (containing the §7a turn-driver trace including "Player response mode: responds") remains unchanged — this is page-plan content, not CHC content.
- The fixture's other sections (SE records, STENT records, world-canon excerpts, etc.) remain unchanged.

## Files to Touch

- `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The validator rewrites (handled in 002, 003).
- World-index changes (handled in 004).
- Skill-side documentation updates (handled in 005, 006, 007).
- Docs update (handled in 008).
- Other fixtures with the simpler key-drop pattern (handled in 010).
- Adding `player_response_mode` to the CHC schema (rejected per spec §7).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` runs to completion with zero new failures.
2. `cd tools/validators && npm test -- --test-name-pattern='red-kiln'` passes; the fixture's CHC entries validate against the post-001 schema.
3. `cd tools/validators && npm test -- --test-name-pattern='spec34-integration'` passes; the integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to work against the rewritten fixture (per spec §9 test 3).
4. `grep -n "choice_text\|player_response_mode\|associated_commitment_block" tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` returns zero matches inside the CHC-21 through CHC-25 entries (the page-plan content at line 258 may still mention `Player response mode` in its prose — that is acceptable per the spec's explicit carve-out).

### Invariants

1. The Red Kiln Ambush fixture's CHC entries validate against the post-001 CHC schema with zero errors.
2. The integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to pass — the schema rewrite does not break the integration test's mutation path.
3. The PG-2 plan content (page-plan prose, §7a turn-driver trace) remains unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` — rewritten CHC-21 through CHC-25 entries match the post-removal schema shape.

### Commands

1. `cd tools/validators && npm test`
2. `cd tools/validators && npm test -- --test-name-pattern='red-kiln'`
3. `cd tools/validators && npm test -- --test-name-pattern='spec34-integration'`
4. `grep -nE "choice_text|player_response_mode|associated_commitment_block" tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (inspect matches; only the PG-2 page-plan prose at line 258 should retain `Player response mode` references).
