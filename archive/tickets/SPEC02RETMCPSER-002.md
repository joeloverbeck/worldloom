# SPEC02RETMCPSER-002: Public types entry on tools/world-index

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/world-index/src/public/types.ts`, extends `tools/world-index/package.json` `exports` map with a CommonJS-safe public subpath, adds `tools/world-index/tests/public-types.test.ts`, and truths `tools/world-index/README.md`; no world-index runtime/query behavior change.
**Deps**: None (extends SPEC-01 public contract; runs independently of the world-mcp package scaffold)

## Problem

`tools/world-mcp/` needs TypeScript access to the schema types world-index already exports (`CanonFactRecord`, `ChangeLogEntry`, `NodeType`, `EdgeType`, `ModificationHistoryEntry`, `NODE_TYPES`, `EDGE_TYPES`, `CanonScope`, `CanonTruthScope`, `CanonDistribution`, `CanonSourceBasis`, `CanonContradictionRisk`) so its tools and assembler can typecheck against the exact shape of rows read from `worlds/<slug>/_index/world.db`. But SPEC-01 §Public contract is explicit that world-index is a pure producer and does not export a programmatic query library — sibling tooling opens the SQLite file on its own. A types-only public entry is a narrow, load-bearing extension to that contract: it gives consumers the schema types without giving them a query surface.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/src/schema/types.ts` currently exports (verified via grep at Step 2 spot-check):
   - `NODE_TYPES` (const) + `NodeType` (type)
   - `EDGE_TYPES` (const) + `EdgeType` (type)
   - `YAML_EDGE_TYPES`, `YamlEdgeType`, `ATTRIBUTION_EDGE_TYPES`, `AttributionEdgeType`, `ENTITY_EDGE_TYPES`, `EntityEdgeType`
   - `CanonFactStatus`, `CanonScopeGeographic`, `CanonScopeTemporal`, `CanonScopeSocial`, `CanonScope`
   - `CanonTruthWorldLevel`, `CanonTruthDiegeticStatus`, `CanonTruthScope`, `CanonDistribution`, `CanonSourceBasis`, `CanonContradictionRisk`, `ModificationHistoryEntry`, `CanonFactRecord`
   - `ChangeType`, `ChangeLogScope`, `ChangeLogEntry` (and more below line 174)
   - All of these types are the exact names referenced in `specs/SPEC-02-retrieval-mcp-server.md` §Shared-types public entry.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Shared-types public entry (lines 293–300) is the authoritative source for this ticket's scope; `archive/specs/SPEC-01-world-index.md` §Public contract (lines 26–27) is the constraint this ticket is narrowly extending.
3. Cross-package boundary under audit: this ticket is the only place where world-index's "pure producer" posture relaxes. The new public surface is still **types-only** — it must not export any function, class, or runtime helper. A future ticket that adds a query helper to `tools/world-index/src/public/` would be a distinct, separately adjudicated extension.
4. `tools/world-index/package.json` currently has no `exports` field and `npm test` currently runs only top-level `dist/tests/*.test.js`. A truthful proof surface therefore needs a top-level compiled test file unless the package test runner itself is widened. This ticket stays narrow and adds the proof at the already-live top-level test lane instead of broadening into test-runner cleanup.
5. `tools/world-index/README.md` is stale in two relevant ways: it still points at `specs/SPEC-01-world-index.md` even though SPEC-01 is archived at `archive/specs/SPEC-01-world-index.md`, and it has no note about the narrow public-types exception required by SPEC-02. Because this ticket already owns README truthing for the new public entry, correcting that stale spec path is same-seam fallout.
6. Extends an existing output schema? No — this ticket does not modify `CanonFactRecord`, `ChangeLogEntry`, or any world-index-emitted record. It only exposes the already-existing TypeScript definitions via a new import path. Additive-only to the package export surface; no consumer field drops.

## Architecture Check

