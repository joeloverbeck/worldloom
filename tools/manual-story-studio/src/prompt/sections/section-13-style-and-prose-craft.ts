import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_13_TITLE = "Style and Prose Craft";

// Verbatim pass-through from docs/manual-story-studio/prose-craft-contract.md.
export function emitSection13(input: SectionEmitterInput): SectionEmitResult {
  return { body: input.prose_craft_contract_body.trim(), consumed: [] };
}
