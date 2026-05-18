import assert from "node:assert/strict";
import test from "node:test";

import { clockTickProvenance } from "../../src/structural/clock-tick-provenance.js";
import { context, record } from "./helpers.js";

test("clock_tick_provenance accepts ticks with same-story SE references, nonzero delta, and cause", async () => {
  const verdicts = await clockTickProvenance.run(undefined, context([
    eventRecord("SE-1"),
    clockRecord({ tick_history: [{ event: "SE-1", delta: 1, cause: "The patrol closes in." }] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("clock_tick_provenance rejects missing events, zero deltas, and empty causes", async () => {
  const verdicts = await clockTickProvenance.run(undefined, context([
    eventRecord("SE-1"),
    clockRecord({
      tick_history: [
        { event: "SE-999", delta: 1, cause: "Unknown event." },
        { event: "SE-1", delta: 0, cause: "No movement." },
        { event: "SE-1", delta: 1, cause: "" }
      ]
    })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "clock_tick_provenance.missing_event"));
  assert.ok(verdicts.some((verdict) => verdict.code === "clock_tick_provenance.invalid_delta"));
  assert.ok(verdicts.some((verdict) => verdict.code === "clock_tick_provenance.empty_cause"));
});

function eventRecord(id: string) {
  return record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, { id });
}

function clockRecord(overrides: Record<string, unknown>) {
  return record("pressure_clock_record", "test-story:CLK-1", "stories/test-story/_source/clocks/CLK-1.yaml", {
    id: "CLK-1",
    value: 2,
    max: 6,
    ...overrides
  });
}
