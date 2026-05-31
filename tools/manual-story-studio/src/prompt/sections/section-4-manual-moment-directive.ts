import type { SectionEmitterInput } from "../types.js";

export const SECTION_4_TITLE = "Manual Moment Directive";

export function emitSection4(input: SectionEmitterInput): string {
  return input.moment_directive.trim();
}
