# SPEC56STCHARMACFOU-002: STCHAR JSON schema + dependent schema edits

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators` (new `story-character-authority.schema.json`; edits to story-entity/page/choice/event schemas, schema-compliance mapping, and tests/fixtures); `archive/specs/SPEC-56-stchar-machine-foundation.md` Phase 2 status note.
**Deps**: archive/tickets/SPEC56STCHARMACFOU-001.md

## Problem

At intake, the contract (ticket 001) declared `STCHAR` and the `STENT.bound_char_id → bound_stchar_id` cutover, but the machine-checkable validators package had not encoded them. This ticket adds the schema layer so downstream validators, index, and MCP surfaces can validate STCHAR frontmatter and reject the removed `bound_char_id`.

## Assumption Reassessment (2026-05-20)

1. **Historical intake evidence:** `tools/validators/src/schemas/story-entity.schema.json` had `bound_char_id` (pattern `^CHAR-[0-9]+$`), no `bound_stchar_id`, `additionalProperties: false`; `story-page.schema.json` `active_records` had 17 buckets, no STCHAR; `story-choice.schema.json` `grounded_in.records[]` pattern lacked STCHAR; `story-event.schema.json` `record_introductions[].class` enum + `state_delta` patterns lacked STCHAR; `promotion_claims[].source_record` was `^(SF|BEL|DA|STENT|STSTAT|SREL)-[0-9]+$`. No `story-character-authority.schema.json` existed.
2. The schema field-set + conditional rules are specified in `archive/specs/SPEC-56-stchar-machine-foundation.md` §Phase 2 (reassessed this session); the M1 trim (three hashes only, no `section_hashes` map) is authoritative — do not re-add the 13-section map.
3. **Cross-artifact boundary under audit**: these schemas encode the contract amended in ticket 001. The schema field set must match the contract's STCHAR definition exactly; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` asserts contract↔schema parity and currently references `bound_char_id` — it must be updated in lockstep.
4. **FOUNDATIONS principle restatement**: §5b Schema-Minimalism at story scope — STCHAR is a hybrid on-demand artifact (CHAR/DA precedent), so its frontmatter may be rich, but every field must be load-bearing; the M1 trim removed the only non-load-bearing surface. The new atomic-record references (`bound_stchar_id`, `active_records.STCHAR`, grounding patterns) are each load-bearing for resolution/replay.
5. **Schema extension**: new `story-character-authority.schema.json` (frontmatter schema) + additive STCHAR entries to story-page/choice/event `active_records`/`grounded_in`/`record_introductions`/`state_delta`. The story-page/choice/event additions are additive-only (new optional bucket / widened pattern union); no existing consumer breaks. The new schema is consumed by the validators (003), world-index parser (005), and MCP (006).
6. **Rename/remove blast radius** (`bound_char_id`): removed from `story-entity.schema.json` (breaking — `additionalProperties: false` will reject it). Pipeline grep: consumers are `contract-schema-roundtrip.test.ts` (this ticket), `validate-patch-plan.test.ts` (004), `story-bundle-fixture.ts` (007), and a SPEC-57 turn-cycle reference (out of scope). World-index does not parse it (zero blast radius). Safe — zero production story bundles.
7. Implementation found one required same-seam addition: `record_schema_compliance` filters indexed records through `STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, and `isStructuralAuthorityRecord`, so the new STCHAR schema would have been inert unless `story_character_authority_record` was added to those validators-package mapping surfaces. This ticket owns that mapping because its acceptance requires schema validation of STCHAR frontmatter.
8. Full-package proof exposed stale positive validators fixtures with non-background STENT records missing `bound_stchar_id`. Those fixtures were not the shared world-mcp story-bundle fixture owned by ticket 007; they are same-package schema-compliance witnesses, so this ticket updated them to the current STENT shape. Ticket 007 still owns the world-mcp fixture rewrite and repo-wide `tools/` zero check.

## Architecture Check

1. Encoding STCHAR as a hybrid-frontmatter JSON schema (like the existing `character-frontmatter.schema.json`) keeps it inside the established validator framework rather than inventing a parallel validation path. The conditional `allOf` (world_char ⇒ require source_char_id/hash; story_local ⇒ null) enforces provenance integrity declaratively.
2. No backwards-compatibility aliasing: `bound_char_id` is deleted from the schema, not deprecated-in-place; `additionalProperties: false` enforces the removal.

## Verification Layers

1. New schema validates a well-formed STCHAR frontmatter and rejects malformed → schema validation (AJV) against passing + failing fixtures.
2. `story-entity` accepts `bound_stchar_id`, rejects `bound_char_id`, rejects non-background STENT with null → schema validation against fixture cases.
3. `story-page`/`story-choice`/`story-event` accept STCHAR in the widened surfaces, reject STCHAR in `promotion_claims` → schema validation.
4. Contract↔schema parity holds → `contract-schema-roundtrip.test.ts` passes after its `bound_char_id` reference is updated to `bound_stchar_id`.

## Landed Changes

### 1. New `story-character-authority.schema.json`

Added required fields per spec §Phase 2 (id, story_id, story_slug, world_slug, source_kind, source_char_id, source_char_hash, source_char_sections_used, generated_at_page, created_by_skill, supersedes, status, bound_stent_ids, profile_revision, body_schema_version, profile_hash, voice_block_hash, page_packet_hash); patterns + enums + conditional `allOf` as specified; `additionalProperties: false`; NO `section_hashes` (M1).

### 2. Dependent schema edits

- `story-entity.schema.json`: removed `bound_char_id`; added required `bound_stchar_id` (`^STCHAR-[0-9]+$` | null); conditional — non-`[background]` `role_in_story` requires string `bound_stchar_id`.
- `story-page.schema.json`: added `STCHAR` array bucket to `active_records`.
- `story-choice.schema.json`: added `STCHAR` to `grounded_in.records[]` pattern union.
- `story-event.schema.json`: added `STCHAR` to `record_introductions[].class` enum + `state_delta.create/supersede/close` patterns + a trigger row; did NOT add it to `promotion_claims[].source_record`.
- `tools/validators/src/structural/utils.ts`: added `story_character_authority_record` to schema-compliance record discovery, schema mapping, and hybrid path recognition.

### 3. Validator tests

- Updated `contract-schema-roundtrip.test.ts` (`bound_char_id` → `bound_stchar_id`) and added STCHAR field-set parity.
- Added `record-schema-compliance-story-character-authority.test.ts` and expanded story entity/page/choice/event schema-compliance tests per the spec's acceptance matrix.
- Updated same-package positive fixtures/builders that now need `bound_stchar_id` to remain current-contract schema witnesses.

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (new)
- `tools/validators/src/schemas/story-entity.schema.json` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance-story-{entity,page,choice,event}.test.ts` (modify)
- `tools/validators/tests/{cli,fixtures,integration,structural}/**` (modify — same-package positive STENT fixtures/builders updated to `bound_stchar_id`)
- `archive/specs/SPEC-56-stchar-machine-foundation.md` (modify — Phase 2 implementation note)

