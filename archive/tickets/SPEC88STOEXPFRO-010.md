# SPEC88STOEXPFRO-010: Choice navigation + variants + Terminal card

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/components/{ChoiceCard, ChildOutcomeVariant, TerminalCard}.tsx`; fills T008's choices-section + terminal-section slots.
**Deps**: archive/tickets/SPEC88STOEXPFRO-008.md

## Problem

At intake, below the prose, the reader needed choice cards to navigate forward — one card per emitted choice with surface label, player-visible intent, pressure chips, grounded-in count, and inline expansion when multiple committed child PGs match. When no navigable children exist (leaf or branch-pause), a terminal card replaces the choice list with "No committed continuation from this page." T008's choices-section and terminal-section slots were placeholders, so the explorer could show prose but offered no way to navigate forward. SPEC-88 §6 + §7 define the exact rendering; this ticket implemented both as adjacent under-prose surfaces.

## Assumption Reassessment (2026-05-26)

1. T008 created `web/src/routes/page-read.tsx` with placeholder choices-section + terminal-section slots. SPEC-87's `ChoiceNavigation` type at `tools/story-explorer/src/view-models/choice-navigation.ts` declares: `choiceId`, `surfaceLabel`, `playerVisibleIntent`, `pressure[]`, `groundedInCount`, `childOutcomeVariants[]`, `isNavigable`. SPEC-87's `ChildOutcomeVariant` at `child-outcome-variant.ts` declares: `pageId`, `branchId`, `turnIndex`, `resolvedEventId`, `outcomeRoute`, `resolutionPreview`, `selectedStoryletId`, `hasRenderedProse`, `stateDeltaCounts`. SPEC-87's `PageSummary` declares `isLeaf`, `isTerminalOrPaused`, `terminalReason: 'no_children' | 'paused' | 'terminal' | null` — the discriminator for §7's body sub-line.
2. SPEC-88 §6 (post-reassessment) names the contract: "For each `ChoiceNavigation` where `isNavigable === true`: `<ChoiceCard>` renders surface label (primary text), player-visible intent (secondary line), pressure chips (when present), and a subtle grounded-in count. If `childOutcomeVariants.length === 1`: clicking the card navigates to that child PG. If `childOutcomeVariants.length > 1`: the card expands inline to show `<ChildOutcomeVariant>` rows beneath it. Each row shows `PG-<n> · BR-<n> · <outcomeRoute|resolutionPreview>` and is individually clickable. CHCs with `isNavigable === false` (no committed child PG yet) are NOT shown in the choice list. They appear in SPEC-89's X-Ray as emitted-but-uncontinued, with appropriate chips." SPEC-88 §7 (post-reassessment) names the terminal card: "When `pageSummary.isLeaf === true` AND `choiceNavigation.every(c => !c.isNavigable)`: Render `<TerminalCard>` beneath the prose panel with copy: Header: 'No committed continuation from this page.' Body sub-line that adapts to context: 'All emitted choices currently have no continued child page.' OR 'Branch has reached a paused state per PG metadata.' OR 'Terminal page per PG metadata.' (SPEC-87 surfaces the discriminator on `PageSummary.isTerminalOrPaused` + reason if available.) Never offer a 'continue story' or 'generate next page' action."
3. Cross-skill boundary: this ticket consumes T002's API client types + T004's disclosure primitive (used for the inline-expansion of multi-variant choice cards). The "never offer continue story" prohibition is structural — the components have no "next page" button at all; they're purely navigation surfaces. This honors SPEC-87 §6 read-only fence at the UI level (explorer never invokes story-pipeline writes).
4. Live implementation note: frontend `PageDetail.page` is currently typed as `Record<string, unknown>` in `tools/story-explorer/web/src/api/client.ts`, so `page-read.tsx` uses narrow local guards for `isLeaf` and `terminalReason` rather than widening the client type in this ticket.

## Architecture Check

1. **`<ChoiceCard>` as a discriminated component** — internally branches on `childOutcomeVariants.length`. Single-variant → renders a `<Link>` for full-card navigation. Multi-variant → renders a `<button>` (using T004's `useDisclosure()` hook) that expands inline to show `<ChildOutcomeVariant>` rows. The hook gives the multi-variant case proper ARIA `aria-expanded` semantics.
2. **`<ChildOutcomeVariant>` as a clickable `<Link>` row** — each variant carries its own pageId, so each row links independently. No "back" affordance from inside the expansion — Esc could close the expansion (handled by T012's a11y verification), but click-outside is not implemented in v1 (keep simple).
3. **`<TerminalCard>` as a static designed card** — no actions, no "generate next" button. Body sub-line dispatched on `terminalReason`: `'no_children'` → "All emitted choices currently have no continued child page."; `'paused'` → "Branch has reached a paused state per PG metadata."; `'terminal'` → "Terminal page per PG metadata."; `null` → fallback "No further pages from this point." (defensive when discriminator absent).
4. **Choice filtering happens in the parent route**, not in the component — `page-read.tsx` filters `choiceNavigation` to `isNavigable === true` before passing to ChoiceCard list. The components never see non-navigable CHCs; SPEC-89 surfaces those in X-Ray.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield components.
6. **Pressure chips and grounded-in count are small inline indicators** — not full sub-cards. Grounded-in count: "Grounded in 3 records" (subtle, low-emphasis); pressure chips: small colored pills (e.g., "scarcity", "rivalry") inline at the card's bottom edge.

## Verification Layers

1. **Single-variant card navigates on click** → unit test: pass a ChoiceNavigation with 1 variant; click card; assert navigation event fires with the variant's pageId path.
2. **Multi-variant card expands inline** → unit test: pass a ChoiceNavigation with 2+ variants; click card; assert disclosure opens; assert each variant row is clickable and navigates to its own pageId.
3. **Non-navigable CHCs absent from choice list** → unit test in route's test file: pass mixed navigable + non-navigable CHCs; assert only navigable cards render.
4. **TerminalCard renders correct sub-line per terminalReason** → unit test: each of the 4 reason values renders the corresponding copy.
5. **TerminalCard has no "next page" button** → unit test: render TerminalCard; assert no `<button>` or `<Link>` with text matching `/continue|next|generate/i` exists.

## Landed Changes

### 1. Create `tools/story-explorer/web/src/components/ChoiceCard.tsx`

Functional component. Props:
```ts
interface ChoiceCardProps {
  choice: ChoiceNavigation; // assumes choice.isNavigable === true (filter upstream)
  worldSlug: string;
  storySlug: string;
}
```
Render structure:
- Card surface containing: surfaceLabel (primary), playerVisibleIntent (secondary), grounded-in count + pressure chips (footer)
- Branch on `choice.childOutcomeVariants.length`:
  - `=== 1` → wrap surface in `<Link to={`/worlds/${worldSlug}/stories/${storySlug}/pages/${variant.pageId}`}>`
  - `> 1` → wrap surface in `<button>` (via T004's `useDisclosure()`); when expanded, render the variant list below the card using a `<ChildOutcomeVariant>` row per variant

### 2. Create `tools/story-explorer/web/src/components/ChildOutcomeVariant.tsx`

Functional component. Props:
```ts
interface ChildOutcomeVariantProps {
  variant: ChildOutcomeVariant; // imported from T002's client.ts
  worldSlug: string;
  storySlug: string;
}
```
Renders a clickable `<Link>` row: `PG-<n> · BR-<n> · <outcomeRoute || resolutionPreview || 'Outcome'>`. Compact horizontal layout. No nested expansion (variants don't have further depth).

### 3. Create `tools/story-explorer/web/src/components/TerminalCard.tsx`

Functional component. Props:
```ts
interface TerminalCardProps {
  terminalReason: 'no_children' | 'paused' | 'terminal' | null;
}
```
Renders a designed card with:
- Header: "No committed continuation from this page."
- Body sub-line dispatched on `terminalReason` per Architecture Check #3
- No action buttons; this card is purely informational.

### 4. Update `tools/story-explorer/web/src/routes/page-read.tsx`

Replaced choices-section + terminal-section placeholders with route-owned filtering of `choiceNavigation` to `isNavigable === true`, `<ChoiceCard>` rendering for navigable choices, and `<TerminalCard>` rendering only when the page is a leaf and no navigable choices remain. The route uses local guards for `page.isLeaf` and `page.terminalReason` because the frontend `page` payload is currently a generic record.

### 5. Create tests

- `tools/story-explorer/web/src/components/ChoiceCard.test.tsx` — verifies single-variant link, multi-variant expansion, pressure chips + grounded-in count.
- `tools/story-explorer/web/src/components/ChildOutcomeVariant.test.tsx` — verifies row rendering and click navigation.
- `tools/story-explorer/web/src/components/TerminalCard.test.tsx` — verifies all 4 terminalReason variants + no-action invariant.

## Files to Touch

- `tools/story-explorer/web/src/components/ChoiceCard.tsx` (new)
- `tools/story-explorer/web/src/components/ChoiceCard.test.tsx` (new)
- `tools/story-explorer/web/src/components/ChildOutcomeVariant.tsx` (new)
- `tools/story-explorer/web/src/components/ChildOutcomeVariant.test.tsx` (new)
- `tools/story-explorer/web/src/components/TerminalCard.tsx` (new)
- `tools/story-explorer/web/src/components/TerminalCard.test.tsx` (new)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify — fills choices-section + terminal-section slots)
- `tools/story-explorer/web/src/routes/page-read.test.tsx` (modify — verifies route filtering + terminal rendering)
- `tools/story-explorer/web/src/styles/app.css` (modify — styles choice cards, variant rows, and terminal card)

## Out of Scope

- Non-navigable CHC display (SPEC-89's X-Ray surface).
- Choice generation / continuation (read-only explorer; explicitly forbidden per §7).
- Branch-map drawer interaction triggered from a variant row (SPEC-90).
- Hover-preview of child page prose (out of v1 scope).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- ChoiceCard.test ChildOutcomeVariant.test TerminalCard.test page-read.test` — focused component + route tests pass.
2. `cd tools/story-explorer/web && npm test` — full web vitest suite passes.
3. `cd tools/story-explorer/web && npm run build` — TypeScript compiles and Vite builds.

