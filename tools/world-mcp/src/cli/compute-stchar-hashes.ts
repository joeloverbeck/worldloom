#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { isMainModule } from "../esm-main.js";
import {
  computeStcharPagePacketHash,
  computeStcharProfileHash,
  computeStcharVoiceBlockHash
} from "../package-interop.js";

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const HELP_TEXT = `Usage: compute-stchar-hashes --profile <body-md-path> --packet <packet-md-path>

Computes the three content-derived sha256 hashes that every STCHAR record
requires, per the story state contract / story-record-schemas §4.5.19. These are
the canonical, reproducible values story-pipeline skills stamp onto the STCHAR
frontmatter and cite verbatim in the page-plan §16a packet and the prose receipt:

  profile_hash      = sha256 over the STCHAR body markdown (the 13 stchar.v1
                      sections; everything after the frontmatter).
  voice_block_hash  = sha256 over the '## Page-Plan Voice Block' section body.
  page_packet_hash  = sha256 over the §16a page-plan packet projection text.

All three use sha256 over normalizeProseWhitespace-normalized content, not raw
bytes: body markdown for profile_hash, the Page-Plan Voice Block section for
voice_block_hash, and the §16a packet projection for page_packet_hash. This is
deliberately different from compute-pg-hashes plan_hash, which hashes raw page
plan bytes. Hand-rolling these per skill caused divergent implementations; this
CLI is the single source of truth (it reuses the @worldloom/world-index/hash/content
helpers, the same module compute-pg-hashes uses).

source_char_hash is NOT computed here. It is not a content-derived hash: it must
equal the world index content_hash of the source CHAR dossier so that
branching-story-health-audit source_drift is meaningful. Set it to
'sha256:' + the content_hash returned by mcp__worldloom__get_record(<CHAR-id>).

Arguments:
  --profile <path>   Path to the STCHAR markdown. Accepts either a full STCHAR
                     file (frontmatter + body) or a body-only document; the body
                     is extracted the same way the stchar_body_integrity
                     validator extracts it (after the closing '---', one leading
                     newline stripped). Drives profile_hash and voice_block_hash.
  --packet <path>    Path to the §16a page-plan packet projection text (the
                     authority-field bullets this profile authorizes for §16a).
                     Drives page_packet_hash.

Options:
  --help             Show this help and exit.

Output (stdout, JSON):
  {
    "profile_hash":     "sha256:<64 lowercase hex>",
    "voice_block_hash": "sha256:<64 lowercase hex>",
    "page_packet_hash": "sha256:<64 lowercase hex>"
  }

Exit codes:
  0   All three hashes computed successfully.
  1   I/O error, or the body has no '## Page-Plan Voice Block' section.
  2   CLI argument error.

Example:
  node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js \\
    --profile /tmp/STCHAR-1.body.md \\
    --packet  /tmp/STCHAR-1.packet.md
`;

interface CliArgs {
  profilePath: string;
  packetPath: string;
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
        profile: { type: "string" };
        packet: { type: "string" };
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
        profile: { type: "string" },
        packet: { type: "string" }
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

  const profilePath = parsed.values.profile;
  const packetPath = parsed.values.packet;
  if (profilePath === undefined || profilePath.length === 0) {
    return { kind: "error", message: "--profile <path> is required." };
  }
  if (packetPath === undefined || packetPath.length === 0) {
    return { kind: "error", message: "--packet <path> is required." };
  }
  if (parsed.positionals.length > 0) {
    return {
      kind: "error",
      message: `Unexpected positional argument(s): ${parsed.positionals.join(", ")}`
    };
  }

  return { kind: "args", args: { profilePath, packetPath } };
}

function readText(filePath: string, label: string): { ok: true; text: string } | { ok: false; message: string } {
  try {
    return { ok: true, text: readFileSync(filePath, "utf8") };
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to read ${label} file ${filePath}: ${cause}` };
  }
}

export async function runComputeStcharHashesCli(argv: string[]): Promise<CliResult> {
  const parsed = parseCli(argv);

  if (parsed.kind === "help") {
    return { stdout: HELP_TEXT, stderr: "", exitCode: 0 };
  }

  if (parsed.kind === "error") {
    return { stdout: "", stderr: `Error: ${parsed.message}\n\n${HELP_TEXT}`, exitCode: 2 };
  }

  const profileResult = readText(parsed.args.profilePath, "profile");
  if (!profileResult.ok) {
    return { stdout: "", stderr: `${profileResult.message}\n`, exitCode: 1 };
  }

  const packetResult = readText(parsed.args.packetPath, "packet");
  if (!packetResult.ok) {
    return { stdout: "", stderr: `${packetResult.message}\n`, exitCode: 1 };
  }

  let profileHash: string;
  let voiceBlockHash: string;
  try {
    profileHash = computeStcharProfileHash(profileResult.text);
    voiceBlockHash = computeStcharVoiceBlockHash(profileResult.text);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { stdout: "", stderr: `${cause}\n`, exitCode: 1 };
  }
  const pagePacketHash = computeStcharPagePacketHash(packetResult.text);

  const output = `${JSON.stringify(
    {
      profile_hash: `sha256:${profileHash}`,
      voice_block_hash: `sha256:${voiceBlockHash}`,
      page_packet_hash: `sha256:${pagePacketHash}`
    },
    null,
    2
  )}\n`;
  return { stdout: output, stderr: "", exitCode: 0 };
}

async function main(): Promise<void> {
  const result = await runComputeStcharHashesCli(process.argv.slice(2));
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
