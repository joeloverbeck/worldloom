#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { isMainModule } from "../esm-main.js";
import { validatePatchPlan } from "../tools/validate-patch-plan.js";
import {
  formatWorldRootFailure,
  formatWorldRootTrace,
  resolveWorldRoot
} from "./_resolve-world-root.js";

import type { PatchPlanEnvelope } from "../tools/_shared.js";

interface CliArgs {
  planPath: string;
  worldRoot?: string;
  pagePlanDraftsPath?: string;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: validate-patch-plan [--world-root <path>] [--page-plan-drafts <path>] <plan-path>

Validates a patch-plan envelope through the same read-only pre-apply validator
path as mcp__worldloom__validate_patch_plan, bypassing MCP transport for large
plan envelopes.

Use this when the plan envelope is large enough to strain MCP transport
(typical threshold: tens of KB). For smaller plans, prefer the MCP path.

Arguments:
  <plan-path>             JSON file containing a patch-plan envelope
                          ({plan_id, target_world, patches[], ...}).

Options:
  --world-root <path>          Explicit worldloom project root. Overrides
                               WORLDLOOM_ROOT and auto-discovery.
  --page-plan-drafts <path>    JSON file containing an array of {path, content}
                               objects supplying candidate pages-prose-plans/
                               PG-<integer>.md bytes for page-plan validators
                               to exercise pre-commit. Each path must match
                               stories/<slug>/pages-prose-plans/PG-<integer>.md.
  --help                        Show this help and exit.

Output:
  On pass: { status: "pass", verdicts, validators_run } printed to stdout as JSON; exit code 0.
  On fail/skipped: the same status object printed to stderr as JSON; exit code 1.

Example:
  node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/plan.json
  node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /path/to/worldloom /tmp/plan.json
  node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/drafts.json /tmp/plan.json
`;

type ParseOutcome =
  | { kind: "args"; args: CliArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

function parseCli(argv: string[]): ParseOutcome {
  let parsed: ReturnType<typeof parseArgs<{ options: { help: { type: "boolean" }; "world-root": { type: "string" }; "page-plan-drafts": { type: "string" } }; allowPositionals: true; strict: true }>>;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: "boolean" },
        "world-root": { type: "string" },
        "page-plan-drafts": { type: "string" }
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

  const planPath = parsed.positionals[0];
  if (planPath === undefined || planPath.length === 0) {
    return { kind: "error", message: "<plan-path> is required." };
  }

  const worldRoot = parsed.values["world-root"];
  const pagePlanDraftsPath = parsed.values["page-plan-drafts"];
  const args: CliArgs = { planPath };
  if (worldRoot !== undefined) {
    args.worldRoot = worldRoot;
  }
  if (pagePlanDraftsPath !== undefined) {
    args.pagePlanDraftsPath = pagePlanDraftsPath;
  }
  return { kind: "args", args };
}

function readJsonFile(filePath: string): { ok: true; value: unknown } | { ok: false; message: string } {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to read plan file ${filePath}: ${cause}` };
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Plan file ${filePath} is not valid JSON: ${cause}` };
  }
}

export async function runValidatePatchPlanCli(argv: string[]): Promise<CliResult> {
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

  const planResult = readJsonFile(parsed.args.planPath);
  if (!planResult.ok) {
    return { stdout: "", stderr: `${planResult.message}\n`, exitCode: 1 };
  }

  let pagePlanDrafts: ReadonlyArray<{ path: string; content: string }> | undefined;
  if (parsed.args.pagePlanDraftsPath !== undefined) {
    const draftsResult = readJsonFile(parsed.args.pagePlanDraftsPath);
    if (!draftsResult.ok) {
      return { stdout: "", stderr: `${draftsResult.message}\n`, exitCode: 1 };
    }
    if (!Array.isArray(draftsResult.value)) {
      return {
        stdout: "",
        stderr: `Page-plan drafts file ${parsed.args.pagePlanDraftsPath} must contain a JSON array.\n`,
        exitCode: 1
      };
    }
    pagePlanDrafts = draftsResult.value as ReadonlyArray<{ path: string; content: string }>;
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

  const validateArgs: {
    patch_plan: PatchPlanEnvelope;
    worldRoot: string;
    page_plan_drafts?: ReadonlyArray<{ path: string; content: string }>;
  } = {
    patch_plan: planResult.value as PatchPlanEnvelope,
    worldRoot: root.worldRoot
  };
  if (pagePlanDrafts !== undefined) {
    validateArgs.page_plan_drafts = pagePlanDrafts;
  }
  const result = await validatePatchPlan(validateArgs);
  const output = `${JSON.stringify(result, null, 2)}\n`;

  if ("status" in result && result.status === "pass") {
    return {
      stdout: output,
      stderr: trace,
      exitCode: 0
    };
  }

  return {
    stdout: "",
    stderr: `${trace}${output}`,
    exitCode: 1
  };
}

async function main(): Promise<void> {
  const result = await runValidatePatchPlanCli(process.argv.slice(2));
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
