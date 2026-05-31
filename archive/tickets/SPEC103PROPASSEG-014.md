# SPEC103PROPASSEG-014: PromptHistory page

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (the saved-prompts list view with per-prompt linked segments).
**Deps**: archive/tickets/SPEC103PROPASSEG-010.md

## Problem

Before this ticket, SPEC-103 §2 item 8 specified the Prompt History view but the frontend did not have `tools/manual-story-studio/web/src/pages/PromptHistory.tsx`. The required view lists saved prompts (from `prompts/PROMPT-*.md`), per-prompt shows `id`, `created_at`, `moment_directive` snippet, and links to the segments produced from this prompt (computed by scanning segment sidecars for matching `prompt_id`). Clicking a prompt opens a read-only view of the prompt body + sidecar. "Reuse Prompt" action navigates back to Moment Composer pre-populated with the prompt's inputs. §7 AC#10 covers the view's contract. The page consumes ticket 010's extended `GET /prompts` response (with the `linked_segments: string[]` field added per the Q2=(a) reassessment resolution) and the existing SPEC-102-landed `GET /prompts/:promptId` for the detail view.

## Assumption Reassessment (2026-05-31)

1. Existing frontend `web/src/api/prompts.ts` exposes the typed `GET /prompts` listing client with `linked_segments: string[]` per entry, plus `getPrompt()` for `GET /prompts/:promptId`. `web/src/pages/PromptPreview.tsx` is tied to unsaved compose navigation state and save/regenerate actions, so the landed Prompt History page uses a smaller read-only inline detail render instead of reusing PromptPreview.
2. SPEC-103 §2 item 8 (PromptHistory view surface enumeration: list + per-prompt linked segments + detail view + Reuse Prompt action), §7 AC#10 ("Prompt History view lists saved prompts with links to segments produced from them"), §8 Risks ("If a saved prompt is later deleted, the segment sidecar's `prompt_id` becomes a stale reference; the Prompt History view will not crash, but the 'Reuse Prompt' action will fail with a clear 'prompt no longer exists' message").
3. Cross-skill boundary: this page consumes ticket 010's extended `GET /prompts` (the linked_segments field is what makes the Prompt History view possible — without it the page would have to scan segment sidecars client-side, which is the worse architecture). The "Reuse Prompt" action now navigates to `MomentComposer.tsx` with router state carrying `moment_directive`, `included_cast`, and `included_records`; `MomentComposer.tsx` consumes those state fields to pre-populate the composer.

## Architecture Check

1. The page's per-prompt-with-linked-segments shape is enabled by ticket 010's backend extension (the segments-scan happens server-side, not client-side). This keeps the frontend simple — it just renders the already-joined data. The alternative (frontend scans `web/src/api/segments.ts` listSegments + filters by prompt_id) would require an N×M client-side join that ticket 010 deliberately moved server-side.
2. No backwards-compatibility aliasing — net-new page.

## Verification Layers

1. PromptHistory page fetches the extended `GET /prompts` response on mount; renders each entry's `id`, `created_at`, `moment_directive_snippet`, and `linked_segments` list → web TypeScript build + manual review of `PromptHistory.tsx`
2. Clicking a `linked_segment` ID navigates to the Manuscript view URL with a segment hash → web TypeScript build + manual review of `<Link>` targets
3. Clicking a prompt entry opens the inline read-only detail view from `GET /prompts/:promptId` → web TypeScript build + manual review of `loadDetail()`
4. "Reuse Prompt" action navigates to MomentComposer with the prompt's inputs pre-populated → web TypeScript build + manual review of router-state producer/consumer
5. Empty `linked_segments: []` for a prompt with no segments yet → renders "No segments produced yet" placeholder → web TypeScript build + manual review

## Landed Changes

### 1. Created web/src/pages/PromptHistory.tsx

Implemented the page per SPEC-103 §2 item 8's surface enumeration:

- React functional component using `useParams`, `useState`, and `useEffect` to fetch via the extended `GET /prompts` API client.
- Layout: list of prompt cards; each card shows id + created_at + directive snippet + linked_segments list. Segment IDs link to the Manuscript route with a `#SEG-N` hash; route registration is covered by `archive/tickets/SPEC103PROPASSEG-015.md`.
- Per-card actions: "View" loads inline read-only detail; "Reuse Prompt" navigates to Moment Composer.
- Detail view: inline read-only prompt markdown and sidecar summary.
- Empty state: when prompts list is empty, render "No saved prompts yet" placeholder.

### 2. Extended MomentComposer's Reuse Prompt contract

`tools/manual-story-studio/web/src/pages/MomentComposer.tsx` did not previously consume pre-population input. This ticket added router-state consumption for `moment_directive`, `included_cast`, and `included_records`, preserving the existing metadata `cast_order` default only when no included-cast reuse state is present.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (new)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify — router-state pre-population for reused prompts)

## Out of Scope

- The `GET /prompts` extension to add `linked_segments` (covered by ticket 010)
- The `GET /prompts/:promptId` detail endpoint (existing SPEC-102 surface; this page consumes it)
- The `POST /prompts` save endpoint (existing SPEC-102 surface; not touched)
- App.tsx route registration for `/prompt-history` (covered by `archive/tickets/SPEC103PROPASSEG-015.md`)
- The Manuscript view's segment-anchoring (covered by `archive/tickets/SPEC103PROPASSEG-013.md`; this page navigates to the manuscript URL but doesn't implement anchoring)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle builds with the new page
2. `cd tools/manual-story-studio && npm test` — full suite green
3. Manual smoke check after `archive/tickets/SPEC103PROPASSEG-015.md` lands: navigate to `/worlds/<slug>/manual-stories/<msSlug>/prompt-history` after saving ≥1 prompt and ≥1 segment referencing that prompt → page renders the prompt with its linked segment under the prompt entry

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

## Outcome

Completed: 2026-05-31

Implemented `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` with saved-prompt listing, linked segment rendering, inline read-only prompt detail, empty state, and graceful missing-prompt handling. Extended `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` to accept reuse router state so Prompt History can pre-populate the composer with a saved prompt's directive, included cast, and included records.

Route registration for `/prompt-history` was completed by `archive/tickets/SPEC103PROPASSEG-015.md`.

## Verification Result

1. `cd tools/manual-story-studio && npm --prefix web run build` — passed; TypeScript and Vite built the web bundle with `PromptHistory.tsx`.
2. `cd tools/manual-story-studio && npm test` — passed; backend `node --test` reported 269 passing tests and `npm --prefix web test` typechecked the web project.

## Deviations

1. No web component test framework exists in `tools/manual-story-studio/web` (`npm --prefix web test` is TypeScript `--noEmit` only), so page behavior is covered by web build/typecheck now and remains in the ticket 016 capstone/manual smoke boundary.
2. The detail view does not reuse `PromptPreview.tsx` because PromptPreview is bound to unsaved compose-result state and save/regenerate actions; Prompt History uses a smaller read-only render over `GET /prompts/:promptId`.
