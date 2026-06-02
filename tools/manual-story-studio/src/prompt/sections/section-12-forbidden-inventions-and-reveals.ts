import type {
  ManualRecord,
  ManualSecretRecord,
} from "../../schema/manual-story.js";
import { classifyManualRecord } from "../record-class.js";
import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_12_TITLE = "Forbidden Inventions and Forbidden Reveals";

export function emitSection12(input: SectionEmitterInput): SectionEmitResult {
  const lines: string[] = [];
  const consumed = new Set<string>();

  for (const c of input.cast) {
    if (!input.included_cast_ids.includes(c.id)) continue;
    let castConsumed = false;
    for (const phrase of c.prose_constraints.prose_must_not_imply) {
      const p = phrase.trim();
      if (p.length > 0) {
        lines.push(`- Do not let the prose imply: ${p}`);
        castConsumed = true;
      }
    }
    for (const phrase of c.prose_constraints.forbidden_inventions) {
      const p = phrase.trim();
      if (p.length > 0) {
        lines.push(`- Do not invent: ${p}`);
        castConsumed = true;
      }
    }
    for (const phrase of c.prose_constraints.voice_do_not_do) {
      const p = phrase.trim();
      if (p.length > 0) {
        lines.push(`- ${c.title}'s voice — do not do: ${p}`);
        castConsumed = true;
      }
    }
    if (castConsumed) consumed.add(c.id);
  }

  for (const r of input.records) {
    if (!r.active) continue;
    if (classifyManualRecord(r as ManualRecord) !== "secrets") continue;
    const sec = r as ManualSecretRecord;
    for (const tag of sec.forbidden_reveal_tags) {
      const t = tag.trim();
      if (t.length > 0) {
        lines.push(`- Do not let the prose reveal: ${t}`);
        consumed.add(r.id);
      }
    }
  }

  // SPEC-104: template-level forbidden_inventions[] from the selected
  // beat template (when any). Emitted after the per-cast and per-secret
  // entries so per-cast prose-constraint guidance reads first.
  if (input.template_forbidden_inventions) {
    for (const phrase of input.template_forbidden_inventions) {
      const p = phrase.trim();
      if (p.length > 0) lines.push(`- Template forbids inventing: ${p}`);
    }
  }

  if (lines.length === 0) {
    return {
      body: "(No forbidden inventions or reveals declared for the involved cast.)",
      consumed: [],
    };
  }
  return { body: lines.join("\n"), consumed: [...consumed] };
}
