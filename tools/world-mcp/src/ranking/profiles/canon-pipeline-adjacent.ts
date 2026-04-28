import type { RankingWeights } from "../policy";
import { defaultRankingProfile } from "./default";

export const proposeNewCanonFactsRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    invariant: 1.25,
    mystery_reserve_entry: 1.15,
    canon_fact_record: 1.2,
    change_log_entry: 0.9,
    domain_file: 0.8,
    section: 0.8,
    named_entity: 0.9
  },
  edge_type_boost: {
    mentions_entity: 8,
    required_world_update: 6,
    firewall_for: 5
  }
};

export const proposeNewCharactersRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    invariant: 1.2,
    mystery_reserve_entry: 1.15,
    canon_fact_record: 1.05,
    character_record: 1.35,
    diegetic_artifact_record: 1.15,
    adjudication_record: 1.1,
    named_entity: 1.25,
    section: 0.75
  },
  edge_type_boost: {
    mentions_entity: 14,
    references_record: 9,
    references_scoped_name: 6,
    firewall_for: 8
  }
};

export const proposeNewWorldsFromPreferencesRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    invariant: 1.35,
    mystery_reserve_entry: 1.3,
    domain_file: 1.05,
    section: 1.05,
    ontology_category: 1.1,
    named_entity: 0.85,
    canon_fact_record: 0.95
  },
  edge_type_boost: {
    mentions_entity: 6,
    firewall_for: 12,
    applies_to: 7,
    pressures: 7
  }
};

export const canonFactsFromDiegeticArtifactsRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    invariant: 1.2,
    mystery_reserve_entry: 1.2,
    canon_fact_record: 1.25,
    diegetic_artifact_record: 1.35,
    character_record: 1.0,
    named_entity: 1.15,
    section: 0.9
  },
  edge_type_boost: {
    references_record: 14,
    references_scoped_name: 10,
    mentions_entity: 10,
    required_world_update: 8,
    firewall_for: 8
  }
};
