# SPEC12SKIRELRET-007: Ranking redesign (5 bands + locality bonuses)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/ranking/policy.ts` `RankingCandidate` signals + `getCandidateBand` band model; updates `sqlToCandidates` in `_shared.ts`; adds locality-bonus weights to ranking profiles.
**Deps**: SPEC12SKIRELRET-002, SPEC12SKIRELRET-003

## Problem

Per SPEC-12 D5, the current 3-band ranking model (`exact_id_match` / `exact_entity_match_in_target_field` / lexical) collapses structured-edge and scoped-reference matches into the lexical fallback band. The observed production failure — `search_nodes("Melissa Threadscar")` ranking `DA-0002` ahead of Melissa's authority-bearing character record — is this gap made concrete. This ticket replaces the model with the 5-band trust-tier ordering (`exact_id` → `exact_canonical_entity` → `exact_structured_record_edge` → `exact_scoped_reference` → `weighted_lexical`) and adds locality bonuses within band 5 for authority-bearing hits and seed-linked nodes, so primary authority records outrank merely related lexical hits.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/ranking/policy.ts:3-15` defines `RankingCandidate` with `exact_id_match` and `exact_entity_match_in_target_field` as the exact-match signals. `getCandidateBand` at lines 32-42 returns bands `2 / 1 / 0`. `sqlToCandidates` at `tools/world-mcp/src/tools/_shared.ts:193-215` populates these from SQL columns surfaced by `search_nodes` and `get_context_packet`.
2. SPEC-12 D5 adds two new `0 | 1` signals on `RankingCandidate`: `exact_structured_record_edge_match` and `exact_scoped_reference_match`. New band model: `exact_id` (band 4) > `canonical_entity` (band 3) > `structured_record_edge` (band 2) > `scoped_reference` (band 1) > `lexical` (band 0). Higher number = higher priority preserves the existing `compareRankedCandidates` comparator shape.
3. Cross-package contract under audit: `RankingCandidate` is a public interface exported from `tools/world-mcp`. Ticket 006 surfaces the new signal columns in `search_nodes` SQL; this ticket consumes them via `sqlToCandidates`. Any future consumer instantiating `RankingCandidate` directly must populate the two new required fields — the typecheck is the enforcement.
4. Extends existing output schema (`RankingCandidate`): the two new fields are REQUIRED `0 | 1` signals, not optional. Existing call sites surface them through `sqlToCandidates` in this ticket; no production call site constructs `RankingCandidate` manually (verified: only test fixtures do so).

## Architecture Check

1. Keeping band priority as a numeric return value preserves `compareRankedCandidates`'s existing shape (`bandDelta` math unchanged).
2. Locality bonuses within band 0 (lexical fallback) as weighted signals, not their own band, is cleaner — bonuses modulate lexical scores; they do not promote lexical hits into higher exact-match bands.
3. Default profile adds modest positive weights for locality bonuses (`locality_authority_bonus`, `locality_structured_edge_bonus`, `locality_scoped_name_bonus`) — tune, don't overwhelm the exact-match band ordering.
4. No backwards-compatibility aliasing.

## Verification Layers

1. Query with exact canonical entity match ranks higher than query with only exact structured-edge match -> unit test.
2. Query with exact structured-edge match ranks higher than exact scoped-reference match -> unit test.
3. Query with exact scoped-reference match ranks higher than a pure lexical hit -> unit test.
4. Within band 0: lexical hit on an authority-bearing node ranks higher than lexical hit on a non-authority node -> unit test (locality bonus).
5. Within band 0: lexical hit on a node directly linked to the seed via `references_record` ranks higher than an unlinked lexical hit -> unit test.
6. Existing 2-band → 4-band regression tests (exact_id still wins over canonical, canonical still wins over lexical) still pass -> updated existing tests.

## What to Change

### 1. Extend `RankingCandidate`

In `tools/world-mcp/src/ranking/policy.ts:3-15`, add:

```ts
exact_structured_record_edge_match: 0 | 1;
exact_scoped_reference_match: 0 | 1;
```

### 2. Rewrite `getCandidateBand`

Replace the body at lines 32-42 with:

```ts
if (candidate.exact_id_match === 1) return 4;
if (candidate.exact_entity_match_in_target_field === 1) return 3;
if (candidate.exact_structured_record_edge_match === 1) return 2;
if (candidate.exact_scoped_reference_match === 1) return 1;
return 0;
```

### 3. Extend `sqlToCandidates`

