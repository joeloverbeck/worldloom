# SPEC103PROPASSEG-010: Prompts route extension — `linked_segments` on `GET /prompts` response + frontend API mirror

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/manual-story-studio/src/server/routes/prompts.ts` `GET /prompts` listing response to include `linked_segments: string[]`; extends `tools/manual-story-studio/test/server/prompts-routes.test.ts` with linked-segments coverage; extends `tools/manual-story-studio/web/src/api/prompts.ts` to type the new field on the client side; truths the SPEC-103 test note that briefly implied the prompt detail endpoint also carried this field.
**Deps**: archive/tickets/SPEC103PROPASSEG-007.md

## Problem

Before this ticket, SPEC-103 §2 item 8 specified the Prompt History view's per-prompt content: *"id, created_at, moment_directive snippet, links to the segments produced from this prompt (computed by scanning segment sidecars for matching `prompt_id`)"*, but the existing SPEC-102-landed `GET /prompts` listing returned only prompt metadata. This ticket extends that existing listing with `linked_segments: string[]` rather than creating a sibling `routes/prompt-history.ts` file.

## Assumption Reassessment (2026-05-31)

1. Existing `tools/manual-story-studio/src/server/routes/prompts.ts:129-169` already exposes `GET /api/worlds/:slug/manual-stories/:msSlug/prompts` returning `{ prompts: Array<{ id, created_at, moment_directive_snippet }> }`. The extension adds `linked_segments: string[]` to each entry — a list of `SEG-<integer>` IDs (in save-time order, which corresponds to numeric SEG-N suffix order). Ticket 007's `listSegments` + `readSegmentSidecar` provide the segment-enumeration + sidecar-reading primitives this extension uses; for each prompt, scan segment sidecars and collect those whose `prompt_id` matches. Existing test fixture at `tools/manual-story-studio/test/server/prompts-routes.test.ts` is the target for the extended assertion.
2. SPEC-103 §2 item 8 (Prompt History view per-prompt content includes linked segments), §3 reassessment decision (Q2=(a): extend `routes/prompts.ts` rather than create `routes/prompt-history.ts`), §4 Modify enumerates `src/server/routes/prompts.ts` + `web/src/api/prompts.ts` + the test extension, §7 AC#10 ("Prompt History view lists saved prompts with links to segments produced from them").
3. Cross-skill boundary: this ticket extends SPEC-102-landed code (`src/server/routes/prompts.ts:129-169` GET listing + `web/src/api/prompts.ts` typed client). The extension is consumed by ticket 014's PromptHistory page (renders `linked_segments` as clickable links to each SEG-<integer>'s segment under the Manuscript view). The extension reuses ticket 007's `read/segments.ts` `listSegments` + `readSegmentSidecar` (each segment sidecar has the `prompt_id` field added in ticket 001's `SegmentSidecar` shape — matching is `sidecar.prompt_id === prompt.id`).
4. Existing `GET /prompts` response schema is extended (additive: new `linked_segments` field added to each entry; no existing field renamed or removed). Per SPEC-102's listing response shape, downstream consumers (currently only the spec-time hypothesized Prompt History view — no other consumer exists in the codebase per Pre-flight grep) expect the existing `{ id, created_at, moment_directive_snippet }` fields and ignore unknown fields by default (Fastify JSON deserialization permits extra fields client-side); adding `linked_segments` does not break any existing consumer.
5. Reassessment found one stale SPEC-103 test note at `specs/SPEC-103-prose-paste-segments-and-manuscript.md` that said to verify `linked_segments` on both `GET /prompts` and `GET /prompts/:promptId`. The live accepted boundary remains listing-only: ticket 014 consumes `GET /prompts` for `linked_segments` and uses the existing SPEC-102 prompt detail endpoint only for markdown + sidecar display. The spec note was corrected to prevent a false detail-endpoint requirement.

## Architecture Check

1. Extending the existing prompts listing endpoint preserves the SPEC-102 route file's organizational shape rather than introducing a parallel `prompt-history.ts` file with duplicated prompt-sidecar enumeration logic. Reuses ticket 007's `listSegments` + `readSegmentSidecar` for the segment-side enumeration; the prompt-side enumeration is the existing `routes/prompts.ts:142-167` scan of `prompt-runs/PROMPT-*.yaml` sidecars.
2. No backwards-compatibility aliasing — additive extension: new `linked_segments: string[]` field on each existing entry; existing fields preserved verbatim. The extension does not introduce any new endpoint, route prefix, or version path.

## Verification Layers

1. `GET /prompts` response entries each carry a new `linked_segments: string[]` field → route test
2. `linked_segments` enumerates `SEG-<integer>` IDs whose sidecar's `prompt_id` matches the prompt's `id` → route test (fixture with PROMPT-1 referenced by SEG-1 + SEG-3; PROMPT-2 referenced by no segment → linked_segments for PROMPT-1 = ["SEG-1", "SEG-3"]; for PROMPT-2 = [])
3. `linked_segments` is sorted by numeric SEG-N suffix (save-time order proxy) → route test
4. Frontend `web/src/api/prompts.ts` typed client surface includes `linked_segments: string[]` on the listing entry type → codebase grep-proof + type-check pass

## Landed Changes

### 1. Extended src/server/routes/prompts.ts

In `tools/manual-story-studio/src/server/routes/prompts.ts`, the `GET /prompts` handler now computes `linked_segments` per prompt:

- Imports `listSegments` and `readSegmentSidecar` from `../../read/segments.js`.
- Builds a single `Map<promptId, segmentIds[]>` before the prompt loop.
- Adds `linked_segments` to the returned entry shape: `{ id, created_at, moment_directive_snippet, linked_segments }`.

The prompt detail endpoint remains unchanged.

### 2. Extended test/server/prompts-routes.test.ts

In the existing prompts-routes test file:

- Existing `GET /prompts lists saved prompts` coverage now asserts empty `linked_segments: []` for prompts with no linked segments.
- Added `GET /prompts returns linked segment ids in numeric SEG order`, covering PROMPT-1 linked to `SEG-1`, `SEG-3`, and `SEG-10`; PROMPT-2 linked to `SEG-2`; and a null-prompt segment that is excluded.

All existing prompts-route test cases were preserved.

### 3. Extended web/src/api/prompts.ts

`PromptListEntry` now includes `linked_segments: string[]`; `listPrompts` keeps the same function signature and returns the extended listing shape.

### 4. Truthed SPEC-103 test note

Updated `specs/SPEC-103-prose-paste-segments-and-manuscript.md` so the prompts-routes test row says `linked_segments` is verified on the `GET /prompts` listing response only. `GET /prompts/:promptId` remains the existing prompt detail endpoint consumed separately by Prompt History.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/prompts.ts` (modify — extend GET /prompts handler with linked_segments)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify — extend with linked_segments test cases)
- `tools/manual-story-studio/web/src/api/prompts.ts` (modify — extend client type with linked_segments field)
- `specs/SPEC-103-prose-paste-segments-and-manuscript.md` (modify — correct stale test note to listing-only linked_segments proof)

