# SPEC: MSSUX-004 — Story contract editing UI for Manual Story Studio

**Status**: PROPOSED
**Owner**: Manual Story Studio web bundle
**Backend dependency**: NONE (`PUT` endpoint already exists)
**Frontend API dependency**: NONE (`updateMetadata` wrapper already landed via SPEC-101 commit `133dcf32` — see §Problem for the residual gap)

## Problem

The Manual Story Studio backend exposes both `GET` and `PUT` at
`/api/worlds/:slug/manual-stories/:msSlug/metadata`
(`tools/manual-story-studio/src/server/routes/metadata.ts`), so the story
contract (`premise`, `tone`, `pov`, `tense`, `content_intensity`,
`explicitness`, `language_register`, `prose_preferences`) is editable
from the API. The web frontend already wires both `GET` and `PUT` at the
API-client layer — `tools/manual-story-studio/web/src/api/records.ts`
exports both `readMetadata` (line 183) and `updateMetadata` (line 194);
the `updateMetadata` wrapper landed via SPEC-101 (commit `133dcf32`,
`SPEC101MANSTOMET-008..012: Frontend, capstone, README docs`). What's
missing is the UI consumer that calls `updateMetadata`:

- `web/src/pages/Dashboard.tsx` lines 60-72, 147-168 fetch the metadata
  and render the contract as a read-only `<dl><dt><dd>` list — no edit
  link.
- `web/src/pages/CreateManualStory.tsx` lines 22-29 posts only `{ slug,
  title }` at creation; the backend fills `premise=""`, `tone=""`, and
  schema defaults for the closed-enum fields.
- `web/src/App.tsx` lines 38-84 has no route that targets contract
  editing — no `/contract`, no `/settings`, no `?edit=contract` flow.

Net effect: every Manual Story bundle ships with `premise: ""`,
`tone: ""`, and `pov: "close third"` forever, with no UI path to fix it.
The author can edit `metadata.json` on disk but the studio gives no
in-app surface. The API client is ready; only the page + route + cross-link
remain.

## Goals

1. Add a UI surface that lets the author edit the full story contract
   (all eight contract fields plus the four prose preferences).
2. Submissions persist through `PUT /api/worlds/:slug/manual-stories/:msSlug/metadata`.
3. The Dashboard's read-only contract section continues to render the
   current persisted state and links to the editor.
4. Inline validation errors from the backend (response body's `error`
   and `message`) surface to the form, in the same style as
   `CreateManualStory` and `RecordForm`.

## FOUNDATIONS Alignment

N/A at canon-pipeline scope — this spec extends `tools/manual-story-studio/`,
a canon-fenced package per SPEC-100 §3 (its `package.json` excludes
`@worldloom/patch-engine` and `@worldloom/world-mcp`; its realpath-based
write sandbox is bounded to `worlds/<slug>/manual-stories/`). The
downstream-consumer + write-enabled-but-canon-fenced carve-outs apply per
SPEC-104 precedent (`.claude/skills/reassess-spec/references/codebase-validation.md`
§3.9 and `references/foundations-alignment.md` §4.4). This spec adds no
new canon-mediation surface — only a UI surface over an already-fenced
HTTP endpoint.

## Non-Goals

