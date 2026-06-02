# SPEC114MANSTOSTU-001: Backend referrer resolution (read path)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` read layer (`src/read/records.ts`); no impact on world canon or story-bundle pipeline (canon-fenced package).
**Deps**: None

## Problem

At intake, SPEC-114's block-on-referrer delete flow (item 4) and beat-template parity (item 5) needed a "who references record X" pass that returned enough per-referrer detail to render referrer cards (id + class + title + summary) and found *all* references — including those held in `current-context.yaml` and on segment/prompt sidecars. The existing `scanReferences` (`src/read/records.ts:123`) returned only `{recordClass, id, field}` and scanned only `records/<class>/`. It was also already consumed by SPEC-108's segment delete (`src/write/segments.ts:21`), so its `ReferrerEntry` shape could not change. This ticket extended — not duplicated — the referrer pass so the write/UI tickets have a stable summary-bearing source.

## Assumption Reassessment (2026-06-02)

1. `scanReferences` exists at `src/read/records.ts:123` returning `ReadResult<ReferrerEntry[]>`; `ReferrerEntry` is `{recordClass, id, field}` (`src/read/records.ts:117`). `ManualRecordSummaryWithClass` (`{recordClass, summary}`) already exists at `tools/manual-story-studio/web/src/api/records.ts:83` and `listRecordsForClasses` produces it — the backend equivalent shape to return from the enrichment wrapper. `CurrentContext` (`src/schema/current-context.ts`) carries the ID-bearing fields `current_cast`, `pinned_records`, `excluded_records`, `must_not_reveal`, `pov_holder`, `active_pressure_clocks`, `active_secrets_questions`, `current_location`, `last_accepted_segment`, `last_reviewed_after_segment` — all confirmed present.
2. SPEC-114 §2 item 2 and §3 ("Reuse the existing `scanReferences` pass … extended, not duplicated") mandate the extend-not-mutate posture; §2 item 5 mandates the `selected_template` sidecar scan for `mtemplate-*` targets. `docs/FOUNDATIONS.md` §Soft Canon / Local Truth (referential consistency of the story-local record graph) is the alignment cited by the spec's §5.
3. **Cross-artifact shared boundary under audit**: `ReferrerEntry` is a shared contract consumed by `src/write/records.ts` (delete) AND `src/write/segments.ts:21,83-93,243` (SPEC-108 segment delete). The enrichment wrapper MUST be additive (a new `resolveReferrerSummaries` function returning `{recordClass, summary}`), leaving `ReferrerEntry` and `scanReferences`'s existing return type byte-unchanged so the segment-delete consumer is untouched.
4. Implementation correction: live prompt-run sidecars store the selected template as `included_template_path` (path-shaped) and route/listing code derives the public `selected_template` id from that path. The scanner therefore checks segment sidecars' `selected_template` and prompt-run sidecars' `included_template_path` so the SPEC-114 template-referrer requirement is implemented against the live persisted shape.

## Architecture Check

1. Extending the existing single-pass scanner and layering a summary-resolving wrapper over it (rather than writing a second corpus scan) keeps one source of truth for "who references X", serves both the delete-block flow and SPEC-112's deferred referenced-by count (`.length` of the raw pass), and avoids a divergent second scanner drifting from the first. The `current-context.yaml` / `selected_template` scan is added inside the existing iteration rather than as a parallel pass.
2. No backwards-compatibility shim: `ReferrerEntry` is preserved as-is for `segments.ts`; the wrapper is net-new, not an alias of a renamed symbol.

## Verification Layers

1. Referrer pass finds record-`refs` + per-class-pointer references → existing `scanReferences` unit coverage extended in `test/read/referrers.test.ts` (codebase grep-proof + skill-free unit test).
2. Referrer pass finds current-context references (`pinned_records`, `must_not_reveal`, `excluded_records`, `current_cast`, …) → new assertion in `test/read/referrers.test.ts`.
3. Referrer pass finds template sidecar references for an `mtemplate-*` target → new assertion in `test/read/referrers.test.ts` covers segment `selected_template` and prompt-run `included_template_path`.
4. `resolveReferrerSummaries` returns `{recordClass, summary}` with title + summary populated → unit assertion comparing against `listRecords` summaries.
5. `ReferrerEntry` shape + `scanReferences` signature unchanged → grep-proof that `src/write/segments.ts` still compiles against the unchanged import.

