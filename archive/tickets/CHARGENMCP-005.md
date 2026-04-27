# CHARGENMCP-005: Document `find_named_entities` exact-match semantics + add region/era discoverability hint

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes (small) — `tools/world-mcp/src/tools/find-named-entities.ts` (response field addition); `docs/MACHINE-FACING-LAYER.md`; `tools/world-mcp/README.md`; tool description string in `tools/world-mcp/src/server.ts`
**Deps**: none

## Problem

At intake during the Namahan character-generation run (2026-04-27), I called `mcp__worldloom__find_named_entities(world_slug='animalia', names=['Third Gate', 'drylands', 'drylands corridor', 'caravan-corridor', 'Charter-Era', 'Incident Wave'])`. Of those six queries:

- `Third Gate` returned `surface_matches` with 8 hits in `character_proposal_card` (useful: the proposal that triggered the run).
- `Incident Wave` returned `surface_matches` across multiple node types (useful).
- `drylands`, `drylands corridor`, `caravan-corridor`, `Charter-Era` returned **no matches at all** — neither canonical, scoped, nor surface — despite each being referenced in dozens of records (`drylands` is named in CF-0044, CF-0046, CF-0047, every drylands SEC record, and the WORLD_KERNEL).

Before this ticket, the tool's behavior was documented as "Resolve exact canonical and unresolved surface-name matches." The empty results for `drylands` were likely a consequence of how the entity index tokenizes surface text — `drylands` may always appear as part of a compound (`drylands south`, `drylands corridor`, `drylands well-keeper`, etc.) and never as a standalone indexed token. That is a defensible design choice (the tool is "named-entity resolution," not full-text search), but it was not documented at the tool-description level, and an empty result for a heavily-used region descriptor was misleading without a "did you mean" hint.

The tool's purpose is to bind brief-supplied names to canonical entities at Phase 0 of character generation; when the brief uses a region descriptor like "drylands" or an era descriptor like "Charter-Era," the completed behavior now preserves the empty exact-match result while adding an actionable `hints[]` pointer to `search_nodes(...)` for content discovery.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/tools/find-named-entities.ts` is the implementation. Behavior verified by direct call during the Namahan run; "drylands" returned `{"canonical_matches":[],"scoped_matches":[],"surface_matches":[]}` despite the term being pervasive.
2. The tool description in `tools/world-mcp/src/server.ts` reads "Resolve exact canonical and unresolved surface-name matches." The "exact" qualifier carries the design intent but does not warn callers that compositional descriptors (region names embedded in compound tokens) may return empty.
3. `mcp__worldloom__search_nodes(query='drylands')` was the working fallback during the Namahan run — it returned section-record matches by FTS5 full-text. That tool's existence makes the fallback path real, but skills do not have explicit guidance on when to use which.
4. Cross-tool boundary under audit: the contract between `find_named_entities` (entity-resolution tool) and `search_nodes` (full-text retrieval tool). They serve different purposes; the user-facing distinction needs to be documented at the tool-description and MACHINE-FACING-LAYER.md levels.
5. FOUNDATIONS principle under audit: §Tooling Recommendation guarantees about "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel / Invariants / relevant CF records / affected domain files / unresolved contradictions / mystery reserve entries." Phase 0 of character generation binds brief-supplied names to canonical entities; if the binding tool returns empty for region descriptors and the fallback path is undocumented, the skill workflow has a friction point that is invisible to the skill prose.
6. HARD-GATE / canon-write ordering: not touched. This is a read-only tool.
7. Schema extension: the tool's aggregate response gains an optional `hints[]` field for empty input queries that are known region/era descriptors (e.g., `{ query: "drylands", descriptor_kind: "region", record_count: 47, message: "no exact entity match; 'drylands' appears as a region descriptor in 47 records - try search_nodes(world_slug, query='drylands') for content lookup" }`). A per-response `hint?: string` would be ambiguous for multi-name calls because the live response shape aggregates all matches across `names[]`. The existing `canonical_matches`, `scoped_matches`, `surface_matches` fields are unchanged.
8. Adjacent contradictions exposed by reassessment:
   - The character-generation skill's Phase 0 prose at `.claude/skills/character-generation/references/phase-0-normalize-brief.md` already documents the `search_nodes` fallback for region/era descriptors. This ticket therefore does not own a new edit to that file, only grep-proof that the live note remains present.
