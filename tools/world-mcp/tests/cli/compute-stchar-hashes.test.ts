import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { computeStcharPagePacketHash } from "../../src/package-interop.js";

import { runComputeStcharHashesCli } from "../../src/cli/compute-stchar-hashes.js";

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-compute-stchar-hashes-"));
}

function writeText(dir: string, name: string, value: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

const PROFILE_BODY = [
  "# Test Character",
  "",
  "## Story-Facing Identity",
  "",
  "A deliberately small test profile.",
  "",
  "## Page-Plan Voice Block",
  "",
  "Short, clipped, and wary.",
  "",
  "## Validation / Audit Anchors",
  "",
  "Source: test.",
  ""
].join("\n");

function packet(pagePacketHash: string): string {
  return [
    "- STENT-1 / STCHAR-1 - Test Character.",
    "  - Required because: speaker.",
    `  - Hashes: profile_hash=sha256:${"a".repeat(64)}; voice_block_hash=sha256:${"b".repeat(64)}; page_packet_hash=${pagePacketHash}.`,
    "  - Voice/dialogue authority: Short, clipped, and wary.",
    "  - Relevant appraisal rules: Trust must be earned.",
    ""
  ].join("\n");
}

test("cli-compute-stchar-hashes: --help documents page_packet_hash canonicalization", async () => {
  const result = await runComputeStcharHashesCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /sha256:<page_packet_hash>/);
  assert.match(result.stdout, /masks only the page_packet_hash value/);
  assert.equal(result.stderr, "");
});

test("cli-compute-stchar-hashes: computes page_packet_hash from the non-self-referential packet projection", async () => {
  const tmp = makeTmpDir();
  try {
    const profilePath = writeText(tmp, "STCHAR-1.md", `---\nid: STCHAR-1\n---\n${PROFILE_BODY}`);
    const packetPath = writeText(tmp, "STCHAR-1.packet.md", packet(`sha256:${"c".repeat(64)}`));

    const result = await runComputeStcharHashesCli(["--profile", profilePath, "--packet", packetPath]);
    const output = JSON.parse(result.stdout) as { page_packet_hash: string };

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.page_packet_hash, `sha256:${computeStcharPagePacketHash(packet(`sha256:${"d".repeat(64)}`))}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
