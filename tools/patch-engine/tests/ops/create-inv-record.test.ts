import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateInvRecord } from "../../src/ops/create-inv-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, invariant } from "../harness.js";

test("create_inv_record stages expected YAML", async (t) => {
  const world = createTestWorld(t);
  const record = invariant("ONT-99");
  const env = baseEnvelope({ inv_ids: ["ONT-99"] });
  const op = createOp({ op: "create_inv_record", target_world: env.target_world, payload: { inv_record: record } } satisfies Extract<PatchOperation, { op: "create_inv_record" }>);

  const staged = await stageCreateInvRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/invariants/ONT-99.yaml"));
  assertYamlEquals(staged, record);
});

test("create_inv_record rejects missing allocation", async (t) => {
  const world = createTestWorld(t);
  const op = createOp({ op: "create_inv_record", target_world: world.worldSlug, payload: { inv_record: invariant("ONT-99") } } satisfies Extract<PatchOperation, { op: "create_inv_record" }>);

  await assertOpError(() => stageCreateInvRecord(baseEnvelope({ inv_ids: ["ONT-100"] }), op, world.ctx), "missing_expected_id_allocation");
});
