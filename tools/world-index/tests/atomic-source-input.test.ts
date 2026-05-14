import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

test("build logs and skips story records whose id fails the registered schema pattern", () => {
  const root = createAtomicRepoRoot();

  try {
    const intentionDirectory = path.join(
      root,
      "worlds",
      "atomic-world",
      "stories",
      "harborwatch",
      "_source",
      "intentions"
    );
    mkdirSync(intentionDirectory, { recursive: true });
    writeFileSync(
      path.join(intentionDirectory, "STINT-0001-iker.yaml"),
      [
        "id: STINT-0001-iker",
        "story_id: STORY-0001",
        "character_id: STENT-0001",
        "goal: Keep watch at the salt gate.",
        "status: active",
        ""
      ].join("\n"),
      "utf8"
    );

    assert.equal(build(root, "atomic-world", { quiet: true }), 0);

    const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const skippedNode = db
        .prepare("SELECT node_id FROM nodes WHERE node_id = 'harborwatch:STINT-0001-iker'")
        .get();
      assert.equal(skippedNode, undefined);
    } finally {
      db.close();
    }

    const skipLog = readFileSync(
      path.join(root, "worlds", "atomic-world", "_index", "world.db.skipped_records.log"),
      "utf8"
    );
    assert.match(skipLog, /stories\/harborwatch\/_source\/intentions\/STINT-0001-iker\.yaml/);
    assert.match(skipLog, /\tintention_record\tSTINT-0001-iker\tschema_pattern_mismatch\t\^STINT-\[0-9\]\+\$/);
  } finally {
    cleanup(root);
  }
});

test("build indexes valid story intention records without creating a skip log", () => {
  const root = createAtomicRepoRoot();

  try {
    const intentionDirectory = path.join(
      root,
      "worlds",
      "atomic-world",
      "stories",
      "harborwatch",
      "_source",
      "intentions"
    );
    mkdirSync(intentionDirectory, { recursive: true });
    writeFileSync(
      path.join(intentionDirectory, "STINT-0001.yaml"),
      [
        "id: STINT-0001",
        "story_id: STORY-0001",
        "character_id: STENT-0001",
        "goal: Keep watch at the salt gate.",
        "status: active",
        ""
      ].join("\n"),
      "utf8"
    );

    assert.equal(build(root, "atomic-world", { quiet: true }), 0);

    const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const validNode = db
        .prepare("SELECT node_id, node_type FROM nodes WHERE node_id = 'harborwatch:STINT-0001'")
        .get() as { node_id: string; node_type: string };
      assert.deepEqual(validNode, {
        node_id: "harborwatch:STINT-0001",
        node_type: "intention_record"
      });
    } finally {
      db.close();
    }

    assert.equal(
      existsSync(path.join(root, "worlds", "atomic-world", "_index", "world.db.skipped_records.log")),
      false
    );
  } finally {
    cleanup(root);
  }
});

test("build indexes valid story status records", () => {
  const root = createAtomicRepoRoot();

  try {
    const statusDirectory = path.join(
      root,
      "worlds",
      "atomic-world",
      "stories",
      "harborwatch",
      "_source",
      "status"
    );
    mkdirSync(statusDirectory, { recursive: true });
    writeFileSync(
      path.join(statusDirectory, "STSTAT-0001.yaml"),
      [
        "id: STSTAT-0001",
        "story_id: STORY-0001",
        "created_at_page: PG-0001",
        "entity: STENT-0001",
        "life: alive",
        "agency: free",
        "location: STLOC-0001",
        ""
      ].join("\n"),
      "utf8"
    );

    assert.equal(build(root, "atomic-world", { quiet: true }), 0);

    const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const validNode = db
        .prepare("SELECT node_id, node_type FROM nodes WHERE node_id = 'harborwatch:STSTAT-0001'")
        .get() as { node_id: string; node_type: string };
      assert.deepEqual(validNode, {
        node_id: "harborwatch:STSTAT-0001",
        node_type: "story_status_record"
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
