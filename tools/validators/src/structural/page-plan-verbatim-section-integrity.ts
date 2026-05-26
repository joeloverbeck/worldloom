import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue, touchedFilesInclude } from "./utils.js";
import { pagePlanTargets, type PagePlanTarget } from "./page-plan-section-parser.js";

const VALIDATOR = "page_plan_verbatim_section_integrity";

const CANONICAL_SOURCES = {
  "2": "docs/prose-renderer-contract/content-policy.md",
  "3": "docs/prose-renderer-contract/prose-craft-contract.md",
  "19": "docs/prose-renderer-contract/render-time-instruction.md"
} as const;

type VerbatimSectionNumber = keyof typeof CANONICAL_SOURCES;
type CanonicalContents = Record<VerbatimSectionNumber, string>;

export const pagePlanVerbatimSectionIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && hasPagePlanDraftInput(ctx)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/pages-prose-plans\/PG-\d+\.md$/)),
  skip_reason: "page-plan §2/§3/§19 byte-equality surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const targets = pagePlanTargets(input, ctx);
    if (targets.length === 0) {
      return [];
    }
    const canonical = await loadCanonicalSources(input);
    return targets.flatMap((plan) => validatePlan(plan, canonical));
  }
};

function hasPagePlanDraftInput(ctx: Context): boolean {
  return (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_pg_record");
}

async function loadCanonicalSources(input: unknown): Promise<CanonicalContents> {
  const repoRoot = repoRootFrom(input);
  const entries = await Promise.all(
    Object.entries(CANONICAL_SOURCES).map(async ([sectionNumber, relativePath]) => {
      const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
      return [sectionNumber, stripFramingHeader(raw)] as const;
    })
  );
  return Object.fromEntries(entries) as CanonicalContents;
}

function repoRootFrom(input: unknown): string {
  const record = asPlainRecord(input);
  const direct = stringValue(record.repo_root) ?? stringValue(record.repoRoot);
  if (direct) {
    return path.resolve(direct);
  }

  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, "docs", "prose-renderer-contract"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(process.cwd(), "../..");
}

function stripFramingHeader(content: string): string {
  const lines = content.split(/\r?\n/);
  const separatorIndex = lines.findIndex((line) => line.trim() === "---");
  if (separatorIndex < 0) {
    throw new Error("Canonical source file lacks the required `---` separator line.");
  }
  return trimTrailingWhitespace(lines.slice(separatorIndex + 1).join("\n"));
}

function validatePlan(plan: PagePlanTarget, canonical: CanonicalContents): Verdict[] {
  const sections = extractSections(plan.content, ["2", "3", "19"]);
  const verdicts: Verdict[] = [];

  for (const sectionNumber of ["2", "3", "19"] as const) {
    const planBody = sections[sectionNumber];
    const canonicalBody = canonical[sectionNumber];
    if (planBody === undefined) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: `${VALIDATOR}.missing_section`,
        message: `Page plan ${plan.path} is missing §${sectionNumber}; expected verbatim content from ${CANONICAL_SOURCES[sectionNumber]}.`,
        location: {
          file: plan.path,
          node_id: plan.pageId
        },
        detail: {
          page_id: plan.pageId,
          missing_section: sectionNumber,
          canonical_source: CANONICAL_SOURCES[sectionNumber]
        },
        suggested_fix: `Refresh §${sectionNumber} from ${CANONICAL_SOURCES[sectionNumber]}.`
      });
      continue;
    }

    if (planBody !== canonicalBody) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: `${VALIDATOR}.drift`,
        message: `Page plan ${plan.path} §${sectionNumber} drifts from canonical source ${CANONICAL_SOURCES[sectionNumber]}. The verbatim-inlining contract requires byte-equality.`,
        location: {
          file: plan.path,
          node_id: plan.pageId
        },
        detail: {
          page_id: plan.pageId,
          section: sectionNumber,
          canonical_source: CANONICAL_SOURCES[sectionNumber],
          first_diverging_line: findFirstDivergingLine(planBody, canonicalBody)
        },
        suggested_fix: `Refresh §${sectionNumber} from ${CANONICAL_SOURCES[sectionNumber]}.`
      });
    }
  }

  return verdicts;
}

function extractSections(
  content: string,
  sectionNumbers: readonly VerbatimSectionNumber[]
): Partial<Record<VerbatimSectionNumber, string>> {
  const wanted = new Set<string>(sectionNumbers);
  const lines = content.split(/\r?\n/);
  const headings: Array<{ lineIndex: number; number: string }> = [];

  lines.forEach((line, index) => {
    const match = line.match(/^##\s+(\d+)\.\s*(.+?)\s*$/);
    if (match?.[1]) {
      headings.push({ lineIndex: index, number: match[1] });
    }
  });

  const sections: Partial<Record<VerbatimSectionNumber, string>> = {};
  headings.forEach((heading, index) => {
    if (!wanted.has(heading.number)) {
      return;
    }
    const next = headings[index + 1]?.lineIndex ?? lines.length;
    sections[heading.number as VerbatimSectionNumber] = trimSectionBody(
      lines.slice(heading.lineIndex + 1, next).join("\n")
    );
  });

  return sections;
}

function findFirstDivergingLine(a: string, b: string): number {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  for (let index = 0; index < Math.min(aLines.length, bLines.length); index += 1) {
    if (aLines[index] !== bLines[index]) {
      return index + 1;
    }
  }
  return Math.min(aLines.length, bLines.length) + 1;
}

function trimSectionBody(value: string): string {
  const lines = value.split(/\r?\n/);
  while ((lines[0] ?? "").trim() === "") {
    lines.shift();
  }
  return trimTrailingWhitespace(lines.join("\n"));
}

function trimTrailingWhitespace(value: string): string {
  return value.replace(/[ \t\r\n]+$/, "");
}
