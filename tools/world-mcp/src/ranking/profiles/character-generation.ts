import type { RankingWeights } from "../policy";
import { defaultRankingProfile } from "./default";

export const characterGenerationRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  edge_type_boost: {
    mentions_entity: 12,
    firewall_for: 9
  }
};
