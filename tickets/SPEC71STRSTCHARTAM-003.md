# SPEC71STRSTCHARTAM-003: Drop the four hashes from the MCP retrieval surface

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` context-packet projection + envelope-schema description.
**Deps**: 002

## Problem

The MCP retrieval surface still projects `profile_hash`/`voice_block_hash` on STCHAR context-packet entries (`context-packet/shared.ts:209-210` type, `story-bundle-context.ts:478-479` projection) and references `page_packet_hash` in an op-payload schema description (`describe-envelope-schema.ts:514`). After 002 removes the fields from the STCHAR/receipt schemas and red-bunny is migrated (008), these projections read absent fields. This ticket removes them so the retrieval surface matches the thinned schema (SPEC-71 §1.3 MCP rows, reassessment finding I5).

## Assumption Reassessment (2026-05-22)

1. Codebase: `tools/world-mcp/src/context-packet/shared.ts:209-210` declares `profile_hash: string; voice_block_hash: string;` on the STCHAR projection type; `story-bundle-context.ts:478-479` populates them via `asString(record.profile_hash)` / `asString(record.voice_block_hash)`; `tools/world-mcp/src/tools/describe-envelope-schema.ts:514` enumerates `page_packet_hash` in an op-payload `field_name` enum.
2. Specs/docs: SPEC-71 §1.3 MCP rows; reassessment finding I5 surfaced these three sites (omitted from the original §1.3 map).
3. Cross-artifact boundary under audit: the world-mcp retrieval surface's view of the STCHAR record shape — it must not project fields the `tools/validators` schema (002) no longer defines.
4. FOUNDATIONS §5b (Schema-Minimalism): the projection is dead weight once the fields are gone; removing it keeps the retrieval shape minimal and truthful to the record schema.

## Architecture Check

1. Removing the projection (rather than leaving it to read `undefined`) keeps the context-packet shape an accurate mirror of the on-disk STCHAR record — no silent `undefined` field that a future consumer might treat as meaningful.
2. No shim: the type members and projection lines are deleted; no optional-with-default carried forward.

## Verification Layers

1. STCHAR context-packet entry carries no `profile_hash`/`voice_block_hash` → world-mcp context-packet test on a story-bundle fixture.
2. `describe-envelope-schema` STCHAR-op payload no longer lists `page_packet_hash` → world-mcp tool test / grep-proof.

## What to Change

### 1. Context-packet projection
`context-packet/shared.ts`: remove `profile_hash` / `voice_block_hash` from the STCHAR projection type (209-210). `story-bundle-context.ts`: remove the two projection assignments (478-479).

### 2. Envelope-schema description
`describe-envelope-schema.ts`: remove the `page_packet_hash` reference from the op-payload `field_name` enum (514), consistent with the STCHAR op-payload shape edited in 002.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- world-mcp tests touching the STCHAR context-packet / envelope schema (modify)

## Out of Scope

- The STCHAR/receipt schema (002); the helper deletion (004); red-bunny migration (008).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` — context-packet + describe-envelope tests pass with the hash fields removed.
2. `grep -rn "profile_hash\|voice_block_hash\|page_packet_hash" tools/world-mcp/src` → zero matches.
3. `npm run build --prefix tools/world-mcp` (tsc).

### Invariants

1. The STCHAR context-packet shape exposes no field the `tools/validators` STCHAR schema does not define.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/*` — assert STCHAR entry has no hash fields.
2. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — assert no `page_packet_hash` in the STCHAR op payload.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm run build --prefix tools/world-mcp`
