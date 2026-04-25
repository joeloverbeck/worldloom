import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateEntRecord } from "../../src/ops/create-ent-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, entity } from "../harness.js";

test("create_ent_record stages expected YAML", async (t) => {
  const world = createTestWorld(t);
  const record = entity("ENT-0099");
  const env = baseEnvelope({ ent_ids: ["ENT-0099"] });
  const op = createOp({ op: "create_ent_record", target_world: env.target_world, payload: { ent_record: record } } satisfies Extract<PatchOperation, { op: "create_ent_record" }>);

  const staged = await stageCreateEntRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/entities/ENT-0099.yaml"));
  assertYamlEquals(staged, record);
});

test("create_ent_record rejects invalid id", async (t) => {
  const world = createTestWorld(t);
  const op = createOp({ op: "create_ent_record", target_world: world.worldSlug, payload: { ent_record: entity("ENTITY-0099") } } satisfies Extract<PatchOperation, { op: "create_ent_record" }>);

  await assertOpError(() => stageCreateEntRecord(baseEnvelope({ ent_ids: ["ENTITY-0099"] }), op, world.ctx), "invalid_record_id");
});
