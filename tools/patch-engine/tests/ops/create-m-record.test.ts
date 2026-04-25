import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateMRecord } from "../../src/ops/create-m-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, mystery } from "../harness.js";

test("create_m_record stages expected YAML", async (t) => {
  const world = createTestWorld(t);
  const record = mystery("M-99");
  const env = baseEnvelope({ m_ids: ["M-99"] });
  const op = createOp({ op: "create_m_record", target_world: env.target_world, payload: { m_record: record } } satisfies Extract<PatchOperation, { op: "create_m_record" }>);

  const staged = await stageCreateMRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/mystery-reserve/M-99.yaml"));
  assertYamlEquals(staged, record);
});

test("create_m_record rejects invalid id", async (t) => {
  const world = createTestWorld(t);
  const op = createOp({ op: "create_m_record", target_world: world.worldSlug, payload: { m_record: mystery("BAD-99") } } satisfies Extract<PatchOperation, { op: "create_m_record" }>);

  await assertOpError(() => stageCreateMRecord(baseEnvelope({ m_ids: ["BAD-99"] }), op, world.ctx), "invalid_record_id");
});
