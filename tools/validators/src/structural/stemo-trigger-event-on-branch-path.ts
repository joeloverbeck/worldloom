import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, eventIsOnBranchOrSameEvent, fail, resolveRecord } from "./stemo-utils.js";

const VALIDATOR = "stemo_trigger_event_on_branch_path";

export const stemoTriggerEventOnBranchPath = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const triggerEvent = emotionField(emotion, "trigger_event");
  const record = triggerEvent === undefined ? undefined : resolveRecord(emotion, triggerEvent, maps);
  if (record?.node_type !== "story_event_record") {
    return [fail(emotion, VALIDATOR, "stemo_trigger_event_on_branch_path.missing_trigger_event", `trigger_event ${triggerEvent ?? "<missing>"} must resolve to an SE record.`)];
  }
  if (triggerEvent === undefined || !eventIsOnBranchOrSameEvent(emotion, triggerEvent, maps)) {
    return [fail(emotion, VALIDATOR, "stemo_trigger_event_on_branch_path.off_branch_trigger_event", `trigger_event ${triggerEvent} must be on the branch path to created_at_page or be the same event as created_by_event.`)];
  }
  return [];
});
