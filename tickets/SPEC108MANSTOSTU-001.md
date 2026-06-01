# SPEC108MANSTOSTU-001: Backend SEGMENT_REPAIR_MODE_FLAG constants

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces a new module `tools/manual-story-studio/src/write/segment-modes.ts` exporting the repair-mode constant and a `SegmentMode` type. No impact on existing modules.
**Deps**: None

## Problem

SPEC-108's append-only-by-default lifecycle gates the existing `editSegment` and `deleteSegment` HTTP routes behind an explicit `mode=repair` flag. Routes, frontend API wrappers, the new RepairSegments page, and the acceptance tests all need a single source-of-truth for the flag's literal value (`"repair"`) and a `SegmentMode` discriminated type to share between server and tests. Defining a small constants module first prevents the literal string from being duplicated across consumers and keeps the rename surface small if the flag's name ever changes.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/src/write/` exists (verified at HEAD — siblings `segments.ts`, `sandbox.js`, `segment-id-allocator.ts` are present). The new file `segment-modes.ts` is the only deliverable; no parent directory creation required.
2. SPEC-108 §2 item 7 names this constants file and §2 item 3 wires the literal `"repair"` value into the route mode validation. SPEC-108 §4 Files to Touch lists `tools/manual-story-studio/src/write/segment-modes.ts (new)` explicitly.
3. Cross-skill boundary: this module's exported constant is consumed by ticket 002 (routes/segments.ts mode validation) and ticket 008 (acceptance tests asserting against the constant rather than the literal string). The shared boundary is `import { SEGMENT_REPAIR_MODE_FLAG, type SegmentMode } from "../write/segment-modes.js"`. No cross-package boundary crossing (the module is private to `tools/manual-story-studio/`).
4. FOUNDATIONS Rule 6 (No Silent Retcons) motivates the constant's existence: the rewrite of `editSegment` / `deleteSegment` access semantics is a behavior change that must be visible in the codebase as a named flag, not as an unattributed magic string. Centralizing the flag's name + value in one module makes future audits (grep for `SEGMENT_REPAIR_MODE_FLAG`) trivial and preserves the attribution chain.

## Architecture Check

1. A single small constants module is the minimum surface that satisfies the requirement — exporting `SEGMENT_REPAIR_MODE_FLAG = "repair"` plus a `SegmentMode = "repair"` type alias. Alternatives considered: (a) inlining the literal in every consumer (rejected — defeats the rename-target purpose); (b) extending an existing `manual-story.ts` schema module (rejected — schema modules describe record shapes, not route-handshake constants).
2. No backwards-compatibility shims introduced — this is greenfield code with no prior consumers.

## Verification Layers

1. Constant export presence -> codebase grep-proof (`grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/src/write/segment-modes.ts` returns 1 match).
2. `SegmentMode` type export presence -> codebase grep-proof (`grep -n "export type SegmentMode" tools/manual-story-studio/src/write/segment-modes.ts` returns 1 match).
3. Module compiles under the package's tsconfig -> `npm run build:backend` succeeds without TypeScript errors.

## What to Change

### 1. Create `tools/manual-story-studio/src/write/segment-modes.ts`

The module contains two exports:

```ts
export const SEGMENT_REPAIR_MODE_FLAG = "repair" as const;

export type SegmentMode = typeof SEGMENT_REPAIR_MODE_FLAG;
```

No other exports. Consumers in ticket 002 (routes) and ticket 008 (tests) import both symbols.

## Files to Touch

- `tools/manual-story-studio/src/write/segment-modes.ts` (new)

## Out of Scope

- Route-level integration of the constant (ticket 002).
- Frontend API wrapper integration (ticket 003).
- Acceptance test integration (ticket 008).
- A `SEGMENT_REPLACE_LATEST_GATE` or `force_replace` constant — the `force_replace` sub-flag is a request-body boolean, not a flag with a named literal value; it does not need a constants module.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` succeeds.
2. `grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/src/write/segment-modes.ts` returns exactly 1 match (the export line).
3. `grep -n "export type SegmentMode" tools/manual-story-studio/src/write/segment-modes.ts` returns exactly 1 match.

### Invariants

1. The module exports exactly two symbols: `SEGMENT_REPAIR_MODE_FLAG` (value: literal `"repair"`) and `SegmentMode` (type: `typeof SEGMENT_REPAIR_MODE_FLAG`). No additional exports.
2. The constant's value is the literal string `"repair"` — consumers must rely on this exact value when constructing query strings or request bodies.

## Test Plan

### New/Modified Tests

1. `None — constants-module-only ticket; verification is the typecheck pass at build:backend, and consumer-level test coverage lands in ticket 002 (route-level) and ticket 008 (acceptance-level).`

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — typecheck-only verification; the module has no runtime tests of its own.
