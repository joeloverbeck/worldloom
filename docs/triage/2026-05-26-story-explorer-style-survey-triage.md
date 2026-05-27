# Story Explorer style survey — triage (2026-05-26)

**Trigger**: User request to survey explorer UI surfaces beyond the prose-legibility fix (STOEXPFIX-004) and the chip-duplication fix (STOEXPFIX-005). Both prior tickets have landed; this triage covers the surfaces examined afterward to identify remaining style / presentation issues.

**Method**: Live puppeteer survey of the dev server at `http://127.0.0.1:5174/` across the worlds list (`/`), stories list (`/worlds/erotica-world/stories`), page entry route (`/worlds/erotica-world/stories/red-bunny/entry`), page-detail route (`/worlds/erotica-world/stories/red-bunny/pages/PG-5` and `/pages/PG-1` for non-leaf), and all four X-Ray tabs (Current State / What Changed Here / Plan & Prose / Validation & Integrity), supplemented by code inspection of error/loading surfaces (`NotFoundPage.tsx`, `RouteLoading.tsx`, `BackendUnreachablePage.tsx`).

**Classification**: tooling-adjacent (UI cosmetics of a read-only viewer). **FOUNDATIONS engagement**: none — all findings are presentation-layer; no canon storage, validator, or any of the thirteen concerns engaged.

**Deliverables**:

- `archive/tickets/STOEXPFIX-006-collapse-hidden-xray-tab-panels.md`
- `archive/tickets/STOEXPFIX-007-prevent-uninformative-duplicated-stchar-summary.md`
- `archive/tickets/STOEXPFIX-008-differentiate-groups-toc-from-active-records-metrics.md`
- `archive/tickets/STOEXPFIX-009-style-route-loading-and-not-found-back-link.md`

**Triage origin**: triage flow producing 4 tickets (≥3 → companion triage file is mandatory per `references/deliverable-classification.md` §Triage-file composition). **Source-item count**: 11 evaluated findings (5 accepts grouped into 4 tickets, 2 already-resolved, 1 defer, 2 out-of-report — see breakdown below). Above the ≥8-item carve-out threshold even without that threshold mandate.

## Accept → tickets

### A1 (→ STOEXPFIX-006): Hidden X-Ray tab panels still consume `min-height: 8rem`

- **Surface**: `tools/story-explorer/web/src/styles/app.css:631-635`
- **Mechanism**: `.xray-tab-panel { display: grid; min-height: 8rem; }` overrides the `[hidden]` HTML attribute's implicit `display: none`, so the three hidden panels each render at 128px and produce ~384px of dead vertical space below the tabs strip on every X-Ray tab view. Verified by puppeteer evaluation: `querySelectorAll('.xray-tab-panel')` returned 4; three reported `hasAttribute('hidden') === true` AND `getBoundingClientRect().height === 128`.
- **Verdict**: accept — narrow CSS fix, high visual impact, clear root cause.
- **Modification scope**: single CSS rule `.xray-tab-panel[hidden] { display: none; }` appended to the existing `.xray-tab-panel` block.

### A2 (→ STOEXPFIX-007): STCHAR record cards show uninformative duplicated `active` text

