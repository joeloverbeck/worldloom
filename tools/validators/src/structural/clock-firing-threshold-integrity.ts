import type { Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue } from "./utils.js";
import { clockId, defineClockValidator, fail, integerField, thresholds, tickHistory } from "./clock-utils.js";

const VALIDATOR = "clock_firing_threshold_integrity";

export const clockFiringThresholdIntegrity = defineClockValidator(VALIDATOR, (clock): Verdict[] => {
  const parsed = asPlainRecord(clock.parsed);
  if (stringValue(parsed.status) !== "fired") {
    return [];
  }

  const id = clockId(clock);
  const value = integerField(clock, "value");
  const highest = thresholds(clock)
    .filter((threshold) => Number.isInteger(threshold.at))
    .map((threshold) => threshold.at)
    .sort((left, right) => left - right)
    .at(-1);

  if (highest === undefined) {
    return [fail(clock, VALIDATOR, "clock_firing_threshold_integrity.no_threshold", `${id}.status is fired but no valid threshold exists.`)];
  }
  if (value === null || value < highest) {
    return [fail(clock, VALIDATOR, "clock_firing_threshold_integrity.value_below_threshold", `${id}.status is fired but value ${value ?? "<invalid>"} is below highest threshold ${highest}.`, { value, highest })];
  }

  const ticks = tickHistory(clock).filter((tick): tick is { delta: number } => typeof tick.delta === "number");
  const startingValue = value - ticks.reduce((sum, tick) => sum + tick.delta, 0);
  let cursor = startingValue;
  for (const tick of ticks) {
    const before = cursor;
    cursor += tick.delta;
    if (before < highest && cursor >= highest) {
      return [];
    }
  }

  return [fail(clock, VALIDATOR, "clock_firing_threshold_integrity.threshold_not_crossed", `${id}.status is fired but tick_history never crosses the highest threshold ${highest}.`, { starting_value: startingValue, highest })];
});
