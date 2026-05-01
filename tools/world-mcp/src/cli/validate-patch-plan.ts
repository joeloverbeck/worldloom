#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { validatePatchPlan } from "../tools/validate-patch-plan";

import type { PatchPlanEnvelope } from "../tools/_shared";

interface CliArgs {
  planPath: string;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: validate-patch-plan <plan-path>

Validates a patch-plan envelope through the same read-only pre-apply validator
path as mcp__worldloom__validate_patch_plan, bypassing MCP transport for large
plan envelopes.

Use this when the plan envelope is large enough to strain MCP transport
(typical threshold: tens of KB). For smaller plans, prefer the MCP path.

Arguments:
  <plan-path>             JSON file containing a patch-plan envelope
                          ({plan_id, target_world, patches[], ...}).

Options:
  --help                  Show this help and exit.

Output:
  On pass: { status: "pass", verdicts, validators_run } printed to stdout as JSON; exit code 0.
  On fail/skipped: the same status object printed to stderr as JSON; exit code 1.

Example:
  node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/plan.json
`;

type ParseOutcome =
  | { kind: "args"; args: CliArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

function parseCli(argv: string[]): ParseOutcome {
  let parsed: ReturnType<typeof parseArgs<{ options: { help: { type: "boolean" } }; allowPositionals: true; strict: true }>>;
  try {
    parsed = parseArgs({
      args: argv,
      options: { help: { type: "boolean" } },
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

  return { kind: "args", args: { planPath } };
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

  const result = await validatePatchPlan({
    patch_plan: planResult.value as PatchPlanEnvelope
  });
  const output = `${JSON.stringify(result, null, 2)}\n`;

  if ("status" in result && result.status === "pass") {
    return {
      stdout: output,
      stderr: "",
      exitCode: 0
    };
  }

  return {
    stdout: "",
    stderr: output,
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

if (require.main === module) {
  void main();
}
