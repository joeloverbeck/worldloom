# MSSUX-001: Baseline stylesheet for Manual Story Studio web

**Status**: ✅ COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The Manual Story Studio web app at `tools/manual-story-studio/web/` ships zero CSS. `web/src/main.tsx` and `web/src/App.tsx` import no stylesheet, no CSS file exists anywhere under `web/src/`, and the `index.html` head carries no `<link rel="stylesheet">`. The `manual-studio-banner` className on `web/src/App.tsx:18` and the `manual-dashboard` className on `web/src/pages/Dashboard.tsx:144` are dangling — no rule defines them. Visited at `http://localhost:5176/`, the studio renders with raw browser defaults: serif headings, default-blue links, unpadded lists, no layout container, banner stacked above content with no separation.

The result is an authoring cockpit that is functionally usable but visually illegible — there is no spacing scale, no card affordance for the section blocks the dashboard already structures with `<section aria-label="...">`, and no banner styling to distinguish the persistent boundary-disclosure ("World canon: read-only", "External LLM: not connected") from the working surface.

This ticket adds a single baseline stylesheet — a small, hand-written, dependency-free `index.css` — imported once from `main.tsx`. No design system, no CSS-in-JS, no Tailwind, no component library. The stylesheet binds to the className surfaces already present in the existing JSX so no page component needs to change.

## Assumption Reassessment (2026-05-31)

1. `tools/manual-story-studio/web/` contains no `.css` files: confirmed via `find tools/manual-story-studio/web -name "*.css" -not -path "*/node_modules/*" -not -path "*/dist/*"` (empty). `web/src/main.tsx` and `web/src/App.tsx` contain no stylesheet imports; `web/index.html` head has no `<link>` element.
2. The classNames already in JSX that the stylesheet must honor: `manual-studio-banner` (`web/src/App.tsx:18`) and `manual-dashboard` (`web/src/pages/Dashboard.tsx:144`). Both are unstyled today. The dashboard also carries `<section aria-label="story-contract|directive-draft|active-cast|high-importance|open-tracking|latest-segment|manuscript-word-count|generate-prompt">` semantic landmarks that the stylesheet can hook via attribute selectors without JSX changes.
3. No cross-skill or cross-artifact contract is touched. This is purely a frontend-asset addition inside `tools/manual-story-studio/web/`.
4. FOUNDATIONS principle under audit: §Tooling Recommendation does not regulate human-authoring UI surfaces; the discipline applies to LLM agent inputs (context packets, validators, hooks). Manual Story Studio is explicitly outside the canon pipeline per SPEC-100 §3 Key decisions and its own README §Stack — no LLM, no MCP, no patch engine. Adding a stylesheet to its web surface does not interact with any FOUNDATIONS-enforced contract.
5. No HARD-GATE, canon-write ordering, or Canon Safety Check surface is touched. The Manual Studio web surface at `tools/manual-story-studio/web/**` is not a Hook 3, Hook 2, or validator-governed path (verified at SPEC-100 §3 Key decisions; restated in `tools/manual-story-studio/README.md` §Verified posture).
6. No output schema (CF Record, Change Log Entry, proposal card, character dossier, diegetic artifact) is extended or modified.
7. No skill, tool, hook, validator, or schema field is renamed or removed.
8. No adjacent contradictions exposed during reassessment.

## Architecture Check

1. A single hand-written `index.css` is cleaner than adding a CSS framework (Tailwind, MUI, Chakra) because (a) the studio has 12 pages, each with ~10 className surfaces — a framework's runtime/build-time cost dwarfs the asset; (b) Manual Studio's "deterministic, no-dependency drift" posture in SPEC-100 §3 favors small dependency surface area; (c) the JSX already uses ARIA landmark selectors (`section[aria-label]`) that bind well to attribute CSS selectors without extra className plumbing.
2. No backwards-compatibility aliasing or shims are introduced. The change is purely additive: one new file, one new import.

## Verification Layers

