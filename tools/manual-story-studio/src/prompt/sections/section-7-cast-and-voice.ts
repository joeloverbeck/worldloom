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
  const blocks: string[] = [];
  if (input.pov_holder) {
    blocks.push(`**POV:** ${ctx.getCastTitle(input.pov_holder) ?? input.pov_holder}`);
  }
  blocks.push(...involved.map((c) => castTranslator(c, ctx)));
  return blocks.join("\n\n");
}
