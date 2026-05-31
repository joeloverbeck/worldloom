import type {
  ManualRelationshipAxes,
  ManualRelationshipRecord,
} from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

function formatAxes(axes: ManualRelationshipAxes): string {
  const parts: string[] = [];
  const keys: Array<keyof ManualRelationshipAxes> = [
    "trust",
    "fear",
    "attraction",
    "power",
    "respect",
    "familiarity",
  ];
  for (const k of keys) {
    if (axes[k] && axes[k] !== "unset") {
      parts.push(`${k}: ${axes[k]}`);
    }
  }
  return parts.join("; ");
}

export const relationshipsTranslator = (
  record: ManualRelationshipRecord,
  ctx: TranslatorContext,
): string => {
  const [aId, bId] = record.between;
  const aTitle = ctx.getCastTitle(aId) ?? aId;
  const bTitle = ctx.getCastTitle(bId) ?? bId;
  const heading = `### ${aTitle} ↔ ${bTitle}`;
  const lines: string[] = [heading];
  const axesLine = formatAxes(record.axes);
  if (axesLine.length > 0) lines.push(`Axes: ${axesLine}`);
  if (record.dominant_axis && record.dominant_axis.trim().length > 0) {
    lines.push(`Dominant axis: ${record.dominant_axis.trim()}`);
  }
  const body = record.details.trim() || record.summary.trim();
  if (body.length > 0) lines.push(`Current state: ${body}`);
  return lines.join("\n\n");
};

registerTranslator("relationships", relationshipsTranslator);
