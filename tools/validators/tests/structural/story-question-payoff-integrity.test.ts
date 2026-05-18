import assert from "node:assert/strict";
import test from "node:test";

import { storyQuestionPayoffIntegrity } from "../../src/structural/story-question-payoff-integrity.js";
import { context, record } from "./helpers.js";

test("story_question_payoff_integrity accepts answered questions with prior setup and answer event", async () => {
  const verdicts = await storyQuestionPayoffIntegrity.run(undefined, context([
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    event("SE-2", "PG-2"),
    question("STQ-1", { created_at_page: "PG-1" }),
    question("STQ-2", { created_at_page: "PG-2", status: "answered", answer_event: "SE-2", payoff_of: "STQ-1" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("story_question_payoff_integrity rejects missing answer_event, missing setup, and later setup", async () => {
  const verdicts = await storyQuestionPayoffIntegrity.run(undefined, context([
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    question("STQ-1", { created_at_page: "PG-2" }),
    question("STQ-2", { created_at_page: "PG-1", status: "paid_off", payoff_of: "STQ-1" }),
    question("STQ-3", { created_at_page: "PG-1", payoff_of: "STQ-404" })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_payoff_integrity.missing_answer_event"));
  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_payoff_integrity.payoff_not_after_setup"));
  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_payoff_integrity.missing_payoff_setup"));
});

function question(id: string, overrides: Record<string, unknown>) {
  return record("story_question_record", `test-story:${id}`, `stories/test-story/_source/story-questions/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    setup_kind: "dramatic_question",
    question_or_setup: "Who rang the bell?",
    salience: "high",
    audience_visibility: "explicit",
    source_event: "SE-1",
    source_records: [],
    status: "open",
    ...overrides
  });
}

function event(id: string, created_at_page: string) {
  return record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, { id, created_at_page });
}

function page(id: string, branchPath: string[]) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, { id, branch_path: branchPath });
}
