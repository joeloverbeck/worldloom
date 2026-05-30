import type { ManualThreadRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

export const threadsTranslator = (
  record: ManualThreadRecord,
  ctx: TranslatorContext,
): string => {
  const subjectTitle =
    ctx.getCastTitle(record.subject) ??
    ctx.getRecordTitle(record.subject) ??
    record.subject;
  const lines: string[] = [`### Thread — ${record.title}`];
  lines.push(`Subject: ${subjectTitle}`);
  lines.push(`Status: ${record.status}`);
  const summary = record.summary.trim();
  if (summary.length > 0) lines.push(`Summary: ${summary}`);
  const details = record.details.trim();
  if (details.length > 0) lines.push(`Current state: ${details}`);
  return lines.join("\n\n");
};

registerTranslator("threads", threadsTranslator);
