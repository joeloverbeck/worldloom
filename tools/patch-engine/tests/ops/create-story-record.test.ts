import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { baseEnvelope, createTestWorld, assertOpError, assertYamlEquals } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateStoryRecord } from "../../src/ops/create-story-record.js";

test("create_slt_record writes story-bundle YAML under the story _source tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ slt_ids: ["SLT-0001"] });
  const op = {
    op: "create_slt_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "SLT-0001",
        hard_preconds: []
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_slt_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "storylets",
      "SLT-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_slt_record rejects missing story-scoped id allocation", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = {
    op: "create_slt_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: { id: "SLT-0001" }
    }
  } satisfies Extract<PatchOperation, { op: "create_slt_record" }>;

  await assertOpError(() => stageCreateStoryRecord(env, op, world.ctx), "missing_expected_id_allocation");
});

test("append_story_diegetic_artifact_record writes story-local artifact YAML", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ story_da_ids: ["DA-0001"] });
  const op = {
    op: "append_story_diegetic_artifact_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "DA-0001",
        title: "A story-local artifact"
      }
    }
  } satisfies Extract<PatchOperation, { op: "append_story_diegetic_artifact_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "artifacts",
      "DA-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});
