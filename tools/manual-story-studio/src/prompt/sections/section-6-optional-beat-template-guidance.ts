import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_6_TITLE = "Optional Beat Template Guidance";

export function emitSection6(input: SectionEmitterInput): SectionEmitResult {
  const body = input.included_template_body;
  if (body === null || body.trim().length === 0) {
    return { body: "(none selected)", consumed: [] };
  }
  return { body: body.trim(), consumed: [] };
}
