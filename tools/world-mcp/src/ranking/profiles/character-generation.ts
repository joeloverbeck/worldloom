import type { RankingWeights } from "../policy.js";
import { defaultRankingProfile } from "./default.js";

export const characterGenerationRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  edge_type_boost: {
    mentions_entity: 12,
    firewall_for: 9
  }
};