9. Package command mismatch: the repo has no root `pnpm`/`turbo` workspace for this package. `tools/world-mcp/package.json` owns the live proof surface via package-local `npm run build` and `npm test`.

## Architecture Check

1. Documenting the exact-match-only semantics at the tool-description level and at MACHINE-FACING-LAYER.md is the cheapest fix for the discoverability problem. The optional `hints[]` field on empty descriptor queries is a small additional ergonomic improvement; it does not change the tool's resolution semantics, only its empty-result pedagogy.
2. No backwards-compatibility aliasing/shims introduced. The new `hints[]` field is additive; existing callers ignoring it continue to work.

## Verification Layers

1. The tool's description string in `server.ts` and the corresponding entry in `docs/MACHINE-FACING-LAYER.md` explicitly note exact-canonical-match semantics and direct callers to `search_nodes` for content discovery — manual review.
2. The `hints[]` field for empty descriptor queries, when populated, contains an actionable next-step pointer (a `search_nodes` query string plus a known region/era classification) — schema validation in test.
3. Existing `find_named_entities` callers continue to work unchanged on non-empty results — codebase grep-proof of consumers (`mcp__worldloom__find_named_entities` callsites in `.claude/skills/`) plus regression tests.
4. The Phase 0 reference doc mentions `search_nodes` as the region/era fallback — grep-proof against the existing doc.
5. FOUNDATIONS alignment — strengthens §Tooling Recommendation by documenting the actual retrieval composition skills must use — FOUNDATIONS alignment check.

## What to Change

### 1. Update tool description and documentation

Edit `tools/world-mcp/src/server.ts` to update the registered description for `find_named_entities` to: "Resolve exact canonical and unresolved surface-name matches. For region/era descriptors and compound tokens that may not match an indexed entity exactly, use `search_nodes(query=…)` for content lookup."

Update the corresponding row in `docs/MACHINE-FACING-LAYER.md` to add: "**Note**: this tool is exact-match resolution, not full-text search. Region descriptors (`drylands`, `canal-heartland`) and era descriptors (`Charter-Era`, `Incident Wave`) that appear only as parts of compound tokens may return empty; use `search_nodes(query=…)` for those."

### 2. Add `hints[]` field on empty results

Edit `tools/world-mcp/src/tools/find-named-entities.ts` so that when all three match arrays for a query are empty AND the query string appears in geography records (region descriptor) or timeline records (era descriptor), the response carries:

```ts
{ canonical_matches: [], scoped_matches: [], surface_matches: [], hints?: FindNamedEntityHint[] }
```

Each hint is a short actionable object for a specific query. `hints[]` is omitted when the tool's behavior is already informative for every query (non-empty results, or queries that genuinely do not match any indexed geography/timeline surface).

### 3. Update Phase 0 reference doc

No new edit required. `.claude/skills/character-generation/references/phase-0-normalize-brief.md` already contains the region/era descriptor fallback note; closeout only needs to grep-proof that line.

### 4. Tests

Update `tools/world-mcp/tests/tools/find-named-entities.test.ts` (or create if absent) covering:
- Existing cases (canonical_matches / scoped_matches / surface_matches behavior unchanged on non-empty results).
- New: empty-result queries for known region/era descriptors in the fixture world return `hints[]` with `search_nodes`-pointer strings.
- New: an empty-result query for an unknown string returns no `hints[]` field.

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — add `hints[]` field on empty descriptor queries)
- `tools/world-mcp/src/server.ts` (modify — tool description string)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (new or extend)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval table row)
- `tools/world-mcp/README.md` (modify — user-facing tool return shape)
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (verify only — fallback note already present)

## Out of Scope

