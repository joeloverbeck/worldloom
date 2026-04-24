# SPEC02PHA2TOO-007: Share atomic logical-file freshness contract between `world-index` and `world-mcp`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — expose or share the `world-index` atomic logical-file list so `tools/world-mcp` stale-index lifecycle checks do not maintain a duplicated copy.
**Deps**: archive/tickets/SPEC02PHA2TOO-006.md

## Problem

SPEC02PHA2TOO-006 repaired the package-wide `tools/world-mcp` aggregate test lane by teaching `openIndexDb` that atomized worlds can have synthetic `file_versions` rows for retired root markdown concern files such as `CANON_LEDGER.md`, `INVARIANTS.md`, and `GEOGRAPHY.md`. The repair is correct, but it duplicated the logical-file list from `tools/world-index/src/parse/atomic.ts` into `tools/world-mcp/src/db/open.ts`.

That leaves a small shared-contract drift risk: if `world-index` adds, removes, or renames an atomic logical row, `world-mcp` can silently classify index freshness differently until a live-corpus test catches it.

## Assumption Reassessment (2026-04-25)

1. `tools/world-index/src/parse/atomic.ts` exports `ATOMIC_LOGICAL_WORLD_FILES` and uses it to create synthetic logical `domain_file` rows for atomized concerns.
2. `tools/world-index/src/commands/verify.ts` imports the same `ATOMIC_LOGICAL_WORLD_FILES` value and skips those rows when they are synthetic in atomic worlds.
3. `tools/world-mcp/src/db/open.ts` now declares its own `ATOMIC_LOGICAL_WORLD_FILES` set with the same retired root markdown concern names so `openIndexDb` can avoid false `stale_index` errors.
4. `@worldloom/world-index` currently exposes only `./public/types` in `tools/world-index/package.json`; that public surface exports schema types and `CURRENT_INDEX_VERSION`, not the atomic logical-file list.
5. Existing active SPEC02PHA2TOO tickets do not own this cleanup: SPEC02PHA2TOO-002 owns `find_sections_touched_by`, SPEC02PHA2TOO-003 owns `allocate_next_id`, SPEC02PHA2TOO-004 owns docs consistency, and SPEC02PHA2TOO-005 owns SPEC03 dependency references. SPEC02PHA2TOO-006 is complete and archived.
6. FOUNDATIONS principle under audit: §Tooling Recommendation — retrieval tools should provide reliable structured access to canonical records. Lifecycle freshness checks are part of that reliability boundary and should use the producer's canonical atomic-mode contract rather than a copied list.

## Architecture Check

1. A shared exported contract is cleaner than copying the same concern list across packages. It keeps the index producer and retrieval consumer in lockstep.
2. The change should be additive-only: expose the existing list from a public or supported `world-index` surface and update `world-mcp` to consume it. Do not add backwards-compatibility aliases or alternate spellings.

## Verification Layers

1. Shared contract exported by `world-index` -> codebase grep-proof / TypeScript build verifying `@worldloom/world-index` exposes the list through a supported import path.
2. `world-mcp` consumes the shared contract -> codebase grep-proof confirming `tools/world-mcp/src/db/open.ts` no longer declares a copied `ATOMIC_LOGICAL_WORLD_FILES` list.
3. Stale-index lifecycle behavior preserved -> targeted tool command: `cd tools/world-mcp && npm run test`.

## What to Change

### 1. Expose the atomic logical-file list from `world-index`

Choose the narrowest supported public surface that matches the existing package shape. Preferred approach: export the existing `ATOMIC_LOGICAL_WORLD_FILES` value from `tools/world-index/src/public/types.ts` or a new explicit public module, and update `tools/world-index/package.json` `exports` only if the chosen public path requires it.

### 2. Consume the shared list from `world-mcp`

Update `tools/world-mcp/src/db/open.ts` to import the shared list from `@worldloom/world-index` and build its local membership set from that import. Remove the copied literal list.

### 3. Preserve lifecycle proof

Keep the SPEC02PHA2TOO-006 regression behavior: atomized logical rows are ignored only when they are synthetic in an atomic world, while real missing disk-backed rows still return `stale_index`.

## Files to Touch

- `tools/world-index/src/public/types.ts` or a new public `tools/world-index/src/public/*.ts` module (modify/new — expose the existing atomic logical-file list)
- `tools/world-index/package.json` (modify only if a new public export path is introduced)
- `tools/world-mcp/src/db/open.ts` (modify — consume shared list and remove duplicate literal list)
- `tools/world-mcp/tests/db/open.test.ts` (modify only if the import boundary needs a stronger regression assertion)

## Out of Scope

- Changing the membership of `ATOMIC_LOGICAL_WORLD_FILES`.
- Changing `world-index verify` behavior.
- Changing `world-mcp` stale-index semantics beyond replacing the duplicated list with the shared contract.
- Refactoring unrelated `world-index` parser exports.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build` exits 0.
2. `cd tools/world-mcp && npm run build` exits 0 after consuming the shared export.
3. `cd tools/world-mcp && npm run test` exits 0.
4. `grep -n "const ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/src/db/open.ts` returns no matches.

### Invariants

1. `world-mcp` uses the same atomic logical-file list as `world-index`; no copied list of retired root markdown concern names remains in `open.ts`.
2. `openIndexDb` still returns `stale_index` for real missing or drifted disk-backed source files.
3. `openIndexDb` still ignores synthetic atomized logical rows only for atomic worlds.

## Test Plan

### New/Modified Tests

1. Existing `tools/world-mcp/tests/db/open.test.ts` — preserve or tighten the atomized logical-row regression from SPEC02PHA2TOO-006 if needed.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/world-mcp && npm run test`
4. `grep -n "ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/src/db/open.ts tools/world-index/src/public/*.ts`
