import assert from "node:assert/strict";
import test from "node:test";

import { storyQuestionGroundingIntegrity } from "../../src/structural/story-question-grounding-integrity.js";
import { context, record } from "./helpers.js";

test("story_question_grounding_integrity accepts source records active at created_at_page", async () => {
  const verdicts = await storyQuestionGroundingIntegrity.run(undefined, context([
    page("PG-2", { SF: ["SF-1"], BEL: ["BEL-1"], CLK: ["CLK-1"], STSEC: ["STSEC-1"] }),
    source("story_fact_record", "SF-1", "facts"),
    source("belief_record", "BEL-1", "beliefs"),
    source("pressure_clock_record", "CLK-1", "clocks"),
    source("story_secret_record", "STSEC-1", "secrets"),
    question(["SF-1", "BEL-1", "CLK-1", "STSEC-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("story_question_grounding_integrity rejects missing and inactive source records", async () => {
  const verdicts = await storyQuestionGroundingIntegrity.run(undefined, context([
    page("PG-2", { SF: ["SF-1"] }),
    source("story_fact_record", "SF-1", "facts"),
    source("belief_record", "BEL-1", "beliefs"),
    question(["SF-1", "BEL-1", "STOBJ-404", "M-1"])
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_grounding_integrity.source_not_active"));
  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_grounding_integrity.missing_source_record"));
  assert.ok(verdicts.some((verdict) => verdict.code === "story_question_grounding_integrity.invalid_source_record"));
});

function question(source_records: string[]) {
  return record("story_question_record", "test-story:STQ-1", "stories/test-story/_source/story-questions/STQ-1.yaml", {
    id: "STQ-1",
    story_id: "STORY-1",
    created_at_page: "PG-2",
    setup_kind: "dramatic_question",
    question_or_setup: "Who rang the bell?",
    salience: "high",
    audience_visibility: "explicit",
    source_event: "SE-1",
    source_records,
    status: "open"
  });
}

function source(nodeType: string, id: string, subdir: string) {
  return record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, { id, created_at_page: "PG-1" });
}

function page(id: string, active_records: Record<string, string[]>) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
    id,
    state_snapshot: { active_records }
  });
}
