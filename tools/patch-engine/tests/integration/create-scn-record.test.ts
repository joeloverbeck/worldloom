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

test("create_scn_record validates and submits through the story-record patch-engine path", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("scene-integration-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const patch = createScnPatch(world.worldSlug, "red-bunny", "SCN-1");
  const envelope: PatchPlanEnvelope = {
    ...baseEnvelope({ scn_ids: ["SCN-1"] }),
    plan_id: "PLAN-SCN-1",
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
  assert.deepEqual(result.id_allocations_consumed.scn_ids, ["SCN-1"]);
  assert.ok(
    result.new_nodes.some(
      (node) => node.node_id === "red-bunny:SCN-1" && node.node_type === "scene_record"
    ),
    `missing SCN receipt node: ${JSON.stringify(result.new_nodes)}`
  );

  const writtenPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "stories",
    "red-bunny",
    "_source",
    "scenes",
    "SCN-1.yaml"
  );
  assert.ok(fs.existsSync(writtenPath));
  assert.deepEqual(YAML.parse(fs.readFileSync(writtenPath, "utf8")), patch.payload.record);
});

function createScnPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_scn_record" }> {
  return createOp({
    op: "create_scn_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/scenes/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        story_id: "STORY-1",
        branch_id: "BR-1",
        supersedes: null,
        status: "planned",
        pg_ids: ["PG-1"],
        start_page_id: "PG-1",
        end_page_id: "PG-1",
        previous_scene_id: null,
        choice_surface_page_id: "PG-1",
        emitted_choice_ids: ["CHC-1"],
        title: "Bench Conversation",
        slug: "bench-conversation",
        scene_descriptor: "A conversation on the bench after the player chooses to wait.",
        boundary_rationale: "The range shares one location, cast, exchange, and final choice surface.",
        prose_plan_path: `scene-prose-plans/${id}.md`,
        prose_path: `scene-prose/${id}.md`,
        receipt_path: `scene-prose-receipts/${id}.yaml`
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_scn_record" }>);
}

function assertPatchReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}
