# SPEC56STCHARMACFOU-002: STCHAR JSON schema + dependent schema edits

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (new `story-character-authority.schema.json`; edits to story-entity/page/choice/event schemas + tests).
**Deps**: archive/tickets/SPEC56STCHARMACFOU-001.md

## Problem

The contract (ticket 001) declares `STCHAR` and the `STENT.bound_char_id → bound_stchar_id` cutover; this ticket encodes them as machine-checkable JSON schemas. Without it, no validator, index, or MCP surface can validate STCHAR frontmatter or reject the removed `bound_char_id`.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/schemas/story-entity.schema.json` has `bound_char_id` (pattern `^CHAR-[0-9]+$`), no `bound_stchar_id`, `additionalProperties: false` (verified this session). `story-page.schema.json` `active_records` has 17 buckets, no STCHAR; `story-choice.schema.json` `grounded_in.records[]` pattern lacks STCHAR; `story-event.schema.json` `record_introductions[].class` enum + `state_delta` patterns lack STCHAR; `promotion_claims[].source_record` is `^(SF|BEL|DA|STENT|STSTAT|SREL)-[0-9]+$`. No `story-character-authority.schema.json` exists.
2. The schema field-set + conditional rules are specified in `specs/SPEC-56-stchar-machine-foundation.md` §Phase 2 (reassessed this session); the M1 trim (three hashes only, no `section_hashes` map) is authoritative — do not re-add the 13-section map.
3. **Cross-artifact boundary under audit**: these schemas encode the contract amended in ticket 001. The schema field set must match the contract's STCHAR definition exactly; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` asserts contract↔schema parity and currently references `bound_char_id` — it must be updated in lockstep.
4. **FOUNDATIONS principle restatement**: §5b Schema-Minimalism at story scope — STCHAR is a hybrid on-demand artifact (CHAR/DA precedent), so its frontmatter may be rich, but every field must be load-bearing; the M1 trim removed the only non-load-bearing surface. The new atomic-record references (`bound_stchar_id`, `active_records.STCHAR`, grounding patterns) are each load-bearing for resolution/replay.
5. **Schema extension**: new `story-character-authority.schema.json` (frontmatter schema) + additive STCHAR entries to story-page/choice/event `active_records`/`grounded_in`/`record_introductions`/`state_delta`. The story-page/choice/event additions are additive-only (new optional bucket / widened pattern union); no existing consumer breaks. The new schema is consumed by the validators (003), world-index parser (005), and MCP (006).
6. **Rename/remove blast radius** (`bound_char_id`): removed from `story-entity.schema.json` (breaking — `additionalProperties: false` will reject it). Pipeline grep: consumers are `contract-schema-roundtrip.test.ts` (this ticket), `validate-patch-plan.test.ts` (004), `story-bundle-fixture.ts` (007), and a SPEC-57 turn-cycle reference (out of scope). World-index does not parse it (zero blast radius). Safe — zero production story bundles.

## Architecture Check

1. Encoding STCHAR as a hybrid-frontmatter JSON schema (like the existing `character-frontmatter.schema.json`) keeps it inside the established validator framework rather than inventing a parallel validation path. The conditional `allOf` (world_char ⇒ require source_char_id/hash; story_local ⇒ null) enforces provenance integrity declaratively.
2. No backwards-compatibility aliasing: `bound_char_id` is deleted from the schema, not deprecated-in-place; `additionalProperties: false` enforces the removal.

## Verification Layers

1. New schema validates a well-formed STCHAR frontmatter and rejects malformed → schema validation (AJV) against passing + failing fixtures.
2. `story-entity` accepts `bound_stchar_id`, rejects `bound_char_id`, rejects non-background STENT with null → schema validation against fixture cases.
3. `story-page`/`story-choice`/`story-event` accept STCHAR in the widened surfaces, reject STCHAR in `promotion_claims` → schema validation.
4. Contract↔schema parity holds → `contract-schema-roundtrip.test.ts` passes after its `bound_char_id` reference is updated to `bound_stchar_id`.

## What to Change

### 1. New `story-character-authority.schema.json`

Required fields per spec §Phase 2 (id, story_id, story_slug, world_slug, source_kind, source_char_id, source_char_hash, source_char_sections_used, generated_at_page, created_by_skill, supersedes, status, bound_stent_ids, profile_revision, body_schema_version, profile_hash, voice_block_hash, page_packet_hash); patterns + enums + conditional `allOf` as specified; `additionalProperties: false`; NO `section_hashes` (M1).

### 2. Dependent schema edits

- `story-entity.schema.json`: remove `bound_char_id`; add `bound_stchar_id` (`^STCHAR-[0-9]+$` | null); conditional — non-`[background]` `role_in_story` requires string `bound_stchar_id`.
- `story-page.schema.json`: add `STCHAR` array bucket to `active_records`.
- `story-choice.schema.json`: add `STCHAR` to `grounded_in.records[]` pattern union.
- `story-event.schema.json`: add `STCHAR` to `record_introductions[].class` enum + `state_delta.create/supersede/close` patterns + a trigger row; do NOT add to `promotion_claims[].source_record`.

### 3. Validator tests

- Update `contract-schema-roundtrip.test.ts` (`bound_char_id` → `bound_stchar_id`).
- Add schema-conformance test cases per the spec's acceptance matrix.

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (new)
- `tools/validators/src/schemas/story-entity.schema.json` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/**` (new — STCHAR schema-conformance cases)

## Out of Scope

- Structural validators (`stent_requires_stchar`, etc.) — ticket 003.
- The shared world-mcp `story-bundle-fixture.ts` rewrite — ticket 007.
- `section_hashes` (M1: rejected).

## Acceptance Criteria

### Tests That Must Pass

1. Schema validation: well-formed STCHAR frontmatter passes; missing required field / missing hash / malformed id / `world_char` without source_char_id+hash / `story_local` with source_char_id all rejected.
2. `story-entity` accepts `bound_stchar_id`, rejects `bound_char_id`, rejects non-background STENT with null `bound_stchar_id`, accepts exactly-`[background]` STENT with null.
3. `npm test --prefix tools/validators` green (including the updated `contract-schema-roundtrip.test.ts`).

### Invariants

1. STCHAR frontmatter schema matches the contract's STCHAR definition exactly (no field the contract doesn't declare; no field the contract declares missing).
2. `bound_char_id` is rejected everywhere `story-entity.schema.json` applies (`additionalProperties: false`).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify) — swap `bound_char_id` → `bound_stchar_id`; assert STCHAR class parity.
2. `tools/validators/tests/**` (new) — STCHAR schema pass/fail cases + dependent-schema STCHAR-acceptance cases.

### Commands

1. `npm run build --prefix tools/validators` (covers tsc — no `typecheck` script exists; build invokes tsc).
2. `npm test --prefix tools/validators`.
