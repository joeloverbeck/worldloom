# MCPENH-049: World-index version-bump migrations that change parser-emitted node_type vocabulary must re-parse affected source files, not silently leave stale rows behind

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/schema/migrations/005_narrative_section_node_type.sql` (rewrite from no-op SQL sentinel into row-cleaning DDL that DELETEs stale `WORLD_KERNEL.md` `section` rows, deletes dependent rows, and clears the affected `file_versions` entry so v4→current upgrades re-parse unchanged source content), `tools/world-index/src/schema/migrations/006_reapply_narrative_section_reparse.sql` and `tools/world-index/src/schema/version.ts` (new repair version for indexes that already recorded the original v5 no-op migration and therefore will not rerun corrected migration 005), `tools/world-index/src/index/open.ts` (audit only — `applyMigrations` already executes pending migration SQL before writing the current version file), `tools/world-index/src/commands/shared.ts` / `tools/world-index/src/index/file-versions.ts` (audit only — the live reparse gate is `file_versions.content_hash`, so migration DDL must invalidate `file_versions`, not only `nodes`), `tools/world-index/tests/schema.test.ts` (extend existing schema-upgrade coverage with v4 and already-v5 stale-vocabulary fixtures, migration, sync, and reclassification assertions), `tools/world-index/README.md` (document the migration pattern: no-op SQL is acceptable ONLY when zero existing rows would be reclassified by the new parser; otherwise the migration MUST DELETE stale rows and invalidate affected `file_versions` rows), `docs/MACHINE-FACING-LAYER.md` (`world-index` migration semantics paragraph), `tools/world-index/README.md` `world-index verify` paragraph (cross-link the verify command's drift-flagging behavior — it surfaces the gap but doesn't fix it; the fix path is sync after the corrected migration).
**Deps**: None — `archive/tickets/MCPENH-047.md` is the precedent that surfaces the gap (its no-op `005_narrative_section_node_type.sql` migration sentinel is the artifact this ticket corrects), but MCPENH-047 is COMPLETED and this ticket extends the migration pattern, not the parser change itself.

## Problem

When a world-index schema-version bump is **parser-vocabulary-only** (the parser logic emits a different `node_type` for the same source content; no SQLite DDL change is required because the schema columns are unchanged), the existing version-gate path at `tools/world-index/src/index/open.ts:97-142` (`openIndex`) updates `index_version.txt` to the new version and runs `applyMigrations(db, recordedVersionNumber)` (which executes the no-op SQL sentinel like `005_narrative_section_node_type.sql`) but does NOT re-parse any source files. The subsequent `tools/world-index/src/commands/shared.ts:338-374` (`syncWorldIndex`) calls `reindexAllFiles` in incremental-by-content-hash mode (the indexed-before set is keyed on file content hashes, so files whose source hasn't changed are skipped). Net effect: the `nodes` table retains v(N-1)-era node_type classifications for rows whose source files haven't been edited, despite the version file showing vN.

Worked precedent (this session, 2026-05-16): MCPENH-047 added `narrative_section` to `NODE_TYPES`, bumped `CURRENT_INDEX_VERSION` from 4 to 5, and added `005_narrative_section_node_type.sql` as a no-op SQL sentinel. The intent (per MCPENH-047 §Architecture Check #2 and §Verification Layers #4) was that the version-gate would force re-index of WORLD_KERNEL.md spans on next sync. But the live `worlds/erotica-world/_index/world.db` after this skill exercised canon-addition mid-session shows:

```
$ sqlite3 worlds/erotica-world/_index/world.db "SELECT node_type, COUNT(*) FROM nodes WHERE world_slug='erotica-world' GROUP BY node_type"
section|18                ← includes 11 stale WORLD_KERNEL.md narrative spans

