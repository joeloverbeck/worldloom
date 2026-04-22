import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../src/commands/build";
import { inspect } from "../src/commands/inspect";
import { stats } from "../src/commands/stats";
import { sync } from "../src/commands/sync";
import { verify } from "../src/commands/verify";

function createTempRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-commands-"));
  const source = path.resolve(__dirname, "..", "..", "tests", "fixtures", "fixture-world");
  const target = path.join(root, "worlds", "fixture-world");
  cpSync(source, target, { recursive: true });
  return root;
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function withCapturedOutput<T>(run: () => T): { result: T; stdout: string; stderr: string } {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdoutWrite = process.stdout.write.bind(process.stdout);
  const stderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutChunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderrChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    return {
      result: run(),
      stdout: stdoutChunks.join(""),
      stderr: stderrChunks.join("")
    };
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  }
}

test("build, inspect, stats, sync, and verify work against the fixture world", async () => {
  const root = createTempRepoRoot();

  try {
    const buildExit = build(root, "fixture-world");
    assert.equal(buildExit, 0);

    const dbPath = path.join(root, "worlds", "fixture-world", "_index", "world.db");
    const db = new Database(dbPath, { readonly: true });
    try {
      const cfRow = db
        .prepare("SELECT node_id, node_type FROM nodes WHERE node_id = 'CF-0001'")
        .get() as { node_id: string; node_type: string };
      assert.equal(cfRow.node_id, "CF-0001");
      assert.equal(cfRow.node_type, "canon_fact_record");

      const entityRow = db
        .prepare("SELECT node_id FROM nodes WHERE node_type = 'named_entity' AND node_id = 'entity:brinewick'")
        .get() as { node_id: string };
      assert.equal(entityRow.node_id, "entity:brinewick");
    } finally {
      db.close();
    }

    const inspectResult = withCapturedOutput(() => inspect(root, "CF-0001"));
    assert.equal(inspectResult.result, 0);
    assert.match(inspectResult.stdout, /"node_id": "CF-0001"/);
    assert.match(inspectResult.stdout, /"worldSlug": "fixture-world"/);

    const statsResult = withCapturedOutput(() => stats(root, "fixture-world"));
    assert.equal(statsResult.result, 0);
    assert.match(statsResult.stdout, /canon_fact_record: 1/);
    assert.match(statsResult.stdout, /INSTITUTIONS\.md:/);

    const institutionsPath = path.join(root, "worlds", "fixture-world", "INSTITUTIONS.md");
    writeFileSync(
      institutionsPath,
      `${readFileSync(institutionsPath, "utf8")}\nThe harbor bell is now watched at dusk.\n`,
      "utf8"
    );

    const syncExit = sync(root, "fixture-world");
    assert.equal(syncExit, 0);

    const verifyResult = withCapturedOutput(() => verify(root, "fixture-world"));
    assert.equal(verifyResult.result, 0);

    writeFileSync(
      institutionsPath,
      `${readFileSync(institutionsPath, "utf8").replace("watched at dusk", "watched all night")}`,
      "utf8"
    );

    const driftResult = withCapturedOutput(() => verify(root, "fixture-world"));
    assert.equal(driftResult.result, 1);
  } finally {
    cleanup(root);
  }
});
