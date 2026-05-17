import assert from "node:assert/strict";
import test from "node:test";

import { clockFiringThresholdIntegrity } from "../../src/structural/clock-firing-threshold-integrity.js";
import { context, record } from "./helpers.js";

test("clock_firing_threshold_integrity accepts fired clocks whose tick history crossed the highest threshold", async () => {
  const verdicts = await clockFiringThresholdIntegrity.run(undefined, context([clockRecord({
    value: 6,
    status: "fired",
    thresholds: [{ at: 3 }, { at: 6 }],
    tick_history: [{ event: "SE-1", delta: 2, cause: "A delay." }, { event: "SE-2", delta: 4, cause: "The alarm spreads." }]
  })]));

  assert.deepEqual(verdicts, []);
});

test("clock_firing_threshold_integrity rejects fired clocks without threshold crossing evidence", async () => {
  const verdicts = await clockFiringThresholdIntegrity.run(undefined, context([clockRecord({
    value: 5,
    status: "fired",
    thresholds: [{ at: 6 }],
    tick_history: [{ event: "SE-1", delta: 1, cause: "Small movement." }]
  })]));

  assert.ok(verdicts.some((verdict) => verdict.code === "clock_firing_threshold_integrity.value_below_threshold"));
});

function clockRecord(overrides: Record<string, unknown>) {
  return record("pressure_clock_record", "test-story:CLK-1", "stories/test-story/_source/clocks/CLK-1.yaml", {
    id: "CLK-1",
    value: 2,
    max: 6,
    status: "active",
    thresholds: [],
    tick_history: [],
    ...overrides
  });
}
