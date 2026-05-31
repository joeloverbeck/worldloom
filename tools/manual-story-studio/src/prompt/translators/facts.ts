import type { ManualFactRecord } from "../../schema/manual-story.js";
import { registerTranslator } from "./index.js";

export const factsTranslator = (record: ManualFactRecord): string => {
  const details = record.details.trim();
  const summary = record.summary.trim();
  const body = details.length > 0 ? details : summary;
  if (body.length === 0) return `- ${record.title}`;
  return `- ${record.title}: ${body}`;
};

registerTranslator("facts", factsTranslator);
