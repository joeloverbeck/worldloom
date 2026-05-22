# SPEC71STRSTCHARTAM-002: Schemas + producers stop stamping the four hashes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas` (STCHAR + prose-receipt), `prose-receipt-schema-compliance`, `tools/patch-engine` STCHAR ops + envelope schema, `tools/validators/src/_helpers/index-access.ts`.
**Deps**: archive/tickets/SPEC71STRSTCHARTAM-001.md

## Problem

This is the **write/schema side** of the hash teardown (SPEC-71 §2.1). The schema already carries `additionalProperties: false` (`story-character-authority.schema.json:98`), so removing `profile_hash`/`voice_block_hash`/`source_char_hash` from `properties` while the patch-engine `append`/`supersede` STCHAR ops still stamp them (`create-story-record.ts:271-272`) — or the validators' `_helpers/index-access.ts` still stamps them (378-379, 454-455) — would write a forbidden field and FAIL every STCHAR create/supersede. Schema removal and stamping removal therefore land atomically. 001 (validators stop checking) precedes this so no recompute-vs-absent failure occurs.

## Assumption Reassessment (2026-05-22)

1. Codebase: `story-character-authority.schema.json` lists `profile_hash`/`voice_block_hash`/`source_char_hash` in `required` (12,21,22) + `properties` (95-96, 32) + the `source_kind`-conditional `allOf` (99-124, which governs BOTH `source_char_id` and `source_char_hash`); `additionalProperties:false` at 98. `prose-receipt.schema.json` has the three hash sub-objects in `stchar_authority[]` (props 125-127, required 113-115, `$defs/hashComparison`). `create-story-record.ts:271-272` stamps profile/voice on `append_story_character_authority_record`/`supersede_*`; `_helpers/index-access.ts:378-379,454-455` stamps them.
2. Specs/docs: SPEC-71 §1.3 schema + producer rows; reassessment finding I1/I2 surfaced the two stamping sites the original map omitted.
3. Cross-artifact boundary under audit: the STCHAR frontmatter schema ↔ patch-engine producer ↔ prose-receipt schema contract; all three change together so no producer emits a field the schema rejects.
4. FOUNDATIONS §5b (Schema-Minimalism) motivates the field removal; §6.1 governs the STCHAR authority surface being thinned (provenance preserved via retained `source_char_id`/`source_char_sections_used`/`source_operational_fact_map`).
5. Canon-Safety surface: `create-story-record.ts` is patch-engine op wiring (gates story-bundle record writes at pre-apply). Confirmed the change does not weaken the Mystery Reserve firewall — it removes content-tamper stamping only; the op's record-shape validation otherwise stands.
6. Schema breaking-removal + consumers: the removal is **breaking** (not additive). Consumers of the removed schema fields are exactly the validators amended in 001 (read side), the MCP projection (003), and the helpers (004) — all sequenced. After this ticket, `additionalProperties:false` becomes the schema-layer reintroduction guard for free (SPEC-71 §2.2).
7. Removed-fields blast radius: `grep -rn "profile_hash\|voice_block_hash\|source_char_hash" tools/` → remaining consumers are the MCP surface (003) and helpers (004); red-bunny records carrying the fields are migrated in 008 (which Deps this ticket).

## Architecture Check

1. Atomic schema+producer change is the only correctness-safe option under `additionalProperties:false`; splitting schema from stamping would ship a tree where STCHAR creation fails validation.
2. No shim: fields are deleted from `properties`/`required` and the `allOf` is amended (drop `source_char_hash` clauses, retain the `source_char_id` world_char-required / story_local-null conditional), not deprecated-in-place.

## Verification Layers

1. STCHAR create/supersede emits frontmatter with no hash field → patch-engine integration test against the amended schema.
2. STCHAR schema rejects a reintroduced `profile_hash` → schema-validation fixture (`additionalProperties:false`).
3. `source_char_id` conditional still enforced (world_char → required; story_local → null) → schema fixture.
4. prose-receipt `stchar_authority[]` validates with no hash sub-objects → `prose_receipt_schema_compliance` fixture.
5. No producer stamps a hash → `grep -rn "computeStcharProfileHash\|computeStcharVoiceBlockHash" tools/patch-engine/src tools/validators/src/_helpers` returns zero.

## What to Change

### 1. STCHAR schema
`story-character-authority.schema.json`: remove `profile_hash`, `voice_block_hash`, `source_char_hash` from `properties` (95-96, 32) and `required` (21,22,12); amend the `allOf` (99-124) to drop the two `source_char_hash` clauses while retaining the `source_char_id` world_char-required and story_local-null clauses. Keep `source_kind`, `source_char_id`, `source_char_sections_used`, `source_operational_fact_map`. Leave `additionalProperties:false` in place (it is now the reintroduction guard).

### 2. Prose-receipt schema + compliance validator
`prose-receipt.schema.json`: remove `profile_hash`/`voice_block_hash`/`page_packet_hash` from `stchar_authority[]` `properties` (125-127) + `required` (113-115); remove the now-unused `$defs/hashComparison`. `prose-receipt-schema-compliance.ts`: realign to the amended schema (drop any hardcoded hash-field expectations; keep `stchar_id`/`stent_id`/`display_name`/`required_because`/`packet_present`/`active_in_snapshot`/`deterministic_verdict`).

### 3. Patch-engine producers
`create-story-record.ts`: on `append_story_character_authority_record`/`supersede_story_character_authority_record`, stop stamping `profile_hash`/`voice_block_hash` (271-272) and stop importing the `computeStchar*` helpers (6-7). `envelope/schema.ts`: drop the hash fields from the STCHAR op-payload shape.

### 4. Validators frontmatter-stamping helper
`_helpers/index-access.ts`: remove the `profile_hash`/`voice_block_hash` compute+stamp (378-379, 454-455) and the helper imports (7-8).

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (modify)
- `tools/validators/src/schemas/prose-receipt.schema.json` (modify)
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (modify)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/validators/src/_helpers/index-access.ts` (modify)
- patch-engine + validators tests touching STCHAR create/schema (modify)

## Out of Scope

- `computeStchar*` helper deletion + CLI (004) — producers stop importing here; deletion is 004.
- MCP projection (003); red-bunny record migration (008); docs (005); skills (007).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/patch-engine` — STCHAR create/supersede produces schema-valid frontmatter with no hash fields.
2. `npm test --prefix tools/validators` — `prose_receipt_schema_compliance` + STCHAR schema fixtures pass with no hash fields; reintroduced-field fixture is rejected by `additionalProperties:false`.
3. `npm run build --prefix tools/patch-engine && npm run build --prefix tools/validators` (tsc) — no dangling `computeStchar*` import in producers.

### Invariants

1. No STCHAR frontmatter or prose-receipt `stchar_authority[]` carries any of the four hashes after creation.
2. `source_char_id` provenance + the `source_kind` conditional remain enforced.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/**` STCHAR create/supersede — assert no hash field stamped.
2. `tools/validators/tests/**` schema + `prose-receipt-schema-compliance` — assert hash-free shape + `additionalProperties:false` rejection.

### Commands

1. `npm test --prefix tools/patch-engine`
2. `npm test --prefix tools/validators`
3. `npm run build --prefix tools/patch-engine` / `--prefix tools/validators`