1. Re-exporting types from a dedicated `public/` entry is cleaner than (a) duplicating types in `tools/world-mcp/` (drift risk; every schema change forces parallel updates) or (b) relocating types to a brand-new `tools/schema/` package (scope-extending; introduces a third package to coordinate when only one pair of consumers exists today). The public-types entry is the minimum viable change that preserves world-index's "pure producer" posture while eliminating the drift risk.
2. No backwards-compatibility aliasing or shims introduced — the re-export is a new public surface, not a legacy bridge.

## Verification Layers

1. Re-export surface matches internal definitions -> `cd tools/world-index && node -e "const t = require('@worldloom/world-index/public/types'); console.log(Object.keys(t).sort())"` prints the runtime const re-exports and the paired test imports the type-only re-exports.
2. No runtime side effects -> `cd tools/world-index && node -e 'const fs = require("fs"); fs.statSync = (...a) => { throw new Error("io forbidden at import time: " + a[0]); }; require("@worldloom/world-index/public/types"); console.log("ok");'` prints `ok` (the public-types entry performs no IO on import).
3. `exports` map correctness -> `cd tools/world-index && node -e "console.log(require('@worldloom/world-index/public/types'))"` resolves and does not throw `ERR_PACKAGE_PATH_NOT_EXPORTED`.

## What to Change

### 1. Create `tools/world-index/src/public/types.ts`

A re-export-only module:

```typescript
export type {
  NodeType,
  EdgeType,
  YamlEdgeType,
  AttributionEdgeType,
  EntityEdgeType,
  CanonFactStatus,
  CanonScopeGeographic,
  CanonScopeTemporal,
  CanonScopeSocial,
  CanonScope,
  CanonTruthWorldLevel,
  CanonTruthDiegeticStatus,
  CanonTruthScope,
  CanonDistribution,
  CanonSourceBasis,
  CanonContradictionRisk,
  ModificationHistoryEntry,
  CanonFactRecord,
  ChangeType,
  ChangeLogScope,
  ChangeLogEntry,
} from "../schema/types.js";

export {
  NODE_TYPES,
  EDGE_TYPES,
  YAML_EDGE_TYPES,
  ATTRIBUTION_EDGE_TYPES,
  ENTITY_EDGE_TYPES,
} from "../schema/types.js";
```

Exact names MUST match the existing exports in `tools/world-index/src/schema/types.ts`. Any interface, type, or `const` in `schema/types.ts` that world-mcp will reference at typecheck time should be re-exported here; re-verify against `schema/types.ts` at implementation time and extend the list if new types have landed since this ticket was written (e.g., if SPEC-10 or SPEC-11 added new entity-related types).

### 2. Update `tools/world-index/package.json`

Add an `exports` field so `@worldloom/world-index/public/types` resolves:

```json
"exports": {
  "./public/types": {
    "import": "./dist/src/public/types.js",
    "require": "./dist/src/public/types.js",
    "types": "./dist/src/public/types.d.ts"
  }
}
```

Because world-index is a CLI-first private package with no `src/index.ts`, this ticket only adds the `./public/types` subpath. It does **not** invent a new root library export.

### 3. Update `tools/world-index/README.md`

