import type {
  ManualClockDirection,
  ManualClockRecord,
} from "../../schema/manual-story.js";
import { registerTranslator } from "./index.js";

function directionPhrase(direction: ManualClockDirection): string {
  switch (direction) {
    case "rising":
      return "rising";
    case "falling":
      return "falling";
    case "stalled":
      return "stalled";
    case "unset":
    default:
      return "";
  }
}

export const clocksTranslator = (record: ManualClockRecord): string => {
  const body = record.details.trim() || record.summary.trim() || "";
  const lead = body.length > 0
    ? `- Clock — ${record.title}: ${body}`
    : `- Clock — ${record.title}`;
  const direction = directionPhrase(record.direction);
  const axis = record.axis.trim();
  if (direction.length === 0) return lead;
  const axisClause = axis.length > 0 ? `${axis} ` : "";
  return `${lead}\n  Currently ${axisClause}${direction} (value: ${record.value})`;
};

registerTranslator("clocks", clocksTranslator);
