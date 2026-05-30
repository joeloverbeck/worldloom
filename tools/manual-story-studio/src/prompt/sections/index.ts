// Barrel for the 15 prompt section emitters.
//
// Section order, headings, and numbering are fixed by SPEC-102 §Scope item 3.
// No emitter prints its own `## N. ...` heading; this barrel owns heading
// injection so the §-number/title pair is impossible to drift between
// section files. Adding or removing a section requires editing both this
// file and SPEC-102 §Scope item 3 in the same diff.

import type { TranslatorContext } from "../translators/index.js";
import type { SectionEmitterInput } from "../types.js";
import { emitSection1, SECTION_1_TITLE } from "./section-1-content-policy.js";
import { emitSection2, SECTION_2_TITLE } from "./section-2-story-contract.js";
import { emitSection3, SECTION_3_TITLE } from "./section-3-current-situation.js";
import { emitSection4, SECTION_4_TITLE } from "./section-4-manual-moment-directive.js";
import { emitSection5, SECTION_5_TITLE } from "./section-5-required-beat-cluster.js";
import { emitSection6, SECTION_6_TITLE } from "./section-6-optional-beat-template-guidance.js";
import { emitSection7, SECTION_7_TITLE } from "./section-7-cast-and-voice.js";
import { emitSection8, SECTION_8_TITLE } from "./section-8-emotional-and-relationship-state.js";
import { emitSection9, SECTION_9_TITLE } from "./section-9-current-intentions-and-plans.js";
import { emitSection10, SECTION_10_TITLE } from "./section-10-beliefs-secrets-questions.js";
import { emitSection11, SECTION_11_TITLE } from "./section-11-physical-continuity.js";
import { emitSection12, SECTION_12_TITLE } from "./section-12-forbidden-inventions-and-reveals.js";
import { emitSection13, SECTION_13_TITLE } from "./section-13-style-and-prose-craft.js";
import { emitSection14, SECTION_14_TITLE } from "./section-14-stop-rule.js";
import { emitSection15, SECTION_15_TITLE } from "./section-15-output-instruction.js";

export interface SectionDescriptor {
  number: number;
  title: string;
}

export const SECTION_DESCRIPTORS: readonly SectionDescriptor[] = [
  { number: 1, title: SECTION_1_TITLE },
  { number: 2, title: SECTION_2_TITLE },
  { number: 3, title: SECTION_3_TITLE },
  { number: 4, title: SECTION_4_TITLE },
  { number: 5, title: SECTION_5_TITLE },
  { number: 6, title: SECTION_6_TITLE },
  { number: 7, title: SECTION_7_TITLE },
  { number: 8, title: SECTION_8_TITLE },
  { number: 9, title: SECTION_9_TITLE },
  { number: 10, title: SECTION_10_TITLE },
  { number: 11, title: SECTION_11_TITLE },
  { number: 12, title: SECTION_12_TITLE },
  { number: 13, title: SECTION_13_TITLE },
  { number: 14, title: SECTION_14_TITLE },
  { number: 15, title: SECTION_15_TITLE },
] as const;

export function assembleSections(
  input: SectionEmitterInput,
  ctx: TranslatorContext,
): string {
  const bodies: string[] = [
    emitSection1(input),
    emitSection2(input),
    emitSection3(input, ctx),
    emitSection4(input),
    emitSection5(input),
    emitSection6(input),
    emitSection7(input, ctx),
    emitSection8(input, ctx),
    emitSection9(input, ctx),
    emitSection10(input, ctx),
    emitSection11(input, ctx),
    emitSection12(input),
    emitSection13(input),
    emitSection14(),
    emitSection15(),
  ];
  if (bodies.length !== SECTION_DESCRIPTORS.length) {
    throw new Error(
      `assembleSections invariant: bodies.length (${bodies.length}) != SECTION_DESCRIPTORS.length (${SECTION_DESCRIPTORS.length})`,
    );
  }
  const chunks: string[] = [];
  for (let i = 0; i < SECTION_DESCRIPTORS.length; i++) {
    const d = SECTION_DESCRIPTORS[i]!;
    const body = bodies[i]!;
    chunks.push(`## ${d.number}. ${d.title}\n\n${body}`);
  }
  return chunks.join("\n\n");
}
