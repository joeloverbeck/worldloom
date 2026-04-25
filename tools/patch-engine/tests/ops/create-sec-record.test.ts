import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateSecRecord } from "../../src/ops/create-sec-record.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, section } from "../harness.js";

test("create_sec_record stages expected YAML under section subdir", async (t) => {
  const world = createTestWorld(t);
  const record = section("SEC-ELF-099");
  const env = baseEnvelope({ sec_ids: ["SEC-ELF-099"] });
  const op = createOp({ op: "create_sec_record", target_world: env.target_world, payload: { sec_record: record } } satisfies Extract<PatchOperation, { op: "create_sec_record" }>);

  const staged = await stageCreateSecRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/everyday-life/SEC-ELF-099.yaml"));
  assertYamlEquals(staged, record);
});

test("create_sec_record rejects unsupported section id", async (t) => {
  const world = createTestWorld(t);
  const op = createOp({ op: "create_sec_record", target_world: world.worldSlug, payload: { sec_record: section("SEC-BAD-099") } } satisfies Extract<PatchOperation, { op: "create_sec_record" }>);

  await assertOpError(() => stageCreateSecRecord(baseEnvelope({ sec_ids: ["SEC-BAD-099"] }), op, world.ctx), "invalid_record_id");
});
