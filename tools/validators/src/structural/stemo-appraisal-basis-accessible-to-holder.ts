import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, emotionStringArray, fail, isActiveAtEmotionPage, isRecordAccessibleToHolder, resolveRecord } from "./stemo-utils.js";

const VALIDATOR = "stemo_appraisal_basis_accessible_to_holder";

export const stemoAppraisalBasisAccessibleToHolder = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  if (emotionField(emotion, "status") === "dissociated") {
    return [];
  }
  const holder = emotionField(emotion, "holder");
  const verdicts: Verdict[] = [];
  for (const beliefId of emotionStringArray(emotion, "appraisal_basis")) {
    const belief = resolveRecord(emotion, beliefId, maps);
    if (belief?.node_type !== "belief_record") {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_appraisal_basis_accessible_to_holder.missing_belief", `appraisal_basis entry ${beliefId} must resolve to a BEL record.`));
      continue;
    }
    if (!isActiveAtEmotionPage(emotion, beliefId, maps)) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_appraisal_basis_accessible_to_holder.inactive_belief", `appraisal_basis entry ${beliefId} must be active at created_at_page.`));
    }
    if (holder !== undefined && !isRecordAccessibleToHolder(belief, holder)) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_appraisal_basis_accessible_to_holder.inaccessible_belief", `appraisal_basis entry ${beliefId} must be accessible to holder ${holder}.`));
    }
  }
  return verdicts;
});
