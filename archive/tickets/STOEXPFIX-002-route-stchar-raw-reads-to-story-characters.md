# STOEXPFIX-002: Route STCHAR raw reads to `story-characters/*.md` and harden `rawSources` against missing records

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/read/record-io.ts` (raw-read path resolution); `tools/story-explorer/src/read/page-detail.ts` (`rawSources` ENOENT tolerance)
**Deps**: `archive/tickets/STOEXPFIX-001-skip-synthetic-logical-files-in-drift-detection.md` (independent completed fix but the two combine to make the bug invisible — STOEXPFIX-001 closes the precipitating stale-index condition; this ticket fixes the latent raw-read mapping bug that the stale-index condition exposes)

## Problem

At intake, `GET /api/worlds/:slug/stories/:storySlug/pages/:pageId` returned HTTP 500 for pages whose `state_snapshot.active_records.STCHAR[]` was non-empty whenever the index was in `stale` (or `missing` / `empty` / `version_mismatch` / `open_failed`) state. Observed against `erotica-world / red-bunny / PG-5` (STCHAR-1, STCHAR-2, STCHAR-3 in the active snapshot); the API response was `Story Explorer API request failed with status 500.` and the UI rendered `Story Explorer could not load this route.`

The historical failure chain:

1. `getPageDetail` (`tools/story-explorer/src/read/page-detail.ts:394-426`) called `rawSources()` (`:373-392`) which iterated `[pageId(page), ...activeRecordIds(page)]` and called `readRecord` for each inside a `Promise.all`. Before this ticket, `rawSources` did not catch ENOENT — any single rejection bubbled up.
2. `readRecord` (`tools/story-explorer/src/read/record-io.ts:249-266`) first called `readIndexedRecord`, which gated on `resolveIndexStatus(...).kind === "fresh"` (`:212`) and returned `null` for any non-`fresh` state. With STOEXPFIX-001 unfixed, the false drift signal forced this fallback every call.
3. Fallback `readRawRecord` (`:190-204`) called `directRecordPath` (`:164-188`). Before this ticket, STCHAR was absent from `DIRECT_MARKDOWN_DIRS` (`:54-58`, which listed only SAU/SLB/SP), so the function fell through to `recordSourcePath` (`:76-83`) which constructed `<storyDir>/_source/characters/STCHAR-N.yaml`.
4. That path does not exist. STCHAR records are hybrid markdown stored at `<storyDir>/story-characters/STCHAR-N.md`, per FOUNDATIONS §Story Bundles §6 (`docs/FOUNDATIONS.md:672`) — "STCHAR (story-local character authority profile; hybrid markdown artifact under `story-characters/`)". This is also where `world-index` actually indexes them (`tools/world-index/src/parse/atomic.ts:162-175`).
5. `readFile` threw ENOENT → `Promise.all` rejected → `getPageDetail` rejected → the route handler (`tools/story-explorer/src/server/routes/pages.ts:42-46`) only converted errors whose `message.includes("not found")` to HTTP 404 → STCHAR ENOENT did not match → re-thrown → Fastify default error handler → HTTP 500.

Two distinct bugs collided:
- **(A)** STCHAR's raw-read path resolution mapped to `_source/characters/*.yaml` instead of `story-characters/*.md`. This was the structural bug; FOUNDATIONS §Story Bundles §6 says STCHARs are hybrid markdown under `story-characters/`, and `world-index` indexes them from there.
- **(B)** `rawSources()` was not ENOENT-tolerant. A missing record file — for any reason, for any record class — produced a 500 instead of a graceful degraded response. The PG-5 case happened to be triggered by (A), but (B) was the general fragility that let a single missing file take down a whole page.

This ticket fixed both: STCHAR raw reads now route to `story-characters/*.md`, and missing raw-source records are omitted while the existing `validationIntegrity.skippedRecords[]` surface reports skipped active records.

## Assumption Reassessment (2026-05-26)

1. At intake, `record-io.ts:54-58` declared `DIRECT_MARKDOWN_DIRS = { SAU: "audits", SLB: "storylet-batches", SP: "story-promotions" }`; STCHAR was not present. `record-io.ts:28-52` declared `RECORD_SOURCE_DIRS` with `STCHAR: "characters"`, mapping STCHAR to the (non-existent for story bundles) `_source/characters/` subdirectory. The completed implementation removes that source-dir entry and adds `STCHAR: "story-characters"` to `DIRECT_MARKDOWN_DIRS`.
2. `directRecordPath` (`record-io.ts:164-188`) handles class-specific routing in this order: (a) RSP via `findRspPath` over audit directories, (b) classes in `DIRECT_MARKDOWN_DIRS` via `findRecordByPrefix`, (c) fallback to `recordSourcePath` (`_source/<dir>/<id>.yaml`). `findRecordByPrefix` (`:115-136`) already accepts both `.md` and `.yaml` extensions, so adding `STCHAR: "story-characters"` to `DIRECT_MARKDOWN_DIRS` was sufficient — no new code path needed.
3. `RECORD_SOURCE_DIRS` is also consumed by `listRecordIds(prefix, ...)` (`:268-288`) and indirectly by `recordExists` (`:325-327`). At intake, `listRecordIds("STCHAR", ...)` would attempt to scan `<storyDir>/_source/characters/` which does not exist; the try/catch ENOENT-guarded the failure (returned `[]`), so the misleading mapping was silently inert. Removing `STCHAR: "characters"` from `RECORD_SOURCE_DIRS` causes any future caller of `listRecordIds("STCHAR", ...)` or `recordSourcePath(STCHAR-N, ...)` to fail loudly via the `Unsupported story-bundle record class` error in `recordSourceDir` (`:68-74`), which is the desired louder-fail behavior — STCHAR enumeration should go through filesystem reads of `story-characters/` directly, not through the `_source/<dir>/*.yaml` enumeration pattern.
4. Shared boundary under audit: the raw-read fallback contract between `index-status` (gate on freshness), `record-io.directRecordPath` (path resolution), and `page-detail.rawSources` (consumer). At intake, the contract silently presumed `_source/<class>/*.yaml` for every story-bundle class — including STCHAR which violated that presumption per FOUNDATIONS §Story Bundles §6. The completed implementation re-aligns the raw-read fallback path with FOUNDATIONS.
5. FOUNDATIONS principle under audit: §Story Bundles §6 (FOUNDATIONS.md:672) names STCHAR as a hybrid markdown artifact under `story-characters/`; §Story Bundles §3 Read Discipline (FOUNDATIONS.md:604-608) requires read paths to reflect the actual storage form. The fix aligns the raw-read fallback with both.
6. Adjacent contradictions exposed:
   - **`rawSources` is not ENOENT-tolerant** — this is a separate brittleness from the STCHAR mapping; folded into this ticket's scope because it touches the same raw-read consumer (`page-detail.ts`) and is the direct cause of the 500 status (a structured fallback response would not be a 500). Classified as a required consequence of fixing the user-visible behavior, not a separable cleanup ticket.
   - **`choiceNavigation` is also not ENOENT-tolerant** — but the user's reported PG-5 case has all four emitted CHCs present on disk, so `choiceNavigation` is not the proximate cause of the 500. Classified as future cleanup that should become its own ticket if it ever surfaces a failure; not in scope here to avoid scope inflation.
   - **The route handler's 404-mapping is string-match-based** (`tools/story-explorer/src/server/routes/pages.ts:42-46`: `message.includes("not found")`). Folded into out-of-scope future cleanup; the structural fix here removes the trigger so the 404-mapping fragility is no longer observable through the STCHAR path.
7. Live package reassessment: `tools/story-explorer/test/record-io.test.ts` does not exist yet, so this ticket creates it rather than modifying an existing test file. `tools/story-explorer/package.json` runs compiled backend tests from `dist/test/**/*.test.js`; the package script does not provide reliable source-file passthrough selectors for `record-io` / `page-detail`. Targeted proof is therefore `cd tools/story-explorer && npm run build:backend` followed by direct compiled test files: `node --test dist/test/record-io.test.js` and `node --test dist/test/page-detail.test.js`.
8. Baseline before source edits: `cd tools/story-explorer && npm run build:backend` passed, and `cd tools/story-explorer && node --test dist/test/page-detail.test.js` passed with 2 tests. Ignored package artifacts (`tools/story-explorer/dist/`, `tools/story-explorer/node_modules/`, `tools/story-explorer/web/dist/`, `tools/story-explorer/web/node_modules/`) already existed before this run.
9. Same-package public surfaces inspected: `tools/story-explorer/README.md`, web API client types, and validation-integrity UI consumers. No README/docs change was required because this fix changes internal read fallback behavior without changing documented CLI usage or public route invocation.

## Architecture Check

1. The fix puts STCHAR's path resolution exactly where FOUNDATIONS §Story Bundles §6 says STCHARs live and where `world-index` already reads them, eliminating a silent divergence between the indexer and the raw-read fallback. Alternative approaches (special-case STCHAR in `directRecordPath` with bespoke code; teach `rawSources` to skip STCHAR entirely) all preserve the divergence — they hide the bug rather than fix it. Putting STCHAR through `DIRECT_MARKDOWN_DIRS` reuses the existing hybrid-markdown branch and produces no new code path.
2. ENOENT tolerance in `rawSources` was added as a structured fallback: a record whose source file is missing is omitted from `RawSourceReference[]`. Missing active records continue to surface through the existing `validationIntegrity.skippedRecords[]` field produced by `activeRecordDiagnostics`, which the frontend already renders in the validation-integrity panel.
3. No backwards-compatibility shims, aliases, or stale-path fallbacks introduced. The misleading `STCHAR: "characters"` entry in `RECORD_SOURCE_DIRS` is removed outright.

## Verification Layers

1. `readRecord("STCHAR-1", ...)` resolves through `directRecordPath` to `<storyDir>/story-characters/STCHAR-1.md` -> codebase grep-proof + targeted unit test (`tools/story-explorer/test/record-io.test.ts`)
2. `RECORD_SOURCE_DIRS` no longer contains `STCHAR` -> codebase grep-proof
3. `rawSources()` omits records whose source file is missing and surfaces them in a structured `skippedRecords` field on the response, instead of throwing -> targeted unit test (seed a page snapshot referencing a deleted active record, assert the response payload omits the missing record and lists it under `skippedRecords`)
4. STCHAR raw sources are populated for `getPageDetail` when the index is `fresh` and when raw fallback is forced by a `stale` index -> targeted unit tests (`tools/story-explorer/test/page-detail.test.ts`)
5. FOUNDATIONS §Story Bundles §6 alignment (STCHAR hybrid-markdown storage form) -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md:672`)
6. FOUNDATIONS §Story Bundles §3 Read Discipline alignment (raw-read fallback reflects actual storage form) -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md:604-608`)

## Landed Changes

### 1. STCHAR path resolution in `record-io.ts`

`tools/story-explorer/src/read/record-io.ts`:

- Removed `STCHAR: "characters"` from `RECORD_SOURCE_DIRS`.
- Added `STCHAR: "story-characters"` to `DIRECT_MARKDOWN_DIRS`.

`findRecordByPrefix` (`:115-136`) already matches `STCHAR-N.md` (extension-suffixed) so no further code change is needed in `directRecordPath`.

### 2. ENOENT tolerance in `page-detail.ts` `rawSources`

`tools/story-explorer/src/read/page-detail.ts`:

- Wrapped each per-record `readRecord` call in `rawSources` with ENOENT handling.
- Missing raw-source records now return `null`, are filtered out of `rawSources[]`, and do not reject the whole page-detail request.
- No new response field was added. Missing active records are already surfaced by `validationIntegrity.skippedRecords[]`.

### 3. Test coverage

`tools/story-explorer/test/record-io.test.ts`:

- Added `readRecord` coverage proving STCHAR raw reads resolve to `story-characters/STCHAR-N.md` and parse the markdown frontmatter.
- Added `recordSourceDir("STCHAR-1")` loud-fail coverage, confirming STCHAR no longer has an `_source/<dir>/*.yaml` mapping.

`tools/story-explorer/test/page-detail.test.ts`:

- Added fresh-index and stale-index `getPageDetail` coverage proving STCHAR active records appear in `rawSources[]` from `story-characters/STCHAR-N.md`.
- Added missing-active-record coverage proving `getPageDetail` omits the missing record from `rawSources[]` and reports it through `validationIntegrity.skippedRecords[]`.

## Files to Touch

- `tools/story-explorer/src/read/record-io.ts` (modify)
- `tools/story-explorer/src/read/page-detail.ts` (modify)
- `tools/story-explorer/test/record-io.test.ts` (new)
- `tools/story-explorer/test/page-detail.test.ts` (modify)

## Out of Scope

- ENOENT tolerance for `choiceNavigation`. The PG-5 reproducer does not depend on it, and broadening this ticket would lose its bug-fix focus; if a missing CHC surfaces a 500 in the field it warrants its own ticket and analysis (CHC absence is a more semantically significant condition than STCHAR absence).
- The route handler's `message.includes("not found")` 404-mapping at `tools/story-explorer/src/server/routes/pages.ts:42-46`. The structural fix here eliminates the user-visible STCHAR symptom; the route handler's brittle string match remains a separate concern.
- Any change to `world-index` parsing or indexing of STCHARs. The world-index side already correctly handles STCHARs at `story-characters/STCHAR-N.md` (`tools/world-index/src/parse/atomic.ts:162-175`); only the story-explorer raw-read fallback diverged.
- The synthetic-logical-files drift detection bug — STOEXPFIX-001.

## Acceptance Criteria

### Tests That Must Pass

1. `tools/story-explorer/test/record-io.test.ts` — `readRecord` for a STCHAR resolves to `<storyDir>/story-characters/STCHAR-N.md` and reads the body.
2. `tools/story-explorer/test/record-io.test.ts` — `recordSourceDir("STCHAR-1")` throws `Unsupported story-bundle record class for STCHAR-1` (loud-fail on the now-removed misleading mapping).
3. `tools/story-explorer/test/page-detail.test.ts` — `getPageDetail` for a page with STCHARs in its active snapshot returns a populated payload with STCHAR records in `rawSources[]`, both when the index is `fresh` and when it is `stale`.
4. `tools/story-explorer/test/page-detail.test.ts` — a page with a deleted active record file returns a populated payload with the missing record omitted from `rawSources[]` and surfaced in `validationIntegrity.skippedRecords[]`.
5. `cd tools/story-explorer && npm test` passes.

### Invariants

1. The raw-read fallback path for every story-bundle record class MUST resolve to the same on-disk location that `world-index` indexes from. In particular, STCHAR MUST resolve to `story-characters/STCHAR-N.md`, never to `_source/characters/STCHAR-N.yaml`.
2. `rawSources()` MUST NOT throw when a single referenced record file is missing. A missing record MUST degrade to omission + a surfaced skip entry; the page response MUST NOT 500 on a single missing record.
3. `RECORD_SOURCE_DIRS` MUST contain entries only for classes whose authoritative storage is `_source/<dir>/*.yaml`. STCHAR (hybrid markdown under `story-characters/`) MUST NOT be present in that table.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/record-io.test.ts` — added STCHAR path-resolution and loud-fail coverage for `recordSourceDir("STCHAR-...")`.
2. `tools/story-explorer/test/page-detail.test.ts` — added the three cases described in §Landed Changes item 3.

### Commands

1. `cd tools/story-explorer && npm run build:backend`
2. `cd tools/story-explorer && node --test dist/test/record-io.test.js` (targeted)
3. `cd tools/story-explorer && node --test dist/test/page-detail.test.js` (targeted)
4. `cd tools/story-explorer && npm test` (full package)

## Outcome

STCHAR raw fallback now resolves through the existing direct-markdown branch to `story-characters/STCHAR-N.md`, matching FOUNDATIONS §Story Bundles §6 and the `world-index` storage/indexing surface. `RECORD_SOURCE_DIRS` no longer contains STCHAR, so STCHAR cannot silently fall back to `_source/characters/STCHAR-N.yaml`.

`rawSources()` now catches ENOENT per record, omits the missing source from `rawSources[]`, and lets `getPageDetail` return a populated response instead of throwing a page-level 500. Missing active records continue to be reported by the existing `validationIntegrity.skippedRecords[]` contract.

## Verification Result

1. `cd tools/story-explorer && npm run build:backend` — passed before source edits and after implementation.
2. `cd tools/story-explorer && node --test dist/test/record-io.test.js` — passed with 2 tests.
3. `cd tools/story-explorer && node --test dist/test/page-detail.test.js` — passed with 5 tests, including fresh-index STCHAR, stale-index STCHAR, and missing-active-record degradation coverage.
4. `cd tools/story-explorer && npm test` — passed. Backend `node:test` reported 85 passing tests; web Vitest reported 76 files / 184 tests passing. The run emitted existing React Router future-flag warnings and the expected jsdom error-boundary stderr from the error-boundary a11y test; the command exited 0.
5. Manual review confirmed `RECORD_SOURCE_DIRS` has no STCHAR entry, `DIRECT_MARKDOWN_DIRS` maps STCHAR to `story-characters`, and `tools/story-explorer/README.md` / same-package web API consumers did not require docs or UI changes.

## Deviations

1. The drafted `npm test --prefix tools/story-explorer -- record-io` and `npm test --prefix tools/story-explorer -- page-detail` targeted commands were replaced with the package's truthful compiled-test lane: `cd tools/story-explorer && npm run build:backend`, then direct `node --test dist/test/<file>.test.js`.
2. No `skippedRawSources` field or web UI change was added. The landed behavior reuses `validationIntegrity.skippedRecords[]` for missing active records and silently omits missing raw-source entries from `rawSources[]`, preserving the existing response shape.
3. The checkout-local `erotica-world / red-bunny / PG-5` curl smoke was not run. The accepted proof uses temp fixtures for fresh and stale index states, so this ticket does not depend on private world content or mutate checkout-local `_index/` state.
