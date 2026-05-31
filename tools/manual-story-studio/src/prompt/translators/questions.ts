import type { ManualQuestionRecord } from "../../schema/manual-story.js";
import { registerTranslator } from "./index.js";

export const questionsTranslator = (
  record: ManualQuestionRecord,
): string => {
  const lines: string[] = [`- Open question: ${record.title}`];
  const summary = record.summary.trim();
  if (summary.length > 0) lines.push(`  Context: ${summary}`);
  const details = record.details.trim();
  if (details.length > 0) lines.push(`  Detail: ${details}`);
  const conditions = record.must_not_resolve_unless.filter(
    (s) => s.trim().length > 0,
  );
  if (conditions.length > 0) {
    lines.push(
      `  Reveal: Do not let the prose resolve this question unless: ${conditions.join("; ")}`,
    );
  } else {
    lines.push("  Reveal: May be referenced; resolution is at author discretion");
  }
  return lines.join("\n");
};

registerTranslator("questions", questionsTranslator);
