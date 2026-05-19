import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, fail, isActiveAtEmotionPage, isOrientationTargetAccessibleToHolder, orientationRecordIds, resolveRecord } from "./stemo-utils.js";

const VALIDATOR = "stemo_orientation_records_exist";

export const stemoOrientationRecordsExist = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const recordId of orientationRecordIds(emotion)) {
    const target = resolveRecord(emotion, recordId, maps);
    if (target === undefined) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_orientation_records_exist.missing_orientation_record", `orientation.toward_records entry ${recordId} must resolve to a known record.`));
      continue;
    }
    if (!isOrientationTargetAccessibleToHolder(target, emotionField(emotion, "holder"))) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_orientation_records_active.inaccessible_target", `orientation.toward_records entry ${recordId} must be accessible to the STEMO holder.`));
    }
    if (!isActiveAtEmotionPage(emotion, recordId, maps) && !isBelievedFalseTarget(target)) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_orientation_records_active.inactive_target", `orientation.toward_records entry ${recordId} must be active at the STEMO created_at_page.`));
    }
  }
  return verdicts;
});

function isBelievedFalseTarget(target: { node_type: string; parsed: unknown }): boolean {
  return target.node_type === "belief_record" &&
    typeof target.parsed === "object" &&
    target.parsed !== null &&
    "truth_relation" in target.parsed &&
    target.parsed.truth_relation === "false";
}
