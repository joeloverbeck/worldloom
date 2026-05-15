# SPEC31STOCONHAR-005: Remove `ARCTRACE`; disambiguate story-local DA

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/src/tools/get-record.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`, `archive/specs/SPEC-29-legacy-tools-vocabulary-cleanup.md`

## Problem

`docs/MACHINE-FACING-LAYER.md:67` still lists `ARCTRACE` among story-bundle id classes for `get_record`. FOUNDATIONS §Story Bundles §4a explicitly rejects ARC_TRACE; SPEC-29 (legacy tools vocabulary cleanup) was supposed to purge all ARC machinery but missed this surface. Additionally, the line treats `DA` as both world-level (in the atomic-id list) and story-local (implicitly, via `story_slug`) without disambiguation, leaving callers who omit `story_slug` to silently resolve the wrong DA scope.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: `docs/MACHINE-FACING-LAYER.md:67` ARCTRACE listed in story-bundle id-class enumeration; FOUNDATIONS `:594` ("No ARC_TRACE class") confirmed.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D5 specifies removal + DA scope explicit.
3. **Cross-skill / cross-artifact boundary under audit**: documentation surface (MACHINE-FACING-LAYER) + MCP server retrieval surface (`get_record.ts`). If the server currently accepts `ARCTRACE` / `ARC_TRACE` in its id-class enum, the enum is updated; otherwise the documentation cleanup alone suffices.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §4a (Plan-Authority Boundary) — "There is no parallel 'did the prose realize the planned arc' state engine — no ARC_TRACE class, no second state-transition pass." MACHINE-FACING-LAYER `:67`'s ARCTRACE listing contradicts this principle by treating ARC_TRACE as a valid retrieval id class. Removal restores §4a consistency across all surfaces.
5. **Renames/removes blast radius** (template item 7): grep for `ARCTRACE` and `ARC_TRACE` across `.claude/skills/*/SKILL.md`, `docs/`, `tools/`, and `specs/` — confirm zero matches post-edit except FOUNDATIONS' rejection statement and SPEC-31's documentation of the removal.

## Architecture Check

1. **Cleaner than alternative**: SPEC-29's broader cleanup missed this surface; SPEC-31 absorbs the residue. Disambiguating DA explicitly prevents a class of "wrong DA found" retrieval bugs without adding routing complexity.
2. **No backwards-compatibility shims**: ARCTRACE has no live consumers; immediate removal is safe.

## Verification Layers

1. **`get_record('ARC_TRACE-1', story_slug='bundle')` returns `unsupported_id_class` error** → MCP integration test.
2. **`get_record('DA-3', world_slug='w')` resolves world-level DA at `worlds/w/diegetic-artifacts/DA-3-*.md`** → MCP integration test.
3. **`get_record('DA-3', world_slug='w', story_slug='b')` resolves story-local DA at `worlds/w/stories/b/_source/artifacts/DA-3.yaml`** → MCP integration test.
4. **Cross-file grep clean** → codebase grep-proof (`ARCTRACE` / `ARC_TRACE` returns only FOUNDATIONS' rejection statement and SPEC-31's documentation).

## What to Change

### 1. MACHINE-FACING-LAYER.md `:67`

Replace the story-bundle id list to remove `ARCTRACE` and explicitly disambiguate DA:
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

If `ARCTRACE` is currently a recognized id class in the retrieval schema, remove it. Confirm DA scope-resolution logic: `story_slug` present → story-local DA path; absent → world-level DA path. If the dual-scope path is not yet implemented, document the gap as a separate ticket (out of scope for D5 unless implementation is trivial).

### 3. Cross-file grep sweep

Confirm no other docs / skills / templates / tools file references `ARCTRACE` or `ARC_TRACE` outside of FOUNDATIONS' explicit rejection statement (line ~594) and SPEC-31's documentation of the removal. Strip any residues found.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify — `:67`)
- `tools/world-mcp/src/tools/get-record.ts` (modify if ARCTRACE present in id-class enum)
- `tools/world-mcp/tests/tools/get-record.test.ts` (modify — new fixture: ARCTRACE → unsupported-id-class error)
- Conditional: any other file surfaced by the cross-file grep.

## Out of Scope

- Hybrid PA retrieval support — D10 territory.
- Story-bundle id class additions or renames — not in scope for D5.

## Acceptance Criteria

### Tests That Must Pass

1. MCP integration test: `get_record('ARC_TRACE-1', story_slug='bundle')` → `unsupported_id_class` error.
2. MCP integration test: `get_record('DA-3', world_slug='w')` → world-level DA at `worlds/w/diegetic-artifacts/DA-3-*.md`.
3. MCP integration test: `get_record('DA-3', world_slug='w', story_slug='b')` → story-local DA at `worlds/w/stories/b/_source/artifacts/DA-3.yaml`.

### Invariants

1. `ARCTRACE` and `ARC_TRACE` do not appear in any active code path or doc except FOUNDATIONS' rejection statement.
2. DA scope is unambiguous: `story_slug` presence routes scope.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.test.ts` — new fixture for ARC_TRACE rejection + DA scope routing.

### Commands

1. `grep -rn "ARCTRACE\|ARC_TRACE" .claude/skills/ docs/ tools/ specs/` → only FOUNDATIONS rejection + SPEC-31 documentation match.
2. `pnpm --filter @worldloom/world-mcp test -t "get_record"` → green.
