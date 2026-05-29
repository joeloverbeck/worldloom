#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { replayActiveRecords } from "@worldloom/validators";
import YAML from "yaml";

import { isMainModule } from "../esm-main.js";
import {
  formatWorldRootFailure,
  formatWorldRootTrace,
  resolveWorldRoot
} from "./_resolve-world-root.js";

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: compute-pg-snapshot [--world-root <path>] <plan-path>

Derives a turn-cycle PG record's state_snapshot.active_records deterministically
from its parent page's active_records plus the resolved event's state_delta,
applying the same replay rule the snapshot_replay_equality validator gates on
(story state contract §4.2). This is the authoring analogue of compute-pg-hashes:
authors run it to derive active_records by tool instead of hand-computing
parent.active_records + create − supersede − close (including the non-obvious
inactive-status exclusion, where a created-but-inactive successor — e.g. a CLK
with status resolved, an STQ answered, an STEMO settled — is created but omitted
from active_records). The tool handles that exclusion so authors do not reason
it by hand.

The CLI is read-only. It calls the SINGLE canonical replayActiveRecords helper
exported by @worldloom/validators — the same one snapshot_replay_equality and
plan_story_state_maintenance use — so its output cannot disagree with the
validator that later gates the commit.

Arguments:
  <plan-path>             Path to the patch-plan envelope JSON (the same
                          envelope passed to validate-patch-plan). It must carry
                          exactly one create_pg_record patch; that PG record's
                          parent_page_id and input.resolved_event_id locate the
                          parent page (read from disk) and the resolved event
                          (its create patch, read from the envelope). The
                          created record bodies in the envelope supply lifecycle
                          status for the inactive-status exclusion.

Options:
  --world-root <path>     Explicit worldloom project root. Overrides
                          WORLDLOOM_ROOT and cwd auto-discovery. The parent page
                          is read from
                          <root>/worlds/<target_world>/stories/<story_slug>/_source/pages/<parent>.yaml.
  --help                  Show this help and exit.

Output (stdout, JSON):
  {
    "active_records": { "<CLASS>": ["<id>", ...], ... }
  }
  Diff this against the active_records you drafted onto the PG record. The
  world-root resolution trace is written to stderr.

Exit codes:
  0   Snapshot computed successfully.
  1   I/O error, parse error, or an envelope/parent-page shape problem.
  2   CLI argument error or world-root resolution failure.

Example:
  node tools/world-mcp/dist/src/cli/compute-pg-snapshot.js /tmp/plan.json
  node tools/world-mcp/dist/src/cli/compute-pg-snapshot.js --world-root /path/to/worldloom /tmp/plan.json
