# SPEC105MANSTOSTU-014: Acceptance tests + fixtures

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/test/health/` directory with `health-compute.test.ts`, `health-route.test.ts`, and 4 fixture worlds (corrupt-metadata, corrupt-record, missing-segment-sidecar, dangling-typed-ref). No production code changes; exercises the composed integrity system end-to-end.
**Deps**: archive/tickets/SPEC105MANSTOSTU-012.md

## Problem

SPEC-105 §2 item 8 + §7 Acceptance criteria specify four acceptance test scenarios:
- Corrupt `manual-story.yaml` → `/health` returns `blocked` with `metadata-yaml-parse-failed`; Dashboard renders banner; prompt-compose route returns 409.
- Corrupt single record file → `/health` returns `degraded`; non-affected records still load.
- Missing segment sidecar (orphan `.md` without `.yaml`) → `blocked` with `segment-sidecar-missing`; manuscript-compile route returns 409.
- Dangling typed ref → `degraded` with `reference-resolution-failed`.

These tests verify the spec's promise (visible, specific, repairable failure) end-to-end against the composed integrity system: compute pass + `/health` route + per-route 409 dispatch via the read-error-http helper. They are the load-bearing assurance that the migration tickets (004–008) + compute (009) + route (010) actually behave as a fail-fast cockpit.

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/test/health/` directory does NOT exist at HEAD (verified by `ls tools/manual-story-studio/test/` from the reassess-spec session); this ticket creates the directory + 2 test files + 4 fixture subtrees. No collision risk.
2. SPEC-105 §8 Assumption reassessment notes that fixture YAML files MUST NOT be parsed at test-discovery time — if `node --test`'s loader parses YAML files at fixture-discovery, store the corrupt content as `.yaml.txt` and rename to `.yaml` at test setup. Standard Node test runner does NOT parse fixture YAML at discovery (it only loads `.test.js` modules), so fixture YAML files can carry intentional syntax errors directly. This is verified during implementation.
3. Cross-skill boundary: the tests exercise the FULL stack from compute → route → HTTP response and frontend banner/error surfacing where applicable. The `Deps: archive/tickets/SPEC105MANSTOSTU-012.md` declaration is the transitive head — the DAG composes (012 → 011 → 010 → 009 → {001, 004–008} → {002, 003}), so 014 transitively depends on every upstream ticket per the §Spec-Integration Ticket Shape's transitive-head convention.
4. FOUNDATIONS Rule 1 No Floating Facts grounding: the acceptance tests are the spec's structural proof surface — they verify that the integrity model has scope (per-pass coverage), prerequisites (corrupted-fixture inputs), limits (which findings emit which severities), and consequences (route status codes + HealthReport bodies). Without these tests landing, AC#2-5 + AC#9 of SPEC-105 §7 are unredeemed.

## Architecture Check

1. The tests use fixture-world subtrees stored under `test/health/fixtures/<scenario-name>/` — each is a minimal manual-story directory with the targeted corruption. Tests `fs.cpSync` the fixture to a temp root per-test (so the fixture itself stays clean) and invoke `computeHealth` + the route handler against the temp copy. This mirrors the §Spec-Integration Ticket Shape's "fixture world copy strategy" recommendation.
2. The 2 test files are split per surface: `health-compute.test.ts` covers the compute pass in isolation (no Fastify involved); `health-route.test.ts` covers the full route surface including HTTP status + body. The split keeps each test file under ~200 lines and gives compute-only regressions a clear blame surface.
3. No backwards-compatibility shims.

## Verification Layers

1. Test files compile + run under `node --test` → `cd tools/manual-story-studio && npm test` exits 0 with the new tests included.
2. Each of the 4 fixture scenarios produces the spec-prescribed HealthReport → assertion-by-assertion per SPEC-105 §7 ACs #2–5.
3. AC#9 (POSTing to `/api/.../prompts/compose` with a blocked story returns 409 with HealthReport body) → tested in `health-route.test.ts` against the corrupt-metadata fixture.

## What to Change

### 1. Create `tools/manual-story-studio/test/health/fixtures/`

Four fixture subtrees:

- `fixtures/corrupt-metadata/manual-stories/scenario/manual-story.yaml` — contains a deliberate YAML syntax error (e.g., unterminated string).
- `fixtures/corrupt-record/manual-stories/scenario/manual-story.yaml` (valid) + `records/cast/mchar-1.yaml` (corrupt YAML) + other records valid.
- `fixtures/missing-segment-sidecar/manual-stories/scenario/manual-story.yaml` (valid, with `segment_order: [SEG-1]`) + `segments/SEG-1.md` (valid prose) + `segments/SEG-1.yaml` (ABSENT — the orphan case).
- `fixtures/dangling-typed-ref/manual-stories/scenario/manual-story.yaml` (valid) + `records/cast/mchar-1.yaml` (valid) + `records/relationships/mrel-1.yaml` (valid YAML but `refs.characters: [mchar-99]` pointing at a non-existent cast).

Each fixture follows the standard Manual Studio per-world `manual-stories/<scenario>/` layout. Tests `fs.cpSync` each fixture's contents into a temp root before invoking compute / route.

