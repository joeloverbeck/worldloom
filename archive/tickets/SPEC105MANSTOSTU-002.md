# SPEC105MANSTOSTU-002: ReadResult foundation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/read/result.ts` (`ReadResult<T>` discriminated union + `ReadError` interface + ok/err helper constructors). No impact on existing pipeline surfaces; foundational for SPEC-105's read-layer migration (tickets 004–008) and the route 409 dispatch helper (ticket 003).
**Deps**: None

## Problem

The current `tools/manual-story-studio` read layer returns `T | null` for failure (verified at `src/read/manual-story-metadata.ts:8-21`, `src/read/records.ts:32-43,50-69,71-94,102-117`, `src/read/segments.ts:27,53,66`, `src/read/manuscript.ts:15-32`, `src/read/manual-stories.ts:61-63`, `src/read/worlds.ts`), collapsing three distinct conditions (file-not-found, invalid-ID-shape, YAML-parse-failure) into one return value the caller cannot disambiguate. This violates SPEC-105's fail-fast model: callers cannot distinguish "valid absence" from "corruption masquerading as absence." The first foundational piece is a discriminated result type that forces every caller to acknowledge the failure path at the type level.

## Assumption Reassessment (2026-06-01)

1. At intake, the `tools/manual-story-studio/src/read/result.ts` path did not exist; this ticket created the file without colliding with existing read-layer modules.
2. SPEC-105 §2 item 3 defines the discriminated union shape verbatim with the `ok: true | false` discriminator. The landed `ReadError.code` field is a stable kebab-case string (parallel to the `HealthFinding.code` convention in archive/tickets/SPEC105MANSTOSTU-001.md) consumed by the route-layer mapping helper (ticket 003) to dispatch HTTP statuses per the §2 item 4 mapping table.
3. Cross-skill boundary: this module is consumed by every read-layer migration ticket (004–008) and by the read-error → HTTP helper (003). Defining the types now in isolation lets each migration ticket import without forcing inline definitions.

## Architecture Check

1. Discriminated union via the `ok: true | false` literal-type discriminator is the canonical TypeScript pattern for result-or-error returns — it forces every caller to narrow on `result.ok` before accessing `result.value` or `result.error`, making the failure path structurally visible at the type level (versus a nullable return where the failure path is the same shape as a sentinel absence). The spec §3 Key decisions explicitly chose discriminated union over thrown exceptions because exceptions would force every caller into try/catch noise while the discriminated union forces caller acknowledgment at the type level — that is the load-bearing discipline this spec installs.
2. No backwards-compatibility aliasing/shims introduced — this is a greenfield module. The migration tickets (004–008) change function signatures directly; no `T | ReadResult<T>` overload set survives.

## Verification Layers

1. Types compile under `tsc --noEmit` → codebase grep-proof + `tsc` build run.
2. `ok` and `err` helper constructors produce the correct discriminated shape → unit test asserting `ok(value).ok === true && ok(value).value === value` and `err(error).ok === false && err(error).error === error`.
3. No production consumer yet (those land in 003–008) → single-layer ticket; additional layer mapping is not applicable until the migration tickets land.

## Landed Changes

### 1. Created `tools/manual-story-studio/src/read/result.ts`

Defined the discriminated union and the `ReadError` interface per SPEC-105 §2 item 3:

```ts
export type ReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ReadError };

export interface ReadError {
  code: string;        // stable kebab-case code, e.g. "yaml-parse-failed"
  path: string;        // repo-relative path that failed to read
  cause?: unknown;     // underlying error if applicable
  repair_hint: string; // actionable next step
}

export function ok<T>(value: T): ReadResult<T> {
  return { ok: true, value };
}

export function err<T = never>(error: ReadError): ReadResult<T> {
  return { ok: false, error };
}
```

The `ok` and `err` helper constructors are convenience wrappers — callers may construct the literal object directly, but the helpers make the intent grep-stable across the codebase (`grep -rn "ok(\|err({"` returns the construction sites).

### 2. Created `tools/manual-story-studio/test/read/result.test.ts`

Unit tests covering the discriminated union shape and the helpers.

## Files to Touch

- `tools/manual-story-studio/src/read/result.ts` (new)
- `tools/manual-story-studio/test/read/result.test.ts` (new)

## Out of Scope

- Migrating any existing read function to use `ReadResult<T>` — SPEC105MANSTOSTU-004 through SPEC105MANSTOSTU-008.
- The read-error → HTTP-status mapping helper — archive/tickets/SPEC105MANSTOSTU-003.md.
- The health-report types — archive/tickets/SPEC105MANSTOSTU-001.md.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and the new `test/read/result.test.ts` passes — covers the type discrimination and the `ok`/`err` helpers.
3. `grep -nE "^export (type|interface|function)" tools/manual-story-studio/src/read/result.ts` lists exactly: `ReadResult`, `ReadError`, `ok`, `err`.

### Invariants

1. `ReadResult<T>` is a discriminated union — TypeScript narrowing via `if (result.ok)` is the only structural access path to `.value`; accessing `.value` on a `result.ok === false` instance is a compile-time error.
2. `ReadError.code` is a string (the value space is open at the type level; specific codes are enumerated by callers per the SPEC-105 §2 item 4 dispatch table). The structural constraint at this layer is only "code is a non-empty string"; the mapping helper (ticket 003) is the authority on which codes the route layer recognizes.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/result.test.ts` — covers `ok(v).ok === true`, `ok(v).value === v`, `err(e).ok === false`, `err(e).error === e`, and narrowing-via-discriminator semantics.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — TypeScript compile only.
2. `cd tools/manual-story-studio && npm test` — full package test.

## Outcome

Completed on 2026-06-01.

This ticket created the shared read-result contract module at `tools/manual-story-studio/src/read/result.ts` with the `ReadResult<T>` discriminated union, `ReadError`, and `ok` / `err` constructors. It also added `tools/manual-story-studio/test/read/result.test.ts`, covering the true and false discriminants, helper payload preservation, and narrowing through `if (result.ok)`.

No deviations from the planned file set. The closeout updated dependency wording to point at the archived health-types prerequisite.

## Verification Result

Commands run from `tools/manual-story-studio/`:

1. `npm run build:backend` — passed; TypeScript compiled the new read result module and test.
2. `npm test` — passed; backend build, 349 compiled Node tests, and web `tsc --noEmit` all completed successfully. The new read-result tests ran in the compiled backend suite.

Additional grep proof from the repo root:

```sh
grep -nE "^export (type|interface|function)" tools/manual-story-studio/src/read/result.ts
```

Result: listed exactly `ReadResult`, `ReadError`, `ok`, and `err`.
