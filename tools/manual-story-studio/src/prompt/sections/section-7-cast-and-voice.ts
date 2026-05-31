import { castTranslator } from "../translators/cast.js";
import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput } from "../types.js";

export const SECTION_7_TITLE = "Cast and Voice";

export function emitSection7(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): string {
  const involved = input.cast.filter((c) =>
    input.included_cast_ids.includes(c.id),
  );
  if (involved.length === 0) {
    return "(No cast members are involved in this moment.)";
  }
  return involved.map((c) => castTranslator(c, ctx)).join("\n\n");
}
