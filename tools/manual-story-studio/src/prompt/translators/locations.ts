import type { ManualLocationRecord } from "../../schema/manual-story.js";
import { registerTranslator } from "./index.js";

export const locationsTranslator = (
  record: ManualLocationRecord,
): string => {
  const blocks: string[] = [`### ${record.title}`];
  const summary = record.summary.trim();
  if (summary.length > 0) blocks.push(`Summary: ${summary}`);
  const details = record.details.trim();
  if (details.length > 0) blocks.push(`Details: ${details}`);
  return blocks.join("\n\n");
};

registerTranslator("locations", locationsTranslator);
