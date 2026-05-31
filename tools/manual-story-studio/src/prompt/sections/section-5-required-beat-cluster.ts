import type { SectionEmitterInput } from "../types.js";

export const SECTION_5_TITLE = "Required Beat Cluster";

const DEFAULT_BEAT_COUNT = "2-5";

export function emitSection5(input: SectionEmitterInput): string {
  const raw = input.metadata.prompt_policy.default_beat_count;
  const beatCount = raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_BEAT_COUNT;
  return [
    `Render only the next ${beatCount} beats as continuous prose.`,
    "Begin from the current situation.",
    "Follow the manual moment directive.",
    "Stop as soon as the immediate exchange or action produces the first materially new response point: a decision pressure, emotional turn, information change, practical result, refusal, reveal-withheld, changed tactic, or newly exposed vulnerability.",
    "Do not summarize future consequences.",
    "Do not add choices.",
    "Do not add headings.",
    "Do not explain the prose.",
  ].join(" ");
}
