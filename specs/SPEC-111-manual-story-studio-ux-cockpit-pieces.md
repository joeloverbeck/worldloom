# SPEC-111 — Manual Story Studio: UX Cockpit Pieces — Health Banner, ID Hiding, Sibling Nav, Unsaved-Change Handling

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (web frontend changes only; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md (consumes the landed `/health` endpoint + App-level health banner mount), SPEC-109 (consumes the current-context surface for the Dashboard cockpit panel).
**Blocks:** —
**Related:** `tools/manual-story-studio/web/src/App.tsx`, `tools/manual-story-studio/web/src/pages/Dashboard.tsx`, `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`, `tools/manual-story-studio/web/src/pages/Records.tsx`, `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`, all pages under `web/src/pages/`.
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§5 / 18 / 29 / 31 Stage 8 (ChatGPT-Pro, 2026-06-01). Accepted with modification: the report's full "single cockpit page" rewrite is scope-large; this spec captures the load-bearing pieces (persistent health banner, ID hiding from primary UI, sibling-page nav across all cockpit pages, unsaved-change handling on directive/contract/records). Keyboard shortcuts and the `/` quick-search are explicitly **deferred** to a follow-up spec when the foundational pieces are validated in use.

---

## 1. Context & Motivation

The current Manual Studio frontend is route-complete but workflow-incomplete. Verified gaps:

- **Single top-level nav link.** `tools/manual-story-studio/web/src/App.tsx:37-41` renders only `<nav><Link to="/">Worlds</Link></nav>`. To go from Dashboard to Records to Beat Templates, the author either back-buttons or types the URL. The recent MSSUX-006 work (per commit `4725c8ac MSSUX-006 dashboard cross-nav to sibling per-story pages`) added some per-page sibling nav but the discipline is uneven across pages.

- **IDs leak into the primary UI.** Per the report §5: "Dashboard renders cast IDs and `class/id` links." Inspection confirms the dashboard surfaces `mchar-3`-style IDs as user-facing labels in several panels. The author does not need to see these — they are file-management surface, not authoring surface — and the leakage compromises the prompt-leakage discipline (an author seeing IDs in the dashboard is likelier to copy IDs into the directive).

- **Per-story navigation still has nowhere consistent to live.** SPEC-105 now owns the `/health` endpoint and App-level `HealthBanner` mount. SPEC-111 should place the sibling-page navigation alongside that existing banner without remounting the banner.

- **Unsaved-change handling absent.** Editing the directive draft on Moment Composer, the story contract on Edit Contract, or a record on the Records page does not guard against navigating away with unsaved changes. The author loses work to a misclick or a back-button reflex.

- **Dashboard is a summary list, not a cockpit.** Per the report §18: "Dashboard contains useful panels but is still a list of summaries, counts, and navigation links rather than an integrated cockpit." With SPEC-109's current-context layer present, the dashboard's primary surface should be the Current State panel; the importance-bucketed records panel becomes secondary.

This spec implements the four load-bearing cockpit pieces. The full single-page cockpit and keyboard shortcuts are deferred — the report's §18 keyboard-shortcuts list (`Cmd/Ctrl+Enter` compose, `Cmd/Ctrl+Shift+C` copy, `Cmd/Ctrl+S` save, `/` quick-search) is a separate spec when the cockpit's structure stabilizes after these foundational pieces.

## 2. Scope

### In scope

1. **Respect the existing persistent health banner.** SPEC-105 already mounts `<HealthBanner />` in `App.tsx` for per-story routes. This spec must keep that mount as the single source of health rendering and should not add a duplicate banner.

2. **Sibling-page nav component.** New `web/src/components/StoryPageNav.tsx` rendering tabs (or a horizontal nav strip) for the per-story pages: Dashboard, Current State (SPEC-109 page), Cast, Records, Beat Templates, Moment Composer, Prompt Preview, Prompt History, Paste Prose, Manuscript, Edit Contract, Repair (SPEC-108). Active page highlighted; consistent ordering everywhere. Mounted by `App.tsx` just below the health banner, also conditional on the per-story URL pattern. This App-level strip **supersedes** the per-page sibling nav MSSUX-006 added to `Dashboard.tsx` (the `<nav aria-label="story-pages">` block at `Dashboard.tsx:184–210`) — that block must be removed when `StoryPageNav` lands, otherwise both navs render. No other page carries a local sibling nav (grep-confirmed), so Dashboard is the only removal site.

3. **Hide internal IDs from primary UI.** Survey every page under `web/src/pages/` and audit each surface where a record ID is rendered. For each:
   - If the ID is the *primary label* (e.g., a Records-page row): replace the ID with the record's `title`; the ID becomes a small grey subscript visible on hover or in a "Show details" disclosure.
   - If the ID is a *link target only* (e.g., a `<Link to={...}>` whose visible text is already the title): no change needed.
   - If the ID is in a *form field* (e.g., the typed-references RefList component): keep the ID visible since the author is explicitly editing the typed reference; this is editor surface, not primary cockpit surface.

   The Dashboard's cast and record summary panels (verified to surface IDs at the row-label level) are the primary target.

4. **Confirm silent-error cleanup is complete (regression guard).** SPEC-105 removed the 7 explicit `.catch(() => {})` occurrences in Dashboard and MomentComposer. A tree-wide grep at reassessment time (2026-06-02) confirms **zero** `.catch(() => {})` remain anywhere in `web/src/`, and the surviving `catch {}` blocks (`api/manuscript.ts`, `api/segments.ts`, `api/prompts.ts`) are legitimate `readErrorBody` fallbacks that return a typed message rather than silent swallows — Dashboard already surfaces every fetch error through an `*Error` state with a Retry button. This spec therefore performs a confirmatory sweep of the full `web/src/` tree (no genuine swallow targets are expected; surface any newly-discovered `try {} catch {}` / swallowed rejection / `?? []`-after-failed-fetch as an error state if found) and keeps AC#6 as a regression guard. The active cleanup landed with SPEC-105 — this deliverable does not re-do it.

5. **Unsaved-change handling.** New hook `web/src/hooks/useUnsavedChanges.ts`:
   - Tracks a "dirty" flag derived from comparing the current form state to the last-saved snapshot.
   - On `window.beforeunload`, prompts the browser's native unsaved-changes confirmation when dirty.
   - On in-app navigation (React Router transitions), uses `useBlocker` to prompt a confirmation modal.
   - Reset on successful save.
   
   Apply the hook to:
   - `MomentComposer.tsx`'s directive + selected cast/records.
   - `EditContract.tsx`'s contract fields.
   - `RecordForm.tsx`'s record editor.
   - `BeatTemplateForm.tsx`'s template editor.
   - `EditCurrentContext.tsx`'s context form (SPEC-109).

   **Not** applied to `Dashboard.tsx`'s directive draft: that input is unsaved-by-design scratch state (`Dashboard.tsx:38`, no save handler — the placeholder reads "saved by SPEC-102" but nothing persists it here), so the hook's reset-on-save can never fire and an in-app blocker would prompt on every navigation after typing. `MomentComposer.tsx` is where the directive is actually consumed and is covered above.

6. **Dashboard cockpit reshape.** The Dashboard's primary surface becomes the Current State panel from SPEC-109. Below it:
   - "Recent segments" panel (last 3 segments by ID + title + word count + timestamp).
   - "Active prompt artifacts" (last 3 prompts with link to Prompt Preview / Prompt History).
   - "Story contract status" (Edit Contract link with a summary chip — premise filled / tone set / content-policy locked).
   - The importance-bucketed records panel from the current Dashboard becomes a secondary disclosure-style section labeled "Browse records by importance."

7. **Acceptance tests** (test approach scaled to the current web-test step's `tsc --noEmit`-only baseline):
   - The `useUnsavedChanges` hook unit-tests at the backend level (the hook is pure logic; mount it under Node `test` with a minimal React testing scaffold OR keep the test as a static-analysis check confirming the hook is applied to the named components).
   - Snapshot or DOM-level tests for `<HealthBanner />` rendering are out of scope until the web package gains a browser-like test harness — covered by the report's §17 "promote acceptance layer" recommendation, which this spec touches but does not deliver a full harness for.
   - The minimum bar: the `tsc --noEmit` step remains green; manual verification against the four scenarios in §6 confirms the load-bearing surfaces work.

### Out of scope

- Keyboard shortcuts (`Cmd/Ctrl+Enter` compose, `Cmd/Ctrl+Shift+C` copy if clean, `Cmd/Ctrl+S` save, `g d` / `g p` / `g m` page jumps) — **deferred** to a follow-up spec.
- `/` quick record search — **deferred** to the same follow-up.
- Full single-page cockpit (left rail current state + center directive/templates + right rail leakage/prompt health + below prompt preview) — **deferred**. The component pieces this spec ships (HealthBanner, StoryPageNav, CurrentStatePanel from SPEC-109) compose into that layout when the follow-up lands.
- Browser-like web acceptance test harness (the report §17 recommendation) — **deferred** to a tooling spec; the present spec works within `tsc --noEmit`.
- Dashboard restructure beyond the four-panel layout above — defer further restructure until the author uses the new Dashboard and surfaces concrete UX gaps.
- Backend route changes — none; all frontend.

## 3. Key decisions

- **Mount StoryPageNav at the App.tsx level, conditional on URL, beside the existing HealthBanner.** Mounting per-page would duplicate the integration cost; conditionally rendering at the App level keeps the per-page code clean. The condition is "URL matches `/worlds/:worldSlug/manual-stories/:msSlug/*`" — reuse the route-parsing discipline landed by SPEC-105.

- **Hide IDs from primary labels; keep them in form fields.** The primary cockpit surface should read like prose (title + summary); the editor surface, where the author explicitly manages typed references, can show IDs because the IDs are the authoring artifact in that context.

- **Use React Router's `useBlocker` for in-app navigation, browser's native dialog for tab close.** Native dialogs cannot be styled; in-app modals can — using both gets the right UX in each context.

- **The unsaved-change hook is small, pure logic.** No external dependencies; just a `useState` for the dirty flag, a `useEffect` to set up `beforeunload` and `useBlocker`, a reset on save. Testing it without a browser harness is possible because the logic does not touch the DOM beyond event listeners.

- **Dashboard reshape is small and additive.** The new layout puts CurrentStatePanel first, then three additive sections. The existing importance-bucketed records panel moves to a disclosure but is not deleted — the author still has the surface, just not as the primary view.

- **Defer keyboard shortcuts.** They are a real win, but they cohere best after the navigation discipline (StoryPageNav) and the new Dashboard layout settle. Authors who use the cockpit with these pieces will surface which shortcuts are actually load-bearing; speculative shortcut authoring without that signal risks shipping the wrong four bindings.

- **No backend changes.** Every piece in this spec is frontend-only. The cleanest dependency line is SPEC-105 + SPEC-109 → SPEC-111.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/web/src/components/StoryPageNav.tsx` — tab/nav strip per §2 item 2.
- `tools/manual-story-studio/web/src/hooks/useUnsavedChanges.ts` — dirty-flag hook + navigation blocker per §2 item 5.
- `tools/manual-story-studio/web/src/hooks/useStoryRouteMatch.ts` — small helper for the App-level mount condition. **Extract** the existing `parseStoryPath` route-matcher from `HealthBanner.tsx` (lines 18–34, landed by SPEC-105) into this shared helper rather than authoring a parallel matcher, and refactor `HealthBanner` to consume it, so there is a single source of the per-story URL match (`StoryPageNav` + `HealthBanner` both use it).
- `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` — hook unit test (or static-analysis check per §2 item 7).

**Modify:**

- `tools/manual-story-studio/web/src/App.tsx`:
  - Preserve the existing `<HealthBanner />` mount from SPEC-105.
  - Mount `<StoryPageNav />` below the health banner, conditional on per-story URL.
  - Remove the existing single-link `<nav>` block; world-level nav (back to Worlds) lives in the per-story banner.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx`:
  - Remove the MSSUX-006 Dashboard-local `<nav aria-label="story-pages">` block (`Dashboard.tsx:184–210`); the App-level `<StoryPageNav />` (§2 item 2) supersedes it.
  - Promote `<CurrentStatePanel />` (already imported and rendered at `Dashboard.tsx:212`) to the top of the page.
  - Add Recent Segments, Active Prompt Artifacts, Contract Status panels.
  - Move importance-bucketed records into a disclosure block.
  - Hide cast/record IDs from primary labels per §2 item 3.
  - (The directive draft input is **not** wrapped in `useUnsavedChanges` — see §2 item 5's exclusion note.)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` — apply `useUnsavedChanges`; audit ID rendering in record-selection panels and hide as primary labels.
- `tools/manual-story-studio/web/src/pages/Records.tsx` — audit; record row labels render `title` primarily, ID as small disclosure.
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` — audit; cast row labels render `title` (character name) primarily, ID as small disclosure.
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` — audit; template row labels render `title` primarily, ID as disclosure.
- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` — audit; prompt IDs may remain visible here (this page IS the artifact-management surface), but ensure they are not duplicated in non-disclosure labels.
- `tools/manual-story-studio/web/src/pages/EditContract.tsx` — apply `useUnsavedChanges`.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` — apply `useUnsavedChanges`.
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` — apply `useUnsavedChanges`.
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (from SPEC-109) — apply `useUnsavedChanges`.
- `tools/manual-story-studio/web/src/components/HealthBanner.tsx` — refactor to consume the extracted `useStoryRouteMatch` helper (per §4 Create); behavior-preserving (no change to when the banner shows/hides).
- `tools/manual-story-studio/web/src/index.css` — styles for the new nav strip, health banner positioning, ID-disclosure subscript visual treatment.

**Survey + selective fixes (silent-error sweep):**

- All `web/src/api/*.ts` — every fetch wrapper that returns `null` or `[]` on error should instead throw or return a typed error, surfaced by the consumer.
- All `web/src/pages/*.tsx` — every `?? []` / `?? null` on the result of an async call should be audited; replace silent fallbacks with explicit error states.

**No modification to:**

- Backend routes — none.
- Beat-template / record schema — none.
- Prompt section helpers — none.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Tooling Recommendation (least-privilege LLM packets) | aligns @ ID hiding | Hiding internal IDs from the cockpit's primary surface reduces the chance the author inadvertently types one into the directive — defense-in-depth against the prompt-leakage surface SPEC-106 hard-tiers. |
| §Soft Canon / Local Truth (must be explicit and validated) | aligns @ health banner | The persistent health banner makes local-truth integrity visible across every per-story page; corruption surfaces on entry, not on the specific page that reads the corrupt resource. |
| Rule 6 No Silent Retcons | aligns @ unsaved-change hook | The unsaved-change discipline prevents silent loss of authoring work (in-progress directive, contract edit, record edit) to an accidental navigation. The hook makes the change visible at the moment of potential loss. |
| §Story Bundles §4 Write Discipline (deterministic write surface) | aligns by analogy @ frontend | Unsaved-change handling makes writes explicit and deliberate; the analog at the UI layer of FOUNDATIONS' write-discipline at the canon layer. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No canon facts engaged. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs the unit test for `useUnsavedChanges` and any static-analysis check; `tsc --noEmit` remains green.

Manual verification scenarios (each gates a §7 acceptance criterion):

1. **Health banner persistence.** Corrupt a fixture's `manual-story.yaml`; open Dashboard; banner visible. Navigate to Records; banner still visible. Navigate to Worlds (out of per-story URL); banner hidden. Fix the YAML; re-fetch; banner hides.
2. **Sibling-page nav.** From Dashboard, click the Records tab; URL changes; Records page renders; active tab shifts. Test from each starting page.
3. **ID hiding.** Dashboard cast panel shows character names (`Mara`, `Iven`), not `mchar-1` / `mchar-2`. Hover an entry; ID appears as a subscript. The same name renders in the directive picker on Moment Composer, no IDs as primary labels.
4. **Unsaved-change confirmation.** Edit the directive on Moment Composer; without saving, click Worlds; confirmation modal appears; cancel → stay on page; confirm → navigate. Save first; navigate; no confirmation.

## 7. Acceptance criteria

1. `<HealthBanner />` renders on per-story URLs matching `/worlds/:worldSlug/manual-stories/:msSlug/*` when health is degraded or blocked, and is hidden when status is `ok` or the URL is off-pattern (its landed behavior — `HealthBanner.tsx:41` returns `null` unless on a per-story path and `status !== "ok"`). (verified by manual scenario 1)
2. `<StoryPageNav />` mounts under the same condition; tabs link to all per-story pages; active tab reflects current route. (manual scenario 2)
3. Dashboard's primary cast/record labels render `title` strings; IDs hidden by default and visible only as disclosure subscript or on hover. (manual scenario 3; verified by grep that the current primary-label ID tokens in `Dashboard.tsx` — `{c.id}` in the cast panel (line 299), `{cls}/{record.id}` as the high-importance link text (lines 322–328), and `{latestSegment.id}` (line 391) — no longer appear as primary labels)
4. `useUnsavedChanges` is applied to MomentComposer directive+selections, EditContract form, RecordForm, BeatTemplateForm, EditCurrentContext form. The Dashboard directive draft is intentionally excluded (unsaved-by-design — see §2 item 5). (verified by grep)
5. In-app navigation with unsaved changes triggers a confirmation modal; tab close triggers the browser's native dialog; successful save resets the dirty flag. (manual scenario 4)
6. No `.catch(() => {})` patterns remain in `tools/manual-story-studio/web/src/` — a regression guard confirming SPEC-105's cleanup stays intact (already zero at reassessment time, 2026-06-02; this spec adds none). (verified by grep)
7. Dashboard renders Current State panel (from SPEC-109) at top, followed by Recent Segments, Active Prompt Artifacts, Contract Status; importance-bucketed records moves to a disclosure block. (manual verification)
8. The `web/` `tsc --noEmit` step remains green; existing backend tests pass.

## 8. Assumption reassessment

- **Resolved (2026-06-02):** React Router's `useBlocker` is available — `tools/manual-story-studio/web/package.json` declares `react-router-dom: ^6.27.0` (installed 6.30.4), and `useBlocker` is present in the built package. No upgrade or `unstable_usePrompt` / `history.block` fallback is needed.
- **Assumption:** Every page that should show the sibling-page nav is enumerated by the `StoryPageNav` tab list. → Verify by enumerating every `<Route>` under the per-story prefix in `App.tsx`. Any page missing from the tab list (e.g., a future per-story page added without nav update) will be invisible. Reassessment (2026-06-02) found the `/contract` route (`App.tsx:86`, `EditContract`) absent from the §2 item 2 list and added it; re-verify against `App.tsx` at implementation time in case further per-story routes have landed.
- **Assumption:** Hiding IDs from primary labels does not break any test that asserts a specific text. → Verify by searching test assertions for ID-shaped substrings; update any tests that previously matched on `mchar-N` text to match on title text instead.
- **Assumption:** The Dashboard's `useEffect` data fetches do not implicitly assume the order of panels. → Verified by reading `Dashboard.tsx` — the four data fetches are independent; reordering panels does not affect data flow.
- **Assumption:** The current SPEC-109 `EditCurrentContext.tsx` page is present when this spec lands. → Spec ordering: this spec depends on SPEC-109; if SPEC-109 has not landed, defer this spec's EditCurrentContext changes until it does. The other pieces (banner, nav, ID hiding, unsaved-change hook on other forms) land independently.
