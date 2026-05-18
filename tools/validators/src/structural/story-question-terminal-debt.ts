import type { Context, IndexedRecord, Verdict } from "../framework/types.js";
import { asPlainRecord, queryRecordsByType, stringValue } from "./utils.js";
import { defineStoryQuestionValidator, storyKey, storyQuestionId, warn } from "./story-question-utils.js";

const VALIDATOR = "story_question_terminal_debt";
const OPEN_STATUSES = new Set(["open", "complicated"]);

export const storyQuestionTerminalDebt = defineStoryQuestionValidator(VALIDATOR, async (question, ctx): Promise<Verdict[]> => {
  const parsed = asPlainRecord(question.parsed);
  const status = stringValue(parsed.status);
  if (stringValue(parsed.salience) !== "high" || status === undefined || !OPEN_STATUSES.has(status)) {
    return [];
  }

  const id = storyQuestionId(question);
  const setup = stringValue(parsed.question_or_setup);
  const terminalPages = await terminalPagesForQuestion(ctx, question, id);
  const verdicts: Verdict[] = [];
  for (const page of terminalPages) {
    const pageParsed = asPlainRecord(page.parsed);
    const continuation = asPlainRecord(asPlainRecord(pageParsed.state_snapshot).continuation);
    const rationale = stringValue(continuation.terminal_rationale);
    if (rationale !== undefined && (rationale.includes(id) || (setup !== undefined && rationale.includes(setup)))) {
      continue;
    }
    verdicts.push(warn(question, VALIDATOR, "story_question_terminal_debt.unresolved_terminal_question", `${id} is high-salience open setup in terminal page ${stringValue(pageParsed.id) ?? page.node_id} without terminal_rationale naming the STQ id or setup.`, { page: stringValue(pageParsed.id) ?? page.node_id }));
  }
  return verdicts;
});

async function terminalPagesForQuestion(ctx: Context, question: IndexedRecord, questionId: string): Promise<IndexedRecord[]> {
  const pages = await queryRecordsByType(ctx, "page_record");
  return pages.filter((page) => {
    if (storyKey(page) !== storyKey(question)) {
      return false;
    }
    const snapshot = asPlainRecord(asPlainRecord(page.parsed).state_snapshot);
    const activeRecords = asPlainRecord(snapshot.active_records);
    const activeQuestions = activeRecords.STQ;
    if (!Array.isArray(activeQuestions) || !activeQuestions.includes(questionId)) {
      return false;
    }
    const continuation = asPlainRecord(snapshot.continuation);
    const status = stringValue(continuation.terminal_status);
    return status === "terminal_closed" || status === "branch_pause";
  });
}
