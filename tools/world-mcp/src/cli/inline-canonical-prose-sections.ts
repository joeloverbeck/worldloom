#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { isMainModule } from "../esm-main.js";
import {
  SCENE_PLAN_VERBATIM_CANONICAL_SOURCES,
  stripScenePlanVerbatimFramingHeader,
  trimScenePlanVerbatimTrailingWhitespace
} from "../package-interop.js";
import {
  formatWorldRootFailure,
  formatWorldRootTrace,
  resolveWorldRoot
} from "./_resolve-world-root.js";

type VerbatimSectionNumber = "2" | "3" | "19";
type CanonicalBodies = Record<VerbatimSectionNumber, string>;

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface CliArgs {
  planPath: string;
  outPath?: string;
  worldRoot?: string;
}

interface InlineResult {
  content: string;
  sectionsReplaced: VerbatimSectionNumber[];
  missingSection?: VerbatimSectionNumber;
}

type SectionReplacement =
  | { sectionNumber: VerbatimSectionNumber; missing: true }
  | {
      sectionNumber: VerbatimSectionNumber;
      missing: false;
      startLine: number;
      endLine: number;
      body: string;
      changed: boolean;
    };

const SECTION_NUMBERS = ["2", "3", "19"] as const satisfies readonly VerbatimSectionNumber[];

const HELP_TEXT = `Usage: inline-canonical-prose-sections --plan <scene-plan-md-path> [--out <output-md-path>] [--world-root <path>]

Replaces scene-plan §2, §3, and §19 bodies with the canonical prose-renderer
contract bytes used by scene_plan_verbatim_section_integrity.

Arguments:
  --plan <path>           Path to the scene-plan markdown file. Relative paths
                          resolve from cwd.

Options:
  --out <path>            Output path. Defaults to --plan for an in-place rewrite.
  --world-root <path>     Explicit worldloom project root. Overrides
                          WORLDLOOM_ROOT and auto-discovery.
  --help                  Show this help and exit.

Output (stdout, JSON):
  {
    "plan_path": "<resolved input path>",
    "out_path": "<resolved output path>",
    "sections_replaced": ["2", "3", "19"],
    "no_change": false
  }

Exit codes:
  0   Sections were checked and output was written when needed.
  1   Plan, section, or canonical-source error.
  2   CLI argument or world-root resolution error.
`;

type ParseOutcome =
  | { kind: "args"; args: CliArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

function parseCli(argv: string[]): ParseOutcome {
  let parsed: ReturnType<
    typeof parseArgs<{
      options: {
        help: { type: "boolean" };
        plan: { type: "string" };
        out: { type: "string" };
        "world-root": { type: "string" };
      };
      allowPositionals: true;
      strict: true;
    }>
  >;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: "boolean" },
        plan: { type: "string" },
        out: { type: "string" },
        "world-root": { type: "string" }
      },
      allowPositionals: true,
      strict: true
    });
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  if (parsed.values.help === true) {
    return { kind: "help" };
  }

  const planPath = parsed.values.plan;
  if (planPath === undefined || planPath.length === 0) {
    return { kind: "error", message: "--plan <path> is required." };
  }
  if (parsed.positionals.length > 0) {
    return {
      kind: "error",
      message: `Unexpected positional argument(s): ${parsed.positionals.join(", ")}`
    };
  }

  const args: CliArgs = { planPath };
  if (parsed.values.out !== undefined) {
    args.outPath = parsed.values.out;
  }
  if (parsed.values["world-root"] !== undefined) {
    args.worldRoot = parsed.values["world-root"];
  }
  return { kind: "args", args };
}

function errorJson(code: string, message: string, extra: Record<string, unknown> = {}): string {
  return `${JSON.stringify({ ok: false, code, message, ...extra }, null, 2)}\n`;
}

function readTextFile(
  filePath: string,
  code: string,
  label: string
): { ok: true; content: string } | { ok: false; stderr: string } {
  try {
    return { ok: true, content: readFileSync(filePath, "utf8") };
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      stderr: errorJson(code, `Failed to read ${label} ${filePath}: ${cause}`, { path: filePath })
    };
  }
}

function loadCanonicalBodies(worldRoot: string): { ok: true; bodies: CanonicalBodies } | { ok: false; stderr: string } {
  const entries: Array<[VerbatimSectionNumber, string]> = [];
  for (const sectionNumber of SECTION_NUMBERS) {
    const relativePath = SCENE_PLAN_VERBATIM_CANONICAL_SOURCES[sectionNumber];
    const sourcePath = path.join(worldRoot, relativePath);
    const raw = readTextFile(sourcePath, "canonical_source_unreadable", "canonical source");
    if (!raw.ok) {
      return { ok: false, stderr: raw.stderr };
    }
    try {
      entries.push([sectionNumber, stripScenePlanVerbatimFramingHeader(raw.content)]);
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        stderr: errorJson("missing_framing_separator", cause, { path: sourcePath })
      };
    }
  }
  return { ok: true, bodies: Object.fromEntries(entries) as CanonicalBodies };
}

