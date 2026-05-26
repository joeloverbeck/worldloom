# SPEC88STOEXPFRO-004: Cross-cutting infrastructure components

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/components/{ErrorBoundary, RouteLoading, IndexStatusBanner, disclosure/}.tsx` under T001's scaffold; no backend changes.
**Deps**: SPEC88STOEXPFRO-001

## Problem

Every route in T005-T011 needs three pieces of cross-cutting UI infrastructure: (1) a React error boundary that catches sub-tree throws and renders a polished fallback instead of an opaque white screen; (2) a Suspense fallback component for initial route renders while PageDetail/list fetches are pending; (3) an index-status banner that surfaces `worldIndexStatus` envelope state on every route that pulls indexed data; and (4) an accessible disclosure primitive (ARIA `aria-expanded` / Enter/Space toggle) used by every collapsible region in this spec AND reused by SPEC-89/90. Without these, every route either duplicates the same boilerplate or omits proper error/loading/a11y handling. Co-locating them in one infrastructure ticket eliminates duplication and surfaces the WCAG AA disclosure contract once.

## Assumption Reassessment (2026-05-26)

1. T001 creates `web/src/components/` directory as part of the scaffold (the router shell at `app.tsx` references this path); no components ship in T001. SPEC-88 §3 (post-reassessment) §components/ tree includes `ErrorBoundary.tsx`, `RouteLoading.tsx`, `IndexStatusBanner.tsx`, and `disclosure/` — all four are declared as new files. SPEC-88 §4 (post-reassessment) paragraph after §4.4 commits the integration: "Every route is wrapped in `<ErrorBoundary>` rendering a polished fallback (API failure, sub-tree throw, unexpected exception) ... Initial page-fetch and list-fetch latency is covered by `<RouteLoading>` (a Suspense fallback) so route transitions never render a blank screen." SPEC-88 §9 (post-reassessment) names `IndexStatusBanner` as the surface for `indexStatus.kind` banner rendering across 6 banner-eligible states (`missing`, `stale`, `empty`, `version_mismatch`, `open_failed`, plus the implicit `fresh` = no banner).
2. SPEC-88 §8 (post-reassessment) names the disclosure pattern requirement: "`aria-expanded`, Enter/Space toggles, `aria-controls` where helpful — primitive shipped here, reused by SPEC-89/90". The disclosure primitive belongs in this infrastructure ticket because (a) the §8 accessibility baseline requires it, and (b) SPEC-89/90 are draft sibling specs that consume it. Cross-spec consumer-side schema dependency (per `reassess-spec/references/codebase-validation.md` analogue): the disclosure primitive's API is a contract that SPEC-89 (state X-Ray collapsible groups) and SPEC-90 (branch map drawer focus trap) build on.
3. Cross-skill boundary: this ticket creates components consumed by all subsequent web/ tickets. The `IndexStatusBanner` reads `IndexStatus` types declared in T002's `api/client.ts`; T05-T11 all import these components. Drift in the disclosure primitive's API after SPEC-89/90 land would break those siblings — surface the API as small, named, and stable (no inline anonymous types, no breaking changes after this ticket lands).

## Architecture Check

1. **Class-based ErrorBoundary** (React's only error-boundary API) over experimental functional patterns. Renders fallback via a `renderFallback` prop so the visual treatment is route-specific (404, backend-unreachable, sub-tree-throw all get distinct polish); the boundary itself is generic.
2. **`<Suspense>` fallback as a tiny component** rather than inline JSX literals at each route. `<RouteLoading>` accepts an optional `label` prop ("Loading worlds...", "Loading page...") so screen readers announce the right context; defaults to a non-empty fallback so the boundary itself never returns null (which React handles but produces a visible white flash).
3. **`<IndexStatusBanner>` as a discriminated-union renderer** — receives `indexStatus: IndexStatus` from T002 and switches on `.kind`. The 6 banner cases all share a layout shell; the variant content (remedy text, error string, drifted-file count) differs per kind. Keeping the dispatch in one component centralizes the `indexStatus.kind` enum-coverage check; adding a new IndexStatus variant in SPEC-87 would surface as a TypeScript exhaustiveness error here.
4. **Disclosure primitive as a hook + headless component** (`useDisclosure()` returns `{isOpen, toggle, contentProps, triggerProps}` per the WAI-ARIA APG disclosure pattern) — headless so the visual treatment varies per consumer (group headers in §X-Ray, page-jump in chrome, drawer in SPEC-90) while the ARIA contract stays uniform. Avoids the common pitfall of disclosure-as-styled-component locking consumers into one visual shape.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield components.
6. **Reduced-motion gating**: disclosure animations are gated on `@media (prefers-reduced-motion: no-preference)` per §8 — when the user opts out, the toggle is instantaneous (no fade/slide). The component re-renders identically either way; only the CSS transition rule differs.

## Verification Layers

1. **ErrorBoundary catches sub-tree throws** → unit test: wrap a component that throws `new Error('test')` in `<ErrorBoundary renderFallback={...}/>`; assert the fallback renders and the throw doesn't propagate.
2. **RouteLoading renders the label** → unit test: render `<RouteLoading label="Loading worlds..." />`; assert the visible text + `aria-live="polite"` region announces the label.
3. **IndexStatusBanner exhaustively handles all IndexStatus kinds** → TypeScript exhaustiveness: a `switch (status.kind)` with no `default` case must cover all 6 kinds; missing a kind is a compile-time error. Unit test: render each variant; assert the remedy string is present.
4. **Disclosure primitive ARIA contract** → unit test: render a disclosure; assert `aria-expanded="false"` initially, `aria-expanded="true"` after toggle, `aria-controls` matches the content element's `id`, Enter and Space both toggle. axe-core integration in T012 re-verifies at the suite level.

## What to Change

### 1. Create `tools/story-explorer/web/src/components/ErrorBoundary.tsx`

React class component implementing `componentDidCatch(error, info)`. Props:
```ts
interface ErrorBoundaryProps {
  renderFallback: (error: Error, retry: () => void) => React.ReactNode;
  children: React.ReactNode;
}
```
State: `{ error: Error | null }`. On catch, sets state; renders `renderFallback(error, () => setState({error: null}))` when error is non-null; otherwise renders children. The `retry` callback resets the boundary so the user can try the action again without a page reload.

### 2. Create `tools/story-explorer/web/src/components/RouteLoading.tsx`

Functional component for Suspense fallback. Props:
```ts
interface RouteLoadingProps {
  label?: string;
}
```
Renders a centered loading indicator (CSS spinner or pulsing dots) plus a visually-hidden `aria-live="polite"` region with the label text. Default label: `"Loading..."`. Honors `prefers-reduced-motion: reduce` by replacing the spinner animation with a static dot.

### 3. Create `tools/story-explorer/web/src/components/IndexStatusBanner.tsx`

Functional component that takes `IndexStatus` (from T002's `api/client.ts`) and renders the appropriate banner. Implementation:
```tsx
import type { IndexStatus } from '../api/client';

