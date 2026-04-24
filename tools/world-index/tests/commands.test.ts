import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../src/commands/build";
import { inspect } from "../src/commands/inspect";
import { stats } from "../src/commands/stats";
import { sync } from "../src/commands/sync";
import { verify } from "../src/commands/verify";
import { cleanup, createAtomicRepoRoot } from "./helpers/atomic-fixture";

function unresolvedAttributionRows(root: string): Array<{
  code: string;
  message: string;
  file_path: string | null;
}> {
  const dbPath = path.join(root, "worlds", "atomic-world", "_index", "world.db");
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare(
        `
          SELECT code, message, file_path
          FROM validation_results
          WHERE world_slug = 'atomic-world'
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

test("build, inspect, stats, sync, and verify work against an atomic fixture world", async () => {
  const root = createAtomicRepoRoot();

  try {
    const buildExit = build(root, "atomic-world");
    assert.equal(buildExit, 0);
    assert.deepEqual(unresolvedAttributionRows(root), []);

    const dbPath = path.join(root, "worlds", "atomic-world", "_index", "world.db");
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
      assert.equal(domainFileRow.node_id, "atomic-world:INSTITUTIONS.md:__file__");
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
      assert.equal(requiredUpdateEdge.target_node_id, "atomic-world:INSTITUTIONS.md:__file__");
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
    assert.match(inspectResult.stdout, /"worldSlug": "atomic-world"/);
    assert.match(inspectResult.stdout, /"entity_record": null/);
    assert.match(inspectResult.stdout, /"entity_aliases": \[\]/);

    const entityInspect = withCapturedOutput(() => inspect(root, "entity:brinewick"));
    assert.equal(entityInspect.result, 0);
    assert.match(entityInspect.stdout, /"entity_record": \{/);
    assert.match(entityInspect.stdout, /"canonical_name": "Brinewick"/);

    const statsResult = withCapturedOutput(() => stats(root, "atomic-world"));
    assert.equal(statsResult.result, 0);
    assert.match(statsResult.stdout, /canon_fact_record: 1/);
    assert.match(statsResult.stdout, /INSTITUTIONS\.md:/);

    const institutionsPath = path.join(
      root,
      "worlds",
      "atomic-world",
      "_source",
      "institutions",
      "SEC-INS-001.yaml"
    );
    writeFileSync(
      institutionsPath,
      readFileSync(institutionsPath, "utf8").replace(
        "body: Brinewick wardens keep the public salt measures.",
        "body: Brinewick wardens keep the public salt measures at dusk."
      ),
      "utf8"
    );

    const syncExit = sync(root, "atomic-world");
    assert.equal(syncExit, 0);

    const verifyResult = withCapturedOutput(() => verify(root, "atomic-world"));
    assert.equal(verifyResult.result, 0);

    writeFileSync(
      institutionsPath,
      readFileSync(institutionsPath, "utf8").replace("at dusk", "all night"),
      "utf8"
    );

    const driftResult = withCapturedOutput(() => verify(root, "atomic-world"));
    assert.equal(driftResult.result, 1);
  } finally {
    cleanup(root);
  }
});

test("unresolved attribution warnings are recomputed after full-world resolution and clear on sync", () => {
  const root = createAtomicRepoRoot();

  try {
    const institutionsPath = path.join(
      root,
      "worlds",
      "atomic-world",
      "_source",
      "institutions",
      "SEC-INS-001.yaml"
    );
    writeFileSync(
      institutionsPath,
      readFileSync(institutionsPath, "utf8").replace(
        "touched_by_cf: [CF-0001]",
        "touched_by_cf: [CF-0001, CF-9999]"
      ),
      "utf8"
    );

    assert.equal(build(root, "atomic-world"), 0);

    const unresolvedAfterBuild = unresolvedAttributionRows(root);
    assert.equal(unresolvedAfterBuild.length, 1);
    assert.equal(unresolvedAfterBuild[0]?.file_path, "_source/institutions/SEC-INS-001.yaml");
    assert.match(unresolvedAfterBuild[0]?.message ?? "", /still unresolved after full-world edge resolution/);

    const cfPath = path.join(root, "worlds", "atomic-world", "_source", "canon", "CF-9999.yaml");
    writeFileSync(
      cfPath,
      [
        "id: CF-9999",
        "title: Third harbor bell",
        "status: hard_canon",
        "type: institution",
        "statement: Brinewick rings a third harbor bell at dusk.",
        "scope:",
        "  geographic: local",
        "  temporal: current",
        "  social: public",
        "truth_scope:",
        "  world_level: true",
        "  diegetic_status: objective",
        "domains_affected:",
        "  - institutions",
        "required_world_updates:",
        "  - INSTITUTIONS",
        "source_basis:",
        "  direct_user_approval: true",
        ""
      ].join("\n"),
      "utf8"
    );

    assert.equal(sync(root, "atomic-world"), 0);
    assert.deepEqual(unresolvedAttributionRows(root), []);
  } finally {
    cleanup(root);
  }
});
