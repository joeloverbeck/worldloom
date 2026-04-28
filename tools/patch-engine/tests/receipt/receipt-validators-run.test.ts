import assert from "node:assert/strict";
import test from "node:test";

import { submitPatchPlan, type EngineError, type PatchReceipt, type ValidatorRunReceipt } from "../../src/apply.js";
import type { PatchOperation, PatchPlanEnvelope } from "../../src/envelope/schema.js";
import {
  baseEnvelope,
  canonFact,
  changeLog,
  createIndexedTestWorld,
  createOp,
  extension,
  nextId,
  section,
  signedToken,
  writeSecret
} from "../harness.js";

const PASSING_VALIDATORS_RUN: ValidatorRunReceipt[] = [
  { validator_name: "record_schema_compliance", status: "pass", duration_ms: 4.2 },
  { validator_name: "rule1_no_floating_facts", status: "pass", duration_ms: 1.7 },
  { validator_name: "rule7_mystery_reserve_preservation", status: "pass", duration_ms: 0.5 }
];

test("receipt-validators-run: success-path receipt exposes validators_run with each validator status:'pass'", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-validators-run-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({ ok: true, validators_run: PASSING_VALIDATORS_RUN })
  });

  assertReceipt(result);
  assert.ok(Array.isArray(result.validators_run), "validators_run must be present on success receipt");
  assert.equal(result.validators_run?.length, PASSING_VALIDATORS_RUN.length);
  for (const entry of result.validators_run ?? []) {
    assert.equal(entry.status, "pass");
    assert.ok(entry.duration_ms >= 0, "duration_ms must be non-negative");
    assert.equal(typeof entry.validator_name, "string");
  }
  assert.deepEqual(
    result.validators_run?.map((entry) => entry.validator_name),
    PASSING_VALIDATORS_RUN.map((entry) => entry.validator_name)
  );
});

test("receipt-validators-run: an injected pass-only validator appears in validators_run with status:'pass'", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-validators-run-injected-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const injected: ValidatorRunReceipt = {
    validator_name: "injected_always_pass",
    status: "pass",
    duration_ms: 0.1
  };

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({ ok: true, validators_run: [injected] })
  });

  assertReceipt(result);
  assert.deepEqual(result.validators_run, [injected]);
});

test("receipt-validators-run: existing receipt fields remain unchanged when validators_run is populated", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-validators-run-fields-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({ ok: true, validators_run: PASSING_VALIDATORS_RUN })
  });

  assertReceipt(result);
  assert.equal(result.plan_id, envelope.plan_id);
  assert.equal(typeof result.applied_at, "string");
  assert.ok(Array.isArray(result.files_written) && result.files_written.length > 0);
  assert.ok(Array.isArray(result.new_nodes) && result.new_nodes.length > 0);
  assert.equal(result.id_allocations_consumed.cf_ids?.[0], ids.cfId);
  assert.ok(result.index_sync_duration_ms >= 0);
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
  const secRow = world.db.prepare("SELECT content_hash FROM nodes WHERE node_id = 'SEC-ELF-001'").get() as {
    content_hash: string;
  };

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
          heading: "Validators-Run Geography",
          touched_by_cf: [ids.cfId]
        }
      }
    } satisfies Extract<PatchOperation, { op: "create_sec_record" }>),
    createOp({
      op: "append_extension",
      target_world: world.worldSlug,
      expected_content_hash: secRow.content_hash,
      payload: {
        target_record_id: "SEC-ELF-001",
        extension: {
          ...extension(ids.cfId),
          change_id: ids.chId,
          label: "Validators-run extension"
        }
      }
    } satisfies Extract<PatchOperation, { op: "append_extension" }>)
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
