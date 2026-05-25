import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, emotionId, fail, hasTransitionEvent, isActiveBeforeEmotionPage, resolveRecord, statusRequiresTransitionEvent } from "./stemo-utils.js";

const VALIDATOR = "stemo_supersession_lifecycle_valid";

export const stemoSupersessionLifecycleValid = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const verdicts: Verdict[] = [];
  const seen = new Set([emotionId(emotion)]);
  let cursor = emotionField(emotion, "supersedes");
  // The prior must be active in the snapshot IMMEDIATELY BEFORE this emotion's
  // created_at_page — i.e., in the parent page's active_records. The same-page
  // check would conflict with snapshot_replay_equality, which lawfully drops the
  // prior from the new page's active_records via state_delta.supersede.
  if (cursor !== undefined && !isActiveBeforeEmotionPage(emotion, cursor, maps)) {
    verdicts.push(fail(emotion, VALIDATOR, "stemo_supersession_lifecycle_valid.prior_not_active", `supersedes target ${cursor} must be active in the snapshot immediately before created_at_page (parent page's active_records).`));
  }
  while (cursor !== undefined) {
    if (seen.has(cursor)) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_supersession_lifecycle_valid.cycle", `supersedes chain cycles through ${cursor}.`));
      break;
    }
    seen.add(cursor);
    const record = resolveRecord(emotion, cursor, maps);
    if (record?.node_type !== "story_emotion_record") {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_supersession_lifecycle_valid.missing_prior", `supersedes target ${cursor} must resolve to a STEMO record.`));
      break;
    }
    cursor = emotionField(record, "supersedes");
  }
  if (statusRequiresTransitionEvent(emotion) && !hasTransitionEvent(emotion, maps)) {
    verdicts.push(fail(emotion, VALIDATOR, "stemo_supersession_lifecycle_valid.missing_transition_event", `status ${emotionField(emotion, "status")} requires a closure or transition SE event.`));
  }
  return verdicts;
});
