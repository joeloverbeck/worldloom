# SPEC02PHA2TOO-007: Share atomic logical-file freshness contract between `world-index` and `world-mcp`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `@worldloom/world-index/public/types` now exports the atomic logical-file list and `tools/world-mcp` stale-index lifecycle checks consume that shared contract.
**Deps**: archive/tickets/SPEC02PHA2TOO-006.md

## Problem

SPEC02PHA2TOO-006 repaired the package-wide `tools/world-mcp` aggregate test lane by teaching `openIndexDb` that atomized worlds can have synthetic `file_versions` rows for retired root markdown concern files such as `CANON_LEDGER.md`, `INVARIANTS.md`, and `GEOGRAPHY.md`. The repair is correct, but it duplicated the logical-file list from `tools/world-index/src/parse/atomic.ts` into `tools/world-mcp/src/db/open.ts`.

That leaves a small shared-contract drift risk: if `world-index` adds, removes, or renames an atomic logical row, `world-mcp` can silently classify index freshness differently until a live-corpus test catches it.

## Assumption Reassessment (2026-04-25)

1. `tools/world-index/src/parse/atomic.ts` exports `ATOMIC_LOGICAL_WORLD_FILES` and uses it to create synthetic logical `domain_file` rows for atomized concerns.
2. `tools/world-index/src/commands/verify.ts` imports the same `ATOMIC_LOGICAL_WORLD_FILES` value and skips those rows when they are synthetic in atomic worlds.
3. Before this ticket, `tools/world-mcp/src/db/open.ts` declared its own `ATOMIC_LOGICAL_WORLD_FILES` set with the same retired root markdown concern names so `openIndexDb` could avoid false `stale_index` errors.
4. Before this ticket, `@worldloom/world-index` exposed only `./public/types` in `tools/world-index/package.json`, and that public surface exported schema types and `CURRENT_INDEX_VERSION`, not the atomic logical-file list.
5. At intake, existing SPEC02PHA2TOO tickets did not own this cleanup: SPEC02PHA2TOO-002 owned `find_sections_touched_by`, SPEC02PHA2TOO-003 owned `allocate_next_id`, SPEC02PHA2TOO-004 owned docs consistency, and SPEC02PHA2TOO-005 owned SPEC03 dependency references. SPEC02PHA2TOO-006 was already complete and archived. All SPEC02PHA2TOO tickets are now archived.
6. FOUNDATIONS principle under audit: §Tooling Recommendation — retrieval tools should provide reliable structured access to canonical records. Lifecycle freshness checks are part of that reliability boundary and should use the producer's canonical atomic-mode contract rather than a copied list.
7. Reassessment correction: the existing public path `@worldloom/world-index/public/types` was sufficient, so `tools/world-index/package.json` did not need a new export map entry. Same-seam public-surface wording in `tools/world-index/README.md` and the SPEC-02 capstone assertion in `tools/world-mcp/tests/integration/spec02-verification.test.ts` needed truthing because the entry is no longer accurately described as types-only.

## Architecture Check

1. A shared exported contract is cleaner than copying the same concern list across packages. It keeps the index producer and retrieval consumer in lockstep.
2. The change should be additive-only: expose the existing list from a public or supported `world-index` surface and update `world-mcp` to consume it. Do not add backwards-compatibility aliases or alternate spellings.

## Verification Layers

1. Shared contract exported by `world-index` -> codebase grep-proof / TypeScript build verifying `@worldloom/world-index` exposes the list through a supported import path.
2. `world-mcp` consumes the shared contract -> codebase grep-proof confirming `tools/world-mcp/src/db/open.ts` no longer declares a copied `ATOMIC_LOGICAL_WORLD_FILES` list.
3. Stale-index lifecycle behavior preserved -> targeted tool command: `cd tools/world-mcp && npm run test`.

## What to Change

### 1. Expose the atomic logical-file list from `world-index`

