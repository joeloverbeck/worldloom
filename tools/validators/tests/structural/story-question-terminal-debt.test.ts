import assert from "node:assert/strict";
import test from "node:test";

import { storyQuestionTerminalDebt } from "../../src/structural/story-question-terminal-debt.js";
import { context, record } from "./helpers.js";

test("story_question_terminal_debt accepts terminal rationale naming high-salience open setup", async () => {
  const verdicts = await storyQuestionTerminalDebt.run(undefined, context([
    question(),
    page("The branch closes by inheriting STQ-1 into the sibling route.")
  ]));

  assert.deepEqual(verdicts, []);
});

test("story_question_terminal_debt warns when terminal pages omit high-salience open setup rationale", async () => {
  const verdicts = await storyQuestionTerminalDebt.run(undefined, context([
    question(),
    page("The branch ends.")
  ]));

  assert.equal(verdicts[0]?.severity, "warn");
  assert.equal(verdicts[0]?.code, "story_question_terminal_debt.unresolved_terminal_question");
});

test("story_question_terminal_debt participates in STQ pre-apply plans", () => {
  assert.equal(
    storyQuestionTerminalDebt.applies_to(context([], {
      run_mode: "pre-apply",
      patch_plan: {
        plan_id: "stq-test",
        target_world: "test",
        approval_token: "test-token",
        verdict: "ACCEPT",
        originating_skill: "test",
        expected_id_allocations: {},
        patches: [{ op: "create_stq_record", target_world: "test", payload: { story_slug: "test-story", record: {} } }]
      }
    })),
    true
  );
});

function question() {
  return record("story_question_record", "test-story:STQ-1", "stories/test-story/_source/story-questions/STQ-1.yaml", {
    id: "STQ-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    setup_kind: "dramatic_question",
    question_or_setup: "Who rang the bell?",
    salience: "high",
    audience_visibility: "explicit",
    source_event: "SE-1",
    source_records: [],
    status: "open"
  });
}

function page(terminal_rationale: string) {
  return record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
    id: "PG-2",
    state_snapshot: {
      active_records: { STQ: ["STQ-1"] },
      continuation: {
        terminal_status: "terminal_closed",
        terminal_rationale
      }
    }
  });
}
