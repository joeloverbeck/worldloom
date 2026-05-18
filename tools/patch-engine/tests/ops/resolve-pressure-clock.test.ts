import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { baseEnvelope, createTestWorld, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageResolvePressureClock } from "../../src/ops/resolve-pressure-clock.js";

test("resolve_pressure_clock sets status and resolution_event", async (t) => {
  const world = createTestWorld(t);
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
      value: 2,
      max: 4,
      salience: "medium",
      visibility: "factional",
      thresholds: [],
      tick_history: [{ event: "SE-1", delta: 2, cause: "Initial patrol." }],
      status: "active"
    },
    "harbor-ledgers"
  );
  const env = baseEnvelope();
  const op = {
    op: "resolve_pressure_clock",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_clock_id: "CLK-1",
      resolution_event: "SE-3"
    }
  } satisfies Extract<PatchOperation, { op: "resolve_pressure_clock" }>;

  const staged = await stageResolvePressureClock(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as Record<string, unknown>;

  assert.equal(parsed.status, "resolved");
  assert.equal(parsed.resolution_event, "SE-3");
});
