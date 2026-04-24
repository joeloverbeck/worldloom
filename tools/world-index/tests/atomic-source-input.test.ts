import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../src/commands/build";
import { verify } from "../src/commands/verify";
import { cleanup, createAtomicRepoRoot, createLegacyRepoRoot } from "./helpers/atomic-fixture";

function loadDriftRows(
  root: string
): Array<{ validator_name: string; severity: string; code: string; node_id: string | null; file_path: string | null }> {
  const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
    readonly: true
  });
  try {
    return db
      .prepare(
        `
          SELECT validator_name, severity, code, node_id, file_path
          FROM validation_results
          WHERE world_slug = 'atomic-world'
            AND validator_name = 'drift_check'
          ORDER BY result_id
        `
      )
      .all() as Array<{
      validator_name: string;
      severity: string;
      code: string;
      node_id: string | null;
      file_path: string | null;
    }>;
  } finally {
    db.close();
  }
}

test("build reads SPEC-13 atomic source records without retired root markdown files", () => {
  const root = createAtomicRepoRoot();

  try {
    assert.equal(build(root, "atomic-world"), 0);

    const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const nodeRows = db
        .prepare(
          `
            SELECT node_id, node_type
            FROM nodes
            WHERE node_id IN (
              'CF-0001',
              'CH-0001',
              'ONT-1',
              'M-1',
              'OQ-0001',
              'ENT-0001',
              'SEC-INS-001',
              'entity:brinewick',
              'atomic-world:INSTITUTIONS.md:__file__'
            )
            ORDER BY node_id
          `
        )
        .all() as Array<{ node_id: string; node_type: string }>;

      assert.deepEqual(nodeRows, [
        { node_id: "CF-0001", node_type: "canon_fact_record" },
        { node_id: "CH-0001", node_type: "change_log_entry" },
        { node_id: "ENT-0001", node_type: "named_entity" },
        { node_id: "M-1", node_type: "mystery_reserve_entry" },
        { node_id: "ONT-1", node_type: "invariant" },
        { node_id: "OQ-0001", node_type: "open_question_entry" },
        { node_id: "SEC-INS-001", node_type: "section" },
        { node_id: "atomic-world:INSTITUTIONS.md:__file__", node_type: "domain_file" },
        { node_id: "entity:brinewick", node_type: "named_entity" }
      ]);

      const requiredWorldUpdate = db
        .prepare(
          `
            SELECT target_node_id, target_unresolved_ref
            FROM edges
            WHERE source_node_id = 'CF-0001'
              AND edge_type = 'required_world_update'
          `
        )
        .get() as { target_node_id: string | null; target_unresolved_ref: string | null };
      assert.deepEqual(requiredWorldUpdate, {
        target_node_id: "atomic-world:INSTITUTIONS.md:__file__",
        target_unresolved_ref: null
      });

      const touchedBy = db
        .prepare(
          `
            SELECT target_node_id, target_unresolved_ref
            FROM edges
            WHERE source_node_id = 'SEC-INS-001'
              AND edge_type = 'patched_by'
          `
        )
        .get() as { target_node_id: string | null; target_unresolved_ref: string | null };
      assert.deepEqual(touchedBy, {
        target_node_id: "CF-0001",
        target_unresolved_ref: null
      });
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("build rejects worlds without recognized SPEC-13 atomic source records", () => {
  const root = createLegacyRepoRoot();

  try {
    assert.equal(build(root, "legacy-world"), 3);
    assert.equal(existsSync(path.join(root, "worlds", "legacy-world", "_index", "world.db")), false);
  } finally {
    cleanup(root);
  }
});

test("verify skips atomic logical rows and detects drift in disk-backed atomic records", () => {
  const root = createAtomicRepoRoot();

  try {
    assert.equal(build(root, "atomic-world"), 0);
    assert.equal(verify(root, "atomic-world"), 0);
    assert.deepEqual(loadDriftRows(root), []);

    const sourcePath = path.join(
      root,
      "worlds",
      "atomic-world",
      "_source",
      "institutions",
      "SEC-INS-001.yaml"
    );
    writeFileSync(
      sourcePath,
      readFileSync(sourcePath, "utf8").replace(
        "body: Brinewick wardens keep the public salt measures.",
        "body: Brinewick wardens keep the public salt measures and bells."
      ),
      "utf8"
    );

    assert.equal(verify(root, "atomic-world"), 1);
    assert.deepEqual(loadDriftRows(root), [
      {
        validator_name: "drift_check",
        severity: "fail",
        code: "content_hash_drift",
        node_id: "SEC-INS-001",
        file_path: "_source/institutions/SEC-INS-001.yaml"
      }
    ]);
  } finally {
    cleanup(root);
  }
});
