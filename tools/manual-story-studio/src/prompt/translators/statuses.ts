import type { ManualStatusRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

export const statusesTranslator = (
  record: ManualStatusRecord,
  ctx: TranslatorContext,
): string => {
  const subjectTitle =
    ctx.getCastTitle(record.subject) ??
    ctx.getRecordTitle(record.subject) ??
    record.subject;
  const subjectClause = subjectTitle ? ` (subject: ${subjectTitle})` : "";
  const summary = record.summary.trim();
  const bullet = summary.length > 0
    ? `- ${record.title}${subjectClause}: ${summary}`
    : `- ${record.title}${subjectClause}`;
  const activeMarker = record.active ? "\n  (currently active)" : "";
  const details = record.details.trim();
  const detailsLine = details.length > 0 ? `\n  Details: ${details}` : "";
  return `${bullet}${activeMarker}${detailsLine}`;
};

registerTranslator("statuses", statusesTranslator);
