import type { RankingWeights } from "../policy";
import { canonAdditionRankingProfile } from "./canon-addition";
import { characterGenerationRankingProfile } from "./character-generation";
import { continuityAuditRankingProfile } from "./continuity-audit";
import { defaultRankingProfile } from "./default";

export const TASK_TYPES = [
  "canon_addition",
  "character_generation",
  "diegetic_artifact_generation",
  "continuity_audit",
  "other"
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const rankingProfilesByTaskType: Record<TaskType, RankingWeights> = {
  canon_addition: canonAdditionRankingProfile,
  character_generation: characterGenerationRankingProfile,
  diegetic_artifact_generation: defaultRankingProfile,
  continuity_audit: continuityAuditRankingProfile,
  other: defaultRankingProfile
};

export function getRankingProfile(taskType: string): RankingWeights {
  return rankingProfilesByTaskType[taskType as TaskType] ?? defaultRankingProfile;
}

export {
  canonAdditionRankingProfile,
  characterGenerationRankingProfile,
  continuityAuditRankingProfile,
  defaultRankingProfile
};
