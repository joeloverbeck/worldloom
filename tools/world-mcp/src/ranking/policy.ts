import type { EdgeType, NodeType } from "@worldloom/world-index/public/types";

export interface RankingCandidate {
  node_id: string;
  node_type: NodeType;
  file_path: string;
  exact_id_match: 0 | 1;
  exact_entity_match_in_target_field: 0 | 1;
  heading_path_match: number;
  graph_distance_from_seed: number;
  fts5_bm25_score: number;
  semantic_similarity: number;
  recency_of_modification_bonus: number;
  edge_types_to_candidate: readonly EdgeType[];
}

export interface RankingWeights {
  heading_path_match: number;
  graph_distance_from_seed: number;
  file_class_priority: Partial<Record<NodeType, number>>;
  fts5_bm25_score_normalized: number;
  semantic_similarity: number;
  recency_of_modification_bonus: number;
  edge_type_boost?: Partial<Record<EdgeType, number>>;
}

interface RankedCandidate {
  candidate: RankingCandidate;
  score: number;
}

function getCandidateBand(candidate: RankingCandidate): number {
  if (candidate.exact_id_match === 1) {
    return 2;
  }

  if (candidate.exact_entity_match_in_target_field === 1) {
    return 1;
  }

  return 0;
}

export function computeWeightedScore(
  candidate: RankingCandidate,
  weights: RankingWeights
): number {
  const fileClassPriority = weights.file_class_priority[candidate.node_type] ?? 0;
  const edgeBoost = candidate.edge_types_to_candidate.reduce((sum, edgeType) => {
    return sum + (weights.edge_type_boost?.[edgeType] ?? 0);
  }, 0);

  return (
    weights.heading_path_match * candidate.heading_path_match +
    weights.graph_distance_from_seed * (1 / (candidate.graph_distance_from_seed + 1)) +
    25 * fileClassPriority +
    weights.fts5_bm25_score_normalized * candidate.fts5_bm25_score +
    weights.semantic_similarity * candidate.semantic_similarity +
    weights.recency_of_modification_bonus * candidate.recency_of_modification_bonus +
    edgeBoost
  );
}

export function rankCandidates(
  candidates: readonly RankingCandidate[],
  weights: RankingWeights
): RankingCandidate[] {
  const ranked = candidates.map((candidate) => ({
    candidate,
    score: computeWeightedScore(candidate, weights)
  }));

  ranked.sort(compareRankedCandidates);

  return ranked.map(({ candidate }) => candidate);

  function compareRankedCandidates(left: RankedCandidate, right: RankedCandidate): number {
    const bandDelta = getCandidateBand(right.candidate) - getCandidateBand(left.candidate);
    if (bandDelta !== 0) {
      return bandDelta;
    }

    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.candidate.node_id.localeCompare(right.candidate.node_id);
  }
}
