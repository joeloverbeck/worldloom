import type { RankingWeights } from "../policy";

export const defaultRankingProfile: RankingWeights = {
  heading_path_match: 50,
  graph_distance_from_seed: 40,
  file_class_priority: {
    invariant: 1.0,
    mystery_reserve_entry: 0.9,
    canon_fact_record: 0.75,
    change_log_entry: 0.65,
    domain_file: 0.5,
    open_question_entry: 0.35,
    scoped_reference: 0
  },
  fts5_bm25_score_normalized: 15,
  semantic_similarity: 5,
  recency_of_modification_bonus: 10,
  locality_authority_bonus: 15,
  locality_structured_edge_bonus: 3,
  locality_scoped_name_bonus: 2
};
