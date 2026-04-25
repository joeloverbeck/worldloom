import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendExtension } from "../../src/ops/append-extension.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, extension, section, seedStandardRecords } from "../harness.js";

test("append_extension appends to section records", async (t) => {
  const world = createTestWorld(t);
  const { secHash } = seedStandardRecords(world);
  const env = baseEnvelope();
  const ext = extension("CF-0002");
  const op = createOp({ op: "append_extension", target_world: env.target_world, expected_content_hash: secHash, payload: { target_record_id: "SEC-ELF-001", extension: ext } } satisfies Extract<PatchOperation, { op: "append_extension" }>);

  const staged = await stageAppendExtension(env, op, world.ctx);

  assertYamlEquals(staged, { ...section("SEC-ELF-001"), touched_by_cf: ["CF-0002"], extensions: [ext] });
});

test("append_extension rejects CF target and malformed extension", async (t) => {
  const world = createTestWorld(t);
  const { cfHash, secHash } = seedStandardRecords(world);
  const env = baseEnvelope();

  await assertOpError(() => stageAppendExtension(env, createOp({ op: "append_extension", target_world: env.target_world, expected_content_hash: cfHash, payload: { target_record_id: "CF-0001", extension: extension("CF-0002") } } satisfies Extract<PatchOperation, { op: "append_extension" }>), world.ctx), "op_target_class_mismatch");
  await assertOpError(() => stageAppendExtension(env, createOp({ op: "append_extension", target_world: env.target_world, expected_content_hash: secHash, payload: { target_record_id: "SEC-ELF-001", extension: { ...extension("bad"), originating_cf: "bad" } } } satisfies Extract<PatchOperation, { op: "append_extension" }>), world.ctx), "invalid_extension_payload");
});
