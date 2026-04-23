# SPEC02RETMCPSER-003: DB access layer, path resolution, error taxonomy

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/db/open.ts`, `src/db/path.ts`, `src/db/index.ts`, `src/errors.ts`; adds `CURRENT_INDEX_VERSION` to `tools/world-index` public types for consumer-side schema-version checks.
**Deps**: SPEC02RETMCPSER-001, SPEC02RETMCPSER-002

## Problem

Every `mcp__worldloom__*` tool in SPEC-02 reads `worlds/<slug>/_index/world.db` and must respond uniformly to a shared set of failure modes: index file missing, schema-version mismatch, filesystem drift vs. `file_versions`, empty index, world directory missing. Without a shared DB-access layer, each tool would re-implement these checks, producing inconsistent error codes (the exact failure mode SPEC-03 avoids with its `anchor_drift` taxonomy). This ticket lands the shared plumbing every later tool ticket consumes.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/db/` and `tools/world-mcp/src/errors.ts` are still placeholder-only (`.gitkeep`) in the live repo, while `tools/world-mcp/src/server.ts` remains the SPEC02RETMCPSER-001 scaffold throw. This ticket therefore still owns the real DB/error/path implementation seam rather than a narrowed validation-only delta. `tools/world-mcp/package.json` already declares `better-sqlite3@12.2.0` and no current internal DB helper exists.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Server lifecycle and §Error taxonomy remain authoritative for per-request read-only opens, `index_version.txt` compatibility checks, cheap mtime-first drift detection with optional full-hash mode, and the exact 14 error codes. `archive/specs/SPEC-01-world-index.md` §Public contract still requires consumers to open `world.db` directly and honor `worlds/<slug>/_index/index_version.txt`.
3. Cross-package/cross-artifact boundary under audit: this ticket is the consumer-side instantiation of SPEC-01's `world.db` + `index_version.txt` contract. The live producer already exposes `@worldloom/world-index/public/types` (`tools/world-index/package.json`, `tools/world-index/src/public/types.ts`), but that public surface neither exports `CURRENT_INDEX_VERSION` nor emits the advertised `.d.ts` entry today. To keep `world-mcp` on the published contract instead of an internal import, this ticket absorbs that same-seam fallout and makes the public export type-resolvable.
4. The drafted `resolveWorldDbPath()` wording assumes repo-root discovery can be hard-wired from module-relative paths alone. For isolated temp-repo verification, the truthful contract is: search upward from `process.cwd()` first, then fall back to module-relative ancestry, and require a repo root that contains both `tools/world-mcp/package.json` and `worlds/`. This preserves deterministic repo-relative resolution in production without introducing a config knob.

## Architecture Check

1. A shared `openIndexDb(world_slug)` helper that performs world existence, index presence, schema-version compatibility, empty-index, and stale-index checks in one call is cleaner than per-tool ad-hoc checking, because it guarantees the spec error codes are produced at exactly one call site and never drift. Tools consume `openIndexDb` and treat its return as a ready-to-query handle.
2. No backwards-compatibility aliasing/shims introduced — this is a new package layer.

## Verification Layers

1. Path resolution correctness → unit test asserts `resolveWorldDbPath('animalia')` resolves to `<repoRoot>/worlds/animalia/_index/world.db` from a temp repo discovered via current working directory; no config knob exists.
2. Missing-index error → unit test against an existing world without `_index/world.db` returns `{code: 'index_missing'}` (not a thrown exception, structured error).
3. Index-version mismatch → unit test against a fixture world with a bumped `index_version.txt` returns `{code: 'index_version_mismatch', expected, actual}`.
4. Stale-index drift detection → unit test touches a world-file mtime newer than `file_versions.last_indexed_at`, then confirms `openIndexDb` returns `{code: 'stale_index', drifted_files: [...]}`.
5. Empty-index short-circuit → unit test against a fixture `world.db` with zero `nodes` rows returns `{code: 'empty_index'}`.
6. Error-code enum exhaustiveness → unit test asserts `src/errors.ts` declares exactly the 14 codes in spec §Error taxonomy and nothing else, in spec order.
7. Shared schema-version contract → world-index public-types test proves `CURRENT_INDEX_VERSION` is re-exported through `@worldloom/world-index/public/types`, and world-mcp consumes that public symbol rather than an internal path.

## What to Change

### 1. Create `tools/world-mcp/src/db/path.ts`

