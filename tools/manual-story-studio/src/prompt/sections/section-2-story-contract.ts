import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_2_TITLE = "Story Contract";

export function emitSection2(input: SectionEmitterInput): SectionEmitResult {
  const m = input.metadata;
  const sc = m.story_contract;
  const pp = sc.prose_preferences;
  const lines: string[] = [
    `**Title:** ${m.title}`,
    `**Premise:** ${sc.premise}`,
    `**Tone:** ${sc.tone}`,
    `**Point of view:** ${sc.pov}`,
    `**Tense:** ${sc.tense}`,
    `**Content intensity:** ${sc.content_intensity}`,
    `**Explicitness:** ${sc.explicitness}`,
    `**Language register:** ${sc.language_register}`,
    "",
    "**Prose preferences:**",
    `- Psychic distance: ${pp.psychic_distance}`,
    `- Dialogue density: ${pp.dialogue_density}`,
    `- Interiority: ${pp.interiority}`,
    `- Paragraphing: ${pp.paragraphing}`,
  ];
  return { body: lines.join("\n"), consumed: [] };
}
