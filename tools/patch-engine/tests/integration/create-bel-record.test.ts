import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { submitPatchPlan, type EngineError, type PatchReceipt } from "../../src/apply.js";
import { validateEnvelopeShape } from "../../src/envelope/validate.js";
import type { PatchOperation, PatchPlanEnvelope } from "../../src/envelope/schema.js";
import { baseEnvelope, createIndexedTestWorld, createOp, signedToken, writeSecret } from "../harness.js";

const OK_VALIDATOR = async () => ({ ok: true as const });

test("create_bel_record validates and submits through the story-record patch-engine path", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("belief-integration-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const patch = createBelPatch(world.worldSlug, "red-bunny", "BEL-0001");
  const envelope: PatchPlanEnvelope = {
    ...baseEnvelope({ bel_ids: ["BEL-0001"] }),
    plan_id: "PLAN-BEL-0001",
    target_world: world.worldSlug,
    patches: [patch]
  };
  const token = signedToken({ envelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" });

  assert.equal(validateEnvelopeShape(envelope).ok, true);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: OK_VALIDATOR
  });

  assertPatchReceipt(result);
  assert.deepEqual(result.id_allocations_consumed.bel_ids, ["BEL-0001"]);
  assert.ok(
    result.new_nodes.some(
      (node) => node.node_id === "red-bunny:BEL-0001" && node.node_type === "belief_record"
    ),
    `missing BEL receipt node: ${JSON.stringify(result.new_nodes)}`
  );

  const writtenPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "stories",
    "red-bunny",
    "_source",
    "beliefs",
    "BEL-0001.yaml"
  );
  assert.ok(fs.existsSync(writtenPath));
  assert.deepEqual(YAML.parse(fs.readFileSync(writtenPath, "utf8")), patch.payload.record);
});

test("create_arc_trace_record is rejected by envelope validation", () => {
  const envelope = {
    ...baseEnvelope({}),
    patches: [
      createOp({
        op: "create_arc_trace_record",
        target_world: "minimal-world",
        target_file: "stories/red-bunny/_source/arc-traces/ARCTRACE-0001.yaml",
        payload: {
          story_slug: "red-bunny",
          record: { id: "ARCTRACE-0001" }
        }
      } as unknown as PatchOperation)
    ]
  };

  const result = validateEnvelopeShape(envelope);

  assert.deepEqual(result, {
    ok: false,
    errors: ["patches[0].op must be a supported operation kind"]
  });
});

function createBelPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_bel_record" }> {
  return createOp({
    op: "create_bel_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/beliefs/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        holder: "STENT-0001",
        claim: "Kern believes the harbor office will hide the bribe ledger.",
        truth_relation: "unknown",
        visibility: "private"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_bel_record" }>);
}

function assertPatchReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}
