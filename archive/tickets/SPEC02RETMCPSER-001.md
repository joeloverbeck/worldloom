# SPEC02RETMCPSER-001: Scaffold tools/world-mcp package

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces new `tools/world-mcp/` TypeScript package; no impact on existing `tools/world-index/`, `tools/patch-engine/`, `tools/validators/`, or `tools/hooks/`.
**Deps**: None

## Problem

`tools/world-mcp/` currently contains only a `README.md` stub. Every subsequent SPEC-02 ticket assumes a buildable TypeScript package with the directory layout described in `specs/SPEC-02-retrieval-mcp-server.md` §Package location, a `package.json` declaring the MCP SDK and `better-sqlite3` dependencies named in §Dependencies, a `tsconfig.json` that matches the sibling `tools/world-index/tsconfig.json` shape, and an `.mcp.json.example` at the package root that shows users how to register the server with Claude Code. Without the scaffold, none of those tickets can compile against a real workspace.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/` exists as a scaffold-only directory containing only `README.md`. Confirmed via `ls /home/joeloverbeck/projects/worldloom/tools/world-mcp/` during Step 2 spot-check — no collision with existing source.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Package location (lines 25–94) enumerates the exact directory tree and file names this ticket must create, and §Dependencies (lines 96–108) enumerates the exact npm packages with pinned versions (`@modelcontextprotocol/sdk` ^1.x; `better-sqlite3` 12.2.0 matching `tools/world-index/package.json:17`; `@types/better-sqlite3` 7.6.13; `@types/node` 24.7.2; `typescript` 5.9.3).
3. Cross-package boundary under audit: `tools/world-mcp/` reads `worlds/<slug>/_index/world.db` directly via its own `better-sqlite3` connection per SPEC-01 §Public contract (archived at `archive/specs/SPEC-01-world-index.md`); it does not import `tools/world-index` as a query library. This ticket only sets up the package shell — the actual DB access layer lands in SPEC02RETMCPSER-003.
4. `docs/FOUNDATIONS.md` §Machine-Facing Layer names the retrieval MCP server as the read-side Layer 2 surface, so this scaffold must leave a truthful package entrypoint and registration example in place even before any retrieval tools exist.
5. Mismatch corrected during reassessment: a `tools/world-index`-style `tsconfig.json` plus only `.gitkeep` directories would not leave a truthful `npm run build` acceptance lane, and that same output layout compiles `src/server.ts` to `dist/src/server.js`, not `dist/server.js`. This ticket therefore adds a minimal `src/server.ts` placeholder and points `.mcp.json.example` at `tools/world-mcp/dist/src/server.js` so the scaffold's recorded proof surface matches the actual emitted artifact.

## Architecture Check

1. Mirroring `tools/world-index/package.json` pinning and `tsconfig.json` shape is cleaner than inventing a new TypeScript build configuration, because every sibling tool package in `tools/*/` already follows the same convention (Node ≥20, TypeScript 5.9.3, `dist/` gitignored) and deviating would create a drift cost for a tool that does not need it.
2. No backwards-compatibility aliasing or shims introduced — this is a new package.

## Verification Layers

1. Package builds cleanly → `npm install && npm run build` in `tools/world-mcp/` produces `dist/` without errors.
2. Directory layout matches spec §Package location → `find tools/world-mcp -type d` output matches the tree at spec lines 27–72.
3. Dependency pinning matches spec §Dependencies → grep-proof on `package.json` confirms every pinned version.

## What to Change

### 1. Create `tools/world-mcp/package.json`

Declare the package with `@modelcontextprotocol/sdk` (latest 1.x, e.g., `^1.0.0`), `better-sqlite3` (`12.2.0` matching sibling), dev deps (`@types/better-sqlite3` `7.6.13`, `@types/node` `24.7.2`, `typescript` `5.9.3`), Node engines `>=20`, `private: true`, scripts (`build`, `test`, `clean`) modeled on `tools/world-index/package.json`.

### 2. Create `tools/world-mcp/tsconfig.json`

Copy the shape from `tools/world-index/tsconfig.json` (strict TypeScript, `dist/` outDir, include `src/` and `tests/`).

### 3. Create the directory scaffold

Create the following directories into existence (placeholder `.gitkeep` or a single-line stub file where needed so git tracks them until real content lands in later tickets):

- `tools/world-mcp/src/db/`
- `tools/world-mcp/src/tools/`
- `tools/world-mcp/src/ranking/profiles/`
- `tools/world-mcp/src/context-packet/`
- `tools/world-mcp/src/approval/`
- `tools/world-mcp/tests/fixtures/`
- `tools/world-mcp/tests/tools/`
- `tools/world-mcp/tests/ranking/`
- `tools/world-mcp/tests/approval/`
- `tools/world-mcp/tests/integration/`

### 4. Create `tools/world-mcp/.mcp.json.example`

Create the example Claude Code registration file, but point it at the truthful compiled scaffold entrypoint (`tools/world-mcp/dist/src/server.js`) produced by this ticket's TypeScript layout.

### 5. Add a minimal scaffold entrypoint

Create `tools/world-mcp/src/server.ts` as a placeholder module so `npm run build` compiles a real entry artifact without claiming that the MCP server logic is already implemented.

### 6. Update `tools/world-mcp/README.md`

Flip the Status section from "not yet implemented" to "Phase 1 — scaffold landed; tool implementations land in subsequent tickets". Preserve the existing Planned tools list.

### 7. Confirm `.gitignore` coverage

Per `specs/IMPLEMENTATION-ORDER.md:17–22`, Phase 0 already added `tools/*/dist/`, `tools/*/node_modules/`, and `tools/world-mcp/.secret` to `.gitignore`. Confirm no further `.gitignore` edits are needed for this ticket; the secret is introduced in SPEC02RETMCPSER-009, not here.

## Files to Touch

- `tools/world-mcp/package.json` (new)
- `tools/world-mcp/package-lock.json` (new)
- `tools/world-mcp/tsconfig.json` (new)
- `tools/world-mcp/.mcp.json.example` (new)
- `tools/world-mcp/README.md` (modify — flip Status)
- `tools/world-mcp/src/server.ts` (new)
- `tools/world-mcp/src/db/.gitkeep` (new)
- `tools/world-mcp/src/tools/.gitkeep` (new)
- `tools/world-mcp/src/ranking/profiles/.gitkeep` (new)
- `tools/world-mcp/src/context-packet/.gitkeep` (new)
- `tools/world-mcp/src/approval/.gitkeep` (new)
- `tools/world-mcp/tests/fixtures/.gitkeep` (new)
- `tools/world-mcp/tests/tools/.gitkeep` (new)
- `tools/world-mcp/tests/ranking/.gitkeep` (new)
- `tools/world-mcp/tests/approval/.gitkeep` (new)
- `tools/world-mcp/tests/integration/.gitkeep` (new)

## Out of Scope

- Any `src/*.ts` runtime code (lands in SPEC02RETMCPSER-003 through -011).
- Any test implementations (lands in the ticket that introduces each tool).
- `.secret` creation (lands in SPEC02RETMCPSER-009).
- Modifying `.gitignore` beyond the Phase 0 entries already in place.
- Modifying any file outside `tools/world-mcp/`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm install` succeeds against a clean `node_modules/`.
2. `cd tools/world-mcp && npm run build` produces `dist/src/server.js` with no TypeScript errors.
3. `jq -r '.dependencies["better-sqlite3"]' tools/world-mcp/package.json` returns `12.2.0`.
4. `jq -r '.dependencies["@modelcontextprotocol/sdk"]' tools/world-mcp/package.json` returns a non-null value starting with `^1.`.
5. `jq -r '.mcpServers.worldloom.args[0]' tools/world-mcp/.mcp.json.example` returns `tools/world-mcp/dist/src/server.js`.

### Invariants

1. Directory tree matches the layout documented in `specs/SPEC-02-retrieval-mcp-server.md` §Package location; future tickets may add files but must not rearrange the top-level subdirectories without amending this spec.
2. Every dep pin in `tools/world-mcp/package.json` aligns with the corresponding pin in `tools/world-index/package.json` where both packages consume the same package; drift requires an explicit spec edit.
3. The scaffold's registration example must point at the artifact the package actually builds; no speculative `dist/server.js` alias path is introduced.

## Test Plan

### New/Modified Tests

1. `None — scaffold-only ticket; verification is command-based and runtime test coverage lands alongside each tool ticket.`

### Commands

1. `cd tools/world-mcp && npm install`
2. `cd tools/world-mcp && npm run build`
3. `find tools/world-mcp -type d | sort` — compare against spec §Package location directory tree.
4. `jq -r '.mcpServers.worldloom.args[0]' tools/world-mcp/.mcp.json.example` — confirm the example targets the compiled scaffold entrypoint.
5. `diff <(jq -S .dependencies tools/world-mcp/package.json) <(cat <<'EOF' | jq -S .
{"@modelcontextprotocol/sdk":"^1.0.0","better-sqlite3":"12.2.0"}
EOF
)` — confirm dep surface matches the spec (exact minor/patch of the MCP SDK may land at implementation time).

## Outcome

**Completion date**: 2026-04-23

Created the `tools/world-mcp/` package scaffold with a pinned `package.json`, matching `tsconfig.json`, `package-lock.json`, a truthful `.mcp.json.example`, a minimal placeholder `src/server.ts`, and the tracked empty `src/` / `tests/` subdirectories required by the spec's package layout. Updated `tools/world-mcp/README.md` to mark the package as scaffolded rather than unimplemented. No `.gitignore` edit was needed because the existing Phase 0 rules already ignore `tools/*/dist/`, `tools/*/node_modules/`, and `tools/world-mcp/.secret`.

**Deviations from original plan**: The ticket's original proof language assumed a dirs-only scaffold and a `dist/server.js` MCP entrypoint. Reassessment corrected the owned boundary to include a minimal placeholder `src/server.ts` and a truthful `.mcp.json.example` target of `tools/world-mcp/dist/src/server.js`, matching the actual output produced by the sibling `tools/world-index` TypeScript layout.

## Verification Result

1. Ran `cd tools/world-mcp && npm install` — succeeded and generated `tools/world-mcp/package-lock.json`.
2. Ran `cd tools/world-mcp && npm run build` — succeeded and emitted `tools/world-mcp/dist/src/server.js`.
3. Ran `find tools/world-mcp -type d | sort` — confirmed the scaffolded directory tree exists.
4. Ran `jq -r '.mcpServers.worldloom.args[0]' tools/world-mcp/.mcp.json.example` — returned `tools/world-mcp/dist/src/server.js`.
5. Ran `jq -r '.dependencies["better-sqlite3"]' tools/world-mcp/package.json` and `jq -r '.dependencies["@modelcontextprotocol/sdk"]' tools/world-mcp/package.json` — returned `12.2.0` and `^1.0.0`.
6. Ran the dependency diff probe from `## Test Plan` — returned no diff.
