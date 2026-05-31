# MSSUX004STOCONEDI-002: Story contract editor page

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/web/src/pages/EditContract.tsx` (new), `tools/manual-story-studio/web/src/App.tsx` (modify, registers new route), `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify, adds cross-link)
**Deps**: MSSUX004STOCONEDI-001

## Problem

The Manual Story Studio backend exposes both `GET` and `PUT` at
`/api/worlds/:slug/manual-stories/:msSlug/metadata`
(`tools/manual-story-studio/src/server/routes/metadata.ts`), and the
frontend API client wraps both via `readMetadata` and `updateMetadata`
in `tools/manual-story-studio/web/src/api/records.ts:183, 194` — but
the studio has no UI surface that calls `updateMetadata`. Every Manual
Story bundle ships with `premise: ""`, `tone: ""`, and `pov: "close third"`
defaults forever; the author can edit `metadata.json` on disk but the
studio gives no in-app path.

Per `specs/MSSUX-004-story-contract-editing.md` §Recommendation (Option
A), add a dedicated `/contract` page that consumes `updateMetadata`
(widened by MSSUX004STOCONEDI-001), register the route in `App.tsx`,
and add an "Edit contract" / "Set premise & tone" cross-link from
the Dashboard's `<section aria-label="story-contract">`.

## Assumption Reassessment (2026-05-31)

1. Codebase: verified `tools/manual-story-studio/web/src/pages/Dashboard.tsx`
   defines `<section aria-label="story-contract">` at line 146 with a
   read-only `<dl>` rendering `metadata.story_contract` fields (lines
   149-169). `tools/manual-story-studio/web/src/App.tsx` lines 38-84
   has no `/contract` route. `tools/manual-story-studio/web/src/types/manual-story.ts`
   exports `ManualStoryPov` (line 12), `ManualStoryTense` (line 18),
   `ManualStoryContentIntensity` (line 19), `ManualStoryLanguageRegister`
   (line 21), `ManualStoryPsychicDistance` (line 29),
   `ManualStoryDialogueDensity` (line 36), `ManualStoryInteriority`
   (line 42), `ManualStoryParagraphing` (line 48), plus the
   `ManualStoryContract` (line 61) and `ManualStoryProsePreferences`
   (line 54) interfaces. POV values include the space-bearing strings
   `"close third"` and `"distant third"` (lines 14-15).
2. Doc/spec: per `specs/MSSUX-004-story-contract-editing.md` §Design
   (Option A), §EditContract page UX, §Files to touch, and §Acceptance
   criteria. Sibling tickets `tickets/MSSUX-005-...md` and
   `tickets/MSSUX-006-...md` (untracked) do not conflict — MSSUX-005
   addresses Dashboard beat-templates fanout; MSSUX-006 addresses
   Dashboard nav links; neither touches `<section aria-label="story-contract">`
   or `App.tsx`'s route table in a way that conflicts with this ticket.
3. Cross-artifact dependency: depends on MSSUX004STOCONEDI-001's
   widening of `MetadataUpdateResult` so the alert UI can surface the
   backend's 404 / bad_request / validation_failed responses
   distinctly. Without T001 the page would only be able to display
   `validation_failed errors[]` and would lose the not_found and
   bad_request distinctions at the seam — the spec's UX intent (per
   §EditContract page UX submit handler) requires the richer shape.
4. FOUNDATIONS: per `specs/MSSUX-004-story-contract-editing.md`
   §FOUNDATIONS Alignment, `tools/manual-story-studio/` is canon-fenced
   per SPEC-100 §3 (`package.json` excludes `@worldloom/patch-engine`
   and `@worldloom/world-mcp`; realpath-based write sandbox bounded to
   `worlds/<slug>/manual-stories/`). Downstream-consumer +
   write-enabled-but-canon-fenced carve-outs apply per SPEC-104
   precedent. The new page adds no canon-mediation surface — it
   consumes the already-fenced backend HTTP endpoint via the
   already-fenced API wrapper.

## Architecture Check

1. One-editor-per-concern matches the existing page split — Records,
   Cast (CastAndProfiles), Manuscript, MomentComposer, BeatTemplates,
   PromptHistory, PromptPreview, PasteProse each get a dedicated page
   per `tools/manual-story-studio/web/src/pages/`. The Dashboard
   remains genuinely read-only as its banner already advertises
   (App.tsx:22-23 `World canon: read-only / Normal story bundles:
   read-only`). First-time-setup and revision share the same surface
   — the empty-state cross-link copy ("Set premise & tone") prompts
   the author when fields are empty, without forcing a separate
   creation-time form (per spec §Recommendation).
2. No backwards-compatibility aliasing/shims introduced. The new
   `EditContract` page is greenfield; existing routes are unchanged;
   the Dashboard gains exactly one cross-link (the only cross-link
   added by this change per spec acceptance criterion 4).

