# MSSUX-007: Stop emitting a 404 console error when no manuscript is compiled yet

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` only (server manuscript read route + web API client + one route test). No skills, hooks, validators, canon engine, or world content touched.
**Deps**: None

## Problem

At intake, the Manual Story Studio dashboard (`/worlds/<world>/manual-stories/<story>/dashboard`) showed a browser-console `Failed to load resource: the server responded with a status of 404 (Not Found)` error for `GET /api/worlds/<world>/manual-stories/<story>/manuscript` on every load of a story that had no compiled manuscript yet — i.e. the normal state at the start of story creation.

Observed before this ticket: the manuscript read route signaled the expected *"manuscript not compiled yet"* state with HTTP `404 { error: "manuscript_not_compiled_yet" }` (`src/server/routes/manuscript.ts`). The app handled it correctly — `web/src/api/manuscript.ts` mapped 404 to `null`, and `Dashboard.tsx` rendered "No manuscript yet." — but Chrome auto-logs every 4xx/5xx network response to the console, regardless of how the app handles the promise. So a normal, expected state produced a red console error. (It appeared twice in dev because React 18 StrictMode double-invokes effects; that doubling disappears in a production build and is not a separate defect.)

"Not compiled yet" is not "resource not found" — the manual story exists, the manuscript artifact simply has not been built. The landed contract signals the expected empty-state with a successful response carrying a present/absent flag. The read layer already modeled this: `readManuscript` (`src/read/manuscript.ts`) returns `ManuscriptReadResult` with `manuscript_present: boolean` and zeroed `body`/`byte_count`/`word_count` when absent. This ticket stopped the route from discarding that flag and converting absence into a 404.

## Assumption Reassessment (2026-06-03)

1. `src/server/routes/manuscript.ts` — `readManuscript({ manualStoryRoot })` returns a `Result`; on success `result.value` is the full `ManuscriptReadResult`. The route now returns that value for both present and absent manuscripts. The genuine-not-found `404 { error: "manual_story_not_found" }` for a missing story root remains a different branch and was preserved.
2. `src/read/manuscript.ts` — `ManuscriptReadResult` already carried `manuscript_present: boolean` plus `manuscript_path`, `body` (`""` when absent), `byte_count` (`0`), `word_count` (`0`). No read-layer change was needed; the discriminated shape already existed. The frontend type `ManuscriptResponse` (`web/src/api/manuscript.ts`) now includes `manuscript_present`.
3. Shared contract under audit: the response-shape contract between the server route (`src/server/routes/manuscript.ts`) and the web client (`web/src/api/manuscript.ts` -> consumed by `web/src/pages/Dashboard.tsx` and `web/src/pages/Manuscript.tsx`). The change is additive on the success body (adds `manuscript_present`) and removes one error status; both ends changed in this ticket so no consumer is left reading the old contract. Existing route test `test/server/manuscript-routes.test.ts` was updated in lockstep.
4. Pre-edit baseline: `npm --prefix tools/manual-story-studio test` passed before source edits, confirming the broad package lane was green at intake.
5. Package public-surface check: `tools/manual-story-studio/README.md` does not document the manuscript read response shape, so no README update was required.

## Architecture Check

1. Returning `200 { manuscript_present: false, ... }` for an existing-but-uncompiled manuscript is the correct REST semantics: the resource (the manual story's manuscript view) exists and is computable; it is simply empty. `404` is then reserved for its true meaning — the story root does not exist (`manual_story_not_found`). This is cleaner than the alternatives considered during diagnosis: (B) gating the fetch on a metadata `manuscript_present` flag requires widening the `/metadata` payload for the same outcome at higher cost, and (C) suppressing the browser log is impossible from app code. The read layer already returns the flag, so the server change is a one-branch deletion rather than new modeling.
2. No backwards-compatibility shim: the old `404 { error: "manuscript_not_compiled_yet" }` status is removed outright, not aliased. The client's existing `status === 404 → null` line is retained as a defensive mapping for the genuine `manual_story_not_found` case (returns `null`, preserving today's dashboard "No manuscript yet" fallback), so no dual-path handling of the not-compiled state survives.

## Verification Layers

1. Invariant — an uncompiled manuscript produces no failed network request → `test/server/manuscript-routes.test.ts` asserts `statusCode === 200` and `manuscript_present === false` for the not-compiled fixture (replacing the 404 assertion).
2. Invariant — a present manuscript still returns its body and counts unchanged → existing "returns 200 ... Opening body 1." assertions (`test/server/manuscript-routes.test.ts:103-113`) continue to pass, now additionally observing `manuscript_present === true`.
3. Invariant — the web client compiles against the widened `ManuscriptResponse` and the Dashboard still treats absence as missing → `npm --prefix tools/manual-story-studio/web test` (the web `test` script is `tsc -p tsconfig.json --noEmit`).

## Landed Changes

### 1. Server route returns 200 with the present/absent flag

`tools/manual-story-studio/src/server/routes/manuscript.ts` — in `registerManuscriptReadRoute`, deleted the not-compiled-yet 404 branch so the handler returns the read result unconditionally on `result.ok`:

```ts
const result = readManuscript({ manualStoryRoot: root.absolutePath });
if (!result.ok) return mapReadErrorToHttpReply(reply, result.error);
return result.value; // { manuscript_present, manuscript_path, body, byte_count, word_count }
```

The `manual_story_not_found` 404 and the read-error mapping were left untouched.

### 2. Web client keys on the flag, not on 404

`tools/manual-story-studio/web/src/api/manuscript.ts`:

- Added `manuscript_present: boolean;` to the `ManuscriptResponse` interface.
- In `readManuscript`, parse the 200 body and return `null` when the manuscript is absent, while keeping the genuine-not-found 404 mapping as a defensive fallback:

```ts
const response = await fetch(manuscriptBase(worldSlug, msSlug));
if (response.status === 404) return null; // manual_story_not_found
if (!response.ok) {
  throw new Error(`readManuscript -> ${await readErrorBody(response)}`);
}
const body = (await response.json()) as ManuscriptResponse;
return body.manuscript_present ? body : null;
```

No change to `Dashboard.tsx` or `Manuscript.tsx` — both already treat a `null` result as "no manuscript".

### 3. Update the route test to the new contract

`tools/manual-story-studio/test/server/manuscript-routes.test.ts` — the absent-manuscript test now asserts the new contract: `statusCode === 200` and the JSON body has `manuscript_present === false` (with `body === ""`, `byte_count === 0`, `word_count === 0`). The present-manuscript case also asserts `manuscript_present === true`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/manuscript.ts` (modify)
- `tools/manual-story-studio/web/src/api/manuscript.ts` (modify)
- `tools/manual-story-studio/test/server/manuscript-routes.test.ts` (modify)