In `tools/world-mcp/src/tools/_shared.ts:193-215`, populate the two new fields from SQL columns surfaced by ticket 006. Pattern parallel to the existing `exact_entity_match_in_target_field` extraction:

```ts
exact_structured_record_edge_match:
  row.exact_structured_record_edge_match === 1 ? 1 : 0,
exact_scoped_reference_match:
  row.exact_scoped_reference_match === 1 ? 1 : 0,
```

Extend `SearchRow` (or equivalent row-shape type) to include the two new `number | null` columns.

### 4. Add locality bonus to band 0

In `computeWeightedScore` in `policy.ts:44-62`, after the existing weighted sum, add:

```ts
// Locality bonus only applies in band 0 (lexical fallback)
const band = getCandidateBand(candidate);
if (band === 0) {
  score += localityBonus(candidate, weights);
}
```

Define `localityBonus`:

```ts
function localityBonus(candidate: RankingCandidate, weights: RankingWeights): number {
  let bonus = 0;
  const authorityBearingNodeTypes: NodeType[] = [
    "character_record",
    "diegetic_artifact_record",
    "canon_fact_record",
    "character_proposal_card",
    "proposal_card",
  ];
  if (authorityBearingNodeTypes.includes(candidate.node_type)) {
    bonus += weights.locality_authority_bonus ?? 0;
  }
  if (candidate.edge_types_to_candidate.includes("references_record")) {
    bonus += weights.locality_structured_edge_bonus ?? 0;
  }
  if (candidate.edge_types_to_candidate.includes("references_scoped_name")) {
    bonus += weights.locality_scoped_name_bonus ?? 0;
  }
  return bonus;
}
```

Add the three bonus weights to `RankingWeights` in `policy.ts:17-25`.

### 5. Update default ranking profile

In `tools/world-mcp/src/ranking/profiles/<default>.ts` (or wherever the default profile lives), add the new bonus weights (recommended defaults: `locality_authority_bonus: 5`, `locality_structured_edge_bonus: 3`, `locality_scoped_name_bonus: 2`). Also add `"scoped_reference"` to `file_class_priority` with value `0` (scoped references surface via ranking bands, not file-class priority).

## Files to Touch

- `tools/world-mcp/src/ranking/policy.ts` (modify)
- `tools/world-mcp/src/ranking/profiles/*.ts` (modify — add bonus weights, add scoped_reference to file_class_priority)
- `tools/world-mcp/src/tools/_shared.ts` (modify `sqlToCandidates`, extend `SearchRow`)
- `tools/world-mcp/tests/ranking/policy.test.ts` (modify)

## Out of Scope

- Semantic-embedding retrieval (explicitly out of scope per SPEC-12 §Out of Scope)
- `match_basis` response field on `SearchNodeResult` (covered by ticket 006)
- Per-task-type ranking profiles (unless already present — tune weights, don't restructure; deferred)
- Signal column SQL in `search-nodes.ts` (surfaced by ticket 006)

## Acceptance Criteria

### Tests That Must Pass

1. `rankCandidates` ordering: `exact_id_match` > `exact_entity_match` > `exact_structured_record_edge_match` > `exact_scoped_reference_match` > lexical_only. All 5 positions respected in a single-ranking test.
2. Within band 0: authority-bearing candidate (`node_type='character_record'`) ranks higher than non-authority candidate with identical lexical score.
3. Within band 0: candidate reachable via `references_record` edge from seed ranks higher than unreachable candidate with identical lexical score.
4. Within band 0: candidate reachable via `references_scoped_name` edge from seed ranks higher than unreachable candidate with identical lexical score.
5. Existing band-ordering regression tests still pass (with updated band numbers 4/3/0 in place of previous 2/1/0).
6. `pnpm --filter @worldloom/world-mcp test tests/ranking/` passes.

### Invariants

1. Band ordering is strictly trust-tier-first: bands dominate lexical weights regardless of score magnitude.
2. `compareRankedCandidates`'s band-delta comparator preserves the higher-number-wins contract.
3. Locality bonuses only apply within band 0; they never promote a lexical match into a higher exact-match band.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/policy.test.ts` — 6+ new cases covering the 5-band ordering + locality bonuses; updates to existing band-ordering tests to match the new 4/3/2/1/0 numbering.

### Commands

1. `pnpm --filter @worldloom/world-mcp test tests/ranking/`
2. `pnpm --filter @worldloom/world-mcp test`
3. `pnpm --filter @worldloom/world-mcp build` (build runs `tsc -p tsconfig.json`, which is the typecheck surface; the `world-mcp` package does not ship a separate `typecheck` script)
