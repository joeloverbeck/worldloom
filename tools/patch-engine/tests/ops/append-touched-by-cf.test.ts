import assert from "node:assert/strict";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendTouchedByCf } from "../../src/ops/append-touched-by-cf.js";
import { assertOpError, assertYamlEquals, baseEnvelope, createOp, createTestWorld, section, seedRecord, seedStandardRecords } from "../harness.js";

test("append_touched_by_cf appends once and marks duplicate as noop", async (t) => {
  const world = createTestWorld(t);
  const { secHash } = seedStandardRecords(world);
  const env = baseEnvelope();
  const op = createOp({ op: "append_touched_by_cf", target_world: env.target_world, expected_content_hash: secHash, payload: { target_sec_id: "SEC-ELF-001", cf_id: "CF-0002" } } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>);

  const staged = await stageAppendTouchedByCf(env, op, world.ctx);
  assertYamlEquals(staged, { ...section("SEC-ELF-001"), touched_by_cf: ["CF-0002"] });

  const duplicateWorld = createTestWorld(t);
  const duplicateHash = seedRecord(duplicateWorld, "SEC-ELF-001", "section", "_source/everyday-life/SEC-ELF-001.yaml", {
    ...section("SEC-ELF-001"),
    touched_by_cf: ["CF-0001"]
  });
  const duplicate = createOp({ ...op, expected_content_hash: duplicateHash, payload: { target_sec_id: "SEC-ELF-001", cf_id: "CF-0001" } } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>);
  const noop = await stageAppendTouchedByCf(env, duplicate, duplicateWorld.ctx);
  assert.equal(noop.noop, true);
});

test("append_touched_by_cf rejects non-section targets and invalid CF ids", async (t) => {
  const world = createTestWorld(t);
  const { cfHash, secHash } = seedStandardRecords(world);
  const env = baseEnvelope();

  await assertOpError(() => stageAppendTouchedByCf(env, createOp({ op: "append_touched_by_cf", target_world: env.target_world, expected_content_hash: cfHash, payload: { target_sec_id: "CF-0001", cf_id: "CF-0002" } } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>), world.ctx), "op_target_class_mismatch");
  await assertOpError(() => stageAppendTouchedByCf(env, createOp({ op: "append_touched_by_cf", target_world: env.target_world, expected_content_hash: secHash, payload: { target_sec_id: "SEC-ELF-001", cf_id: "BAD-1" } } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>), world.ctx), "invalid_record_id");
});
