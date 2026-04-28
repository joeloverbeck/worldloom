import assert from "node:assert/strict";
import test from "node:test";

import { submitPatchPlan, type EngineError, type PatchReceipt } from "../../src/apply.js";
import type { PatchOperation, PatchPlanEnvelope } from "../../src/envelope/schema.js";
import {
  baseEnvelope,
  canonFact,
  changeLog,
  createIndexedTestWorld,
  createOp,
  nextId,
  section,
  signedToken,
  writeSecret
} from "../harness.js";

interface PreCorridor007Receipt {
  plan_id: string;
  applied_at: string;
  files_written: Array<{ file_path: string; prior_hash: string; new_hash: string; ops_applied: number }>;
  new_nodes: Array<{ node_id: string; node_type: string; file_path: string }>;
  id_allocations_consumed: PatchReceipt["id_allocations_consumed"];
  index_sync_duration_ms: number;
}

test("receipt-backward-compat: a consumer that only reads pre-CORRIDOR-007 fields continues to work against the new receipt", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-backward-compat-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({
      ok: true,
      validators_run: [
        { validator_name: "record_schema_compliance", status: "pass", duration_ms: 1.5 }
      ]
    })
  });

  assertReceipt(result);

  // Simulate a pre-CORRIDOR-007 consumer: ignores validators_run entirely, structurally types
  // the receipt with the prior shape, and reads every previously-existing field.
  const legacy: PreCorridor007Receipt = result;
  assert.equal(legacy.plan_id, envelope.plan_id);
  assert.equal(typeof legacy.applied_at, "string");
  assert.ok(Array.isArray(legacy.files_written) && legacy.files_written.length > 0);
  assert.ok(Array.isArray(legacy.new_nodes) && legacy.new_nodes.length > 0);
  assert.equal(legacy.id_allocations_consumed.cf_ids?.[0], ids.cfId);
  assert.equal(legacy.id_allocations_consumed.ch_ids?.[0], ids.chId);
  assert.ok(legacy.index_sync_duration_ms >= 0);
});

test("receipt-backward-compat: omitting validators_run from the validator callback yields a receipt without the field set", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-backward-compat-omit-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({ ok: true })
  });

  assertReceipt(result);
  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "validators_run"),
    false,
    "validators_run must remain absent (additive-with-default-undefined) when the callback does not supply it"
  );
});

interface CanonAdditionIds {
  cfId: string;
  chId: string;
  secId: string;
}

function canonAdditionIds(world: ReturnType<typeof createIndexedTestWorld>): CanonAdditionIds {
  return {
    cfId: nextId(world.db, "CF", 4),
    chId: nextId(world.db, "CH", 4),
    secId: nextId(world.db, "SEC-GEO", 3)
  };
}

function canonAdditionEnvelope(
  world: ReturnType<typeof createIndexedTestWorld>,
  ids: CanonAdditionIds,
  secret: Buffer
): { envelope: PatchPlanEnvelope; token: string } {
  const patches: PatchOperation[] = [
    createOp({
      op: "create_cf_record",
      target_world: world.worldSlug,
      payload: {
        cf_record: {
          ...canonFact(ids.cfId),
          required_world_updates: ["GEOGRAPHY", "EVERYDAY_LIFE"],
          source_basis: { direct_user_approval: true }
        }
      }
    } satisfies Extract<PatchOperation, { op: "create_cf_record" }>),
    createOp({
      op: "create_ch_record",
      target_world: world.worldSlug,
      payload: {
        ch_record: {
          ...changeLog(ids.chId),
          affected_fact_ids: [ids.cfId],
          downstream_updates: [ids.secId]
        }
      }
    } satisfies Extract<PatchOperation, { op: "create_ch_record" }>),
    createOp({
      op: "create_sec_record",
      target_world: world.worldSlug,
      payload: {
        sec_record: {
          ...section(ids.secId),
          id: ids.secId,
          file_class: "GEOGRAPHY",
          order: 1,
          heading: "Backward-Compat Geography",
          touched_by_cf: [ids.cfId]
        }
      }
    } satisfies Extract<PatchOperation, { op: "create_sec_record" }>)
  ];

  const envelope = {
    ...baseEnvelope({ cf_ids: [ids.cfId], ch_ids: [ids.chId], sec_ids: [ids.secId] }),
    plan_id: `PLAN-${ids.cfId}`,
    target_world: world.worldSlug,
    originating_cf_ids: [ids.cfId],
    originating_ch_id: ids.chId,
    patches
  };

  return {
    envelope,
    token: signedToken({ envelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" })
  };
}

function assertReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}