## Out of Scope

- The React StrictMode double-invocation of the mount effect (dev-only; not a defect).
- Any change to `/metadata`, `/health`, or other dashboard endpoints (all return 200; confirmed healthy during diagnosis).
- The `/manuscript/rebuild` POST route (unaffected).
- Suppressing or filtering browser console output by any client-side mechanism.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/manual-story-studio run test:backend` — the updated `manuscript-routes.test.ts` passes: uncompiled fixture returns `200` + `manuscript_present: false`; compiled fixture still returns `200` + body/counts.
2. `npm --prefix tools/manual-story-studio/web test` — web typecheck passes against the widened `ManuscriptResponse`.
3. `npm --prefix tools/manual-story-studio test` — full package suite (backend `node --test` + web typecheck) passes.

### Invariants

1. The manuscript read route never returns a 4xx/5xx for an existing manual story whose manuscript has not been compiled — that state is `200 { manuscript_present: false, ... }`.
2. A genuinely missing story root still returns `404 { error: "manual_story_not_found" }`; `404` is no longer used for the empty-manuscript state.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/manuscript-routes.test.ts` — the not-compiled assertion now expects `200 { manuscript_present: false, ... }` instead of `404 { error: "manuscript_not_compiled_yet" }`; the present-manuscript case additionally verifies `manuscript_present: true`.

### Commands

1. `npm --prefix tools/manual-story-studio run test:backend`
2. `npm --prefix tools/manual-story-studio test`
3. Manual confirmation (optional): with backend + Vite dev server running, load a dashboard for a story with no manuscript and confirm the browser console no longer shows a `404` for `/manuscript`. The targeted command boundary is the backend route test, since the console symptom is a direct consequence of the route's status code.

## Outcome

The manuscript read route now returns the read-layer `ManuscriptReadResult` directly for an existing manual story, including the absent-manuscript payload `200 { manuscript_present: false, body: "", byte_count: 0, word_count: 0, ... }`. The web client type now includes `manuscript_present` and converts absent-manuscript success bodies to `null` for the existing dashboard/manuscript-page empty-state UI. The genuine missing-story `404 { error: "manual_story_not_found" }` branch remains in place.

## Verification Result

1. Pre-edit baseline: `npm --prefix tools/manual-story-studio test` — passed 89 backend tests plus `web test`.
2. Targeted backend proof: `npm --prefix tools/manual-story-studio run test:backend` — passed 89 backend tests after rebuilding `dist/`, including `dist/test/server/manuscript-routes.test.js`.
3. Web type proof: `npm --prefix tools/manual-story-studio/web test` — passed `tsc -p tsconfig.json --noEmit`.
4. Final package proof: `npm --prefix tools/manual-story-studio test` — passed 89 backend tests plus `web test`.
5. Stale/current surface review: `rg -n "manuscript_not_compiled_yet|GET /manuscript returns 404|404 when manuscript|manuscript_present|readManuscript|/manuscript" tools/manual-story-studio/README.md tools/manual-story-studio/src tools/manual-story-studio/test tools/manual-story-studio/web/src docs specs archive/tickets/MSSUX-007-manuscript-absent-no-console-error.md` — remaining `manuscript_not_compiled_yet` hits are only historical intake/plan text inside this ticket; active package source/tests no longer use that error.

## Deviations

- The optional browser-console smoke was not run. The accepted proof boundary is the backend route status-code test plus the web typecheck, because Chrome's console symptom is a direct consequence of the route no longer returning 404 for the absent-manuscript state.
- The active ticket file was untracked at intake; archival used a plain move, so the archived ticket remains an untracked archive file until added by the user.
- Pre-existing ignored package artifacts (`tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, `tools/manual-story-studio/web/node_modules/`) were present before this run. `dist/` was refreshed by the backend/package test commands; ignored artifacts are verification artifacts, not tracked ticket edits.
