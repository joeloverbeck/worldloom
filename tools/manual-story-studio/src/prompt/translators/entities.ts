import type { ManualEntityRecord } from "../../schema/manual-story.js";
import { registerTranslator } from "./index.js";

export const entitiesTranslator = (record: ManualEntityRecord): string => {
  const summary = record.summary.trim();
  const lead = summary.length > 0
    ? `- ${record.title}: ${summary}`
    : `- ${record.title}`;
  const details = record.details.trim();
  if (details.length === 0) return lead;
  return `${lead}\n  Details: ${details}`;
};

registerTranslator("entities", entitiesTranslator);
