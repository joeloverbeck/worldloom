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

const VALIDATOR = "story_question_payoff_integrity";

export const storyQuestionPayoffIntegrity = defineStoryQuestionValidator(VALIDATOR, (question, _ctx, records): Verdict[] => {
  const parsed = asPlainRecord(question.parsed);
  const status = stringValue(parsed.status);
  const verdicts: Verdict[] = [];

  if ((status === "answered" || status === "paid_off") && stringValue(parsed.answer_event) === undefined) {
    verdicts.push(fail(question, VALIDATOR, "story_question_payoff_integrity.missing_answer_event", `${status} STQ records must name answer_event.`));
  }

  const answerEventId = stringValue(parsed.answer_event);
  if (answerEventId !== undefined && !records.eventsById.has(recordKey("story_event_record", storyKey(question), answerEventId))) {
    verdicts.push(fail(question, VALIDATOR, "story_question_payoff_integrity.missing_answer_event", `answer_event references missing ${answerEventId}.`, { answer_event: answerEventId }));
  }

  const payoffOf = stringValue(parsed.payoff_of);
  if (payoffOf === undefined) {
    return verdicts;
  }

  const setup = records.questionsById.get(recordKey("story_question_record", storyKey(question), payoffOf));
  if (setup === undefined) {
    verdicts.push(fail(question, VALIDATOR, "story_question_payoff_integrity.missing_payoff_setup", `payoff_of references missing ${payoffOf}.`, { payoff_of: payoffOf }));
    return verdicts;
  }

  const setupPageId = createdAtPageId(setup);
  const payoffPageId = createdAtPageId(question);
  if (setupPageId !== undefined && payoffPageId !== undefined && !precedesInBranchPath(setupPageId, payoffPageId, pageForRecord(question, records.pagesById))) {
    verdicts.push(fail(question, VALIDATOR, "story_question_payoff_integrity.payoff_not_after_setup", `payoff_of ${payoffOf} must be created before ${stringValue(parsed.id) ?? question.node_id} in the branch path.`, {
      payoff_of: payoffOf,
      setup_page: setupPageId,
      payoff_page: payoffPageId
    }));
  }

  return verdicts;
});
