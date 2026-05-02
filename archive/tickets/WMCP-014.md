# WMCP-014: `find_named_entities` descriptor hints should include matching record IDs

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/find-named-entities.ts`, `tools/world-mcp/src/server.ts`, `tools/world-mcp/tests/tools/find-named-entities.test.ts`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/character-generation/references/phase-0-normalize-brief.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/references/phase-0-normalize-and-author.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`
**Deps**: `archive/tickets/WMCP-010.md` (`node_type_filter` parameter; this ticket extends the same tool's response shape)

## Problem

At intake, `mcp__worldloom__find_named_entities(world_slug, names)` returned three result classes — `canonical_matches[]`, `surface_matches[]`, `scoped_matches[]` — plus a `hints[]` array for region/era descriptors that appear only inside compound tokens (per `.claude/skills/character-generation/references/phase-0-normalize-brief.md:31`). Those `hints[]` entries carried `descriptor_kind` and `record_count` but NOT the matching record IDs.

In the May 2 character-generation session against `worlds/erotica-world`, `mcp__worldloom__find_named_entities(world_slug='erotica-world', names=[...,'Gros','Centro','Donostia Centro',...])` returned:

```json
{
  "hints": [
    {"query": "Gros", "descriptor_kind": "region", "record_count": 1, "message": "no exact entity match; 'Gros' appears as a region descriptor in 1 record - try search_nodes(world_slug, query='Gros') for content lookup"},
    {"query": "Centro", "descriptor_kind": "region", "record_count": 1, "message": "no exact entity match; 'Centro' appears as a region descriptor in 1 record - try search_nodes(world_slug, query='Centro') for content lookup"},
    {"query": "Donostia Centro", "descriptor_kind": "region", "record_count": 1, "message": "no exact entity match; 'Donostia Centro' appears as a region descriptor in 1 record - try search_nodes(world_slug, query='Donostia Centro') for content lookup"}
  ]
}
```

The hint correctly identifies that `Gros` appears in 1 record but does not name that record. To bind `Gros` to its source SEC record (per Phase 0 region-descriptor binding fallback documented at `.claude/skills/character-generation/references/phase-0-normalize-brief.md:31`), the operator must follow up with `mcp__worldloom__search_nodes(world_slug='erotica-world', query='Gros')` — an extra round-trip that returns a verbose result list (12+ entries in the May 2 session) which the operator then has to filter to the single record referenced in the hint.

The information needed to skip the round-trip is already in the world index: `find_named_entities`'s descriptor-hint construction queries the indexed SEC/TIMELINE node content to compute the descriptor record count. Returning the matching record IDs directly in the hint eliminates the search_nodes follow-up for the canonical Phase 0 region-descriptor binding use case.

## Assumption Reassessment (2026-05-02)

1. `tools/world-mcp/src/tools/find-named-entities.ts` constructs `hints[]` for queries that match no canonical entity but appear in geography or timeline node content. The implementation queries the world index `nodes` table for descriptor occurrences; the `record_count` field counts distinct matching nodes. The matching record IDs are known at hint-construction time because the count derives from the same matched node set, but they were not propagated into the response.
2. Per WMCP-010 line 19, `tools/world-mcp/src/tools/find-named-entities.ts` already exposes `node_type_filter?: NodeType[]` and the tool surface accepts schema extensions cleanly. Adding `matching_record_ids: string[]` to the `hints[]` entry type is parallel-shape additive: existing consumers reading `query`, `descriptor_kind`, `record_count`, and `message` continue to work; new consumers can read `matching_record_ids` to skip the search_nodes round-trip.
3. Cross-artifact boundary: `find_named_entities`'s response is consumed by `character-generation` Phase 0 (region-descriptor binding fallback per `references/phase-0-normalize-brief.md:31`) and `diegetic-artifact-generation` Phase 0 (region/era binding per `references/phase-0-normalize-and-author.md`). Both cited the search_nodes follow-up as the canonical recovery at intake and were updated to use `matching_record_ids` directly when present.
4. FOUNDATIONS principle under audit: §Tooling Recommendation completeness-guarantee surface — the targeted-retrieval pattern (the tool family that includes `find_named_entities`) should minimize round-trips for canonical use cases. The descriptor-binding round-trip is a known operational tax; this ticket eliminates it for the common case.
5. Schema extension audit per `tickets/README.md` Pre-Implementation Check 10: this ticket is additive — `matching_record_ids` is a new field on existing `hints[]` entries. Every hint now carries the field; for broad descriptors it contains the top 10 IDs while `record_count` preserves the uncapped total. Operators fall back to `search_nodes` when the field is absent in an older deployed server, empty, or capped below `record_count`.
6. Pipeline-wide blast radius: live grep found same-seam descriptor-hint guidance in `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/character-generation/references/phase-0-normalize-brief.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/references/phase-0-normalize-and-author.md`, and `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`. Generic `find_named_entities` mentions in other skills do not document the descriptor-hint fallback and are outside this ticket's owned prose update.
7. Bound the response payload: cap `matching_record_ids[]` at 10 IDs per hint via `HINT_MATCHING_RECORD_IDS_CAP`. Beyond 10, the descriptor is broad enough that the search_nodes round-trip with proper ranking is the better tool. The 10-ID cap covers the common case (Phase 0 region/era descriptors typically appear in 1-5 records) without bloating the response when a descriptor matches dozens.

## Architecture Check

1. **Returning matching record IDs in the hint is structurally cleaner than maintaining a separate "descriptor-to-records" tool.** A new tool would create more surface area and force operators to think about which tool to use; an additive field on the existing hint entry preserves the single-call ergonomics of `find_named_entities` for the Phase 0 binding use case.
2. **Capping at 10 IDs is structurally cleaner than returning all matches.** Unbounded ID lists break the response-size predictability the harness ceiling depends on (per WMCP-005 + WMCP-011). Operators who need all matches use `search_nodes` with proper pagination; the hint's purpose is to give the cheap common-case answer without an extra round-trip.
3. No backwards-compatibility aliasing/shims introduced. Existing consumers ignoring `matching_record_ids` continue to work; the `message` field preserves `search_nodes` as the authoritative fallback for broad or capped descriptor matches.

## Verification Layers

1. `hints[]` entries include `matching_record_ids[]` -> codebase grep-proof: the entry type in `tools/world-mcp/src/tools/find-named-entities.ts` declares the new field.
2. Cap at 10 IDs honored -> regression test: a descriptor matching 15 records returns `matching_record_ids` with exactly 10 entries (and `record_count: 15`).
3. Default behavior preserved for unfiltered calls -> regression: existing `find_named_entities` tests continue to pass; new field is additive only.
4. Cross-skill SKILL prose update -> manual review that Phase 0 region-descriptor binding sections cite the new field as the prefer-first path with search_nodes as the fallback for `record_count > 10`.
5. FOUNDATIONS alignment check: §Tooling Recommendation — round-trip count for the canonical Phase 0 binding use case decreases from 2 (find_named_entities + search_nodes) to 1 (find_named_entities alone) for descriptors with `record_count <= 10`.

## Landed Changes

### 1. Extend `hints[]` entry type

`tools/world-mcp/src/tools/find-named-entities.ts` now extends the hint entry interface:

```ts
export interface FindNamedEntityHint {
  query: string;
  descriptor_kind: 'region' | 'era';
  record_count: number;
  matching_record_ids: string[];  // up to 10 IDs ordered by hit-count desc
  message: string;
}
```

### 2. Populated `matching_record_ids` at hint construction

The hint-construction path now queries the index for descriptor occurrences to populate both the uncapped `record_count` and a capped ID list ordered by per-record hit count descending, then `node_id`. The cap is `HINT_MATCHING_RECORD_IDS_CAP = 10`.

### 3. Updated the message text

When `record_count <= 10`, the message is informational only because `matching_record_ids` is the actionable path. When `record_count > 10`, the message names the cap and retains the `search_nodes` recommendation. Example messages:

- `record_count <= 10`: `"'Gros' appears as a region descriptor in 1 record (see matching_record_ids); use get_record(record_id) for full body"`
- `record_count > 10`: `"'Centro' appears as a region descriptor in 47 records; matching_record_ids capped at 10; use search_nodes(world_slug, query='Centro') for full ranked list"`

### 4. Documented the new field

- `tools/world-mcp/README.md` — `find_named_entities` tool docs add `matching_record_ids` to the hint entry shape.
- `tools/world-mcp/src/server.ts` — `describe_capabilities` / server registration prose now says descriptor hints include capped `matching_record_ids`.
- `docs/MACHINE-FACING-LAYER.md` — parallel addition.
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md:31` — region-descriptor binding fallback updated to reference `matching_record_ids` first, with `search_nodes` as the fallback when the field is empty (e.g., `record_count > 10`).
- `.claude/skills/character-generation/references/world-state-prerequisites.md` — seed-node fallback updated in parallel so descriptor hints can seed packets without a `search_nodes` round-trip when record IDs are present.
- `.claude/skills/diegetic-artifact-generation/references/phase-0-normalize-and-author.md` — parallel addition for the era-descriptor case.
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` — seed-node fallback updated in parallel.

## Files to Touch

- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — extend hint entry type, populate at construction)
- `tools/world-mcp/src/server.ts` (modify — capability description)
- `tools/world-mcp/tests/tools/find-named-entities.test.ts` (modify — assertions on `matching_record_ids` and the cap)
- `tools/world-mcp/README.md` (modify — tool docs)
- `docs/MACHINE-FACING-LAYER.md` (modify — tool inventory)
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (modify — region-descriptor binding fallback)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — region/era descriptor seed-node fallback)
- `.claude/skills/diegetic-artifact-generation/references/phase-0-normalize-and-author.md` (modify — era-descriptor binding parallel)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify — region/era descriptor seed-node fallback)