## Verification Layers

1. `/contract` route loads form pre-populated with current contract
   values → manual review (load
   `/worlds/erotica-world/manual-stories/red-bunny/contract` in the
   Vite dev server; confirm each form field reflects current
   `metadata.json` values).
2. Saving a changed contract round-trips through `PUT /metadata` and
   the Dashboard re-renders the updated values → manual review (modify
   each of the 8 contract fields + 4 prose preferences; submit;
   verify Dashboard re-render after the redirect navigates back; per
   spec acceptance criterion 2).
3. Closed-enum byte-exact preservation (no slugification) → codebase
   grep-proof (`grep -n '"close third"\|"distant third"' tools/manual-story-studio/web/src/pages/EditContract.tsx`
   returns matches inside the POV `<select>`; confirms byte-exact
   strings from `types/manual-story.ts` per spec §EditContract page UX
   warning).
4. Backend rejection surfaces inline without draft loss → manual
   review (force an invalid payload via DOM mutation or a temporary
   debug input; confirm `<p role="alert">` renders
   `${status} ${error}: ${message}` plus the `ValidationError` list
   when populated; form state preserved per spec acceptance
   criterion 3).

## What to Change

### 1. New `EditContract.tsx` page

Create `tools/manual-story-studio/web/src/pages/EditContract.tsx` with:

- Imports: `readMetadata`, `updateMetadata`, type `MetadataUpdateResult`
  from `../api/records.js`; type `ManualStoryMetadata` and the
  closed-enum types (`ManualStoryPov`, `ManualStoryTense`,
  `ManualStoryContentIntensity`, `ManualStoryLanguageRegister`,
  `ManualStoryPsychicDistance`, `ManualStoryDialogueDensity`,
  `ManualStoryInteriority`, `ManualStoryParagraphing`) from
  `../types/manual-story.js`; `useNavigate`, `useParams` from
  `react-router-dom`.
- Slug guards: `if (!worldSlug || !msSlug) return <p role="alert">Missing world or manual story slug.</p>;`
- On mount: `readMetadata(worldSlug, msSlug)` with `cancelled` flag for
  StrictMode-safe effect cleanup (mirror the Dashboard.tsx:60-72
  pattern). Loading: `<p>Loading metadata…</p>`. Error or null:
  `<p role="alert">Failed to load metadata.</p>`.
- Local state seeded from fetch: `metadata: ManualStoryMetadata | null`
  plus `submitting: boolean` and `error: string | null` and
  `validationErrors: ValidationError[] | null`.
- Form: 8 contract fields + 4 prose-preference fields per spec
  §EditContract page UX:
  - `premise` — `<textarea>`
  - `tone` — `<input type="text">`
  - `pov` — `<select>` with options `"first"`, `"close third"`,
    `"distant third"`, `"omniscient"` (byte-exact)
  - `tense` — `<select>` with `"past"`, `"present"`
  - `content_intensity` — `<select>` with `"general"`, `"mature"`,
    `"explicit"`
  - `explicitness` — `<input type="text">` (free-text per
    `ManualStoryContract.explicitness: string` at types/manual-story.ts:67)
  - `language_register` — `<select>` with `"casual"`, `"literary"`,
    `"formal"`, `"period_voice"`, `"colloquial"`, `"mixed"`
  - `prose_preferences` — `<fieldset>` with 4 nested selects for
    `psychic_distance`, `dialogue_density`, `interiority`,
    `paragraphing` (closed enums per the four type aliases in
    `types/manual-story.ts:29-52`)
