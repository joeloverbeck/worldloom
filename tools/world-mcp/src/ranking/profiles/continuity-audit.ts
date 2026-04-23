import type { RankingWeights } from "../policy";
import { defaultRankingProfile } from "./default";

export const continuityAuditRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  recency_of_modification_bonus: 18,
  edge_type_boost: {
    modified_by: 8,
    patched_by: 6
  }
};
