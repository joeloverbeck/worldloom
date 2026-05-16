# SPEC35STOPIPEIG-006: Fix allocate_next_id capability text to unpadded IDs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`server.ts` capability description) + MCP-boundary capability test
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D6

## Problem

At intake, `tools/world-mcp/src/server.ts` described `allocate_next_id` as returning `<CLASS>-0001` (padded) for fresh story-bundle-scoped classes. The implementation in `tools/world-mcp/src/tools/allocate-next-id.ts` already declared `zeroPad: false` for all classes and returned unpadded IDs such as `PG-1` per FOUNDATIONS-002 (`docs/FOUNDATIONS.md:552-559`).

The description-vs-implementation drift means `describe_capabilities` callers (skills authoring IDs via the capability surface) may construct IDs matching the wrong format and either fail schema validation or produce semantically-incorrect paths.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/server.ts` description text for `allocate_next_id` contains `<CLASS>-0001`. Verified in the live checkout before implementation.
2. `tools/world-mcp/src/tools/allocate-next-id.ts` has `zeroPad: false` for all `ID_CLASS_FORMATS` entries; `formatNumericValue` respects `zeroPad`. The allocator behavior is already aligned with FOUNDATIONS-002.
3. Cross-skill boundary under audit: the `describe_capabilities` surface's allocator description, consumed by skills that interrogate MCP capabilities before authoring IDs. The fix is to align the description with the implementation.
4. FOUNDATIONS-002 (per `docs/FOUNDATIONS.md:552-559`) motivates this ticket: unpadded natural-integer suffixes are the canonical ID format. Restated: filenames match the `id` field exactly (use `M-1.yaml` with `id: M-1`, not `M-0001.yaml`). The capability description must reflect this.
5. The existing MCP-boundary capability test lives in `tools/world-mcp/tests/server/dispatch.test.ts` (`describe_capabilities dispatches through the MCP boundary with no arguments`). This ticket extends that test rather than creating a new snapshot file.
6. Baseline before edits: `npm test` in `tools/world-mcp/` passed (370 tests).

## Architecture Check

1. Pure text correction in `server.ts` description, with an MCP-boundary capability test guarding against future drift. Alternative considered: change the implementation to actually return padded IDs — rejected because FOUNDATIONS-002 mandates unpadded IDs; the implementation is correct, the description is wrong.
2. No backwards-compatibility aliasing introduced. Capability descriptions are advisory; no consumer depends on the wrong text.

## Verification Layers

1. Allocator description matches implementation → codebase grep-proof: `grep -nE '0001' tools/world-mcp/src/server.ts` returns no match in the `allocate_next_id` description block; `grep -nE 'unpadded natural-integer' tools/world-mcp/src/server.ts` returns a match in the same block.
2. MCP-boundary capability test asserts the new wording → `tools/world-mcp/tests/server/dispatch.test.ts` asserts the description does NOT contain `0001` and DOES mention `unpadded natural-integer`.
3. Full `tools/world-mcp/` test suite green → `npm test`.

## Landed Changes

### 1. Rewrote the `allocate_next_id` description text

In `tools/world-mcp/src/server.ts`, the description now says:

```
Allocate the next append-only id for a world-specific, story-bundle-scoped,
sub-audit-scoped, or pipeline-scoped record class. Story-bundle-scoped
classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh
missing bundle under an existing world (per FOUNDATIONS-002). RSP requires
story_slug and audit_id.
```

### 2. Extended the MCP-boundary capability test

In `tools/world-mcp/tests/server/dispatch.test.ts`, the `describe_capabilities` dispatch test now asserts that the `allocate_next_id` tool description does NOT contain the substring `0001` and DOES contain the substring `unpadded natural-integer`.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)

## Out of Scope

- Changes to the `allocate_next_id` implementation (already correct) — description-only fix.
- Changes to other tools' capability descriptions — only `allocate_next_id` has the verified drift.
- Behavior changes for ID allocation — same IDs returned.

## Acceptance Criteria

### Tests That Must Pass

1. MCP-boundary capability test asserts `allocate_next_id` description does NOT contain `0001` and DOES contain `unpadded natural-integer`.
2. `npm test` in `tools/world-mcp/` returns green.
3. `grep -nE '0001' tools/world-mcp/src/server.ts` returns no match in the `allocate_next_id` registration block.

### Invariants

1. The capability description for `allocate_next_id` accurately describes the implementation's output format (unpadded natural-integer IDs).
2. Future capability-text drift is caught by the snapshot test before merge.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/dispatch.test.ts` — assert allocator description wording through `describe_capabilities`.

### Commands

1. `cd tools/world-mcp && npm test` — full MCP suite, including the extended MCP-boundary capability test.
2. `cd tools/world-mcp && npm run build` — typechecks the change.
3. Post-landing: rebuild MCP `dist/` so the running server (if any) picks up the new description text — `cd tools/world-mcp && npm run build` is sufficient; restart any long-running MCP server consumer.

## Outcome

Completed: 2026-05-16

`allocate_next_id` capability metadata now matches the allocator's existing unpadded-ID behavior. The change is description-only for runtime behavior and adds MCP-boundary test coverage through `describe_capabilities`.

## Verification Result

1. `cd tools/world-mcp && npm test` — baseline before edits passed (370 tests).
2. `cd tools/world-mcp && npm run build` — passed after edits and refreshed `tools/world-mcp/dist/`.
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js --test-name-pattern "describe_capabilities dispatches through the MCP boundary"` — passed after edits; the package's compiled file runner executed all 30 dispatch subtests, including the updated `describe_capabilities` assertion.
4. `rg -n "0001" tools/world-mcp/src/server.ts` — returned no matches.
5. `cd tools/world-mcp && npm test` — passed after edits (370 tests).

## Deviations

- The drafted test path was a possible new `tools/world-mcp/tests/server/describe-capabilities-snapshot.test.ts`; reassessment found the existing MCP-boundary capability test in `tools/world-mcp/tests/server/dispatch.test.ts`, so this ticket extended that file instead.
