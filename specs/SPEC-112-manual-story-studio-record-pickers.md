# SPEC-112 — Manual Story Studio: First-Class Record Pickers (Replace ID Entry With Searchable Selectors)

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (web frontend + a thin read-API summary; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-109-manual-story-studio-current-context-layer.md (the current-context/working-set surface whose ID textareas this spec replaces with pickers), archive/specs/SPEC-111-manual-story-studio-ux-cockpit-pieces.md (SPEC-111 hid primary-label IDs from *display*; this spec replaces ID *input* — the two are complementary, not overlapping).
**Blocks:** SPEC-113 (Prompt Preview inspector reuses the record-card presentation), SPEC-114 (referrer cards in the delete-block flow reuse the record-card presentation), and the deferred post-segment record workbench.
**Related:** `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx`, `tools/manual-story-studio/web/src/components/RecordForm.tsx`, `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx`, `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`, `tools/manual-story-studio/web/src/api/records.ts`, `tools/manual-story-studio/src/read/records.ts`, `tools/manual-story-studio/src/server/routes/records.ts`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §12 / §24 / §31 / §39 Stage 2 (ChatGPT-Pro, 2026-06-02). Accepted as the highest-value ergonomic fix: the report's headline acceptance question is "Can an author maintain continuity after every accepted segment in under a minute *without touching an internal ID*?" Verified (this session): every reference is currently entered as raw IDs, and no combobox/picker component exists.

---

## 1. Context & Motivation

The product thesis after the second pass is a fast continuity/prompt sidecar, judged by one question (report §39): can an author maintain continuity after every accepted segment in under a minute without touching an internal ID? Today the answer is no, because reference entry is ID-typed throughout. Verified from the tree:

- **`EditCurrentContext.tsx`** uses an `IdTextArea` component (a `<textarea>`) with the hint "Comma- or newline-separated IDs. Allowed prefixes: …" for `current_cast`, `current_location`, `pov_holder`, `active_pressure_clocks`, `active_secrets_questions`, `pinned_records`, `must_not_reveal`.
- **`RecordForm.tsx`** uses a `ChipInput` (free-text `<input>`, adds on Enter/comma) for `refs.characters`, `refs.locations`, `refs.related_records` — accepting raw ID strings with no lookup, filtering, or validation against the existing record set.
- **`CurrentStatePanel.tsx`** renders selected references as raw-ID chips (`chipList`), so even the *display* of the current selection is IDs.
- **`MomentComposer.tsx`** toggles records by ID (checkbox list for cast; +Pin/−Unpin by ID for records).
- No combobox / autocomplete / record-picker component exists in `web/src/components/`.

SPEC-111 hid IDs from *primary labels* (titles became the visible label, IDs became disclosure subscripts). It deliberately kept IDs visible in *form fields* "since the author is explicitly editing the typed reference." This spec finishes the job: the author should never *type* an ID either — they should pick a record from a searchable card-based selector. That removes the last surface where the author touches an internal ID in the normal flow.

The backend already supports this cheaply: `listRecords` (`src/read/records.ts`) returns class-scoped record summaries (id, title, active, importance, tags, summary, refs). The picker needs a searchable, class-filterable summary feed — a thin extension of the existing list API, not a new subsystem. No MCP, no index, no new storage (report §8 / §38).

## 2. Scope

### In scope

1. **A reusable `<RecordPicker>` component** built on the W3C editable-combobox pattern (editable search input + suggestion popup + keyboard navigation + selection). It renders results as **record cards**, each showing: title, class, one-line summary, active/inactive, tags, involved cast, current prompt-visibility, and referenced-by count (count may be omitted in v1 if it requires a new backend pass — see §3). The ID is shown only in a per-card disclosure ("details"), never as the primary label.
2. **Picker affordances (minimum set):** free-text search over title + summary + tags; filter by class; filter by active/inactive; "recently used" and "pinned" quick sections; single-select and multi-select modes; keyboard navigation (arrow keys + Enter + Escape). Deferred affordances (create-new-inline, duplicate-existing, bulk include/exclude) are explicitly out of scope — see §2 Out of scope.
3. **Replace `IdTextArea` in `EditCurrentContext.tsx`** with `<RecordPicker>` instances appropriately constrained:
   - `current_location` → single-select, class-filtered to `locations`.
   - `pov_holder` → single-select, class-filtered to `cast`, constrained to members of `current_cast` (the existing "POV must be in current cast" validation already exists in the current-context validator; the picker should default to surfacing current-cast members first).
   - `current_cast` → multi-select, `cast`.
   - `active_pressure_clocks` → multi-select, `clocks`.
   - `active_secrets_questions` → multi-select, `secrets` + `questions`.
   - `pinned_records` / `must_not_reveal` → multi-select, any class.
4. **Replace `ChipInput` in `RecordForm.tsx`** for `refs.characters` / `refs.locations` / `refs.related_records` with `<RecordPicker>` (class-constrained for characters/locations; any-class for related_records). The picker stores the same ID array the form already persists — only the entry UX changes.
5. **Replace raw-ID chips in `CurrentStatePanel.tsx`** with title-bearing chips (reuse the record-card mini form), so the displayed current selection reads as titles, not IDs.
6. **Replace ID-toggle selection in `MomentComposer.tsx`** record/cast pickers with `<RecordPicker>` (multi-select). The composer continues to pass id arrays to the compose API unchanged.
7. **Thin read-API support:** a `GET` summary feed the picker consumes — either extend the existing records list route to accept a `?classes=` multi-filter + `?q=` text filter, or have the picker fetch the existing per-class lists and filter client-side. Pick the lower-churn option that keeps the page responsive for a few-hundred-record story (client-side filter over already-fetched summaries is acceptable for v1; document the choice).

### Out of scope

- **Create-new-inline / duplicate-existing** from inside the picker — deferred to the post-segment workbench follow-up (they need the create/edit form to mount in a drawer; that is the workbench's job).
- **Referenced-by count** if it requires a new whole-corpus scan — may ship as a follow-on once SPEC-114's referrer-resolution backend exists (SPEC-114 needs a "who references X" pass anyway; the picker can consume it then). v1 may omit the count.
- **Bulk include/exclude** toggles and the prompt-inclusion toggle on every card — those belong to SPEC-113's working-set/ledger surface.
- Any change to record IDs, ID format, or storage layout (report §38: keep lowercase numeric IDs internally; do not migrate).
- Backend MCP / world-index introduction.

## 3. Key decisions

- **One reusable picker, many constrained mounts.** A single `<RecordPicker>` with `classes`, `mode (single|multi)`, and `seed (pre-surface ids)` props avoids per-field bespoke selectors and keeps the card presentation consistent (the same card SPEC-113 and SPEC-114 reuse).
- **Cards, not bare options.** Per report §12, "Pick a consequence should be as good as pick a character" — non-cast records need the same card richness (summary, tags, involved cast) cast records get, or the author cannot tell two consequences apart.
- **Client-side filter for v1.** A manual story is a few-hundred records at most; fetching class summaries (the data SPEC-109 / SPEC-111 already load) and filtering in-memory avoids a new search backend and keeps the no-index discipline. Revisit only if a real story proves it slow (report §38).
- **IDs survive as the stored value and as a disclosure.** The picker changes the *entry* surface, not the persisted shape — `current-context.yaml` and record `refs` still store id arrays. This keeps the artifact freely hand-editable (consistent with the author's editable-artifact preference) and keeps SPEC-116 / health validation unchanged.
- **Referenced-by count is deferred, not faked.** Showing a wrong/zero count is worse than showing none; defer to SPEC-114's referrer pass.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/web/src/components/RecordPicker.tsx` — the combobox-pattern picker rendering record cards (§2 items 1–2).
- `tools/manual-story-studio/web/src/components/RecordCardMini.tsx` — the shared compact card (title / class / summary / active / tags / involved cast / prompt-visibility / id-disclosure) consumed by the picker, by `CurrentStatePanel`, and (later) by SPEC-113/-114. (If a `RecordCard` already exists, extend it rather than duplicate.)
- `tools/manual-story-studio/test/web/record-picker.test.ts` — picker behavior (search filters by title/summary/tags; class filter; single vs multi; keyboard select; no raw-ID textarea remains) at the web `tsc --noEmit` / available-harness level.

**Modify:**

- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` — remove `IdTextArea`; mount constrained `<RecordPicker>` per §2 item 3.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` — replace `ChipInput` ref fields with `<RecordPicker>` per §2 item 4.
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` — replace raw-ID `chipList` with title-bearing chips per §2 item 5.
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` — replace ID-toggle selection with `<RecordPicker>` per §2 item 6 (compose call unchanged).
- `tools/manual-story-studio/web/src/api/records.ts` — if the chosen approach extends the list route, add the `classes`/`q` query support; otherwise add a small client-side multi-class fetch helper.
- `tools/manual-story-studio/src/server/routes/records.ts` + `tools/manual-story-studio/src/read/records.ts` — only if the server-side `?classes=`/`?q=` filter is chosen; otherwise unchanged.
- `tools/manual-story-studio/web/src/index.css` — picker popup + card styling.

**No modification to:** record/current-context schema, prompt section emitters, prompt compose pipeline (SPEC-113 owns that), record ID format/storage.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Tooling Recommendation (least-privilege LLM packets) | aligns @ ID-free entry | Removing every author-facing ID-typing surface eliminates the residual path by which an author copies an internal id into a directive — completing the prompt-leakage defense SPEC-106 hard-tiers and SPEC-111 began. |
| §Soft Canon / Local Truth (explicit + validated) | aligns @ picker-validated refs | Picking from the existing record set (vs typing free-text IDs) means a reference can no longer point at a non-existent record; the selection surface validates by construction. |
| Rule 6 No Silent Retcons | N/A @ tooling-adjacent | No canon mutation; entry-UX only. The persisted id arrays are unchanged, so no record meaning changes. |
| §world-canon vs story-bundle execution state (FOUNDATIONS line 105) | N/A @ tooling-adjacent | Picker reads story-local manual-story records only; never world canon or story-bundle `_source/`. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction; persisted shape unchanged. |

## 6. Build & test

`tools/manual-story-studio`:
- `npm --prefix web test` (the web `tsc --noEmit` baseline) must remain green and cover the new components' types.
- `npm run test:backend` covers any records-route filter changes under `node --test`.
- `npm test` runs both end to end; `npm run build` (`build:backend` + `npm --prefix web run build`) must succeed.

## 7. Acceptance criteria

1. **PASS rationale required.** A grep of `web/src/` finds **zero** remaining raw-ID entry surfaces in the normal flow: `IdTextArea` is gone from `EditCurrentContext.tsx`, and `ChipInput` no longer accepts raw record IDs in `RecordForm.tsx` ref fields — verified by the picker test and a sweep listed in the implementing ticket.
2. The author can set every `current-context` field (location, POV, cast, clocks, secrets/questions, pins, must-not-reveal) by searching and selecting record cards, never by typing an ID.
3. POV-holder selection surfaces current-cast members first and the existing "POV must be in current cast" validation still holds.
4. Non-cast record selection (e.g. choosing a consequence or a clock) presents the same card richness (title/summary/tags/involved cast) as cast selection.
5. `CurrentStatePanel` displays selected references as titles, not raw IDs.
6. The persisted `current-context.yaml` and record `refs` still store id arrays (no storage-shape change), and the files remain hand-editable.
7. `npm test` is green; `npm run build` succeeds.