Export `resolveWorldDbPath(world_slug: string): string` returning `path.resolve(repoRoot, 'worlds', world_slug, '_index', 'world.db')` with repo-root detection that prefers the current working directory ancestry and falls back to module-relative ancestry. No config override — deterministic per spec §Server lifecycle line 248.

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
4. Read `worlds/${world_slug}/_index/index_version.txt`; compare against `CURRENT_INDEX_VERSION` imported from `@worldloom/world-index/public/types`. On mismatch return `{code: 'index_version_mismatch', details: {expected, actual}}`.
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
- `tools/world-index/src/public/types.ts` (modify — add schema-version constant to public contract)
- `tools/world-index/tsconfig.json` (modify — emit declarations for the published public-types entry)
- `tools/world-index/tests/public-types.test.ts` (modify — verify `CURRENT_INDEX_VERSION` re-export)
- `tools/world-mcp/package.json` (modify — depend on `@worldloom/world-index` public types entry)
- `tools/world-mcp/package-lock.json` (modify — lockfile for the new local package dependency)
- `tools/world-mcp/tsconfig.json` (modify — use Node16 module resolution so TypeScript resolves the exported public-types entry)
- `tools/world-mcp/tests/db/path.test.ts` (new)
- `tools/world-mcp/tests/db/open.test.ts` (new)
- `tools/world-mcp/tests/errors.test.ts` (new)

## Out of Scope

- Any MCP tool implementation (lands in SPEC02RETMCPSER-005 through -010).
- Long-held connections or connection pooling — per spec §Server lifecycle line 249, connections are per-request.
- Read-write mode — in Phase 1 the DB is opened read-only from the MCP server. Phase 2's token-consumption write path is owned by SPEC-03 engine, not this ticket.
- Full re-hash mode as the default — opt-in via `WORLDLOOM_MCP_FULL_HASH_DRIFT_CHECK=1`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — every new test in `tests/db/` and `tests/errors.test.ts` passes.
2. Unit test: `openIndexDb('nonexistent-world')` returns `{code: 'world_not_found'}` within 50ms.
3. Unit test: after seeding a temp-repo index and writing a mismatched `index_version.txt`, `openIndexDb('seeded')` returns `{code: 'index_version_mismatch', details: {expected: N, actual: M}}`.
4. Unit test: after seeding a valid temp-repo index and touching one of its source files to have an mtime newer than `last_indexed_at` + different content, `openIndexDb('seeded')` returns `{code: 'stale_index', details: {drifted_files: [<file>]}}`.

### Invariants

1. Every `McpError` returned by `openIndexDb` carries a `code` from `MCP_ERROR_CODES`; no ad-hoc strings.
2. `openIndexDb` never throws on expected failures — it returns a structured `McpError`. Unexpected exceptions (e.g., filesystem permissions) may throw and are caller-handled; document this boundary in the JSDoc.
3. Read-only posture: the returned `{db}` handle opened in Phase 1 is SQLite read-only; attempting a `db.exec('INSERT ...')` should throw at the driver level.
4. Error-code enum must match spec §Error taxonomy exactly (same 14 codes, same names, same order).
5. `world-mcp` imports the expected schema version from the published `@worldloom/world-index/public/types` surface, not from a private sibling path.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/db/path.test.ts` — asserts repo-root detection + canonical DB path.
2. `tools/world-mcp/tests/db/open.test.ts` — the six lifecycle-check scenarios above.
3. `tools/world-mcp/tests/errors.test.ts` — asserts `MCP_ERROR_CODES` has 14 entries matching spec §Error taxonomy.
4. `tools/world-index/tests/public-types.test.ts` — asserts `CURRENT_INDEX_VERSION` is re-exported through the public types entry.

### Commands

1. `cd tools/world-index && npm run build && node --test dist/tests/public-types.test.js`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/db/*.test.js dist/tests/errors.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

- Completion date: 2026-04-23
- Added the `world-mcp` shared DB seam: repo-root/path resolution, structured MCP error taxonomy, read-only `openIndexDb()`, and a barrel export for later tool tickets.
- Added temp-repo tests covering `world_not_found`, `index_missing`, `index_version_mismatch`, `empty_index`, `stale_index`, full-hash drift mode, read-only success, and canonical path resolution.
- Absorbed the same-seam world-index fallout needed to keep the consumer on the published contract: `CURRENT_INDEX_VERSION` now re-exports through `@worldloom/world-index/public/types`, `world-index` emits declarations, and `world-mcp` now depends on that package via its exported entry.

## Verification Result

1. `cd tools/world-index && npm run build && node --test dist/tests/public-types.test.js`
2. `cd tools/world-mcp && npm test`

## Deviations

1. The drafted fixture shape (`tests/fixtures/seeded-world.db`) was unnecessary. The landed proof uses temp-repo fixture builders inside `tools/world-mcp/tests/db/open.test.ts`, which more directly exercise repo-root discovery and per-world source drift without introducing committed binary fixtures.
