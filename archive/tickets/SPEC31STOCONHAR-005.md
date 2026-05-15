# SPEC31STOCONHAR-005: Remove `ARCTRACE`; disambiguate story-local DA

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp`, `tools/patch-engine/src/ops/shared.ts`
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`, `archive/specs/SPEC-29-legacy-tools-vocabulary-cleanup.md`

## Problem

At intake, `docs/MACHINE-FACING-LAYER.md:67` still listed `ARCTRACE` among story-bundle id classes for `get_record`. FOUNDATIONS §Story Bundles §4a explicitly rejects ARC_TRACE; SPEC-29 (legacy tools vocabulary cleanup) was supposed to purge all ARC machinery but missed this surface. Additionally, the line treated `DA` as both world-level (in the atomic-id list) and story-local (implicitly, via `story_slug`) without disambiguation, leaving callers who supplied `story_slug` to silently resolve the wrong DA scope.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified at intake**: `docs/MACHINE-FACING-LAYER.md:67` listed ARCTRACE in the story-bundle id-class enumeration; FOUNDATIONS `:594` ("No ARC_TRACE class") confirmed the contradiction.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §D5 specifies removal + DA scope explicit.
3. **Cross-skill / cross-artifact boundary under audit**: documentation surface (MACHINE-FACING-LAYER) + MCP server retrieval surface (`get_record.ts`). The server did not accept `ARCTRACE` / `ARC_TRACE`; `validateRecordId` returned the package-standard `invalid_input` error for `ARC_TRACE-1`. The live gap was DA scope routing: `get_record(DA-*, story_slug=...)` queried `story_slug IS NULL` and therefore resolved world-level DA instead of story-local `story_diegetic_artifact_record` rows.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §4a (Plan-Authority Boundary) — "There is no parallel 'did the prose realize the planned arc' state engine — no ARC_TRACE class, no second state-transition pass." MACHINE-FACING-LAYER `:67`'s ARCTRACE listing contradicted this principle by treating ARC_TRACE as a valid retrieval id class. Removal restores §4a consistency across all surfaces.
5. **Renames/removes blast radius** (template item 7): grep for `ARCTRACE` and `ARC_TRACE` across `.claude/skills/*/SKILL.md`, `docs/`, `tools/`, and `specs/` found one active-code residue in `tools/patch-engine/src/ops/shared.ts`; this ticket removed it. Remaining hits are rejection statements, active SPEC-31/ticket documentation, historical triage/planning context, or the new `get_record` invalid-input test.
6. **Proof-command correction**: the repo has no root workspace proof lane for `pnpm --filter @worldloom/world-mcp test -t "get_record"`. `tools/world-mcp/package.json` defines package-local `npm run build` and `npm test`; focused proof uses the compiled test file after the package build.

## Architecture Check

1. **Cleaner than alternative**: SPEC-29's broader cleanup missed this surface; SPEC-31 absorbs the residue. Disambiguating DA explicitly prevents a class of "wrong DA found" retrieval bugs without adding routing complexity.
2. **No backwards-compatibility shims**: ARCTRACE has no live consumers; immediate removal is safe.

## Verification Layers

1. **`get_record('ARC_TRACE-1', story_slug='bundle')` returns the existing `invalid_input` unsupported-shape error** → MCP handler test.
2. **`get_record('DA-3', world_slug='w')` resolves world-level DA at `worlds/w/diegetic-artifacts/DA-3-*.md`** → MCP integration test.
3. **`get_record('DA-3', world_slug='w', story_slug='b')` resolves story-local DA at `worlds/w/stories/b/_source/artifacts/DA-3.yaml`** → MCP integration test.
4. **Cross-file grep classified** → codebase grep-proof (`ARCTRACE` / `ARC_TRACE` returns no active allowance path; remaining hits are rejection statements, active SPEC-31/ticket documentation, historical triage/planning context, or the invalid-input test).

## Landed Changes

### 1. MACHINE-FACING-LAYER.md `:67`

The story-bundle id list now removes `ARCTRACE` and explicitly disambiguates DA:
```
| `get_record` | The full parsed record for a structured id such as CF / CH /
M / OQ / SEC / PA / DA / CHAR (world-scope; no `story_slug` required for
world-level DA). Story-bundle ids — PG / SE / SF / OBL / CNSQ / THR / SREL /
STINT / STENT / STSTAT / STLOC / STOBJ / BR / CHC / SLT / SLB / SAU / SP /
RSP — require `story_slug` because authored story ids are unique only within
`(world_slug, story_slug)`. Story-local `DA-<integer>` records also require
`story_slug`; the absence of `story_slug` resolves DA at world scope. `ARC_TRACE`
is not a valid record class. ...
```

