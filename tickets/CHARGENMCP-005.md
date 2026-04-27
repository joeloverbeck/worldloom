# CHARGENMCP-005: Document `find_named_entities` exact-match semantics + add region/era discoverability hint

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes (small) — `tools/world-mcp/src/tools/find-named-entities.ts` (response field addition); `docs/MACHINE-FACING-LAYER.md`; tool description string in `tools/world-mcp/src/server.ts`
**Deps**: none

## Problem

During the Namahan character-generation run (2026-04-27), I called `mcp__worldloom__find_named_entities(world_slug='animalia', names=['Third Gate', 'drylands', 'drylands corridor', 'caravan-corridor', 'Charter-Era', 'Incident Wave'])`. Of those six queries:

- `Third Gate` returned `surface_matches` with 8 hits in `character_proposal_card` (useful: the proposal that triggered the run).
- `Incident Wave` returned `surface_matches` across multiple node types (useful).
- `drylands`, `drylands corridor`, `caravan-corridor`, `Charter-Era` returned **no matches at all** — neither canonical, scoped, nor surface — despite each being referenced in dozens of records (`drylands` is named in CF-0044, CF-0046, CF-0047, every drylands SEC record, and the WORLD_KERNEL).

The tool's behavior is documented as "Resolve exact canonical and unresolved surface-name matches." The empty results for `drylands` are likely a consequence of how the entity index tokenizes surface text — `drylands` may always appear as part of a compound (`drylands south`, `drylands corridor`, `drylands well-keeper`, etc.) and never as a standalone indexed token. That is a defensible design choice (the tool is "named-entity resolution," not full-text search) — but it is not documented at the tool-description level, and an empty result for a heavily-used region descriptor is misleading without a "did you mean" hint.

The tool's purpose is to bind brief-supplied names to canonical entities at Phase 0 of character generation; when the brief uses a region descriptor like "drylands" or an era descriptor like "Charter-Era," the tool currently returns nothing helpful. The skill workflow then has to fall back to `mcp__worldloom__search_nodes(query='drylands')` for content discovery — an undocumented fallback path.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/tools/find-named-entities.ts` is the implementation. Behavior verified by direct call during the Namahan run; "drylands" returned `{"canonical_matches":[],"scoped_matches":[],"surface_matches":[]}` despite the term being pervasive.
2. The tool description in `tools/world-mcp/src/server.ts` reads "Resolve exact canonical and unresolved surface-name matches." The "exact" qualifier carries the design intent but does not warn callers that compositional descriptors (region names embedded in compound tokens) may return empty.
3. `mcp__worldloom__search_nodes(query='drylands')` was the working fallback during the Namahan run — it returned section-record matches by FTS5 full-text. That tool's existence makes the fallback path real, but skills do not have explicit guidance on when to use which.
4. Cross-tool boundary under audit: the contract between `find_named_entities` (entity-resolution tool) and `search_nodes` (full-text retrieval tool). They serve different purposes; the user-facing distinction needs to be documented at the tool-description and MACHINE-FACING-LAYER.md levels.
5. FOUNDATIONS principle under audit: §Tooling Recommendation guarantees about "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel / Invariants / relevant CF records / affected domain files / unresolved contradictions / mystery reserve entries." Phase 0 of character generation binds brief-supplied names to canonical entities; if the binding tool returns empty for region descriptors and the fallback path is undocumented, the skill workflow has a friction point that is invisible to the skill prose.
6. HARD-GATE / canon-write ordering: not touched. This is a read-only tool.
7. Schema extension: the tool's response gains an optional `hint` field on empty results when the query is a known region/era descriptor (e.g., `hint: "no exact entity match; 'drylands' appears as a region descriptor in 47 records — try mcp__worldloom__search_nodes(query='drylands') for content lookup"`). The existing `canonical_matches`, `scoped_matches`, `surface_matches` fields are unchanged.
8. Adjacent contradictions exposed by reassessment:
   - The character-generation skill's Phase 0 prose at `.claude/skills/character-generation/references/phase-0-normalize-brief.md` instructs callers to "bind required inputs to named entities resolved through `find_named_entities` + `get_neighbors`." It does not document the fallback to `search_nodes` for region/era descriptors. A small note in that file is needed alongside this ticket's tool-side change.

## Architecture Check

1. Documenting the exact-match-only semantics at the tool-description level and at MACHINE-FACING-LAYER.md is the cheapest fix for the discoverability problem. The optional `hint` field on empty results is a small additional ergonomic improvement; it does not change the tool's resolution semantics, only its empty-result pedagogy.
2. No backwards-compatibility aliasing/shims introduced. The new `hint` field is additive on empty results; existing callers ignoring it continue to work.

## Verification Layers

