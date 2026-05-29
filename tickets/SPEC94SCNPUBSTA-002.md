# SPEC94SCNPUBSTA-002: Validator schema + tests — drop `status` from `story-scene.schema.json`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` story-scene record-compliance schema and its colocated structural/integration tests. No impact on the validator framework run-loop or registry (the schema is consumed by the existing `record-schema-compliance` path).
**Deps**: SPEC94SCNPUBSTA-001

## Problem

`tools/validators/src/schemas/story-scene.schema.json` requires `status` in its `required[]` array (L9) and defines it as an enum `["planned", "rendered", "attached"]` (L27). With the contract removing the field (SPEC94SCNPUBSTA-001), the JSON schema must drop it too; otherwise the validator would reject every contract-compliant `SCN`. Because the schema is `additionalProperties: false` (verified), removing the property is sufficient to make a stray `status` field rejected at validation. The colocated tests currently construct `SCN` fixtures *with* a `status` value (including one asserting the dead `rendered` value validates), so they must be updated in the same diff or the suite breaks.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/schemas/story-scene.schema.json`: `status` is in `required[]` at L9 and defined as `{ "type": "string", "enum": ["planned", "rendered", "attached"] }` at L27; the schema declares `additionalProperties: false`; `previous_scene_id` and `supersedes` are independent properties that remain. Verified by reading the schema this session.
2. SPEC-94 §2 item 2 + §9 acceptance criterion 2 require: remove `status` from `required[]` + remove the property; a fixture/test asserts an `SCN` without `status` validates and one *with* a stray `status` is rejected (automatic under the existing `additionalProperties: false`).
3. Cross-artifact boundary under audit: `story-scene.schema.json` mirrors the canonical contract in `story-record-schemas.md §4.5.20` (owned by SPEC94SCNPUBSTA-001). The schema is the enforced gate; the markdown is the human contract. They must agree.
4. FOUNDATIONS principle motivated: append-only `_source/` record discipline — the validator schema gates `create_scn_record` / `supersede_scn_record` story-bundle record writes at engine pre-apply; removing a single-reachable-value field tightens the gate without weakening any canon/story-bundle invariant.
5. Canon/story-bundle-write-gating surface: `story-scene.schema.json` is enforced by the `record-schema-compliance-story-scene` structural validator at engine pre-apply. This change **alters the gate's accept/reject behavior** — previously an `SCN` *without* `status` was rejected (missing required field); now an `SCN` *with* `status` is rejected (`additionalProperties: false`). This is a record-gating accept/reject change, not a purely additive field definition. The change gates story-bundle (non-canon) record writes only; it does not touch world-canon validators, the Mystery Reserve firewall, or canon-write ordering.
6. (was template item 7 — schema-field removal blast radius) Removing the `status` field: grep pipeline-wide confirms the consumers are (a) this schema; (b) the 5 colocated test files below; (c) the two scene skills (003/004); (d) docs + world-index/world-mcp fixtures (005). No production code in `tools/world-index/src` or `tools/world-mcp/src` reads `SCN.status` (world-index parses scenes by `^SCN-[0-9]+$` id pattern + edges, not status). Blast radius for THIS ticket is the schema + its 5 colocated tests.

## Architecture Check

1. Removing the property under the existing `additionalProperties: false` is the minimal, self-documenting change — no separate "reject stray status" guard clause is needed; the schema's existing closed-object discipline does the work.
2. No backwards-compatibility shim: no transitional optional-`status` phase; the field is removed outright (zero `SCN` records exist to grandfather).

## Verification Layers

1. `status` absent from `required[]` and from `properties` → codebase grep-proof (`grep -n '"status"' tools/validators/src/schemas/story-scene.schema.json` returns zero).
2. An `SCN` without `status` validates; an `SCN` with a stray `status` is rejected → schema validation (the updated `record-schema-compliance-story-scene` test).
3. The `rendered`-value assertion is inverted → codebase grep-proof + schema validation (`record-schema-compliance-story-scene.test.ts:L57` no longer asserts a `rendered` SCN validates).
4. FOUNDATIONS alignment → schema validation: the validator continues to gate story-bundle SCN writes; no canon validator threshold changes.

## What to Change

### 1. `tools/validators/src/schemas/story-scene.schema.json`

- Remove `"status"` from the `required[]` array (L9).
- Remove the `status` property/enum definition (L27).
- Leave `additionalProperties: false` and all other fields unchanged.

### 2. Colocated tests/fixtures (assert absence; invert the `rendered`-valid assertion)

- `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` — L19 fixture `status: "planned"` (drop it; assert SCN validates without status); **L57 `parsed.status = "rendered"`** (this currently asserts a `rendered` SCN validates — invert it to assert a stray `status` field is rejected under `additionalProperties: false`).
- `tools/validators/tests/structural/scene-range-integrity.test.ts` — L71 `status: "planned"` fixture: drop.
- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` — L167 `status: "attached"` fixture: drop.
- `tools/validators/tests/structural/scene-prose-receipt-content.test.ts` — L110 `status: "attached"` and L135 `status: "forbidden"` (negative case) SCN fixtures: drop / re-base now that `status` is not a field.
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — L217 `status: "planned"` and the SCN `required`-set assertion: remove `status` from the expected SCN required-field set so the roundtrip assertion matches the new schema.

## Files to Touch

- `tools/validators/src/schemas/story-scene.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` (modify)
- `tools/validators/tests/structural/scene-range-integrity.test.ts` (modify)
- `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts` (modify)
- `tools/validators/tests/structural/scene-prose-receipt-content.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)

## Out of Scope

- The canonical contract markdown (`story-record-schemas.md` / `story-state-contract.md`) — SPEC94SCNPUBSTA-001.
- Skill prose (003/004); docs + world-index/world-mcp fixtures (005).
- Any change to other `SCN` fields, scene-range validators' logic, the receipt schema (`scene-prose-receipt.schema.json` has no `scn_status`/`status` field — confirmed; untouched), or the `state_hash` chain.
- Adding any hash/freshness field.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes with the updated schema + fixtures.
2. A test asserts an `SCN` without `status` validates AND one with a stray `status` is rejected (the latter automatic under `additionalProperties: false`).
3. `grep -n '"status"' tools/validators/src/schemas/story-scene.schema.json` returns zero matches.

### Invariants

1. `story-scene.schema.json` remains `additionalProperties: false` — closed-object discipline preserved.
2. All other `SCN` required/optional fields (`id`, `story_id`, `branch_id`, `pg_ids`, `start_page_id`, `end_page_id`, `choice_surface_page_id`, `emitted_choice_ids`, `title`, `slug`, `prose_plan_path`, `prose_path`, `receipt_path`, `supersedes`, `previous_scene_id`) are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` — drop the `planned` fixture field; invert the L57 `rendered`-validity assertion to a stray-`status`-rejected assertion.
2. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — remove `status` from the expected SCN required-set.
3. `tools/validators/tests/structural/scene-range-integrity.test.ts`, `tools/validators/tests/integration/spec92-scene-layer-capstone.test.ts`, `tools/validators/tests/structural/scene-prose-receipt-content.test.ts` — drop the `status` field from SCN fixtures.

### Commands

1. `cd tools/validators && npm test`
2. `grep -n '"status"' tools/validators/src/schemas/story-scene.schema.json` (expect zero)
