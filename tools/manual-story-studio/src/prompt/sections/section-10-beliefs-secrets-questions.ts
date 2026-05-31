import type {
  ManualBeliefRecord,
  ManualQuestionRecord,
  ManualRecord,
  ManualSecretRecord,
} from "../../schema/manual-story.js";
import { classifyManualRecord } from "../record-class.js";
import { beliefsTranslator } from "../translators/beliefs.js";
import { questionsTranslator } from "../translators/questions.js";
import { secretsTranslator } from "../translators/secrets.js";
import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput } from "../types.js";

export const SECTION_10_TITLE = "Relevant Beliefs, Secrets, and Open Questions";

export function emitSection10(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): string {
  const beliefs: string[] = [];
  const secrets: string[] = [];
  const questions: string[] = [];
  for (const r of input.records) {
    if (!r.active) continue;
    const cls = classifyManualRecord(r as ManualRecord);
    if (cls === "beliefs") {
      const rec = r as ManualBeliefRecord;
      if (input.included_cast_ids.includes(rec.holder)) {
        beliefs.push(beliefsTranslator(rec, ctx));
      }
    } else if (cls === "secrets") {
      const rec = r as ManualSecretRecord;
      // Surface a secret if any holder overlaps the involved cast, or the
      // secret is touched_by_refs (refs.characters intersects involved cast).
      const holderHit = rec.held_by.some((id) =>
        input.included_cast_ids.includes(id),
      );
      const refsHit = (rec.refs?.characters ?? []).some((id) =>
        input.included_cast_ids.includes(id),
      );
      if (holderHit || refsHit) {
        secrets.push(secretsTranslator(rec, ctx));
      }
    } else if (cls === "questions") {
      questions.push(questionsTranslator(r as ManualQuestionRecord));
    }
  }
  const blocks: string[] = [];
  if (beliefs.length > 0) blocks.push(`**Beliefs:**\n${beliefs.join("\n")}`);
  if (secrets.length > 0) blocks.push(`**Secrets:**\n${secrets.join("\n")}`);
  if (questions.length > 0) blocks.push(`**Open questions:**\n${questions.join("\n\n")}`);
  return blocks.length > 0
    ? blocks.join("\n\n")
    : "(No active beliefs, secrets, or open questions to surface.)";
}
