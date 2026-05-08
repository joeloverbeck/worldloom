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

test("create_arc_trace_record validates and submits through the story-record patch-engine path", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("arc-trace-integration-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const patch = createArcTracePatch(world.worldSlug, "red-bunny", "ARCTRACE-0001");
  const envelope: PatchPlanEnvelope = {
    ...baseEnvelope({ arc_trace_ids: ["ARCTRACE-0001"] }),
    plan_id: "PLAN-ARC-TRACE-0001",
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
  assert.deepEqual(result.id_allocations_consumed.arc_trace_ids, ["ARCTRACE-0001"]);
  assert.ok(
    result.new_nodes.some(
      (node) => node.node_id === "red-bunny:ARCTRACE-0001" && node.node_type === "arc_trace_record"
    ),
    `missing ARC_TRACE receipt node: ${JSON.stringify(result.new_nodes)}`
  );

  const writtenPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "stories",
    "red-bunny",
    "_source",
    "arc-traces",
    "ARCTRACE-0001.yaml"
  );
  assert.ok(fs.existsSync(writtenPath));
  assert.deepEqual(YAML.parse(fs.readFileSync(writtenPath, "utf8")), patch.payload.record);
});

function createArcTracePatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_arc_trace_record" }> {
  return createOp({
    op: "create_arc_trace_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/arc-traces/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        created_at_page: "PG-0002",
        arc_realized: "SLT-0001",
        effect_variant_applied: "variant-a",
        semantic_critic_verdict: { status: "pass" },
        realized_beats: [],
        possible_violations: [],
        stop_condition_hit: { category: "normal_exit", id: "exit-1" },
        effect_evidence: [],
        observed_actions: []
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_arc_trace_record" }>);
}

function assertPatchReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}
