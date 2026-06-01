# SPEC105MANSTOSTU-001: Health types foundation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/health/types.ts` (HealthStatus / HealthSeverity / HealthFinding / HealthReport interfaces + `deriveHealthStatus` pure function). No impact on existing pipeline surfaces; foundational for SPEC-105's `/health` endpoint, compute pass, and route 409 dispatch.
**Deps**: None

## Problem

`tools/manual-story-studio` has no shared backend → frontend integrity contract. Every page handles failure ad hoc; corruption is rendered as absence ("no records exist" indistinguishable from "every record file is malformed"). The first foundational piece SPEC-105 needs is a canonical health-report shape consumed by the compute pass (SPEC105MANSTOSTU-009), the `/health` route (SPEC105MANSTOSTU-010), the route 409 dispatch via the read-error-http helper (SPEC105MANSTOSTU-003), and the frontend health banner (SPEC105MANSTOSTU-011). Defining the types in isolation, with no consumers yet, keeps the foundation reviewable on its own.

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/src/health/` directory does NOT exist at HEAD (verified by `ls tools/manual-story-studio/src/` showing no `health/` subdirectory in the prior reassess-spec session); this ticket creates the directory and its first module. No file collision risk.
2. SPEC-105 §2 item 1 defines the canonical shape with explicit `status` derivation rule (any `blocking` finding → `blocked`; otherwise any `error` → `degraded`; otherwise `ok`). The pure derivation function lives in the types module so the compute pass (009) and any other consumer can call it without instantiating the full compute walker.
3. Cross-skill boundary: `tools/manual-story-studio` is canon-pipeline-fenced per SPEC-100 (package.json excludes `@worldloom/patch-engine` + `@worldloom/world-mcp` + `better-sqlite3`; realpath sandbox + denylist prevent canon writes). This ticket introduces only new TypeScript types within the existing fence; no canon-pipeline integration, no cross-package import added.

## Architecture Check

1. Pure types module + a single pure derivation function is the smallest reviewable unit that can be consumed by 003 (route helper), 009 (compute pass), and 011 (frontend banner) without forcing any of those tickets to define partial types in isolation. Co-locating `deriveHealthStatus` with the types it operates on avoids the consumer-chooses-derivation-logic anti-pattern.
2. No backwards-compatibility aliasing/shims introduced — this is a greenfield module.

## Verification Layers

1. Types compile under `tsc --noEmit` → codebase grep-proof + `tsc` build run.
2. `deriveHealthStatus` matches the spec §2 item 1 derivation rule exactly → unit test asserting all three branches (`blocking` → `blocked`; `error` → `degraded`; otherwise → `ok`).
3. No production consumer yet (those land in 003 / 009 / 011) → single-layer ticket; additional layer mapping is not applicable until consumers exist.

## What to Change

### 1. Create `tools/manual-story-studio/src/health/types.ts`

Define the canonical types per SPEC-105 §2 item 1:

```ts
export type HealthStatus = "ok" | "degraded" | "blocked";
export type HealthSeverity = "info" | "warn" | "error" | "blocking";

export interface HealthFinding {
  severity: HealthSeverity;
  code: string;          // stable kebab-case, e.g. "metadata-yaml-parse-failed"
  path: string;          // repo-relative path to the offending file
  message: string;       // human-readable summary
  repair_hint: string;   // actionable next step
}

export type BlockedAction =
  | "prompt_copy"
  | "prompt_save"
  | "segment_save"
  | "manuscript_compile";

export interface HealthReport {
  status: HealthStatus;
  findings: HealthFinding[];
  blocked_actions: BlockedAction[];
}

export function deriveHealthStatus(findings: ReadonlyArray<HealthFinding>): HealthStatus {
  if (findings.some((f) => f.severity === "blocking")) return "blocked";
  if (findings.some((f) => f.severity === "error")) return "degraded";
  return "ok";
}
```

The `BlockedAction` type is extracted from the spec's inline literal-union in §2 item 1 so consumers (009 compute, 003 helper) can reference the named type instead of duplicating the literal-union.

### 2. Create `tools/manual-story-studio/test/health/types.test.ts`

Unit test for `deriveHealthStatus` covering the three branches and the empty-findings case (returns `ok`).

## Files to Touch

- `tools/manual-story-studio/src/health/types.ts` (new)
- `tools/manual-story-studio/test/health/types.test.ts` (new)

## Out of Scope

- The 3-pass integrity compute logic — SPEC105MANSTOSTU-009.
- The `/health` HTTP route — SPEC105MANSTOSTU-010.
- The `ReadResult<T>` + `ReadError` types — SPEC105MANSTOSTU-002.
- The read-error → HTTP-status mapping helper — SPEC105MANSTOSTU-003.
- The frontend banner / hook / api wrapper — SPEC105MANSTOSTU-011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly (TypeScript surface validates).
2. `cd tools/manual-story-studio && npm test` runs and the new `test/health/types.test.ts` passes — covers `deriveHealthStatus({blocking})` → `"blocked"`, `deriveHealthStatus({error})` → `"degraded"`, `deriveHealthStatus({warn|info})` → `"ok"`, `deriveHealthStatus([])` → `"ok"`.
3. `grep -nE "^export (type|interface|function)" tools/manual-story-studio/src/health/types.ts` lists exactly: `HealthStatus`, `HealthSeverity`, `HealthFinding`, `BlockedAction`, `HealthReport`, `deriveHealthStatus`.

### Invariants

1. `HealthStatus` and `HealthSeverity` are closed string-literal unions — adding a new severity or status value requires an explicit type-system change, not an implicit string.
2. `deriveHealthStatus` is a pure function (no I/O, no mutation, no closures over external state) — consumers can call it with any `HealthFinding[]` slice.
3. `HealthReport.findings` and `HealthReport.blocked_actions` are always arrays (never `undefined`); consumers may iterate without null checks.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/health/types.test.ts` — unit tests for `deriveHealthStatus` across all branches.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — TypeScript compile only.
2. `cd tools/manual-story-studio && npm test` — full package test (build + Node tests + web subpackage typecheck).
