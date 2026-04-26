#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { canonicalOpHash, type PatchOperation } from "@worldloom/patch-engine";

import { readOrCreateSecret, signToken } from "../approval/token";

const DEFAULT_EXPIRY_MINUTES = 20;

interface CliArgs {
  planPath: string;
  expiryMinutes: number;
}

function printHelp(): void {
  process.stdout.write(`Usage: sign-approval-token <plan-path> [--expiry-minutes <n>]

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
  --help                  Show this help and exit.

Example:
  node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/plan.json
  node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/plan.json --expiry-minutes 30
`);
}

function parseCli(): CliArgs | null {
  const parsed = parseArgs({
    options: {
      "expiry-minutes": { type: "string" },
      help: { type: "boolean" }
    },
    allowPositionals: true,
    strict: true
  });

  if (parsed.values.help === true) {
    printHelp();
    return null;
  }

  const planPath = parsed.positionals[0];
  if (planPath === undefined || planPath.length === 0) {
    process.stderr.write("Error: <plan-path> is required.\n\n");
    printHelp();
    process.exitCode = 2;
    return null;
  }

  const cliMinutesRaw = parsed.values["expiry-minutes"];
  const envMinutesRaw = process.env.WORLD_MCP_TOKEN_EXPIRY_MIN;
  const minutesRaw = cliMinutesRaw ?? envMinutesRaw;
  let expiryMinutes = DEFAULT_EXPIRY_MINUTES;
  if (minutesRaw !== undefined) {
    const parsedMinutes = Number.parseFloat(minutesRaw);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      process.stderr.write(`Error: --expiry-minutes must be a positive number, got ${minutesRaw}.\n`);
      process.exitCode = 2;
      return null;
    }
    expiryMinutes = parsedMinutes;
  }

  return { planPath, expiryMinutes };
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

function main(): void {
  const args = parseCli();
  if (args === null) {
    return;
  }

  let summary: { plan_id: string; world_slug: string; patch_hashes: string[] };
  try {
    summary = readPlan(args.planPath);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
    return;
  }

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(issuedAt) + args.expiryMinutes * 60 * 1000).toISOString();

  const secret = readOrCreateSecret();
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

  process.stdout.write(`${token}\n`);
}

main();
