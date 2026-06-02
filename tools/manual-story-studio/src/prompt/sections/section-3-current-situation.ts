import type { ManualRecord } from "../../schema/manual-story.js";
import { classifyManualRecord } from "../record-class.js";
import { getTranslator, type TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput } from "../types.js";

export const SECTION_3_TITLE = "Current Situation";

function isCentralOrHigh(record: ManualRecord): boolean {
  return record.importance === "high" || record.importance === "central";
}

function referencesIncludedCast(
  record: ManualRecord,
  involvedCastIds: string[],
): boolean {
  const obj = record as unknown as {
    refs?: { characters?: string[] };
    holder?: string;
    owed_by?: string;
    owed_to?: string;
    subject?: string;
    held_by?: string[];
    between?: string[];
    current_holder?: string | null;
  };
  const characters = obj.refs?.characters ?? [];
  for (const id of characters) {
    if (involvedCastIds.includes(id)) return true;
  }
  const fields: Array<string | null | undefined> = [
    obj.holder,
    obj.owed_by,
    obj.owed_to,
    obj.subject,
    obj.current_holder,
  ];
  for (const f of fields) {
    if (typeof f === "string" && involvedCastIds.includes(f)) return true;
  }
  for (const id of obj.held_by ?? []) {
    if (involvedCastIds.includes(id)) return true;
  }
  for (const id of obj.between ?? []) {
    if (involvedCastIds.includes(id)) return true;
  }
  return false;
}

function translateRecord(
  record: ManualRecord,
  ctx: TranslatorContext,
): string {
  const cls = classifyManualRecord(record);
  if (cls) {
    const t = getTranslator(cls);
    if (t) return t(record, ctx);
  }
  const s = record.summary.trim() || record.title;
  return `- ${record.title}: ${s}`;
}

export function emitSection3(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): string {
  const currentHandoffRaw = input.current_handoff_summary ?? "";
  const currentHandoff = currentHandoffRaw.trim();
  const pinned = input.records.filter(
    (r) =>
      isCentralOrHigh(r) || referencesIncludedCast(r, input.included_cast_ids),
  );
  const lines: string[] = [];
  if (currentHandoff.length > 0) {
    lines.push("**Author's current handoff:**");
    lines.push("");
    lines.push(currentHandoffRaw);
  } else if (input.included_cast_ids.length > 0) {
    const castTitles = input.cast
      .filter((c) => input.included_cast_ids.includes(c.id))
      .map((c) => c.title);
    if (castTitles.length > 0) {
      lines.push(`**In the moment:** ${castTitles.join(", ")}.`);
    }
  }
  if (currentHandoff.length === 0 && pinned.length > 0) {
    lines.push("");
    lines.push("**Pinned situation context:**");
    for (const r of pinned) {
      lines.push(translateRecord(r, ctx));
    }
  }
  if (input.recent_segment_last_paragraph) {
    if (lines.length > 0) lines.push("");
    lines.push("**Most recent prose (last paragraph):**");
    lines.push("");
    lines.push(input.recent_segment_last_paragraph.trim());
  }
  if (lines.length === 0) {
    return "(No pinned context. The author has not selected involved cast or relevant records.)";
  }
  return lines.join("\n");
}