Add a one-paragraph §Public types entry subsection documenting the narrow types-only exception to the "pure producer" posture — what is re-exported, what is **not** re-exported (no query library, no runtime helpers), and who the consumer is (SPEC-02's `tools/world-mcp/`). While touching the README, correct the SPEC-01 design link to its archived path so the document remains truthful.

### 4. Add a top-level package test for the public entry

Add `tools/world-index/tests/public-types.test.ts` as a top-level test file so the current `npm test` runner (`node --test dist/tests/*.test.js`) actually executes it. The test should prove:

- package self-import via `@worldloom/world-index/public/types` resolves at runtime
- runtime const re-exports are present
- type-only re-exports compile and line up with the source module
- import performs no IO at module load time

## Files to Touch

- `tools/world-index/src/public/types.ts` (new)
- `tools/world-index/package.json` (modify — add `exports` field)
- `tools/world-index/README.md` (modify — add §Public types entry subsection)
- `tools/world-index/tests/public-types.test.ts` (new)

## Out of Scope

- Any runtime query helper in `tools/world-index/src/public/` (would violate SPEC-01's "pure producer" contract — if a future need arises, a separate spec should adjudicate).
- Modifying any existing types in `tools/world-index/src/schema/types.ts` (types are re-exported as-is; any field addition or rename is a separate concern).
- Re-exporting types from other world-index subdirectories (`src/index/`, `src/parse/`) — the public entry is narrowly scoped to schema types only.
- Editing `archive/specs/SPEC-01-world-index.md` (archived specs are historical records; the extension is documented in `specs/SPEC-02-retrieval-mcp-server.md` §Risks & Open Questions and in `tools/world-index/README.md`).
- Any change to `tools/world-mcp/` (the consumer ticket is SPEC02RETMCPSER-003 and onward).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build` succeeds — the new `public/types.ts` and the new public-types test compile.
2. `cd tools/world-index && npm test` passes — includes the new top-level `dist/tests/public-types.test.js` plus the existing world-index suite.
3. `cd tools/world-index && node -e "const t = require('@worldloom/world-index/public/types'); console.log(Object.keys(t).sort().join(','))"` emits the runtime re-exported constant names (at minimum: `ATTRIBUTION_EDGE_TYPES,EDGE_TYPES,ENTITY_EDGE_TYPES,NODE_TYPES,YAML_EDGE_TYPES`; type-only re-exports are proved by the compiled test import).
4. Existing parse/build behavior remains intact under the unchanged `npm test` lane; this ticket does not widen the package test runner beyond the already-live top-level suite.

### Invariants

1. `src/public/types.ts` contains zero runtime statements (no function definitions, no module-level initialization, no side-effect imports) — it is strictly a re-export module.
2. Every symbol re-exported from `src/public/types.ts` must exist in `src/schema/types.ts` at the same name (exact-string match); stale re-exports are a bug.
3. The `exports` map in `package.json` resolves `./public/types` to a `.js` file in `dist/`; source-`.ts` is never in the exports map.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/public-types.test.ts` (new) — minimal top-level test that imports every re-exported name needed by SPEC-02 and asserts the package self-import resolves without IO. Rationale: this is the narrowest proof that works with the current `npm test` runner.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm test`
3. `cd tools/world-index && node -e "require('@worldloom/world-index/public/types')"` — confirms the package subpath export loads cleanly from the package root.

## Outcome

- Completion date: 2026-04-23
- Added `tools/world-index/src/public/types.ts` as the dedicated re-export-only public schema-types entry.
- Added `./public/types` to `tools/world-index/package.json` with `import`, `require`, and `types` targets so the subpath works with the package's CommonJS build output and the ticket's `require(...)` proof shape.
- Added `tools/world-index/tests/public-types.test.ts` at the top-level package test lane so `npm test` now proves the runtime const re-exports, the type-only re-export surface, and the no-IO import invariant.
- Updated `tools/world-index/README.md` to point at archived SPEC-01 and to document the narrow types-only exception for `tools/world-mcp/`.

## Verification Result

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm test`
3. `cd tools/world-index && node -e "const t = require('@worldloom/world-index/public/types'); console.log(Object.keys(t).sort().join(','))"`
4. `cd tools/world-index && node -e 'const fs = require("fs"); fs.statSync = (...a) => { throw new Error("io forbidden at import time: " + a[0]); }; require("@worldloom/world-index/public/types"); console.log("ok");'`

## Deviations

- Reassessment showed the drafted `exports` snippet was incomplete for the live package output: because `tools/world-index` compiles to CommonJS and the ticket's proof uses `require(...)`, the landed `exports` entry also needs a `require` condition, not just `import` and `types`.
- Reassessment also showed the drafted nested test path would not run under the live `npm test` lane, so the landed proof uses a top-level `tools/world-index/tests/public-types.test.ts` instead of `tests/public/types.test.ts`.
