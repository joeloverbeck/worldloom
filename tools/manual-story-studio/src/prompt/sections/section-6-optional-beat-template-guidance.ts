import type { SectionEmitterInput } from "../types.js";

export const SECTION_6_TITLE = "Optional Beat Template Guidance";

export function emitSection6(input: SectionEmitterInput): string {
  const body = input.included_template_body;
  if (body === null || body.trim().length === 0) {
    return "(none selected)";
  }
  return body.trim();
}
