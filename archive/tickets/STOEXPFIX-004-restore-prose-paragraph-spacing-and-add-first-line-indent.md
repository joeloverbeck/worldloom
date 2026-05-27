# STOEXPFIX-004: Restore prose paragraph spacing and add first-line indent

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — CSS-only change to `tools/story-explorer/web/src/styles/`
**Deps**: None

## Problem

At intake, on any page-detail route (e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-5`), the Prose section rendered all paragraphs flush together: no vertical gap between paragraphs and no first-line indent. The result was a single uninterrupted column of text that was hard to parse — the reader could not tell where one paragraph ended and the next began.

Root cause at intake: the `.prose` block lives inside `.reading-section.prose-section` (per `tools/story-explorer/web/src/routes/page-read.tsx`). The selector `.reading-section p { margin: 0 }` in `tools/story-explorer/web/src/styles/app.css` was written to zero margins on the small descriptive copy `<p>` rendered directly inside `.reading-section` (e.g., the "No navigable choices from this page." line in `page-read.tsx`). But its specificity (0,1,1: one class + one tag) was higher than the prose-paragraph-spacing rule `.prose > * + * { margin-block-start: var(--space-4) }` in `tools/story-explorer/web/src/styles/prose.css` (specificity 0,1,0: one class + universal selectors). So every prose paragraph got `margin-block-start: 0px`. Intake puppeteer DOM inspection on the PG-5 route reported all 20 `.prose > p` elements with computed `margin-block-start: 0px` and `text-indent: 0px`.

Additionally, the user wanted a slight first-line indent on prose paragraphs (a typographic flourish to reinforce paragraph boundaries); at intake, `text-indent` was `0` on all prose paragraphs.

## Assumption Reassessment (2026-05-26)

1. At intake, `app.css` defined `.reading-section p, .summary-rail p { margin: 0; color: var(--color-text-secondary); }`. The `.reading-section p` descendant selector reached into `.prose`, which is nested two levels deep (`.reading-section > .prose-panel > .prose > p`). This was confirmed by the rendered DOM via puppeteer (`proseAncestorChain` showed `DIV.prose → DIV.prose-panel → SECTION.reading-section.prose-section`).
2. `prose.css` defines `.prose > * + * { margin-block-start: var(--space-4); }`. The `var(--space-4)` resolves to `1rem` (tokens.css). The selector matches every prose `<p>` after the first; at intake, it was being overridden by higher specificity, not failing to match.
3. The only direct-child `<p>` of `.reading-section` in `routes/page-read.tsx` is the empty-state line (`<p>No navigable choices from this page.</p>`). Scoping `.reading-section p` to `.reading-section > p` preserves the intended styling for that line and stops the rule from reaching into `.prose`.
4. The `.summary-rail p` half of the selector pair was tightened to `.summary-rail > p` alongside `.reading-section > p`. The summary rail does not embed `.prose`, so the descendant-vs-direct-child distinction is operationally moot there, but the paired direct-child selector keeps the CSS intent explicit.
5. No FOUNDATIONS principle or Validation Rule is engaged. The story-explorer is a read-only human surface over `_source/` records; prose rendering is presentation, not canon storage or validation. The thirteen concerns and the seven validation rules are silent on UI typography.
6. The existing `.xray-markdown-body` panel (`app.css:721-732`) already opts paragraphs into separation via `gap: var(--space-2)` on a grid container. That is a parallel pattern but does not apply to `.prose`, which uses block flow and relies on `margin-block-start` instead.
7. The drafted `pnpm --filter @worldloom/story-explorer-web ...` proof commands are stale for this checkout: the repo root has no `package.json`, while `tools/story-explorer/web/package.json` defines package-local `npm test` and `npm run build`. The accepted proof surface is therefore package-local `npm test` plus `npm run build` from `tools/story-explorer/web`.
8. `tools/story-explorer/web` has no package-local README or markdown usage document, so no same-package docs/examples surface needs updating for this CSS-only behavior.

## Architecture Check

1. Tightening `.reading-section p` to `.reading-section > p` is the minimum surgical fix: it preserves the original intent (empty-state copy looks like ambient secondary text) while no longer reaching into descendant subtrees. The alternative — bumping `.prose > * + *` specificity (e.g., to `.prose-panel .prose > * + *`) — is a workaround for an over-broad selector rather than a fix to the root cause.
2. No backwards-compatibility shims. The change is purely CSS scoping and a new typographic rule.
3. `text-indent` is added on `.prose p` with the conventional first-paragraph-after-heading exception (`.prose > *:first-child`, `.prose > :is(h1,h2,h3,h4,h5,h6) + p`). This honors the typographic norm that the opening paragraph of a section is not indented, while interior paragraphs are.

## Verification Layers

1. Prose paragraph cascade is restored: `.prose > p:nth-child(2)` resolves to `margin-block-start: var(--space-4)` and `text-indent: 1em` in the jsdom CSS cascade probe.
2. Opening/after-heading indent exceptions are preserved: `.prose > p:first-child` and `.prose > h2 + p` resolve to `text-indent: 0` in the jsdom CSS cascade probe.
3. The empty-state direct-child `<p>` in `routes/page-read.tsx` ("No navigable choices from this page.") remains scoped by `.reading-section > p` with `margin: 0px` and `color: var(--color-text-secondary)` in the jsdom CSS cascade probe.
4. Existing `tools/story-explorer/web/src/components/ProsePanel.a11y.test.tsx` still passes through the package-local `npm test` suite (no DOM structure change; the prose container, the paragraph element shape, and the surrounding region semantics are unchanged).
5. Package-local `npm test` and `npm run build` pass from `tools/story-explorer/web`; there is no separate package-local `typecheck` script.

## Landed Changes

### 1. Scope `.reading-section p` and `.summary-rail p` to direct children in `tools/story-explorer/web/src/styles/app.css`

Replaced the descendant-selector pair in `app.css`:

```css
.reading-section p,
.summary-rail p {
  margin: 0;
  color: var(--color-text-secondary);
}
```

with direct-child selectors:

```css
.reading-section > p,
.summary-rail > p {
  margin: 0;
  color: var(--color-text-secondary);
}
```

This stops the rule from reaching into the nested `.prose` block while preserving the styling on the direct-child `<p>` in `routes/page-read.tsx`.

### 2. Add first-line indent (with first-child / after-heading exceptions) in `tools/story-explorer/web/src/styles/prose.css`

Added the following block to `prose.css`:

```css
.prose p {
  text-indent: 1em;
}

.prose > *:first-child,
.prose > :is(h1, h2, h3, h4, h5, h6) + p {
  text-indent: 0;
}
```

`1em` resolves to `1.125rem = 18px` at the prose font-size — a slight, conventional indent. The exception list zeros the indent on the opening paragraph of `.prose` and on any paragraph immediately following a heading, per typographic norm.

The existing `.prose > * + * { margin-block-start: var(--space-4); }` rule remains as-is. Once Change 1 lifts the override, that rule fires and yields the desired ~1rem vertical gap between prose paragraphs.

## Files to Touch

- `tools/story-explorer/web/src/styles/app.css` (modify)
- `tools/story-explorer/web/src/styles/prose.css` (modify)

## Out of Scope

- Record-card chip stacking redundancy on cards like THR-6 (mixed-case duplicate chips for `status` / `urgency`). Separate concern; not about prose legibility.
- Changing the prose font, font size, line-height, measure (column width), or color tokens. Source Serif Pro at 1.125rem with a 1.65 line-height and a 65ch measure is a sound baseline; the only legibility blocker on this surface was the lost paragraph break.
- Changing the markdown sanitizer (`tools/story-explorer/web/src/lib/sanitize-markdown.ts`). Paragraphs are correctly emitted as `<p>` elements by `marked`; the bug is purely CSS specificity.
- Any change to `_source/` records, `pages-prose/` rendered prose, or the `prose-direct` read path in `tools/story-explorer/src/read/prose-direct.ts`.

## Acceptance Criteria

### Tests That Passed

1. CSS cascade probe with jsdom from `tools/story-explorer/web`: `.prose > p:nth-child(2)` computes `margin-block-start: var(--space-4)` and `text-indent: 1em`; `.prose > p:first-child` and a paragraph immediately following a heading compute `text-indent: 0`; the direct child choices empty-state paragraph keeps `margin: 0px` and `color: var(--color-text-secondary)`.
2. Static source review: `app.css` now scopes the ambient section paragraph rule to `.reading-section > p, .summary-rail > p`, and `prose.css` owns prose indentation.
3. `npm test` passes from `tools/story-explorer/web` (no regression in `ProsePanel.test.tsx`, `ProsePanel.a11y.test.tsx`, `page-read.test.tsx`).
4. `npm run build` passes from `tools/story-explorer/web` (the package's TypeScript and Vite production build gate; there is no separate `typecheck` script).

### Invariants

1. `.prose > p + p` always has visible vertical separation (`margin-block-start >= 1rem`).
2. The opening paragraph of any `.prose` block, and any paragraph immediately following a heading inside `.prose`, has `text-indent: 0`.
3. The empty-state direct-child `<p>` of `.reading-section` (`page-read.tsx:109` style) continues to render with no margin and the secondary text color.

## Test Plan

### New/Modified Tests

1. None added — the fix is two narrow CSS rules whose effect was verified by computed-style inspection. The existing accessibility tests already cover structural / ARIA invariants.

### Commands

1. `node -e '<jsdom CSS cascade probe>'` from `tools/story-explorer/web`
2. `npm test` from `tools/story-explorer/web`
3. `npm run build` from `tools/story-explorer/web`

## Outcome

Completion date: 2026-05-26.

The story-explorer web prose surface now preserves prose paragraph spacing by preventing the ambient `.reading-section` paragraph rule from targeting nested `.prose` paragraphs. Prose paragraphs also receive a `1em` first-line indent, with no indent on the first prose child or on a paragraph immediately following a heading.

## Verification Result

1. Pre-edit baseline `npm test` from `tools/story-explorer/web` passed: 76 test files, 184 tests. The run emitted existing React Router future-flag warnings and an intentional ErrorBoundary test exception trace, but exited successfully.
2. Pre-edit baseline `npm run build` from `tools/story-explorer/web` passed and refreshed `tools/story-explorer/web/dist/`.
3. Post-edit jsdom CSS cascade probe from `tools/story-explorer/web` passed, confirming the prose margin/indent and direct-child empty-state paragraph selectors.
4. Post-edit `npm test` from `tools/story-explorer/web` passed: 76 test files, 184 tests. The same non-fatal React Router warnings and intentional ErrorBoundary test trace appeared.
5. Post-edit `npm run build` from `tools/story-explorer/web` passed and refreshed `tools/story-explorer/web/dist/`.

## Deviations

1. The drafted `pnpm --filter @worldloom/story-explorer-web ...` commands were replaced with package-local `npm test` and `npm run build` because this checkout has no root workspace manifest.
2. No browser/puppeteer visual smoke was run in this session. The accepted local proof is the CSS cascade probe plus package test/build gates.
3. `tools/story-explorer/web/dist/` and `tools/story-explorer/web/node_modules/` are ignored package artifacts. `dist/` was refreshed by `npm run build`; `node_modules/` was pre-existing and left in place.
