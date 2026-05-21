import type { RankingWeights } from "../policy.js";
import { defaultRankingProfile } from "./default.js";

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
    narrative_section: 0.8,
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
    section: 0.75,
    narrative_section: 0.75
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
    narrative_section: 1.05,
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
    section: 0.9,
    narrative_section: 0.9
  },
  edge_type_boost: {
    references_record: 14,
    references_scoped_name: 10,
    mentions_entity: 10,
    required_world_update: 8,
    firewall_for: 8
  }
};

export const emergentPressureEventsRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    invariant: 1.35,
    mystery_reserve_entry: 1.35,
    canon_fact_record: 1.3,
    change_log_entry: 1.25,
    section: 1.15,
    narrative_section: 1.15,
    domain_file: 1.0,
    open_question_entry: 0.7,
    named_entity: 0.85
  },
  recency_of_modification_bonus: 18,
  edge_type_boost: {
    mentions_entity: 8,
    references_record: 8,
    required_world_update: 7,
    firewall_for: 12,
    applies_to: 6,
    pressures: 10
  }
};

export const storyBootstrapRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    mystery_reserve_entry: 1.4,
    invariant: 1.35,
    canon_fact_record: 1.25,
    section: 1.15,
    narrative_section: 1.15,
    domain_file: 1.05,
    named_entity: 1.2,
    character_record: 1.15,
    change_log_entry: 0.9
  },
  edge_type_boost: {
    mentions_entity: 12,
    references_record: 10,
    references_scoped_name: 8,
    required_world_update: 7,
    firewall_for: 12,
    applies_to: 8,
    pressures: 6
  }
};

export const storyTurnCycleRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    canon_fact_record: 1.35,
    invariant: 1.3,
    mystery_reserve_entry: 1.25,
    named_entity: 1.25,
    section: 1.1,
    narrative_section: 1.1,
    domain_file: 1.0,
    change_log_entry: 1.05,
    character_record: 0.95
  },
  recency_of_modification_bonus: 14,
  edge_type_boost: {
    mentions_entity: 14,
    references_record: 11,
    references_scoped_name: 9,
    required_world_update: 8,
    firewall_for: 12,
    applies_to: 8,
    pressures: 7
  }
};

export const commitmentBlockAuthoringRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    canon_fact_record: 1.35,
    invariant: 1.3,
    mystery_reserve_entry: 1.3,
    named_entity: 1.3,
    section: 1.1,
    narrative_section: 1.1,
    domain_file: 1.0,
    character_record: 1.0,
    change_log_entry: 0.9
  },
  recency_of_modification_bonus: 12,
  edge_type_boost: {
    mentions_entity: 14,
    references_record: 11,
    references_scoped_name: 10,
    required_world_update: 8,
    firewall_for: 13,
    applies_to: 8,
    pressures: 8
  }
};

export const branchingStoryHealthAuditRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    canon_fact_record: 1.4,
    invariant: 1.3,
    mystery_reserve_entry: 1.3,
    named_entity: 1.25,
    section: 1.05,
    narrative_section: 1.05,
    domain_file: 1.0,
    change_log_entry: 1.15
  },
  recency_of_modification_bonus: 14,
  edge_type_boost: {
    mentions_entity: 14,
    references_record: 11,
    references_scoped_name: 10,
    required_world_update: 8,
    firewall_for: 13,
    applies_to: 8,
    pressures: 8
  }
};

export const storyFactPromotionToCanonRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    canon_fact_record: 1.45,
    invariant: 1.35,
    mystery_reserve_entry: 1.35,
    open_question_entry: 1.2,
    named_entity: 1.25,
    change_log_entry: 1.15,
    section: 1.0,
    narrative_section: 1.0,
    domain_file: 0.95
  },
  recency_of_modification_bonus: 14,
  edge_type_boost: {
    mentions_entity: 14,
    references_record: 12,
    references_scoped_name: 9,
    required_world_update: 10,
    firewall_for: 14,
    applies_to: 9,
    pressures: 8
  }
};

export const storyCharacterProfileRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    character_record: 1.45,
    story_character_authority_record: 1.35,
    story_entity_record: 1.2,
    canon_fact_record: 1.15,
    invariant: 1.15,
    mystery_reserve_entry: 1.1,
    named_entity: 1.15,
    section: 0.95,
    narrative_section: 0.95
  },
  edge_type_boost: {
    mentions_entity: 12,
    references_record: 10,
    references_scoped_name: 8,
    stent_character_authority: 8,
    stchar_source_character: 12,
    stchar_bound_stent: 8,
    stchar_supersedes: 6,
    firewall_for: 8
  }
};