interface IndexStatusBannerProps {
  status: IndexStatus;
}

export function IndexStatusBanner({ status }: IndexStatusBannerProps) {
  switch (status.kind) {
    case 'fresh':
      return null; // No banner when fresh
    case 'missing':
      return <Banner severity="warning">Index not built. {status.remedy}</Banner>;
    case 'stale':
      return <Banner severity="info">{status.driftedFiles.length} file(s) drifted. {status.remedy}</Banner>;
    case 'empty':
      return <Banner severity="info">Index built but contains no records. {status.remedy}</Banner>;
    case 'version_mismatch':
      return <Banner severity="warning">Schema version mismatch (expected {status.expected}, found {status.found}). {status.remedy}</Banner>;
    case 'open_failed':
      return <Banner severity="error">Index could not be opened. {status.error}</Banner>;
  }
}
```
The inline `Banner` sub-component or shared layout primitive handles the visual treatment (colored left-border per severity, icon, dismissable for non-blocking statuses). Per §9, `missing` and `version_mismatch` are blocking (read attempts may not succeed); `stale` and `empty` are advisory.

### 4. Create `tools/story-explorer/web/src/components/disclosure/use-disclosure.ts`

Hook implementing WAI-ARIA APG disclosure pattern:
```ts
export function useDisclosure(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const id = useId();
  const toggle = useCallback(() => setIsOpen(o => !o), []);
  return {
    isOpen,
    toggle,
    triggerProps: {
      'aria-expanded': isOpen,
      'aria-controls': `disclosure-${id}`,
      onClick: toggle,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      },
    } as const,
    contentProps: { id: `disclosure-${id}`, hidden: !isOpen } as const,
  };
}
```

### 5. Create `tools/story-explorer/web/src/components/disclosure/Disclosure.tsx`

Headless component using the hook above. Renders `<button {...triggerProps}>` + `<div {...contentProps}>`. Children prop accepts a render function `(state) => ReactNode` so consumers control the visual treatment:
```tsx
<Disclosure>
  {({ isOpen, triggerProps, contentProps }) => (
    <>
      <button {...triggerProps}>{isOpen ? 'Hide' : 'Show'}</button>
      <div {...contentProps}>Content</div>
    </>
  )}
