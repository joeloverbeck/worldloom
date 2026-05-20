import assert from "node:assert/strict";
import { test } from "node:test";

import { computePgStateHash } from "@worldloom/world-index/hash/content";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAllOps } from "../../src/commit/temp-file.js";
import { stageUpdateRecordField } from "../../src/ops/update-record-field.js";
import { assertOpError, assertYamlEquals, baseEnvelope, canonFact, createOp, createTestWorld, seedRecord, seedStandardRecords } from "../harness.js";

function pgRecord(): Record<string, unknown> {
  return {
    id: "PG-1",
    story_id: "STORY-1",
    prose_plan_path: "pages-prose-plans/PG-1.md",
    prose_status: "pending",
    deferred_validation_trace: {
      prose_ledger_consistency: "DEFERRED — awaiting prose render",
      prose_critic_8_axis: "DEFERRED — awaiting prose render"
    }
  };
}

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

test("update_record_field sets PG prose-finalize transitional fields without retcon attestation", async (t) => {
  const world = createTestWorld(t);
  const record = pgRecord();
  const pgHash = seedRecord(
    world,
    "alpha:PG-1",
    "page_record",
    "stories/alpha/_source/pages/PG-1.yaml",
    record,
    "alpha"
  );
  const env = baseEnvelope();

  const setStatus = createOp({
    op: "update_record_field",
    target_world: env.target_world,
    expected_content_hash: pgHash,
    payload: {
      target_record_id: "PG-1",
      field_path: ["prose_status"],
      operation: "set",
      new_value: "rendered"
    }
  } satisfies Extract<PatchOperation, { op: "update_record_field" }>);
  const stagedStatus = await stageUpdateRecordField(env, setStatus, world.ctx);
  assertYamlEquals(stagedStatus, { ...record, prose_status: "rendered" });

  const setNestedGate = createOp({
    op: "update_record_field",
    target_world: env.target_world,
    expected_content_hash: pgHash,
    payload: {
      target_record_id: "PG-1",
      field_path: ["deferred_validation_trace", "prose_critic_8_axis"],
      operation: "set",
      new_value: "PASS — no axes flagged"
    }
  } satisfies Extract<PatchOperation, { op: "update_record_field" }>);
  await stageUpdateRecordField(env, setNestedGate, world.ctx);

});

test("update_record_field accepts bare story-bundle ids and resolves the namespaced indexed record", async (t) => {
  const world = createTestWorld(t);
  const record = pgRecord();
  const pgHash = seedRecord(
    world,
    "red-bunny:PG-1",
    "page_record",
    "stories/red-bunny/_source/pages/PG-1.yaml",
    record,
    "red-bunny"
  );
  const env = baseEnvelope();

  const staged = await stageUpdateRecordField(
    env,
    createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["prose_status"],
        operation: "set",
        new_value: "rendered"
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>),
    world.ctx
  );

  assertYamlEquals(staged, { ...record, prose_status: "rendered" });
});

test("update_record_field resolves bare STPLAN ids and treats them as story-bundle retcons", async (t) => {
  const world = createTestWorld(t);
  const record = {
    id: "STPLAN-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    holder: "STENT-1",
    root_intention: "STINT-1",
    objective: "Recover the harbor ledger before Kern destroys it.",
    plan_status: "active"
  };
  const stplanHash = seedRecord(
    world,
    "red-bunny:STPLAN-1",
    "story_plan_record",
    "stories/red-bunny/_source/plans/STPLAN-1.yaml",
    record,
    "red-bunny"
  );
  const env = baseEnvelope();

  const staged = await stageUpdateRecordField(
    env,
    createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: stplanHash,
      payload: {
        target_record_id: "STPLAN-1",
        field_path: ["plan_status"],
        operation: "set",
        new_value: "blocked",
        retcon_attestation: {
          retcon_type: "A",
          originating_se: "SE-1",
          rationale: "Story-event authorized plan-state repair."
        }
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>),
    world.ctx
  );

  assertYamlEquals(staged, { ...record, plan_status: "blocked" });
});

