#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import YAML from "yaml";

import { isMainModule } from "../esm-main.js";
import { computePgStateHash, computePlanHash } from "../package-interop.js";
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: compute-pg-hashes --plan <plan-md-path> --pg <pg-record-path>

Computes the canonical sha256 hashes that every PG record requires before its
patch plan is validated or submitted, per the story state contract §4.2a:

  plan_hash  = sha256 over the exact UTF-8 bytes of the page plan body that
               will be written to pages-prose-plans/PG-<integer>.md.
  state_hash = sha256 over the deterministic canonical JSON serialization of
               the PG fork-state payload (the full PG record except state_hash
               itself).

Story-pipeline skills that author a PG record (branching-story-bootstrap
Phase 7, branching-story-turn-cycle Phase 9) MUST use this CLI to produce
the values they stamp onto PG.plan.plan_hash and PG.state_hash. Hand-rolling
the canonical-JSON serializer or omitting fields by hand will produce hashes
that disagree with the validator and the engine.

Arguments:
  --plan <path>           Path to the page plan markdown file. The file is
                          read as raw bytes (no normalization, no trimming);
                          the hash binds the exact bytes that will land at
                          pages-prose-plans/PG-<integer>.md.
  --pg <path>             Path to a JSON or YAML file containing the PG
                          record draft. Both formats are accepted and produce
                          identical hashes when they parse to the same PG
                          object. JSON is a subset of YAML, and both are
                          parsed through the same parser. The CLI does not
                          reconcile content drift between separate draft
                          files; the input must match the PG payload that will
                          be validated/submitted. The 'state_hash' field on
                          the input is IGNORED (it is the value being
                          computed); the 'plan.plan_hash' field, if present,
                          is REPLACED in the canonical payload by the value
                          computed from --plan, so callers may pass a draft
                          that has placeholders for both hashes.

Options:
  --help                  Show this help and exit.

World root:
  This CLI reads only the --plan and --pg files and does not require a
  worldloom project root. The patch-plan CLIs and sign-approval-token support
  --world-root / WORLDLOOM_ROOT because they open the world index or HMAC
  secret; compute-pg-hashes intentionally has no --world-root option.

Output (stdout, JSON):
  {
    "plan_hash":  "<64 lowercase hex chars>",
    "state_hash": "<64 lowercase hex chars>"
  }

Exit codes:
  0   Both hashes computed successfully.
  1   I/O error, parse error, or missing required PG fields.
  2   CLI argument error.

Example:
  node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \\
    --plan /tmp/PG-2-plan.md \\
    --pg   /tmp/PG-2-draft.yaml
`;

interface CliArgs {
  planPath: string;
  pgPath: string;
}

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
        pg: { type: "string" };
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
        pg: { type: "string" }
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
  const pgPath = parsed.values.pg;
  if (planPath === undefined || planPath.length === 0) {
    return { kind: "error", message: "--plan <path> is required." };
  }
  if (pgPath === undefined || pgPath.length === 0) {
    return { kind: "error", message: "--pg <path> is required." };
  }
  if (parsed.positionals.length > 0) {
    return {
      kind: "error",
      message: `Unexpected positional argument(s): ${parsed.positionals.join(", ")}`
    };
  }

  return { kind: "args", args: { planPath, pgPath } };
}

function readPlanBytes(filePath: string): { ok: true; bytes: Buffer } | { ok: false; message: string } {
  try {
    return { ok: true, bytes: readFileSync(filePath) };
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to read plan file ${filePath}: ${cause}` };
  }
}

function readPgRecord(filePath: string): { ok: true; record: Record<string, unknown> } | { ok: false; message: string } {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to read PG file ${filePath}: ${cause}` };
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `PG file ${filePath} is not valid YAML or JSON: ${cause}`
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      message: `PG file ${filePath} must contain a top-level object/map; got ${describeKind(parsed)}.`
    };
  }

  return { ok: true, record: parsed as Record<string, unknown> };
}

function describeKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function applyComputedPlanHash(
  pgRecord: Record<string, unknown>,
  planHash: string
): Record<string, unknown> {
  const planBlock = pgRecord.plan;
  const replaced: Record<string, unknown> = { ...pgRecord };
  if (planBlock !== null && typeof planBlock === "object" && !Array.isArray(planBlock)) {
    replaced.plan = { ...(planBlock as Record<string, unknown>), plan_hash: planHash };
  } else {
    replaced.plan = { plan_hash: planHash };
  }
  return replaced;
}

export async function runComputePgHashesCli(argv: string[]): Promise<CliResult> {
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

  const planResult = readPlanBytes(parsed.args.planPath);
  if (!planResult.ok) {
    return { stdout: "", stderr: `${planResult.message}\n`, exitCode: 1 };
  }

  const pgResult = readPgRecord(parsed.args.pgPath);
  if (!pgResult.ok) {
    return { stdout: "", stderr: `${pgResult.message}\n`, exitCode: 1 };
  }

  const planHash = computePlanHash(planResult.bytes);
  const pgWithFinalPlanHash = applyComputedPlanHash(pgResult.record, planHash);
  const stateHash = computePgStateHash(pgWithFinalPlanHash);

  const output = `${JSON.stringify({ plan_hash: planHash, state_hash: stateHash }, null, 2)}\n`;
  return { stdout: output, stderr: "", exitCode: 0 };
}

async function main(): Promise<void> {
  const result = await runComputePgHashesCli(process.argv.slice(2));
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
