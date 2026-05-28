import type { Context, Validator, Verdict } from "../framework/types.js";
import {
  PREDICATE_DSL_TERM_LITERALS,
  RECORD_ID_PATTERN,
  SCHEMA_FIELD_NAME_LITERALS
} from "./_engine-vocabulary-tokens.js";
import { parseScenePlanSections, scenePlanTargets, type MarkdownSection, type ScenePlanTarget } from "./scene-plan-section-parser.js";
import { normalizeScenePlanSectionKey } from "./scene-plan-structural.js";
import { touchedFilesInclude } from "./utils.js";

const VALIDATOR = "scene_plan_body_engine_vocabulary_cleanliness";
const VERBATIM_SECTIONS = new Set(["content_policy", "prose_craft_contract", "render_time_instruction"]);
const LIFECYCLE_TOKEN_PATTERNS: Array<{ token: string; pattern: RegExp }> = [
  { token: "validator", pattern: /\bvalidator\b/i },
  { token: "validation", pattern: /\bvalidation\b/i },
  { token: "schema", pattern: /\bschema\b/i },
  { token: "patch-engine", pattern: /\bpatch-engine\b/i },
  { token: "patch engine", pattern: /\bpatch engine\b/i },
  { token: "state delta", pattern: /\bstate delta\b/i },
  { token: "state_hash", pattern: /\bstate_hash\b/i },
  { token: "plan_hash", pattern: /\bplan_hash\b/i },
  { token: "supersedes", pattern: /\bsupersedes\b/i }
];

interface Hit {
  token: string;
  token_class: "record_id" | "schema_field" | "predicate_dsl" | "lifecycle";
  line: number;
}

export const scenePlanBodyEngineVocabularyCleanliness: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/scene-prose-plans\/SCN-\d+\.md$/)),
  skip_reason: "scene-plan body text surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> =>
    scenePlanTargets(input, ctx).flatMap((plan) => validatePlan(plan))
};

function validatePlan(plan: ScenePlanTarget): Verdict[] {
  const verdicts: Verdict[] = [];
  for (const section of parseScenePlanSections(plan.content)) {
    const key = normalizeScenePlanSectionKey(section.key);
    if (VERBATIM_SECTIONS.has(key)) {
      continue;
    }
    const hits = scanSection(section);
    if (hits.length === 0) {
      continue;
    }
    verdicts.push({
      validator: VALIDATOR,
      severity: "fail",
      code: `${VALIDATOR}.fail`,
      message: `${plan.path} "${section.title}" contains engine-vocabulary token(s): ${unique(hits.map((hit) => hit.token)).join(", ")}.`,
      location: {
        file: plan.path,
        line_range: [Math.min(...hits.map((hit) => hit.line)), Math.max(...hits.map((hit) => hit.line))],
        node_id: plan.sceneId
      },
      detail: {
        scene_id: plan.sceneId,
        section: section.title,
        hit_count: hits.length,
        hits
      },
      suggested_fix: "Translate record IDs, schema fields, predicate DSL, validation, and lifecycle vocabulary into renderer-facing prose."
    });
  }
  return verdicts;
}

function scanSection(section: MarkdownSection): Hit[] {
  const hits: Hit[] = [];
  section.lines.forEach((line, offset) => {
    const lineNumber = section.startLine + offset;
    for (const match of line.matchAll(RECORD_ID_PATTERN)) {
      if (match[0]) {
        hits.push({ token: match[0], token_class: "record_id", line: lineNumber });
      }
    }
    for (const token of SCHEMA_FIELD_NAME_LITERALS) {
      if (line.includes(token)) {
        hits.push({ token, token_class: "schema_field", line: lineNumber });
      }
    }
    for (const token of PREDICATE_DSL_TERM_LITERALS) {
      if (line.includes(token)) {
        hits.push({ token, token_class: "predicate_dsl", line: lineNumber });
      }
    }
    for (const { token, pattern } of LIFECYCLE_TOKEN_PATTERNS) {
      if (pattern.test(line)) {
        hits.push({ token, token_class: "lifecycle", line: lineNumber });
      }
    }
  });
  return hits;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
