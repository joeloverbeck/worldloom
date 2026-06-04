# MSSUX-012: Make the filename the authoritative record id at the read boundary (defense-in-depth)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio read layer (`tools/manual-story-studio/src/read/records.ts`) plus tests. No HTTP-route signature change.
**Deps**: `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` for the completed write-side guarantee. `archive/tickets/MSSUX-011-repair-corrupt-cast-record-id.md` has repaired the observed corrupt record. Complements those tickets by adding read-side enforcement of the same FOUNDATIONS-002 invariant.

## Problem

At intake, when `records/cast/mchar-1.yaml` carried `id: ""`, the read layer **silently propagated** that empty id to every consumer. `listRecords` → `toSummary` (`src/read/records.ts`) built the summary's `id` from the record **body** (`obj.id`), not from the filename stem — even though the file was already gated by a `^mchar-\d+$` **filename** pattern at read time. So one corrupt-on-disk record silently broke the entire cast UI (empty ids in pickers, no-op card clicks, a 400 in moment-composer) with no diagnostic signal anywhere.

FOUNDATIONS-002 establishes that the filename and the `id` field must be identical. Before this ticket, the read boundary did not enforce this: it trusted the body id and ignored the filename it already parsed. This ticket makes the **filename authoritative** for the id consumers see, and surfaces non-empty body/filename mismatches loudly at full-record read instead of swallowing them — so a hand-edited, imported, or otherwise-divergent record can never again silently degrade the whole UI.

## Assumption Reassessment (2026-06-04)

1. `toSummary` (`src/read/records.ts`) returns `id: obj.id` (the body field). `listRecords` has already matched the filename against `^${prefix}-(\\d+)\\.yaml$` and holds the stem in `match[1]` / `entry.name`, but discards it in favor of the body id. `readRecord` takes the id as a parameter (filename-derived) yet returns the parsed body verbatim, so a caller can receive a record whose `.id` disagrees with the id it requested.
2. The package already cares about not masking errors: `test/read/no-silent-catch.test.ts` exists. A filename/body id mismatch that is silently normalized would violate that spirit, so the chosen design surfaces the mismatch (see Architecture Check) rather than hiding it.
3. Cross-artifact boundary: the filename pattern (`^${prefix}-(\\d+)\\.yaml$`) and the id pattern (`^${prefix}-\\d+$`) are both built from `MANUAL_RECORD_CLASS_PREFIXES`. The read-side normalization must use the filename stem the read layer already extracts; it must not introduce a second, divergent source of truth for the id.
4. FOUNDATIONS principle: FOUNDATIONS-002 (filename ≡ `id`) plus the §Machine-Facing Layer Validator-Framework expectation that structural invariants (id integrity) are enforced, not assumed. `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` enforces this on write; this ticket enforces it on read, closing the loop for files that bypass the studio's write path (manual edits, `SourceBrowser` import, files predating MSSUX-010).
5. Adjacent contradiction classification: this ticket is **defense-in-depth**, deliberately separate from the completed root-cause fix (`archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md`) and the completed data repair (`archive/tickets/MSSUX-011-repair-corrupt-cast-record-id.md`). It is not required to make the reported symptoms go away (MSSUX-010 + MSSUX-011 do that); it prevents the *class* of silent failure from recurring.

## Architecture Check

1. **Chosen design — filename-authoritative summaries, with a visible mismatch signal on full record read.** `listRecords`/`toSummary` set the summary `id` to the filename stem (already parsed and pattern-checked), guaranteeing every summary carries a well-formed id and the UI never breaks from this corruption class. `readRecord` normalizes the returned record's `.id` to the requested (filename-derived) id. When the body `id` is a **non-empty** string that disagrees with the filename stem, `readRecord` surfaces it as a structured `ReadError` rather than silently rewriting — honoring `no-silent-catch` at the full-record boundary. List summaries remain usable and filename-authoritative for both empty and mismatched body ids. The empty-string body id (`""`, the observed corruption) is treated as "use the filename" so the list and full read still render, even though `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` and `archive/tickets/MSSUX-011-repair-corrupt-cast-record-id.md` make that case unlikely in normal studio use.
2. **Rejected alternative — hard fail-closed on any list read.** Erroring the entire `listRecords` call when one file is corrupt would 500 the whole cast page on a single bad record — poor cockpit UX for a local writing tool. Filename-authoritative read keeps the surface usable while still surfacing the inconsistency.
3. **Rejected alternative — do nothing (rely on completed MSSUX-010 only).** Write-side validation does not run on read; a file created outside the studio write path (import, manual edit) would still silently break every consumer. The read guard is the only enforcement at that boundary.
4. No backwards-compatibility shim: the id source flips to the filename in one place; no alias or opt-out.

## Verification Layers

