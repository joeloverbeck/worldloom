import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendModificationHistoryEntry } from "../../src/ops/append-modification-history-entry.js";
import { assertOpError, assertYamlEquals, baseEnvelope, canonFact, createOp, createTestWorld, seedStandardRecords } from "../harness.js";

test("append_modification_history_entry appends to CF records", async (t) => {
  const world = createTestWorld(t);
  const { cfHash } = seedStandardRecords(world);
  const env = baseEnvelope();
  const op = createOp({
    op: "append_modification_history_entry",
    target_world: env.target_world,
    expected_content_hash: cfHash,
    payload: { target_cf_id: "CF-0001", change_id: "CH-0002", originating_cf: "CF-0002", date: "2026-04-25", summary: "Documented update." }
  } satisfies Extract<PatchOperation, { op: "append_modification_history_entry" }>);

  const staged = await stageAppendModificationHistoryEntry(env, op, world.ctx);

  assertYamlEquals(staged, {
    ...canonFact("CF-0001"),
    modification_history: [{ change_id: "CH-0002", originating_cf: "CF-0002", date: "2026-04-25", summary: "Documented update." }]
  });
});

test("append_modification_history_entry rejects wrong target class and malformed payload", async (t) => {
  const world = createTestWorld(t);
  const { invHash, cfHash } = seedStandardRecords(world);
  const env = baseEnvelope();

  await assertOpError(() => stageAppendModificationHistoryEntry(env, createOp({ op: "append_modification_history_entry", target_world: env.target_world, expected_content_hash: invHash, payload: { target_cf_id: "ONT-1", change_id: "CH-0002", originating_cf: "CF-0002", date: "2026-04-25", summary: "Nope." } } satisfies Extract<PatchOperation, { op: "append_modification_history_entry" }>), world.ctx), "op_target_class_mismatch");
  await assertOpError(() => stageAppendModificationHistoryEntry(env, createOp({ op: "append_modification_history_entry", target_world: env.target_world, expected_content_hash: cfHash, payload: { target_cf_id: "CF-0001", change_id: "bad", originating_cf: "CF-0002", date: "2026-04-25", summary: "Nope." } } satisfies Extract<PatchOperation, { op: "append_modification_history_entry" }>), world.ctx), "invalid_modification_history_entry");
});