1. The tool's description string in `server.ts` and the corresponding entry in `docs/MACHINE-FACING-LAYER.md` explicitly note exact-canonical-match semantics and direct callers to `search_nodes` for content discovery — manual review.
2. The `hint` field on empty results, when populated, contains an actionable next-step pointer (a `search_nodes` query string or a known region/era classification) — schema validation in test.
3. Existing `find_named_entities` callers continue to work unchanged on non-empty results — codebase grep-proof of consumers (`mcp__worldloom__find_named_entities` callsites in `.claude/skills/`) plus regression tests.
4. The Phase 0 reference doc updates the brief-binding step to mention `search_nodes` as the region/era fallback — schema validation against the doc.
5. FOUNDATIONS alignment — strengthens §Tooling Recommendation by documenting the actual retrieval composition skills must use — FOUNDATIONS alignment check.

## What to Change

### 1. Update tool description and documentation

Edit `tools/world-mcp/src/server.ts` to update the registered description for `find_named_entities` to: "Resolve exact canonical and unresolved surface-name matches. For region/era descriptors and compound tokens that may not match an indexed entity exactly, use `search_nodes(query=…)` for content lookup."

Update the corresponding row in `docs/MACHINE-FACING-LAYER.md` to add: "**Note**: this tool is exact-match resolution, not full-text search. Region descriptors (`drylands`, `canal-heartland`) and era descriptors (`Charter-Era`, `Incident Wave`) that appear only as parts of compound tokens may return empty; use `search_nodes(query=…)` for those."

### 2. Add `hint` field on empty results

Edit `tools/world-mcp/src/tools/find-named-entities.ts` so that when all three match arrays for a query are empty AND the query string matches a known region descriptor (the world's region list, queryable from the index) or a known era descriptor (the world's timeline-layer list), the response carries:

```ts
{ canonical_matches: [], scoped_matches: [], surface_matches: [], hint?: string }
```

The `hint` is a short actionable string, e.g., `"no exact entity match; '{query}' is a region descriptor — try search_nodes(world_slug, query='{query}') for content lookup"`. The `hint` field is omitted when the tool's behavior is already informative (non-empty results, or queries that genuinely do not match any indexed surface).

### 3. Update Phase 0 reference doc

Edit `.claude/skills/character-generation/references/phase-0-normalize-brief.md` near the existing `find_named_entities` instruction to add: "Region descriptors (e.g., `drylands`, `canal-heartland`) and era descriptors (e.g., `Charter-Era`, `Incident Wave`) may return empty from `find_named_entities`. For those, use `mcp__worldloom__search_nodes(world_slug, query='<descriptor>')` to discover content references; the descriptors themselves bind to named entities via the SEC and CF records that contain them, not via direct entity registry."

### 4. Tests

Update `tools/world-mcp/tests/tools/find-named-entities.test.ts` (or create if absent) covering:
- Existing cases (canonical_matches / scoped_matches / surface_matches behavior unchanged on non-empty results).
- New: an empty-result query for a known region descriptor in the fixture world returns `hint` with a `search_nodes`-pointer string.
- New: an empty-result query for an unknown string returns no `hint` field.

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — add hint field on empty + region-descriptor detection)
- `tools/world-mcp/src/server.ts` (modify — tool description string)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (new or extend)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval table row)
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (modify — add fallback note)

## Out of Scope

- Changing the tool's exact-match resolution semantics (the tool remains exact-match by design; this ticket only adds discoverability hints).
- Implementing fuzzy or compositional matching as a primary resolution path (would require entity-index changes beyond this ticket's scope).
- Sweeping other skills' Phase 0 / brief-binding prose for the same fallback documentation (a parallel sweep belongs in a follow-up if a future audit identifies the same gap in `canon-addition` or `propose-new-canon-facts`).

## Acceptance Criteria

### Tests That Must Pass

1. New / extended `find-named-entities.test.ts` covers the empty-result + region-descriptor-hint case and the empty-result + unknown-query no-hint case.
2. `pnpm --filter world-mcp test` passes.
3. `pnpm turbo test` passes (full pipeline gate).
4. Grep-proof: `grep -n "search_nodes" .claude/skills/character-generation/references/phase-0-normalize-brief.md` returns the new fallback-instruction line.
5. Manual MCP probe after build + Claude Code restart: `mcp__worldloom__find_named_entities(world_slug='animalia', names=['drylands'])` returns `hint` referencing `search_nodes`.

### Invariants

1. The tool's resolution semantics (exact-match only) are unchanged — region descriptors do not silently become canonical entities.
2. The `hint` field is only present on empty results when an actionable pointer applies; non-empty results carry no hint.
3. Existing callers reading only `canonical_matches` / `scoped_matches` / `surface_matches` continue to work.
4. FOUNDATIONS Rule 7 firewall is unaffected — this is a discoverability ergonomic, not a Mystery Reserve channel.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — extends existing test (or adds new) for the hint-on-empty-region-query case and hint-absence-on-unknown-query case.

### Commands

1. `pnpm --filter world-mcp test --testPathPattern=tools/find-named-entities`
2. `pnpm --filter world-mcp test`
3. `pnpm turbo test`
4. `grep -n "search_nodes" .claude/skills/character-generation/references/phase-0-normalize-brief.md`
5. After build + Claude Code restart: `mcp__worldloom__find_named_entities(world_slug='animalia', names=['drylands','Charter-Era'])` should return `hint` strings on each empty result.
