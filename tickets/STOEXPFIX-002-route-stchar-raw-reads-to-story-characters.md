# STOEXPFIX-002: Route STCHAR raw reads to `story-characters/*.md` and harden `rawSources` against missing records

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/record-io.ts` (raw-read path resolution); `tools/story-explorer/src/read/page-detail.ts` (`rawSources` ENOENT tolerance)
**Deps**: `archive/tickets/STOEXPFIX-001-skip-synthetic-logical-files-in-drift-detection.md` (independent completed fix but the two combine to make the bug invisible — STOEXPFIX-001 closes the precipitating stale-index condition; this ticket fixes the latent raw-read mapping bug that the stale-index condition exposes)

## Problem

`GET /api/worlds/:slug/stories/:storySlug/pages/:pageId` returns HTTP 500 for pages whose `state_snapshot.active_records.STCHAR[]` is non-empty whenever the index is in `stale` (or `missing` / `empty` / `version_mismatch` / `open_failed`) state. Observed against `erotica-world / red-bunny / PG-5` (STCHAR-1, STCHAR-2, STCHAR-3 in the active snapshot); the API response is `Story Explorer API request failed with status 500.` and the UI renders `Story Explorer could not load this route.`

The failure chain:

1. `getPageDetail` (`tools/story-explorer/src/read/page-detail.ts:394-426`) calls `rawSources()` (`:373-392`) which iterates `[pageId(page), ...activeRecordIds(page)]` and calls `readRecord` for each inside a `Promise.all`. `rawSources` does not catch ENOENT — any single rejection bubbles up.
2. `readRecord` (`tools/story-explorer/src/read/record-io.ts:249-266`) first calls `readIndexedRecord`, which gates on `resolveIndexStatus(...).kind === "fresh"` (`:212`) and returns `null` for any non-`fresh` state. With STOEXPFIX-001 unfixed, the false drift signal forces this fallback every call.
3. Fallback `readRawRecord` (`:190-204`) calls `directRecordPath` (`:164-188`). STCHAR is absent from `DIRECT_MARKDOWN_DIRS` (`:54-58`, which lists only SAU/SLB/SP), so the function falls through to `recordSourcePath` (`:76-83`) which constructs `<storyDir>/_source/characters/STCHAR-N.yaml`.
4. That path does not exist. STCHAR records are hybrid markdown stored at `<storyDir>/story-characters/STCHAR-N.md`, per FOUNDATIONS §Story Bundles §6 (`docs/FOUNDATIONS.md:672`) — "STCHAR (story-local character authority profile; hybrid markdown artifact under `story-characters/`)". This is also where `world-index` actually indexes them (`tools/world-index/src/parse/atomic.ts:162-175`).
5. `readFile` throws ENOENT → `Promise.all` rejects → `getPageDetail` rejects → the route handler (`tools/story-explorer/src/server/routes/pages.ts:42-46`) only converts errors whose `message.includes("not found")` to HTTP 404 → STCHAR ENOENT does not match → re-thrown → Fastify default error handler → HTTP 500.

Two distinct bugs collide:
- **(A)** STCHAR's raw-read path resolution maps to `_source/characters/*.yaml` instead of `story-characters/*.md`. This is the structural bug; FOUNDATIONS §Story Bundles §6 says STCHARs are hybrid markdown under `story-characters/`, and `world-index` indexes them from there.
- **(B)** `rawSources()` is not ENOENT-tolerant. A missing record file — for any reason, for any record class — currently produces a 500 instead of a graceful degraded response. The PG-5 case happens to be triggered by (A), but (B) is the general fragility that lets a single missing file take down a whole page.

Fixing only (A) removes today's observable trigger; fixing (B) too prevents the next analogous regression from manifesting the same way.

## Assumption Reassessment (2026-05-26)

1. `record-io.ts:54-58` declares `DIRECT_MARKDOWN_DIRS = { SAU: "audits", SLB: "storylet-batches", SP: "story-promotions" }`. STCHAR is not present. `record-io.ts:28-52` declares `RECORD_SOURCE_DIRS` with `STCHAR: "characters"`, mapping STCHAR to the (non-existent for story bundles) `_source/characters/` subdirectory. Confirmed.
2. `directRecordPath` (`record-io.ts:164-188`) handles class-specific routing in this order: (a) RSP via `findRspPath` over audit directories, (b) classes in `DIRECT_MARKDOWN_DIRS` via `findRecordByPrefix`, (c) fallback to `recordSourcePath` (`_source/<dir>/<id>.yaml`). `findRecordByPrefix` (`:115-136`) already accepts both `.md` and `.yaml` extensions, so adding `STCHAR: "story-characters"` to `DIRECT_MARKDOWN_DIRS` is sufficient — no new code path needed.
3. `RECORD_SOURCE_DIRS` is also consumed by `listRecordIds(prefix, ...)` (`:268-288`) and indirectly by `recordExists` (`:325-327`). `listRecordIds("STCHAR", ...)` would attempt to scan `<storyDir>/_source/characters/` which does not exist; the try/catch ENOENT-guards the failure (returns `[]`), so the misleading mapping is silently inert today. Removing `STCHAR: "characters"` from `RECORD_SOURCE_DIRS` causes any future caller of `listRecordIds("STCHAR", ...)` or `recordSourcePath(STCHAR-N, ...)` to fail loudly via the `Unsupported story-bundle record class` error in `recordSourceDir` (`:68-74`), which is the desired louder-fail behavior — STCHAR enumeration should go through filesystem reads of `story-characters/` directly, not through the `_source/<dir>/*.yaml` enumeration pattern.
4. Shared boundary under audit: the raw-read fallback contract between `index-status` (gate on freshness), `record-io.directRecordPath` (path resolution), and `page-detail.rawSources` (consumer). The contract today silently presumes `_source/<class>/*.yaml` for every story-bundle class — including STCHAR which violates that presumption per FOUNDATIONS §Story Bundles §6. This ticket re-aligns the raw-read fallback path with FOUNDATIONS.
5. FOUNDATIONS principle under audit: §Story Bundles §6 (FOUNDATIONS.md:672) names STCHAR as a hybrid markdown artifact under `story-characters/`; §Story Bundles §3 Read Discipline (FOUNDATIONS.md:604-608) requires read paths to reflect the actual storage form. The fix aligns the raw-read fallback with both.
6. Adjacent contradictions exposed:
   - **`rawSources` is not ENOENT-tolerant** — this is a separate brittleness from the STCHAR mapping; folded into this ticket's scope because it touches the same raw-read consumer (`page-detail.ts`) and is the direct cause of the 500 status (a structured fallback response would not be a 500). Classified as a required consequence of fixing the user-visible behavior, not a separable cleanup ticket.
   - **`choiceNavigation` is also not ENOENT-tolerant** — but the user's reported PG-5 case has all four emitted CHCs present on disk, so `choiceNavigation` is not the proximate cause of the 500. Classified as future cleanup that should become its own ticket if it ever surfaces a failure; not in scope here to avoid scope inflation.
   - **The route handler's 404-mapping is string-match-based** (`tools/story-explorer/src/server/routes/pages.ts:42-46`: `message.includes("not found")`). Folded into out-of-scope future cleanup; the structural fix here removes the trigger so the 404-mapping fragility is no longer observable through the STCHAR path.

## Architecture Check

1. The fix puts STCHAR's path resolution exactly where FOUNDATIONS §Story Bundles §6 says STCHARs live and where `world-index` already reads them, eliminating a silent divergence between the indexer and the raw-read fallback. Alternative approaches (special-case STCHAR in `directRecordPath` with bespoke code; teach `rawSources` to skip STCHAR entirely) all preserve the divergence — they hide the bug rather than fix it. Putting STCHAR through `DIRECT_MARKDOWN_DIRS` reuses the existing hybrid-markdown branch and produces no new code path.
2. ENOENT tolerance in `rawSources` is added as a structured-fallback: a record whose source file is missing is omitted from the `RawSourceReference[]` and emits a `skippedRecords` field on the response (parallel to how `activeRecordDiagnostics` at `page-detail.ts:280-323` already tracks `skippedRecords` for malformed/missing active records). The frontend already renders skipped records via the validation-integrity panel.
3. No backwards-compatibility shims, aliases, or stale-path fallbacks introduced. The misleading `STCHAR: "characters"` entry in `RECORD_SOURCE_DIRS` is removed outright.

## Verification Layers

1. `directRecordPath("STCHAR-1", ...)` resolves to `<storyDir>/story-characters/STCHAR-1.md` -> codebase grep-proof + targeted unit test (`tools/story-explorer/test/record-io.test.ts`)
2. `RECORD_SOURCE_DIRS` no longer contains `STCHAR` -> codebase grep-proof
3. `rawSources()` omits records whose source file is missing and surfaces them in a structured `skippedRecords` field on the response, instead of throwing -> targeted unit test (seed a page snapshot referencing a deleted active record, assert the response payload omits the missing record and lists it under `skippedRecords`)
4. `GET /api/worlds/erotica-world/stories/red-bunny/pages/PG-5` returns 200 with a populated payload when the index is `stale` (the pre-STOEXPFIX-001 condition) AND when the index is `fresh` (the post-STOEXPFIX-001 condition) -> skill dry-run (manual `curl` against both states)
5. FOUNDATIONS §Story Bundles §6 alignment (STCHAR hybrid-markdown storage form) -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md:672`)
6. FOUNDATIONS §Story Bundles §3 Read Discipline alignment (raw-read fallback reflects actual storage form) -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md:604-608`)

## What to Change

### 1. STCHAR path resolution in `record-io.ts`

`tools/story-explorer/src/read/record-io.ts`:

- Remove `STCHAR: "characters"` from `RECORD_SOURCE_DIRS` (currently `:40`).
- Add `STCHAR: "story-characters"` to `DIRECT_MARKDOWN_DIRS` (currently `:54-58`).

`findRecordByPrefix` (`:115-136`) already matches `STCHAR-N.md` (extension-suffixed) so no further code change is needed in `directRecordPath`.

### 2. ENOENT tolerance in `page-detail.ts` `rawSources`

`tools/story-explorer/src/read/page-detail.ts`:

- Refactor `rawSources` (`:373-392`) to wrap each per-record `readRecord` call in a try/catch that swallows ENOENT and returns `null`, then filters `null` entries out of the final array.
- Extend the `RawSourceReference[]` return contract (or add a sibling `skippedRawSources: string[]` field on `PageDetail`) to surface skipped record IDs. Default to extending `validationIntegrity.skippedRecords[]` (already declared in the view model) by passing the skipped raw-source IDs through to the existing skipped-records aggregator if the surface is shared, or by introducing `validationIntegrity.skippedRawSources` if the existing `skippedRecords` field is reserved for `activeRecordDiagnostics` consumers. Prefer the latter to avoid contract drift on the existing field.

### 3. Test coverage

`tools/story-explorer/test/record-io.test.ts`:

- New case: `directRecordPath` for a STCHAR resolves to a `story-characters/STCHAR-N.md` path; `readRecord` reads the file body successfully against a fixture story bundle.
- New case: `recordSourceDir("STCHAR-1")` throws (now that STCHAR is removed from `RECORD_SOURCE_DIRS`), confirming the loud-fail desired in §Assumption Reassessment item 3.

`tools/story-explorer/test/page-detail.test.ts` (or the existing page-detail integration test file):

- New case: a page snapshot referencing a deleted active record (e.g., delete `STEMO-3.yaml` after capturing the page) produces a 200 response with the missing record omitted from `rawSources[]` and recorded in `validationIntegrity.skippedRawSources` (or whichever surface item 2 above ends up wiring).
- New case: a page whose active snapshot references STCHAR-N where the file exists at `story-characters/STCHAR-N.md` produces a 200 response with the STCHAR record body present in `rawSources[]`. Run against both fresh and stale index states.

## Files to Touch

- `tools/story-explorer/src/read/record-io.ts` (modify)
- `tools/story-explorer/src/read/page-detail.ts` (modify)
- `tools/story-explorer/src/view-models/page-detail.ts` (modify, only if a new `skippedRawSources` field is added)
- `tools/story-explorer/test/record-io.test.ts` (modify)
- `tools/story-explorer/test/page-detail.test.ts` (modify; or the equivalent integration test file under `tools/story-explorer/test/`)
- `tools/story-explorer/web/src/components/...` — frontend rendering of `skippedRawSources`, only if a new field is surfaced (optional UI affordance; default is silent omission and the existing validation-integrity panel rendering)

## Out of Scope

- ENOENT tolerance for `choiceNavigation`. The PG-5 reproducer does not depend on it, and broadening this ticket would lose its bug-fix focus; if a missing CHC surfaces a 500 in the field it warrants its own ticket and analysis (CHC absence is a more semantically significant condition than STCHAR absence).
- The route handler's `message.includes("not found")` 404-mapping at `tools/story-explorer/src/server/routes/pages.ts:42-46`. The structural fix here eliminates the user-visible STCHAR symptom; the route handler's brittle string match remains a separate concern.
- Any change to `world-index` parsing or indexing of STCHARs. The world-index side already correctly handles STCHARs at `story-characters/STCHAR-N.md` (`tools/world-index/src/parse/atomic.ts:162-175`); only the story-explorer raw-read fallback diverged.
- The synthetic-logical-files drift detection bug — STOEXPFIX-001.

## Acceptance Criteria

### Tests That Must Pass

1. `tools/story-explorer/test/record-io.test.ts` — `directRecordPath` for a STCHAR resolves to `<storyDir>/story-characters/STCHAR-N.md`; `readRecord` reads the body.
2. `tools/story-explorer/test/record-io.test.ts` — `recordSourceDir("STCHAR-1")` throws `Unsupported story-bundle record class for STCHAR-1` (loud-fail on the now-removed misleading mapping).
3. `tools/story-explorer/test/page-detail.test.ts` — `getPageDetail` for a page with STCHARs in its active snapshot returns 200 with the STCHAR records populated in `rawSources[]`, both when the index is `fresh` and when it is `stale`.
4. `tools/story-explorer/test/page-detail.test.ts` — a page with a deleted active record file returns 200 with the missing record omitted from `rawSources[]` and surfaced in the chosen skipped-records field.
5. `npm test --prefix tools/story-explorer` passes.

### Invariants

1. The raw-read fallback path for every story-bundle record class MUST resolve to the same on-disk location that `world-index` indexes from. In particular, STCHAR MUST resolve to `story-characters/STCHAR-N.md`, never to `_source/characters/STCHAR-N.yaml`.
2. `rawSources()` MUST NOT throw when a single referenced record file is missing. A missing record MUST degrade to omission + a surfaced skip entry; the page response MUST NOT 500 on a single missing record.
3. `RECORD_SOURCE_DIRS` MUST contain entries only for classes whose authoritative storage is `_source/<dir>/*.yaml`. STCHAR (hybrid markdown under `story-characters/`) MUST NOT be present in that table.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/record-io.test.ts` — extend with STCHAR path-resolution and the loud-fail on `recordSourceDir("STCHAR-...")`.
2. `tools/story-explorer/test/page-detail.test.ts` (or the equivalent existing integration test) — extend with the two cases described in §What to Change item 3.

### Commands

1. `npm test --prefix tools/story-explorer -- record-io` (targeted)
2. `npm test --prefix tools/story-explorer -- page-detail` (targeted)
3. `npm test --prefix tools/story-explorer` (full package)
4. Manual smoke against the user's reported repro: `curl http://127.0.0.1:5174/api/worlds/erotica-world/stories/red-bunny/pages/PG-5` returns 200 with `rawSources[]` containing STCHAR-1, STCHAR-2, STCHAR-3 entries pointing to `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md`.
