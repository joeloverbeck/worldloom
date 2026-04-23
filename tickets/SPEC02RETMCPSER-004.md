# SPEC02RETMCPSER-004: Ranking policy + task-type profiles

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/ranking/policy.ts` and `src/ranking/profiles/{canon-addition,character-generation,continuity-audit,default}.ts`.
**Deps**: SPEC02RETMCPSER-001, SPEC02RETMCPSER-002

## Problem

SPEC-02's retrieval guarantee is "exact-match-first": any node with an exact id or exact entity match must outrank any node without, regardless of how well the non-exact node scores on heading-path, graph-distance, file-class priority, FTS5, semantic similarity, or recency. The reassessed spec enforces this via **lexicographic sort bands** (Band E1 exact-id → Band E2 exact-entity → Band W weighted score), with weights operating only within Band W. Per-task-type profiles (`canon_addition`, `character_generation`, `continuity_audit`, `default`) override weights within Band W — most visibly, `character_generation` lifts the Mystery Reserve `firewall_for` edge weight so MR firewalls are always surfaced to the character-author. Without this ranking module, every tool that returns ranked results (`search_nodes`, `get_context_packet` for seed ordering, `find_impacted_fragments`) would re-invent the sort order and drift.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/ranking/` target directory is created as `.gitkeep` placeholder by SPEC02RETMCPSER-001; this ticket populates it with real modules. `SPEC02RETMCPSER-002`'s public types entry on world-index gives this module typed access to `NodeType`, `EdgeType`, `NODE_TYPES`, `EDGE_TYPES` — every profile uses at least `NodeType` for the `file_class_priority` lookup.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Retrieval policy (lines 134–156) is the authoritative source for the lexicographic sort bands, the weighted-score formula, and the per-task-type override semantics. §Tool surface Tool 1 line 64 names the profile invocation shape. `archive/specs/SPEC-01-world-index.md` §Edge types (lines 215–237) confirms `firewall_for` is an indexed edge (MR entry → CF) available to the `character_generation` profile.
4. FOUNDATIONS principle under audit: **Rule 7 Preserve Mystery Deliberately**. The `character_generation` profile pushes `firewall_for` edge weight higher so MR firewalls surface when ranking nodes for a character-generation context packet. This ticket does not **enforce** the firewall (enforcement is in SPEC-04 validators) — it ensures the firewall is **visible** to the caller skill. A profile that silently de-weights `firewall_for` would weaken Rule 7.

## Architecture Check

1. Lexicographic sort bands are cleaner than any weighted-sum reformulation because the reassessed spec proved (I6 in the reassessment report) that no weighted sum can enforce "exact-match always wins" — the arithmetic ceiling of non-exact scores exceeds the floor of exact-match-only scores under any plausible weight distribution. Modeling the guarantee as a primary sort key (band) with weights as secondary (within-band tie-break) is the only shape that keeps the guarantee invariant under weight adjustment.
2. Per-task-type profiles as simple objects (not classes) are cleaner than a profile-class hierarchy — every profile is a flat record of weight overrides plus optional per-edge-type boosts. No inheritance, no mutable state.
3. No backwards-compatibility aliasing/shims — new module.

## Verification Layers

1. Exact-match-first guarantee (Band E1 > E2 > W) → unit test constructs two candidates, one with `exact_id_match = 1` and zero on every other dimension, one with zero exact match but maximum score on every weighted dimension; asserts the first ranks before the second regardless of profile.
2. Within-Band-W weight order → unit test constructs two non-exact candidates differing only in one weighted dimension (e.g., heading_path_match = 1 vs. 0); asserts the higher-scoring one wins.
3. Profile override → unit test uses the `canon_addition` profile and confirms it lifts `file_class_priority` for CF / CH / INVARIANTS / MR nodes above the `default` profile's baseline.
4. Rule 7 (Mystery Reserve firewall preservation) → unit test uses the `character_generation` profile and asserts `firewall_for` edges have strictly positive weight; a negative or zero weight on `firewall_for` is a test failure. Grep-proof: `grep -n "firewall_for" src/ranking/profiles/character-generation.ts` returns at least one match with a positive literal.
5. Profile exhaustiveness → TypeScript-level check: every `task_type` value in the spec's §Tool surface Tool 4 enum (`canon_addition` | `character_generation` | `diegetic_artifact_generation` | `continuity_audit` | `other`) has a corresponding profile file. Missing profiles resolve to `default`.

