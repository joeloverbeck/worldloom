import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { assertOpError, baseEnvelope, createTestWorld, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAbandonStoryQuestion } from "../../src/ops/abandon-story-question.js";

test("abandon_story_question sets status and abandonment_rationale", async (t) => {
  const world = createTestWorld(t);
  seedQuestion(world);
  const env = baseEnvelope();
  const op = {
    op: "abandon_story_question",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_question_id: "STQ-1",
      abandonment_rationale: "The branch ends before the ledger can matter."
    }
  } satisfies Extract<PatchOperation, { op: "abandon_story_question" }>;

  const staged = await stageAbandonStoryQuestion(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as Record<string, unknown>;

  assert.equal(parsed.status, "abandoned");
  assert.equal(parsed.abandonment_rationale, "The branch ends before the ledger can matter.");
});

test("abandon_story_question rejects empty rationale", async (t) => {
  const world = createTestWorld(t);
  seedQuestion(world);
  const env = baseEnvelope();
  const op = {
    op: "abandon_story_question",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_question_id: "STQ-1",
      abandonment_rationale: " "
    }
  } satisfies Extract<PatchOperation, { op: "abandon_story_question" }>;

  await assertOpError(() => stageAbandonStoryQuestion(env, op, world.ctx), "field_path_invalid");
});

function seedQuestion(world: ReturnType<typeof createTestWorld>): void {
  seedRecord(
    world,
    "harbor-ledgers:STQ-1",
    "story_question_record",
    "stories/harbor-ledgers/_source/story-questions/STQ-1.yaml",
    {
      id: "STQ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      setup_kind: "setup",
      question_or_setup: "The wax-sealed ledger remains unopened.",
      salience: "high",
      audience_visibility: "explicit",
      source_event: "SE-1",
      source_records: ["DA-1"],
      status: "open"
    },
    "harbor-ledgers"
  );
}
