import type { SectionEmitResult } from "../types.js";

export const SECTION_15_TITLE = "Output Instruction";

export function emitSection15(): SectionEmitResult {
  return {
    body: "Output prose only. No commentary. No Markdown headings. No bullet points. No notes. Do not use the words 'page', 'scene', 'act', 'arc', 'midpoint', 'climax', or any other narrative-structure language.",
    consumed: [],
  };
}
