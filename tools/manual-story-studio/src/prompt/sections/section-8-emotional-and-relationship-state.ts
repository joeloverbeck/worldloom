import type {
  ManualEmotionRecord,
  ManualRecord,
  ManualRelationshipRecord,
} from "../../schema/manual-story.js";
import { classifyManualRecord } from "../record-class.js";
import { emotionsTranslator } from "../translators/emotions.js";
import { relationshipsTranslator } from "../translators/relationships.js";
import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput } from "../types.js";

export const SECTION_8_TITLE = "Emotional and Relationship State";

function relevantEmotion(
  record: ManualEmotionRecord,
  involvedCastIds: string[],
): boolean {
  return involvedCastIds.includes(record.holder);
}

function relevantRelationship(
  record: ManualRelationshipRecord,
  involvedCastIds: string[],
): boolean {
  return record.between.some((id) => involvedCastIds.includes(id));
}

export function emitSection8(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): string {
  const emotions: string[] = [];
  const relationships: string[] = [];
  for (const r of input.records) {
    if (!r.active) continue;
    const cls = classifyManualRecord(r as ManualRecord);
    if (cls === "emotions" && relevantEmotion(r as ManualEmotionRecord, input.included_cast_ids)) {
      emotions.push(emotionsTranslator(r as ManualEmotionRecord, ctx));
    } else if (
      cls === "relationships" &&
      relevantRelationship(r as ManualRelationshipRecord, input.included_cast_ids)
    ) {
      relationships.push(relationshipsTranslator(r as ManualRelationshipRecord, ctx));
    }
  }
  const blocks: string[] = [];
  if (emotions.length > 0) {
    blocks.push(`**Emotions:**\n${emotions.join("\n")}`);
  }
  if (relationships.length > 0) {
    blocks.push(`**Relationships:**\n\n${relationships.join("\n\n")}`);
  }
  return blocks.length > 0
    ? blocks.join("\n\n")
    : "(No active emotion or relationship records for the involved cast.)";
}
