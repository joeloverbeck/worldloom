import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateChRecord } from "../../src/ops/create-ch-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, changeLog, createOp, createTestWorld, seedRecord } from "../harness.js";

test("create_ch_record stages expected YAML", async (t) => {
  const world = createTestWorld(t);
  const record = changeLog("CH-0099");
  const env = baseEnvelope({ ch_ids: ["CH-0099"] });
  const op = createOp({ op: "create_ch_record", target_world: env.target_world, payload: { ch_record: record } } satisfies Extract<PatchOperation, { op: "create_ch_record" }>);

  const staged = await stageCreateChRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/change-log/CH-0099.yaml"));
  assertYamlEquals(staged, record);
});

test("create_ch_record rejects overwrite and invalid id", async (t) => {
  const world = createTestWorld(t);
  seedRecord(world, "CH-0099", "change_log_entry", "_source/change-log/CH-0099.yaml", changeLog("CH-0099"));
  const existingOp = createOp({ op: "create_ch_record", target_world: world.worldSlug, payload: { ch_record: changeLog("CH-0099") } } satisfies Extract<PatchOperation, { op: "create_ch_record" }>);
  const invalidOp = createOp({ op: "create_ch_record", target_world: world.worldSlug, payload: { ch_record: changeLog("BAD-1") } } satisfies Extract<PatchOperation, { op: "create_ch_record" }>);

  await assertOpError(() => stageCreateChRecord(baseEnvelope({ ch_ids: ["CH-0099"] }), existingOp, world.ctx), "record_already_exists");
  await assertOpError(() => stageCreateChRecord(baseEnvelope({ ch_ids: ["BAD-1"] }), invalidOp, world.ctx), "invalid_record_id");
});
