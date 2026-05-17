import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { assertOpError, baseEnvelope, createTestWorld, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAnswerStoryQuestion } from "../../src/ops/answer-story-question.js";

test("answer_story_question sets status, answer_event, and answer_records", async (t) => {
  const world = createTestWorld(t);
  seedQuestion(world);
  const env = baseEnvelope();
  const op = {
    op: "answer_story_question",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_question_id: "STQ-1",
      status: "answered",
      answer_event: "SE-3",
      answer_records: ["SF-1", "BEL-2"]
    }
  } satisfies Extract<PatchOperation, { op: "answer_story_question" }>;

  const staged = await stageAnswerStoryQuestion(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as Record<string, unknown>;

  assert.equal(parsed.status, "answered");
  assert.equal(parsed.answer_event, "SE-3");
  assert.deepEqual(parsed.answer_records, ["BEL-1", "SF-1", "BEL-2"]);
});

test("answer_story_question rejects non-answer record ids", async (t) => {
  const world = createTestWorld(t);
  seedQuestion(world);
  const env = baseEnvelope();
  const op = {
    op: "answer_story_question",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_question_id: "STQ-1",
      status: "answered",
      answer_event: "SE-3",
      answer_records: ["not-an-id"]
    }
  } satisfies Extract<PatchOperation, { op: "answer_story_question" }>;

  await assertOpError(() => stageAnswerStoryQuestion(env, op, world.ctx), "invalid_record_id");
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
      status: "open",
      answer_records: ["BEL-1"]
    },
    "harbor-ledgers"
  );
}