## Out of Scope

- Structural validators (`stent_requires_stchar`, etc.) — ticket 003.
- The shared world-mcp `story-bundle-fixture.ts` rewrite — ticket 007.
- `section_hashes` (M1: rejected).

## Acceptance Criteria

### Tests That Must Pass

1. Schema validation: well-formed STCHAR frontmatter passes; missing required field / missing hash / malformed id / `world_char` without source_char_id+hash / `story_local` with source_char_id all rejected.
2. `story-entity` accepts `bound_stchar_id`, rejects `bound_char_id`, rejects non-background STENT with null `bound_stchar_id`, accepts exactly-`[background]` STENT with null.
3. `npm test` from `tools/validators` is green (including the updated `contract-schema-roundtrip.test.ts`).

### Invariants

1. STCHAR frontmatter schema matches the contract's STCHAR definition exactly (no field the contract doesn't declare; no field the contract declares missing).
2. `bound_char_id` is rejected everywhere `story-entity.schema.json` applies (`additionalProperties: false`).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify) — swapped `bound_char_id` → `bound_stchar_id`; asserted STCHAR class parity.
2. `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` (new) — STCHAR schema pass/fail cases.
3. `tools/validators/tests/structural/record-schema-compliance-story-{entity,page,choice,event}.test.ts` (modify) — dependent-schema STCHAR acceptance/rejection cases.
4. Same-package current-contract fixture/builders (modify) — positive STENT records now include `bound_stchar_id`.

### Commands

1. `npm run build` from `tools/validators` (covers tsc — no `typecheck` script exists; build invokes tsc).
2. `node --test dist/tests/structural/record-schema-compliance-story-character-authority.test.js dist/tests/structural/record-schema-compliance-story-entity.test.js dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/structural/record-schema-compliance-story-choice.test.js dist/tests/structural/record-schema-compliance-story-event.test.js dist/tests/structural/contract-schema-roundtrip.test.js`
3. `npm test` from `tools/validators`.

## Outcome

Completed: 2026-05-20

The validators package now encodes the STCHAR schema contract. `story-character-authority.schema.json` defines the STCHAR hybrid frontmatter field set and provenance/hash conditionals; `story-entity.schema.json` removes `bound_char_id` and requires `bound_stchar_id` except for exactly-background entities; page, choice, and event schemas accept STCHAR on the scoped reference surfaces while `promotion_claims[].source_record` still excludes it.

`record_schema_compliance` now recognizes `story_character_authority_record` for `stories/<slug>/story-characters/STCHAR-*.md`, so the new schema is actually enforced. Current-contract validators fixtures/builders that construct positive STENT records were updated with `bound_stchar_id`; the world-mcp shared fixture remains ticket 007's owner.

## Verification Result

1. `npm run build` from `tools/validators` — PASS: TypeScript compiled and regenerated `dist/`.
2. `node --test dist/tests/structural/record-schema-compliance-story-character-authority.test.js dist/tests/structural/record-schema-compliance-story-entity.test.js dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/structural/record-schema-compliance-story-choice.test.js dist/tests/structural/record-schema-compliance-story-event.test.js dist/tests/structural/contract-schema-roundtrip.test.js` — PASS: 54 focused schema-compliance tests passed.
3. `npm test` from `tools/validators` — PASS: 754 tests passed.
4. Manual review against `docs/FOUNDATIONS.md` — PASS: STCHAR remains story-local persona authority, not epistemic access or promotion source; `BEL.basis.access_records` and `SE.promotion_claims[].source_record` remain without STCHAR.

## Deviations

- Added `tools/validators/src/structural/utils.ts` because the new schema needed a live `record_schema_compliance` mapping and hybrid path filter to be enforceable.
- Updated same-package positive STENT fixtures/builders after the first full `npm test` exposed missing `bound_stchar_id` failures. This is schema-proof fixture truthing, not the shared world-mcp fixture rewrite reserved for ticket 007.
