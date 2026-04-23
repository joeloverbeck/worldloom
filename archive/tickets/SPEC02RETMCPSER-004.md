# SPEC02RETMCPSER-004: Ranking policy + task-type profiles

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/ranking/policy.ts` and `tools/world-mcp/src/ranking/profiles/{index,canon-addition,character-generation,continuity-audit,default}.ts`.
**Deps**: SPEC02RETMCPSER-001, SPEC02RETMCPSER-002

## Problem

SPEC-02's retrieval guarantee is "exact-match-first": any node with an exact id or exact entity match must outrank any node without, regardless of how well the non-exact node scores on heading-path, graph-distance, file-class priority, FTS5, semantic similarity, or recency. The reassessed spec enforces this via **lexicographic sort bands** (Band E1 exact-id → Band E2 exact-entity → Band W weighted score), with weights operating only within Band W. Per-task-type profiles (`canon_addition`, `character_generation`, `continuity_audit`, `default`) override weights within Band W — most visibly, `character_generation` lifts the Mystery Reserve `firewall_for` edge weight so MR firewalls are always surfaced to the character-author. Without this ranking module, every tool that returns ranked results (`search_nodes`, `get_context_packet` for seed ordering, `find_impacted_fragments`) would re-invent the sort order and drift.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/ranking/` currently exists only as a `.gitkeep` placeholder from SPEC02RETMCPSER-001; this ticket populates it with real ranking modules. `SPEC02RETMCPSER-002`'s public types entry on world-index gives this module typed access to `NodeType`, `EdgeType`, and the live enum constants.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Retrieval policy is the authoritative source for the lexicographic sort bands, the weighted-score formula, and the per-task-type override semantics.
3. Cross-artifact boundary under audit: `tools/world-mcp/src/ranking/*` is the shared ranking contract that later retrieval tools (`search_nodes`, `get_context_packet`, `find_impacted_fragments`) will consume. This ticket owns the ranking module and authored profile definitions only; it does not wire those consumers yet.
4. FOUNDATIONS principle under audit: **Rule 7 Preserve Mystery Deliberately**. The `character_generation` profile pushes `firewall_for` edge weight higher so MR firewalls surface when ranking nodes for a character-generation context packet. This ticket does not enforce the firewall (enforcement is in SPEC-04 validators) — it ensures the firewall remains visible to the caller skill.
5. Mismatch corrected during reassessment: the drafted verification text implied every `task_type` enum value needed its own profile file. The live spec only names four authored profiles (`default`, `canon_addition`, `character_generation`, `continuity_audit`); `diegetic_artifact_generation` and `other` truthfully map to `default` in `profiles/index.ts`.

## Architecture Check

1. Lexicographic sort bands are cleaner than any weighted-sum reformulation because the reassessed spec proved (I6 in the reassessment report) that no weighted sum can enforce "exact-match always wins" — the arithmetic ceiling of non-exact scores exceeds the floor of exact-match-only scores under any plausible weight distribution. Modeling the guarantee as a primary sort key (band) with weights as secondary (within-band tie-break) is the only shape that keeps the guarantee invariant under weight adjustment.
2. Per-task-type profiles as simple objects (not classes) are cleaner than a profile-class hierarchy — every profile is a flat record of weight overrides plus optional per-edge-type boosts. No inheritance, no mutable state.
3. No backwards-compatibility aliasing/shims — new module.

## Verification Layers

1. Exact-match-first guarantee (Band E1 > E2 > W) → unit test constructs two candidates, one with `exact_id_match = 1` and zero on every other dimension, one with zero exact match but maximum score on every weighted dimension; asserts the first ranks before the second regardless of profile.
2. Within-Band-W weight order → unit test constructs two non-exact candidates differing only in one weighted dimension (e.g., heading_path_match = 1 vs. 0); asserts the higher-scoring one wins.
3. Profile override → unit test uses the `canon_addition` profile and confirms it lifts `file_class_priority` for CF / CH / INVARIANTS / MR nodes above the `default` profile's baseline.
4. Rule 7 (Mystery Reserve firewall preservation) → unit test uses the `character_generation` profile and asserts `firewall_for` edges have strictly positive weight; a negative or zero weight on `firewall_for` is a test failure. Grep-proof: `grep -n "firewall_for" src/ranking/profiles/character-generation.ts` returns at least one match with a positive literal.
5. Profile lookup totality → unit test asserts every `task_type` value in the spec's Tool 4 enum (`canon_addition` | `character_generation` | `diegetic_artifact_generation` | `continuity_audit` | `other`) resolves to a ranking profile, with `diegetic_artifact_generation` and `other` intentionally reusing `default`.

## What to Change

### 1. `tools/world-mcp/src/ranking/policy.ts`

Declare `RankingCandidate` and `RankingWeights`, plus `computeWeightedScore()` and `rankCandidates()`.

The landed implementation keeps the spec's lexicographic band model but does the ordering in one comparator rather than by materializing three arrays. `rankCandidates()` computes a weighted score per candidate, sorts first by exact-match band (E1 before E2 before W), then by weighted score within a band, and finally by `node_id` for deterministic ties. `computeWeightedScore()` applies the spec coefficients, the per-node-type `file_class_priority`, and any profile `edge_type_boost` values.

