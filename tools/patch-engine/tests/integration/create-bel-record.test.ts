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
  const patch = createBelPatch(world.worldSlug, "red-bunny", "BEL-1");
  const envelope: PatchPlanEnvelope = {
    ...baseEnvelope({ bel_ids: ["BEL-1"] }),
    plan_id: "PLAN-BEL-1",
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
  assert.deepEqual(result.id_allocations_consumed.bel_ids, ["BEL-1"]);
  assert.ok(
    result.new_nodes.some(
      (node) => node.node_id === "red-bunny:BEL-1" && node.node_type === "belief_record"
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
    "BEL-1.yaml"
  );
  assert.ok(fs.existsSync(writtenPath));
  assert.deepEqual(YAML.parse(fs.readFileSync(writtenPath, "utf8")), patch.payload.record);
});

test("create_stplan_record and create_stemo_record submit through the story-record patch-engine path", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("plan-emotion-integration-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const planPatch = createStplanPatch(world.worldSlug, "red-bunny", "STPLAN-1");
  const emotionPatch = createStemoPatch(world.worldSlug, "red-bunny", "STEMO-1");
  const envelope: PatchPlanEnvelope = {
    ...baseEnvelope({ stplan_ids: ["STPLAN-1"], stemo_ids: ["STEMO-1"] }),
    plan_id: "PLAN-STPLAN-STEMO-1",
    target_world: world.worldSlug,
    patches: [planPatch, emotionPatch]
  };
  const token = signedToken({ envelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" });

  assert.equal(validateEnvelopeShape(envelope).ok, true);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: OK_VALIDATOR
  });

  assertPatchReceipt(result);
  assert.deepEqual(result.id_allocations_consumed.stplan_ids, ["STPLAN-1"]);
  assert.deepEqual(result.id_allocations_consumed.stemo_ids, ["STEMO-1"]);
  assert.ok(
    result.new_nodes.some(
      (node) => node.node_id === "red-bunny:STPLAN-1" && node.node_type === "story_plan_record"
    ),
    `missing STPLAN receipt node: ${JSON.stringify(result.new_nodes)}`
  );
  assert.ok(
    result.new_nodes.some(
      (node) => node.node_id === "red-bunny:STEMO-1" && node.node_type === "story_emotion_record"
    ),
    `missing STEMO receipt node: ${JSON.stringify(result.new_nodes)}`
  );

  const planPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "stories",
    "red-bunny",
    "_source",
    "plans",
    "STPLAN-1.yaml"
  );
  const emotionPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "stories",
    "red-bunny",
    "_source",
    "emotions",
    "STEMO-1.yaml"
  );
  assert.ok(fs.existsSync(planPath));
  assert.ok(fs.existsSync(emotionPath));
  assert.deepEqual(YAML.parse(fs.readFileSync(planPath, "utf8")), planPatch.payload.record);
  assert.deepEqual(YAML.parse(fs.readFileSync(emotionPath, "utf8")), emotionPatch.payload.record);
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
        holder: "STENT-1",
        claim: "Kern believes the harbor office will hide the bribe ledger.",
        truth_relation: "unknown",
        visibility: "private"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_bel_record" }>);
}

function createStplanPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_stplan_record" }> {
  return createOp({
    op: "create_stplan_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/plans/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        story_id: "STORY-1",
        created_at_page: "PG-1",
        created_by_event: "SE-1",
        holder: "STENT-1",
        root_intention: "STINT-1",
        objective: "Recover the harbor ledger before Kern destroys it.",
        plan_status: "active",
        belief_basis: ["BEL-1"],
        current_step: {
          action_family: "investigate",
          target_records: ["STOBJ-1"],
          success_condition: { predicates: [] }
        },
        expires_when: "The ledger is recovered or destroyed."
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_stplan_record" }>);
}

function createStemoPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_stemo_record" }> {
  return createOp({
    op: "create_stemo_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/emotions/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        story_id: "STORY-1",
        created_at_page: "PG-1",
        created_by_event: "SE-1",
        holder: "STENT-1",
        status: "dissociated",
        affect_kind: null,
        trigger_event: "SE-1",
        agency_effect: "none",
        expires_when: "The actor reorients to the threat."
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_stemo_record" }>);
}

function assertPatchReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}
