import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageUpdateRecordField } from "../../src/ops/update-record-field.js";
import { assertOpError, assertYamlEquals, baseEnvelope, canonFact, createOp, createTestWorld, seedStandardRecords } from "../harness.js";

test("update_record_field appends free text and sets structural field with retcon attestation", async (t) => {
  const world = createTestWorld(t);
  const { cfHash } = seedStandardRecords(world);
  const env = baseEnvelope();
  const appendNotes = createOp({
    op: "update_record_field",
    target_world: env.target_world,
    expected_content_hash: cfHash,
    payload: { target_record_id: "CF-0001", field_path: ["notes"], operation: "append_text", new_value: "Follow-up note." }
  } satisfies Extract<PatchOperation, { op: "update_record_field" }>);
  const stagedNotes = await stageUpdateRecordField(env, appendNotes, world.ctx);
  assertYamlEquals(stagedNotes, { ...canonFact("CF-0001"), notes: "Initial note.\nFollow-up note." });

  const setDistribution = createOp({
    op: "update_record_field",
    target_world: env.target_world,
    expected_content_hash: cfHash,
    payload: {
      target_record_id: "CF-0001",
      field_path: ["distribution", "why_not_universal"],
      operation: "set",
      new_value: ["Retconned with attestation."],
      retcon_attestation: { retcon_type: "A", originating_ch: "CH-0002", rationale: "User-approved structural retcon." }
    }
  } satisfies Extract<PatchOperation, { op: "update_record_field" }>);
  const stagedDistribution = await stageUpdateRecordField(env, setDistribution, world.ctx);
  assertYamlEquals(stagedDistribution, {
    ...canonFact("CF-0001"),
    distribution: { why_not_universal: ["Retconned with attestation."] }
  });
});

test("update_record_field rejects missing attestation, hash drift, and invalid paths", async (t) => {
  const world = createTestWorld(t);
  const { cfHash } = seedStandardRecords(world);
  const env = baseEnvelope();

  await assertOpError(
    () => stageUpdateRecordField(env, createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: cfHash,
      payload: { target_record_id: "CF-0001", field_path: ["statement"], operation: "set", new_value: "Changed." }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>), world.ctx),
    "retcon_attestation_required"
  );
  await assertOpError(
    () => stageUpdateRecordField(env, createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: "not-the-current-hash",
      payload: { target_record_id: "CF-0001", field_path: ["notes"], operation: "append_text", new_value: "Nope." }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>), world.ctx),
    "record_hash_drift"
  );
  await assertOpError(
    () => stageUpdateRecordField(env, createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: cfHash,
      payload: { target_record_id: "CF-0001", field_path: [], operation: "set", new_value: "Nope." }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>), world.ctx),
    "field_path_invalid"
  );
});
