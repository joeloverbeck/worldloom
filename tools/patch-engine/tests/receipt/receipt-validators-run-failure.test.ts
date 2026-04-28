import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { submitPatchPlan, type EngineError, type PatchReceipt, type ValidatorRunReceipt } from "../../src/apply.js";
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

const VALIDATORS_RUN_WITH_FAILURE: ValidatorRunReceipt[] = [
  { validator_name: "record_schema_compliance", status: "pass", duration_ms: 3.1 },
  {
    validator_name: "rule7_mystery_reserve_preservation",
    status: "fail",
    duration_ms: 2.7,
    detail: "Plan flattens reserved firewall body."
  },
  { validator_name: "rule6_no_silent_retcons", status: "skipped", duration_ms: 0, detail: "applies_to=false" }
];

test("receipt-validators-run-failure: failing submission's error includes validators_run with the failing validator's status:'fail'", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-validators-run-failure-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({
      ok: false,
      code: "validator_failed",
      message: "Pre-apply validators reported 1 failure(s).",
      validators_run: VALIDATORS_RUN_WITH_FAILURE
    })
  });

  assertEngineError(result, "validator_failed");
  assert.ok(Array.isArray(result.validators_run), "validators_run must be present on the failure response");
  assert.equal(result.validators_run?.length, VALIDATORS_RUN_WITH_FAILURE.length);

  const failing = result.validators_run?.find((entry) => entry.status === "fail");
  assert.ok(failing, "expected at least one failing validator entry");
  assert.equal(failing?.validator_name, "rule7_mystery_reserve_preservation");
  assert.equal(typeof failing?.detail, "string");
  assert.ok((failing?.detail ?? "").length > 0);

  const passing = result.validators_run?.filter((entry) => entry.status === "pass") ?? [];
  assert.ok(passing.length > 0, "validators that ran-and-passed before the failure must still be reported");

  // No source writes on validator rejection.
  assert.equal(
    fs.existsSync(path.join(world.worldRoot, "worlds", world.worldSlug, "_source", "canon", `${ids.cfId}.yaml`)),
    false
  );
});

test("receipt-validators-run-failure: failure-path validators_run preserves duration_ms non-negative invariant", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("receipt-validators-run-failure-duration-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = canonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({
      ok: false,
      code: "validator_failed",
      message: "Injected.",
      validators_run: VALIDATORS_RUN_WITH_FAILURE
    })
  });

  assertEngineError(result, "validator_failed");
  for (const entry of result.validators_run ?? []) {
    assert.ok(entry.duration_ms >= 0, `duration_ms must be non-negative for ${entry.validator_name}`);
  }
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
          heading: "Validators-Run Failure Geography",
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

function assertEngineError(result: PatchReceipt | EngineError, code: string): asserts result is EngineError {
  assert.ok("ok" in result, `expected EngineError ${code}, got ${JSON.stringify(result)}`);
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
}