## What to Change

### 1. `tools/world-mcp/src/ranking/policy.ts`

Declare:

```typescript
export interface RankingCandidate {
  node_id: string;
  node_type: NodeType;
  file_path: string;
  exact_id_match: 0 | 1;
  exact_entity_match_in_target_field: 0 | 1;
  heading_path_match: number;        // 0..1
  graph_distance_from_seed: number;  // hops; 0 if seed
  fts5_bm25_score: number;           // normalized 0..1
  semantic_similarity: number;       // 0..1; always 0 in Phase 1
  recency_of_modification_bonus: number; // 0..1
  edge_types_to_candidate: EdgeType[]; // for profile edge weighting
}

export interface RankingWeights {
  heading_path_match: number;
  graph_distance_from_seed: number;
  file_class_priority: Partial<Record<NodeType, number>>; // per-node-type priority
  fts5_bm25_score_normalized: number;
  semantic_similarity: number;
  recency_of_modification_bonus: number;
  edge_type_boost?: Partial<Record<EdgeType, number>>; // profile-specific
}

export function rankCandidates(
  candidates: RankingCandidate[],
  weights: RankingWeights,
): RankingCandidate[] {
  // 1. Partition into bands
  const bandE1 = candidates.filter(c => c.exact_id_match === 1);
  const bandE2 = candidates.filter(c => c.exact_id_match === 0 && c.exact_entity_match_in_target_field === 1);
  const bandW  = candidates.filter(c => c.exact_id_match === 0 && c.exact_entity_match_in_target_field === 0);

  // 2. Within each band, sort by weighted score desc
  const sortByScore = (arr: RankingCandidate[]) =>
    arr.sort((a, b) => computeWeightedScore(b, weights) - computeWeightedScore(a, weights));

  return [...sortByScore(bandE1), ...sortByScore(bandE2), ...sortByScore(bandW)];
}

function computeWeightedScore(c: RankingCandidate, w: RankingWeights): number {
  const fileClass = w.file_class_priority[c.node_type] ?? 0;
  const edgeBoost = (c.edge_types_to_candidate ?? []).reduce(
    (sum, et) => sum + (w.edge_type_boost?.[et] ?? 0), 0);
  return (
    w.heading_path_match * c.heading_path_match +
    w.graph_distance_from_seed * (1 / (c.graph_distance_from_seed + 1)) +
    25 * fileClass +
    w.fts5_bm25_score_normalized * c.fts5_bm25_score +
    w.semantic_similarity * c.semantic_similarity +
    w.recency_of_modification_bonus * c.recency_of_modification_bonus +
    edgeBoost
  );
}
```

Default weight literals in `src/ranking/profiles/default.ts` match spec §Retrieval policy formula coefficients (50, 40, 25, 15, 5, 10).

### 2. Profile files

- `src/ranking/profiles/default.ts` — the baseline weights from the spec formula.
- `src/ranking/profiles/canon-addition.ts` — lifts `file_class_priority` for CF (`canon_fact_record`), CH (`change_log_entry`), `invariant`, `mystery_reserve_entry`; all other weights inherit from default.
- `src/ranking/profiles/character-generation.ts` — lifts `edge_type_boost` for `mentions_entity` and `firewall_for`; Rule 7 preservation via positive `firewall_for` weight.
- `src/ranking/profiles/continuity-audit.ts` — lifts recency weight and `modified_by` + `patched_by` edge boosts so recent retcons and attribution trails surface.
- `src/ranking/profiles/index.ts` — profile-name → `RankingWeights` lookup (`canon_addition`, `character_generation`, `diegetic_artifact_generation` (can reuse `default` initially), `continuity_audit`, `other` → `default`). `task_type` values use snake_case per spec §Tool surface Tool 4 line 129.

