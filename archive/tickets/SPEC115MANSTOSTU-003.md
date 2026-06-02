# SPEC115MANSTOSTU-003: Source Browser two-pane UI + copy-into-record

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — new frontend page `web/src/pages/SourceBrowser.tsx` + read-only API client `web/src/api/world-source.ts`; per-story routing + nav entry (`App.tsx`, `StoryPageNav.tsx`) + two-pane styling (`index.css`). No new write surface.
**Deps**: archive/tickets/SPEC115MANSTOSTU-002.md

## Problem

Authors have no in-tool way to browse world source and ground a story record in it. Build the two-pane Source Browser: left = world source browser (tree/list by kind + deterministic search + read-only record view); right = the story-local record workbench (the existing record forms). Affordances: open a world record read-only; select literal text -> copy into a story-record form field; copy a simple field (title/name). The author creates the story record via the existing `RecordForm` (SPEC-112 pickers apply); the browser pre-fills the copied text; the author edits and saves through the existing sandbox-contained write path.

## Assumption Reassessment (2026-06-02)

1. SPEC-112 components exist at `web/src/components/`: `RecordForm.tsx`, `RecordPicker.tsx`, `RecordCard.tsx` (+ `recordSchemas.ts`) — the right-pane workbench reuses these unchanged. SPEC-111 `web/src/components/StoryPageNav.tsx` carries the per-story `PAGES` array; the existing record write path (SPEC-100 / SPEC-112) is reused for save — this ticket adds no write surface.
2. Spec §2 items 2+3, §4 (`archive/specs/SPEC-115-manual-story-studio-world-source-browser.md`): two-pane browser; deterministic search (literal text / title / tags / class / filename); copy-into-record gestures; a per-story Source Browser page mounted via `StoryPageNav` (the spec's stated-cleaner option over overloading the top-level Worlds list, so `Worlds.tsx` is NOT modified).
3. Shared boundary under audit: (a) `archive/tickets/SPEC115MANSTOSTU-002.md`'s world-source GET route response shape (summaries + on-demand raw text), consumed by the new `api/world-source.ts` client; (b) the SPEC-112 `RecordForm` field-prefill contract — the copy gesture pre-fills a form field, it does not persist.
4. FOUNDATIONS Diegetic-to-World firewall + §Soft Canon / Local Truth: the browser surfaces world/artifact text as literal material the author reads and selectively copies — no automatic extraction or promotion of narrator-voice content into facts. Copied text pre-fills a `RecordForm` field; nothing persists until the author saves through the existing validated write path, so story records remain explicit author assertions. The author does the judging.

## Architecture Check

1. Reusing `RecordForm` / `RecordPicker` / `RecordCard` (SPEC-112) for the right pane and `StoryPageNav` (SPEC-111) for mounting keeps the new surface thin: a read-only left pane + a copy-prefill bridge into the existing workbench, with no duplicated form/record logic and no new write path. Client-side filtering over the loaded summary list mirrors SPEC-112's no-index decision (spec §2 item 2) — lower churn than a server-side index for a bounded per-world dataset.
2. No backwards-compatibility shim: new page + client; `App.tsx` / `StoryPageNav.tsx` / `index.css` gain additive entries.

## Verification Layers

1. SourceBrowser page + copy-into-record gesture types compile -> `cd tools/manual-story-studio/web && npm test` (web `tsc --noEmit`).
2. Deterministic search filters by literal text / title / tags / class / filename -> component-level type coverage + manual review against the loaded summary list.
3. Copy is literal + author-initiated; nothing auto-promotes to a story fact -> manual review (Diegetic-to-World firewall: the gesture pre-fills a `RecordForm` field; save uses the existing write path).
4. Read-only: the page issues only GET reads (via `archive/tickets/SPEC115MANSTOSTU-002.md`) + reuses the existing record write path; it adds no new write route -> grep-proof (no new write client surface in `api/world-source.ts`).

## What to Change

### 1. Read-only API client `web/src/api/world-source.ts`

- A GET-only client for `archive/tickets/SPEC115MANSTOSTU-002.md`'s list + on-demand-raw-text endpoints.

### 2. `web/src/pages/SourceBrowser.tsx`

- Two-pane layout: left = world source list/tree by kind + deterministic client-side filter (literal text / title / tags / class / filename) + read-only item view; right = the existing record workbench (`RecordForm` / `RecordPicker` / `RecordCard`).
- Copy gestures: select literal text -> pre-fill a chosen story-record form field; copy title/name into a field. The author creates a `fact` / `belief` / `location` / `object` / `character` via `RecordForm` and saves through the existing write path.

### 3. Routing + nav + styling

- `web/src/App.tsx`: add the per-story route `/worlds/:worldSlug/manual-stories/:msSlug/source-browser` -> `<SourceBrowser />` (+ import).
- `web/src/components/StoryPageNav.tsx`: add `{ label: "Source Browser", path: "source-browser" }` to the `PAGES` array.
- `web/src/index.css`: two-pane browser styling.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` (new)
- `tools/manual-story-studio/web/src/api/world-source.ts` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/components/StoryPageNav.tsx` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)

