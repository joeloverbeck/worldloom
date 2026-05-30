import type {
  ManualCharacterRecord,
  ManualFactRecord,
  ManualLocationRecord,
  ManualObjectRecord,
  ManualRecord,
} from "../../schema/manual-story.js";
import { classifyManualRecord } from "../record-class.js";
import { factsTranslator } from "../translators/facts.js";
import { locationsTranslator } from "../translators/locations.js";
import { objectsTranslator } from "../translators/objects.js";
import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput } from "../types.js";

export const SECTION_11_TITLE = "Physical Continuity";

function bodyAndPresenceForCast(record: ManualCharacterRecord): string {
  const b = record.body_and_presence;
  const parts: string[] = [];
  if (b.physicality.trim().length > 0) parts.push(b.physicality.trim());
  if (b.body_limits.trim().length > 0) parts.push(`limits: ${b.body_limits.trim()}`);
  if (b.habitual_gestures.trim().length > 0)
    parts.push(`gestures: ${b.habitual_gestures.trim()}`);
  if (b.clothing_or_presentation.trim().length > 0)
    parts.push(`presentation: ${b.clothing_or_presentation.trim()}`);
  if (parts.length === 0) return `- ${record.title}: (no body details on file)`;
  return `- ${record.title}: ${parts.join("; ")}`;
}

export function emitSection11(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): string {
  const locations: string[] = [];
  const objects: string[] = [];
  const facts: string[] = [];
  for (const r of input.records) {
    if (!r.active) continue;
    const cls = classifyManualRecord(r as ManualRecord);
    if (cls === "locations") {
      locations.push(locationsTranslator(r as ManualLocationRecord));
    } else if (cls === "objects") {
      objects.push(objectsTranslator(r as ManualObjectRecord, ctx));
    } else if (cls === "facts") {
      facts.push(factsTranslator(r as ManualFactRecord));
    }
  }
  const bodies: string[] = [];
  for (const c of input.cast) {
    if (input.included_cast_ids.includes(c.id)) {
      bodies.push(bodyAndPresenceForCast(c));
    }
  }
  const blocks: string[] = [];
  if (locations.length > 0)
    blocks.push(`**Locations:**\n\n${locations.join("\n\n")}`);
  if (bodies.length > 0)
    blocks.push(`**Bodies (involved cast):**\n${bodies.join("\n")}`);
  if (objects.length > 0)
    blocks.push(`**Objects/props:**\n${objects.join("\n")}`);
  if (facts.length > 0)
    blocks.push(`**Recent concrete facts:**\n${facts.join("\n")}`);
  return blocks.length > 0
    ? blocks.join("\n\n")
    : "(No physical-continuity records pinned for this moment.)";
}
