# SPEC105MANSTOSTU-014: Acceptance tests + fixtures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds acceptance coverage for the existing health compute + route tests and fixes the route-layer blocked-health gate for prompt preview/save and segment save/edit. Exercises the composed integrity system end-to-end.
**Deps**: archive/tickets/SPEC105MANSTOSTU-012.md

## Problem

SPEC-105 §2 item 8 + §7 Acceptance criteria specify four acceptance test scenarios:
- Corrupt `manual-story.yaml` → `/health` returns `blocked` with `metadata-yaml-parse-failed`; Dashboard renders banner; prompt-preview route returns 409.
- Corrupt single record file → `/health` returns `degraded`; non-affected records still load.
- Missing segment sidecar (orphan `.md` without `.yaml`) → `blocked` with `segment-sidecar-missing`; manuscript-compile route returns 409.
- Dangling typed ref → `degraded` with `reference-resolution-failed`.

These tests verify the spec's promise (visible, specific, repairable failure) end-to-end against the composed integrity system: compute pass + `/health` route + per-route 409 dispatch via the read-error-http helper. They are the load-bearing assurance that the migration tickets (004–008) + compute (009) + route (010) actually behave as a fail-fast cockpit.

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/test/health/` directory already exists at HEAD from archive/tickets/SPEC105MANSTOSTU-009.md, and `tools/manual-story-studio/test/server/health.test.ts` exists from archive/tickets/SPEC105MANSTOSTU-010.md. The live remaining delta is not to create a duplicate fixture directory; it is to complete the missing composed acceptance cases in the existing health/server test surfaces.
2. SPEC-105 §8 Assumption reassessment notes that fixture YAML files MUST NOT be parsed at test-discovery time — if `node --test`'s loader parses YAML files at fixture-discovery, store the corrupt content as `.yaml.txt` and rename to `.yaml` at test setup. Standard Node test runner does NOT parse fixture YAML at discovery (it only loads `.test.js` modules), so fixture YAML files can carry intentional syntax errors directly. This is verified during implementation.
3. Cross-skill boundary: the tests exercise the FULL stack from compute → route → HTTP response and frontend banner/error surfacing where applicable. The `Deps: archive/tickets/SPEC105MANSTOSTU-012.md` declaration is the transitive head — the DAG composes (012 → 011 → 010 → 009 → {001, 004–008} → {002, 003}), so 014 transitively depends on every upstream ticket per the §Spec-Integration Ticket Shape's transitive-head convention.
4. Live route-name correction: Manual Story Studio's compose endpoint is `POST /api/worlds/:world/manual-stories/:story/prompts/preview` (see `src/server/routes/prompts.ts` and `web/src/api/prompts.ts`), not `/prompts/compose`. The acceptance proof uses the live public route.
5. Engine gap found during reassessment: `/health` exists and compute tests cover blocked health, but prompt preview/save and segment save/edit did not consult `HealthReport.blocked_actions` before write/compose operations. This ticket adds a small route-layer helper so blocked stories return `409` with the full computed `HealthReport` before the prompt composer or segment writer runs.
6. FOUNDATIONS Rule 1 No Floating Facts grounding: the acceptance tests are the spec's structural proof surface — they verify that the integrity model has scope (per-pass coverage), prerequisites (corrupted-fixture inputs), limits (which findings emit which severities), and consequences (route status codes + HealthReport bodies). Without these tests landing, AC#2-5 + AC#9 of SPEC-105 §7 are unredeemed.

## Architecture Check

1. The acceptance tests continue the existing temp-fixture strategy from `test/health/compute.test.ts` and `test/server/health.test.ts` instead of introducing a second fixture scheme. Inline temp fixtures already avoid mutation of checked-in data and keep each scenario explicit at the assertion site.
2. The remaining route-layer helper is intentionally small: it calls `computeHealth`, checks whether the named blocked action is present, and returns the computed `HealthReport` with status `409` when blocked. It does not reinterpret findings or duplicate compute logic.
3. No backwards-compatibility shims.

## Verification Layers

1. Test files compile + run under `node --test` → `cd tools/manual-story-studio && npm test` exits 0 with the new tests included.
2. Each of the 4 fixture scenarios produces the spec-prescribed HealthReport → assertion-by-assertion per SPEC-105 §7 ACs #2–5.
3. AC#9 (POSTing to `/api/.../prompts/preview` with a blocked story returns 409 with HealthReport body) → tested in `test/server/health.test.ts` against the corrupt-metadata fixture.

## What to Change

### 1. Reuse the existing health fixtures and server tests

The live tree already has `tools/manual-story-studio/test/health/compute.test.ts` and `tools/manual-story-studio/test/server/health.test.ts`, with temp fixtures created inline at assertion sites. This ticket extends those existing surfaces instead of creating a second fixture directory.

### 2. Add route-layer blocked-action enforcement

Add `src/server/health-gate.ts` as the shared route helper for health blocked-actions, then wire it into:

- `POST /prompts/preview` → `prompt_copy`
- `POST /prompts` → `prompt_save`
- `POST /segments` and `PUT /segments/:segmentId` → `segment_save`
- `POST /manuscript/rebuild` → `manuscript_compile`

### 3. Extend server acceptance coverage

Add server tests for corrupt record YAML and blocked `409` responses from prompt preview/save, segment save, and manuscript rebuild.

## Files to Touch

- `tools/manual-story-studio/src/server/health-gate.ts` (new)
- `tools/manual-story-studio/src/server/routes/prompts.ts`
- `tools/manual-story-studio/src/server/routes/segments.ts`
- `tools/manual-story-studio/src/server/routes/manuscript.ts`
- `tools/manual-story-studio/test/server/health.test.ts`
- `tools/manual-story-studio/test/server/manuscript-routes.test.ts`
- `archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md`

## Out of Scope

- Frontend component tests for the HealthBanner — deferred per spec §2 item 8's *"extending it to component tests is SPEC-111's concern"*.
- Sandbox-escape tests, full-workflow tests, prompt-safety acceptance suite — those are §31 Stage 9 (acceptance test layer beyond Stage 1's slice) deferred per the spec's Out of scope.
- Frontend browser/component tests beyond the manual/browser smoke already covered by archive/tickets/SPEC105MANSTOSTU-011.md and archive/tickets/SPEC105MANSTOSTU-012.md.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` runs and the expanded `test/health/compute.test.ts` + `test/server/health.test.ts` coverage passes.
2. The four fixture scenarios produce the expected HealthReport shape per SPEC-105 §7 ACs #2-5: corrupt-metadata → blocked + all four blocked_actions; corrupt-record → degraded + empty blocked_actions; missing-segment-sidecar → blocked + manuscript_compile in blocked_actions; dangling-typed-ref → degraded.
3. AC#9 is verified: POSTing to `/prompts/preview` against a blocked story returns 409 + HealthReport-shaped body.
4. `bash scripts/check-all.sh` (after archive/tickets/SPEC105MANSTOSTU-013.md lands) exits 0 with the new tests included in the Manual Studio test output.