- Editing `prompt_policy` or `manuscript` policy blocks — out of scope
  for this spec; if needed, treat as a follow-up (separate "Studio
  settings" page).
- Editing immutable metadata fields (`schema_version`, `world_slug`,
  `manual_story_slug`, `created_at`, `cast_order`, `segment_order`).
  These are server-owned.
- Adding read-only display of the contract anywhere besides the existing
  Dashboard section.

## Approach options

### Option A — Dedicated `/contract` page, "Edit" link from Dashboard

- New route `/worlds/:worldSlug/manual-stories/:msSlug/contract` →
  `<EditContract />` page.
- Page loads metadata via `readMetadata(world, ms)`, renders a form
  bound to `story_contract`, submits via the existing
  `api/records.ts → updateMetadata(world, ms, metadata)` wrapper
  (already shipped; small return-shape widening proposed — see §Design
  "API client").
- Dashboard's `<section aria-label="story-contract">` gets an "Edit
  contract" link (or "Set premise & tone" prompt when fields are empty).

**Tradeoffs**

- Pros: cleanly separates display from editing; matches the existing
  page-per-concern pattern (Records, Cast, Manuscript, Moment Composer).
- Pros: same UI surface handles "first-time setup" and "later edit" —
  no special creation-time form to design.
- Cons: one extra navigation step on first-time setup.

### Option B — Capture contract at creation time + edit page

- Extend `CreateManualStory.tsx` form with the contract fields, so the
  initial premise/tone/POV are set at creation.
- ALSO add the dedicated `/contract` edit page from Option A, because
  the author will need to revise the contract as the story evolves.

**Tradeoffs**

- Pros: avoids the "empty premise" foot-gun for new stories.
- Cons: doubles the form surface (creation + edit). The creation form
  becomes a long, intimidating page for a "create with sensible
  defaults" flow.
- Cons: still requires the edit page anyway, so Option B is Option A
  plus extra creation-time fields.

### Option C — Inline-editable Dashboard section

- Replace the Dashboard's `<dl>` with form inputs bound to local state
  + a "Save" button that calls `PUT /metadata`.

**Tradeoffs**

- Pros: zero extra navigation; everything happens on one screen.
- Cons: Dashboard currently mixes display, summary, and cross-nav; the
  banner says "World canon: read-only / Normal story bundles: read-only"
  and the section structure is summary-shaped. Embedding edit semantics
  changes the page's character.
- Cons: harder to surface inline validation errors (mixes with the
  other read-only sections).
- Cons: increases the Dashboard's blast radius for any contract-shape
  changes (every dashboard mount becomes a "potentially editable form"
  test surface).

## Recommendation

**Option A — dedicated `/contract` page with an "Edit contract" link
from the Dashboard section.**

Reasoning: it matches the existing per-concern page split (one editor
per concern), keeps the Dashboard genuinely read-only (as the banner
already advertises), and gives the author a single surface that handles
both first-time setup ("premise is empty, click Edit contract") and
later revisions. Option B's creation-time fields can be a follow-up if
the empty-premise foot-gun proves real in practice, but is YAGNI for
this spec — defaulting to "edit after creation" is the simpler default.

## Design (Option A)

### API client (already landed; small widening required)

`readMetadata` and `updateMetadata` already live in
`web/src/api/records.ts` (lines 183 and 194 respectively), with three
existing consumers of `readMetadata` (`Dashboard.tsx`,
`MomentComposer.tsx`, `Manuscript.tsx`). Keep both functions where they
are — no new `web/src/api/metadata.ts` module is introduced. Moving them
would require touching all three existing import sites for zero
functional gain.

The existing `updateMetadata` returns
`{ ok: true } | { ok: false; error: "validation_failed"; errors: ValidationError[] }`
(per the `MetadataUpdateResult` type at `records.ts:46-48`), coercing
all non-200 responses into `validation_failed`. The backend route at
`tools/manual-story-studio/src/server/routes/metadata.ts:40-79` can
return three distinct error shapes — `404 not_found`, `400 bad_request`
(with `message`), and `400 validation_failed` (with `errors[]`) — so
the wrapper loses information at the seam. **Widen `updateMetadata`** to
return the richer shape and update `MetadataUpdateResult` accordingly:

```ts
export type MetadataUpdateResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      message?: string;
      errors?: ValidationError[];
    };
```

Inside the function, parse the backend body once, then return
`{ ok: false, status: response.status, error, message, errors }` —
preserving `errors[]` for the `validation_failed` case AND
`message` for the `bad_request` / `not_found` cases. This wrapper is the
only consumer of `MetadataUpdateResult`, so no other call sites need
updating (zero existing callers of `updateMetadata`).

### New files

- `web/src/pages/EditContract.tsx` — the new edit page.
- (optional) `web/src/components/StoryContractForm.tsx` — extract the
  form into a component if the EditContract page grows beyond the
  comfortable 150-line range.

### Routes

In `web/src/App.tsx`:

```tsx
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/contract"
  element={<EditContract />}
/>
```

### Dashboard cross-link

In `web/src/pages/Dashboard.tsx`, inside `<section
aria-label="story-contract">`, append a link beneath the `<dl>`:

```tsx
<Link to={`/worlds/${worldSlug}/manual-stories/${msSlug}/contract`}>
  Edit contract
</Link>
```

When `metadata.story_contract.premise === ""` or `tone === ""`, replace
the cross-link copy with `Set premise & tone` to make the empty-state
actionable (low-cost copy refinement, kept inside this spec).

### EditContract page UX

- On mount, fetch metadata via `readMetadata(world, ms)`. While
  loading, render `<p>Loading metadata…</p>`. On error, render
  `<p role="alert">Failed to load metadata.</p>`.
- The form is bound to a local `metadata` state seeded from the
  fetch. Closed-enum fields render as `<select>` with options from
  the `ManualStoryPov` / `ManualStoryTense` / etc. types in
  `web/src/types/manual-story.ts`. Free-text fields (`premise`,
  `tone`, `explicitness`) render as `<input>` / `<textarea>`.
- **Option values must be byte-exact strings from the closed-enum type
  definitions in `web/src/types/manual-story.ts`** — no slugification,
  no transformation. Several values contain embedded spaces
  (`"close third"`, `"distant third"`); a transformed option value
  (e.g. `close_third`) would produce a payload the backend schema
  validator rejects. Matches the drift risk already flagged in §Risks.
- Prose preferences render as a fieldset with four selects.
- On submit, call `updateMetadata(world, ms, metadata)`. On `{ ok: true }`
  navigate back to the Dashboard. On `{ ok: false }`, surface
  `${status} ${error}${message ? ": " + message : ""}` in a
  `<p role="alert">` (parallels the `CreateManualStory` error-display
  pattern at `CreateManualStory.tsx:39`). For the `validation_failed`
  case (`errors[]` populated), additionally render each error's `field`
  and `message` as list items so the author sees which contract field
  the backend rejected without losing draft state.

## Files to touch

- `web/src/api/records.ts` (modify) — widen `updateMetadata`'s return
  shape and the `MetadataUpdateResult` type per §Design "API client"
  above; preserve `readMetadata` unchanged. No other call sites change
  (zero existing consumers of `updateMetadata`).
- `web/src/pages/EditContract.tsx` (new).
- `web/src/App.tsx` (modify) — register route.
- `web/src/pages/Dashboard.tsx` (modify) — "Edit contract" cross-link.

## Out of scope

- `prompt_policy` and `manuscript` policy editing — future spec.
- Initial-creation contract capture (Option B's extra fields on
  CreateManualStory) — revisit only if the "empty premise" pattern
  proves to be a real foot-gun.
- Dashboard inline editing (Option C) — rejected per Recommendation.

## Acceptance criteria

1. Navigating to
   `/worlds/erotica-world/manual-stories/red-bunny/contract` renders a
   form pre-populated with the current contract values.
2. Saving a changed premise, tone, POV, tense, content intensity,
   explicitness, language register, and prose preferences persists the
   change, returns 200, and navigates back to the Dashboard, where the
   updated values render.
3. Submitting an invalid value (e.g., a POV string outside the closed
   enum, if the backend rejects it) surfaces the inline error message
   via `<p role="alert">` without losing the user's draft.
4. The Dashboard's contract section shows an "Edit contract" link, and
   the link is the only cross-link added by this change.
5. `npm --prefix tools/manual-story-studio/web test` (tsc --noEmit)
   passes.
6. `npm --prefix tools/manual-story-studio test:backend` continues to
   pass (the backend endpoint is unchanged; this is a regression
   guard).

## Test plan

- New Vitest / Playwright-style coverage is not part of the web bundle
  today (the `test` script is tsc-only). This spec inherits that
  posture; manual verification is the test plan, with the four
  acceptance scenarios above run by hand against `red-bunny`.
- A follow-up spec may introduce browser-driven tests; out of scope
  here.

## Risks

- The backend's `PUT /metadata` likely re-validates the schema. If the
  frontend posts a metadata blob with a closed-enum value outside the
  schema's allowed set (e.g., due to drift between
  `tools/manual-story-studio/web/src/types/manual-story.ts` and
  `tools/manual-story-studio/src/schema/manual-story.ts`), the request
  will fail. Verify the closed enums match before implementing the
  form's `<select>` option lists; the mirror-file comment at the top of
  the web types file already names this drift risk.
- Concurrent edits: there is no `updated_at` / `If-Match` discipline
  here. If two tabs edit the same metadata, the last write wins. The
  current backend already permits this; no new risk introduced.
