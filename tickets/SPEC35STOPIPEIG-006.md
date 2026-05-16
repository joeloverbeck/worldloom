# SPEC35STOPIPEIG-006: Fix allocate_next_id capability text to unpadded IDs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`server.ts` capability description) + capability snapshot test
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D6

## Problem

`tools/world-mcp/src/server.ts:438–441` describes `allocate_next_id` as returning `<CLASS>-0001` (padded) for fresh story-bundle-scoped classes. The implementation at `tools/world-mcp/src/tools/allocate-next-id.ts:11–61` declares `zeroPad: false` for all classes; `formatNumericValue` (lines 128–130) respects `zeroPad`, so the actual return is `PG-1` (unpadded) per FOUNDATIONS-002 (`docs/FOUNDATIONS.md:552–559`).

The description-vs-implementation drift means `describe_capabilities` callers (skills authoring IDs via the capability surface) may construct IDs matching the wrong format and either fail schema validation or produce semantically-incorrect paths.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/server.ts:438–441` description text contains `<CLASS>-0001`. Verified at brainstorm parallel-agent inspection.
2. `tools/world-mcp/src/tools/allocate-next-id.ts:11–61` has `zeroPad: false` for all `ID_CLASS_FORMATS` entries; `formatNumericValue` at lines 128–130 respects `zeroPad`. Verified at brainstorm parallel-agent inspection.
3. Cross-skill boundary under audit: the `describe_capabilities` surface's allocator description, consumed by skills that interrogate MCP capabilities before authoring IDs. The fix is to align the description with the implementation.
4. FOUNDATIONS-002 (per `docs/FOUNDATIONS.md:552-559`) motivates this ticket: unpadded natural-integer suffixes are the canonical ID format. Restated: filenames match the `id` field exactly (use `M-1.yaml` with `id: M-1`, not `M-0001.yaml`). The capability description must reflect this.

## Architecture Check

1. Pure text correction in `server.ts` description, with a capability snapshot test guarding against future drift. Alternative considered: change the implementation to actually return padded IDs — rejected because FOUNDATIONS-002 mandates unpadded IDs; the implementation is correct, the description is wrong.
2. No backwards-compatibility aliasing introduced. Capability descriptions are advisory; no consumer depends on the wrong text.

## Verification Layers

1. Allocator description matches implementation → codebase grep-proof: `grep -nE '0001' tools/world-mcp/src/server.ts` returns no match in the `allocate_next_id` description block; `grep -nE 'unpadded natural-integer' tools/world-mcp/src/server.ts` returns a match in the same block.
2. Capability snapshot test asserts the new wording → new or extended test asserts the description does NOT contain `0001` and DOES mention `unpadded natural-integer`.
3. Full `tools/world-mcp/` test suite green → `npm test`.

## What to Change

### 1. Rewrite the `allocate_next_id` description text

In `tools/world-mcp/src/server.ts:438–441`, replace the description with:

```
Allocate the next append-only id for a world-specific, story-bundle-scoped,
sub-audit-scoped, or pipeline-scoped record class. Story-bundle-scoped
classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh
missing bundle under an existing world (per FOUNDATIONS-002). RSP requires
story_slug and audit_id.
```

### 2. Add or extend a capability snapshot test

In `tools/world-mcp/tests/server/` (or wherever capability snapshot tests live; if no such test exists, add `describe-capabilities-snapshot.test.ts`):
- Assert that the `allocate_next_id` tool's description does NOT contain the substring `0001`.
- Assert that the description DOES contain the substring `unpadded natural-integer`.

If a sibling capability snapshot test already exists for other tools, extend it to add these two assertions for `allocate_next_id`.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/server/describe-capabilities-snapshot.test.ts` (new OR modify if sibling exists)

## Out of Scope

- Changes to the `allocate_next_id` implementation (already correct) — description-only fix.
- Changes to other tools' capability descriptions — only `allocate_next_id` has the verified drift.
- Behavior changes for ID allocation — same IDs returned.

## Acceptance Criteria

### Tests That Must Pass

1. Capability snapshot test asserts `allocate_next_id` description does NOT contain `0001` and DOES contain `unpadded natural-integer`.
2. `npm test` in `tools/world-mcp/` returns green.
3. `grep -nE '0001' tools/world-mcp/src/server.ts` returns no match in the `allocate_next_id` registration block.

### Invariants

1. The capability description for `allocate_next_id` accurately describes the implementation's output format (unpadded natural-integer IDs).
2. Future capability-text drift is caught by the snapshot test before merge.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/describe-capabilities-snapshot.test.ts` (new OR modify) — assert allocator description wording.

### Commands

1. `cd tools/world-mcp && npm test` — full MCP suite, including the new/extended capability snapshot test.
2. `cd tools/world-mcp && npm run build` — typechecks the change.
3. Post-landing: rebuild MCP `dist/` so the running server (if any) picks up the new description text — `cd tools/world-mcp && npm run build` is sufficient; restart any long-running MCP server consumer.