### Invariants

1. Fixture worlds are created in temp roots per test — fixtures themselves are never mutated.
2. Each test asserts AT LEAST one finding with a specific `code` value, validating the spec-prescribed code vocabulary (`metadata-yaml-parse-failed`, `record-yaml-parse-failed`, `segment-sidecar-missing`, `reference-resolution-failed`).
3. The 4 SPEC-105 §7 AC tests pass programmatically; AC#9 is also covered programmatically (POST to prompt-preview route).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/health/compute.test.ts` — compute-pass unit tests against the 4 scenarios.
2. `tools/manual-story-studio/test/server/health.test.ts` — route-level integration tests covering `/health` GET + per-route 409 dispatch on blocked health.

### Commands

1. `cd tools/manual-story-studio && npm test` — full package test (includes new health tests).
2. `bash scripts/check-all.sh` — monorepo all-green verification (after archive/tickets/SPEC105MANSTOSTU-013.md).

## Outcome

Completed on 2026-06-01. The ticket absorbed a same-seam engine gap found during acceptance reassessment: routes that should respect `HealthReport.blocked_actions` now share `blockIfHealthDisallows` and return `409` with the computed report before composing prompts, saving prompts, saving/editing segments, or rebuilding the manuscript.

The final acceptance tests live in the existing server health suite rather than the stale draft `test/health/fixtures/` layout. They cover corrupt metadata, corrupt record YAML, missing segment sidecar, dangling typed refs, prompt preview/save 409s, segment save 409s, and manuscript rebuild 409s.

## Verification

- `cd tools/manual-story-studio && npm run build:backend`
- `cd tools/manual-story-studio && node --test dist/test/server/health.test.js`
- `cd tools/manual-story-studio && node --test dist/test/server/health.test.js dist/test/server/manuscript-routes.test.js`
- `cd tools/manual-story-studio && npm test`
- `bash scripts/check-all.sh`

## Deviations

- The draft route name `/prompts/compose` was stale; the live public route is `/prompts/preview`.
- No static fixture directory was added. The existing inline temp-fixture pattern already provides isolated, mutation-free acceptance inputs.