- Changing the tool's exact-match resolution semantics (the tool remains exact-match by design; this ticket only adds discoverability hints).
- Implementing fuzzy or compositional matching as a primary resolution path (would require entity-index changes beyond this ticket's scope).
- Sweeping other skills' Phase 0 / brief-binding prose for the same fallback documentation (a parallel sweep belongs in a follow-up if a future audit identifies the same gap in `canon-addition` or `propose-new-canon-facts`).

## Acceptance Criteria

### Tests That Must Pass

1. New / extended `find-named-entities.test.ts` covers the empty-result + region/era-descriptor-hints case and the empty-result + unknown-query no-hint case.
2. `cd tools/world-mcp && npm run build` passes.
3. `cd tools/world-mcp && npm test` passes.
4. Grep-proof: `grep -n "search_nodes" .claude/skills/character-generation/references/phase-0-normalize-brief.md` returns the fallback-instruction line.
5. Direct handler probe: `findNamedEntities({ world_slug: "animalia", names: ["drylands", "Charter-Era"] })`, run from the package-local compiled artifact after build, returns `hints[]` entries referencing `search_nodes`.

### Invariants

1. The tool's resolution semantics (exact-match only) are unchanged — region descriptors do not silently become canonical entities.
2. `hints[]` is only present for empty queries when an actionable pointer applies; non-empty results do not create hints.
3. Existing callers reading only `canonical_matches` / `scoped_matches` / `surface_matches` continue to work.
4. FOUNDATIONS Rule 7 firewall is unaffected — this is a discoverability ergonomic, not a Mystery Reserve channel.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — extends existing tests for hint-on-empty-region/era-query cases and hint-absence-on-unknown-query case.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/find-named-entities.test.js`
3. `cd tools/world-mcp && npm test`
4. `grep -n "search_nodes" .claude/skills/character-generation/references/phase-0-normalize-brief.md`
5. After build: direct compiled handler probe for `findNamedEntities({ world_slug: "animalia", names: ["drylands", "Charter-Era"] })` should return `hints[]` entries for each descriptor if the live `animalia` index is available in the local checkout.

## Outcome

Completed: 2026-04-27.

Implemented the additive `hints[]` response surface in `find_named_entities` for empty descriptor queries that still appear in geography or timeline records. The exact-match arrays remain unchanged; the tool now emits query-scoped hint objects with `descriptor_kind`, `record_count`, and an actionable `search_nodes(...)` message.

Updated the registered MCP tool description, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` to state that `find_named_entities` is exact-match resolution, not full-text search, and can return optional descriptor `hints[]`. The Phase 0 character-generation fallback note was already present and was verified rather than edited.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/find-named-entities.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed, 144 tests passing.
4. `grep -n "search_nodes" .claude/skills/character-generation/references/phase-0-normalize-brief.md` — confirmed the existing Region/era descriptor binding fallback line.
5. `cd tools/world-mcp && node -e "const { findNamedEntities } = require('./dist/src/tools/find-named-entities.js'); ..."` — direct compiled handler probe against local `animalia` returned `hints[]` for `drylands` (`region`, 14 records) and `Charter-Era` (`era`, 4 records), both pointing to `search_nodes(...)`.
6. Post-review grep/manual review confirmed `tools/world-mcp/README.md` now documents optional `hints[]`.

## Deviations

- The drafted singular `hint?: string` response was replaced with `hints[]` because the live API aggregates results across `names[]`; a singular field would be ambiguous for multi-query calls.
- The drafted Phase 0 skill edit was already present in `.claude/skills/character-generation/references/phase-0-normalize-brief.md`; this ticket verified it instead of rewriting the file.
- The drafted `pnpm --filter world-mcp` and `pnpm turbo test` commands were replaced with the package-local `npm run build`, targeted compiled test, and `npm test` surfaces exposed by `tools/world-mcp/package.json`.
- Verification rebuilt ignored package artifacts under `tools/world-mcp/dist/`; `tools/world-mcp/node_modules/` and `tools/world-mcp/.secret` were pre-existing ignored artifacts.
