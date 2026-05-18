import type { Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue } from "./utils.js";
import {
  createdAtPageId,
  defineStoryQuestionValidator,
  fail,
  pageForRecord,
  precedesInBranchPath,
  recordKey,
  storyKey
} from "./story-question-utils.js";

const VALIDATOR = "story_question_setup_predates_payoff";

export const storyQuestionSetupPredatesPayoff = defineStoryQuestionValidator(VALIDATOR, (question, _ctx, records): Verdict[] => {
  const parsed = asPlainRecord(question.parsed);
  const payoffOf = stringValue(parsed.payoff_of);
  if (payoffOf === undefined) {
    return [];
  }

  const setup = records.questionsById.get(recordKey("story_question_record", storyKey(question), payoffOf));
  if (setup === undefined) {
    return [fail(question, VALIDATOR, "story_question_setup_predates_payoff.missing_setup", `payoff_of references missing ${payoffOf}.`, { payoff_of: payoffOf })];
  }

  const setupPageId = createdAtPageId(setup);
  const payoffPageId = createdAtPageId(question);
  if (setupPageId === undefined || payoffPageId === undefined) {
    return [];
  }

  if (!precedesInBranchPath(setupPageId, payoffPageId, pageForRecord(question, records.pagesById))) {
    return [fail(question, VALIDATOR, "story_question_setup_predates_payoff.not_ancestor", `payoff_of ${payoffOf} must be on the ancestor branch path before ${payoffPageId}.`, {
      payoff_of: payoffOf,
      setup_page: setupPageId,
      payoff_page: payoffPageId
    })];
  }

  return [];
});
