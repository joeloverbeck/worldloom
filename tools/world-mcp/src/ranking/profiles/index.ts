import type { RankingWeights } from "../policy.js";
import {
  branchingStoryHealthAuditRankingProfile,
  canonFactsFromDiegeticArtifactsRankingProfile,
  emergentPressureEventsRankingProfile,
  proposeNewCanonFactsRankingProfile,
  proposeNewCharactersRankingProfile,
  proposeNewWorldsFromPreferencesRankingProfile,
  storyBootstrapRankingProfile,
  storyFactPromotionToCanonRankingProfile,
  storyTurnCycleRankingProfile,
  commitmentBlockAuthoringRankingProfile
} from "./canon-pipeline-adjacent.js";
import { canonAdditionRankingProfile } from "./canon-addition.js";
import { characterGenerationRankingProfile } from "./character-generation.js";
import { continuityAuditRankingProfile } from "./continuity-audit.js";
import { defaultRankingProfile } from "./default.js";

export const TASK_TYPES = [
  "canon_addition",
  "character_generation",
  "diegetic_artifact_generation",
  "continuity_audit",
  "propose_new_canon_facts",
  "propose_new_characters",
  "propose_new_worlds_from_preferences",
  "canon_facts_from_diegetic_artifacts",
  "emergent_pressure_events",
  "story_bootstrap",
  "story_turn_cycle",
  "commitment_block_authoring",
  "branching_story_health_audit",
  "story_fact_promotion_to_canon",
  "other"
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const rankingProfilesByTaskType: Record<TaskType, RankingWeights> = {
  canon_addition: canonAdditionRankingProfile,
  character_generation: characterGenerationRankingProfile,
  diegetic_artifact_generation: defaultRankingProfile,
  continuity_audit: continuityAuditRankingProfile,
  propose_new_canon_facts: proposeNewCanonFactsRankingProfile,
  propose_new_characters: proposeNewCharactersRankingProfile,
  propose_new_worlds_from_preferences: proposeNewWorldsFromPreferencesRankingProfile,
  canon_facts_from_diegetic_artifacts: canonFactsFromDiegeticArtifactsRankingProfile,
  emergent_pressure_events: emergentPressureEventsRankingProfile,
  story_bootstrap: storyBootstrapRankingProfile,
  story_turn_cycle: storyTurnCycleRankingProfile,
  commitment_block_authoring: commitmentBlockAuthoringRankingProfile,
  branching_story_health_audit: branchingStoryHealthAuditRankingProfile,
  story_fact_promotion_to_canon: storyFactPromotionToCanonRankingProfile,
  other: defaultRankingProfile
};

export const DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE: Record<TaskType, number> = {
  canon_addition: 16000,
  character_generation: 8000,
  diegetic_artifact_generation: 8000,
  continuity_audit: 8000,
  propose_new_canon_facts: 15000,
  propose_new_characters: 15000,
  propose_new_worlds_from_preferences: 12000,
  canon_facts_from_diegetic_artifacts: 12000,
  emergent_pressure_events: 15000,
  story_bootstrap: 18000,
  story_turn_cycle: 18000,
  commitment_block_authoring: 18000,
  branching_story_health_audit: 12000,
  story_fact_promotion_to_canon: 8000,
  other: 8000
};

export function getRankingProfile(taskType: string): RankingWeights {
  return rankingProfilesByTaskType[taskType as TaskType] ?? defaultRankingProfile;
}

export {
  branchingStoryHealthAuditRankingProfile,
  canonFactsFromDiegeticArtifactsRankingProfile,
  canonAdditionRankingProfile,
  characterGenerationRankingProfile,
  continuityAuditRankingProfile,
  defaultRankingProfile,
  emergentPressureEventsRankingProfile,
  proposeNewCanonFactsRankingProfile,
  proposeNewCharactersRankingProfile,
  proposeNewWorldsFromPreferencesRankingProfile,
  storyBootstrapRankingProfile,
  storyFactPromotionToCanonRankingProfile,
  storyTurnCycleRankingProfile,
  commitmentBlockAuthoringRankingProfile
};