- **Surface**: `tools/story-explorer/src/read/record-card.ts:289-310` (summaryLine walker) + `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx:243-251` (STCHAR CompactLine)
- **Mechanism**: The summaryLine walker selects `status` as a fallback summary string when title/name/display_name are absent (because STCHAR's `primaryFields[3] === "status"`), producing the bare enum value `active` as the summary. The CompactLine renderer then composes `[recordId, title(recordCard), maybe('STENT', ...), maybe('CHAR', ...), fieldValue('supersessionStatus'), ...]` where `title()` falls back to the summaryLine (= `active`) AND `supersessionStatus` is independently `active` for status-active STCHAR records — producing `STCHAR-1 · active · STENT 1 · CHAR CHAR-0003 · active`. The `<p class="record-card__line">` below the title renders the same summaryLine, a third visible `active`.
- **Verdict**: accept — two coupled causes, two surgical fixes, single ticket.
- **Modification scope**: (a) `summaryLine` walker filters literal `status` fields out of both fallback summary passes; (b) STCHAR CompactLine drops the `title()` slot at position 2. Post-implementation review narrowed the drafted `rule.statusField`-wide wording because existing STSTAT `life` summaries are intentional.

### A3 (→ STOEXPFIX-008): Summary rail's "Active Records" and "Groups" lists look duplicated

- **Surface**: `tools/story-explorer/web/src/components/xray/StickyRail.tsx:34-60` + `tools/story-explorer/web/src/styles/app.css:588-601`
- **Mechanism**: Two semantically distinct lists (metrics vs jump-to-anchor navigation) render with the same eight labels stacked vertically. The Groups TOC links have no link affordance (`color: var(--color-text-secondary)` matching ambient text, `text-decoration: none`), so the user reads the second list as a redundant duplicate rather than navigation.
- **Verdict**: accept-with-modification — functional purpose is correct, only visual treatment masks the distinction.
- **Modification scope**: rename heading to `Jump to group`, give the TOC links accent color + underline + hover state.

### A4 (→ STOEXPFIX-009): RouteLoading and NotFoundPage back-link missing CSS

- **Surface**: `tools/story-explorer/web/src/components/RouteLoading.tsx:18-27` + `tools/story-explorer/web/src/components/NotFoundPage.tsx:24-26` + `tools/story-explorer/web/src/styles/app.css`
- **Mechanism**: `.route-loading`, `.route-loading__mark`, and `.route-error__link` are referenced in JSX but have no CSS rule (`grep` returns empty). The loading indicator renders as default body-styled text ("Loading"), with no centering, framing, or motion cue. The NotFoundPage back-link renders as a bare body link, not the button-shaped CTA the surrounding error frame implies — compare `BackendUnreachablePage.tsx` which uses `<button>` and benefits from `.route-error button` styling at `app.css:1202-1217`.
- **Verdict**: accept — purely additive CSS.
- **Modification scope**: add three CSS blocks — `.route-loading` (grid centering + monospace text + min-height), `.route-loading__mark` (card outline + pulse animation respecting `prefers-reduced-motion`), and `.route-error__link` (button-shaped accent CTA mirroring `.route-error button`).

## Already-resolved (2)

### R1: Branch map and Page jump buttons are inert

- **Surface**: `tools/story-explorer/web/src/components/PageHeader.tsx:42-47`
- **Observation during survey**: clicking either button did nothing — no `onClick` handler, no navigation, no dialog, no `aria-expanded` toggle.
- **Resolution**: covered by `specs/SPEC-90-story-explorer-branch-map-and-search.md` §5 (Frontend — branch map drawer) and §6 (Frontend — page-search modal). The inert buttons are intentional placeholders awaiting SPEC-90 implementation. No new ticket required.

### R2: `STENT 1` and `CHAR CHAR-0003` patterns in STCHAR title (initially misclassified)

- **Surface**: `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx:247-248`
- **Observation during survey**: title fragments looked like stripped-hyphen record IDs.
- **Resolution**: closer reading of `RecordCardRenderers.tsx:247-248` revealed `maybe('STENT', linkCount(recordCard, 'STENT'))` (label + count) and `maybe('CHAR', fieldValue(recordCard, 'sourceChar'))` (label + ID). The pattern is intentional `<label> <value>` rendering. Not a bug.

## Defer (1)

### D1: Plan & Prose tab shows absolute filesystem path

- **Surface**: `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` (line surfacing the inlined plan path)
- **Observation**: the plan body shows `/home/joeloverbeck/projects/worldloom/worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-5.md`. May be intentional debug info for power users, or may leak the developer's home directory in shared screenshots.
- **Defer rationale**: ambiguous between debug affordance and presentation leak. User direction needed before ticketing.
- **Lift condition**: user signals whether the path should be made repo-relative, hidden, or kept verbatim.

## Out-of-report findings (2)

### O1: Worlds list / stories list / page entry routes have no breadcrumb

- **Surface**: `tools/story-explorer/web/src/routes/worlds.tsx`, `routes/stories.tsx`, `routes/page-entry.tsx`
- **Observation**: the page-detail route uses `<Breadcrumb>` (`page-read.tsx:74-82`) for `Worlds > Erotica World > red-bunny > Branch BR-1 > PG-5 > Parent: PG-4`. The other three routes display a small kicker (e.g., `erotica-world`) above the H1, but no clickable breadcrumb back to upstream routes. Users rely on browser back navigation.
- **Out-of-report rationale**: could be intentional minimalism for shallow routes; not a clear bug. Flagged for future direction.

### O2: Bare `/worlds/:slug/stories/:storySlug` URL renders blank

- **Surface**: `tools/story-explorer/web/src/app.tsx:60-95` (router configuration)
- **Observation**: navigating to `/worlds/erotica-world/stories/red-bunny` (without the `/entry` suffix) yields a completely blank page — no 404 fallback for this unmatched nested route. The story-list page card links to `/worlds/.../stories/.../entry` correctly, so this URL is unreachable from any UI link.
- **Out-of-report rationale**: edge case only reached by manual URL editing. Could be addressed alongside a future general 404 fallback (or by adding a redirect `:storySlug → :storySlug/entry`). Not a stylistic issue per se.

## Cross-finding observations

- **No FOUNDATIONS principle is engaged by any finding.** The story-explorer is a read-only human surface over `_source/` records; presentation-layer changes do not touch canon storage, validators, the thirteen concerns, or the seven validation rules. The pre-authorization condition ("aligned with FOUNDATIONS.md") is satisfied trivially: no violation.
- **All four tickets target the frontend web package** (`tools/story-explorer/web/src/...`) except STOEXPFIX-007 which also touches the backend view-model (`tools/story-explorer/src/read/record-card.ts`).
- **No dependencies between tickets.** Each can land independently; no implementation order required.
- **No `specs/IMPLEMENTATION-ORDER.md` update.** This is not spec-driven work; the tickets are surface-cleanup units that compose in any order. The implementation-order ledger is for cross-spec sequencing.

## Sign-off

Triage prepared by the brainstorm skill in response to user direction (continued from STOEXPFIX-004 / STOEXPFIX-005 sessions). User pre-authorization for tickets contingent on FOUNDATIONS alignment held throughout. Four tickets written and the user explicitly approved the "All 5 + companion triage file" scope (later corrected to four tickets after the operator recounted accepts).
