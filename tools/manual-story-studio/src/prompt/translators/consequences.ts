import type { ManualConsequenceRecord } from "../../schema/manual-story.js";
import { registerTranslator } from "./index.js";

export const consequencesTranslator = (
  record: ManualConsequenceRecord,
): string => {
  const status = record.pending ? "Pending consequence" : "Resolved consequence";
  const body = record.details.trim() || record.summary.trim() || record.title;
  const lines: string[] = [`- ${status}: ${body}`];
  lines.push(`  Urgency: ${record.urgency}`);
  return lines.join("\n");
};

registerTranslator("consequences", consequencesTranslator);
