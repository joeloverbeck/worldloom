import { castTranslator } from "../translators/cast.js";
import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput, SectionEmitResult } from "../types.js";

export const SECTION_7_TITLE = "Cast and Voice";

export function emitSection7(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): SectionEmitResult {
  const involved = input.cast.filter((c) =>
    input.included_cast_ids.includes(c.id),
  );
  if (involved.length === 0) {
    return {
      body: "(No cast members are involved in this moment.)",
      consumed: [],
    };
  }
  const blocks: string[] = [];
  const consumed = new Set<string>();
  if (input.pov_holder) {
    blocks.push(`**POV:** ${ctx.getCastTitle(input.pov_holder) ?? input.pov_holder}`);
    if (input.included_cast_ids.includes(input.pov_holder)) {
      consumed.add(input.pov_holder);
    }
  }
  for (const c of involved) {
    blocks.push(castTranslator(c, ctx));
    consumed.add(c.id);
  }
  return { body: blocks.join("\n\n"), consumed: [...consumed] };
}