## Landed Changes

### 1. Broadened the `scanReferences` scan surface

Inside `scanReferences` (`src/read/records.ts`), after the per-class record iteration, the implementation now additionally scans:
- `current-context.yaml` (read via the existing current-context read path) for the target id across every ID-bearing `CurrentContext` field listed in AR item 1 — emit `ReferrerEntry` entries with a `field` like `current-context.pinned_records[i]`.
- For `mtemplate-*` targets only: segment sidecars (`segments/SEG-<n>.yaml`) carrying `selected_template === targetId` and prompt-run sidecars (`prompt-runs/PROMPT-<n>.yaml`) carrying an `included_template_path` that resolves to the target id. These emit `ReferrerEntry` entries with fields like `segments/SEG-3.yaml:selected_template` and `prompt-runs/PROMPT-3.yaml:included_template_path`. `ReferrerEntry`'s shape remains unchanged (`{recordClass, id, field}`); non-record referrers use the existing `recordClass` discriminant plus sentinel ids such as `current-context`, `SEG-1`, and `PROMPT-1`.

### 2. Added `resolveReferrerSummaries`

Added an exported `resolveReferrerSummaries(manualStoryRoot, targetId): ReadResult<Array<{recordClass, summary: ManualRecordSummary}>>` that calls `scanReferences`, then resolves each distinct record referrer to its `ManualRecordSummary` (reusing the existing summary conversion so title + summary + active are populated). It dedupes by `{recordClass, id}` (one card per referring record even if it references the target through multiple fields). Non-record referrers receive synthetic summaries naming the control file or sidecar, without changing `scanReferences` itself.

## Files to Touch

- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/test/read/referrers.test.ts` (new)

## Out of Scope

- Any change to `ReferrerEntry`'s struct shape or `scanReferences`'s signature (would ripple into SPEC-108's `segments.ts`).
- The delete write-path rework (archive/tickets/SPEC114MANSTOSTU-002.md) and UI work (archive/tickets/SPEC114MANSTOSTU-003.md / archive/tickets/SPEC114MANSTOSTU-004.md).
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

## Outcome

Completed on 2026-06-02.

`tools/manual-story-studio/src/read/records.ts` now keeps the `ReferrerEntry` interface and `scanReferences(manualStoryRoot, targetId): ReadResult<ReferrerEntry[]>` signature unchanged while extending the scan to:

- record `refs` and typed pointer fields (existing behavior preserved);
- `current-context.yaml` ID-bearing fields;
- segment sidecars' `selected_template` for `mtemplate-*` targets;
- prompt-run sidecars' live persisted `included_template_path` for `mtemplate-*` targets.

The new `resolveReferrerSummaries` wrapper dedupes referrers by `{recordClass, id}` and returns populated summaries for record referrers plus synthetic summaries for non-record control-file/sidecar referrers. `tools/manual-story-studio/test/read/referrers.test.ts` was added to cover record refs, current-context refs, segment/prompt template sidecars, and summary enrichment/deduping.

## Verification Result

- `cd tools/manual-story-studio && npm run test:backend` — PASS before edits as baseline: 78 tests passed.
- `cd tools/manual-story-studio && npm run test:backend` — PASS after edits: 79 tests passed, including `dist/test/read/referrers.test.js`.
- `cd tools/manual-story-studio && npm run build` — PASS after edits: web install/build and backend `tsc` completed successfully.
- Manual contract review — PASS: `ReferrerEntry` remains `{recordClass, id, field}`, `scanReferences` keeps the same exported signature, and `src/write/segments.ts` still imports the unchanged scanner contract.

## Deviations

- SPEC-114/ticket prose described prompt-run sidecars as carrying `selected_template`; the live persisted prompt-run sidecar field is `included_template_path`, with routes deriving `selected_template` for list responses. The implementation scans `included_template_path` for prompt runs and records that field in the referrer result.
- Non-record referrers cannot be represented as true record cards without widening `ReferrerEntry`. To preserve the ticket's no-shape-change invariant, current-context and sidecar referrers use sentinel ids (`current-context`, `SEG-*`, `PROMPT-*`) with synthetic summaries in `resolveReferrerSummaries`.
