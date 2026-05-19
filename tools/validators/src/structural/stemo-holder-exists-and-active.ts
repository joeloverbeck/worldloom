import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, fail, isActiveAtEmotionPage, resolveRecord } from "./stemo-utils.js";

const VALIDATOR = "stemo_holder_exists_and_active";

export const stemoHolderExistsAndActive = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const holder = emotionField(emotion, "holder");
  const holderRecord = holder === undefined ? undefined : resolveRecord(emotion, holder, maps);
  if (holderRecord?.node_type !== "story_entity_record") {
    return [fail(emotion, VALIDATOR, "stemo_holder_exists_and_active.missing_holder", `holder ${holder ?? "<missing>"} must resolve to an STENT record.`)];
  }
  if (holder === undefined || !isActiveAtEmotionPage(emotion, holder, maps)) {
    return [fail(emotion, VALIDATOR, "stemo_holder_exists_and_active.inactive_holder", `holder ${holder} must be active at created_at_page.`)];
  }
  return [];
});