Default weight literals in `src/ranking/profiles/default.ts` match spec §Retrieval policy formula coefficients (50, 40, 25, 15, 5, 10).

### 2. Profile files

- `src/ranking/profiles/default.ts` — the baseline weights from the spec formula.
- `src/ranking/profiles/canon-addition.ts` — lifts `file_class_priority` for CF (`canon_fact_record`), CH (`change_log_entry`), `invariant`, `mystery_reserve_entry`; all other weights inherit from default.
- `src/ranking/profiles/character-generation.ts` — lifts `edge_type_boost` for `mentions_entity` and `firewall_for`; Rule 7 preservation via positive `firewall_for` weight.
- `src/ranking/profiles/continuity-audit.ts` — lifts recency weight and `modified_by` + `patched_by` edge boosts so recent retcons and attribution trails surface.
- `src/ranking/profiles/index.ts` — profile-name → `RankingWeights` lookup (`canon_addition`, `character_generation`, `continuity_audit`, `diegetic_artifact_generation`, `other`), where `diegetic_artifact_generation` and `other` intentionally resolve to `default`. `task_type` values use snake_case per spec Tool 4.

### 3. Tests

- `tests/ranking/exact-match-ordering.test.ts` — exhaustive band-precedence tests.
- `tests/ranking/profile-overrides.test.ts` — per-profile weight-override correctness.
- `tests/ranking/profile-lookup.test.ts` — total task-type lookup and explicit fallback coverage.
- `tests/ranking/mr-firewall-preservation.test.ts` — Rule-7 proof for `character_generation` profile.

## Files to Touch

- `tickets/SPEC02RETMCPSER-004.md` (modify)
- `tools/world-mcp/src/ranking/policy.ts` (new)
- `tools/world-mcp/src/ranking/profiles/default.ts` (new)
- `tools/world-mcp/src/ranking/profiles/canon-addition.ts` (new)
- `tools/world-mcp/src/ranking/profiles/character-generation.ts` (new)
- `tools/world-mcp/src/ranking/profiles/continuity-audit.ts` (new)
- `tools/world-mcp/src/ranking/profiles/index.ts` (new)
- `tools/world-mcp/tests/ranking/exact-match-ordering.test.ts` (new)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (new)
- `tools/world-mcp/tests/ranking/profile-lookup.test.ts` (new)
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
5. `tests/ranking/profile-lookup.test.ts`: every spec `task_type` resolves, and `diegetic_artifact_generation` plus `other` both fall back to `default`.

### Invariants

1. Exact-match-first guarantee: for all `w: RankingWeights` and all non-empty inputs, `rankCandidates(xs, w)` places every Band-E1 candidate before every Band-E2 candidate, and every Band-E2 candidate before every Band-W candidate.
2. Rule 7 invariant: every shipped profile's `edge_type_boost.firewall_for` is either absent (inherits default ≥ 0) or strictly ≥ 0. Negative `firewall_for` weight is forbidden.
3. Profile lookup is total for every `task_type` value in the spec's enum (`canon_addition`, `character_generation`, `diegetic_artifact_generation`, `continuity_audit`, `other`); `diegetic_artifact_generation` and `other` intentionally reuse `default`, and unknown values fall back to `default`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/exact-match-ordering.test.ts` — 4+ scenarios covering pure-exact-id, pure-exact-entity, maxed-weighted-no-exact, tie-breaking within a band.
2. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — 3 scenarios (canon_addition, character_generation, continuity_audit) comparing per-profile deltas against `default`.
3. `tools/world-mcp/tests/ranking/profile-lookup.test.ts` — proves total task-type resolution and the intentional `default` fallback aliases.
4. `tools/world-mcp/tests/ranking/mr-firewall-preservation.test.ts` — Rule-7 assertion with a grep-style positive-literal check.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/ranking/*.test.js`
2. Rule-7 grep-proof: `grep -nE "firewall_for" tools/world-mcp/src/ranking/profiles/character-generation.ts` returns ≥ 1 match with a positive literal.
3. `cd tools/world-mcp && npm test` (full suite, confirms no regression).

## Outcome

Implemented the shared ranking seam for `tools/world-mcp`: lexicographic exact-match bands in `src/ranking/policy.ts`, authored task-type profiles in `src/ranking/profiles/`, and focused ranking tests covering band ordering, profile overrides, task-type lookup fallback, and Rule 7 firewall visibility.

## Verification Result

1. `cd tools/world-mcp && npm run build && node --test dist/tests/ranking/*.test.js`
2. `grep -nE "firewall_for: [1-9]" tools/world-mcp/src/ranking/profiles/character-generation.ts`
3. `cd tools/world-mcp && npm test`

## Deviations

1. Reassessment narrowed the profile-file contract: the spec's task-type enum still has five values, but only four authored profile modules are required. `diegetic_artifact_generation` and `other` now resolve explicitly to `default` in `profiles/index.ts`, and that fallback is covered by `tests/ranking/profile-lookup.test.ts`.
