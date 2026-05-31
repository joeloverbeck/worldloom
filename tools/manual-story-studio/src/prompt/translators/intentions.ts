import type { ManualIntentionRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

export const intentionsTranslator = (
  record: ManualIntentionRecord,
  ctx: TranslatorContext,
): string => {
  const holderTitle = ctx.getCastTitle(record.holder) ?? record.holder;
  const targetTitle =
    ctx.getCastTitle(record.target) ??
    ctx.getRecordTitle(record.target) ??
    record.target;
  const body = record.details.trim() || record.summary.trim() || record.title;
  const targetClause = targetTitle ? ` (regarding ${targetTitle})` : "";
  return `- ${holderTitle} intends: ${body}${targetClause}`;
};

registerTranslator("intentions", intentionsTranslator);