function inlineCanonicalSections(content: string, canonical: CanonicalBodies): InlineResult {
  const lines = content.split(/\r?\n/);
  const headings: Array<{ lineIndex: number; number: string }> = [];

  lines.forEach((line, index) => {
    const match = line.match(/^##\s+(\d+)\.\s*(.+?)\s*$/);
    if (match?.[1]) {
      headings.push({ lineIndex: index, number: match[1] });
    }
  });

  const replacements: SectionReplacement[] = SECTION_NUMBERS.map((sectionNumber) => {
    const headingIndex = headings.findIndex((heading) => heading.number === sectionNumber);
    if (headingIndex < 0) {
      return { sectionNumber, missing: true };
    }
    const heading = headings[headingIndex];
    if (heading === undefined) {
      return { sectionNumber, missing: true };
    }
    const nextHeadingLine = headings[headingIndex + 1]?.lineIndex ?? lines.length;
    const currentBody = trimSectionBody(lines.slice(heading.lineIndex + 1, nextHeadingLine).join("\n"));
    const canonicalBody = canonical[sectionNumber];
    return {
      sectionNumber,
      missing: false,
      startLine: heading.lineIndex + 1,
      endLine: nextHeadingLine,
      body: canonicalBody,
      changed: currentBody !== canonicalBody
    };
  });

  const missing = replacements.find((replacement) => replacement.missing);
  if (missing !== undefined) {
    return { content, sectionsReplaced: [], missingSection: missing.sectionNumber };
  }

  let nextLines = [...lines];
  const changed = replacements
    .filter((replacement): replacement is Extract<SectionReplacement, { missing: false }> =>
      !replacement.missing && replacement.changed
    )
    .sort((a, b) => b.startLine - a.startLine);

  for (const replacement of changed) {
    nextLines.splice(
      replacement.startLine,
      replacement.endLine - replacement.startLine,
      "",
      ...replacement.body.split("\n"),
      ""
    );
  }

  return {
    content: nextLines.join("\n"),
    sectionsReplaced: changed.map((replacement) => replacement.sectionNumber).sort(sectionSort)
  };
}

function trimSectionBody(value: string): string {
  const lines = value.split(/\r?\n/);
  while ((lines[0] ?? "").trim() === "") {
    lines.shift();
  }
  return trimScenePlanVerbatimTrailingWhitespace(lines.join("\n"));
}

function sectionSort(a: VerbatimSectionNumber, b: VerbatimSectionNumber): number {
  return Number(a) - Number(b);
}

export async function runInlineCanonicalProseSectionsCli(argv: string[]): Promise<CliResult> {
  const parsed = parseCli(argv);

  if (parsed.kind === "help") {
    return { stdout: HELP_TEXT, stderr: "", exitCode: 0 };
  }

  if (parsed.kind === "error") {
    return {
      stdout: "",
      stderr: `Error: ${parsed.message}\n\n${HELP_TEXT}`,
      exitCode: 2
    };
  }

  const root = resolveWorldRoot({
    flag: parsed.args.worldRoot,
    envVar: process.env.WORLDLOOM_ROOT,
    cwd: process.cwd()
  });
  if (!root.ok) {
    return { stdout: "", stderr: `${formatWorldRootFailure(root)}\n`, exitCode: 2 };
  }
  const trace = `${formatWorldRootTrace(root)}\n`;

  const planPath = path.resolve(parsed.args.planPath);
  const outPath = path.resolve(parsed.args.outPath ?? parsed.args.planPath);

  const plan = readTextFile(planPath, "plan_not_found", "plan file");
  if (!plan.ok) {
    return { stdout: "", stderr: `${trace}${plan.stderr}`, exitCode: 1 };
  }

  const canonical = loadCanonicalBodies(root.worldRoot);
  if (!canonical.ok) {
    return { stdout: "", stderr: `${trace}${canonical.stderr}`, exitCode: 1 };
  }

  const inlined = inlineCanonicalSections(plan.content, canonical.bodies);
  if (inlined.missingSection !== undefined) {
    return {
      stdout: "",
      stderr: `${trace}${errorJson(
        "missing_section",
        `Page plan ${planPath} is missing §${inlined.missingSection}; refusing to invent it.`,
        { section: inlined.missingSection }
      )}`,
      exitCode: 1
    };
  }

  const noChange = inlined.sectionsReplaced.length === 0;
  if (!noChange || outPath !== planPath) {
    writeFileSync(outPath, inlined.content, "utf8");
  }

  return {
    stdout: `${JSON.stringify(
      {
        plan_path: planPath,
        out_path: outPath,
        sections_replaced: inlined.sectionsReplaced,
        no_change: noChange
      },
      null,
      2
    )}\n`,
    stderr: trace,
    exitCode: 0
  };
}

async function main(): Promise<void> {
  const result = await runInlineCanonicalProseSectionsCli(process.argv.slice(2));
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}

if (isMainModule(import.meta.url)) {
  void main();
}