</Disclosure>
```

### 6. Create `tools/story-explorer/web/src/components/disclosure/index.ts`

Barrel re-exporting `useDisclosure`, `Disclosure`.

### 7. Tests

Create unit tests:
- `web/src/components/ErrorBoundary.test.tsx` — assert sub-tree throw renders fallback, assert retry resets state.
- `web/src/components/RouteLoading.test.tsx` — assert label renders, assert `aria-live="polite"` region present.
- `web/src/components/IndexStatusBanner.test.tsx` — assert each of 6 kinds renders correct content; assert `fresh` renders nothing.
- `web/src/components/disclosure/Disclosure.test.tsx` — assert ARIA contract per Verification Layers #4 (toggle on Enter, toggle on Space, `aria-expanded` flips, `aria-controls` matches content `id`).

## Files to Touch

- `tools/story-explorer/web/src/components/ErrorBoundary.tsx` (new)
- `tools/story-explorer/web/src/components/ErrorBoundary.test.tsx` (new)
- `tools/story-explorer/web/src/components/RouteLoading.tsx` (new)
- `tools/story-explorer/web/src/components/RouteLoading.test.tsx` (new)
- `tools/story-explorer/web/src/components/IndexStatusBanner.tsx` (new)
- `tools/story-explorer/web/src/components/IndexStatusBanner.test.tsx` (new)
- `tools/story-explorer/web/src/components/disclosure/use-disclosure.ts` (new)
- `tools/story-explorer/web/src/components/disclosure/Disclosure.tsx` (new)
- `tools/story-explorer/web/src/components/disclosure/Disclosure.test.tsx` (new)
- `tools/story-explorer/web/src/components/disclosure/index.ts` (new)

## Out of Scope

- Route bodies that consume these components (T005-T011 wire routes).
- axe-core integration (T012).
- Route-level error pages (404, backend-unreachable) — those use ErrorBoundary's `renderFallback` prop in T011; this ticket only ships the boundary primitive.
- SPEC-89's specific x-ray group disclosures — those wire the primitive at SPEC-89 implementation time.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — all four test files pass.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles; IndexStatusBanner's `switch` exhausts all 6 IndexStatus kinds (no `default` case needed; missing kind is a compile error).

### Invariants

1. ErrorBoundary's `renderFallback` is REQUIRED (no default fallback); forces every consumer to define route-specific polish.
2. Disclosure primitive's ARIA contract is non-negotiable: `aria-expanded`, `aria-controls`, Enter/Space toggle. Verified at T012 axe-core integration.
3. IndexStatusBanner's switch on `status.kind` has no `default` arm; relies on TypeScript exhaustiveness checking. Catches future IndexStatus variant additions at compile time.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/ErrorBoundary.test.tsx` (new) — verifies catch + retry flow.
2. `tools/story-explorer/web/src/components/RouteLoading.test.tsx` (new) — verifies label rendering and aria-live region.
3. `tools/story-explorer/web/src/components/IndexStatusBanner.test.tsx` (new) — verifies all 6 kinds.
4. `tools/story-explorer/web/src/components/disclosure/Disclosure.test.tsx` (new) — verifies WAI-ARIA APG disclosure contract.

### Commands

1. `cd tools/story-explorer/web && npm test` — vitest run.
2. `cd tools/story-explorer/web && npm run build` — TypeScript exhaustiveness verification.
