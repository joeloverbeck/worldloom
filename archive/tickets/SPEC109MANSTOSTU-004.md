# SPEC109MANSTOSTU-004: Write path + write tests

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `src/write/current-context.ts` and `test/current-context/current-context-write.test.ts` to `@worldloom/manual-story-studio`; no impact on existing write paths.
**Deps**: archive/tickets/SPEC109MANSTOSTU-001.md

## Problem

SPEC-109's `current-context.yaml` is a hand-edited per-story artifact; writes are full-file replace (no merging). The cockpit's Edit Current Context page (010) and the Mark-state-reviewed button (011) both need a single write entry point that respects SPEC-100's package sandbox (realpath + forbidden-destination denylist). This ticket lands `writeCurrentContext` with a void return shape paralleling the existing `writeManualStoryMetadata` pattern, plus function-level write tests covering sandbox safety and round-trip behavior.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/write/sandbox.ts:82` exports `safeWriteFile(root, relPath, contents)` which asserts the resolved path is inside the manual-story root before writing, rejecting forbidden destinations. `tools/manual-story-studio/src/write/manual-story-metadata.ts:34` is the closest existing single-file writer pattern — calls `safeWriteFile` inline and returns `void`; no `WriteResult` type is introduced (the spec's Q1=(a) decision per `/reassess-spec` matches this pattern).
2. **Spec**: SPEC-109 §2 item 4 specifies `writeCurrentContext(root, ctx): void` — full-file replace via `safeWriteFile`. Return-shape parallels `writeManualStoryMetadata`: the function returns nothing on success and throws on a sandbox / I/O failure; route-level validation failures map to `422` with structured findings at the route handler, not at the writer.
3. **Cross-skill boundary**: The writer's contract is the void return + throw-on-sandbox-failure shape. Route handler (005) catches sandbox/IO errors at the route boundary; the validator (003) runs before the writer at the route handler so the writer never sees invalid input.
4. **Live signature correction (2026-06-02)**: The draft `What to Change` line said `manualStoryRoot: string`, but `safeWriteFile` and the existing `updateManualStoryMetadata` pattern take `ManualStoryRoot`. This ticket lands `writeCurrentContext(manualStoryRoot: ManualStoryRoot, ctx: CurrentContext): void` so downstream routes pass the resolved sandbox root object directly.

## Architecture Check

1. The void return + closest-pattern adherence (mirroring `writeManualStoryMetadata`) keeps the package's writer-shape inventory uniform; introducing a fresh `WriteResult` type for one writer would diverge for no benefit.
2. No backwards-compatibility shims: the writer is new; no legacy fallback path is added.

## Verification Layers

1. Writer creates the file at `worlds/<slug>/manual-stories/<slug>/current-context.yaml` when called → acceptance test asserts file existence + byte content after call.
2. Writer respects SPEC-100 sandbox — a forbidden path raises an error from `safeWriteFile` → acceptance test using a doctored root that fails the realpath check.
3. Writer is a full-file replace, not a merge — a second write with a smaller payload truncates the file accordingly → acceptance test asserts byte-equality with the second payload.

## Landed Changes

### 1. New writer at `src/write/current-context.ts`

Implemented `writeCurrentContext(manualStoryRoot: ManualStoryRoot, ctx: CurrentContext): void`:
- Serialize `ctx` to YAML via `YAML.stringify`.
- Call `safeWriteFile(manualStoryRoot, "current-context.yaml", yamlText)`.
- No try/catch; sandbox or I/O failures propagate as thrown errors per the established writer-shape.

### 2. New acceptance test at `test/current-context/current-context-write.test.ts`

Added function-level write tests (no HTTP layer):
- Round-trip: write a valid CurrentContext, then read back via Node `fs.readFileSync` + `YAML.parse`; assert payload equality.
- Sandbox-rejection: attempt write through a doctored root that escapes the sandbox; assert that `safeWriteFile` throws.
- Full-file replace: write payload A, then write payload B (smaller); assert the on-disk file equals payload B (no merged content).

## Outcome

Ticket complete. Manual Story Studio now has a focused `writeCurrentContext` entry point for full-file `current-context.yaml` writes, using the package sandbox writer and preserving the established throw-on-sandbox-failure shape.

## Verification Result

1. Baseline before implementation: `cd tools/manual-story-studio && npm run test:backend` passed with 66 compiled backend test files.
2. Focused/backend proof after implementation: `cd tools/manual-story-studio && npm run test:backend` passed with 67 compiled backend test files, including `current-context-write.test.js`.
3. Full package proof after implementation: `cd tools/manual-story-studio && npm test` passed with backend build, 414 backend tests, and `web` TypeScript test.

## Deviations

1. The draft ticket text originally named `manualStoryRoot: string`; the live write API uses `ManualStoryRoot`. The shipped signature is `writeCurrentContext(manualStoryRoot: ManualStoryRoot, ctx: CurrentContext): void`, matching `safeWriteFile` and `updateManualStoryMetadata`.

## Files to Touch

- `tools/manual-story-studio/src/write/current-context.ts` (new)
- `tools/manual-story-studio/test/current-context/current-context-write.test.ts` (new)

## Out of Scope

- HTTP route handler / 422 mapping — owned by 005.
- Validation of payload before write — caller responsibility (the PUT route handler in 005 runs `validateCurrentContext` from 003 before invoking this writer).
- Atomic-write semantics beyond what `safeWriteFile` already provides — the existing sandbox helper is the canonical write primitive.
- Pre-write file-existence checks (the writer just overwrites; full-file replace per spec).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes.
2. Round-trip: write → read → equality.
3. Sandbox-escape attempt throws via `safeWriteFile`.
4. Full-file replace truncates on second write.

### Invariants

1. The writer never produces a partial-content file — `safeWriteFile`'s atomic-write discipline is preserved.
2. The writer never writes outside `worlds/<slug>/manual-stories/<slug>/` — SPEC-100 sandbox is the structural guarantee.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/current-context-write.test.ts` — covers round-trip + sandbox + full-replace cases.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
