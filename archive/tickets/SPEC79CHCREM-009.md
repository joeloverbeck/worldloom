# SPEC79CHCREM-009: Red Kiln Ambush fixture — rewrite CHC-21..25 to schema-conformant shape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (Red Kiln Ambush test fixture, CHC entries CHC-21 through CHC-25), `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (same-seam response-mode authority repair), focused validator tests, and fixture README.
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

At intake, the Red Kiln Ambush fixture's five CHC entries (CHC-21 through CHC-25) carried pre-removal schema-drifting fields: each entry had `id, story_id, created_at_page, choice_text, player_response_mode, grounded_in.records`. `choice_text` is not a CHC schema field (the canonical field is `surface_label`); `player_response_mode` belongs on `SE.turn_driver` per SPEC-76, not on CHC; and the post-001 required CHC fields (`surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`) were absent. The fixture is now rewritten to the post-removal CHC shape.

The fixture's `pages-prose-plans/PG-2.md` content (which contains the §7a turn-driver trace including "Player response mode: responds") is page-plan content, not CHC content; it remains unchanged because `player_response_mode` is canonical on the page-level turn-driver trace per SPEC-76.

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` carried five CHC entries (CHC-21 through CHC-25), each with the pre-removal schema-drifting fields. Verified via grep + targeted read at reassessment time. The PG-2 plan content carries the page-level §7a turn-driver trace; this is page-plan content, not CHC content.
2. Confirmed SPEC-79 §6.1 prescribes the per-CHC rewrite shape: each entry needs `id, story_id, created_at_page, surface_label, player_visible_intent, target_or_action_families, likely_state_pressure, grounded_in.records`. The §6.1 worked example covers CHC-21 explicitly; CHC-22 through CHC-25 follow the same shape with their respective `target_or_action_families` and `likely_state_pressure` derived from the existing `grounded_in.records` and the Red Kiln ambush context.
3. Cross-skill/package boundary: the Red Kiln fixture is consumed by `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` and by package validators that exercise the fixture's post-bootstrap state. Focused proof after the rewrite shows the Red Kiln composed-validator test still passes and a direct `record_schema_compliance` probe over the five CHC records returns zero verdicts.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the rewrite removes non-schema fields (`choice_text`, `player_response_mode` from CHC) and adds required schema fields. Each CHC entry's `grounded_in.records` is preserved (it was already present pre-rewrite) and carries the storylet-grounding intent the now-removed `associated_commitment_block` formerly hinted at.
5. Same-seam fallout: `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` still read `player_response_mode` from CHC records. That contradicted the already-landed CHC schema and made the schema-conformant fixture unable to pass the Red Kiln proof. The repair moved response-mode authority to `SE.turn_driver.player_response_mode` and left CHC topical grounding on `grounded_in.records`.
6. Removal blast radius: this ticket rewrites five CHC entries in one fixture file and truths the same validator/test seam that consumed the retired CHC response-mode field. The fixture's other content (the PG-2 plan content, SE records, STENT records, etc.) is unchanged. The four remaining `associated_commitment_block` fixture hits are handled in 010.

## Architecture Check

1. Per-CHC rewrite to the post-removal schema shape is structurally simpler than attempting to migrate the existing fields (the pre-removal fields don't carry the same information as the post-removal fields — `choice_text` is replaced by `surface_label`, but `player_response_mode` has no CHC equivalent post-SPEC-76; the field belongs on `SE.turn_driver`). The rewrite drops the drifting fields and adds the required schema fields with content derived from the existing `grounded_in.records` and the surrounding fixture context.
2. No backwards-compatibility aliasing/shims introduced. The fixture is a test artifact, not a production data store; the rewrite reflects the post-removal schema shape with no migration path needed.

## Verification Layers

1. The five Red Kiln CHC records validate against the new CHC schema with zero errors → schema validation: direct `record_schema_compliance` probe over `choice_record` entries passes.
2. The integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to pass → targeted tool command: `node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` passes after `npm run build`.
3. The response-mode authority remains on `SE.turn_driver`, not CHC → focused structural test: `node --test dist/tests/structural/turn-cycle-output-grounding-integrity.test.js` passes with schema-shaped CHC fixtures.
4. The fixture's PG-2 plan content (containing the §7a turn-driver trace with "Player response mode: responds") remains unchanged → manual review of the unchanged page-plan content.

## Landed Changes

### 1. `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json`

- Rewrote each of the five CHC entries (CHC-21 through CHC-25) to the post-removal CHC shape. The CHC-21 entry follows the spec §6.1 worked example:
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
- CHC-22 through CHC-25 now use action families and pressure descriptions derived from the existing `grounded_in.records` and Red Kiln ambush context.
- Dropped `player_response_mode` from every CHC entry. Dropped `choice_text` (replaced by `surface_label`).
- The PG-2 plan content (containing the §7a turn-driver trace including "Player response mode: responds") remains unchanged — this is page-plan content, not CHC content.
- The fixture's other sections (SE records, STENT records, world-canon excerpts, etc.) remain unchanged.

### 2. `turn-cycle-output-grounding-integrity`

- Moved response-mode validation from per-CHC `player_response_mode` to `SE.turn_driver.player_response_mode`.
- Kept CHC topical grounding validation on `grounded_in.records` when the non-player driver response mode is `responds`.
- Updated focused structural tests and the Red Kiln integration variant to use the SE-level response-mode authority.
- Updated the Red Kiln fixture README so the fixture notes match the post-SPEC-79 shape.

## Files to Touch

- `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (modify)
- `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (modify)
- `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts` (modify)
- `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (modify)
- `tools/validators/tests/fixtures/red-kiln-ambush/README.md` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The CHC/SLT validator rewrites (handled in 002, 003).
- World-index changes (handled in 004).
- Skill-side documentation updates (handled in 005, 006, 007).
- Docs update (handled in 008).
- Other fixtures with the simpler key-drop pattern (handled in 010).
- Adding `player_response_mode` to the CHC schema (rejected per spec §7).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` passes.
2. `cd tools/validators && node --test dist/tests/structural/turn-cycle-output-grounding-integrity.test.js` passes.
3. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` passes.
4. A direct `record_schema_compliance` probe over the five Red Kiln `choice_record` entries returns zero verdicts.
5. `rg -n "choice_text|associated_commitment_block" tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` returns zero matches; `rg -n "player_response_mode" tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` returns only the SE turn-driver field.

