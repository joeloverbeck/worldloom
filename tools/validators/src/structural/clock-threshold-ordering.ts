import type { Verdict } from "../framework/types.js";
import { clockId, defineClockValidator, fail, integerField, thresholds } from "./clock-utils.js";

const VALIDATOR = "clock_threshold_ordering";

export const clockThresholdOrdering = defineClockValidator(VALIDATOR, (clock): Verdict[] => {
  const max = integerField(clock, "max");
  const id = clockId(clock);
  const values = thresholds(clock);
  const verdicts: Verdict[] = [];
  let previous = 0;

  for (const [index, threshold] of values.entries()) {
    if (!Number.isInteger(threshold.at)) {
      verdicts.push(fail(clock, VALIDATOR, "clock_threshold_ordering.at_not_integer", `${id}.thresholds[${index}].at must be an integer.`, { index, at: threshold.at }));
      continue;
    }
    if (threshold.at <= previous) {
      verdicts.push(fail(clock, VALIDATOR, "clock_threshold_ordering.not_strictly_ascending", `${id}.thresholds[${index}].at must be greater than the previous threshold.`, { index, previous, at: threshold.at }));
    }
    if (threshold.at < 1 || (max !== null && threshold.at > max)) {
      verdicts.push(fail(clock, VALIDATOR, "clock_threshold_ordering.out_of_bounds", `${id}.thresholds[${index}].at must be between 1 and max ${max ?? "<invalid>"}.`, { index, at: threshold.at, max }));
    }
    previous = threshold.at;
  }

  return verdicts;
});