### 2. Create `tools/manual-story-studio/test/health/health-compute.test.ts`

```ts
import { test } from "node:test";
import { strictEqual, ok as okAssert } from "node:assert";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { computeHealth } from "../../src/health/compute.js";

test("corrupt manual-story.yaml → blocked with metadata-yaml-parse-failed finding", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "msshealth-"));
  cpSync("test/health/fixtures/corrupt-metadata/manual-stories/scenario/", path.join(tmp, "scenario/"), { recursive: true });

  const report = computeHealth(path.join(tmp, "scenario"));

  strictEqual(report.status, "blocked");
  strictEqual(report.findings.length, 1);
  strictEqual(report.findings[0]?.code, "metadata-yaml-parse-failed");
  strictEqual(report.blocked_actions.length, 4); // all four blocked
});

// ... analogous tests for corrupt-record, missing-segment-sidecar, dangling-typed-ref scenarios
```

### 3. Create `tools/manual-story-studio/test/health/health-route.test.ts`

End-to-end route tests using Fastify's inject() helper:

```ts
import { test } from "node:test";
import { strictEqual } from "node:assert";
import { createServer } from "../../src/server/http.js";
// ...

test("GET /api/worlds/:world/manual-stories/:story/health returns 200 with HealthReport body for corrupt metadata", async () => {
  const tmp = setupFixture("corrupt-metadata");
  const server = await createServer({ repoRoot: tmp });
  const response = await server.inject({
    method: "GET",
    url: "/api/worlds/scenario-world/manual-stories/scenario/health",
  });
  strictEqual(response.statusCode, 200);
  const body = response.json();
  strictEqual(body.status, "blocked");
  strictEqual(body.findings[0]?.code, "metadata-yaml-parse-failed");
});

test("POST /api/worlds/.../prompts/compose returns 409 + HealthReport body when health is blocked", async () => {
  const tmp = setupFixture("corrupt-metadata");
  const server = await createServer({ repoRoot: tmp });
  const response = await server.inject({
    method: "POST",
    url: "/api/worlds/scenario-world/manual-stories/scenario/prompts/compose",
    payload: { moment_directive: "test", included_cast: [], included_records: [] },
  });
  strictEqual(response.statusCode, 409);
  const body = response.json();
  strictEqual(body.status, "blocked"); // HealthReport-shaped body
});
```

## Files to Touch

- `tools/manual-story-studio/test/health/fixtures/corrupt-metadata/...` (new — fixture subtree)
- `tools/manual-story-studio/test/health/fixtures/corrupt-record/...` (new)
- `tools/manual-story-studio/test/health/fixtures/missing-segment-sidecar/...` (new)
- `tools/manual-story-studio/test/health/fixtures/dangling-typed-ref/...` (new)
- `tools/manual-story-studio/test/health/health-compute.test.ts` (new)
- `tools/manual-story-studio/test/health/health-route.test.ts` (new)

## Out of Scope

- Frontend component tests for the HealthBanner — deferred per spec §2 item 8's *"extending it to component tests is SPEC-111's concern"*.
- Sandbox-escape tests, full-workflow tests, prompt-safety acceptance suite — those are §31 Stage 9 (acceptance test layer beyond Stage 1's slice) deferred per the spec's Out of scope.
- Modifying production code — every production change lands in SPEC105MANSTOSTU-001 through archive/tickets/SPEC105MANSTOSTU-013.md.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` runs and the new `test/health/health-compute.test.ts` + `test/health/health-route.test.ts` pass.
2. The four fixture scenarios produce the expected HealthReport shape per SPEC-105 §7 ACs #2-5: corrupt-metadata → blocked + all four blocked_actions; corrupt-record → degraded + empty blocked_actions; missing-segment-sidecar → blocked + manuscript_compile in blocked_actions; dangling-typed-ref → degraded.
3. AC#9 is verified: POSTing to `/prompts/compose` against a blocked story returns 409 + HealthReport-shaped body.
4. `bash scripts/check-all.sh` (after archive/tickets/SPEC105MANSTOSTU-013.md lands) exits 0 with the new tests included in the Manual Studio test output.

### Invariants

1. Fixture worlds live under `test/health/fixtures/` and are copied via `fs.cpSync` to a temp root per-test — fixtures themselves are never mutated.
2. Each test asserts AT LEAST one finding with a specific `code` value, validating the spec-prescribed code vocabulary (`metadata-yaml-parse-failed`, `record-yaml-parse-failed`, `segment-sidecar-missing`, `reference-resolution-failed`).
3. The 4 SPEC-105 §7 AC tests pass programmatically; AC#9 is also covered programmatically (POST to compose route).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/health/health-compute.test.ts` — compute-pass unit tests against the 4 fixtures.
2. `tools/manual-story-studio/test/health/health-route.test.ts` — route-level integration tests covering `/health` GET + per-route 409 dispatch on blocked health.

### Commands

1. `cd tools/manual-story-studio && npm test` — full package test (includes new health tests).
2. `bash scripts/check-all.sh` — monorepo all-green verification (after archive/tickets/SPEC105MANSTOSTU-013.md).
