# SPEC71STRSTCHARTAM-003: Drop the four hashes from the MCP retrieval surface

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` context-packet projection + context-packet contract docs.
**Deps**: archive/tickets/SPEC71STRSTCHARTAM-002.md

## Problem

At intake, the MCP retrieval surface still projected `profile_hash`/`voice_block_hash` on STCHAR context-packet entries (`context-packet/shared.ts` type, `story-bundle-context.ts` projection), and `docs/CONTEXT-PACKET-CONTRACT.md` documented those fields plus page-local `page_packet_hash` as current packet data. After 002 removed the fields from the STCHAR/receipt schemas, these context-packet projections read absent fields. This ticket removes them so the retrieval surface matches the thinned schema (SPEC-71 §1.3 MCP rows, reassessment finding I5).

## Assumption Reassessment (2026-05-22)

1. Codebase: at intake, `tools/world-mcp/src/context-packet/shared.ts` declared `profile_hash: string; voice_block_hash: string;` on the STCHAR projection type; `story-bundle-context.ts` populated them via `asString(record.profile_hash)` / `asString(record.voice_block_hash)`; `docs/CONTEXT-PACKET-CONTRACT.md` documented those context-packet fields and page-local `page_packet_hash`.
2. Specs/docs: SPEC-71 §1.3 MCP rows; reassessment finding I5 surfaced these three sites (omitted from the original §1.3 map).
3. Cross-artifact boundary under audit: the world-mcp retrieval surface's view of the STCHAR record shape — it must not project fields the `tools/validators` schema (002) no longer defines.
4. FOUNDATIONS §5b (Schema-Minimalism): the projection is dead weight once the fields are gone; removing it keeps the retrieval shape minimal and truthful to the record schema.
5. Reassessment correction: the drafted `describe-envelope-schema.ts` removal was not safe in this ticket. Live patch-engine payload types and tests still define the `remove_story_character_authority_frontmatter_field` / `remove_story_character_authority_body_hash_note_field` `field_name` enum as `["page_packet_hash"]`; `describe_envelope_schema` must mirror that producer contract until the patch-engine op shape changes. Removing only the MCP description would make the machine-facing schema introspection untruthful, so the owned 003 boundary is narrowed to the retrieval/context-packet surface.

## Architecture Check

1. Removing the projection (rather than leaving it to read `undefined`) keeps the context-packet shape an accurate mirror of the on-disk STCHAR record — no silent `undefined` field that a future consumer might treat as meaningful.
2. No shim: the type members and projection lines are deleted; no optional-with-default carried forward.
3. Keeping `describe_envelope_schema` aligned to the live patch-engine op schema avoids a false MCP contract while that migration op still exists.

## Verification Layers

1. STCHAR context-packet entry carries no `profile_hash`/`voice_block_hash` → world-mcp context-packet test on a story-bundle fixture.
2. Context-packet docs no longer list the removed STCHAR/page-packet hash fields as packet data → grep-proof on `docs/CONTEXT-PACKET-CONTRACT.md`.

## What to Change

### 1. Context-packet projection
`context-packet/shared.ts`: remove `profile_hash` / `voice_block_hash` from the STCHAR projection type (209-210). `story-bundle-context.ts`: remove the two projection assignments (478-479).

### 2. Context-packet contract docs
`docs/CONTEXT-PACKET-CONTRACT.md`: remove `profile_hash`/`voice_block_hash` and page-local `page_packet_hash` from the documented `active_story_characters` context-packet fields.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)

## Out of Scope

- The STCHAR/receipt schema (002); the helper deletion (004); red-bunny migration (008).
- `describe-envelope-schema.ts` / patch-engine maintenance op payload shape. Live producer types still expose `field_name: "page_packet_hash"` for the existing migration op, and MCP introspection must mirror that producer contract until a later patch-engine ticket changes it.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` — context-packet tests pass with the hash fields removed from `active_story_characters`.
2. `rg -n "profile_hash|voice_block_hash|page_packet_hash" tools/world-mcp/src/context-packet docs/CONTEXT-PACKET-CONTRACT.md` → zero matches.
3. `npm run build --prefix tools/world-mcp` (tsc).

### Invariants

1. The STCHAR context-packet shape exposes no field the `tools/validators` STCHAR schema does not define.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — asserts STCHAR context-packet entries have no hash fields.
2. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — truthed package-local STCHAR fixtures to the post-002 hash-free schema so the broad world-mcp gate exercises current schema behavior.
3. `tools/world-mcp/tests/server/capability-parity.test.ts` — truthed the expected validator registry list after 001 removed `stchar_source_hash_matches_source`.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm run build --prefix tools/world-mcp`

## Outcome

Completed: 2026-05-22.

The `story_bundle_context.active_story_characters` type and builder no longer expose `profile_hash` or `voice_block_hash`. The story-bundle context-packet test was updated to assert the hash-free STCHAR projection, and `docs/CONTEXT-PACKET-CONTRACT.md` now documents the reduced `active_story_characters` field set without page-local hash language.

Package-local proof fixtures that blocked the 003 broad gate were also truthed to already-archived SPEC-71 prerequisites: `validate-patch-plan.test.ts` no longer seeds current-valid STCHAR records with `source_char_hash`, `profile_hash`, or `voice_block_hash`, and `capability-parity.test.ts` no longer expects the removed `stchar_source_hash_matches_source` validator.

## Verification Result

- `npm run build` from `tools/world-mcp` - PASS.
- `node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/tools/validate-patch-plan.test.js` from `tools/world-mcp` - PASS, 15/15.
- `node --test dist/tests/integration/server-capabilities-hash-parity.test.js` from `tools/world-mcp` - PASS, 1/1.
- `npm test` from `tools/world-mcp` - PASS, 430/430.
- `rg -n "profile_hash|voice_block_hash|page_packet_hash" tools/world-mcp/src/context-packet docs/CONTEXT-PACKET-CONTRACT.md` - no matches.

## Deviations

- The drafted ticket said to remove `page_packet_hash` from `describe-envelope-schema.ts`, but live patch-engine payload types and tests still define `field_name: "page_packet_hash"` for the STCHAR maintenance ops. This ticket leaves `describe_envelope_schema` aligned to the live producer contract instead of making MCP schema introspection false. The helper/CLI deletion remains owned by 004, and red-bunny migration remains owned by 008.
- The first broad `npm test` run exposed stale same-family proof fixtures, not a context-packet regression: current-valid STCHAR fixtures in `validate-patch-plan.test.ts` still carried hash fields removed by 002, and `capability-parity.test.ts` still expected the validator removed by 001. Those were updated as proof-surface truthing before the final broad pass.