$ sqlite3 worlds/erotica-world/_index/world.db "SELECT node_id, file_path FROM nodes WHERE world_slug='erotica-world' AND node_type='section' AND node_id LIKE '%WORLD_KERNEL%' LIMIT 5"
erotica-world:WORLD_KERNEL.md:One-Paragraph Kernel:0|WORLD_KERNEL.md
erotica-world:WORLD_KERNEL.md:Genre Contract:0|WORLD_KERNEL.md
erotica-world:WORLD_KERNEL.md:Tone Contract:0|WORLD_KERNEL.md
erotica-world:WORLD_KERNEL.md:Chronotope:0|WORLD_KERNEL.md
erotica-world:WORLD_KERNEL.md:Primary Difference:0|WORLD_KERNEL.md

$ cat worlds/erotica-world/_index/index_version.txt
5
```

The version file shows v5, but the rows are v4-era. The MCPENH-047 fix is at HEAD (`tools/world-index/src/parse/prose.ts:285` returns `narrative_section` for WORLD_KERNEL.md depth-2 spans), but it never executed against the existing erotica-world index because (a) `applyMigrations` only ran no-op SQL and (b) `reindexAllFiles` skipped WORLD_KERNEL.md as content-hash-unchanged.

Mid-session impact during canon-addition (PA-6): `mcp__worldloom__list_records({world_slug: 'erotica-world', record_type: 'section_record'})` hard-failed with the exact error MCPENH-047 was supposed to prevent — `"body is not a YAML mapping"` on `erotica-world:WORLD_KERNEL.md:Acknowledgements of Inferred Items:0`. Operator workaround: per-record `get_record(record_id='SEC-ELF-001'…SEC-PAS-001)` to assemble the SEC set manually. The workaround works but defeats `list_records`'s purpose as a class-enumeration API and silently leaves every other erotica-world consumer of `section_record` enumeration vulnerable to the same hard-fail.

The blast radius extends beyond the WORLD_KERNEL.md / section_record case: any future schema-version bump whose intent is parser-vocabulary-only re-classification will replay this gap unless the migration mechanism is corrected. The pattern of `narrative_section`-style additions is not unique — every future "split this conflated node_type into two more-specific node_types" or "rename node_type X to Y for clarity" change has the same shape. Fixing the migration mechanism once prevents N future MCPENH-049-shaped tickets.

## Assumption Reassessment (2026-05-16)

1. **Codebase reassessment.** At HEAD (per `git status --porcelain` showing zero modifications under `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`):
   - `tools/world-index/src/schema/migrations/005_narrative_section_node_type.sql` is two comment lines: `-- Schema version 5 updates parser-emitted node_type vocabulary only.` / `-- No SQLite DDL changes are required.` No DELETE statements, no row-cleaning DDL.
   - `tools/world-index/src/index/open.ts:97-142` `openIndex` invokes `applyMigrations(db, recordedVersionNumber)` (line 133) which iterates `pending = listMigrationFiles().filter((file) => file.version > fromVersionExclusive)` and executes each file's SQL via `db.exec(readFileSync(migration.filePath, "utf8"))` (lines 90-94). For migration 005, that's two SQL comment lines — net DDL impact zero.
   - `tools/world-index/src/index/open.ts:134` writes `${CURRENT_INDEX_VERSION}\n` to `index_version.txt` AFTER the no-op migration runs, marking the DB as "v5-applied" with v4-era rows still present.
   - `tools/world-index/src/commands/shared.ts:338-374` `syncWorldIndex` opens the now-v5-marked DB via `openExistingWorldIndex` (line 354), confirms v5 matches `CURRENT_INDEX_VERSION` (no `SchemaVersionMismatchError`), and calls `reindexAllFiles(opened, worldRoot, worldSlug, false, options)` (line 370) — the `false` is `fullBuild`, so this is incremental.
   - `tools/world-index/src/commands/shared.ts:376+` `reindexAllFiles` builds `indexedBefore = new Set(listIndexedFiles(db, worldSlug))`. When the source file hasn't changed (content-hash unchanged), the indexed-before set keeps the existing entries, the reindex skips re-parse, and the v4-era rows persist.
   - `tools/world-index/src/cli.ts:40` lists `verify <world-slug>` as "re-parse disk-backed indexed files and flag content-hash drift" — `verify` exists as a separate command but its semantics are flag-and-report, not auto-correct.
   - The live `worlds/erotica-world/_index/world.db` reproduces the gap exactly: 18 `section` rows with 11 WORLD_KERNEL.md narrative spans, version-file at "5".
   - `git status --porcelain` returned only `.codex/skills/implement-spec-tickets/SKILL.md` modifications and untracked report/ticket/spec drafts plus this-session canon-addition writes under `worlds/erotica-world/` — none in the Phase 5 grep scope; the gap is genuinely present at HEAD with no in-flight fix.
2. **Doc reassessment.** Archive content-grep `grep -liE '(re-?index|re-?classif|re-?parse|incremental.*sync|migration.*sentinel|narrative_section.*sync)' archive/tickets/MCPENH-*.md` returned hits at MCPENH-019, MCPENH-025, MCPENH-044, MCPENH-047. Reading each: MCPENH-019 (`register-story-fact-promotion-task-type`) and MCPENH-044 (`register-belief-record-class-in-world-index`) are class-registration tickets that didn't bump the schema version with parser-vocabulary changes — orthogonal. MCPENH-025 is a paired schema-and-MCP extension that did bump version but with DDL changes (the migration was non-trivial), so the data-migration concern was implicitly handled by the DDL itself. MCPENH-047 is the precedent that introduces this gap (the no-op SQL sentinel pattern). None of the archived tickets has an Outcome that resolves the parser-vocabulary-only migration semantics gap — they either don't touch this surface or they introduce it. `tools/world-index/README.md:20` documents `world-index verify <world-slug>` as "re-parse disk-backed indexed files and flag content-hash drift" — confirming the verify command exists but is a manual drift-flagger, not an auto-corrector. `docs/MACHINE-FACING-LAYER.md:71` documents the v5 expected behavior (`section_record enumerates atomic SEC-*-NNN YAML records only`) but does not describe the migration discipline that would make the v5 expectation true on existing world indexes.
3. **Shared boundary under audit.** The cross-package contract between `@worldloom/world-index` (the parser-and-schema package that emits `node_type` rows AND owns the migration files in `tools/world-index/src/schema/migrations/`) and the operational expectation of all `@worldloom/world-mcp` retrieval consumers (which assume that the indexed `node_type` matches what the current parser would emit). The boundary is the migration file's interpretation contract: today, a migration file is treated as "SQL DDL to apply on schema bump"; the corrected interpretation is "SQL DDL plus row-cleaning DELETEs for any rows whose `(file_path, node_type)` would be reclassified by the post-bump parser". The `applyMigrations` execution path is unchanged at the SQL-execution layer; only the migration file's content changes (no-op comments → DELETE statements that surface the rows to be re-parsed by the next sync's content-hash + indexed-before-set logic). Downstream consumer audits at `list_records` (`tools/world-mcp/src/tools/list-records.ts`), `get_record` (`tools/world-mcp/src/tools/get-record.ts`), context-packet builders, and any external `node_type`-keyed query paths all benefit transparently — no consumer-side change is required because the row reclassification is at the index layer.
4. **FOUNDATIONS principle under audit.** §Tooling Recommendation: the world-index DB is the operational substrate for MCP retrieval; the contract it offers consumers is "the index reflects the parser's current vocabulary". A schema-version bump that updates `index_version.txt` without re-parsing affected rows breaks that contract silently — the index claims to be at vN while serving v(N-1) data. This is an implicit invariant of the §Tooling Recommendation surface rather than a textually-codified principle, so this ticket extends the migration-mechanism implementation rather than amending FOUNDATIONS.md prose.
5. **Existing output schema extension.** The migration-file interpretation contract is the existing schema being extended. Today: a migration file is SQL DDL that runs once on version bump. Tomorrow: a migration file is SQL DDL that runs once on version bump, AND its content is required to DELETE any rows whose post-parser node_type classification differs from their stored value, plus clear the corresponding `file_versions` rows so the next sync re-parses unchanged source files. Live reassessment corrected the drafted "deleted rows mean `indexedBefore` no longer contains the entries" claim: `tools/world-index/src/commands/shared.ts` builds `indexedBefore` and `previousHash` from `file_versions`, not from `nodes`, so node deletion alone would still skip unchanged content. Existing migrations 001-004 are unaffected because they include real DDL changes that already invalidate the affected row state. Migration 005 changes from no-op SQL to row/file-version-cleaning DDL. Future parser-vocabulary-only migrations follow the new pattern. The change is additive in the sense that it tightens the migration authoring contract (more required, not less) — no consumer of migration files changes its execution model.
6. **Schema cleanup correction.** `tools/world-index/src/schema/migrations/001_initial.sql` has no `bullet_clusters` table and does not declare `ON DELETE CASCADE` on node-related foreign keys. The live explicit cleanup surface is `anchor_checksums`, `entity_mentions`, `entity_aliases`, `entities`, `scoped_reference_aliases`, `scoped_references`, and `edges`, mirroring `deleteNodesByFile` in `tools/world-index/src/index/nodes.ts`, then `nodes` and `file_versions`. The migration uses SQL-only explicit cleanup rather than changing historical migration 001 or adding new runtime code.
7. **Adjacent contradictions exposed by reassessment.** MCPENH-047's Architecture Check #2 claim "the schema-version bump from 4 to 5 forces a clean re-index on next world-validate / world-index init invocation" and Verification Layers #4 "Schema-version migration is automatic → skill dry-run: after the version bump, run `node tools/world-index/dist/src/cli.js sync erotica-world` and confirm the re-index completes without manual intervention" are both **misleading at HEAD**: the version-gate runs the no-op SQL but does NOT re-parse rows; the post-version-bump sync's incremental-by-content-hash logic skips files whose content hasn't changed; the v(N-1)-era rows persist. Classification: **separate bug uncovered during reassessment** that this ticket fixes structurally for all future parser-vocabulary-only migrations. The MCPENH-047 ticket text is in `archive/` and not corrected — but its claim was correct in intent (the version-bump was supposed to force re-parse) and incorrect in implementation (the version-gate mechanism doesn't actually trigger re-parse for content-unchanged files); the implementation gap is what this ticket addresses. No follow-up edit to MCPENH-047's archived prose is required because the corrected behavior at HEAD is what its claim asserted.
8. **Baseline and proof-surface correction.** Pre-edit package baseline passed with `cd tools/world-index && npm run build` and `cd tools/world-index && npm test` (84 tests). The drafted direct `mcp__worldloom__list_records` acceptance is not exposed as a callable tool in this Codex session after source edits; this run keeps direct MCP as optional operational smoke and proves the consumer-facing effect with direct SQLite row-count checks plus package tests. Broad `tools/world-mcp` package proof is a consumer regression lane only; if it is unavailable or red from local live-index state, the accepted implementation proof stays on `tools/world-index`.
9. **Already-applied migration correction.** Live sync after correcting migration 005 still left `WORLD_KERNEL.md` rows as `section`, because the local index had already recorded version 5 and `openIndex` does not rerun migrations at the current recorded version. Required same-seam correction: add migration 006 and bump `CURRENT_INDEX_VERSION` to 6 so already-v5 DBs receive the same row/file-version invalidation. This is not a new behavior family; it is necessary to make the ticket's "existing v5 stale rows recover on sync" claim true.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Three options were considered:
   - **(A)** Make `applyMigrations` aware of "parser-vocabulary migrations" via a separate manifest file naming the affected (file_path, node_type) pairs; on apply, the migration mechanism reads the manifest and DELETEs the affected rows. **Rejected**: doubles the migration surface (SQL file + manifest file) and requires a parallel discovery mechanism for which migrations are "vocabulary-only" vs "DDL-changing". The migration file IS the contract surface; splitting it across SQL + manifest fragments the audit trail.
   - **(B)** Force full re-parse on every schema-version bump regardless of migration content (drop the incremental-sync optimization for any version bump). **Rejected**: throws away the incremental-sync optimization for well-behaved DDL-only migrations (e.g., adding a new column with a default doesn't require re-parse). The optimization is real (large worlds with hundreds of files take measurable time to fully re-parse) and worth preserving for migrations that don't actually invalidate row data.
   - **(C — chosen)** Make migration files themselves carry the row-cleaning and file-version invalidation DDL when needed. The SQL file IS the contract; if a parser-vocabulary change requires re-classification of existing rows, the migration file expresses that as explicit deletes for stale node-dependent rows and the affected `file_versions` row, so the next sync's content-hash gate sees no previous hash and re-parses the unchanged source file. The audit trail is single-surface (the migration SQL) and the mechanism is the same `applyMigrations → db.exec → next sync re-parses invalidated files` path that already works for DDL-changing migrations. The migration author's discipline is to write DELETEs for any (file_path, node_type) pair that would be reclassified by the post-bump parser and invalidate the affected file-version rows; the README documents this discipline so future migration authors don't repeat the no-op-sentinel mistake.
2. **No backwards-compatibility aliasing/shims introduced.** The fix rewrites `005_narrative_section_node_type.sql` from no-op SQL to row-cleaning DDL for v4→current upgrades and adds `006_reapply_narrative_section_reparse.sql` so already-v5 DBs receive the same repair. No `--legacy-skip-migration` flag, no compatibility mode that retains v4-era rows in parallel with current rows, no SQL VIEW that pretends WORLD_KERNEL.md spans are still `section`. After the pending migration runs and the next sync re-parses, the DB contains exactly what the current parser would produce on a from-scratch build.

## Verification Layers

1. **Migration-file contract** → codebase grep-proof: migration 005 contains explicit stale node-dependent cleanup and `file_versions` invalidation for `WORLD_KERNEL.md`; future parser-vocabulary migrations must follow the documented same pattern.
2. **Migration application semantics** → automated test: extend `tools/world-index/tests/schema.test.ts` to construct both a v4 fixture DB and an already-v5 fixture DB with stale `WORLD_KERNEL.md` `section` rows plus same-hash `file_versions`, run `openIndex` to apply pending migrations, run `syncWorldIndex`, and assert the stale rows reappear as `narrative_section`.
3. **Live retrieval regression** → targeted CLI/SQLite smoke when local `worlds/erotica-world` is available: after sync/build, query the live DB and confirm WORLD_KERNEL rows are `narrative_section` and no `section` rows remain for `WORLD_KERNEL.md`. Direct MCP `list_records` remains optional external-server smoke because this Codex session does not expose a restarted MCP tool call surface.
4. **Fixture migration test** → automated test: `tools/world-index/tests/schema.test.ts` owns the fixture-based parser-vocabulary-bump proof rather than adding a new test directory for a single schema-upgrade case.
5. **README discipline** → manual review: `tools/world-index/README.md` paragraph documenting the migration-file authoring contract (no-op SQL is acceptable ONLY when zero existing rows would be reclassified by the new parser).

## Landed Changes

### 1. Rewrote migration 005 and added migration 006 repair

`tools/world-index/src/schema/migrations/005_narrative_section_node_type.sql` now deletes stale `WORLD_KERNEL.md` `section` rows, dependent rows, validation rows for that file, and the matching `file_versions` entry so v4→current upgrades reparse unchanged `WORLD_KERNEL.md` under the current parser vocabulary.

`tools/world-index/src/schema/migrations/006_reapply_narrative_section_reparse.sql` applies the same cleanup for indexes that already recorded the original v5 no-op migration and therefore will not rerun corrected migration 005. `tools/world-index/src/schema/version.ts` now sets `CURRENT_INDEX_VERSION = 6`.

```sql
-- 1. Select the stale WORLD_KERNEL.md `section` node_ids.
-- 2. Delete dependent rows for those ids using the same table set as
--    `deleteNodesByFile`.
-- 3. Delete the stale nodes.
-- 4. Delete `file_versions` for WORLD_KERNEL.md so incremental sync re-parses
--    the unchanged file instead of skipping on the old content hash.
```

Audit result: `tools/world-index/src/schema/migrations/001_initial.sql` has no `bullet_clusters` table and no `ON DELETE CASCADE` declarations for node-dependent rows. Migration 005 therefore uses explicit deletes for the live dependent tables instead of relying on FK cascade.

### 2. Documented the migration-file authoring contract

`tools/world-index/README.md` now has a "Migration authoring discipline" section documenting:

> Each migration file in `tools/world-index/src/schema/migrations/<NNN>_<slug>.sql` is executed once when `openIndex` detects `recordedVersion < CURRENT_INDEX_VERSION`. Migration files MUST satisfy the row-staleness contract: if the parser change introduced in the new schema version would emit a different `node_type` for the same source content (a "parser-vocabulary-only" migration), the migration file MUST DELETE every existing `nodes` row whose `(file_path, node_type)` would be reclassified by the post-bump parser, delete dependent rows, and clear the corresponding `file_versions` rows so incremental sync re-parses unchanged files. No-op SQL sentinels (comment-only migration files) are acceptable ONLY when zero existing rows would be reclassified by the new parser. Failing to satisfy this contract leaves stale rows in the DB after the version bump (the version file shows the new version while the rows reflect the old parser), and downstream `list_records` / `get_record` / context-packet consumers hit hard-fails on the stale rows. See MCPENH-049 for the precedent.

`docs/MACHINE-FACING-LAYER.md` now has a corresponding world-index migration semantics paragraph that mirrors the README contract.

### 3. Added migration-discipline tests

`tools/world-index/tests/schema.test.ts` now constructs fixture world DBs at schema versions 4 and 5 with stale `WORLD_KERNEL.md` `section` rows and same-hash `file_versions`, opens them through `openIndex`, confirms the migration deletes stale rows and file freshness, runs `syncWorldIndex`, and confirms the rows are re-parsed as `narrative_section`.

### 4. Cross-linked `world-index verify` semantics

`tools/world-index/README.md` now clarifies:

> `verify` flags content-hash drift between the indexed `nodes` table and disk-backed source files but does NOT auto-correct stale node_type classifications introduced by parser-vocabulary changes between schema versions. Stale-classification recovery is handled by the migration mechanism (see "Migration authoring discipline") plus a subsequent `world-index sync`; for severe drift, `world-index init <world-slug>` deletes the DB and rebuilds from scratch.

## Files to Touch

- `tools/world-index/src/schema/migrations/005_narrative_section_node_type.sql` (modify)
- `tools/world-index/src/schema/migrations/006_reapply_narrative_section_reparse.sql` (new)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/README.md` (modify) — Migration authoring discipline section + verify-command cross-link
- `docs/MACHINE-FACING-LAYER.md` (modify) — world-index migration semantics paragraph
- `tools/world-index/tests/schema.test.ts` (modify) — fixture-based parser-vocabulary-bump migration tests
- `tools/world-index/src/schema/migrations/001_initial.sql` (audit only — confirmed no `bullet_clusters` table and no `ON DELETE CASCADE`; not modified)

