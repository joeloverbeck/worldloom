import assert from "node:assert/strict";
import test from "node:test";

import { clockValueInRange } from "../../src/structural/clock-value-in-range.js";
import { context, record } from "./helpers.js";

test("clock_value_in_range accepts values between zero and max", async () => {
  const verdicts = await clockValueInRange.run(undefined, context([clockRecord({ value: 3, max: 6 })]));
  assert.deepEqual(verdicts, []);
});

test("clock_value_in_range rejects out-of-range values and invalid max", async () => {
  const verdicts = await clockValueInRange.run(undefined, context([
    clockRecord({ id: "CLK-1", value: 7, max: 6 }),
    clockRecord({ id: "CLK-2", value: 0, max: 0 })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "clock_value_in_range.out_of_range"));
  assert.ok(verdicts.some((verdict) => verdict.code === "clock_value_in_range.max_too_low"));
});

function clockRecord(overrides: Record<string, unknown>) {
  const parsed = { id: "CLK-1", value: 2, max: 6, ...overrides };
  return record("pressure_clock_record", `test-story:${parsed.id}`, `stories/test-story/_source/clocks/${parsed.id}.yaml`, parsed);
}