## Out of Scope

- Adding a per-call cap parameter (the constant is sufficient; per-call override invites consumers to opt into unbounded responses).
- Including `matching_record_ids` for `canonical_matches[]` or `surface_matches[]` (those entries already carry per-node-type mention counts; the operator can call `search_nodes` for full IDs if needed; the hint is the only entry shape lacking actionable IDs at intake).
- Streaming responses for very-broad descriptors (out of scope; the cap + search_nodes fallback covers the case).
- Changing the descriptor-detection heuristic (compound-token detection remains as-is).

## Acceptance Criteria

### Tests That Passed

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/find-named-entities.test.js` — PASS; proves `hints[]` entries include `matching_record_ids[]`, the cap is honored, and the message text reflects the cap state.
2. `cd tools/world-mcp && npm test` — PASS; full package suite passed after rebuilding `dist/`.

### Invariants

1. Every `hints[]` entry has a `matching_record_ids: string[]` field; entries with `record_count <= HINT_MATCHING_RECORD_IDS_CAP` populate it fully, entries above the cap populate it with the top 10 by hit count.
2. `record_count` continues to reflect the true total occurrence count (not the capped list length) for accurate operator decision-making.
3. Existing consumers reading `query`, `descriptor_kind`, `record_count`, `message` continue to work without modification.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-named-entities.test.ts` — added cases: (a) descriptor with `record_count == 1` returns `matching_record_ids` with the single ID; (b) descriptor with `record_count == 10` returns all 10 IDs; (c) descriptor with `record_count == 15` returns 10 IDs (capped) and message references the cap; (d) descriptor with `record_count == 0` is not surfaced (existing behavior); (e) regression: unfiltered call response shape unchanged for `canonical_matches[]` and `surface_matches[]`.

