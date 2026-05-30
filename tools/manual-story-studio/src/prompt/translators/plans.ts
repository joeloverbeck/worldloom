import type {
  ManualPlanRecord,
  ManualPlanVisibility,
} from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

function visibilityClause(visibility: ManualPlanVisibility): string {
  switch (visibility) {
    case "private":
      return "private — held internally";
    case "shared":
      return "shared with one or more confidants";
    case "factional":
      return "known within a faction";
    case "public":
      return "publicly known";
  }
}

export const plansTranslator = (
  record: ManualPlanRecord,
  ctx: TranslatorContext,
): string => {
  const holderTitle = ctx.getCastTitle(record.holder) ?? record.holder;
  const targetTitle =
    ctx.getCastTitle(record.target) ??
    ctx.getRecordTitle(record.target) ??
    record.target;
  const body = record.details.trim() || record.summary.trim() || record.title;
  const lines: string[] = [`- Plan (${holderTitle}): ${body}`];
  if (targetTitle) lines.push(`  Target/object: ${targetTitle}`);
  lines.push(`  Visibility: ${visibilityClause(record.visibility)}`);
  return lines.join("\n");
};

registerTranslator("plans", plansTranslator);
