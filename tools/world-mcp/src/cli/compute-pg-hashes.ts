#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { isMainModule } from "../esm-main.js";
import { computePgStateHash } from "../package-interop.js";
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: compute-pg-hashes --pg <pg-record-json-path>

Computes the canonical sha256 state hash that every PG record requires before its
patch plan is validated or submitted, per the story state contract §4.2a:

  state_hash = sha256 over the deterministic canonical JSON serialization of
               the PG fork-state payload (the full PG record except state_hash
               itself).

Story-pipeline skills that author a PG record (branching-story-bootstrap
and branching-story-turn-cycle) MUST use this CLI to produce the value they
stamp onto PG.state_hash. Hand-rolling
the canonical-JSON serializer or omitting fields by hand will produce hashes
that disagree with the validator and the engine.

Arguments:
  --pg <path>             Path to a JSON file containing the PG record draft.
                          YAML input is rejected: the patch engine validates
                          JSON, so the CLI must hash the same JSON payload the
                          engine will validate. Recommended workflow: build
                          the patch envelope first; extract the PG record with
                            jq '.patches[N].payload.record' envelope.json > PG-record.json
                          and pass PG-record.json as --pg. The 'state_hash'
                          field on the input is IGNORED (it is the value being
                          computed). The CLI does not compute or stamp
                          plan_hash; new PG records omit plan/prose_plan_path.

Options:
  --help                  Show this help and exit.

World root:
  This CLI reads only the --pg file and does not require a
  worldloom project root. The patch-plan CLIs and sign-approval-token support
  --world-root / WORLDLOOM_ROOT because they open the world index or HMAC
  secret; compute-pg-hashes intentionally has no --world-root option.

Output (stdout, JSON):
  {
    "state_hash": "<64 lowercase hex chars>"
  }

Exit codes:
  0   Hash computed successfully.
  1   I/O error, parse error, or missing required PG fields.
  2   CLI argument error.

Example:
  node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \\
    --pg   /tmp/PG-2-from-envelope.json
`;

interface CliArgs {
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

  const pgPath = parsed.values.pg;
  if (pgPath === undefined || pgPath.length === 0) {
    return { kind: "error", message: "--pg <path> is required." };
  }
  if (parsed.positionals.length > 0) {
    return {
      kind: "error",
      message: `Unexpected positional argument(s): ${parsed.positionals.join(", ")}`
    };
  }

  return { kind: "args", args: { pgPath } };
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
    parsed = JSON.parse(raw);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `PG file ${filePath} must be valid JSON. ${cause}. The CLI no longer accepts YAML input: build your patch envelope first, extract the PG record via \`jq '.patches[N].payload.record' envelope.json > PG-record.json\`, then pass that file as --pg. See .claude/skills/_shared-templates/story-record-schemas.md §4.2a.`
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      message: `PG file ${filePath} must contain a top-level object/map; got ${describeKind(parsed)}.`
    };
  }

  const record = parsed as Record<string, unknown>;
  return { ok: true, record };
}

function describeKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
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

  const pgResult = readPgRecord(parsed.args.pgPath);
  if (!pgResult.ok) {
    return { stdout: "", stderr: `${pgResult.message}\n`, exitCode: 1 };
  }

  const stateHash = computePgStateHash(pgResult.record);

  const output = `${JSON.stringify({ state_hash: stateHash }, null, 2)}\n`;
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
