#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { isMainModule } from "../esm-main.js";
import { handleSubmitPatchPlanTool } from "../tools/submit-patch-plan.js";
import {
  formatWorldRootFailure,
  formatWorldRootTrace,
  resolveWorldRoot
} from "./_resolve-world-root.js";

import type { PatchPlanEnvelope } from "../tools/_shared.js";

interface CliArgs {
  planPath: string;
  tokenPath: string;
  worldRoot?: string;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: submit-patch-plan [--world-root <path>] <plan-path> <token-path>

Submits a patch-plan envelope plus a signed approval token to the worldloom
patch engine, bypassing MCP transport. Functionally equivalent to the
mcp__worldloom__submit_patch_plan tool — same engine wiring, same pre-apply
validators, same PatchReceipt output.

Use this when the plan envelope is large enough to strain MCP transport
(typical threshold: tens of KB). For smaller plans, prefer the MCP path.

Arguments:
  <plan-path>             JSON file containing a patch-plan envelope
                          ({plan_id, target_world, patches[], ...}).
  <token-path>            File containing the signed approval token (single
                          line, base64; trailing whitespace ignored).

Options:
  --world-root <path>    Explicit worldloom project root. Overrides
                          WORLDLOOM_ROOT and auto-discovery.
  --help                  Show this help and exit.

Output:
  On success: PatchReceipt printed to stdout as JSON; exit code 0.
  On failure: error object printed to stderr as JSON; exit code 1.

Example:
  node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/plan.json /tmp/token.txt
  node tools/world-mcp/dist/src/cli/submit-patch-plan.js --world-root /path/to/worldloom /tmp/plan.json /tmp/token.txt
`;

type ParseOutcome =
  | { kind: "args"; args: CliArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

function parseCli(argv: string[]): ParseOutcome {
  let parsed: ReturnType<typeof parseArgs<{ options: { help: { type: "boolean" }; "world-root": { type: "string" } }; allowPositionals: true; strict: true }>>;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: "boolean" },
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

  const planPath = parsed.positionals[0];
  if (planPath === undefined || planPath.length === 0) {
    return { kind: "error", message: "<plan-path> is required." };
  }

  const tokenPath = parsed.positionals[1];
  if (tokenPath === undefined || tokenPath.length === 0) {
    return { kind: "error", message: "<token-path> is required." };
  }

  const worldRoot = parsed.values["world-root"];
  const args: CliArgs = { planPath, tokenPath };
  if (worldRoot !== undefined) {
    args.worldRoot = worldRoot;
  }
  return {
    kind: "args",
    args
  };
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

function readTokenFile(filePath: string): { ok: true; value: string } | { ok: false; message: string } {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to read token file ${filePath}: ${cause}` };
  }

  const token = raw.trim();
  if (token.length === 0) {
    return { ok: false, message: `Token file ${filePath} is empty.` };
  }

  return { ok: true, value: token };
}

export async function runSubmitPatchPlanCli(argv: string[]): Promise<CliResult> {
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

  const tokenResult = readTokenFile(parsed.args.tokenPath);
  if (!tokenResult.ok) {
    return { stdout: "", stderr: `${tokenResult.message}\n`, exitCode: 1 };
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

  const submitArgs: {
    patch_plan: PatchPlanEnvelope;
    approval_token: string;
    worldRoot: string;
  } = {
    patch_plan: planResult.value as PatchPlanEnvelope,
    approval_token: tokenResult.value,
    worldRoot: root.worldRoot
  };

  const result = await handleSubmitPatchPlanTool(submitArgs);

  if ("code" in result) {
    return {
      stdout: "",
      stderr: `${trace}${JSON.stringify(result, null, 2)}\n`,
      exitCode: 1
    };
  }

  return {
    stdout: `${JSON.stringify(result, null, 2)}\n`,
    stderr: trace,
    exitCode: 0
  };
}

async function main(): Promise<void> {
  const result = await runSubmitPatchPlanCli(process.argv.slice(2));
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
