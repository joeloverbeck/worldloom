import type {
  ManualSecretAudienceVisibility,
  ManualSecretRecord,
} from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

function audienceClause(visibility: ManualSecretAudienceVisibility): string {
  switch (visibility) {
    case "hidden":
      return "Do not let the prose reveal this secret";
    case "known_to_holders":
      return "Known only to the listed holders; do not disclose to other characters";
    case "rumored":
      return "Whispered among some characters; treat as unconfirmed rumor";
    case "partially_revealed":
      return "Partially exposed; the holders know what is and is not yet out";
    case "revealed":
      return "Publicly known; may be referenced openly";
  }
}

export const secretsTranslator = (
  record: ManualSecretRecord,
  ctx: TranslatorContext,
): string => {
  const body = record.details.trim() || record.summary.trim() || record.title;
  const lines: string[] = [`- Secret: ${body}`];
  if (record.held_by.length > 0) {
    const holderTitles = record.held_by.map(
      (id) => ctx.getCastTitle(id) ?? id,
    );
    lines.push(`  Held by: ${holderTitles.join(", ")}`);
  }
  lines.push(`  Audience: ${audienceClause(record.audience_visibility)}`);
  if (record.forbidden_reveal_tags.length > 0) {
    lines.push(
      `  Forbidden reveals: ${record.forbidden_reveal_tags.join(", ")}`,
    );
  }
  return lines.join("\n");
};

registerTranslator("secrets", secretsTranslator);
