# SPEC-112 — Manual Story Studio: First-Class Record Pickers (Replace ID Entry With Searchable Selectors)

**Status:** COMPLETED
**Date:** 2026-06-02
**Classification:** tooling-adjacent (web frontend + a thin read-API summary; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-109-manual-story-studio-current-context-layer.md (the current-context/working-set surface whose ID textareas this spec replaces with pickers), archive/specs/SPEC-111-manual-story-studio-ux-cockpit-pieces.md (SPEC-111 hid primary-label IDs from *display*; this spec replaces ID *input* — the two are complementary, not overlapping).
**Blocks:** SPEC-113 (Prompt Preview inspector reuses the record-card presentation), SPEC-114 (referrer cards in the delete-block flow reuse the record-card presentation), and the deferred post-segment record workbench.
**Related:** `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx`, `tools/manual-story-studio/web/src/components/RecordForm.tsx`, `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx`, `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`, `tools/manual-story-studio/web/src/api/records.ts`, `tools/manual-story-studio/src/read/records.ts`, `tools/manual-story-studio/src/server/routes/records.ts`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §12 / §24 / §31 / §39 Stage 2 (ChatGPT-Pro, 2026-06-02). Accepted as the highest-value ergonomic fix: the report's headline acceptance question is "Can an author maintain continuity after every accepted segment in under a minute *without touching an internal ID*?" Verified (this session): every reference is currently entered as raw IDs, and no combobox/picker component exists.

---

## 1. Context & Motivation

The product thesis after the second pass is a fast continuity/prompt sidecar, judged by one question (report §39): can an author maintain continuity after every accepted segment in under a minute without touching an internal ID? Today the answer is no, because reference entry is ID-typed throughout. Verified from the tree:

- **`EditCurrentContext.tsx`** uses an `IdTextArea` component (a `<textarea>`) with the hint "Comma- or newline-separated IDs. Allowed prefixes: …" for five of its reference fields — `current_cast`, `active_pressure_clocks`, `active_secrets_questions`, `pinned_records`, `must_not_reveal`. The remaining two are already non-textarea but still ID-typed: `current_location` is a plain `<input type="text">` (mloc-* hint) and `pov_holder` is a `<select>` already constrained to `current_cast` members. All seven are still ID surfaces the author must reason about by id.
- **`RecordForm.tsx`** uses a `ChipInput` (free-text `<input>`, adds on Enter/comma) for `refs.characters`, `refs.locations`, `refs.related_records` — accepting raw ID strings with no lookup, filtering, or validation against the existing record set.
- **`CurrentStatePanel.tsx`** renders selected references as raw-ID chips (`chipList`), so even the *display* of the current selection is IDs.
- **`MomentComposer.tsx`** toggles records by ID (checkbox list for cast; +Pin/−Unpin by ID for records).
- No combobox / autocomplete / record-picker component exists in `web/src/components/`.

SPEC-111 hid IDs from *primary labels* (titles became the visible label, IDs became disclosure subscripts). It deliberately kept IDs visible in *form fields* "since the author is explicitly editing the typed reference." This spec finishes the job: the author should never *type* an ID either — they should pick a record from a searchable card-based selector. That removes the last surface where the author touches an internal ID in the normal flow.

The backend already supports most of this cheaply: `listRecords` (`src/read/records.ts`) returns class-scoped record summaries via `toSummary` — but today those summaries carry only `id, title, active, importance, tags, summary, prompt_visibility` (`ManualRecordSummary`); they do **not** carry `refs` (that lives on the full `ManualRecord`). Surfacing the card's "involved cast" therefore needs one thin extension: add `refs` (or a derived involved-cast field) to `toSummary` + `ManualRecordSummary`. Everything else the picker needs — search, class filtering — is done client-side over the per-class summaries the existing `?class=` route already serves (the same in-memory pattern `MomentComposer` already uses); no new route filter, no MCP, no index, no new storage (report §8 / §38).

## 2. Scope

### In scope

1. **A reusable `<RecordPicker>` component** built on the W3C editable-combobox pattern (editable search input + suggestion popup + keyboard navigation + selection). It renders results as **record cards** by reusing the existing `RecordCard.tsx` component (extended — see §4), each showing: title, class, one-line summary, active/inactive, tags, involved cast, current prompt-visibility, and referenced-by count. "Involved cast" depends on the `toSummary` / `ManualRecordSummary` `refs` extension (§4); referenced-by count may be omitted in v1 if it requires a new backend pass — see §3. The ID is shown only in a per-card disclosure ("details"), never as the primary label.
2. **Picker affordances (minimum set):** free-text search over title + summary + tags; filter by class; filter by active/inactive; "recently used" and "pinned" quick sections; single-select and multi-select modes; keyboard navigation (arrow keys + Enter + Escape). Deferred affordances (create-new-inline, duplicate-existing, bulk include/exclude) are explicitly out of scope — see §2 Out of scope.
3. **Replace ID-typed entry in `EditCurrentContext.tsx`** (the five `IdTextArea` fields plus the `current_location` text input and the `pov_holder` `<select>`) with `<RecordPicker>` instances appropriately constrained:
   - `current_location` → single-select, class-filtered to `locations` (today a plain `<input>`).
   - `pov_holder` → single-select, class-filtered to `cast`, constrained to members of `current_cast` (this enriches the existing cast-constrained `<select>` into a searchable picker; the "POV must be in current cast" validation already exists in the current-context validator, and the picker should surface current-cast members first).
   - `current_cast` → multi-select, `cast`.
   - `active_pressure_clocks` → multi-select, `clocks`.
   - `active_secrets_questions` → multi-select, `secrets` + `questions`.
   - `pinned_records` → multi-select, any class (matches the existing `allManualPrefixes()` validation).
   - `must_not_reveal` → multi-select, class-filtered to `secrets` (`msecret-`) — **not** any class: the existing client validator constrains it to `allowedPrefixes(["secrets"])`, so an any-class picker would admit selections the save-time validator rejects.
4. **Replace `ChipInput` in `RecordForm.tsx`** for `refs.characters` / `refs.locations` / `refs.related_records` with `<RecordPicker>` (class-constrained for characters/locations; any-class for related_records). The picker stores the same ID array the form already persists — only the entry UX changes.
5. **Replace raw-ID display in `CurrentStatePanel.tsx`** with title-bearing display, so the current selection reads as titles, not IDs. This covers **all** displayed references, not only the `chipList` fields: `chipList` today renders `current_cast` / `active_pressure_clocks` / `active_secrets_questions`, but `current_location` and `pov_holder` render as raw `<dd>` text and must be title-resolved too. Note the panel currently receives only `ctx` (id arrays); resolving titles requires it to fetch per-class summaries and build an id→title map (titles are present on `ManualRecordSummary`; involved-cast is not — see §4).
6. **Replace ID-toggle selection in `MomentComposer.tsx`** record/cast pickers with `<RecordPicker>` (multi-select). The composer continues to pass id arrays to the compose API unchanged.
7. **Thin read-API support (client-side filter, decided for v1):** the picker fetches per-class summaries via the **existing** records list route (`GET …/records?class=<cls>&includeArchived=…`) and filters/searches in-memory — the same pattern `MomentComposer` already uses to load all classes. No `?classes=` multi-filter or `?q=` text-filter route change is added (consistent with the no-index discipline; revisit only if a real story proves it slow, report §38). The **only** backend change is the `toSummary` / `ManualRecordSummary` `refs` extension (§2 item 1, for involved-cast). `api/records.ts` gains a small client-side multi-class fetch helper.

### Out of scope

- **Create-new-inline / duplicate-existing** from inside the picker — deferred to the post-segment workbench follow-up (they need the create/edit form to mount in a drawer; that is the workbench's job).
- **Referenced-by count** if it requires a new whole-corpus scan — may ship as a follow-on once SPEC-114's referrer-resolution backend exists (SPEC-114 needs a "who references X" pass anyway; the picker can consume it then). v1 may omit the count.
- **Bulk include/exclude** toggles and the prompt-inclusion toggle on every card — those belong to SPEC-113's working-set/ledger surface.
- **Segment picker** (`last_accepted_segment` / `last_reviewed_after_segment` stay SEG-* text inputs) and **template picker** (the `MomentComposer` beat-template `<select>`) — report §31 / §39 Stage 2 calls for selectors on these too, but they are deferred here: the segment selector needs a segment summary feed (title/date/preview) this spec does not build, and the beat-template `<select>` already carries titles (no raw-ID surface). This spec scopes only record/cast/location refs.
- **"Filter by prompt included/excluded"** picker affordance (report §31.3) — depends on SPEC-113's inclusion ledger; deferred to SPEC-113.
- Any change to record IDs, ID format, or storage layout (report §38: keep lowercase numeric IDs internally; do not migrate).
- Backend MCP / world-index introduction.

## 3. Key decisions

- **One reusable picker, many constrained mounts.** A single `<RecordPicker>` with `classes`, `mode (single|multi)`, and `seed (pre-surface ids)` props avoids per-field bespoke selectors and keeps the card presentation consistent (the same card SPEC-113 and SPEC-114 reuse).
- **Cards, not bare options.** Per report §12, "Pick a consequence should be as good as pick a character" — non-cast records need the same card richness (summary, tags, involved cast) cast records get, or the author cannot tell two consequences apart.
- **Client-side filter for v1.** A manual story is a few-hundred records at most; fetching class summaries (the data SPEC-109 / SPEC-111 already load) and filtering in-memory avoids a new search backend and keeps the no-index discipline. Revisit only if a real story proves it slow (report §38).
- **IDs survive as the stored value and as a disclosure.** The picker changes the *entry* surface, not the persisted shape — `current-context.yaml` and record `refs` still store id arrays. This keeps the artifact freely hand-editable (consistent with the author's editable-artifact preference) and keeps archived SPEC-116 / health validation unchanged.
- **Referenced-by count is deferred, not faked.** Showing a wrong/zero count is worse than showing none; defer to SPEC-114's referrer pass.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/web/src/components/RecordPicker.tsx` — the combobox-pattern picker rendering record cards (§2 items 1–2).
- `tools/manual-story-studio/test/web/record-picker.test.ts` — a **source-structure** `node --test` test in the mold of the existing `test/web/useUnsavedChanges.test.ts` (which `readFileSync`s sources and regex-asserts), since the web package has no DOM/runtime test harness (web `npm test` is `tsc -p tsconfig.json --noEmit` only; the backend `node --test` cannot render React). It asserts the structural sweep AC#1 relies on: `IdTextArea` is gone from `EditCurrentContext.tsx`, `ChipInput` no longer wraps the `refs` fields in `RecordForm.tsx`, and `<RecordPicker>` is mounted in the four target surfaces. Runtime behavior (search filtering, keyboard navigation, single/multi select) is covered by component-level type-checking under web `tsc --noEmit`, not by behavioral assertions this harness cannot run.

**Modify:**

- `tools/manual-story-studio/web/src/components/RecordCard.tsx` — extend the existing card (today consumed by `CastAndProfiles.tsx` + `Records.tsx`; renders title / importance / id-subscript / summary / tags) to add class label, prompt-visibility, optional involved-cast, and make it embeddable inside the picker popup. (Extend, not duplicate — no new `RecordCardMini`.)
- `tools/manual-story-studio/src/read/records.ts` — extend `toSummary` to surface `refs` (or a derived involved-cast field) so cards can show involved cast (§2 item 1). This is the only backend change.
- `tools/manual-story-studio/src/schema/manual-story.ts` + `tools/manual-story-studio/web/src/types/manual-story.ts` — add the new field to `ManualRecordSummary` in both the backend schema and the web type mirror.
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` — remove `IdTextArea` and replace the `current_location` input + `pov_holder` select with constrained `<RecordPicker>` per §2 item 3.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` — replace `ChipInput` on the `refs.characters` / `refs.locations` / `refs.related_records` fields with `<RecordPicker>` per §2 item 4 (leave `ChipInput` in place for `tags` and the cast nested string-array fields).
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` — replace raw-ID display (the `chipList` fields plus the `current_location` / `pov_holder` `<dd>` text) with title-bearing display per §2 item 5; add the per-class summary fetch needed to resolve titles.
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` — replace ID-toggle cast/record selection with `<RecordPicker>` per §2 item 6 (compose call unchanged).
- `tools/manual-story-studio/web/src/api/records.ts` — add a small client-side multi-class fetch helper (the picker filters/searches in-memory; no route change) per §2 item 7.
- `tools/manual-story-studio/web/src/index.css` — picker popup + card styling.

**No modification to:** `server/routes/records.ts` (the existing `?class=` route is reused unchanged — no `?classes=`/`?q=` filter), record/current-context **record** schemas (only the read-side `ManualRecordSummary` projection gains `refs`), prompt section emitters, prompt compose pipeline (SPEC-113 owns that), record ID format/storage.

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
- `npm --prefix web test` (the web `tsc -p tsconfig.json --noEmit` baseline — type-check only, no DOM/runtime harness) must remain green and cover the new `RecordPicker` / extended `RecordCard` types.
- `npm run test:backend` (compiles `test/**` to `dist/` and runs `node --test "dist/test/**/*.test.js"`) covers the `toSummary` `refs` extension and the new source-structure `test/web/record-picker.test.ts` (a `node --test` file, like the existing `test/web/useUnsavedChanges.test.ts`).
- `npm test` runs both end to end; `npm run build` (`build:backend` + `npm --prefix web run build`) must succeed.

## 7. Acceptance criteria

1. **PASS rationale required.** A grep of `web/src/` finds **zero** remaining raw-ID entry surfaces in the normal flow: `IdTextArea` is gone from `EditCurrentContext.tsx`, and `ChipInput` no longer accepts raw record IDs in `RecordForm.tsx` ref fields — verified by the picker test and a sweep listed in the implementing ticket.
2. The author can set every `current-context` field (location, POV, cast, clocks, secrets/questions, pins, must-not-reveal) by searching and selecting record cards, never by typing an ID.
3. POV-holder selection surfaces current-cast members first and the existing "POV must be in current cast" validation still holds.
4. Non-cast record selection (e.g. choosing a consequence or a clock) presents the same card richness (title/summary/tags/involved cast) as cast selection.
5. `CurrentStatePanel` displays selected references as titles, not raw IDs.
6. The persisted `current-context.yaml` and record `refs` still store id arrays (no storage-shape change), and the files remain hand-editable.
7. `npm test` is green; `npm run build` succeeds.

## 8. Risks & Open Questions

- **`ManualRecordSummary` `refs` extension is load-bearing for "involved cast".** The card field requires `toSummary` (`src/read/records.ts`) and `ManualRecordSummary` (backend `schema/manual-story.ts` + web `types/manual-story.ts`) to gain `refs` (or a derived involved-cast field). Decided (reassessment): extend the summary rather than omit involved-cast, because report §12 / §31 treat involved-cast as core to "pick a consequence as good as pick a character." Referenced-by count remains deferred (no faked/zero count) until SPEC-114's referrer pass.
- **Test harness is source-structure + type-check only.** The web package ships no DOM/runtime test runner (`vitest`/`jsdom`/testing-library are absent). `record-picker.test.ts` is therefore a `node --test` source-structure test (assert removal/presence of components in source) plus web `tsc --noEmit` type coverage — not behavioral search/keyboard assertions. If true behavioral coverage is later wanted, adding a DOM harness is a separate spec.
- **Client-side filter for v1 (no route filter).** The picker fetches per-class summaries and filters in-memory (matching `MomentComposer`). Revisit only if a real few-hundred-record story proves the page unresponsive (report §38).
- **Segment / template pickers and the prompt-included/excluded filter are deferred** (see §2 Out of scope): segment selectors need a segment summary feed not built here; the beat-template `<select>` already shows titles; the prompt-incl/excl filter depends on SPEC-113's inclusion ledger.
- **`CurrentStatePanel` gains a data dependency.** Resolving titles requires the panel to fetch per-class summaries (it currently receives only id arrays). Keep this within the read path already used elsewhere; do not introduce a new aggregate endpoint.

## Outcome

Completed 2026-06-02.

SPEC-112 landed through `archive/tickets/SPEC112MANSTOSTU-001.md` through `archive/tickets/SPEC112MANSTOSTU-008.md`. The Manual Story Studio web client now has a reusable `RecordPicker`, extended `RecordCard` picker display props, client-side multi-class summary fetching, picker styling, current-context picker mounts, record-reference picker mounts, current-state title resolution, Moment Composer picker mounts, and a source-structure capstone test for the migration.

The persisted shapes stayed unchanged: current-context fields and record refs still store id strings/arrays, and the compose request still passes `included_cast` and `included_records` id arrays to `previewPrompt`. No `?classes=` or `?q=` server route shape was introduced.

Deviations from the original plan: the summary projection landed as a derived `involved_cast` field rather than raw `refs`, and the card implementation extended `RecordCard` directly rather than introducing a separate `RecordCardMini`. Referenced-by counts, segment/template pickers, prompt-included filters, and DOM/runtime interaction tests remain out of scope as specified.

Verification: `npm run test:backend`, `npm run build`, and `npm test` passed from `tools/manual-story-studio/`; `grep -rn IdTextArea tools/manual-story-studio/web/src/` returned no matches; `grep -n '?classes=\|?q=' tools/manual-story-studio/web/src/api/records.ts` returned no matches; `git diff --check` passed during the capstone closeout.