`;

interface CliArgs {
  planPath: string;
  worldRoot?: string;
}

type ParseOutcome =
  | { kind: "args"; args: CliArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

function parseCli(argv: string[]): ParseOutcome {
  let parsed: ReturnType<
    typeof parseArgs<{
      options: { help: { type: "boolean" }; "world-root": { type: "string" } };
      allowPositionals: true;
      strict: true;
    }>
  >;
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
  if (parsed.positionals.length > 1) {
    return {
      kind: "error",
      message: `Unexpected positional argument(s): ${parsed.positionals.slice(1).join(", ")}`
    };
  }

  const worldRoot = parsed.values["world-root"];
  const args: CliArgs = { planPath };
  if (worldRoot !== undefined) {
    args.worldRoot = worldRoot;
  }
  return { kind: "args", args };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

interface ComputeOk {
  ok: true;
  activeRecords: Record<string, string[]>;
}

interface ComputeError {
  ok: false;
  message: string;
  exitCode: 1 | 2;
}

type ComputeOutcome = ComputeOk | ComputeError;

function fail(message: string, exitCode: 1 | 2 = 1): ComputeError {
  return { ok: false, message, exitCode };
}

function patchRecord(patch: unknown): Record<string, unknown> | undefined {
  if (!isRecord(patch)) {
    return undefined;
  }
  const payload = patch.payload;
  if (!isRecord(payload) || !isRecord(payload.record)) {
    return undefined;
  }
  return payload.record;
}

function patchStorySlug(patch: unknown): string | undefined {
  if (!isRecord(patch) || !isRecord(patch.payload)) {
    return undefined;
  }
  return stringValue(patch.payload.story_slug);
}

export function computePgSnapshot(envelope: unknown, worldRoot: string): ComputeOutcome {
  if (!isRecord(envelope) || !Array.isArray(envelope.patches)) {
    return fail("Envelope must be a JSON object with a `patches` array.");
  }

  const targetWorld = stringValue(envelope.target_world);
  if (targetWorld === undefined) {
    return fail("Envelope is missing a string `target_world`.");
  }

  const patches = envelope.patches;
  const pgPatches = patches.filter((patch) => isRecord(patch) && patch.op === "create_pg_record");
  if (pgPatches.length === 0) {
    return fail("Envelope contains no create_pg_record patch; nothing to snapshot.");
  }
  if (pgPatches.length > 1) {
    return fail(
      `Envelope contains ${pgPatches.length} create_pg_record patches; expected exactly one (a turn creates a single page).`
    );
  }

  const pgRecord = patchRecord(pgPatches[0]);
  if (pgRecord === undefined) {
    return fail("create_pg_record patch has no payload.record object.");
  }

  const storySlug = patchStorySlug(pgPatches[0]);
  if (storySlug === undefined) {
    return fail("create_pg_record patch payload is missing a string `story_slug`.");
  }

  const parentPageId = stringValue(pgRecord.parent_page_id);
  if (parentPageId === undefined) {
    return fail("PG record is missing a string `parent_page_id`.");
  }

  const input = isRecord(pgRecord.input) ? pgRecord.input : {};
  const resolvedEventId = stringValue(input.resolved_event_id);
  if (resolvedEventId === undefined) {
    return fail("PG record is missing `input.resolved_event_id`; no event is bound to replay.");
  }

  // recordsById is built from every created record body in the envelope so the
  // shared helper can read lifecycle status for the inactive-status exclusion.
  const recordsById = new Map<string, Record<string, unknown>>();
  for (const patch of patches) {
    const record = patchRecord(patch);
    if (record === undefined) {
      continue;
    }
    const recordId = stringValue(record.id);
    if (recordId !== undefined) {
      recordsById.set(recordId, record);
    }
  }

  const eventRecord = recordsById.get(resolvedEventId);
  if (eventRecord === undefined) {
    return fail(
      `input.resolved_event_id ${resolvedEventId} has no matching create patch in the envelope; the turn's SE event must be created in the same plan.`
    );
  }

  if (!isRecord(eventRecord.state_delta)) {
    return fail(`Event ${resolvedEventId} is missing a state_delta object.`);
  }
  const stateDelta = eventRecord.state_delta;
  const delta = {
    create: stringArray(stateDelta.create),
    supersede: stringArray(stateDelta.supersede),
    close: stringArray(stateDelta.close)
  };

  const parentPath = path.join(
    worldRoot,
    "worlds",
    targetWorld,
    "stories",
    storySlug,
    "_source",
    "pages",
    `${parentPageId}.yaml`
  );

  let parentRaw: string;
  try {
    parentRaw = readFileSync(parentPath, "utf8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return fail(`Failed to read parent page ${parentPageId} at ${parentPath}: ${cause}`);
  }

  let parentParsed: unknown;
  try {
    parentParsed = YAML.parse(parentRaw);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return fail(`Parent page ${parentPageId} (${parentPath}) is not parseable YAML: ${cause}`);
  }

  if (!isRecord(parentParsed)) {
    return fail(`Parent page ${parentPageId} (${parentPath}) is not a YAML mapping.`);
  }

  const parentSnapshot = isRecord(parentParsed.state_snapshot) ? parentParsed.state_snapshot : {};
  const parentActive = isRecord(parentSnapshot.active_records) ? parentSnapshot.active_records : {};

  const activeRecords = replayActiveRecords(
    parentActive as Record<string, readonly string[]>,
    delta,
    recordsById
  );

  return { ok: true, activeRecords };
}

export async function runComputePgSnapshotCli(argv: string[]): Promise<CliResult> {
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

  let raw: string;
  try {
    raw = readFileSync(parsed.args.planPath, "utf8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { stdout: "", stderr: `Failed to read plan file ${parsed.args.planPath}: ${cause}\n`, exitCode: 1 };
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { stdout: "", stderr: `Plan file ${parsed.args.planPath} is not valid JSON: ${cause}\n`, exitCode: 1 };
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

  const outcome = computePgSnapshot(envelope, root.worldRoot);
  if (!outcome.ok) {
    return { stdout: "", stderr: `${trace}${outcome.message}\n`, exitCode: outcome.exitCode };
  }

  const output = `${JSON.stringify({ active_records: outcome.activeRecords }, null, 2)}\n`;
  return { stdout: output, stderr: trace, exitCode: 0 };
}

async function main(): Promise<void> {
  const result = await runComputePgSnapshotCli(process.argv.slice(2));
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
