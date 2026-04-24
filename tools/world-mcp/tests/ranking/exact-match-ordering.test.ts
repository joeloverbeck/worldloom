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
    exact_structured_record_edge_match: 0,
    exact_scoped_reference_match: 0,
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

test("5-band ranking preserves exact > canonical > structured > scoped > lexical ordering", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "lexical-only",
        heading_path_match: 1
      }),
      createCandidate({
        node_id: "scoped-reference",
        exact_scoped_reference_match: 1
      }),
      createCandidate({
        node_id: "structured-record-edge",
        exact_structured_record_edge_match: 1
      }),
      createCandidate({
        node_id: "canonical-entity",
        exact_entity_match_in_target_field: 1
      }),
      createCandidate({
        node_id: "exact-id",
        exact_id_match: 1
      })
    ],
    getRankingProfile("default")
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.node_id),
    [
      "exact-id",
      "canonical-entity",
      "structured-record-edge",
      "scoped-reference",
      "lexical-only"
    ]
  );
});

test("Band 2 structured-edge outranks band 1 scoped-reference", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "scoped-reference",
        exact_scoped_reference_match: 1
      }),
      createCandidate({
        node_id: "structured-record-edge",
        exact_structured_record_edge_match: 1
      })
    ],
    getRankingProfile("default")
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.node_id),
    ["structured-record-edge", "scoped-reference"]
  );
});

test("Within band 0, authority-bearing nodes get a locality bonus", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "non-authority",
        node_type: "domain_file",
        heading_path_match: 1
      }),
      createCandidate({
        node_id: "authority-bearing",
        node_type: "character_record",
        heading_path_match: 1
      })
    ],
    getRankingProfile("default")
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.node_id),
    ["authority-bearing", "non-authority"]
  );
});

test("Within band 0, references_record edge locality bonus outranks an otherwise identical candidate", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "unlinked",
        heading_path_match: 1
      }),
      createCandidate({
        node_id: "structured-linked",
        heading_path_match: 1,
        edge_types_to_candidate: ["references_record"]
      })
    ],
    getRankingProfile("default")
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.node_id),
    ["structured-linked", "unlinked"]
  );
});

test("Within band 0, references_scoped_name edge locality bonus outranks an otherwise identical candidate", () => {
  const ranked = rankCandidates(
    [
      createCandidate({
        node_id: "unlinked",
        heading_path_match: 1
      }),
      createCandidate({
        node_id: "scoped-linked",
        heading_path_match: 1,
        edge_types_to_candidate: ["references_scoped_name"]
      })
    ],
    getRankingProfile("default")
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.node_id),
    ["scoped-linked", "unlinked"]
  );
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
