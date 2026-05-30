# SPEC102PROCOMREN-010: Prompt HTTP routes + http.ts wiring

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/server/routes/prompts.ts` and registers the routes in `src/server/http.ts`. Wraps the write-side routes inside the existing `wrapRouterWritable` guard.
**Deps**: 007, 008, 009

## Problem

The frontend (tickets 011 / 012 / 013) needs four HTTP endpoints per SPEC-102 §4 Files to touch — backend:

1. `POST /api/worlds/:slug/manual-stories/:msSlug/prompts/preview` — composes + lints; returns Markdown + lint result + sidecar draft WITHOUT writing to disk. Used by the Moment Composer screen's "Generate Prompt" navigation and the Prompt Preview screen's "Regenerate" button.
2. `POST /api/worlds/:slug/manual-stories/:msSlug/prompts` — composes + lints + WRITES `prompts/PROMPT-<n>.md` + sidecar; returns the new id + paths. Used by the "Save Prompt" button (optionally with `lint_override` payload for soft-override saves).
3. `GET /api/worlds/:slug/manual-stories/:msSlug/prompts` — lists saved prompts (id, created_at, moment_directive snippet).
4. `GET /api/worlds/:slug/manual-stories/:msSlug/prompts/:promptId` — reads one saved prompt's Markdown + sidecar.

The existing route registration pattern at `tools/manual-story-studio/src/server/routes/records.ts` is the template; write routes are registered inside `wrapRouterWritable` per the existing `http.ts` shape.

## Assumption Reassessment (2026-05-30)

1. Verified the existing route pattern at `tools/manual-story-studio/src/server/routes/records.ts`: `export async function registerRecordsReadRoutes(server, options)` and `export async function registerRecordsWriteRoutes(writableRouter, options)` are the canonical split. The existing `http.ts` (verified above) registers read routes against the base server and write routes inside `wrapRouterWritable`. The same shape applies to prompts: split into `registerPromptsReadRoutes(server, options)` and `registerPromptsWriteRoutes(writableRouter, options)`.
2. SPEC-102 §4 Files to touch enumerates `POST /api/.../prompts/preview` (no write), `POST /api/.../prompts` (writes), `GET /api/.../prompts` (lists), `GET /api/.../prompts/:id` (reads). The path prefix matches the existing `/api/worlds/:slug/manual-stories/:msSlug/...` convention (verified via the existing `records.ts` route).
3. Cross-artifact shared boundary: the route layer composes:
   - `compose.ts` (ticket 007) → assembles Markdown + lint + sidecar draft.
   - `lint.ts` (ticket 008) → lint pass invoked inside compose.
   - `write/prompts.ts` (ticket 009) → write + id allocation on save.
   - `read/manual-story-metadata.ts` + `read/records.ts` (existing) → consumed by compose.
   The HTTP layer is the bridge; no domain logic lives here beyond request validation + result shaping.

## Architecture Check

1. Splitting `registerPromptsReadRoutes` / `registerPromptsWriteRoutes` follows the established package pattern and slots into the existing `wrapRouterWritable` enforcement. The write routes are guarded; reads are not (parallels records' read/write split).
2. The `/preview` route is a POST (carrying the compose input payload) rather than a GET because the input is a non-trivial JSON body. It does NOT mutate disk and is registered under the read-router group — but per the existing pattern, the response is a fresh compose result, not a stored entity, so it could equally live under the write-router; choosing the read-router matches the no-side-effects semantics and lets it skip `wrapRouterWritable` (which adds write-scope guarding overhead unnecessary here).
3. No backwards-compatibility aliasing — routes are greenfield; no aliasing for any pre-existing prompt URL pattern (none exists).

## Verification Layers

1. All 4 routes registered — codebase grep-proof (`grep -E "/prompts" tools/manual-story-studio/src/server/routes/prompts.ts` returns 4 route handler matches).
2. Write routes wrapped in `wrapRouterWritable` — codebase grep-proof on `http.ts` (`grep -nE "registerPromptsWriteRoutes" tools/manual-story-studio/src/server/http.ts` is inside the `wrapRouterWritable` callback).
3. Preview route does not write — schema validation (test asserts `prompts/` directory is unchanged after a preview call).
4. Save route writes both `prompts/PROMPT-N.md` and `prompt-runs/PROMPT-N.yaml` — schema validation (test asserts both files exist after a save call).

## What to Change

### 1. Create `tools/manual-story-studio/src/server/routes/prompts.ts`

Following the records.ts template, export:

```ts
export interface PromptsRouteOptions {
  repoRoot: string;
}

