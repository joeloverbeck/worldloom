import assert from "node:assert/strict";
import test from "node:test";

import type { RankingCandidate } from "../../src/ranking/policy";
import { rankCandidates } from "../../src/ranking/policy";
import { TASK_TYPES, getRankingProfile } from "../../src/ranking/profiles";

function createCandidate(overrides: Partial<RankingCandidate>): RankingCandidate {
  return {
    node_id: "node-default",
    node_type: "domain_file",
    file_path: "worlds/animalia/WORLD_KERNEL.md",
    exact_id_match: 0,
    exact_entity_match_in_target_field: 0,
    heading_path_match: 0,
    graph_distance_from_seed: 4,
    fts5_bm25_score: 0,
    semantic_similarity: 0,
    recency_of_modification_bonus: 0,
    edge_types_to_candidate: [],
    ...overrides
  };
}

test("Band E1 outranks a maximally scored Band W candidate for every shipped task type", () => {
  for (const taskType of TASK_TYPES) {
    const ranked = rankCandidates(
      [
        createCandidate({
          node_id: `weighted-${taskType}`,
          node_type: "invariant",
          heading_path_match: 1,
          graph_distance_from_seed: 0,
          fts5_bm25_score: 1,
          semantic_similarity: 1,
          recency_of_modification_bonus: 1,
          edge_types_to_candidate: ["mentions_entity", "firewall_for", "modified_by", "patched_by"]
        }),
        createCandidate({
          node_id: `exact-${taskType}`,
          exact_id_match: 1
        })
      ],
      getRankingProfile(taskType)
    );

    assert.equal(ranked[0]?.node_id, `exact-${taskType}`);
    assert.equal(ranked[1]?.node_id, `weighted-${taskType}`);
  }
});

test("Band E2 outranks Band W even when the weighted candidate scores higher", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "weighted",
        node_type: "invariant",
        heading_path_match: 1,
        graph_distance_from_seed: 0,
        fts5_bm25_score: 1,
        semantic_similarity: 1,
        recency_of_modification_bonus: 1
      }),
      createCandidate({
        node_id: "entity-match",
        exact_entity_match_in_target_field: 1
      })
    ],
    getRankingProfile("default")
  );

  assert.equal(ranked[0]?.node_id, "entity-match");
  assert.equal(ranked[1]?.node_id, "weighted");
});

test("Within a band, higher weighted score wins", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "lower-score",
        heading_path_match: 0
      }),
      createCandidate({
        node_id: "higher-score",
        heading_path_match: 1
      })
    ],
    getRankingProfile("default")
  );

  assert.equal(ranked[0]?.node_id, "higher-score");
  assert.equal(ranked[1]?.node_id, "lower-score");
});

test("Ties within a band fall back to node_id for deterministic ordering", () => {
  const ranked = rankCandidates(
    [
      createCandidate({ node_id: "node-b" }),
      createCandidate({ node_id: "node-a" })
    ],
    getRankingProfile("default")
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.node_id),
    ["node-a", "node-b"]
  );
});
