import type { Context, Validator, Verdict } from "../framework/types.js";
import {
  PREDICATE_DSL_TERM_LITERALS,
  RECORD_ID_PATTERN,
  SCHEMA_FIELD_NAME_LITERALS
} from "./_engine-vocabulary-tokens.js";
import { pagePlanTargets, type PagePlanTarget } from "./page-plan-section-parser.js";
import { touchedFilesInclude } from "./utils.js";

const VALIDATOR = "page_plan_body_engine_vocabulary_cleanliness";
const CURRENT_STATE_GROUNDING_LINE = /^\s*-\s*Current-state grounding records:\s*/i;
const EXCLUDED_SECTION_NUMBERS = new Set(["2", "3", "15", "19"]);
export const ENGINE_SECTION_NUMBERS = new Set([
  "5",
  "6",
  "7",
  "7a",
  "8",
  "9",
  "9b",
  "9c",
  "10",
  "10b",
  "13",
  "14"
]);
const SECTION_16A = "16a";

interface Section {
  number: string;
  title: string;
  startLine: number;
  lines: string[];
}

interface Hit {
  token: string;
  token_class: "record_id" | "schema_field" | "predicate_dsl";
  line: number;
}

export const pagePlanBodyEngineVocabularyCleanliness: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && hasPagePlanDraftInput(ctx)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/pages-prose-plans\/PG-\d+\.md$/)),
  skip_reason: "page-plan body text surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> =>
    pagePlanTargets(input, ctx).flatMap((plan) => validatePlan(plan))
};

function hasPagePlanDraftInput(ctx: Context): boolean {
  return (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_pg_record");
}

function validatePlan(plan: PagePlanTarget): Verdict[] {
  const verdicts: Verdict[] = [];
  for (const section of parseSections(plan.content)) {
    if (EXCLUDED_SECTION_NUMBERS.has(section.number)) {
      continue;
    }
    const hits = scanSection(section);
    if (hits.length === 0) {
      continue;
    }
    const severity = hits.length >= 3 ? "fail" : "warn";
    verdicts.push({
      validator: VALIDATOR,
      severity,
      code: severity === "fail" ? "page_plan_body_engine_vocabulary_cleanliness.fail" : "page_plan_body_engine_vocabulary_cleanliness.warn",
      message: `${plan.path} §${section.number} "${section.title}" contains ${hits.length} engine-vocabulary token(s) outside the page-plan allow-list: ${unique(hits.map((hit) => hit.token)).join(", ")}.`,
      location: {
        file: plan.path,
        line_range: [Math.min(...hits.map((hit) => hit.line)), Math.max(...hits.map((hit) => hit.line))],
        node_id: plan.pageId
      },
      detail: {
        page_id: plan.pageId,
        section: section.number,
        title: section.title,
        hit_count: hits.length,
        hits
      },
      suggested_fix: section.number === SECTION_16A
        ? "Keep §16a current-state IDs only in the `Current-state grounding records:` field and translate schema or predicate vocabulary into renderer-facing prose elsewhere in the packet."
        : "Move engine-readable IDs into §15 frontmatter or one of the engine-output sections (§5/§6/§7/§7a/§8/§9/§9b/§9c/§10/§10b/§13/§14/§16a); translate schema-field literals or predicate DSL terms into renderer-facing prose for this prose-facing section."
    });
  }
  return verdicts;
}

function parseSections(content: string): Section[] {
  const lines = content.split(/\r?\n/);
  const headings: Array<{ lineIndex: number; number: string; title: string }> = [];
  lines.forEach((line, index) => {
    const match = line.match(/^##\s+(\d+a?)\.\s*(.+?)\s*$/i);
    if (match?.[1] && match[2]) {
      headings.push({ lineIndex: index, number: match[1].toLowerCase(), title: match[2].trim() });
    }
  });

  return headings.map((heading, index) => {
    const next = headings[index + 1]?.lineIndex ?? lines.length;
    return {
      number: heading.number,
      title: heading.title,
      startLine: heading.lineIndex + 1,
      lines: lines.slice(heading.lineIndex, next)
    };
  });
}

function scanSection(section: Section): Hit[] {
  const hits: Hit[] = [];
  const isEngineSection = ENGINE_SECTION_NUMBERS.has(section.number);
  section.lines.forEach((line, offset) => {
    const lineNumber = section.startLine + offset;
    const isCurrentStateGrounding = section.number === SECTION_16A && CURRENT_STATE_GROUNDING_LINE.test(line);
    const skipRecordIdScan = section.number === SECTION_16A || isEngineSection;
    const skipSchemaFieldScan = isCurrentStateGrounding || isEngineSection;
    if (!skipRecordIdScan && !isCurrentStateGrounding) {
      for (const match of line.matchAll(RECORD_ID_PATTERN)) {
        if (match[0]) {
          hits.push({ token: match[0], token_class: "record_id", line: lineNumber });
        }
      }
    }
    if (isCurrentStateGrounding) {
      return;
    }
    if (!skipSchemaFieldScan) {
      for (const token of SCHEMA_FIELD_NAME_LITERALS) {
        if (line.includes(token)) {
          hits.push({ token, token_class: "schema_field", line: lineNumber });
        }
      }
    }
    for (const token of PREDICATE_DSL_TERM_LITERALS) {
      if (line.includes(token)) {
        hits.push({ token, token_class: "predicate_dsl", line: lineNumber });
      }
    }
  });
  return hits;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
