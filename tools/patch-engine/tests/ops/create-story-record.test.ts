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

test("create_bel_record writes BEL YAML under the story _source tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ bel_ids: ["BEL-0001"] });
  const op = {
    op: "create_bel_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "BEL-0001",
        holder: "STENT-0001",
        claim: "Marla believes Kern controls the harbor ledgers."
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_bel_record" }>;

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
      "beliefs",
      "BEL-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_ststat_record writes STSTAT YAML under the story _source status tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ ststat_ids: ["STSTAT-0001"] });
  const op = {
    op: "create_ststat_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STSTAT-0001",
        story_id: "STORY-0001",
        created_at_page: "PG-0001",
        entity: "STENT-0001",
        life: "alive",
        agency: "free",
        location: "STLOC-0001"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_ststat_record" }>;

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
      "status",
      "STSTAT-0001.yaml"
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
