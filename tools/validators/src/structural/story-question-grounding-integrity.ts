import type { Verdict } from "../framework/types.js";
import {
  defineStoryQuestionValidator,
  fail,
  isActiveAtQuestionPage,
  sourceRecord,
  sourceRecordIds,
  sourceRecordTypeFor
} from "./story-question-utils.js";

const VALIDATOR = "story_question_grounding_integrity";

export const storyQuestionGroundingIntegrity = defineStoryQuestionValidator(VALIDATOR, (question, _ctx, records): Verdict[] => {
  const verdicts: Verdict[] = [];
  for (const id of sourceRecordIds(question)) {
    if (sourceRecordTypeFor(id) === undefined) {
      verdicts.push(fail(question, VALIDATOR, "story_question_grounding_integrity.invalid_source_record", `source_records entry ${id} is not an allowed STQ source record id.`, { source_record: id }));
      continue;
    }
    if (sourceRecord(records, question, id) === undefined) {
      verdicts.push(fail(question, VALIDATOR, "story_question_grounding_integrity.missing_source_record", `source_records entry ${id} references a missing record.`, { source_record: id }));
      continue;
    }
    if (!isActiveAtQuestionPage(question, id, records.pagesById)) {
      verdicts.push(fail(question, VALIDATOR, "story_question_grounding_integrity.source_not_active", `source_records entry ${id} is not active at the STQ created_at_page snapshot.`, { source_record: id }));
    }
  }
  return verdicts;
});
