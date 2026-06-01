# SPEC105MANSTOSTU-010: `/health` route + `http.ts` registration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/server/routes/health.ts` (`GET /api/worlds/:world/manual-stories/:story/health`) and modifies `tools/manual-story-studio/src/server/http.ts` to register the new health route inside the read-route scope. No impact on canon-pipeline surfaces.
**Deps**: SPEC105MANSTOSTU-009

## Problem

SPEC-105 §2 item 2 specifies the `GET /api/worlds/:world/manual-stories/:story/health` route as the canonical authority for the backend → frontend integrity contract. The compute pass exists (SPEC105MANSTOSTU-009 ships `computeHealth`), but until a route exposes it, the frontend banner cannot consume it and the route-layer 409 dispatch (for blocked operations) cannot consult it. This ticket wires the route surface.

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/src/server/routes/health.ts` path does NOT exist at HEAD (verified by `ls tools/manual-story-studio/src/server/routes/` showing 8 sibling route files but no `health.ts`); this ticket creates it. No collision risk.
2. The `tools/manual-story-studio/src/server/http.ts` modification is a small addition inside the existing read-route scope: import the new `registerHealthRoute`, call it alongside the existing 7 read-route registrations (manual-stories GET, records read, beat-templates read, metadata read, prompts read, segments read, manuscript read) at lines 73–80 of the current `createServer`.
3. Cross-skill boundary: the `/health` route is consumed by SPEC105MANSTOSTU-011 (frontend banner + hook + api wrapper), SPEC105MANSTOSTU-014 (acceptance tests), and indirectly by every write route that consults health before allowing a write (future tickets / SPEC-108+ work). The route's response IS the package's integrity contract.
4. FOUNDATIONS §Tooling Recommendation grounding: the route exposes the package's internal integrity state to the frontend (and, via 409 dispatch on writes, gates cockpit operations) — the least-agency posture analog for an LLM-free cockpit. When health is `blocked`, the route layer denies prompt_copy / prompt_save / segment_save / manuscript_compile; the external LLM never receives a packet derived from corrupted local state. The /health endpoint IS the means by which this gate enforces.

## Architecture Check

1. The route's body is trivial — resolve the manual story root, call `computeHealth`, return the `HealthReport` with status 200. The route does NOT do its own integrity walking; that's compute.ts's job. This single-responsibility split keeps the route file small and the compute logic testable in isolation (SPEC105MANSTOSTU-009 already covers compute via unit tests).
2. Per SPEC-105 §7 AC#1, the route returns 200 *regardless* of the underlying health status — the *status* of the story is in the body, the request itself is well-formed. This is distinct from the per-route 409 dispatch (which fires when a route is asked to perform an operation that health would block); the `/health` route itself is purely informational.
3. Registration in the read-route scope (not the write-route scope) at http.ts:75-80 matches the route's read-only nature.
4. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Route registration → codebase grep-proof: `grep -nE "registerHealthRoute|/health" tools/manual-story-studio/src/server/` returns the registration site + the route URL pattern.
2. Route returns 200 for any health status → unit test asserts `GET /api/worlds/.../health` against a valid story returns `200` + `{ status: "ok", findings: [], blocked_actions: [] }`; against a corrupt-metadata story returns `200` + `{ status: "blocked", findings: [...], blocked_actions: [...] }`.
3. End-to-end integration verified by SPEC105MANSTOSTU-014.

## What to Change

### 1. Create `tools/manual-story-studio/src/server/routes/health.ts`

```ts
import { existsSync } from "node:fs";
import type { FastifyInstance } from "fastify";

import { computeHealth } from "../../health/compute.js";
import { resolveManualStoryRoot } from "../../write/sandbox.js";

export interface HealthRouteOptions {
  repoRoot: string;
}

export async function registerHealthRoute(
  server: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/health",
    async (request, reply) => {
      const { slug, msSlug } = request.params;
      let root;
      try {
        root = resolveManualStoryRoot(options.repoRoot, slug, msSlug);
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
      if (!existsSync(root.absolutePath)) {
        return reply.code(404).send({ error: "not_found" });
      }
      const report = computeHealth(root.absolutePath);
      return reply.code(200).send(report);
    },
  );
}
```

### 2. Modify `tools/manual-story-studio/src/server/http.ts`

Add the import + registration inside the read-route scope:

```ts
import { registerHealthRoute } from "./routes/health.js";
// ...
// inside createServer, after the existing read-route registrations at lines 73–80:
await registerHealthRoute(server, { repoRoot: options.repoRoot });
```

Place the registration as the LAST read-route registration so the existing manual-stories / records / beat-templates / metadata / prompts / segments / manuscript ordering is preserved.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/health.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify — one import line + one registration call inside `createServer`'s read-route scope)

## Out of Scope

- The compute pass implementation — SPEC105MANSTOSTU-009.
- The `/health` route's response-shape contract (HealthReport types) — SPEC105MANSTOSTU-001.
- Per-route 409 dispatch when health is blocked (e.g., the prompts/compose route denying writes when health is blocked) — that's a route-layer integration that lands as part of the migration tickets (004–008) using the helper from 003. AC#9 of SPEC-105 (POSTing to /prompts/compose with a blocked story returns 409 with HealthReport body) is verified by SPEC105MANSTOSTU-014 against the composed system.
- Frontend rendering — SPEC105MANSTOSTU-011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and the route's unit tests pass.
3. `grep -nE "GET.*health|registerHealthRoute" tools/manual-story-studio/src/server/` returns the route registration sites.
4. The route returns 200 + valid `HealthReport` body for any health status; 404 only when the manual story directory genuinely doesn't exist.

### Invariants

1. The `/health` route returns 200 status regardless of the underlying integrity status (per SPEC-105 §7 AC#1) — the body carries the status.
2. The response body always conforms to the `HealthReport` interface from `src/health/types.ts` — `findings` is always an array (may be empty), `blocked_actions` is always an array (may be empty).
3. The route is registered inside the read-route scope, not the write-route scope.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/routes/health.test.ts` — unit tests for the route against fixture stories (valid / corrupt-metadata / missing-sidecar / dangling-ref); covers 200 status for all health states + 404 for non-existent story.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.