export async function registerPromptsReadRoutes(
  server: FastifyInstance,
  options: PromptsRouteOptions,
): Promise<void> {
  // POST /api/worlds/:slug/manual-stories/:msSlug/prompts/preview
  //   body: { moment_directive, included_cast, included_records, included_template_path? }
  //   200 -> { markdown, lint, sidecar_draft }
  //   404 -> { error: "manual_story_not_found" }
  //   400 -> { error: "invalid_input", details: ... }

  // GET /api/worlds/:slug/manual-stories/:msSlug/prompts
  //   200 -> { prompts: Array<{ id, created_at, moment_directive_snippet }> }

  // GET /api/worlds/:slug/manual-stories/:msSlug/prompts/:promptId
  //   200 -> { markdown, sidecar }
  //   404 -> { error: "prompt_not_found" }
}

export async function registerPromptsWriteRoutes(
  writableRouter: FastifyInstance,
  options: PromptsRouteOptions,
): Promise<void> {
  // POST /api/worlds/:slug/manual-stories/:msSlug/prompts
  //   body: { moment_directive, included_cast, included_records, included_template_path?, lint_override? }
  //   201 -> { id, markdown_path, sidecar_path, sidecar, lint }
  //   409 -> { error: "lint_blocks_save", findings }  // when hard findings exist AND no override
  //   400 -> { error: "invalid_input", details: ... }
}
```

Each handler:
- Calls `resolveManualStoryRootOrNull(repoRoot, worldSlug, msSlug)` (reusing the existing helper pattern); on null, returns 404.
- Validates the request body (moment_directive non-empty for preview/save; for save, lint_override is optional but if `lint.blockingForCopy` is true and lint_override is absent, returns 409).
- Invokes `composePrompt`, `lintPrompt`, and (for save) `writePrompt`.

### 2. Modify `tools/manual-story-studio/src/server/http.ts`

Add imports and registrations following the existing records pattern:

```ts
import {
  registerPromptsReadRoutes,
  registerPromptsWriteRoutes,
} from "./routes/prompts.js";

// ... in createServer, after registerMetadataReadRoute call:
await registerPromptsReadRoutes(server, { repoRoot: options.repoRoot });

// ... inside wrapRouterWritable callback, after registerMetadataWriteRoute:
await registerPromptsWriteRoutes(writableRouter, {
  repoRoot: options.repoRoot,
});
```

### 3. Tests

`test/server/prompts-routes.test.ts` covers:
- POST `/prompts/preview` returns 200 with `markdown` + `lint` for a valid fixture.
- POST `/prompts/preview` returns 404 for an unknown manual story.
- POST `/prompts/preview` does NOT create files under `prompts/`.
- POST `/prompts` returns 201 with `id: "PROMPT-1"` for a clean fixture.
- POST `/prompts` returns 409 `lint_blocks_save` when a hard finding is present and no `lint_override` supplied.
- POST `/prompts` with `lint_override` persists the override into the sidecar.
- GET `/prompts` lists saved prompts.
- GET `/prompts/PROMPT-1` returns the Markdown + sidecar; GET `/prompts/PROMPT-999` returns 404.
- Write routes are inside `wrapRouterWritable` — assert via the existing write-scope-guard test pattern at `test/server/write-scope-guard.test.ts`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/prompts.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify) — adds 4 lines (imports + 2 registrations)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (new)

## Out of Scope

- Frontend API client (ticket 011).
- Frontend UI (tickets 012 / 013).
- Auto-archive / soft-delete of saved prompts — saved prompts are immutable append-only files per SPEC-102.
- Beat-template HTTP routes — SPEC-104.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — `prompts-routes.test.ts` included.
2. POST `/prompts/preview` succeeds without writing to disk (assertion: `prompts/` directory has same file count before and after the call).
3. POST `/prompts` writes `prompts/PROMPT-N.md` + `prompt-runs/PROMPT-N.yaml` and returns 201 with the new id.
4. POST `/prompts` returns 409 when hard findings present and no override supplied; returns 201 when override supplied.

### Invariants

1. The 4 routes follow the `/api/worlds/:slug/manual-stories/:msSlug/...` prefix.
2. Write routes are inside `wrapRouterWritable`; the preview route is NOT.
3. The preview route is a pure compose; it never mutates `prompts/` or `prompt-runs/`.
4. Hard lint findings block a non-override save with a 409 response shape carrying the findings.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/prompts-routes.test.ts` — per-route happy + sad paths, write-scope guard inclusion.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && npm run build` — confirms the http.ts modification compiles.
