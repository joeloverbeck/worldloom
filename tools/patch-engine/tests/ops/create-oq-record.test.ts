import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateOqRecord } from "../../src/ops/create-oq-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, openQuestion } from "../harness.js";

test("create_oq_record stages expected YAML", async (t) => {
  const world = createTestWorld(t);
  const record = openQuestion("OQ-0099");
  const env = baseEnvelope({ oq_ids: ["OQ-0099"] });
  const op = createOp({ op: "create_oq_record", target_world: env.target_world, payload: { oq_record: record } } satisfies Extract<PatchOperation, { op: "create_oq_record" }>);

  const staged = await stageCreateOqRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/open-questions/OQ-0099.yaml"));
  assertYamlEquals(staged, record);
});

test("create_oq_record rejects target world mismatch", async (t) => {
  const world = createTestWorld(t);
  const op = createOp({ op: "create_oq_record", target_world: "other-world", payload: { oq_record: openQuestion("OQ-0099") } } satisfies Extract<PatchOperation, { op: "create_oq_record" }>);

  await assertOpError(() => stageCreateOqRecord(baseEnvelope({ oq_ids: ["OQ-0099"] }), op, world.ctx), "target_world_mismatch");
});