1. Stylesheet is loaded by the SPA at runtime -> manual review (open `http://localhost:5176/`, confirm the banner and main content are visually separated; the previous raw-defaults appearance is gone).
2. Frontend typecheck still passes -> `cd tools/manual-story-studio/web && npm test` (the package's `test` script is `tsc --noEmit`; the new CSS file is not TypeScript so it must not introduce a TS error).
3. Production build still succeeds with the CSS imported -> `cd tools/manual-story-studio/web && npm run build` (Vite bundles imported CSS into the final asset graph; a missing or malformed import will fail the build).

## What to Change

### 1. Create `tools/manual-story-studio/web/src/index.css`

A baseline stylesheet covering:

- **Root tokens**: a small CSS custom-property block on `:root` for spacing (`--space-1` through `--space-6`), neutral palette (background, surface, border, text-primary, text-muted), a single accent color for links/buttons, and one font-family declaration.
- **Element resets**: `body { margin: 0; font-family: var(--font-sans); background: var(--bg); color: var(--text); }`, sensible `box-sizing: border-box` on `*`, and link / button defaults that pick up the accent color.
- **Layout shell**: a max-width content container (`main { max-width: 64rem; margin: 0 auto; padding: var(--space-4); }`) so pages don't run edge-to-edge on wide screens.
- **Banner styling**: `.manual-studio-banner` rendered as either a top header strip or a left-edge fixed sidebar — pick the header strip for first cut (smaller diff to App.tsx layout, no flex/grid restructuring). Visually distinct background, smaller condensed text, the "External LLM: not connected" line de-emphasized.
- **Top nav strip**: style the existing `<nav>` element in `App.tsx` with horizontal layout, padding, and a separator from the content below. Keep the single "Worlds" link from being indistinguishable from running text.
- **Section cards**: bind `main section, main section[aria-label]` to a card affordance — light surface background, subtle border, padding, and margin-bottom. This gives the dashboard its grid-of-blocks look without requiring `web/src/pages/Dashboard.tsx` to add new classNames (the JSX already wraps each pane in `<section aria-label="...">`).
- **Lists and tables**: tighten `ul, ol, dl` spacing and align `dt`/`dd` pairs in the dashboard "Story contract" panel.
- **Forms**: pad and align `<label>` + `<input>` rows in `CreateManualStory.tsx`; style `<button>` with the accent color, hover state, and `:disabled` opacity.
- **Status messages**: `[role="alert"]` gets a warning-tinted background; `[aria-busy]` and the loading paragraphs (`<p>Loading worlds…</p>`) get a muted color.

Aim for under ~150 lines of CSS. No vendor prefixes (Vite + browserslist defaults handle them).

### 2. Import the stylesheet from `tools/manual-story-studio/web/src/main.tsx`

Add `import "./index.css";` as the second import line, before the `App` import (CSS first, components after — the standard Vite convention). The existing `createRoot(rootElement).render(...)` block is unchanged.

## Files to Touch

- `tools/manual-story-studio/web/src/index.css` (new)
- `tools/manual-story-studio/web/src/main.tsx` (modify — add one import line)

## Out of Scope

- Restructuring `App.tsx` to introduce a `<Layout>` shell or persistent in-story tab strip — that is Approach C from the brainstorm, deferred to a separate spec.
- Adding new classNames to existing page components beyond what the stylesheet binds via `aria-label` attribute selectors and existing classNames.
- Theming, dark mode, or user-configurable color schemes.
- Importing a CSS framework or component library.
- Visual regression testing infrastructure (Playwright screenshots, Chromatic, etc.).
- Styling the Beat Templates / Moment Composer / Records / Manuscript / Prompt History / Paste Prose / Cast & Profiles pages beyond what the global `section` + form + table rules already cover. Page-specific polish, if needed, is a follow-up.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — passes (frontend typecheck).
2. `cd tools/manual-story-studio/web && npm run build` — passes (Vite production build bundles the CSS without error).
3. `cd tools/manual-story-studio && npm test` — passes (the full studio chain: backend build + backend tests + web typecheck).

### Invariants

1. `tools/manual-story-studio/web/src/index.css` exists and is imported exactly once from `main.tsx`.
2. No JSX file under `web/src/` is modified for styling-only purposes in this ticket (other than `main.tsx`'s single new import line) — the stylesheet binds to existing classNames and ARIA landmarks.
3. No runtime CSS dependency is added to `web/package.json` — `dependencies` and `devDependencies` remain unchanged.

## Test Plan

### New/Modified Tests

1. `None — visual-presentation ticket; verification is the existing typecheck/build chain plus a manual-review pass against the running dev server (no automated visual regression infrastructure exists for this package).`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio/web && npm run build`
3. `cd tools/manual-story-studio && npm test`
4. Manual review: `cd tools/manual-story-studio/web && npm run dev`, open `http://127.0.0.1:5176/`, confirm: banner is visually separated, lists have card-like surfaces, the worlds list is clearly clickable, the dashboard renders as a grid of distinct blocks rather than a single column of running text.

## Outcome

**Completion date**: 2026-05-31

**What changed**:
- `tools/manual-story-studio/web/src/index.css` (new, ~178 lines): hand-written baseline stylesheet covering `:root` design tokens (spacing scale, neutral palette, accent, warning palette, font stack), element resets (`box-sizing`, body, links, buttons, inputs/textareas/selects with focus-visible outlines), the `.manual-studio-banner` top-strip styling, `<nav>` separator, `<main>` max-width container, `main section`/`section[aria-label]` card affordance with nested-section variant for the `<section>` inside `Worlds.tsx`'s outer wrapper, dl/dt/dd grid alignment for the Story Contract panel, form label/input vertical stacks, `[role="alert"]` warning surface, and `[aria-busy]` / muted-loading-text styling. Zero dependencies added.
- `tools/manual-story-studio/web/src/main.tsx`: added `import "./index.css";` between the react/react-dom imports and the App import, matching the standard Vite convention.

**Deviations from plan**:
- Stylesheet is ~178 lines instead of the planned "under ~150" — the extra lines come from adding distinct nested-section surface tinting (so `main section section` doesn't blend with the outer card), button focus-visible state, input/select/textarea base styling, and a max-width cap on form inputs so they don't stretch to the full card width. All within the ticket's stated surface; no new component classes invented.
- No JSX file under `web/src/` was modified for styling-only purposes other than `main.tsx`'s one-line import addition — consistent with Invariant #2.

**Verification results**:
- `cd tools/manual-story-studio/web && npm test` (`tsc --noEmit`) passes.
- `cd tools/manual-story-studio/web && npm run build` passes — Vite bundles `dist/assets/index-*.css` at 2.96 kB / 1.06 kB gzipped, 60 modules transformed in 662 ms.
- `cd tools/manual-story-studio && npm test` (full studio chain: backend build + 342 backend tests + web typecheck) passes — 342/342 tests pass.
- `web/package.json` `dependencies` and `devDependencies` are unchanged (Invariant #3).
