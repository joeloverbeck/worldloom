# SPEC104BEATEMDET-006: Beat-templates CRUD routes + candidate-computation route

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new module `tools/manual-story-studio/src/server/routes/beat-templates.ts` (CRUD routes following SPEC-101 pattern + `POST .../moment-composer/template-candidates`); modifies `tools/manual-story-studio/src/server/http.ts` (route registration) + `tools/manual-story-studio/src/server/routes/records.ts` (special-case skip for class `beat-templates` since dedicated routes file owns the URL space)
**Deps**: 002, 005

## Problem

SPEC-104 §2.4 (CRUD UI) requires backend CRUD routes for beat-templates; §2.2 (filter pipeline) is exposed via `POST /api/.../moment-composer/template-candidates` consumed by the frontend `BeatTemplateCandidates.tsx` (ticket 012). The CRUD shape follows the established SPEC-101 records-CRUD pattern (list / single / create / update / delete with hybrid-delete policy), but beat-templates have their own dedicated routes file (rather than threading through the generic `routes/records.ts`) because the schema is richer (closed enums, structured nested blocks) and the candidate-computation route is naturally co-located with the CRUD routes.

A coordination concern arises: once ticket 001 adds `"beat-templates"` to `MANUAL_RECORD_CLASSES`, the generic `routes/records.ts` (per SPEC-101) will start admitting `GET /api/.../records/beat-templates/...` URLs alongside the dedicated `/beat-templates` URL space this ticket creates. The dedicated routes file owns the entire beat-templates URL space; `routes/records.ts` needs a special-case skip for class `beat-templates` so the two surfaces don't double-serve the same logical CRUD operations.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/server/routes/records.ts` (verified to exist) implements the generic `GET/POST/PUT/DELETE /api/worlds/:slug/manual-stories/:msSlug/records/:class/[:id]` pattern per SPEC-101 §2.6, validating the `:class` URL param against `MANUAL_RECORD_CLASSES`. `tools/manual-story-studio/src/server/http.ts` registers the records routes inside `wrapRouterWritable` (per SPEC-100 write-scope guard). The hybrid-delete policy is implemented in `routes/records.ts` per SPEC-101 §3 (unreferenced → hard delete; referenced → `active: false` + `retired_reason`; force-delete with confirmation). The ID-allocator (`tools/manual-story-studio/src/write/id-allocator.ts:60`) returns `mtemplate-<integer>` for the new `beat-templates` class (per ticket 001).
2. Spec: SPEC-104 §2.4 + §4 create-backend declare `tools/manual-story-studio/src/server/routes/beat-templates.ts — CRUD routes following SPEC-101 pattern + POST /api/.../moment-composer/template-candidates`; §3 key decision documents the hybrid-delete policy applies; §2.2 candidates route consumes the filter pipeline (ticket 005). The reassess-spec session's §3.10 / §3.6 coverage already verified the records.ts dispatch coordination as a known implementation note.
3. Cross-skill boundary: this ticket creates a new dedicated URL space (`/api/.../beat-templates`) that mirrors the SPEC-101 records-CRUD shape but with the beat-template-specific schema validator (ticket 002). The `routes/records.ts` modification is the coordination seam: a special-case `if (class === "beat-templates") return 404 with "Use /beat-templates routes directly"` (or equivalent skip) so the URL ownership is unambiguous. The candidates route consumes `filterBeatTemplates` (ticket 005) and `validateBeatTemplate` (ticket 002).
4. Schema extension (was template item 6): this introduces a new HTTP surface (the `/beat-templates` URL space + the candidates route). The dedicated routes are greenfield (no breaking changes to existing routes); the `routes/records.ts` modification is additive (a special-case skip that preserves the generic CRUD for all other classes).

## Architecture Check

1. Dedicated routes file follows SPEC-104's spec §4 explicit decision (a separate file, not extending records.ts to special-case beat-templates inline). The dedicated file pattern keeps the beat-template-specific validator (ticket 002) and the candidate-computation route (which consumes the filter pipeline, ticket 005) co-located. Alternative considered and rejected: extend `routes/records.ts` to handle beat-template-specific schema inline — rejected because the spec §4 explicitly names a dedicated file, and because the candidate route (`POST .../moment-composer/template-candidates`) doesn't fit the generic records-CRUD pattern (it returns filter output, not record bodies).
2. The records.ts skip is the minimum-surface coordination: a special-case for `class === "beat-templates"` rather than restructuring records.ts. This preserves the existing class-dispatch pattern for the other 18 SPEC-101 MVP record classes.
3. No backwards-compatibility aliasing or shims introduced. The hybrid-delete policy mirrors SPEC-101's established discipline; the URL pattern mirrors the SPEC-101 records-CRUD URL shape.

## Verification Layers

