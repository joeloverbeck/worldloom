import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, fail, orientationRecordIds, resolveRecord } from "./stemo-utils.js";

const VALIDATOR = "stemo_orientation_records_exist";

export const stemoOrientationRecordsExist = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const recordId of orientationRecordIds(emotion)) {
    if (resolveRecord(emotion, recordId, maps) === undefined) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_orientation_records_exist.missing_orientation_record", `orientation.toward_records entry ${recordId} must resolve to a known record.`));
    }
  }
  return verdicts;
});