## Out of Scope

- The reader (`archive/tickets/SPEC115MANSTOSTU-001.md`), routes (`archive/tickets/SPEC115MANSTOSTU-002.md`).
- Any write to world canon; any new write surface (save reuses the existing sandbox-contained record write path).
- Automatic semantic extraction / transformation / provenance write — copy is literal + author-initiated.
- Modifying `Worlds.tsx` (the entry point is the per-story page via `StoryPageNav`).

## Acceptance Criteria

### Tests That Must Pass

1. The author can open a world record read-only and copy selected literal text into a story-record form field, then save the story record through the existing sandbox-contained write path. (spec AC3)
2. Search filters world material by literal text / title / tags / class / filename. (spec AC2)
3. No automatic extraction / transformation / provenance-write occurs — copy is literal and author-initiated. (spec AC5)
4. `cd tools/manual-story-studio/web && npm test` (web `tsc --noEmit`) and `cd tools/manual-story-studio && npm run build` succeed. (spec AC7)

### Invariants

1. The browser adds no write surface; all writes go through the pre-existing record write path.
2. Copied text only pre-fills a form field; nothing persists until the author saves.

## Test Plan

### New/Modified Tests

1. `None — frontend page verified by web tsc --noEmit type-check + manual review; no new backend test, because no new write path is introduced and the existing record write path retains its coverage.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm run build`
3. Full pipeline: `cd tools/manual-story-studio && npm test` (backend `node --test` + web type-check).

## Outcome

Completed on 2026-06-02.

Added the read-only web client `tools/manual-story-studio/web/src/api/world-source.ts` for `archive/tickets/SPEC115MANSTOSTU-002.md`'s GET endpoints. The client lists source summaries and fetches raw item text by contained item path; it defines no write method and sends no request body.

Added `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx`, mounted it at `/worlds/:worldSlug/manual-stories/:msSlug/source-browser`, and added the per-story `StoryPageNav` entry. The page has a world-source list, deterministic client-side search over path/kind/title/name/tags/class/raw text, read-only raw item view, copy-selection/copy-title controls, and a `RecordForm` workbench for creating story-local `facts`, `beliefs`, `locations`, `objects`, or `cast` records through the existing records API. Copying only seeds the form; persistence still requires the author to submit the existing validated record form.

Added responsive two-pane/three-pane styling under `tools/manual-story-studio/web/src/index.css`. No changes were made to `Worlds.tsx`.

## Verification Result

1. PASS: `cd tools/manual-story-studio/web && npm test` — web `tsc --noEmit` passed.
2. PASS: `cd tools/manual-story-studio && npm run build` — web install/build, Vite production build, and backend compile all succeeded.
3. PASS: `cd tools/manual-story-studio && npm test` — full package lane passed 482 backend/static tests plus web `tsc --noEmit`.
4. PASS: `rg -n "method:|fetch\\(|POST|PUT|PATCH|DELETE" tools/manual-story-studio/web/src/api/world-source.ts tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` — `api/world-source.ts` contains only GET-style fetch calls; no new world-source write client surface exists. The page reuses the existing `createRecord` path for story-local record creation.
5. PASS: `rg -n "SourceBrowser|source-browser|Source Browser|world-source" ...` — confirmed page import/route, nav entry, page/client files, and styling are present.

## Deviations

1. The page fetches raw text for listed items after loading summaries so deterministic client-side search can include literal source text. This keeps the server list endpoint summary-only while satisfying the frontend search invariant.
2. The workbench is create-focused for the five spec-named story record classes (`facts`, `beliefs`, `locations`, `objects`, `cast`); editing existing records remains on the existing Records/Cast pages.