1. Summary id comes from the filename -> unit test: a `cast/mchar-1.yaml` whose body has `id: ""` (and one with `id: "mchar-9"`) is listed with `id: "mchar-1"`.
2. Mismatch surfaced, not swallowed at full-record read -> unit test: a record whose body `id` is a non-empty wrong value (`mchar-9` in `mchar-1.yaml`) causes `readRecord` to return a structured `ReadError` (not a silently-normalized success).
3. Empty-id record still renders -> unit test: `listRecords` over a directory containing the empty-id `mchar-1.yaml` returns it with id `mchar-1` (no thrown error, list non-empty).
4. No regression -> existing `test/read/records.test.ts`, `test/read/no-silent-catch.test.ts`, and `npm test` pass.

## Landed Changes

### 1. Filename-authoritative id in `listRecords`

`src/read/records.ts` now derives the summary id from the matched filename stem and passes that authoritative id into `toSummary`, instead of trusting `obj.id`.

### 2. Normalize / guard the id in `readRecord`

`src/read/records.ts` now returns records with the requested filename-derived `id`. If the parsed body `id` is a **non-empty string** that differs from the requested id, it returns an `id_filename_mismatch` `ReadError`. An empty-string body id is normalized to the filename id, matching the list behavior.

### 3. Map the new read error through HTTP

`src/server/read-error-http.ts` maps `id_filename_mismatch` to a degraded 409 `HealthReport`, and `test/server/read-error-http.test.ts` proves that route-level projection.

## Files to Touch

- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/src/server/read-error-http.ts` (modify — map `id_filename_mismatch`)
- `tools/manual-story-studio/test/read/records.test.ts` (modify — add filename-authoritative + mismatch cases)
- `tools/manual-story-studio/test/server/read-error-http.test.ts` (modify — add `id_filename_mismatch` mapping case)

## Out of Scope

- Write-path / validator changes (`archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md`).
- Repairing the existing corrupt record (`archive/tickets/MSSUX-011-repair-corrupt-cast-record-id.md`).
- A repository-wide scan-and-repair migration for divergent ids.
- Wiring the mismatch into the HealthBanner/LintBadge surfaces — the structured `ReadError` is sufficient signal; richer health-panel integration can be its own ticket if a need emerges.

## Acceptance Criteria

### Tests That Must Pass

1. `listRecords` returns `id: "mchar-1"` for a `cast/mchar-1.yaml` whose body has `id: ""` (filename authoritative).
2. `readRecord(root, "cast", "mchar-1")` for a body `id: ""` returns the record normalized to `id: "mchar-1"`.
3. `readRecord(root, "cast", "mchar-1")` for a body `id: "mchar-9"` (non-empty, wrong) returns a structured `ReadError`, not a success.
4. `npm test` from `tools/manual-story-studio/` passes.

### Invariants

1. Every `ManualRecordSummary.id` returned by `listRecords` equals the filename stem and matches `^<prefix>-[0-9]+$`.
2. A non-empty body id that disagrees with the filename is never silently accepted — it is surfaced as a `ReadError`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/records.test.ts` — add (a) empty-body-id → filename-authoritative summary/read, (b) non-empty mismatched-body-id → structured ReadError.
2. `tools/manual-story-studio/test/server/read-error-http.test.ts` — add the `id_filename_mismatch` HTTP projection case.

### Commands

1. From `tools/manual-story-studio/`: `npm run build:backend`
2. From `tools/manual-story-studio/`: `node --test dist/test/read/records.test.js dist/test/read/no-silent-catch.test.js dist/test/server/read-error-http.test.js`
3. From `tools/manual-story-studio/`: `npm test`

## Outcome

Completed on 2026-06-04.

- `listRecords` now emits filename-authoritative summary ids for empty or mismatched body ids.
- `readRecord` now normalizes empty body ids to the requested filename id, but returns `id_filename_mismatch` for non-empty body ids that disagree with the filename.
- `id_filename_mismatch` is mapped through HTTP as a degraded 409 `HealthReport`, avoiding an unrecognized-code 500.
- Added focused read and HTTP mapping tests for the new behavior.

## Verification Result

- `npm run build:backend` from `tools/manual-story-studio/` passed.
- `node --test dist/test/read/records.test.js dist/test/read/no-silent-catch.test.js dist/test/server/read-error-http.test.js` from `tools/manual-story-studio/` passed: 22 tests.
- `npm test` from `tools/manual-story-studio/` passed: 502 backend tests plus the web TypeScript gate.
- Manual closeout sweep found no existing package README or repo doc error-code inventory requiring a same-seam update.

## Deviations

- Reassessment corrected one ticket-internal wording mismatch: list summaries remain filename-authoritative and usable for both empty and mismatched body ids; the visible structured mismatch signal is enforced at the full-record `readRecord` boundary.