### Invariants

1. The Red Kiln Ambush fixture's CHC entries validate against the post-001 CHC schema with zero errors.
2. The integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to pass — the schema rewrite does not break the integration test's mutation path.
3. The PG-2 plan content (page-plan prose, §7a turn-driver trace) remains unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` — rewritten CHC-21 through CHC-25 entries match the post-removal schema shape.
2. `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts` — CHC fixtures use schema-shaped choice records and response mode lives on the event turn driver.
3. `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` — wrong-response-mode variant mutates `SE.turn_driver.player_response_mode`.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/turn-cycle-output-grounding-integrity.test.js`
3. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js`
4. `cd tools/validators && node --input-type=module -e 'import { readFileSync } from "node:fs"; import { recordSchemaCompliance } from "./dist/src/structural/record-schema-compliance.js"; import { context } from "./dist/tests/structural/helpers.js"; const fixture = JSON.parse(readFileSync("tests/fixtures/red-kiln-ambush/fixture.json", "utf8")); const records = fixture.records.filter((item) => item.node_type === "choice_record").map((item) => ({ ...item, world_slug: fixture.world_slug, story_slug: fixture.story_slug })); const verdicts = await recordSchemaCompliance.run(undefined, context(records, { world_slug: fixture.world_slug, story_slug: fixture.story_slug })); if (verdicts.length) { console.error(JSON.stringify(verdicts, null, 2)); process.exit(1); } console.log("record_schema_compliance pass: 5 Red Kiln CHC records");'`
5. `cd tools/validators && rg -n "choice_text|associated_commitment_block" tests/fixtures/red-kiln-ambush/fixture.json`
6. `cd tools/validators && rg -n "player_response_mode" tests/fixtures/red-kiln-ambush/fixture.json`

## Outcome

Completed: 2026-05-24

The Red Kiln Ambush fixture's CHC-21 through CHC-25 records now use the post-SPEC-79 CHC schema: `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, and `grounded_in.records`. The pre-removal `choice_text` and per-CHC `player_response_mode` fields were removed from those choices.

During proof, the schema-conformant CHCs exposed same-seam validator drift: `turn-cycle-output-grounding-integrity` still treated CHC `player_response_mode` as authoritative. The validator and its focused tests now read response mode from `SE.turn_driver.player_response_mode`, while CHC topical grounding still checks `grounded_in.records`.

## Verification Result

PASS — `cd tools/validators && npm run build` rebuilt the package and refreshed `dist/`.

PASS — `cd tools/validators && node --test dist/tests/structural/turn-cycle-output-grounding-integrity.test.js` passed 9/9 tests.

PASS — `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` passed 2/2 tests.

PASS — direct `record_schema_compliance` probe over the five Red Kiln `choice_record` entries printed `record_schema_compliance pass: 5 Red Kiln CHC records`.

PASS — `cd tools/validators && rg -n "choice_text|associated_commitment_block" tests/fixtures/red-kiln-ambush/fixture.json` returned no matches.

PASS — `cd tools/validators && rg -n "player_response_mode" tests/fixtures/red-kiln-ambush/fixture.json` returned only the SE-level turn-driver field, not a CHC field.

## Deviations

- The drafted broad `npm test` / `spec34-integration` acceptance gate was narrowed for this ticket. A baseline `npm test -- --test-name-pattern='red-kiln'` run rebuilt the package but still executed the broad compiled test set and failed on sibling-owned `associated_commitment_block` fixture hits in `tools/validators/tests/integration/spec34-integration.test.ts`, `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`, `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`, and `tools/validators/tests/structural/stchar-structural-validators.test.ts`. Those four key drops were later completed by archive/tickets/SPEC79CHCREM-010.md; the family capstone is archived at `archive/tickets/SPEC79CHCREM-011.md`.
- Same-seam widening was required because a schema-conformant Red Kiln fixture could not pass the focused validator proof while `turn-cycle-output-grounding-integrity` still read `player_response_mode` from CHC records. The repair stayed inside the Red Kiln fixture/proof seam and did not add a per-CHC response-mode schema field.
