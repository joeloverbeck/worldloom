import type { RankingWeights } from "../policy";
import {
  canonFactsFromDiegeticArtifactsRankingProfile,
  proposeNewCanonFactsRankingProfile,
  proposeNewCharactersRankingProfile,
  proposeNewWorldsFromPreferencesRankingProfile
} from "./canon-pipeline-adjacent";
import { canonAdditionRankingProfile } from "./canon-addition";
import { characterGenerationRankingProfile } from "./character-generation";
import { continuityAuditRankingProfile } from "./continuity-audit";
import { defaultRankingProfile } from "./default";

export const TASK_TYPES = [
  "canon_addition",
  "character_generation",
  "diegetic_artifact_generation",
  "continuity_audit",
  "propose_new_canon_facts",
  "propose_new_characters",
  "propose_new_worlds_from_preferences",
  "canon_facts_from_diegetic_artifacts",
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
  other: 8000
};

export function getRankingProfile(taskType: string): RankingWeights {
  return rankingProfilesByTaskType[taskType as TaskType] ?? defaultRankingProfile;
}

export {
  canonFactsFromDiegeticArtifactsRankingProfile,
  canonAdditionRankingProfile,
  characterGenerationRankingProfile,
  continuityAuditRankingProfile,
  defaultRankingProfile,
  proposeNewCanonFactsRankingProfile,
  proposeNewCharactersRankingProfile,
  proposeNewWorldsFromPreferencesRankingProfile
};
