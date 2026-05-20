# SPEC56STCHARMACFOU-006: MCP retrieval + context-packet STCHAR

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (`allocate_next_id`, `list_records`, `get_record` section_path, `story_bundle_context` + `cast_bind_list` parser; tests).
**Deps**: SPEC56STCHARMACFOU-005, SPEC56STCHARMACFOU-007

## Problem

Story skills must retrieve STCHAR authority on demand (section-projected) and see active STCHAR summaries in `story_bundle_context`, without world `CHAR` full bodies leaking into story runtime. This ticket wires the MCP retrieval surface over the indexed STCHAR (ticket 005), and corrects the `cast_bind_list` parser to track SPEC-57's reshape.

## Assumption Reassessment (2026-05-20)

1. `allocate_next_id` signature is `(world_slug, id_class, story_slug?, audit_id?)` with `ID_CLASS_FORMATS` + `ID_CLASSES` enum (no `STCHAR` yet); `list_records` has `SUPPORTED_LIST_RECORD_TYPES` with hybrid handling via `getHybridKind`; `get_record` supports `section_path` for hybrid records BUT a guard at `tools/world-mcp/src/tools/get-record.ts:642-646` rejects `section_path` for *story-bundle* hybrid ids (`section_path is not valid for story-bundle records with hybrid ids.`) — verified this session. `story_bundle_context.cast_bind_list[].char_id` is parsed by `buildCastBindList` (`context-packet/story-bundle-context.ts:711-713`); type at `context-packet/shared.ts:280-281`.
2. The retrieval changes are specified in `specs/SPEC-56-stchar-machine-foundation.md` §Phase 6 (reassessed this session); the `cast_bind_list` parser update is reassessment finding I2 (machine-layer parser is SPEC-56 territory, sequenced with SPEC-57's STORY_KERNEL.md reshape); M3 (no `get_story_character_packet` tool) is authoritative.
3. **Cross-artifact boundary under audit**: retrieval consumes the indexed STCHAR (ticket 005) and the schema (ticket 002). The `get_record` guard relaxation must be scoped to STCHAR specifically (story DA stays guarded — it has no body sections to project). The `cast_bind_list` reshape is coupled to SPEC-57's STORY_KERNEL.md change — this ticket lands the parser side; SPEC-57 lands the data side; they must be sequenced (neither strands the other, per Definition of Done).
4. **FOUNDATIONS principle restatement**: §Tooling Recommendation — typed retrieval + section projection is the machine-facing delivery mechanism; STCHAR section-path projection (`body.Page-Plan Voice Block`) is what replaces the deferred packet tool (M3). Story-turn-cycle context must surface active STCHAR summaries and NOT deliver world `CHAR` full bodies.
5. **Rename/remove blast radius** (`cast_bind_list.char_id`): the field is renamed to `stchar_id` + `source_char_id` in both the `buildCastBindList` parser (`story-bundle-context.ts`) and the `cast_bind_list` type (`shared.ts`). Pipeline grep: these two world-mcp sites are the only machine-layer consumers; the STORY_KERNEL.md producer is SPEC-57. Without this ticket, `cast_bind_list.char_id` parses as `null` once SPEC-57's reshape lands.

## Architecture Check

1. Relaxing the `get_record` story-bundle-hybrid `section_path` guard for STCHAR specifically (rather than blanket-relaxing for all story-bundle hybrids) preserves story DA's correct behavior (no body sections) while enabling STCHAR's on-demand section projection — the mechanism the M3 deferral relies on. Section projection over `get_record` is robust (verified), so no dedicated packet tool is needed.
2. No backwards-compatibility aliasing: `cast_bind_list.char_id` is replaced by `stchar_id`+`source_char_id`, not dual-emitted.

## Verification Layers

1. `get_record(STCHAR, story_slug)` resolves; `section_path` projects frontmatter / body sections / `body.Page-Plan Voice Block` → world-mcp get-record test against the STCHAR fixture (ticket 007).
2. `list_records(story_character_authority_record)` returns STCHAR with `include_full_body` parsing → list-records test.
3. `story_bundle_context.active_story_characters[]` populated; story-turn-cycle context surfaces STCHAR summaries and delivers no world `CHAR` full bodies → context-packet test.
4. `cast_bind_list` parses `stchar_id`+`source_char_id` → context-packet test asserting the new shape.

## What to Change

### 1. `allocate_next_id`

Add `STCHAR` to `ID_CLASS_FORMATS` + the `ID_CLASSES` enum (story-scoped; allocated with `story_slug`).

### 2. `list_records` + `get_record`

Add `story_character_authority_record` to `SUPPORTED_LIST_RECORD_TYPES` with `getHybridKind` handling + `include_full_body`. Relax the `get_record` story-bundle-hybrid `section_path` guard for STCHAR; project `frontmatter.*` / `body.<section>` via the existing hybrid section-path machinery.

### 3. `story_bundle_context`

Add `active_story_characters[]` summary (id, status, bound_stent_ids, source_kind, source_char_id, profile_revision, profile/voice_block/page_packet hashes, packet_preview). Update `buildCastBindList` + the `cast_bind_list` type to read `stchar_id`+`source_char_id`.

(M3: do NOT build `get_story_character_packet`.)

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/get-record.ts` (modify)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/tests/tools/*` (new + modify — get-record/list-records/context-packet STCHAR tests)

## Out of Scope

- `get_story_character_packet` MCP tool — deferred (M3).
- SPEC-57's STORY_KERNEL.md `cast_bind_list` reshape (the data side) — SPEC-57; this ticket is the parser side only.
- The patch-engine `stchar_ids` envelope field — ticket 004 (this ticket adds the world-mcp allocator entry).

## Acceptance Criteria

### Tests That Must Pass

1. `get_record(STCHAR, story_slug)` resolves; `section_path` works for frontmatter / body sections / `body.Page-Plan Voice Block`.
2. `list_records(story_character_authority_record)` returns STCHAR; `story_bundle_context.active_story_characters` populated; no world `CHAR` full bodies in story-turn-cycle context.
3. `cast_bind_list` parses `stchar_id`+`source_char_id`; `npm test --prefix tools/world-mcp` green.

### Invariants

1. Story runtime retrieves STCHAR (section-projected) and never receives world `CHAR` full bodies (§Tooling Recommendation + world/story separation).
2. The `cast_bind_list` parser change is sequenced with SPEC-57's reshape — neither strands the other.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/*` (new + modify) — get-record section-path, list-records, context-packet `active_story_characters` + `cast_bind_list` shape tests.

### Commands

1. `npm run build --prefix tools/world-mcp` (covers tsc).
2. `npm test --prefix tools/world-mcp`.
