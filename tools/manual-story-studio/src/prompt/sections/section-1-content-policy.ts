import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_1_TITLE = "Content Policy";

// Verbatim pass-through. The compose pipeline loads the canonical
// content-policy body from docs/prose-renderer-contract/content-policy.md
// at compose time and hands it to this emitter unchanged.
export function emitSection1(input: SectionEmitterInput): SectionEmitResult {
  return { body: input.content_policy_body.trim(), consumed: [] };
}
