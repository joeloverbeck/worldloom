import type { Context, IndexedRecord, Verdict } from "../framework/types.js";
import { clockId, defineClockValidator, fail, storyKey, tickHistory } from "./clock-utils.js";
import { asPlainRecord, queryRecordsByType, stringValue } from "./utils.js";

const VALIDATOR = "clock_tick_provenance";

export const clockTickProvenance = defineClockValidator(VALIDATOR, async (clock, ctx): Promise<Verdict[]> => {
  const events = await eventsByStory(ctx);
  const ids = events.get(storyKey(clock)) ?? new Set<string>();
  const id = clockId(clock);
  const verdicts: Verdict[] = [];

  for (const [index, tick] of tickHistory(clock).entries()) {
    if (tick.event === undefined || !/^SE-\d+$/.test(tick.event)) {
      verdicts.push(fail(clock, VALIDATOR, "clock_tick_provenance.invalid_event", `${id}.tick_history[${index}].event must be an SE id.`, { index, event: tick.event }));
    } else if (!ids.has(tick.event)) {
      verdicts.push(fail(clock, VALIDATOR, "clock_tick_provenance.missing_event", `${id}.tick_history[${index}].event references missing ${tick.event}.`, { index, event: tick.event }));
    }
    if (tick.delta === undefined || tick.delta === 0) {
      verdicts.push(fail(clock, VALIDATOR, "clock_tick_provenance.invalid_delta", `${id}.tick_history[${index}].delta must be a non-zero integer.`, { index, delta: tick.delta }));
    }
    if (tick.cause === undefined || tick.cause.trim().length === 0) {
      verdicts.push(fail(clock, VALIDATOR, "clock_tick_provenance.empty_cause", `${id}.tick_history[${index}].cause must be non-empty.`, { index }));
    }
  }

  return verdicts;
});

async function eventsByStory(ctx: Context): Promise<Map<string, Set<string>>> {
  const events = await queryRecordsByType(ctx, "story_event_record");
  const byStory = new Map<string, Set<string>>();
  for (const event of events) {
    const key = storyKey(event);
    let ids = byStory.get(key);
    if (ids === undefined) {
      ids = new Set<string>();
      byStory.set(key, ids);
    }
    ids.add(stringValue(asPlainRecord(event.parsed).id) ?? bareStoryId(event));
  }
  return byStory;
}

function bareStoryId(record: IndexedRecord): string {
  const parts = record.node_id.split(":");
  return parts.length > 1 ? parts[parts.length - 1] ?? record.node_id : record.node_id;
}
