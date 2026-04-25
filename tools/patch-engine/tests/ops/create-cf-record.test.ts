import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateCfRecord } from "../../src/ops/create-cf-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, canonFact, createOp, createTestWorld, seedRecord } from "../harness.js";

test("create_cf_record stages expected YAML", async (t) => {
  const world = createTestWorld(t);
  const record = canonFact("CF-0099");
  const env = baseEnvelope({ cf_ids: ["CF-0099"] });
  const op = createOp({ op: "create_cf_record", target_world: env.target_world, payload: { cf_record: record } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);

  const staged = await stageCreateCfRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/canon/CF-0099.yaml"));
  assertYamlEquals(staged, record);
});

test("create_cf_record rejects overwrite and missing allocation", async (t) => {
  const world = createTestWorld(t);
  seedRecord(world, "CF-0099", "canon_fact_record", "_source/canon/CF-0099.yaml", canonFact("CF-0099"));
  const record = canonFact("CF-0099");
  const op = createOp({ op: "create_cf_record", target_world: world.worldSlug, payload: { cf_record: record } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);

  await assertOpError(() => stageCreateCfRecord(baseEnvelope({ cf_ids: ["CF-0099"] }), op, world.ctx), "record_already_exists");
  await assertOpError(() => stageCreateCfRecord(baseEnvelope({ cf_ids: ["CF-0100"] }), op, world.ctx), "missing_expected_id_allocation");
});
