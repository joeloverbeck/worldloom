# SPEC02RETMCPSER-003: DB access layer, path resolution, error taxonomy

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/db/open.ts`, `src/db/path.ts`, `src/errors.ts`; no impact on existing packages.
**Deps**: SPEC02RETMCPSER-001, SPEC02RETMCPSER-002

## Problem

Every `mcp__worldloom__*` tool in SPEC-02 reads `worlds/<slug>/_index/world.db` and must respond uniformly to a shared set of failure modes: index file missing, schema-version mismatch, filesystem drift vs. `file_versions`, empty index, world directory missing. Without a shared DB-access layer, each tool would re-implement these checks, producing inconsistent error codes (the exact failure mode SPEC-03 avoids with its `anchor_drift` taxonomy). This ticket lands the shared plumbing every later tool ticket consumes.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/db/` and `tools/world-mcp/src/errors.ts` target paths are created as empty-ish placeholders by SPEC02RETMCPSER-001; this ticket replaces the placeholders with real modules. `tools/world-mcp/package.json` declares `better-sqlite3@12.2.0`, which this ticket consumes directly.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Server lifecycle (lines 246–253) specifies per-request connection, read-only mode in Phase 1, `index_version.txt` compatibility check, mtime pre-check for drift, structured error shapes; §Error taxonomy (lines 256–273) is the authoritative error-code table. `archive/specs/SPEC-01-world-index.md` §Public contract (lines 26–27) confirms the consumer opens the SQLite file itself; §Index location (lines 278–280) confirms the `index_version.txt` path.
3. Cross-package/cross-artifact boundary under audit: this ticket is the consumer-side instantiation of SPEC-01's `world.db` + `index_version.txt` contract. Index schema-version drift between world-index (producer) and world-mcp (consumer) is the invariant this layer must preserve. The schema-version constant lives in `tools/world-index/src/schema/version.ts`; this ticket must either re-export that constant through SPEC02RETMCPSER-002's public types entry (add `SCHEMA_VERSION` to the re-export list if not already there) or pin a matching literal in `src/db/open.ts` and depend on the sibling re-export landing.

## Architecture Check

1. A shared `openIndexDb(world_slug)` helper that performs all six lifecycle checks in one pass (missing → version → drift → empty → world-not-found → connection) is cleaner than per-tool ad-hoc checking, because it guarantees the error codes in spec §Error taxonomy are produced at exactly one call site and never drift. Tools consume `openIndexDb` and treat its return as a ready-to-query handle.
2. No backwards-compatibility aliasing/shims introduced — this is a new package layer.

## Verification Layers

1. Path resolution correctness → unit test asserts `resolveWorldDbPath('animalia')` returns `worlds/animalia/_index/world.db` relative to repo root; no config knob exists.
2. Missing-index error → unit test against a nonexistent world slug returns `{code: 'index_missing'}` (not a thrown exception, structured error).
3. Index-version mismatch → unit test against a fixture world with a bumped `index_version.txt` returns `{code: 'index_version_mismatch', expected, actual}`.
4. Stale-index drift detection → unit test touches a world-file mtime newer than `file_versions.last_indexed_at`, then confirms `openIndexDb` returns `{code: 'stale_index', drifted_files: [...]}`.
5. Empty-index short-circuit → unit test against a fixture `world.db` with zero `nodes` rows returns `{code: 'empty_index'}`.
6. Error-code enum exhaustiveness → TypeScript-level check: `src/errors.ts` declares exactly the 14 codes in spec §Error taxonomy (lines 258–272) and nothing else.

## What to Change

### 1. Create `tools/world-mcp/src/db/path.ts`

Export `resolveWorldDbPath(world_slug: string): string` returning `path.resolve(repoRoot, 'worlds', world_slug, '_index', 'world.db')` with a `repoRoot` detection that walks upward from `__dirname` looking for `package.json` + `tools/` sibling. No config override — deterministic per spec §Server lifecycle line 248.

### 2. Create `tools/world-mcp/src/errors.ts`

Declare:

```typescript
export const MCP_ERROR_CODES = [
  'index_missing',
  'index_version_mismatch',
  'stale_index',
  'empty_index',
  'world_not_found',
  'node_not_found',
  'token_invalid',
  'token_expired',
  'token_consumed',
  'token_tampered',
  'budget_exhausted_nucleus',
  'anchor_drift',
  'validator_unavailable',
  'phase1_stub',
] as const;
export type McpErrorCode = (typeof MCP_ERROR_CODES)[number];

export interface McpError {
  code: McpErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
```

Exact codes and order from spec §Error taxonomy lines 258–272.

### 3. Create `tools/world-mcp/src/db/open.ts`

