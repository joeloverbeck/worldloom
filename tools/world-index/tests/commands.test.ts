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

function unresolvedAttributionRows(root: string): Array<{
  code: string;
  message: string;
  file_path: string | null;
}> {
  const dbPath = path.join(root, "worlds", "fixture-world", "_index", "world.db");
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare(
        `
          SELECT code, message, file_path
          FROM validation_results
          WHERE world_slug = 'fixture-world'
            AND code = 'unresolved_attribution_target'
          ORDER BY result_id
        `
      )
      .all() as Array<{ code: string; message: string; file_path: string | null }>;
  } finally {
    db.close();
  }
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
    assert.deepEqual(unresolvedAttributionRows(root), []);

    const dbPath = path.join(root, "worlds", "fixture-world", "_index", "world.db");
    const db = new Database(dbPath, { readonly: true });
    try {
      const cfRow = db
        .prepare("SELECT node_id, node_type FROM nodes WHERE node_id = 'CF-0001'")
        .get() as { node_id: string; node_type: string };
      assert.equal(cfRow.node_id, "CF-0001");
      assert.equal(cfRow.node_type, "canon_fact_record");

      const domainFileRow = db
        .prepare("SELECT node_id, node_type FROM nodes WHERE file_path = 'INSTITUTIONS.md' AND node_type = 'domain_file'")
        .get() as { node_id: string; node_type: string };
      assert.equal(domainFileRow.node_id, "fixture-world:INSTITUTIONS.md:__file__");
      assert.equal(domainFileRow.node_type, "domain_file");

      const requiredUpdateEdge = db
        .prepare(
          `
            SELECT target_node_id, target_unresolved_ref
            FROM edges
            WHERE source_node_id = 'CF-0001'
              AND edge_type = 'required_world_update'
          `
        )
        .get() as { target_node_id: string | null; target_unresolved_ref: string | null };
      assert.equal(requiredUpdateEdge.target_node_id, "fixture-world:INSTITUTIONS.md:__file__");
      assert.equal(requiredUpdateEdge.target_unresolved_ref, null);

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

test("unresolved attribution warnings are recomputed after full-world resolution and clear on sync", () => {
  const root = createTempRepoRoot();

  try {
    const institutionsPath = path.join(root, "worlds", "fixture-world", "INSTITUTIONS.md");
    writeFileSync(
      institutionsPath,
      `${readFileSync(institutionsPath, "utf8")}\nThe watch now rings a third bell.\n<!-- added by CF-9999 -->\n`,
      "utf8"
    );

    assert.equal(build(root, "fixture-world"), 0);

    const unresolvedAfterBuild = unresolvedAttributionRows(root);
    assert.equal(unresolvedAfterBuild.length, 1);
    assert.equal(unresolvedAfterBuild[0]?.file_path, "INSTITUTIONS.md");
    assert.match(unresolvedAfterBuild[0]?.message ?? "", /still unresolved after full-world edge resolution/);

    const ledgerPath = path.join(root, "worlds", "fixture-world", "CANON_LEDGER.md");
    const existingLedger = readFileSync(ledgerPath, "utf8");
    writeFileSync(
      ledgerPath,
      existingLedger.replace(
        "## Change Log",
        `\`\`\`yaml\nid: CF-9999\ntitle: Third harbor bell\nstatus: hard_canon\ntype: institution\nstatement: Brinewick rings a third harbor bell at dusk.\nscope:\n  geographic: local\n  temporal: current\n  social: public\ntruth_scope:\n  world_level: true\n  diegetic_status: objective\ndomains_affected:\n  - institutions\nrequired_world_updates:\n  - INSTITUTIONS.md\nsource_basis:\n  direct_user_approval: true\n\`\`\`\n\n## Change Log`
      ),
      "utf8"
    );

    assert.equal(sync(root, "fixture-world"), 0);
    assert.deepEqual(unresolvedAttributionRows(root), []);
  } finally {
    cleanup(root);
  }
});
