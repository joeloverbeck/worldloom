#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import type { PatchOperation } from "@worldloom/patch-engine";

import { readOrCreateSecret, signToken } from "../approval/token.js";
import { isMainModule } from "../esm-main.js";
import { canonicalOpHash } from "../package-interop.js";
import {
  formatWorldRootFailure,
  formatWorldRootTrace,
  resolveWorldRoot
} from "./_resolve-world-root.js";

const DEFAULT_EXPIRY_MINUTES = 20;

interface CliArgs {
  planPath: string;
  expiryMinutes: number;
  worldRoot?: string;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: sign-approval-token [--world-root <path>] <plan-path> [--expiry-minutes <n>]

Signs an HMAC approval token for a patch-plan envelope and prints the
base64-encoded token to stdout. The token binds plan_id + world_slug +
canonical hashes of every patches[] entry, with an expires_at horizon
of <n> minutes after issuance (default ${DEFAULT_EXPIRY_MINUTES}).

The HMAC secret is read from tools/world-mcp/.secret (created automatically
on first invocation if absent).

Arguments:
  <plan-path>             Path to a JSON file containing a patch-plan
                          envelope ({plan_id, target_world, patches[], ...}).

Options:
  --expiry-minutes <n>    Token validity window in minutes (default ${DEFAULT_EXPIRY_MINUTES}).
                          Can also be set via WORLD_MCP_TOKEN_EXPIRY_MIN env var.
  --world-root <path>     Explicit worldloom project root for the HMAC secret.
                          Overrides WORLDLOOM_ROOT and auto-discovery.
  --help                  Show this help and exit.

Example:
  node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/plan.json
  node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/plan.json --expiry-minutes 30
  node tools/world-mcp/dist/src/cli/sign-approval-token.js --world-root /path/to/worldloom /tmp/plan.json
`;

type ParseOutcome =
  | { kind: "args"; args: CliArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

function parseCli(argv: string[]): ParseOutcome {
  let parsed: ReturnType<
    typeof parseArgs<{
      options: {
        "expiry-minutes": { type: "string" };
        "world-root": { type: "string" };
        help: { type: "boolean" };
      };
      allowPositionals: true;
      strict: true;
    }>
  >;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        "expiry-minutes": { type: "string" },
        "world-root": { type: "string" },
        help: { type: "boolean" }
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

  const cliMinutesRaw = parsed.values["expiry-minutes"];
  const envMinutesRaw = process.env.WORLD_MCP_TOKEN_EXPIRY_MIN;
  const minutesRaw = cliMinutesRaw ?? envMinutesRaw;
  let expiryMinutes = DEFAULT_EXPIRY_MINUTES;
  if (minutesRaw !== undefined) {
    const parsedMinutes = Number.parseFloat(minutesRaw);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      return { kind: "error", message: `--expiry-minutes must be a positive number, got ${minutesRaw}.` };
    }
    expiryMinutes = parsedMinutes;
  }

  const worldRoot = parsed.values["world-root"];
  return {
    kind: "args",
    args: worldRoot === undefined ? { planPath, expiryMinutes } : { planPath, expiryMinutes, worldRoot }
  };
}

interface PatchPlanShape {
  plan_id?: unknown;
  target_world?: unknown;
  patches?: unknown;
}

function readPlan(planPath: string): { plan_id: string; world_slug: string; patch_hashes: string[] } {
  let raw: string;
  try {
    raw = readFileSync(planPath, "utf8");
  } catch (err) {
    throw new Error(`Failed to read plan file ${planPath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Plan file ${planPath} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Plan file ${planPath} must contain a JSON object.`);
  }

  const plan = parsed as PatchPlanShape;
  if (typeof plan.plan_id !== "string" || plan.plan_id.length === 0) {
    throw new Error("Plan must include a non-empty 'plan_id' string.");
  }
  if (typeof plan.target_world !== "string" || plan.target_world.length === 0) {
    throw new Error("Plan must include a non-empty 'target_world' string.");
  }
  if (!Array.isArray(plan.patches) || plan.patches.length === 0) {
    throw new Error("Plan must include a non-empty 'patches' array.");
  }

  const patchHashes = plan.patches.map((op) => canonicalOpHash(op as PatchOperation));

  return {
    plan_id: plan.plan_id,
    world_slug: plan.target_world,
    patch_hashes: patchHashes
  };
}

export function runSignApprovalTokenCli(argv: string[]): CliResult {
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

  let summary: { plan_id: string; world_slug: string; patch_hashes: string[] };
  try {
    summary = readPlan(parsed.args.planPath);
  } catch (err) {
    return { stdout: "", stderr: `${err instanceof Error ? err.message : String(err)}\n`, exitCode: 1 };
  }

  const root = resolveWorldRoot({
    flag: parsed.args.worldRoot,
    envVar: process.env.WORLDLOOM_ROOT,
    cwd: process.cwd()
  });
  if (!root.ok) {
    return { stdout: "", stderr: `${formatWorldRootFailure(root)}\n`, exitCode: 2 };
  }

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(issuedAt) + parsed.args.expiryMinutes * 60 * 1000).toISOString();

  const secret = readOrCreateSecret(root.worldRoot);
  const token = signToken(
    {
      plan_id: summary.plan_id,
      world_slug: summary.world_slug,
      patch_hashes: summary.patch_hashes,
      issued_at: issuedAt,
      expires_at: expiresAt
    },
    secret
  );

  return {
    stdout: `${token}\n`,
    stderr: `${formatWorldRootTrace(root)}\n`,
    exitCode: 0
  };
}

function main(): void {
  const result = runSignApprovalTokenCli(process.argv.slice(2));
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}

if (isMainModule(import.meta.url)) {
  main();
}
