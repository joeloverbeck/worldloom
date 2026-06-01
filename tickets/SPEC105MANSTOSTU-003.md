# SPEC105MANSTOSTU-003: Read-error → HTTP status helper

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/server/read-error-http.ts` (`mapReadErrorToHttpReply(error)` shared route adapter). Consumed by every route ticket (004–008) for the per-`ReadError.code` → HTTP status dispatch from SPEC-105 §2 item 4.
**Deps**: archive/tickets/SPEC105MANSTOSTU-001.md, archive/tickets/SPEC105MANSTOSTU-002.md

## Problem

SPEC-105 §2 item 4 defines a deterministic per-`ReadError.code` → HTTP status mapping table (file_not_found → 404, invalid_id_shape → 400, yaml_parse_failed → 409, schema_validation_failed → 409, reference_unresolved → 409, io_error → 500), with `409` responses carrying the `HealthReport` body. If each route translates `ReadResult` errors inline, the dispatch logic duplicates across 8 route files and drift becomes likely — a future code addition might be mapped to 500 in one route and 409 in another. The spec explicitly requires the mapping to be deterministic (*"given a `ReadError.code`, the route layer always returns the same status"*). A single shared helper module enforces that determinism structurally and gives the dispatch one obvious extension point when new codes are added.

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/src/server/read-error-http.ts` path does NOT exist at HEAD (verified by `ls tools/manual-story-studio/src/server/` showing only `http.ts`, `routes/`, `write-scope-guard.ts`); this ticket creates the file. No collision risk.
2. SPEC-105 §2 item 4 contains the full per-code → status table. The helper module imports `ReadError` from `src/read/result.ts` (002) and `HealthReport` + `HealthFinding` from `src/health/types.ts` (001), bridging the read-layer error vocabulary to the route-layer HTTP response shape.
3. Cross-skill boundary: this is the load-bearing route-layer adapter. Every route ticket (004 metadata, 005 records, 006 segments, 007 manuscript, 008 enumerators) invokes `mapReadErrorToHttpReply` on every `ok: false` return from the read layer. Drift between routes in dispatch behavior would break the spec's *"deterministic"* guarantee.
4. FOUNDATIONS §Tooling Recommendation + Rule 1 No Floating Facts grounding: the mapping table is the route layer's contract surface for the read layer's failure space — every read error has a single, named HTTP status and a single, named response shape (the `HealthReport` for 409, a small JSON error object for the others). Naming the dispatch in one place is the Rule 1 "scope / prerequisites / limits / consequences" framing applied to HTTP error handling: an unrecognized code is a programming error, not a 500 silent-pass, and the route layer logs it visibly so the audit trail captures the omission.

## Architecture Check