### 3. Tests

- `tests/ranking/exact-match-ordering.test.ts` — exhaustive band-precedence tests.
- `tests/ranking/profile-overrides.test.ts` — per-profile weight-override correctness.
- `tests/ranking/mr-firewall-preservation.test.ts` — Rule-7 proof for `character_generation` profile.

## Files to Touch

- `tools/world-mcp/src/ranking/policy.ts` (new)
- `tools/world-mcp/src/ranking/profiles/default.ts` (new)
- `tools/world-mcp/src/ranking/profiles/canon-addition.ts` (new)
- `tools/world-mcp/src/ranking/profiles/character-generation.ts` (new)
- `tools/world-mcp/src/ranking/profiles/continuity-audit.ts` (new)
- `tools/world-mcp/src/ranking/profiles/index.ts` (new)
- `tools/world-mcp/tests/ranking/exact-match-ordering.test.ts` (new)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (new)
- `tools/world-mcp/tests/ranking/mr-firewall-preservation.test.ts` (new)

## Out of Scope

- Semantic similarity scoring — `semantic_similarity` input stays at 0 in Phase 1 per spec §Out of Scope line 331 and §Retrieval policy weighted-score formula.
- Wiring ranking into the individual tools — `search_nodes` / `find_impacted_fragments` / `get_context_packet` consume this module in SPEC02RETMCPSER-005, -006, -007.
- Validator enforcement of Rule 7 at canon-commit time — enforcement lives in SPEC-04 validators; this ticket only ensures MR firewalls are **visible** via ranking.
- Configuration file for weight tuning — spec §Risks line 327 flags tuning as Phase 1 open question; defaults are hand-tuned here, no external config yet.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all new ranking tests pass.
2. `tests/ranking/exact-match-ordering.test.ts`: exact-id-match candidate at E1 with 0 weighted score ranks above a non-exact candidate at maximum weighted score.
3. `tests/ranking/mr-firewall-preservation.test.ts`: under `character_generation` profile, `firewall_for` edge boost is strictly positive; grep `character-generation.ts` for `firewall_for` and confirm positive literal.
4. `tests/ranking/profile-overrides.test.ts`: `canon_addition` profile's CF weight > `default` CF weight.

### Invariants

1. Exact-match-first guarantee: for all `w: RankingWeights` and all non-empty inputs, `rankCandidates(xs, w)` places every Band-E1 candidate before every Band-E2 candidate, and every Band-E2 candidate before every Band-W candidate.
2. Rule 7 invariant: every shipped profile's `edge_type_boost.firewall_for` is either absent (inherits default ≥ 0) or strictly ≥ 0. Negative `firewall_for` weight is forbidden.
3. Profile lookup is total for every `task_type` value in the spec's enum (`canon_addition`, `character_generation`, `diegetic_artifact_generation`, `continuity_audit`, `other`); unknown values fall back to `default`, and `profiles/index.ts` documents the fallback.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/exact-match-ordering.test.ts` — 4+ scenarios covering pure-exact-id, pure-exact-entity, maxed-weighted-no-exact, tie-breaking within a band.
2. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — 3 scenarios (canon_addition, character_generation, continuity_audit) comparing per-profile deltas against `default`.
3. `tools/world-mcp/tests/ranking/mr-firewall-preservation.test.ts` — Rule-7 assertion with a grep-style positive-literal check.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/ranking/*.test.js`
2. Rule-7 grep-proof: `grep -nE "firewall_for" tools/world-mcp/src/ranking/profiles/character-generation.ts` returns ≥ 1 match with a positive literal.
3. `cd tools/world-mcp && npm test` (full suite, confirms no regression).
