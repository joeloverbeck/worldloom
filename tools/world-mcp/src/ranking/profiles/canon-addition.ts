import type { RankingWeights } from "../policy";
import { defaultRankingProfile } from "./default";

export const canonAdditionRankingProfile: RankingWeights = {
  ...defaultRankingProfile,
  file_class_priority: {
    ...defaultRankingProfile.file_class_priority,
    canon_fact_record: 1.3,
    change_log_entry: 1.15,
    invariant: 1.25,
    mystery_reserve_entry: 1.2
  }
};
