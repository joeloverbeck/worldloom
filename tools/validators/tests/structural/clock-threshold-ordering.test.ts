import assert from "node:assert/strict";
import test from "node:test";

import { clockThresholdOrdering } from "../../src/structural/clock-threshold-ordering.js";
import { context, record } from "./helpers.js";

test("clock_threshold_ordering accepts strict ascending thresholds within max", async () => {
  const verdicts = await clockThresholdOrdering.run(undefined, context([clockRecord({
    thresholds: [{ at: 1 }, { at: 3 }, { at: 6 }]
  })]));

  assert.deepEqual(verdicts, []);
});

test("clock_threshold_ordering rejects duplicate, out-of-order, and out-of-bounds thresholds", async () => {
  const verdicts = await clockThresholdOrdering.run(undefined, context([clockRecord({
    thresholds: [{ at: 2 }, { at: 2 }, { at: 1 }, { at: 7 }]
  })]));

  assert.ok(verdicts.some((verdict) => verdict.code === "clock_threshold_ordering.not_strictly_ascending"));
  assert.ok(verdicts.some((verdict) => verdict.code === "clock_threshold_ordering.out_of_bounds"));
});

function clockRecord(overrides: Record<string, unknown>) {
  return record("pressure_clock_record", "test-story:CLK-1", "stories/test-story/_source/clocks/CLK-1.yaml", {
    id: "CLK-1",
    value: 2,
    max: 6,
    ...overrides
  });
}
