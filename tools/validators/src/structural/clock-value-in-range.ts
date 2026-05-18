import type { Verdict } from "../framework/types.js";
import { clockId, defineClockValidator, fail, integerField } from "./clock-utils.js";

const VALIDATOR = "clock_value_in_range";

export const clockValueInRange = defineClockValidator(VALIDATOR, (clock): Verdict[] => {
  const value = integerField(clock, "value");
  const max = integerField(clock, "max");
  const id = clockId(clock);
  const verdicts: Verdict[] = [];

  if (value === null) {
    verdicts.push(fail(clock, VALIDATOR, "clock_value_in_range.value_not_integer", `${id}.value must be an integer.`));
  }
  if (max === null) {
    verdicts.push(fail(clock, VALIDATOR, "clock_value_in_range.max_not_integer", `${id}.max must be an integer.`));
  }
  if (value === null || max === null) {
    return verdicts;
  }
  if (max < 1) {
    verdicts.push(fail(clock, VALIDATOR, "clock_value_in_range.max_too_low", `${id}.max must be at least 1.`, { max }));
  }
  if (value < 0 || value > max) {
    verdicts.push(fail(clock, VALIDATOR, "clock_value_in_range.out_of_range", `${id}.value ${value} must be between 0 and max ${max}.`, { value, max }));
  }
  return verdicts;
});
