# SPEC103PROPASSEG-014: PromptHistory page

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (the saved-prompts list view with per-prompt linked segments).
**Deps**: archive/tickets/SPEC103PROPASSEG-010.md

## Problem

SPEC-103 §2 item 8 specifies the Prompt History view: lists saved prompts (from `prompts/PROMPT-*.md`), per-prompt shows `id`, `created_at`, `moment_directive` snippet, links to the segments produced from this prompt (computed by scanning segment sidecars for matching `prompt_id`). Clicking a prompt opens a read-only view of the prompt body + sidecar. "Reuse Prompt" action navigates back to Moment Composer pre-populated with the prompt's inputs. §7 AC#10 covers the view's contract. The page consumes ticket 010's extended `GET /prompts` response (with the `linked_segments: string[]` field added per the Q2=(a) reassessment resolution) and the existing SPEC-102-landed `GET /prompts/:promptId` for the detail view.

## Assumption Reassessment (2026-05-31)

1. Existing frontend `web/src/api/prompts.ts` (SPEC-102) exposes the typed `GET /prompts` listing client. Ticket 010 extends the listing response with `linked_segments: string[]` per entry; this page consumes the extended type. The existing `web/src/pages/PromptPreview.tsx` (SPEC-102) renders the prompt body and sidecar — this page's per-prompt detail view either reuses PromptPreview as a read-only mode (preferred; reuses the rendering logic) or duplicates a smaller read-only render (acceptable but less DRY). Verify PromptPreview's surface at implementation time to know whether it supports a read-only mode or needs a small extension.
2. SPEC-103 §2 item 8 (PromptHistory view surface enumeration: list + per-prompt linked segments + detail view + Reuse Prompt action), §7 AC#10 ("Prompt History view lists saved prompts with links to segments produced from them"), §8 Risks ("If a saved prompt is later deleted, the segment sidecar's `prompt_id` becomes a stale reference; the Prompt History view will not crash, but the 'Reuse Prompt' action will fail with a clear 'prompt no longer exists' message").
3. Cross-skill boundary: this page consumes ticket 010's extended `GET /prompts` (the linked_segments field is what makes the Prompt History view possible — without it the page would have to scan segment sidecars client-side, which is the worse architecture). The "Reuse Prompt" action navigates to `MomentComposer.tsx` (existing SPEC-102 page) — verify the navigation contract at implementation time (likely query param or router state passing the prompt's inputs to pre-populate the composer).

## Architecture Check

1. The page's per-prompt-with-linked-segments shape is enabled by ticket 010's backend extension (the segments-scan happens server-side, not client-side). This keeps the frontend simple — it just renders the already-joined data. The alternative (frontend scans `web/src/api/segments.ts` listSegments + filters by prompt_id) would require an N×M client-side join that ticket 010 deliberately moved server-side.
2. No backwards-compatibility aliasing — net-new page.

## Verification Layers

1. PromptHistory page fetches the extended `GET /prompts` response on mount; renders each entry's `id`, `created_at`, `moment_directive_snippet`, and `linked_segments` list → manual smoke check + component test
2. Clicking a `linked_segment` ID navigates to the Manuscript view scrolled/anchored to that segment (or simply navigates to Manuscript view — exact UX is implementer choice within MVP scope) → component test
3. Clicking a prompt entry opens the detail view (PromptPreview-as-read-only, OR a small inline detail render) → component test
4. "Reuse Prompt" action navigates to MomentComposer with the prompt's inputs pre-populated → component test
5. Empty `linked_segments: []` for a prompt with no segments yet → renders "No segments produced yet" or similar placeholder → component test

## What to Change

### 1. Create web/src/pages/PromptHistory.tsx

Implement the page per SPEC-103 §2 item 8's surface enumeration:

- React functional component using `useParams<{ worldSlug; msSlug }>()` + `useState` for prompt list + `useEffect` to fetch via ticket 010's extended `GET /prompts` API client (already returns `{ id, created_at, moment_directive_snippet, linked_segments }` per entry)
- Layout: list of prompt cards; each card shows id + created_at + directive snippet + linked_segments list (each rendered as a `<Link>` to `/manuscript#<segmentId>` or similar — verify the Manuscript view's anchor support at implementation time and adapt if it doesn't anchor)
- Per-card actions: "View" (opens detail) + "Reuse Prompt" (navigates to MomentComposer)
- Detail view: either inline-expand the card on click, or navigate to a sub-route — implementer choice within MVP scope
- Empty state: when prompts list is empty, render "No saved prompts yet" placeholder

### 2. Verify MomentComposer's Reuse Prompt contract

Read `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` to confirm it accepts pre-populated inputs via query parameter or router state. If the contract doesn't yet exist (only fresh composition is wired per SPEC-102), this ticket's "Reuse Prompt" action either (a) drops the pre-population (Reuse becomes navigate-only; degraded UX) or (b) extends MomentComposer as a small sub-deliverable to honor a `?reuse=PROMPT-<n>` query parameter that pre-populates the composer's state from the prompt's sidecar (preferred — confirm at implementation time and decide). The spec's §2 item 8 wording ("Reuse Prompt action navigates back to Moment Composer pre-populated with the prompt's inputs") implies the pre-population is in scope; document the decision in the ticket's implementation notes.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (new)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify, only if the `?reuse=PROMPT-<n>` query-parameter pre-population needs extension per §2 above)

## Out of Scope

- The `GET /prompts` extension to add `linked_segments` (covered by ticket 010)
- The `GET /prompts/:promptId` detail endpoint (existing SPEC-102 surface; this page consumes it)
- The `POST /prompts` save endpoint (existing SPEC-102 surface; not touched)
- App.tsx route registration for `/prompt-history` (covered by ticket 015)
- The Manuscript view's segment-anchoring (covered by ticket 013; this page navigates to the manuscript URL but doesn't implement anchoring)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web install --no-audit --no-fund && npm --prefix web run build` — web bundle builds with the new page
2. `cd tools/manual-story-studio && npm test` — full suite green
3. Manual smoke check after ticket 015 lands: navigate to `/worlds/<slug>/manual-stories/<msSlug>/prompt-history` after saving ≥1 prompt and ≥1 segment referencing that prompt → page renders the prompt with its linked segment under the prompt entry

### Invariants

1. PromptHistory consumes ticket 010's extended `GET /prompts` response shape (including `linked_segments`); the page does not scan segment sidecars client-side.
2. Per SPEC-103 §8 Risks: stale `prompt_id` references on segment sidecars (orphaned by prompt deletion) do not crash the page; the "Reuse Prompt" action degrades gracefully with a "prompt no longer exists" message when the underlying prompt file is missing.
3. The page is read-only — no segment / prompt / record mutation triggered by any action on this page (Reuse Prompt navigates; it does not mutate the prompt or copy it).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` — component test (if web test framework exists) covering list render, linked_segments display, detail view, Reuse Prompt navigation, empty state, stale prompt graceful degradation. If no web component test framework exists, defer to ticket 016 capstone for end-to-end coverage.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle build (TypeScript type-check)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification
