import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { baseEnvelope, createTestWorld, assertOpError, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageTickPressureClock } from "../../src/ops/tick-pressure-clock.js";

test("tick_pressure_clock increments value and appends tick history", async (t) => {
  const world = createTestWorld(t);
  seedClock(world);
  const env = baseEnvelope();
  const op = {
    op: "tick_pressure_clock",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_clock_id: "CLK-1",
      event: "SE-2",
      delta: 2,
      cause: "A witness reports the hidden ledger."
    }
  } satisfies Extract<PatchOperation, { op: "tick_pressure_clock" }>;

  const staged = await stageTickPressureClock(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as Record<string, unknown>;

  assert.equal(parsed.value, 3);
  assert.deepEqual(parsed.tick_history, [
    { event: "SE-1", delta: 1, cause: "Initial patrol." },
    { event: "SE-2", delta: 2, cause: "A witness reports the hidden ledger." }
  ]);
});

test("tick_pressure_clock rejects out-of-range deltas", async (t) => {
  const world = createTestWorld(t);
  seedClock(world);
  const env = baseEnvelope();
  const op = {
    op: "tick_pressure_clock",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_clock_id: "CLK-1",
      event: "SE-2",
      delta: 5,
      cause: "Too much pressure."
    }
  } satisfies Extract<PatchOperation, { op: "tick_pressure_clock" }>;

  await assertOpError(() => stageTickPressureClock(env, op, world.ctx), "field_path_invalid");
});

function seedClock(world: ReturnType<typeof createTestWorld>): void {
  seedRecord(
    world,
    "harbor-ledgers:CLK-1",
    "pressure_clock_record",
    "stories/harbor-ledgers/_source/clocks/CLK-1.yaml",
    {
      id: "CLK-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      title: "Harbor patrol alert",
      clock_kind: "exposure",
      driver: "group:harbor watch",
      linked_records: ["THR-1"],
      value: 1,
      max: 4,
      salience: "medium",
      visibility: "factional",
      thresholds: [],
      tick_history: [{ event: "SE-1", delta: 1, cause: "Initial patrol." }],
      status: "active"
    },
    "harbor-ledgers"
  );
}
