# MSSUX-012: Make the filename the authoritative record id at the read boundary (defense-in-depth)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None for canon/MCP/patch-engine. Touches the Manual Story Studio read layer (`tools/manual-story-studio/src/read/records.ts`) plus tests. No HTTP-route signature change.
**Deps**: `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` for the completed write-side guarantee. Complements that ticket by adding read-side enforcement of the same FOUNDATIONS-002 invariant. Independent of MSSUX-011.

## Problem

When `records/cast/mchar-1.yaml` carried `id: ""`, the read layer **silently propagated** that empty id to every consumer. `listRecords` → `toSummary` (`src/read/records.ts`) builds the summary's `id` from the record **body** (`obj.id`), not from the filename stem — even though the file is already gated by a `^mchar-\d+$` **filename** pattern at read time. So one corrupt-on-disk record silently broke the entire cast UI (empty ids in pickers, no-op card clicks, a 400 in moment-composer) with no diagnostic signal anywhere.

FOUNDATIONS-002 establishes that the filename and the `id` field must be identical. The read boundary does not enforce this: it trusts the body id and ignores the filename it already parsed. This ticket makes the **filename authoritative** for the id consumers see, and surfaces a mismatch loudly instead of swallowing it — so a hand-edited, imported, or otherwise-divergent record can never again silently degrade the whole UI.

## Assumption Reassessment (2026-06-04)

1. `toSummary` (`src/read/records.ts`) returns `id: obj.id` (the body field). `listRecords` has already matched the filename against `^${prefix}-(\\d+)\\.yaml$` and holds the stem in `match[1]` / `entry.name`, but discards it in favor of the body id. `readRecord` takes the id as a parameter (filename-derived) yet returns the parsed body verbatim, so a caller can receive a record whose `.id` disagrees with the id it requested.
2. The package already cares about not masking errors: `test/read/no-silent-catch.test.ts` exists. A filename/body id mismatch that is silently normalized would violate that spirit, so the chosen design surfaces the mismatch (see Architecture Check) rather than hiding it.
3. Cross-artifact boundary: the filename pattern (`^${prefix}-(\\d+)\\.yaml$`) and the id pattern (`^${prefix}-\\d+$`) are both built from `MANUAL_RECORD_CLASS_PREFIXES`. The read-side normalization must use the filename stem the read layer already extracts; it must not introduce a second, divergent source of truth for the id.
4. FOUNDATIONS principle: FOUNDATIONS-002 (filename ≡ `id`) plus the §Machine-Facing Layer Validator-Framework expectation that structural invariants (id integrity) are enforced, not assumed. `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` enforces this on write; this ticket enforces it on read, closing the loop for files that bypass the studio's write path (manual edits, `SourceBrowser` import, files predating MSSUX-010).
5. Adjacent contradiction classification: this ticket is **defense-in-depth**, deliberately separate from the completed root-cause fix (`archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md`) and the data repair (MSSUX-011). It is not required to make the reported symptoms go away (MSSUX-010 + MSSUX-011 do that); it prevents the *class* of silent failure from recurring.

## Architecture Check

1. **Chosen design — filename-authoritative id, with a visible mismatch signal.** `listRecords`/`toSummary` set the summary `id` to the filename stem (already parsed and pattern-checked), guaranteeing every summary carries a well-formed id and the UI never breaks from this corruption class. `readRecord` normalizes the returned record's `.id` to the requested (filename-derived) id. When the body `id` is a **non-empty** string that disagrees with the filename stem, the read layer surfaces it as a structured signal (a `ReadError` from `readRecord`, consistent with the existing `schema_validation_failed` / `invalid_id_shape` error model; and for `listRecords`, the existing `err(...)` path) rather than silently rewriting — honoring `no-silent-catch`. The empty-string body id (`""`, the observed corruption) is treated as "use the filename" so the list still renders, since after MSSUX-010 + MSSUX-011 it should not occur anyway.
2. **Rejected alternative — hard fail-closed on any list read.** Erroring the entire `listRecords` call when one file is corrupt would 500 the whole cast page on a single bad record — poor cockpit UX for a local writing tool. Filename-authoritative read keeps the surface usable while still surfacing the inconsistency.
3. **Rejected alternative — do nothing (rely on completed MSSUX-010 only).** Write-side validation does not run on read; a file created outside the studio write path (import, manual edit) would still silently break every consumer. The read guard is the only enforcement at that boundary.
4. No backwards-compatibility shim: the id source flips to the filename in one place; no alias or opt-out.

## Verification Layers

1. Summary id comes from the filename -> unit test: a `cast/mchar-1.yaml` whose body has `id: ""` (and one with `id: "mchar-9"`) is listed with `id: "mchar-1"`.
2. Mismatch surfaced, not swallowed -> unit test: a record whose body `id` is a non-empty wrong value (`mchar-9` in `mchar-1.yaml`) causes `readRecord` to return a structured `ReadError` (not a silently-normalized success).
3. Empty-id record still renders -> unit test: `listRecords` over a directory containing the empty-id `mchar-1.yaml` returns it with id `mchar-1` (no thrown error, list non-empty).
4. No regression -> existing `test/read/records.test.ts`, `test/read/no-silent-catch.test.ts`, and `npm test` pass.

## What to Change

### 1. Filename-authoritative id in `listRecords`

`src/read/records.ts` — in `listRecords`, derive the id from the already-matched filename stem (`match[1]` → `${prefix}-${n}`, or `path.basename(entry.name, ".yaml")`) and pass it to `toSummary` (or set `summary.id` to the stem after building the summary), instead of trusting `obj.id`. Keep the existing `toSummary` null-check for `title`.

### 2. Normalize / guard the id in `readRecord`

`src/read/records.ts` — `readRecord` already receives the filename-derived `id`. Set the returned record's `id` to that value. If the parsed body `id` is a **non-empty string** that differs from the requested id, return a structured `ReadError` (new code e.g. `id_filename_mismatch`, or reuse `schema_validation_failed` with a clear `repair_hint`) rather than returning the record. An empty-string body id is normalized to the filename id (no error), matching the list behavior.

## Files to Touch

- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/src/read/result.ts` (modify — only if adding a new `id_filename_mismatch` ReadError code)
- `tools/manual-story-studio/test/read/records.test.ts` (modify — add filename-authoritative + mismatch cases)

## Out of Scope

- Write-path / validator changes (`archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md`).
- Repairing the existing corrupt record (MSSUX-011).
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

### Commands

1. From `tools/manual-story-studio/`: `npm run build:backend`
2. From `tools/manual-story-studio/`: `node --test dist/test/read/records.test.js dist/test/read/no-silent-catch.test.js`
3. From `tools/manual-story-studio/`: `npm test`