test("update_record_field chains mutations on a story-bundle page across multiple ops", async (t) => {
  const world = createTestWorld(t);
  const record = pgRecord();
  const pgHash = seedRecord(
    world,
    "red-bunny:PG-1",
    "page_record",
    "stories/red-bunny/_source/pages/PG-1.yaml",
    record,
    "red-bunny"
  );
  const patches: PatchOperation[] = [
    createOp({
      op: "update_record_field",
      target_world: world.worldSlug,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["prose_status"],
        operation: "set",
        new_value: "rendered"
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>),
    createOp({
      op: "update_record_field",
      target_world: world.worldSlug,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["deferred_validation_trace", "prose_ledger_consistency"],
        operation: "set",
        new_value: "PASS — rendered prose matches the ledger"
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>)
  ];

  const result = await stageAllOps({ ...baseEnvelope(), patches }, patches, world.ctx);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.staged.length, 1);
  assertYamlEquals(result.staged[0]!, {
    ...record,
    prose_status: "rendered",
    deferred_validation_trace: {
      prose_ledger_consistency: "PASS — rendered prose matches the ledger",
      prose_critic_8_axis: "DEFERRED — awaiting prose render"
    }
  });
});

test("update_record_field still requires retcon attestation for unrelated PG field sets", async (t) => {
  const world = createTestWorld(t);
  const record = { ...pgRecord(), branch_id: "BR-1" };
  const pgHash = seedRecord(
    world,
    "alpha:PG-1",
    "page_record",
    "stories/alpha/_source/pages/PG-1.yaml",
    record,
    "alpha"
  );
  const env = baseEnvelope();

  await assertOpError(
    () => stageUpdateRecordField(env, createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["branch_id"],
        operation: "set",
        new_value: "BR-2"
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>), world.ctx),
    "retcon_attestation_required"
  );
});

test("update_record_field accepts SE-attested story-bundle structural field repairs", async (t) => {
  const world = createTestWorld(t);
  const record = { ...pgRecord(), branch_id: "BR-1" };
  const pgHash = seedRecord(
    world,
    "alpha:PG-1",
    "page_record",
    "stories/alpha/_source/pages/PG-1.yaml",
    record,
    "alpha"
  );
  const env = baseEnvelope();

  const staged = await stageUpdateRecordField(
    env,
    createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["branch_id"],
        operation: "set",
        new_value: "BR-2",
        retcon_attestation: {
          retcon_type: "A",
          originating_se: "SE-1",
          rationale: "Story-event authorized story-bundle repair."
        }
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>),
    world.ctx
  );

  assertYamlEquals(staged, { ...record, branch_id: "BR-2" });
});

test("update_record_field rejects originating_se for world-canon retcons", async (t) => {
  const world = createTestWorld(t);
  const { cfHash } = seedStandardRecords(world);
  const env = baseEnvelope();

  await assertOpError(
    () => stageUpdateRecordField(env, createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: cfHash,
      payload: {
        target_record_id: "CF-0001",
        field_path: ["statement"],
        operation: "set",
        new_value: "Changed.",
        retcon_attestation: {
          retcon_type: "A",
          originating_se: "SE-1",
          rationale: "Story-event references must not authorize world-canon retcons."
        }
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>), world.ctx),
    "retcon_attestation_required"
  );
});

test("update_record_field repairs PG state_hash only when the new hash is self-consistent", async (t) => {
  const world = createTestWorld(t);
  const record = {
    ...pgRecord(),
    state_hash_parent: "0".repeat(64),
    state_hash: "1".repeat(64),
    input: { resolved_event_id: "SE-1" },
    plan: { path: "pages-prose-plans/PG-1.md", plan_hash: "2".repeat(64) }
  };
  const pgHash = seedRecord(
    world,
    "alpha:PG-1",
    "page_record",
    "stories/alpha/_source/pages/PG-1.yaml",
    record,
    "alpha"
  );
  const env = baseEnvelope();
  const expectedStateHash = computePgStateHash(record);

  const staged = await stageUpdateRecordField(
    env,
    createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["state_hash"],
        operation: "set",
        new_value: expectedStateHash
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>),
    world.ctx
  );

  assertYamlEquals(staged, { ...record, state_hash: expectedStateHash });

  await assertOpError(
    () => stageUpdateRecordField(env, createOp({
      op: "update_record_field",
      target_world: env.target_world,
      expected_content_hash: pgHash,
      payload: {
        target_record_id: "PG-1",
        field_path: ["state_hash"],
        operation: "set",
        new_value: "3".repeat(64)
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>), world.ctx),
    "retcon_attestation_required"
  );
});