### Commands

1. `cd tools/world-mcp && npm test` — full package proof.
2. `cd tools/world-mcp && node --test dist/tests/tools/find-named-entities.test.js` — targeted verification of the new field.

## Outcome

Completion date: 2026-05-02.

`find_named_entities` descriptor hints now include `matching_record_ids: string[]`. The handler keeps `record_count` as the uncapped total, returns up to 10 source record IDs ordered by descriptor hit count and node id, and switches hint messages to `get_record` for fully covered descriptor sets or `search_nodes` for capped broad descriptors. The public capability description, package docs, repo machine-facing docs, and Phase 0 character/diegetic-artifact guidance now prefer `matching_record_ids` before the `search_nodes` fallback.

## Verification Result

- `cd tools/world-mcp && npm run build` — PASS.
- `cd tools/world-mcp && node --test dist/tests/tools/find-named-entities.test.js` — PASS after the era-article message bug exposed by the direct compiled diagnostic was fixed.
- `cd tools/world-mcp && npm test` — PASS; 266 passing tests, 0 failures.
- Stale descriptor-fallback sweep across `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/character-generation`, `.claude/skills/diegetic-artifact-generation`, `tools/world-mcp/src`, and `tools/world-mcp/tests` found only intentional fallback guidance for capped/empty `matching_record_ids`, plus the broad-descriptor test assertion.
- FOUNDATIONS §Tooling Recommendation remains aligned: common Phase 0 descriptor binding can use `find_named_entities` plus `get_record` on returned IDs instead of requiring a separate `search_nodes` lookup.

## Deviations

- Reassessment added `tools/world-mcp/src/server.ts` and both `world-state-prerequisites.md` files to the owned file set because live same-seam capability metadata and seed-node guidance also documented the descriptor-hint fallback.
- No direct external `mcp__worldloom__find_named_entities` smoke was recorded after the source change because the active session does not prove a rebuilt/restarted external MCP server. Package-local handler tests and the full compiled package suite are the truthful proof surface.
- `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were pre-existing ignored package artifacts before verification and remained ignored/generated artifacts after build/test.