## Out of Scope

- Changing the incremental-sync content-hash mechanism globally (the optimization remains valuable for DDL-only migrations where row data isn't invalidated).
- Adding a new `--force-reparse` CLI flag to `sync` (the migration mechanism is the canonical surface; a force flag would be a parallel ad-hoc surface).
- Auto-correcting stale-classification rows in `world-index verify` (verify's contract is flag-and-report; correction routes through migration + sync).
- Backfilling the MCPENH-047 archive ticket prose to clarify the implementation gap (the gap is fixed by THIS ticket; archive-ticket prose corrections are out of scope).
- Implementing similar migration-discipline checks for non-`world-index` packages (patch-engine, validators, world-mcp). Their schema-version mechanisms are different surfaces; if they have analogous gaps, separate tickets.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && node --test dist/tests/schema.test.js` passes, including v4 and already-v5 stale-vocabulary fixtures that apply pending migrations, invalidate `file_versions`, run sync, and observe `WORLD_KERNEL.md` rows reclassified as `narrative_section`.
2. `cd tools/world-index && npm test` passes.
3. Checkout-local smoke after running `node tools/world-index/dist/src/cli.js sync erotica-world`: `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM nodes WHERE world_slug='erotica-world' AND node_type='section' AND file_path='WORLD_KERNEL.md'"` returns `0`.
4. Checkout-local smoke after the same sync: `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM nodes WHERE world_slug='erotica-world' AND node_type='narrative_section' AND file_path='WORLD_KERNEL.md'"` returns the live WORLD_KERNEL H2 count.
5. `cd tools/world-mcp && npm test` passes as the consumer regression lane. Direct `mcp__worldloom__list_records(...)` remains external-server smoke because this Codex session did not expose a restarted MCP call surface.

### Invariants

1. After every schema-version bump, the DB's row classifications reflect what the post-bump parser would emit on a from-scratch build (no v(N-1)-era rows persist).
2. Migration files are the single contract surface for row-staleness: no parallel manifest, no out-of-band re-parse trigger, no consumer-side compensation.
3. The `world-index verify` command's flag-and-report contract is preserved (it surfaces drift but does not auto-correct).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` (modify) — fixture worlds at v4 and already-v5, parser-vocabulary-only migrations to current, sync, assert reclassification and `file_versions` invalidation.
2. No separate no-op-sentinel rejection test in this run; the authoring contract is documented in README/docs, and the concrete v5 migration regression is executable.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/schema.test.js`
3. `cd tools/world-index && npm test`
4. Optional checkout-local smoke: `node tools/world-index/dist/src/cli.js sync erotica-world`
5. Optional checkout-local smoke: `sqlite3 worlds/erotica-world/_index/world.db "SELECT node_type, COUNT(*) FROM nodes WHERE world_slug='erotica-world' AND file_path='WORLD_KERNEL.md' GROUP BY node_type"`

## Outcome

Completed: 2026-05-16.

The migration path now repairs parser-vocabulary-only stale rows for both v4→current upgrades and already-v5 indexes that had recorded the original no-op sentinel. Migration 005 carries the correct row/file-version invalidation for v4 upgrades; migration 006 and `CURRENT_INDEX_VERSION = 6` make the repair execute on DBs whose `index_version.txt` was already `5`.

The migration authoring rule is now documented in `tools/world-index/README.md` and `docs/MACHINE-FACING-LAYER.md`: parser-vocabulary migrations must delete reclassified rows, dependent rows, and affected `file_versions` entries so incremental sync re-parses unchanged source files.

## Verification Result

Passed:

1. Pre-edit baseline: `cd tools/world-index && npm run build`
2. Pre-edit baseline: `cd tools/world-index && npm test` — 84 tests passed.
3. `cd tools/world-index && npm run build`
4. `cd tools/world-index && node --test dist/tests/schema.test.js` — 6 tests passed, including v4 and already-v5 stale-vocabulary migration fixtures.
5. `cd tools/world-index && npm test` — 86 tests passed.
6. `node tools/world-index/dist/src/cli.js sync erotica-world`
7. `sqlite3 worlds/erotica-world/_index/world.db "SELECT node_type, COUNT(*) FROM nodes WHERE world_slug='erotica-world' AND file_path='WORLD_KERNEL.md' GROUP BY node_type"` — returned `bullet_cluster|6`, `domain_file|1`, `narrative_section|11`.
8. `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM nodes WHERE world_slug='erotica-world' AND node_type='section' AND file_path='WORLD_KERNEL.md'"` — returned `0`.
9. `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM nodes WHERE world_slug='erotica-world' AND node_type='narrative_section' AND file_path='WORLD_KERNEL.md'"` — returned `11`.
10. `cat worlds/erotica-world/_index/index_version.txt` — returned `6`.
11. `cd tools/world-mcp && npm test` — 360 tests passed.

## Deviations

- Live reassessment corrected the drafted mechanism: node deletion alone would not force reparse because incremental sync consults `file_versions`, not the presence of `nodes` rows. The landed migrations invalidate both stale rows and the affected `file_versions` entry.
- Correcting migration 005 alone did not repair DBs that had already recorded version 5. The ticket absorbed the same-seam repair by adding migration 006 and bumping `CURRENT_INDEX_VERSION` to 6.
- No direct `mcp__worldloom__list_records(...)` tool call was available in this Codex session. The consumer-facing regression was proved through SQLite checks against the rebuilt live index plus the full `tools/world-mcp` package suite.
- `worlds/erotica-world/_index` was refreshed as a gitignored derived artifact during optional checkout-local smoke; no world source files were intentionally edited.