1. CRUD round-trip: create → list → get → update → delete a beat-template via the dedicated routes → targeted route tests covering each operation.
2. Hybrid-delete behavior: unreferenced template → hard delete; referenced template → `active: false`; force-delete with confirmation flag → hard delete + audit-trail in response → targeted route tests.
3. Candidate-computation: `POST .../moment-composer/template-candidates` with fixture input returns the filter pipeline's output shape → targeted route test asserting the response shape matches `BeatTemplateCandidate[]` (per ticket 005's filter output).
4. Schema validation: invalid beat-template body → 400 with violations from `validateBeatTemplate` → targeted route test passing each violation type.
5. Routes-coordination: `GET /api/.../records/beat-templates/...` (the generic records URL) returns 404 with a clear "Use /beat-templates" message → targeted records.ts route test.
6. Write-scope guard: the new routes are registered inside `wrapRouterWritable` per SPEC-100 → grep-proof + targeted test that POST/PUT/DELETE registration outside the wrapper throws.

## What to Change

### 1. Create `tools/manual-story-studio/src/server/routes/beat-templates.ts`

Five CRUD routes following SPEC-101 §2.6's pattern:
- `GET /api/worlds/:slug/manual-stories/:msSlug/beat-templates` — list beat-templates (returns summary fields).
- `GET /api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id` — single beat-template (full body).
- `POST /api/worlds/:slug/manual-stories/:msSlug/beat-templates` — create (allocates next `mtemplate-<integer>` ID via ticket 001's allocator; validates body via `validateBeatTemplate` from ticket 002).
- `PUT /api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id` — update (re-validates body).
- `DELETE /api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id` — hybrid delete per SPEC-101 §3 (unreferenced → hard delete; referenced → active:false + retired_reason; `?force=true` for force-delete with confirmation flag in request body).

Plus the candidate route:
- `POST /api/worlds/:slug/manual-stories/:msSlug/moment-composer/template-candidates` — accepts the filter input (selected cast, optional move_family/tags/location, moment directive); reads all beat-templates from `records/beat-templates/`; calls `filterBeatTemplates` (ticket 005); returns `BeatTemplateCandidate[]`.

All six routes register inside `wrapRouterWritable` per SPEC-100.

### 2. Modify `tools/manual-story-studio/src/server/http.ts`

Register `routes/beat-templates.ts` inside the `wrapRouterWritable` block, alongside existing routes (records, metadata, prompts, segments, manuscript).

### 3. Modify `tools/manual-story-studio/src/server/routes/records.ts`

Add a special-case skip at the top of the URL-dispatch logic:

```
if (request.params.class === "beat-templates") {
  return reply.code(404).send({
    error: "Use /beat-templates URL space; this generic records endpoint does not handle beat-templates"
  });
}
```

The skip applies to all five CRUD methods on `/records/:class/[:id]`. The error message names the dedicated routes file's URL space so client errors surface the right path.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify)
- `tools/manual-story-studio/src/server/routes/records.ts` (modify)
- `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` (new)

## Out of Scope

- The filter pipeline itself — ticket 005.
- The schema validator itself — ticket 002.
- The frontend pages that consume these routes — tickets 011 + 012.
- The typed client — ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. POST → GET → GET-single → PUT → DELETE round-trip succeeds for a fixture beat-template (5 sequential route calls).
2. POST with invalid body returns 400 with violations from `validateBeatTemplate`.
3. DELETE on an unreferenced template hard-deletes; DELETE on a referenced template sets `active: false`; DELETE with `?force=true` + confirmation hard-deletes with audit-trail in response.
4. POST `/moment-composer/template-candidates` with fixture input returns `BeatTemplateCandidate[]` matching the filter pipeline's expected output for the fixture.
5. GET `/api/.../records/beat-templates/...` returns 404 with the "Use /beat-templates URL space" message.
6. Attempting to register a POST route outside `wrapRouterWritable` throws at registration time (existing SPEC-100 test continues to pass).
7. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/beat-templates-routes.test.js"` succeeds.

### Invariants

1. The dedicated routes file owns the entire `/beat-templates` URL space; `routes/records.ts` skips class `beat-templates` to preserve unambiguous URL ownership.
2. CRUD shape mirrors SPEC-101 §2.6's records pattern (list / single / create / update / delete with the same hybrid-delete policy).
3. The candidate-computation route is co-located with the CRUD routes (not in `routes/prompts.ts` or elsewhere) so the filter-pipeline consumer and the template-CRUD consumer share the same code-ownership boundary.
4. All six routes are inside `wrapRouterWritable` per SPEC-100.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` (new) — covers the 7 acceptance-criteria scenarios. Fixture manual-stories under `test/fixtures/beat-templates-routes/` provide beat-template files for the CRUD round-trip + candidate-computation tests.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/beat-templates-routes.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's edits are scoped to the routes file + the records.ts skip + http.ts registration; integration with the frontend is covered by tickets 011/012 and the capstone 014.
