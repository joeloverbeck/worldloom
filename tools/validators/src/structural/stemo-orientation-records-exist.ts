import type { IndexedRecord, Verdict } from "../framework/types.js";
import {
  activeRecordIdsAt,
  defineStemoValidator,
  emotionField,
  type EmotionMaps,
  fail,
  isActiveAtEmotionPage,
  isOrientationTargetAccessibleToHolder,
  orientationRecordIds,
  recordId,
  resolveRecord
} from "./stemo-utils.js";
import { asPlainRecord, stringValue } from "./utils.js";

const VALIDATOR = "stemo_orientation_records_exist";

export const stemoOrientationRecordsExist = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const recordId of orientationRecordIds(emotion)) {
    const target = resolveRecord(emotion, recordId, maps);
    if (target === undefined) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_orientation_records_exist.missing_orientation_record", `orientation.toward_records entry ${recordId} must resolve to a known record.`));
      continue;
    }
    if (!isOrientationTargetAccessibleToHolder(target, emotionField(emotion, "holder")) && !holderDirectlyObservesTarget(emotion, target, maps)) {
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

function holderDirectlyObservesTarget(
  emotion: IndexedRecord,
  target: IndexedRecord,
  maps: EmotionMaps
): boolean {
  if (target.node_type !== "story_entity_record") {
    return false;
  }

  const holder = emotionField(emotion, "holder");
  const targetId = recordId(target);
  if (holder === undefined || targetId === undefined || !activeRecordIdsAt(emotion, maps).has(holder) || !activeRecordIdsAt(emotion, maps).has(targetId)) {
    return false;
  }

  const holderLocation = activeLocationForEntity(emotion, holder, maps);
  const targetLocation = activeLocationForEntity(emotion, targetId, maps);
  // FOUNDATIONS §6b direct observation requires active co-location, not just a resolvable STENT id.
  return holderLocation !== undefined &&
    targetLocation !== undefined &&
    holderLocation === targetLocation &&
    !["unknown", "concealed", "offstage"].includes(holderLocation);
}

function activeLocationForEntity(
  emotion: IndexedRecord,
  entityId: string,
  maps: EmotionMaps
): string | undefined {
  const activeIds = activeRecordIdsAt(emotion, maps);
  for (const activeId of activeIds) {
    const record = resolveRecord(emotion, activeId, maps);
    if (record?.node_type !== "story_status_record") {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    if (stringValue(parsed.entity) === entityId) {
      return stringValue(parsed.location);
    }
  }
  return undefined;
}
