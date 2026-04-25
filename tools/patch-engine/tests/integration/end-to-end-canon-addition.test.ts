import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import YAML from "yaml";

import { submitPatchPlan, type EngineError, type PatchReceipt } from "../../src/apply.js";
import type { PatchOperation, PatchPlanEnvelope } from "../../src/envelope/schema.js";
import {
  baseEnvelope,
  canonFact,
  changeLog,
  createIndexedTestWorld,
  createOp,
  extension,
  nextId,
  openQuestion,
  section,
  signedToken,
  writeSecret
} from "../harness.js";

const OK_VALIDATOR = async () => ({ ok: true as const });
const FAILING_VALIDATOR: EngineError = {
  ok: false,
  code: "validator_rejected",
  message: "Injected pre-apply validator rejection."
};

test("submitPatchPlan applies a canon-addition plan, syncs the index, preserves write order, and auto-adds touched_by_cf", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("integration-success-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = nextCanonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret, [
    "append_extension",
    "create_sec_record",
    "create_ch_record",
    "create_cf_record"
  ]);

  const startedAt = Date.now();
  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: OK_VALIDATOR
  });
  const elapsedMs = Date.now() - startedAt;

  assertPatchReceipt(result);
  assert.equal(result.plan_id, envelope.plan_id);
  assert.equal(result.id_allocations_consumed.cf_ids?.[0], ids.cfId);
  assert.equal(result.id_allocations_consumed.ch_ids?.[0], ids.chId);
  assert.equal(result.id_allocations_consumed.sec_ids?.[0], ids.secId);
  assert.ok(result.files_written.some((write) => write.file_path.endsWith(`_source/canon/${ids.cfId}.yaml`)));
  assert.ok(result.files_written.some((write) => write.file_path.endsWith(`_source/change-log/${ids.chId}.yaml`)));
  assert.ok(result.files_written.some((write) => write.file_path.endsWith(`_source/geography/${ids.secId}.yaml`)));
  assert.ok(result.files_written.some((write) => write.file_path.endsWith("_source/everyday-life/SEC-ELF-001.yaml")));
  assert.ok(result.index_sync_duration_ms >= 0);
  assert.ok(elapsedMs < 4000, `expected integration apply under 4000ms, saw ${elapsedMs}ms`);
  if (elapsedMs > 2200) {
    console.warn(`patch-engine integration apply exceeded SPEC-03 target: ${elapsedMs}ms`);
  }

  const existingSectionPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "_source",
    "everyday-life",
    "SEC-ELF-001.yaml"
  );
  const existingSection = YAML.parse(fs.readFileSync(existingSectionPath, "utf8")) as {
    touched_by_cf: string[];
    extensions: Array<{ originating_cf: string; change_id: string }>;
  };
  assert.ok(existingSection.touched_by_cf.includes(ids.cfId));
  assert.ok(
    existingSection.extensions.some(
      (entry) => entry.originating_cf === ids.cfId && entry.change_id === ids.chId
    )
  );

  const db = openResultDb(world.worldRoot, world.worldSlug);
  try {
    assert.equal(nodeCount(db, ids.cfId), 1);
    assert.equal(nodeCount(db, ids.secId), 1);
    assert.equal(patchedByEdgeCount(db, "SEC-ELF-001", ids.cfId), 1);
  } finally {
    db.close();
  }
});

test("submitPatchPlan fails closed on validator rejection without source writes or temp files", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("integration-validator-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = nextCanonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => FAILING_VALIDATOR
  });

  assertEngineError(result, "validator_rejected");
  assert.equal(
    fs.existsSync(path.join(world.worldRoot, "worlds", world.worldSlug, "_source", "canon", `${ids.cfId}.yaml`)),
    false
  );
  assert.deepEqual(findTempFiles(path.join(world.worldRoot, "worlds", world.worldSlug)), []);
});

