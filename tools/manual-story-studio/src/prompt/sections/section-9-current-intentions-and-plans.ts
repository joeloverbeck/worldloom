import type {
  ManualIntentionRecord,
  ManualPlanRecord,
  ManualRecord,
} from "../../schema/manual-story.js";
import { classifyManualRecord } from "../record-class.js";
import { intentionsTranslator } from "../translators/intentions.js";
import { plansTranslator } from "../translators/plans.js";
import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_9_TITLE = "Current Intentions and Plans";

export function emitSection9(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): SectionEmitResult {
  const intentions: string[] = [];
  const plans: string[] = [];
  const consumed: string[] = [];
  for (const r of input.records) {
    if (!r.active) continue;
    const cls = classifyManualRecord(r as ManualRecord);
    if (cls === "intentions") {
      const rec = r as ManualIntentionRecord;
      if (input.included_cast_ids.includes(rec.holder)) {
        intentions.push(intentionsTranslator(rec, ctx));
        consumed.push(r.id);
      }
    } else if (cls === "plans") {
      const rec = r as ManualPlanRecord;
      if (input.included_cast_ids.includes(rec.holder)) {
        plans.push(plansTranslator(rec, ctx));
        consumed.push(r.id);
      }
    }
  }
  const blocks: string[] = [];
  if (intentions.length > 0) blocks.push(`**Intentions:**\n${intentions.join("\n")}`);
  if (plans.length > 0) blocks.push(`**Plans:**\n${plans.join("\n")}`);
  const body = blocks.length > 0
    ? blocks.join("\n\n")
    : "(No active intentions or plans for the involved cast.)";
  return { body, consumed };
}
