import type { ManualObjectRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

export const objectsTranslator = (
  record: ManualObjectRecord,
  ctx: TranslatorContext,
): string => {
  const summary = record.summary.trim();
  const lead = summary.length > 0
    ? `- ${record.title}: ${summary}`
    : `- ${record.title}`;
  const contextLines: string[] = [];
  if (record.current_holder) {
    const holderTitle =
      ctx.getCastTitle(record.current_holder) ??
      ctx.getRecordTitle(record.current_holder) ??
      record.current_holder;
    contextLines.push(`Current holder: ${holderTitle}`);
  }
  if (record.current_location) {
    const locTitle =
      ctx.getRecordTitle(record.current_location) ??
      record.current_location;
    contextLines.push(`Current location: ${locTitle}`);
  }
  const details = record.details.trim();
  if (details.length > 0) contextLines.push(`Details: ${details}`);
  if (contextLines.length === 0) return lead;
  return `${lead}\n  ${contextLines.join("\n  ")}`;
};

registerTranslator("objects", objectsTranslator);
