import type { SectionEmitterInput } from "../types.js";

export const SECTION_13_TITLE = "Style and Prose Craft";

// Verbatim pass-through from docs/manual-story-studio/prose-craft-contract.md.
export function emitSection13(input: SectionEmitterInput): string {
  return input.prose_craft_contract_body.trim();
}