Export `openIndexDb(world_slug: string): { db: Database } | McpError`:

1. `resolveWorldDbPath(world_slug)` → `dbPath`.
2. Check `fs.existsSync(repoRoot/worlds/${world_slug})` — on miss, return `{code: 'world_not_found'}`.
3. Check `fs.existsSync(dbPath)` — on miss, return `{code: 'index_missing'}`.
4. Read `worlds/${world_slug}/_index/index_version.txt`; compare against the expected schema version imported from world-index's public types entry (see Assumption Reassessment item 3). On mismatch return `{code: 'index_version_mismatch', details: {expected, actual}}`.
5. Open SQLite read-only: `new Database(dbPath, {readonly: true})`.
6. Query `SELECT COUNT(*) AS n FROM nodes` — on `n === 0` return `{code: 'empty_index'}`.
7. Cheap drift check: for each row in `file_versions`, compare `fs.statSync(worlds/<slug>/<file_path>).mtimeMs` against `last_indexed_at`. Only when mtime is newer than `last_indexed_at` do we re-hash the file and compare against `content_hash`. On confirmed drift return `{code: 'stale_index', details: {drifted_files: [...]}}`. Configurable knob: `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1` env var forces full re-hash on every request (spec §Server lifecycle line 253).
8. On all checks passing, return `{db}`.

### 4. Export surface

Add `src/db/index.ts` (or equivalent barrel file) re-exporting `openIndexDb`, `resolveWorldDbPath`, plus `src/errors.ts` names, so tool modules have a single import path.

## Files to Touch

- `tools/world-mcp/src/db/path.ts` (new; replaces `.gitkeep`)
- `tools/world-mcp/src/db/open.ts` (new)
- `tools/world-mcp/src/db/index.ts` (new — barrel)
- `tools/world-mcp/src/errors.ts` (new — replaces `.gitkeep` placeholder created in -001)
- `tools/world-mcp/tests/db/path.test.ts` (new)
- `tools/world-mcp/tests/db/open.test.ts` (new)
- `tools/world-mcp/tests/errors.test.ts` (new)
- `tools/world-mcp/tests/fixtures/seeded-world.db` (new or reused — generated by a small fixture-builder; see Test Plan)

## Out of Scope

- Any MCP tool implementation (lands in SPEC02RETMCPSER-005 through -010).
- Long-held connections or connection pooling — per spec §Server lifecycle line 249, connections are per-request.
- Read-write mode — in Phase 1 the DB is opened read-only from the MCP server. Phase 2's token-consumption write path is owned by SPEC-03 engine, not this ticket.
- Full re-hash mode as the default — opt-in via `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — every new test in `tests/db/` and `tests/errors.test.ts` passes.
2. Unit test: `openIndexDb('nonexistent-world')` returns `{code: 'world_not_found'}` within 50ms.
3. Unit test: after seeding `tests/fixtures/seeded-world.db` and writing a mismatched `index_version.txt`, `openIndexDb('seeded')` returns `{code: 'index_version_mismatch', details: {expected: N, actual: M}}`.
4. Unit test: after seeding a valid fixture and touching one of its source files to have an mtime newer than `last_indexed_at` + different content, `openIndexDb('seeded')` returns `{code: 'stale_index', details: {drifted_files: [<file>]}}`.

### Invariants

1. Every `McpError` returned by `openIndexDb` carries a `code` from `MCP_ERROR_CODES`; no ad-hoc strings.
2. `openIndexDb` never throws on expected failures — it returns a structured `McpError`. Unexpected exceptions (e.g., filesystem permissions) may throw and are caller-handled; document this boundary in the JSDoc.
3. Read-only posture: the returned `{db}` handle opened in Phase 1 is SQLite read-only; attempting a `db.exec('INSERT ...')` should throw at the driver level.
4. Error-code enum must match spec §Error taxonomy exactly (same 14 codes, same names).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/db/path.test.ts` — asserts repo-root detection + canonical DB path.
2. `tools/world-mcp/tests/db/open.test.ts` — the six lifecycle-check scenarios above.
3. `tools/world-mcp/tests/errors.test.ts` — asserts `MCP_ERROR_CODES` has 14 entries matching spec §Error taxonomy.
4. `tools/world-mcp/tests/fixtures/build-fixture.ts` (new helper) — generates `seeded-world.db` deterministically for reuse across tickets; runs via `node --test` setup or a separate script.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/db/*.test.js dist/tests/errors.test.js`
2. `cd tools/world-mcp && npm test`
3. Spec §Error taxonomy grep-proof: `grep -oE "'[a-z_]+'" tools/world-mcp/src/errors.ts | sort -u | wc -l` returns 14.
