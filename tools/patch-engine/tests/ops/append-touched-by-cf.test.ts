import assert from "node:assert/strict";
import { test } from "node:test";

import { stageAllOps } from "../../src/commit/temp-file.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendTouchedByCf } from "../../src/ops/append-touched-by-cf.js";
import { assertOpError, assertYamlEquals, baseEnvelope, canonFact, createOp, createTestWorld, section, seedRecord, seedStandardRecords } from "../harness.js";

test("append_touched_by_cf appends once and marks duplicate as noop", async (t) => {
  const world = createTestWorld(t);
  const { secHash } = seedStandardRecords(world);
  const env = baseEnvelope();
  const op = createOp({ op: "append_touched_by_cf", target_world: env.target_world, expected_content_hash: secHash, payload: { target_sec_id: "SEC-ELF-001", cf_id: "CF-0001" } } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>);

  const staged = await stageAppendTouchedByCf(env, op, world.ctx);
  assertYamlEquals(staged, { ...section("SEC-ELF-001"), touched_by_cf: ["CF-0001"] });

  const duplicateWorld = createTestWorld(t);
  seedRecord(duplicateWorld, "CF-0001", "canon_fact_record", "_source/canon/CF-0001.yaml", canonFact("CF-0001"));
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

test("append_touched_by_cf requires the CF to list the section file_class", async (t) => {
  const world = createTestWorld(t);
  const { secHash } = seedStandardRecords(world);
  seedRecord(world, "CF-0002", "canon_fact_record", "_source/canon/CF-0002.yaml", {
    ...canonFact("CF-0002"),
    required_world_updates: ["GEOGRAPHY"]
  });
  const env = baseEnvelope();

  await assertOpError(
    () =>
      stageAppendTouchedByCf(
        env,
        createOp({
          op: "append_touched_by_cf",
          target_world: env.target_world,
          expected_content_hash: secHash,
          payload: { target_sec_id: "SEC-ELF-001", cf_id: "CF-0002" }
        } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>),
        world.ctx
      ),
    "required_world_updates_mismatch"
  );
});

test("append_touched_by_cf sees same-plan required_world_updates extensions", async (t) => {
  const world = createTestWorld(t);
  const { secHash } = seedStandardRecords(world);
  const cfHash = seedRecord(world, "CF-0002", "canon_fact_record", "_source/canon/CF-0002.yaml", {
    ...canonFact("CF-0002"),
    required_world_updates: ["GEOGRAPHY"]
  });
  const patches: PatchOperation[] = [
    createOp({
      op: "update_record_field",
      target_world: world.worldSlug,
      expected_content_hash: cfHash,
      payload: {
        target_record_id: "CF-0002",
        field_path: ["required_world_updates"],
        operation: "append_list",
        new_value: "EVERYDAY_LIFE"
      },
      retcon_attestation: {
        retcon_type: "A",
        originating_ch: "CH-0001",
        rationale: "Unit test extends the CF update surface before adding the section pointer."
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>),
    createOp({
      op: "append_touched_by_cf",
      target_world: world.worldSlug,
      expected_content_hash: secHash,
      payload: { target_sec_id: "SEC-ELF-001", cf_id: "CF-0002" }
    } satisfies Extract<PatchOperation, { op: "append_touched_by_cf" }>)
  ];

  const result = await stageAllOps({ ...baseEnvelope(), patches }, patches, world.ctx);

  assert.equal(result.ok, true);
  assert.equal(result.staged.length, 2);
});