1. A single shared helper avoids the 8-way duplication that would result from inlining the dispatch in every route file. The duplication isn't *just* a code-cleanliness concern: the spec §2 item 4 explicitly requires deterministic mapping, and a single helper structurally enforces it. The three-similar-lines rule in `tickets/README.md` §Core Architectural Contract (don't pre-abstract) is satisfied here because (a) the dispatch is more than three similar lines per call site (it's a 6-row table plus body shaping), and (b) the spec calls out the determinism guarantee as a contract.
2. No backwards-compatibility aliasing/shims introduced — this is a greenfield module. The unrecognized-code fall-through path logs a warning and returns 500 with a generic body, making future code additions visible at runtime without silently producing wrong dispatches.

## Verification Layers

1. Types compile under `tsc --noEmit` → codebase grep-proof + `tsc` build run.
2. Per-code dispatch matches the SPEC-105 §2 item 4 table exactly → unit tests covering each of the 6 recognized codes + the unrecognized-code fall-through.
3. The 409 path produces a `HealthReport`-shaped body (status: blocked or degraded depending on severity; one finding derived from the `ReadError`; `blocked_actions` populated for blocking severities) → unit test asserting structural conformance to the `HealthReport` interface from ticket 001.

## What to Change

### 1. Create `tools/manual-story-studio/src/server/read-error-http.ts`

```ts
import type { FastifyReply } from "fastify";
import type { ReadError } from "../read/result.js";
import type { HealthFinding, HealthReport } from "../health/types.js";
import { deriveHealthStatus } from "../health/types.js";

interface DispatchEntry {
  status: number;
  severity: HealthFinding["severity"]; // governs HealthReport.status derivation
}

// Mirrors SPEC-105 §2 item 4 table verbatim.
const DISPATCH: Record<string, DispatchEntry> = {
  file_not_found: { status: 404, severity: "info" },
  invalid_id_shape: { status: 400, severity: "warn" },
  yaml_parse_failed: { status: 409, severity: "blocking" },
  schema_validation_failed: { status: 409, severity: "error" },
  reference_unresolved: { status: 409, severity: "error" },
  io_error: { status: 500, severity: "error" },
};

export function mapReadErrorToHttpReply(
  reply: FastifyReply,
  error: ReadError,
): FastifyReply {
  const entry = DISPATCH[error.code];
  if (!entry) {
    reply.log?.warn(
      { code: error.code, path: error.path },
      "unrecognized read-error code; defaulting to 500",
    );
    return reply.code(500).send({ error: "internal_error" });
  }

  if (entry.status === 404) {
    return reply.code(404).send({ error: "not_found" });
  }

  if (entry.status === 400) {
    return reply.code(400).send({ error: "bad_request", reason: error.code });
  }

  if (entry.status === 409) {
    const finding: HealthFinding = {
      severity: entry.severity,
      code: error.code,
      path: error.path,
      message: error.repair_hint, // surfacing the actionable hint is the user-facing message
      repair_hint: error.repair_hint,
    };
    const body: HealthReport = {
      status: deriveHealthStatus([finding]),
      findings: [finding],
      blocked_actions:
        entry.severity === "blocking"
          ? ["prompt_copy", "prompt_save", "segment_save", "manuscript_compile"]
          : [],
    };
    return reply.code(409).send(body);
  }

  return reply.code(500).send({ error: "internal_error" });
}
```

### 2. Create `tools/manual-story-studio/test/server/read-error-http.test.ts`

Unit tests covering each row of the dispatch table + the unrecognized-code fall-through. Use a `FastifyReply`-shaped test double rather than a real Fastify instance.

## Files to Touch

- `tools/manual-story-studio/src/server/read-error-http.ts` (new)
- `tools/manual-story-studio/test/server/read-error-http.test.ts` (new)

## Out of Scope

- Wiring routes to call the helper — that happens per-route in SPEC105MANSTOSTU-004 through SPEC105MANSTOSTU-008.
- The compute-pass-driven 409 dispatch (when an entire story is `blocked` for any read or write attempt) — that builds a different `HealthReport` from the compute pass and lands in SPEC105MANSTOSTU-009 + SPEC105MANSTOSTU-010.
- Frontend rendering of the 409 body — SPEC105MANSTOSTU-011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and the new `test/server/read-error-http.test.ts` passes — covers `file_not_found` → 404 / `{ error: "not_found" }`, `invalid_id_shape` → 400, `yaml_parse_failed` → 409 / `HealthReport` with `status: "blocked"` + `blocked_actions: 4`, `schema_validation_failed` → 409 / `HealthReport` with `status: "degraded"` + `blocked_actions: []`, `reference_unresolved` → 409 / `HealthReport` with `status: "degraded"`, `io_error` → 500, and `unknown-code` → 500 with logged warning.
3. `grep -nE "^export function" tools/manual-story-studio/src/server/read-error-http.ts` lists exactly: `mapReadErrorToHttpReply`.

### Invariants

1. The dispatch table is the single source of truth for `ReadError.code` → HTTP status; no route file inlines its own per-code mapping.
2. A 409 response body always conforms to the `HealthReport` interface from `src/health/types.ts` — `status` is derived (not hardcoded), `findings` is non-empty (always carries the originating error as a single finding), `blocked_actions` is populated only when the severity is `blocking`.
3. An unrecognized `ReadError.code` produces a 500 with a logged warning, not a silent pass through to some default status — making future code additions visible at runtime.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/read-error-http.test.ts` — covers all 6 recognized codes + the unrecognized-code fall-through. Verifies HTTP status, response body shape, and (for 409) `HealthReport` conformance.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — TypeScript compile only.
2. `cd tools/manual-story-studio && npm test` — full package test.
