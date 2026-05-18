import assert from "node:assert/strict";
import test from "node:test";

import { storyQuestionSetupPredatesPayoff } from "../../src/structural/story-question-setup-predates-payoff.js";
import { context, record } from "./helpers.js";

test("story_question_setup_predates_payoff accepts payoff links to ancestor STQs", async () => {
  const verdicts = await storyQuestionSetupPredatesPayoff.run(undefined, context([
    page("PG-1", ["PG-1"]),
    page("PG-3", ["PG-1", "PG-2", "PG-3"]),
    question("STQ-1", "PG-1", {}),
    question("STQ-2", "PG-3", { payoff_of: "STQ-1" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("story_question_setup_predates_payoff rejects sibling-branch and missing payoff setup links", async () => {
  const verdicts = await storyQuestionSetupPredatesPayoff.run(undefined, context([
    page("PG-1", ["PG-1"]),
    page("PG-9", ["PG-1", "PG-9"]),
    page("PG-3", ["PG-1", "PG-2", "PG-3"]),
    question("STQ-1", "PG-9", {}),
    question("STQ-2", "PG-3", { payoff_of: "STQ-1" }),
    question("STQ-3", "PG-3", { payoff_of: "STQ-404" })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_setup_predates_payoff.not_ancestor"));
  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_setup_predates_payoff.missing_setup"));
});

function question(id: string, created_at_page: string, overrides: Record<string, unknown>) {
  return record("story_question_record", `test-story:${id}`, `stories/test-story/_source/story-questions/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page,
    setup_kind: "dramatic_question",
    question_or_setup: "Who rang the bell?",
    salience: "medium",
    audience_visibility: "explicit",
    source_event: "SE-1",
    source_records: [],
    status: "open",
    ...overrides
  });
}

function page(id: string, branchPath: string[]) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, { id, branch_path: branchPath });
}