### 2. MCP retrieval (`tools/world-mcp/src/tools/get-record.ts`)

`ARCTRACE` is not a recognized id class in the retrieval schema. DA scope-resolution logic now routes `story_slug` present → story-local DA path and parsed story YAML response; absent → world-level DA hybrid markdown path.

### 3. Cross-file grep sweep

The sweep removed active-code residues and classified rejection/historical hits.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify — `:67`)
- `tools/world-mcp/README.md` (modify — same-seam public `get_record` prose)
- `tools/world-mcp/src/server.ts` (modify — registered capability description)
- `tools/world-mcp/src/tools/get-record.ts` (modify — story-local DA routing)
- `tools/world-mcp/tests/tools/get-record.test.ts` (modify — ARC_TRACE invalid-input assertion)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify — DA scope-routing fixture)
- `tools/patch-engine/src/ops/shared.ts` (modify — remove stale `ARCTRACE` story-bundle bare-id allowance)

## Out of Scope

- Hybrid PA retrieval support — D10 territory.
- Story-bundle id class additions or renames — not in scope for D5.

## Acceptance Criteria

### Tests That Must Pass

1. MCP handler test: `get_record('ARC_TRACE-1', story_slug='bundle')` → `invalid_input` unsupported-shape error.
2. MCP integration test: `get_record('DA-3', world_slug='w')` → world-level DA at `worlds/w/diegetic-artifacts/DA-3-*.md`.
3. MCP integration test: `get_record('DA-3', world_slug='w', story_slug='b')` → story-local DA at `worlds/w/stories/b/_source/artifacts/DA-3.yaml`.

### Invariants

1. `ARCTRACE` and `ARC_TRACE` do not appear in any active allowance path; rejection statements and historical context may mention the retired class.
2. DA scope is unambiguous: `story_slug` presence routes scope.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.test.ts` — new assertion for ARC_TRACE invalid-input rejection.
2. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` — new fixture for DA scope routing.

### Commands

1. `rg -n "ARCTRACE|ARC_TRACE" tools/patch-engine/src tools/patch-engine/tests` → no matches.
2. `rg -n "ARCTRACE|ARC_TRACE" .claude/skills docs tools specs archive/tickets/SPEC31STOCONHAR-005.md` → no active allowance path; remaining hits are rejection statements, active SPEC-31/ticket documentation, historical triage/planning context, or the invalid-input test.
3. `cd tools/world-mcp && npm run build` → green.
4. `cd tools/world-mcp && node --test dist/tests/tools/get-record.test.js dist/tests/tools/get-record-hybrid.test.js dist/tests/tools/get-record.story-bundle.test.js` → green.
5. `cd tools/world-mcp && npm test` → green after refreshing the checkout-local `worlds/erotica-world/_index` derived artifact with `node tools/world-index/dist/src/cli.js build erotica-world`.
6. `cd tools/patch-engine && npm test` → green.

## Outcome

Completed: 2026-05-15

What changed:
- Removed `ARCTRACE` from the active `docs/MACHINE-FACING-LAYER.md` `get_record` id list and documented explicit world-level vs story-local DA scope.
- Updated `get_record` so `DA-*` with `story_slug` resolves the story-scoped `story_diegetic_artifact_record` row, while `DA-*` without `story_slug` keeps the world-level hybrid markdown path.
- Updated `tools/world-mcp` public README and registered capability prose to match the dual-scope DA contract and retired `ARC_TRACE` class.
- Removed the stale `ARCTRACE` bare story-bundle id allowance from `tools/patch-engine/src/ops/shared.ts`.
- Added focused tests for `ARC_TRACE-1` invalid-input rejection and DA story/world scope routing.

## Deviations

- `ARCTRACE` was not accepted by `tools/world-mcp/src/tools/get-record.ts`; the real active-code residue was in `tools/patch-engine/src/ops/shared.ts`.
- The live MCP error taxonomy uses `invalid_input` for unsupported record-id shapes; there is no `unsupported_id_class` error code.
- The root `pnpm --filter` command was replaced with package-local `npm` commands.

## Verification Result

- `cd tools/world-mcp && npm run build` passed.
- `cd tools/world-mcp && node --test dist/tests/tools/get-record.test.js dist/tests/tools/get-record-hybrid.test.js dist/tests/tools/get-record.story-bundle.test.js` passed: 14 tests.
- `cd tools/world-mcp && npm test` passed after rebuilding the ignored `worlds/erotica-world/_index` derived artifact to the current index schema.
- `cd tools/patch-engine && npm test` passed: 75 tests.
- `rg -n "ARCTRACE|ARC_TRACE" tools/patch-engine/src tools/patch-engine/tests` returned no matches.
