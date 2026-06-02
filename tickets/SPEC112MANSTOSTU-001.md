# SPEC112MANSTOSTU-001: Extend ManualRecordSummary with involved-cast refs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` read layer (`toSummary`) and the `ManualRecordSummary` projection schema (backend + web mirror); additive field only, no impact on existing summary consumers.
**Deps**: None

## Problem

Record cards in the new `<RecordPicker>` (and the extended `RecordCard`) must show "involved cast" so a non-character record (a consequence, a clock) is as identifiable as a character — the report's "pick a consequence should be as good as pick a character" bar (`reports/manual-story-studio-third-iteration.md` §12 / §31). But `ManualRecordSummary` today carries only `id, title, active, importance, tags, summary, prompt_visibility`; `refs` lives only on the full `ManualRecord`. Without surfacing `refs` on the summary, the card cannot render involved cast from the per-class summary feed the picker consumes. This ticket adds the one backend change SPEC-112 requires.

## Assumption Reassessment (2026-06-02)

1. `ManualRecordSummary` is defined at `tools/manual-story-studio/src/schema/manual-story.ts:496` and mirrored in the web type at `tools/manual-story-studio/web/src/types/manual-story.ts:252`; its sole producer is `toSummary` in `tools/manual-story-studio/src/read/records.ts:225-245`, which already parses the full record (so populating `refs` is local — no extra read). `RecordRefs` exists on the web `ManualRecord` type (`web/src/types/manual-story.ts:180`).
2. SPEC-112 §2 item 1 and §8 (Risks) name this as the only backend change; §4 lists `read/records.ts` + `schema/manual-story.ts` + web `types/manual-story.ts` as the modify targets. The reassessment (2026-06-02) decided extend-the-summary (Q1=a) over omitting involved-cast.
3. Cross-artifact boundary under audit: the `ManualRecordSummary` contract spans the backend schema (`src/schema/manual-story.ts`), the web type mirror (`web/src/types/manual-story.ts`), the single producer (`toSummary`), and read-side consumers (`src/templates/filter.ts`, `web/src/pages/{Records,CastAndProfiles,Dashboard,MomentComposer}.tsx`, `web/src/components/RecordCard.tsx`). The two type declarations must stay byte-aligned by hand (there is no generated mirror).
4. (was template item 6 — schema extension) Schema extended: `ManualRecordSummary` (a read-side projection, not a canon CF/CH/story-bundle record). Add the field as **optional** (`involved_cast?: string[]` derived from `refs.characters`, or `refs?: RecordRefs`) so every existing consumer is additive-safe — consumers read existing fields and ignore the new one. `toSummary` populates it from the parsed record. No consumer constructs `ManualRecordSummary` literally (verified: zero `test/` matches), so requiredness is non-breaking either way; optional is chosen to keep the additive guarantee explicit.

## Architecture Check

1. Extending the existing summary projection (vs. fetching full records in the picker, or adding a new aggregate endpoint) keeps the picker's client-side-filter model intact (SPEC-112 §3 / §8): one cheap field on the existing `?class=` feed, no new route, no N-record full-body fetch.
2. No backwards-compatibility shim: the field is added directly to the one contract surface; the web mirror is hand-aligned in the same ticket. No alias type, no deprecated parallel field.

## Verification Layers

1. `toSummary` emits the new field → `node --test` against `tools/manual-story-studio/test/read/records.test.ts` (summary-shape assertion).
2. Backend/web type declarations agree → `tsc` build: backend `npm run build:backend` + web `npm --prefix web test` (`tsc --noEmit`).
3. Additive-only (no existing consumer breaks) → web `tsc --noEmit` over `Records.tsx` / `CastAndProfiles.tsx` / `Dashboard.tsx` / `MomentComposer.tsx` / `templates/filter.ts` compiles unchanged.

## What to Change

### 1. Add the field to the backend schema

In `tools/manual-story-studio/src/schema/manual-story.ts`, add an optional involved-cast field to `ManualRecordSummary` (e.g., `involved_cast?: string[]`). Prefer a derived `involved_cast` (the `refs.characters` array) over exposing the whole `refs` object, so the summary stays a minimal projection.

### 2. Populate it in `toSummary`

In `tools/manual-story-studio/src/read/records.ts`, in `toSummary`, read `refs.characters` off the parsed record (guard for absence — many record classes have no `refs`) and set the new field. Default to `[]` when absent.

### 3. Mirror the field in the web type

In `tools/manual-story-studio/web/src/types/manual-story.ts`, add the identical optional field to the web `ManualRecordSummary` interface.

### 4. Extend the read test

In `tools/manual-story-studio/test/read/records.test.ts`, assert `toSummary` surfaces involved-cast for a record with `refs.characters` and `[]` (or absent) for one without.

## Files to Touch

- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/test/read/records.test.ts` (modify)

## Out of Scope

- The `RecordCard` rendering of involved-cast (that is SPEC112MANSTOSTU-002).
- Referenced-by count (deferred to SPEC-114's referrer pass per SPEC-112 §3).
- Any `?classes=` / `?q=` route filter (SPEC-112 §2.7 decided client-side filter; no route change).
- The full `refs` object on the summary if a derived `involved_cast` suffices.

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/manual-story-studio && npm run test:backend)` — `test/read/records.test.ts` asserts the new involved-cast field on summaries.
2. `(cd tools/manual-story-studio && npm --prefix web test)` — web `tsc --noEmit` green with the mirrored type.
3. `(cd tools/manual-story-studio && npm run build)` — backend + web build succeed.

### Invariants

1. The field is additive and optional; no existing `ManualRecordSummary` consumer changes behavior.
2. The persisted record shape and `refs` storage are unchanged — this is a read-projection extension only.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/records.test.ts` — assert involved-cast presence/absence in `toSummary` output.

### Commands

1. `(cd tools/manual-story-studio && npm run test:backend)`
2. `(cd tools/manual-story-studio && npm test)`
3. Backend `test:backend` is the correct boundary for the producer + type change; the web `tsc --noEmit` (folded into `npm test`) covers the mirrored type.