Export the existing `ATOMIC_LOGICAL_WORLD_FILES` value from `tools/world-index/src/public/types.ts`. Keep the existing `tools/world-index/package.json` `./public/types` export unchanged.

### 2. Consume the shared list from `world-mcp`

Update `tools/world-mcp/src/db/open.ts` to import the shared list from `@worldloom/world-index/public/types` and build its local membership set from that import. Remove the copied literal list.

### 3. Preserve lifecycle proof

Keep the SPEC02PHA2TOO-006 regression behavior: atomized logical rows are ignored only when they are synthetic in an atomic world, while real missing disk-backed rows still return `stale_index`.

## Files to Touch

- `tools/world-index/src/public/types.ts` (modify — expose the existing atomic logical-file list)
- `tools/world-index/README.md` (modify — truth the public contract entry wording)
- `tools/world-index/tests/public-types.test.ts` (modify — assert the public entry exports the producer's atomic logical-file list)
- `tools/world-mcp/src/db/open.ts` (modify — consume shared list and remove duplicate literal list)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify — truth the public export capstone assertion)

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

1. Existing `tools/world-index/tests/public-types.test.ts` — assert `@worldloom/world-index/public/types` exports the same `ATOMIC_LOGICAL_WORLD_FILES` value as `tools/world-index/src/parse/atomic.ts`.
2. Existing `tools/world-mcp/tests/integration/spec02-verification.test.ts` — assert the public contract export includes the atomic logical-file list.
3. Existing `tools/world-mcp/tests/db/open.test.ts` — unchanged; the SPEC02PHA2TOO-006 atomized logical-row regression still proves stale-index behavior.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/public-types.test.js`
3. `grep -n "ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/node_modules/@worldloom/world-index/dist/src/public/types.d.ts tools/world-mcp/node_modules/@worldloom/world-index/dist/src/public/types.js`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && npm run test`
6. `grep -n "const ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/src/db/open.ts`
7. `grep -n "ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/src/db/open.ts tools/world-index/src/public/types.ts`

## Outcome

`tools/world-index/src/public/types.ts` now re-exports `ATOMIC_LOGICAL_WORLD_FILES` from the existing parser authority. `tools/world-mcp/src/db/open.ts` imports that public value and builds `ATOMIC_LOGICAL_WORLD_FILE_SET` from it, so the stale-index lifecycle check no longer maintains a copied list of retired root markdown concern files.

The public contract proof surface was tightened: `tools/world-index/tests/public-types.test.ts` compares the public export to `tools/world-index/src/parse/atomic.ts`, `tools/world-mcp/tests/integration/spec02-verification.test.ts` asserts the package import exposes the list, and `tools/world-index/README.md` now describes the entry as a narrow public contract surface rather than a types-only surface.

## Verification Result

1. `cd tools/world-index && npm run build` — passed.
2. `cd tools/world-index && node --test dist/tests/public-types.test.js` — passed.
3. `grep -n "ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/node_modules/@worldloom/world-index/dist/src/public/types.d.ts tools/world-mcp/node_modules/@worldloom/world-index/dist/src/public/types.js` — passed; the symlinked consumer artifact exposes the runtime and declaration export.
4. `cd tools/world-mcp && npm run build` — passed.
5. `cd tools/world-mcp && npm run test` — passed; 109 tests passed.
6. `grep -n "const ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/src/db/open.ts` — passed with no matches.
7. `grep -n "ATOMIC_LOGICAL_WORLD_FILES" tools/world-mcp/src/db/open.ts tools/world-index/src/public/types.ts` — passed; `open.ts` imports the public value and `public/types.ts` exports it.

## Deviations

- No new `tools/world-index/package.json` export path was added because the existing `./public/types` public entry already matches the consumer import shape.
- `tools/world-mcp/tests/db/open.test.ts` did not need a change; the existing atomized logical-row regression still covers the lifecycle behavior while the new public-export assertions cover the contract-sharing seam.