### Invariants

1. ChoiceCard never renders a "continue story" / "generate next" / "create page" button. Audited by action-label grep against the component files.
2. TerminalCard has zero action buttons — purely informational.
3. Multi-variant expansion uses T004's `useDisclosure()` hook (preserves WAI-ARIA disclosure semantics).
4. Non-navigable CHCs never appear in the choices section (filtered by the route, not by the component).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/ChoiceCard.test.tsx` (new) — verifies §6 contract.
2. `tools/story-explorer/web/src/components/ChildOutcomeVariant.test.tsx` (new) — verifies variant row rendering.
3. `tools/story-explorer/web/src/components/TerminalCard.test.tsx` (new) — verifies §7 contract.
4. `tools/story-explorer/web/src/routes/page-read.test.tsx` (modified) — verifies non-navigable choices are filtered and terminal card renders only for leaf/no-navigable state.

### Commands

1. `cd tools/story-explorer/web && npm test` — full vitest suite.
2. `cd tools/story-explorer/web && npm run build` — TypeScript verification.
3. `grep -nE "continue story|next page|generate|create page" tools/story-explorer/web/src/components/ChoiceCard.tsx tools/story-explorer/web/src/components/TerminalCard.tsx` — invariant audit; exits 1 with no matches, proving no action-label surface exists for continuation/generation.

## Outcome

Completed: 2026-05-26.

Landed `<ChoiceCard>`, `<ChildOutcomeVariant>`, and `<TerminalCard>` plus page-read route wiring and focused tests. The route now filters out non-navigable CHCs before rendering choices, expands multi-outcome choices with the T004 disclosure hook, links every committed child PG variant independently, and renders the terminal card only for leaf pages with no navigable child choices.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- page-read.test` — pre-edit baseline passed: 1 file / 3 tests.
2. `cd tools/story-explorer/web && npm test -- ChoiceCard.test ChildOutcomeVariant.test TerminalCard.test page-read.test` — passed: 4 files / 13 tests.
3. `cd tools/story-explorer/web && npm run build` — passed after adding route-local `TerminalReason` guards for the generic `PageDetail.page` payload.
4. `cd tools/story-explorer/web && npm test` — passed: 20 files / 67 tests.
5. `grep -nE "continue story|next page|generate|create page" tools/story-explorer/web/src/components/ChoiceCard.tsx tools/story-explorer/web/src/components/TerminalCard.tsx` — exited 1 with no matches, as expected for the no-generation/no-continuation invariant.

## Deviations

1. The drafted grep `continue|next page|generate` was too broad because it matched the required terminal copy phrase "continued child page." The accepted invariant proof uses explicit action labels: `continue story|next page|generate|create page`.
2. `tools/story-explorer/web/src/styles/app.css` and `tools/story-explorer/web/src/routes/page-read.test.tsx` were added to the landed file set because the new UI surfaces needed styling and the route-owned filtering invariant needed direct coverage.
