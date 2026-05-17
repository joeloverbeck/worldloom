import type { RankingWeights } from "../policy.js";
import { defaultRankingProfile } from "./default.js";

export const continuityAuditRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  recency_of_modification_bonus: 18,
  edge_type_boost: {
    modified_by: 8,
    patched_by: 6
  }
};
