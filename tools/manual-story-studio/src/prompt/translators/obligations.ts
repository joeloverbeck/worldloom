import type { ManualObligationRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

export const obligationsTranslator = (
  record: ManualObligationRecord,
  ctx: TranslatorContext,
): string => {
  const owedBy = ctx.getCastTitle(record.owed_by) ?? record.owed_by;
  const owedTo = ctx.getCastTitle(record.owed_to) ?? record.owed_to;
  const body = record.details.trim() || record.summary.trim() || record.title;
  return `- Open obligation (${owedBy} → ${owedTo}): ${body}\n  Urgency: ${record.urgency}`;
};

registerTranslator("obligations", obligationsTranslator);
