import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { baseEnvelope, createTestWorld, assertOpError, assertYamlEquals } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageCreateStoryRecord } from "../../src/ops/create-story-record.js";

test("create_scn_record writes SCN YAML under story _source scenes", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ scn_ids: ["SCN-1"] });
  const op = createScnOp(env.target_world, "red-bunny", scnRecord("SCN-1"));

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "red-bunny",
      "_source",
      "scenes",
      "SCN-1.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("supersede_scn_record writes replacement SCN YAML through the story-record path", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ scn_ids: ["SCN-2"] });
  const op = {
    ...createScnOp(env.target_world, "red-bunny", scnRecord("SCN-2")),
    op: "supersede_scn_record" as const,
    payload: {
      story_slug: "red-bunny",
      record: {
        ...scnRecord("SCN-2"),
        supersedes: "SCN-1",
        status: "rendered",
        pg_ids: ["PG-1", "PG-2"],
        end_page_id: "PG-2",
        choice_surface_page_id: "PG-2",
        emitted_choice_ids: ["CHC-2"]
      }
    }
  } satisfies Extract<PatchOperation, { op: "supersede_scn_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "red-bunny",
      "_source",
      "scenes",
      "SCN-2.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_scn_record rejects missing SCN id allocation", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = createScnOp(env.target_world, "red-bunny", scnRecord("SCN-1"));

  await assertOpError(() => stageCreateStoryRecord(env, op, world.ctx), "missing_expected_id_allocation");
});

function createScnOp(
  worldSlug: string,
  storySlug: string,
  record: ReturnType<typeof scnRecord>
): Extract<PatchOperation, { op: "create_scn_record" }> {
  return {
    op: "create_scn_record",
    target_world: worldSlug,
    payload: {
      story_slug: storySlug,
      record
    }
  };
}

function scnRecord(id: string): Record<string, unknown> {
  return {
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
    scene_descriptor: "A conversation on the bench turns from caution to trust.",
    boundary_rationale: "The scene ends where the bench exchange reaches its choice surface.",
    prose_plan_path: "scene-prose-plans/SCN-1.md",
    prose_path: "scene-prose/SCN-1.md",
    receipt_path: "scene-prose-receipts/SCN-1.yaml"
  };
}