- Submit handler: prevent default, set `submitting=true`, call
  `updateMetadata(worldSlug, msSlug, metadata)`. On `{ ok: true }`,
  navigate to
  `/worlds/${worldSlug}/manual-stories/${msSlug}/dashboard`. On
  `{ ok: false }`, set `error = `${status} ${error}${message ? ": " + message : ""}`,
  set `validationErrors = errors ?? null`, preserve form state. Render
  `<p role="alert">{error}</p>` plus, when `validationErrors` is
  populated, an `<ul>` of `<li>{e.field}: {e.message}</li>`.
- Wrap the form in `<section><h2>Story contract for {msSlug}</h2>…</section>`.

Closed-enum option values MUST be byte-exact strings from
`web/src/types/manual-story.ts` — no slugification. Pay particular
attention to `"close third"` and `"distant third"` (POV values with
embedded spaces).

### 2. Register `/contract` route in `App.tsx`

Modify `tools/manual-story-studio/web/src/App.tsx`:
- Add to imports (after the other page imports near lines 3-14):
  `import { EditContract } from "./pages/EditContract.js";`
- Add inside `<Routes>` (after the `manuscript` route at lines 72-75
  or co-located with the other `/contract`-adjacent feature routes):
  ```tsx
  <Route
    path="/worlds/:worldSlug/manual-stories/:msSlug/contract"
    element={<EditContract />}
  />
  ```

### 3. Add cross-link in `Dashboard.tsx`

Modify `tools/manual-story-studio/web/src/pages/Dashboard.tsx`:
- Inside `<section aria-label="story-contract">` (lines 146-173),
  after the `<dl>` and inside the same metadata-bound conditional
  (so the link only renders when metadata loaded), append:
  ```tsx
  <Link to={`/worlds/${worldSlug}/manual-stories/${msSlug}/contract`}>
    {metadata.story_contract.premise === "" || metadata.story_contract.tone === ""
      ? "Set premise & tone"
      : "Edit contract"}
  </Link>
  ```
- `Link` is already imported from `react-router-dom` at line 2 — no
  new import needed.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/EditContract.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)

## Out of Scope

- `prompt_policy` and `manuscript` policy editing — explicitly out of
  scope per spec §Non-Goals (future "Studio settings" page).
- Initial-creation contract capture (adding contract fields to
  `CreateManualStory.tsx`) — rejected per spec §Approach options
  Option B; revisit only if the empty-premise foot-gun proves to be a
  real problem in practice.
- Inline-edit on the Dashboard (Option C in spec §Approach) — rejected
  per spec §Recommendation; Dashboard remains read-only.
- Read-only display of contract elsewhere besides the existing
  Dashboard section — explicitly out of scope per spec §Non-Goals.
- Optional `StoryContractForm.tsx` component extraction — spec marks
  this optional; defer until EditContract grows beyond the comfortable
  150-line range.
- `If-Match` / `updated_at` concurrent-edit protection — spec §Risks
  acknowledges last-write-wins; out of scope (no new risk introduced).
- Backend route changes — backend `PUT /metadata` is unchanged and
  is exercised solely as a regression guard per spec acceptance
  criterion 6.
- Widening `updateMetadata` itself — lands in MSSUX004STOCONEDI-001.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — tsc --noEmit passes
   after adding `EditContract.tsx` and modifying `App.tsx` +
   `Dashboard.tsx` (per spec acceptance criterion 5).
2. `cd tools/manual-story-studio && npm run test:backend` — backend
   regression guard; backend route unchanged (per spec acceptance
   criterion 6).
3. Manual: navigate to
   `/worlds/erotica-world/manual-stories/red-bunny/contract` against
   the Vite dev server — form renders pre-populated with current
   contract values (per spec acceptance criterion 1).
4. Manual: change each of the 8 contract fields + 4 prose-preference
   fields, submit, observe redirect to Dashboard with the updated
   values rendered in the `<section aria-label="story-contract">`
   `<dl>` (per spec acceptance criterion 2).
5. Manual: submit an invalid enum value (e.g., via DOM mutation in
   devtools to bypass the `<select>` constraint) — `<p role="alert">`
   surfaces the backend error with status + error + message; the form
   state is preserved (per spec acceptance criterion 3).
6. `grep -cE "to=\`/worlds/.*/manual-stories/.*/contract\`" tools/manual-story-studio/web/src/pages/Dashboard.tsx`
   returns `1` (the new cross-link is the only contract-page link
   added by this change, per spec acceptance criterion 4).

### Invariants

1. `/contract` is the only frontend route that mutates the
   `story_contract` block of `metadata.json`; the Dashboard remains
   read-only as its banner advertises (`App.tsx:22-23`).
2. Closed-enum `<option value="...">` strings in `EditContract.tsx`
   are byte-exact from `web/src/types/manual-story.ts`; no
   slugification (per spec §EditContract page UX warning). POV values
   `"close third"` and `"distant third"` preserve their embedded
   spaces.
3. Submit error rendering preserves form state — the local `metadata`
   state is not reset on `{ ok: false }`; the author's draft survives
   for retry.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket from the tests-on-disk perspective.
   Verification is command-based (tsc --noEmit) and manual UI
   verification per the `red-bunny` Manual Story. New Vitest /
   Playwright coverage is not part of the web bundle today (per
   `tools/manual-story-studio/web/package.json:9` the `test` script
   is tsc-only); this ticket inherits that posture per spec §Test
   plan.

### Commands

1. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit; web
   bundle type-check).
2. `cd tools/manual-story-studio && npm run test:backend` (backend
   regression guard; backend route unchanged).
3. `cd tools/manual-story-studio/web && npm run dev` then navigate
   browser to `/worlds/erotica-world/manual-stories/red-bunny/contract`
   for the four manual acceptance scenarios above. The backend must
   be running in parallel (typically via the studio's full
   `cd tools/manual-story-studio && npm run build && node dist/src/cli.js`
   pattern); the dev-server route is the visual-verification entry,
   the real PUT flow exercises the built backend.
