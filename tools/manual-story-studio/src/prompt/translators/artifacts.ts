import type { ManualArtifactRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

export const artifactsTranslator = (
  record: ManualArtifactRecord,
  ctx: TranslatorContext,
): string => {
  const summary = record.summary.trim();
  const lead = summary.length > 0
    ? `- Artifact — ${record.title}: ${summary}`
    : `- Artifact — ${record.title}`;
  const lines: string[] = [lead];
  if (record.current_holder) {
    const holder =
      ctx.getCastTitle(record.current_holder) ??
      ctx.getRecordTitle(record.current_holder) ??
      record.current_holder;
    lines.push(`  Current holder: ${holder}`);
  }
  const provenance = record.provenance.trim();
  if (provenance.length > 0) lines.push(`  Provenance: ${provenance}`);
  const details = record.details.trim();
  if (details.length > 0) lines.push(`  Details: ${details}`);
  return lines.join("\n");
};

registerTranslator("artifacts", artifactsTranslator);
