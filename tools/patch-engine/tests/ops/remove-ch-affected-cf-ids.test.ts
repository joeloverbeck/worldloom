import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageRemoveChAffectedCfIds } from "../../src/ops/remove-ch-affected-cf-ids.js";
import { assertOpError, assertYamlEquals, baseEnvelope, changeLog, createOp, createTestWorld, seedRecord } from "../harness.js";

test("remove_ch_affected_cf_ids removes only the retired CH alias field", async (t) => {
  const world = createTestWorld(t);
  const record = {
    ...changeLog("CH-0001"),
    affected_fact_ids: ["CF-0001"],
    affected_cf_ids: ["CF-0001"]
  };
  const chHash = seedRecord(world, "CH-0001", "change_log_entry", "_source/change-log/CH-0001.yaml", record);
  const env = baseEnvelope();

  const staged = await stageRemoveChAffectedCfIds(
    env,
    createOp({
      op: "remove_ch_affected_cf_ids",
      target_world: env.target_world,
      expected_content_hash: chHash,
      payload: { target_ch_id: "CH-0001" }
    } satisfies Extract<PatchOperation, { op: "remove_ch_affected_cf_ids" }>),
    world.ctx
  );

  assertYamlEquals(staged, { ...changeLog("CH-0001"), affected_fact_ids: ["CF-0001"] });
});

test("remove_ch_affected_cf_ids rejects non-CH ids and non-change-log records", async (t) => {
  const world = createTestWorld(t);
  seedRecord(world, "CF-0001", "canon_fact_record", "_source/canon/CF-0001.yaml", {
    id: "CF-0001"
  });
  const env = baseEnvelope();

  await assertOpError(
    () => stageRemoveChAffectedCfIds(env, createOp({
      op: "remove_ch_affected_cf_ids",
      target_world: env.target_world,
      payload: { target_ch_id: "CF-0001" }
    } satisfies Extract<PatchOperation, { op: "remove_ch_affected_cf_ids" }>), world.ctx),
    "invalid_record_id"
  );

  seedRecord(world, "CH-0002", "canon_fact_record", "_source/canon/CH-0002.yaml", {
    id: "CH-0002",
    affected_cf_ids: ["CF-0001"]
  });

  await assertOpError(
    () => stageRemoveChAffectedCfIds(env, createOp({
      op: "remove_ch_affected_cf_ids",
      target_world: env.target_world,
      payload: { target_ch_id: "CH-0002" }
    } satisfies Extract<PatchOperation, { op: "remove_ch_affected_cf_ids" }>), world.ctx),
    "op_target_class_mismatch"
  );
});
