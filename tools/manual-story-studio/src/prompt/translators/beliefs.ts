import type { ManualBeliefRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

function truthRelationClause(record: ManualBeliefRecord): string {
  switch (record.truth_relation) {
    case "true":
      return " (and the belief is true)";
    case "false":
      return " (the belief is mistaken)";
    case "partly_true":
      return " (partly true; partly mistaken)";
    case "contested":
      return " (contested; other characters disagree)";
    case "unknown":
    default:
      return "";
  }
}

function confidenceClause(record: ManualBeliefRecord): string {
  switch (record.confidence) {
    case "low":
      return " Confidence: tentative.";
    case "medium":
      return " Confidence: moderate.";
    case "high":
      return " Confidence: strong.";
    case "certain":
      return " Confidence: certain.";
  }
}

export const beliefsTranslator = (
  record: ManualBeliefRecord,
  ctx: TranslatorContext,
): string => {
  const holderTitle = ctx.getCastTitle(record.holder) ?? record.holder;
  const body = record.details.trim() || record.summary.trim() || record.title;
  return `- ${holderTitle} thinks: ${body}${truthRelationClause(record)}.${confidenceClause(record)}`;
};

registerTranslator("beliefs", beliefsTranslator);