test("submitPatchPlan reports drift, runtime append-only rejection, and missing retcon attestation", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("integration-rejection-secret");
  const secretPath = writeSecret(world.worldRoot, secret);

  const driftEnvelope = envelopeForPatches(world, {}, [
    createOp({
      op: "update_record_field",
      target_world: world.worldSlug,
      expected_content_hash: "stale-hash",
      payload: {
        target_record_id: "CF-0001",
        field_path: ["notes"],
        operation: "append_text",
        new_value: "Drift probe."
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>)
  ]);
  assertEngineError(
    await submitPatchPlan(driftEnvelope, signedToken({ envelope: driftEnvelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" }), {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "record_hash_drift"
  );

  const unknownOpEnvelope = {
    ...baseEnvelope(),
    patches: [
      {
        op: "replace_cf_record",
        target_world: world.worldSlug,
        payload: { cf_record: canonFact("CF-9999") }
      }
    ]
  } as unknown as PatchPlanEnvelope;
  assertEngineError(
    await submitPatchPlan(unknownOpEnvelope, signedToken({ envelope: unknownOpEnvelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" }), {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "envelope_shape_invalid"
  );

  const { cfHash } = seedHashes(world);
  const retconEnvelope = envelopeForPatches(world, {}, [
    createOp({
      op: "update_record_field",
      target_world: world.worldSlug,
      expected_content_hash: cfHash,
      payload: {
        target_record_id: "CF-0001",
        field_path: ["statement"],
        operation: "set",
        new_value: "A structural rewrite without attestation."
      }
    } satisfies Extract<PatchOperation, { op: "update_record_field" }>)
  ]);
  assertEngineError(
    await submitPatchPlan(retconEnvelope, signedToken({ envelope: retconEnvelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" }), {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "retcon_attestation_required"
  );
});

test("submitPatchPlan rejects unsigned, expired, tampered, and replayed approval tokens", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("integration-approval-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const ids = nextCanonAdditionIds(world);
  const { envelope, token } = canonAdditionEnvelope(world, ids, secret);

  assertEngineError(
    await submitPatchPlan(envelope, "not a token!", {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "approval_malformed"
  );
  assertEngineError(
    await submitPatchPlan(envelope, signedToken({ envelope, secret, expiresAt: "2000-01-01T00:00:00.000Z" }), {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "approval_expired"
  );
  assertEngineError(
    await submitPatchPlan(envelope, signedToken({ envelope, secret: Buffer.from("wrong-secret"), expiresAt: "2999-01-01T00:00:00.000Z" }), {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "approval_invalid_hmac"
  );

  assertPatchReceipt(
    await submitPatchPlan(envelope, token, {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    })
  );
  assertEngineError(
    await submitPatchPlan(envelope, token, {
      worldRoot: world.worldRoot,
      hmacSecretPath: secretPath,
      preApplyValidator: OK_VALIDATOR
    }),
    "approval_replayed"
  );
});

test("submitPatchPlan creates OQ records before adjudications that cite them", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("integration-oq-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const oqId = nextId(world.db, "OQ", 4);
  const paId = nextId(world.db, "PA", 4);
  const patches: PatchOperation[] = [
    createOp({
      op: "append_adjudication_record",
      target_world: world.worldSlug,
      target_file: `adjudications/${paId}-oq-allocation.md`,
      payload: {
        adjudication_frontmatter: {
          pa_id: paId,
          verdict: "ACCEPT",
          date: "2026-04-25",
          originating_skill: "canon-addition",
          mystery_reserve_touched: [],
          invariants_touched: [],
          cf_records_touched: ["CF-0001"],
          open_questions_touched: [oqId],
          change_id: "CH-0001"
        },
        body_markdown: `# ${paId} -- Adjudication Record\n\nThe new open question is cited by id.`
      }
    } satisfies Extract<PatchOperation, { op: "append_adjudication_record" }>),
    createOp({
      op: "create_oq_record",
      target_world: world.worldSlug,
      payload: {
        oq_record: {
          ...openQuestion(oqId),
          topic: "A SPEC-14 adjudication-linked open question."
        }
      }
    } satisfies Extract<PatchOperation, { op: "create_oq_record" }>)
  ];
  const envelope = envelopeForPatches(world, { oq_ids: [oqId], pa_ids: [paId] }, patches);

  const result = await submitPatchPlan(envelope, signedToken({ envelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" }), {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: OK_VALIDATOR
  });

  assertPatchReceipt(result);
  assert.ok(fs.existsSync(path.join(world.worldRoot, "worlds", world.worldSlug, "_source", "open-questions", `${oqId}.yaml`)));
  assert.match(
    fs.readFileSync(path.join(world.worldRoot, "worlds", world.worldSlug, "adjudications", `${paId}-oq-allocation.md`), "utf8"),
    new RegExp(`open_questions_touched:\\n\\s+- ${oqId}`)
  );
});

interface CanonAdditionIds {
  cfId: string;
  chId: string;
  secId: string;
}

function nextCanonAdditionIds(world: ReturnType<typeof createIndexedTestWorld>): CanonAdditionIds {
  return {
    cfId: nextId(world.db, "CF", 4),
    chId: nextId(world.db, "CH", 4),
    secId: nextId(world.db, "SEC-GEO", 3)
  };
}

function canonAdditionEnvelope(
  world: ReturnType<typeof createIndexedTestWorld>,
  ids: CanonAdditionIds,
  secret: Buffer,
  order: PatchOperation["op"][] = ["create_cf_record", "create_ch_record", "create_sec_record", "append_extension"]
): { envelope: PatchPlanEnvelope; token: string } {
  const { secHash } = seedHashes(world);
  const patchByKind = new Map<PatchOperation["op"], PatchOperation>([
    [
      "create_cf_record",
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
      } satisfies Extract<PatchOperation, { op: "create_cf_record" }>)
    ],
    [
      "create_ch_record",
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
      } satisfies Extract<PatchOperation, { op: "create_ch_record" }>)
    ],
    [
      "create_sec_record",
      createOp({
        op: "create_sec_record",
        target_world: world.worldSlug,
        payload: {
          sec_record: {
            ...section(ids.secId),
            id: ids.secId,
            file_class: "GEOGRAPHY",
            order: 1,
            heading: "Integration Geography",
            touched_by_cf: [ids.cfId]
          }
        }
      } satisfies Extract<PatchOperation, { op: "create_sec_record" }>)
    ],
    [
      "append_extension",
      createOp({
        op: "append_extension",
        target_world: world.worldSlug,
        expected_content_hash: secHash,
        payload: {
          target_record_id: "SEC-ELF-001",
          extension: {
            ...extension(ids.cfId),
            change_id: ids.chId,
            label: "Integration extension"
          }
        }
      } satisfies Extract<PatchOperation, { op: "append_extension" }>)
    ]
  ]);

  const patches = order.map((kind) => {
    const patch = patchByKind.get(kind);
    assert.ok(patch, `missing patch for ${kind}`);
    return patch;
  });
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

function envelopeForPatches(
  world: ReturnType<typeof createIndexedTestWorld>,
  allocations: PatchPlanEnvelope["expected_id_allocations"],
  patches: PatchOperation[]
): PatchPlanEnvelope {
  return {
    ...baseEnvelope(allocations),
    plan_id: `PLAN-${Math.random().toString(16).slice(2)}`,
    target_world: world.worldSlug,
    patches
  };
}

function seedHashes(world: ReturnType<typeof createIndexedTestWorld>): { cfHash: string; secHash: string } {
  const cfRow = world.db.prepare("SELECT content_hash FROM nodes WHERE node_id = 'CF-0001'").get() as {
    content_hash: string;
  };
  const secRow = world.db.prepare("SELECT content_hash FROM nodes WHERE node_id = 'SEC-ELF-001'").get() as {
    content_hash: string;
  };
  return { cfHash: cfRow.content_hash, secHash: secRow.content_hash };
}

function assertPatchReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}

function assertEngineError(result: PatchReceipt | EngineError, code: string): asserts result is EngineError {
  assert.ok("ok" in result, `expected EngineError ${code}, got ${JSON.stringify(result)}`);
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
}

function openResultDb(worldRoot: string, worldSlug: string): Database.Database {
  return new Database(path.join(worldRoot, "worlds", worldSlug, "_index", "world.db"), { readonly: true });
}

function nodeCount(db: Database.Database, nodeId: string): number {
  return (db.prepare("SELECT COUNT(*) AS count FROM nodes WHERE node_id = ?").get(nodeId) as { count: number }).count;
}

function patchedByEdgeCount(db: Database.Database, sourceNodeId: string, targetNodeId: string): number {
  return (
    db
      .prepare("SELECT COUNT(*) AS count FROM edges WHERE source_node_id = ? AND target_node_id = ? AND edge_type = 'patched_by'")
      .get(sourceNodeId, targetNodeId) as { count: number }
  ).count;
}

function findTempFiles(root: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.includes(".patch-engine.")) {
      found.push(path.join(entry.parentPath, entry.name));
    }
  }
  return found.sort();
}
