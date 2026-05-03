# MCPENH-029: Emit warning when world-index silently skips records that fail schema-validation at parse time

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/parse/atomic.ts` parse-time error reporting; CLI surface in `tools/world-index/src/cli.ts` to surface the warnings; corresponding test updates.
**Deps**: `archive/tickets/MCPENH-028-tighten-stint-allocator-regex-to-bare-numeric.md` (the paired completed ticket that aligns the allocator regex with the strict form; without MCPENH-028 the allocator and the indexer would still disagree even after this ticket's warnings land).

## Problem

The world-index parser at `tools/world-index/src/parse/atomic.ts` registers atomic-record subdirectories for indexing (canon, change-log, invariants, mystery-reserve, open-questions, entities, sections, plus story-bundle classes including intentions). For each registered subdirectory, the parser reads YAML files, extracts the configured `idField`, and emits a node for storage in `world.db`. When a record's id field fails the schema validator's pattern (e.g., legacy `STINT-NNNN-<char>` records under the strict `^STINT-[0-9]{4}$` regex), the parser silently drops the record — no warning, no log entry, no error. The filesystem and the index then disagree silently.

Concrete session evidence: in this session's `branching-story-page-cycle` execution against `worlds/erotica-world/stories/marla-kern-seduction`, the on-disk state was:

```
worlds/erotica-world/stories/marla-kern-seduction/_source/intentions/
├── STINT-0001-iker.yaml    (~50 lines, valid YAML, id: STINT-0001-iker)
└── STINT-0001-marla.yaml   (~70 lines, valid YAML, id: STINT-0001-marla)
```

But `sqlite3 worlds/erotica-world/_index/world.db "SELECT node_id FROM nodes WHERE node_id LIKE 'STINT%'"` returned zero rows. The indexer had silently skipped both records. This caused MCPENH-028's downstream race-check failure — the patch engine queries `world.db` (sees zero STINTs) while the allocator queries the filesystem (sees both STINTs). Without index-skip warnings, neither party knows the divergence exists.

The fix: when the parser encounters a record whose id fails the registered `idField`-extraction or whose extracted id fails the schema validator's pattern, emit a structured warning naming (i) the file path, (ii) the extracted id (or the parse-failure reason), (iii) the expected pattern. Surface the warnings via `world-index sync` CLI output AND record them in a new `_index/world.db.skipped_records.log` file so a future audit can reconstruct the skip set.

This is a defense-in-depth surface. The skip behavior itself is correct (an invalid record should NOT pollute the index with mismatched id formats), but the silence is the failure mode — operators don't know the index diverges from the filesystem until a downstream race-check or retrieval-tool query fires unexpectedly.

## Assumption Reassessment (2026-05-03)

1. **Indexer parser confirmed at HEAD** — `tools/world-index/src/parse/atomic.ts:60-75` registers `intentions` as `{ nodeType: "intention_record", idField: "id" }` along with the other story-bundle classes. The parse loop reads YAML, extracts the `idField`, but does not surface validation failures to the caller.
2. **Validator schema confirmed at HEAD** — `tools/validators/src/schemas/story-intention.schema.json:7` reads `"id": { "type": "string", "pattern": "^STINT-[0-9]{4}$" }`. Records whose id fails this pattern fail `record_schema_compliance` validation. The indexer's parse-time validation is currently silent on schema failure.
3. **Cross-skill shared boundary under audit** — the contract that `world.db`'s row set is a faithful projection of on-disk `_source/<subdir>/*.yaml` records. Without warning emissions on parse-time skip, operators rely on this invariant tacitly, and downstream consumers (retrieval tools, patch-engine race-check, validator structural utilities) silently operate on a partial view.
4. **FOUNDATIONS principle motivating this ticket** — `docs/FOUNDATIONS.md` §Canonical Storage Layer establishes `_source/` as the canonical truth; the world-index is a derived artifact. When the derivation drops records silently, the derived artifact diverges from canonical truth without anyone noticing. The principle under audit is the implicit "every divergence between source and derived must be observable" invariant.
6. **Schema extension scope** — additive: a new warning-emission pathway in the parser, a new on-disk skip-log file, and CLI surface updates. No existing parser behavior changes; valid records continue to be indexed identically.
7. **Rule 6 retcon attribution** — the silent-skip behavior was the original parser design (see `tools/world-index/src/parse/atomic.ts:60-75` history). It was correct under the assumption that schema-noncompliant records were rare and operationally moot. This ticket retcons the silent-skip into an observable-skip per the failure mode that surfaced in this session: pre-existing legacy STINT records caused a hidden filesystem-to-index divergence that broke the patch-engine race-check downstream. The new behavior preserves the skip (still don't pollute the index with invalid records) but surfaces the warning so operators see the divergence at index sync time.
8. **Adjacent contradictions classification** — MCPENH-028's allocator regex tightening + this ticket's index-skip warnings are paired, both downstream of MCPENH-011's pre-skill-audit suffix-tolerant convention. Filing both as a coordinated pair (with MCPENH-028 as the prerequisite) is the cleanest resolution. The skill-prose update (already landed in this session via `/skill-audit`) is the third leg of the coordination — together the three changes converge the toolchain on bare-numeric STINT.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: silent-skip recovery (e.g., adding a "verbose mode" to `world-index sync` or surfacing skips only on-demand via a separate CLI command) leaves the default behavior silent and shifts the operator burden. Always-emit warnings at sync time + structured skip log is the lowest-friction observability surface; downstream consumers (skills, audits) can grep the skip log when investigating divergences. Alternative: enforce stricter validation at parse time (refuse to sync if any record fails schema). Rejected — the index sync would block on legacy records that can't be migrated forward, which contradicts the immutable-history preservation story established by the recent skill-audit fix.
2. **No backwards-compatibility shims**: the warning emission is purely additive; existing parser behavior on valid records is unchanged. The skip-log file is a new artifact under `_index/` (gitignored, parallel to `world.db` itself).

## Verification Layers

1. **Schema-failed records emit warnings at sync time** → integration test: create a fixture world with a record whose id fails the registered pattern; run `world-index sync`; assert the warning appears in stdout naming the file path + the extracted id + the expected pattern.
2. **Skip log file is created on first skip** → integration test: assert `worlds/<slug>/_index/world.db.skipped_records.log` is created and contains a structured entry per skipped record.
3. **Valid records continue to index identically** → existing test suite passes; no regression on the canonical happy-path indexing flow.
4. **Skip-log entries are structured** → schema validation: each line of the skip log parses as `<iso8601-timestamp> <file-path> <node-type> <extracted-id-or-empty> <skip-reason>`.

## What to Change

### 1. Add parse-time warning emission

In `tools/world-index/src/parse/atomic.ts`:

- After extracting `idField` from the YAML payload, validate the extracted id against the registered schema's pattern (load the corresponding `tools/validators/src/schemas/<schema>.json` per `nodeType`).
- On pattern mismatch: do not insert the record into the in-memory node set; instead, call a new `recordSkip(filePath, nodeType, extractedId, reason)` helper.
- The `recordSkip` helper appends a structured line to a per-world skip log AND emits a stdout warning when a non-quiet flag is set on the parse context.

### 2. Surface warnings in the CLI

In `tools/world-index/src/cli.ts`:

- Update `world-index sync` to print a summary tail at the end: `Skipped <N> records due to schema-pattern mismatch; see <path>/world.db.skipped_records.log`.
- Add a new `--quiet` flag for callers (e.g., the engine's auto-sync at patch-plan submit time) that need to suppress the per-record warnings while still maintaining the log file.

### 3. Document the skip-log surface

Update `tools/world-index/README.md` (or equivalent) to document:
- The skip-log path: `worlds/<slug>/_index/world.db.skipped_records.log`
- The skip-log line format
- The relationship between skip log and the recent MCPENH-028 STINT-regex tightening (legacy `STINT-NNNN-<char>` records will now produce skip-log entries until they are explicitly deprecated or migrated)

### 4. Add `_index/world.db.skipped_records.log` to gitignore

Add to `.gitignore` parallel to the existing `worlds/<slug>/_index/world.db` ignore: `worlds/<slug>/_index/world.db.skipped_records.log`. Skip logs are derived artifacts.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/cli.ts` (modify)
- `tools/world-index/tests/parse/atomic.test.ts` (modify or new)
- `tools/world-index/tests/cli/sync.test.ts` (modify or new)
- `tools/world-index/README.md` (modify, if it exists; or `docs/MACHINE-FACING-LAYER.md` if the world-index has no own README)
- `.gitignore` (modify)

## Out of Scope

- Migrating legacy `STINT-NNNN-<char>.yaml` records to bare-numeric form. The migration story (immutable history preservation) is established by the recent skill-audit fix; this ticket only surfaces the index-skip behavior, not the data migration.
- Adding similar warnings to the validator's structural utility scans. The structural-utility regex at `tools/validators/src/structural/utils.ts:263` is a separate detection surface; if it has a similar silent-skip behavior, file as a separate VALENH ticket.
- Changing the world-index's schema-validation strictness. This ticket adds observability; tightening or loosening validation is a separate decision.
- Cross-class skip-warning audit (CF / CH / M / OQ / ENT / SEC). If pursued, file as a separate audit-driven ticket — the STINT case is the one with surfaced session evidence; other classes may have similar silent-skip behavior but no observed failure mode this session.

## Acceptance Criteria

### Tests That Must Pass

1. Parser unit test: a fixture record with id `STINT-0001-iker` (legacy suffixed form) under `intentions/` produces a skip-log entry AND does not appear in the resulting node set.
2. Parser unit test: a fixture record with id `STINT-0001` (bare-numeric) under `intentions/` is indexed normally with no skip-log entry.
3. CLI integration test: running `world-index sync <world-slug>` against a fixture world containing one schema-failed record prints the skip summary tail naming the count and the log path; the log file is created and contains the expected entry.
4. CLI integration test: running `world-index sync <world-slug> --quiet` suppresses stdout warnings but still updates the skip log.
5. Full suite passes across all tools/ packages.

### Invariants

1. **Observable divergence**: every record present on the filesystem under a registered atomic subdirectory either (a) appears in the resulting node set, OR (b) has a corresponding line in `world.db.skipped_records.log`. No record is silently dropped without either surfacing.
2. **Skip-log structure**: every skip-log line is parseable as `<iso8601-timestamp> <file-path> <node-type> <extracted-id-or-empty> <skip-reason>` and contains no free-form prose mixed with the structured fields.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic.test.ts` — add cases for schema-failed STINT records (legacy suffixed form) and confirm skip-log emission + node-set absence.
2. `tools/world-index/tests/cli/sync.test.ts` — add cases for the new summary tail output and the `--quiet` flag.
3. None — for the README/docs update; verification is via direct inspection of the rendered file.

### Commands

1. `npm test --workspace tools/world-index` — runs the world-index test suite specifically.
2. `npm test` from project root — full pipeline test sweep.
3. After the fix lands, run `node tools/world-index/dist/src/cli.js sync erotica-world` and confirm the skip-log entry appears for the two legacy STINT records under `worlds/erotica-world/stories/marla-kern-seduction/_source/intentions/` (regression confirmation against the original session evidence).
