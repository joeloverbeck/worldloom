# SPEC109MANSTOSTU-002: Read path + fixtures + read tests

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `src/read/current-context.ts` and `test/current-context/{current-context-read.test.ts, fixtures/*}` to `@worldloom/manual-story-studio`; no impact on existing read paths.
**Deps**: archive/tickets/SPEC109MANSTOSTU-001.md

## Problem

SPEC-109's `current-context.yaml` artifact needs a fail-fast read path that distinguishes (a) absent file (typed `null` value, expected for stories without authored current-context) from (b) corrupted file (typed `ReadError` with `code="current-context-yaml-parse-failed"`). The composer, route handlers, UI dashboard, and health-integration pass all consume this read function downstream. This ticket lands the read function, the shared fixtures directory used by sibling test tickets, and the function-level acceptance tests covering SPEC-109 AC #1 and AC #2.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/read/result.ts` exports `ReadResult<T>` / `ReadError` / `ok` / `err` (the SPEC-105-landed typed-error discipline). Existing read modules (`manual-story-metadata.ts`, `manuscript.ts`, `segments.ts`, `records.ts`, `manual-stories.ts`, `worlds.ts`) follow the `ReadResult<T>` return pattern. `tools/manual-story-studio/src/read/manual-stories.ts:65` carries a `ReadResult<string | null>` precedent for the `T | null` discriminated-union shape this ticket needs.
2. **Spec**: SPEC-109 §2 item 3 specifies `readCurrentContext(manualStoryRoot): ReadResult<CurrentContext | null>` where `null` is the typed "file absent" value distinct from a `ReadError` for a corrupted file; AC #1 + AC #2 define the test cases.
3. **Cross-skill boundary**: This ticket's `current-context-read.test.ts` and its `fixtures/` directory are shared infrastructure. The fixtures directory hosts `present.yaml` (valid CurrentContext payload), `absent/` (a story dir with no current-context.yaml), and `corrupted.yaml` (a malformed-YAML file); sibling tickets 003 / 004 / 005 / 007 each construct their own fixtures inline or reference this directory's `present.yaml` for round-trip tests.

## Architecture Check

1. The `ReadResult<CurrentContext | null>` discriminated union encodes three observably-distinct outcomes (`{ok: true, value: ctx}`, `{ok: true, value: null}`, `{ok: false, error: ReadError}`) without inventing a new error shape; reuses the SPEC-105 vocabulary the cockpit's UI already handles.
2. No backwards-compatibility shims: the read function is new; no legacy fallback path is added.

## Verification Layers

1. Absent-file case returns `{ok: true, value: null}` → acceptance test (`current-context-read.test.ts`).
2. Corrupted-file case returns `{ok: false, error: {code: "current-context-yaml-parse-failed"}}` → acceptance test.
3. Valid-file case returns `{ok: true, value: <ctx>}` with the parsed CurrentContext payload → acceptance test.
4. Read function honors SPEC-105's typed-error discipline (no thrown exceptions for absence or parse failure) → manual review against `tools/manual-story-studio/src/read/result.ts` shape.

## What to Change

### 1. New read function at `src/read/current-context.ts`

Implement `readCurrentContext(manualStoryRoot: string): ReadResult<CurrentContext | null>`:
- Resolve `current-context.yaml` relative to the manual story root.
- If the file does not exist, return `ok(null)`.
- If the file exists, read its contents and `YAML.parse` it. On parse failure, return `err({code: "current-context-yaml-parse-failed", path, message, repair_hint})`.
- On success, return `ok(parsed as CurrentContext)`.

### 2. New fixtures directory at `test/current-context/fixtures/`

- `fixtures/present/current-context.yaml` — a valid CurrentContext payload (Mara as POV holder, etc., per SPEC-109 §1 worked example).
- `fixtures/absent/.gitkeep` — empty manual-story root with no current-context.yaml.
- `fixtures/corrupted/current-context.yaml` — malformed YAML (e.g., unterminated string).

### 3. New acceptance test at `test/current-context/current-context-read.test.ts`

Function-level tests covering AC #1 + AC #2:
- Read of `fixtures/absent/` returns `{ok: true, value: null}`.
- Read of `fixtures/corrupted/` returns `{ok: false, error: {code: "current-context-yaml-parse-failed"}}`.
- Read of `fixtures/present/` returns `{ok: true, value: <ctx>}` with all 10 fields present.

## Files to Touch

- `tools/manual-story-studio/src/read/current-context.ts` (new)
- `tools/manual-story-studio/test/current-context/current-context-read.test.ts` (new)
- `tools/manual-story-studio/test/current-context/fixtures/present/current-context.yaml` (new)
- `tools/manual-story-studio/test/current-context/fixtures/absent/.gitkeep` (new)
- `tools/manual-story-studio/test/current-context/fixtures/corrupted/current-context.yaml` (new)

## Out of Scope

- Validation of referenced IDs against the record corpus (KnownIds / segment_order) — owned by 003.
- Write path / sandbox / atomic write — owned by 004.
- HTTP route layer wiring — owned by 005.
- Health-integration consumer — owned by 006.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes — covers the new acceptance test alongside the existing suite.
2. AC #1 (read of an absent file returns `ReadResult ok=true, value=null`).
3. AC #2 (read of a corrupted file returns `ReadResult ok=false` with `ReadError code="current-context-yaml-parse-failed"`).

### Invariants

1. `readCurrentContext` never throws on absent or corrupted files; both surfaces route through `ReadResult` per SPEC-105 discipline.
2. The fixtures directory is layout-stable: sibling tickets reference `fixtures/present/` by relative path.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/current-context-read.test.ts` — covers AC #1 + AC #2 + the valid-file round-trip case.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
