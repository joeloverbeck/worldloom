# SPEC114MANSTOSTU-001: Backend referrer resolution (read path)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` read layer (`src/read/records.ts`); no impact on world canon or story-bundle pipeline (canon-fenced package).
**Deps**: None

## Problem

SPEC-114's block-on-referrer delete flow (item 4) and beat-template parity (item 5) both need a "who references record X" pass that returns enough per-referrer detail to render referrer cards (id + class + title + summary) and to find *all* references — including those held in `current-context.yaml` and on segment/prompt sidecars (`selected_template`), which the existing scan does not cover. The existing `scanReferences` (`src/read/records.ts:123`) returns only `{recordClass, id, field}` and scans only `records/<class>/`. It is also already consumed by SPEC-108's segment delete (`src/write/segments.ts:21`), so its `ReferrerEntry` shape must not change. This ticket extends — not duplicates — the referrer pass so the write/UI tickets have a stable summary-bearing source.

## Assumption Reassessment (2026-06-02)

1. `scanReferences` exists at `src/read/records.ts:123` returning `ReadResult<ReferrerEntry[]>`; `ReferrerEntry` is `{recordClass, id, field}` (`src/read/records.ts:117`). `ManualRecordSummaryWithClass` (`{recordClass, summary}`) already exists at `tools/manual-story-studio/web/src/api/records.ts:83` and `listRecordsForClasses` produces it — the backend equivalent shape to return from the enrichment wrapper. `CurrentContext` (`src/schema/current-context.ts`) carries the ID-bearing fields `current_cast`, `pinned_records`, `excluded_records`, `must_not_reveal`, `pov_holder`, `active_pressure_clocks`, `active_secrets_questions`, `current_location`, `last_accepted_segment`, `last_reviewed_after_segment` — all confirmed present.
2. SPEC-114 §2 item 2 and §3 ("Reuse the existing `scanReferences` pass … extended, not duplicated") mandate the extend-not-mutate posture; §2 item 5 mandates the `selected_template` sidecar scan for `mtemplate-*` targets. `docs/FOUNDATIONS.md` §Soft Canon / Local Truth (referential consistency of the story-local record graph) is the alignment cited by the spec's §5.
3. **Cross-artifact shared boundary under audit**: `ReferrerEntry` is a shared contract consumed by `src/write/records.ts` (delete) AND `src/write/segments.ts:21,83-93,243` (SPEC-108 segment delete). The enrichment wrapper MUST be additive (a new `resolveReferrerSummaries` function returning `{recordClass, summary}`), leaving `ReferrerEntry` and `scanReferences`'s existing return type byte-unchanged so the segment-delete consumer is untouched.

## Architecture Check

1. Extending the existing single-pass scanner and layering a summary-resolving wrapper over it (rather than writing a second corpus scan) keeps one source of truth for "who references X", serves both the delete-block flow and SPEC-112's deferred referenced-by count (`.length` of the raw pass), and avoids a divergent second scanner drifting from the first. The `current-context.yaml` / `selected_template` scan is added inside the existing iteration rather than as a parallel pass.
2. No backwards-compatibility shim: `ReferrerEntry` is preserved as-is for `segments.ts`; the wrapper is net-new, not an alias of a renamed symbol.

## Verification Layers

1. Referrer pass finds record-`refs` + per-class-pointer references → existing `scanReferences` unit coverage extended in `test/read/referrers.test.ts` (codebase grep-proof + skill-free unit test).
2. Referrer pass finds current-context references (`pinned_records`, `must_not_reveal`, `excluded_records`, `current_cast`, …) → new assertion in `test/read/referrers.test.ts`.
3. Referrer pass finds `selected_template` sidecar references for an `mtemplate-*` target → new assertion in `test/read/referrers.test.ts`.
4. `resolveReferrerSummaries` returns `{recordClass, summary}` with title + summary populated → unit assertion comparing against `listRecords` summaries.
5. `ReferrerEntry` shape + `scanReferences` signature unchanged → grep-proof that `src/write/segments.ts` still compiles against the unchanged import.

## What to Change

### 1. Broaden the `scanReferences` scan surface

Inside `scanReferences` (`src/read/records.ts`), after the per-class record iteration, additionally scan:
- `current-context.yaml` (read via the existing current-context read path) for the target id across every ID-bearing `CurrentContext` field listed in AR item 1 — emit `ReferrerEntry` entries with a `field` like `current-context.pinned_records[i]`.
- For `mtemplate-*` targets only: segment sidecars (`segments/SEG-<n>.yaml`) and prompt-run sidecars (`prompt-runs/PROMPT-<n>.yaml`) carrying `selected_template === targetId` — emit `ReferrerEntry` entries with a `field` like `segments/SEG-3.yaml:selected_template`. Keep `ReferrerEntry`'s shape unchanged (`{recordClass, id, field}`); for sidecar referrers that are not record-class-owned, reuse an existing class discriminant or a documented sentinel `field` rather than adding a struct member.

### 2. Add `resolveReferrerSummaries`

Add an exported `resolveReferrerSummaries(manualStoryRoot, targetId): ReadResult<Array<{recordClass, summary: ManualRecordSummary}>>` that calls `scanReferences`, then resolves each distinct referrer record to its `ManualRecordSummary` (reusing `listRecords` / `toSummary` so title + summary + active are populated). Dedupe by `{recordClass, id}` (one card per referring record even if it references the target through multiple fields). Do not change `scanReferences` itself — the wrapper composes it.

## Files to Touch

- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/test/read/referrers.test.ts` (new)

## Out of Scope

- Any change to `ReferrerEntry`'s struct shape or `scanReferences`'s signature (would ripple into SPEC-108's `segments.ts`).
- The delete write-path rework (SPEC114MANSTOSTU-002) and any UI (003/004).
- Renaming `current-context.yaml` to "Prompt Working Set" (report §6/§39 Stage 1 — a separate concern, not this spec).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — `test/read/referrers.test.ts` asserts the pass finds references in record `refs`, in current-context fields, and in a `selected_template` sidecar for an `mtemplate-*` target.
2. `resolveReferrerSummaries` returns entries whose `summary.title` and `summary.summary` are populated and deduped one-per-referring-record.
3. `cd tools/manual-story-studio && npm run build` — succeeds (segment-delete consumer still compiles against the unchanged `ReferrerEntry`).

### Invariants

1. `ReferrerEntry` and `scanReferences`'s return type are byte-unchanged; `src/write/segments.ts` imports them without modification.
2. The referrer pass is the single corpus scanner; no second full-corpus scan is introduced.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/referrers.test.ts` (new) — covers record-ref, current-context, and `selected_template`-sidecar referrer discovery plus `resolveReferrerSummaries` enrichment.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm run build`
3. Backend-only `test:backend` is the correct boundary — this ticket touches no web/TSX surface, so the web `tsc --noEmit` adds no coverage here (it runs in the full `npm test` exercised by downstream UI tickets).