## Out of Scope

- The Prompt History view itself (covered by ticket 014 — consumes the extended response shape)
- The `GET /prompts/:promptId` detail endpoint (existing SPEC-102 surface; not extended in this ticket)
- The `POST /prompts` save endpoint (existing SPEC-102 surface; not modified)
- Any change to segment sidecar `prompt_id` field semantics (defined in ticket 001 schema; this ticket consumes the field as-is)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/prompts-routes.test.js"` — extended prompts-routes tests pass (existing assertions + new linked_segments assertions)
2. `cd tools/manual-story-studio && npm test` — full suite green; SPEC-102 capstone and existing prompts-routes coverage unaffected
3. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle builds with the extended `linked_segments` type

### Invariants

1. Extension to `GET /prompts` is additive-only: existing `{ id, created_at, moment_directive_snippet }` fields preserved verbatim; new `linked_segments` field added to each entry.
2. `linked_segments` is sorted by numeric SEG-N suffix (not lexicographic) — guards against the SEG-10 < SEG-9 lexicographic pitfall, parallel to ticket 007's `listSegments` ordering invariant.
3. The Q2=(a) reassessment resolution is honored: no new `routes/prompt-history.ts` file is created; the prompt-history-with-linked-segments listing lives in the existing `routes/prompts.ts`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify, extend) — new test cases for `linked_segments` field per the Verification Layers above.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/prompts-routes.test.js"` — targeted prompts-routes test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification including web bundle build

## Outcome

Completed 2026-05-31. The Manual Story Studio prompts listing now returns `linked_segments: string[]` on each prompt entry by scanning segment sidecars once per request and grouping by `prompt_id`. The frontend prompt listing type mirrors the new field. The prompt detail endpoint was intentionally left unchanged, and the SPEC-103 test note was corrected to match that listing-only contract.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS; backend TypeScript compilation succeeded after the route/test changes.
2. `cd tools/manual-story-studio && node --test "dist/test/server/prompts-routes.test.js"` — PASS; 8 prompts-route tests passed, including empty `linked_segments` and numeric `SEG-1`, `SEG-3`, `SEG-10` ordering.
3. `cd tools/manual-story-studio && npm --prefix web run build` — PASS; frontend type-check and Vite build succeeded with `PromptListEntry.linked_segments`.
4. `cd tools/manual-story-studio && npm test` — PASS; backend build succeeded, `node --test "dist/test/**/*.test.js"` reported 269 passing subtests, and `npm --prefix web test` completed successfully.

## Deviations

- SPEC-103's test list briefly mentioned verifying `linked_segments` on `GET /prompts/:promptId`; reassessment narrowed this to the accepted listing-only boundary. Prompt detail remains the existing SPEC-102 endpoint and is consumed separately by ticket 014's PromptHistory page.
