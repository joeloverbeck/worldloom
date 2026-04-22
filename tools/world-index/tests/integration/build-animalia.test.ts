import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import Database from "better-sqlite3";
import type { NodeRow, NodeType } from "../../src/schema/types";

import { build } from "../../src/commands/build";
import { stats } from "../../src/commands/stats";
import { sync } from "../../src/commands/sync";
import { verify } from "../../src/commands/verify";
import { enumerate } from "../../src/enumerate";
import { extractEntities, loadOntologyRegistry } from "../../src/parse/entities";
import { ENTITY_SOURCE_NODE_TYPES, parseWorldFile } from "../../src/commands/shared";
import { CURRENT_INDEX_VERSION } from "../../src/schema/version";

const WORLD_SLUG = "animalia";
const ANIMALIA_SOURCE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "worlds",
  WORLD_SLUG
);
function createTempRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-animalia-"));
  const target = path.join(root, "worlds", WORLD_SLUG);
  cpSync(ANIMALIA_SOURCE, target, { recursive: true });
  const copiedIndexPath = path.join(target, "_index");
  if (existsSync(copiedIndexPath)) {
    rmSync(copiedIndexPath, { recursive: true, force: true });
  }
  return root;
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function openBuiltDb(root: string): Database.Database {
  return new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), {
    readonly: true
  });
}

function loadExpectedNodeCounts(root: string): Map<NodeType, number> {
  const worldRoot = path.join(root, "worlds", WORLD_SLUG);
  const enumeration = enumerate(worldRoot);
  const counts = new Map<NodeType, number>();
  const proseNodes: NodeRow[] = [];

  assert.deepEqual(
    enumeration.unexpected,
    [],
    `animalia should not contain unexpected index paths: ${enumeration.unexpected.join(", ")}`
  );

  for (const relativePath of enumeration.indexable) {
    const parsed = parseWorldFile(root, WORLD_SLUG, relativePath);
    for (const node of parsed.nodes) {
      counts.set(node.node_type, (counts.get(node.node_type) ?? 0) + 1);
      if (ENTITY_SOURCE_NODE_TYPES.has(node.node_type)) {
        proseNodes.push(node);
      }
    }
  }

  const ontologyPath = path.join(worldRoot, "ONTOLOGY.md");
  const registry = loadOntologyRegistry(ontologyPath);
  const { entityNodes } = extractEntities({ type: "root", children: [] }, proseNodes, registry);
  counts.set("named_entity", entityNodes.length);

  return counts;
}

function loadActualNodeCounts(db: Database.Database): Map<NodeType, number> {
  const rows = db
    .prepare(
      `
        SELECT node_type, COUNT(*) AS count
        FROM nodes
        WHERE world_slug = ?
        GROUP BY node_type
      `
    )
    .all(WORLD_SLUG) as Array<{ node_type: NodeType; count: number }>;

  return new Map(rows.map((row) => [row.node_type, row.count]));
}

function loadContentHashes(db: Database.Database): Array<{ node_id: string; content_hash: string }> {
  return db
    .prepare(
      `
        SELECT node_id, content_hash
        FROM nodes
        WHERE world_slug = ?
        ORDER BY node_id
      `
    )
    .all(WORLD_SLUG) as Array<{ node_id: string; content_hash: string }>;
}

function loadFileVersions(db: Database.Database): Map<string, string> {
  const rows = db
    .prepare(
      `
        SELECT file_path, last_indexed_at
        FROM file_versions
        WHERE world_slug = ?
        ORDER BY file_path
      `
    )
    .all(WORLD_SLUG) as Array<{ file_path: string; last_indexed_at: string }>;

  return new Map(rows.map((row) => [row.file_path, row.last_indexed_at]));
}

function countValidationRows(db: Database.Database, code: string): number {
  return (
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM validation_results
          WHERE world_slug = ?
            AND code = ?
        `
      )
      .get(WORLD_SLUG, code) as { count: number }
  ).count;
}

function loadSchemaObjects(db: Database.Database): string[] {
  return db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type IN ('table', 'view')
        ORDER BY name
      `
    )
    .all()
    .map((row) => (row as { name: string }).name);
}

function loadUnresolvedModifiedByRefs(
  db: Database.Database
): Array<{ target_unresolved_ref: string; count: number }> {
  return db
    .prepare(
      `
        SELECT target_unresolved_ref, COUNT(*) AS count
        FROM edges
        WHERE edge_type = 'modified_by' AND target_unresolved_ref IS NOT NULL
        GROUP BY target_unresolved_ref
        ORDER BY target_unresolved_ref
      `
    )
    .all() as Array<{ target_unresolved_ref: string; count: number }>;
}

function loadUnresolvedRequiredWorldUpdateRefs(
  db: Database.Database
): Array<{ target_unresolved_ref: string; count: number }> {
  return db
    .prepare(
      `
        SELECT target_unresolved_ref, COUNT(*) AS count
        FROM edges
        WHERE edge_type = 'required_world_update' AND target_unresolved_ref IS NOT NULL
        GROUP BY target_unresolved_ref
        ORDER BY target_unresolved_ref
      `
    )
    .all() as Array<{ target_unresolved_ref: string; count: number }>;
}

function countNamedEntityRows(db: Database.Database, entityName: string): number {
  return (
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM nodes
          WHERE world_slug = ?
            AND node_type = 'named_entity'
            AND body LIKE ?
        `
      )
      .get(WORLD_SLUG, `Canonical name: ${entityName} |%`) as { count: number }
  ).count;
}

function countEntityMentionsForNodeType(db: Database.Database, nodeType: NodeType): number {
  return (
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM entity_mentions em
          INNER JOIN nodes n ON n.node_id = em.node_id
          WHERE n.world_slug = ?
            AND n.node_type = ?
        `
      )
      .get(WORLD_SLUG, nodeType) as { count: number }
  ).count;
}

function loadDerivedFromRefsTo(
  db: Database.Database,
  targetId: string
): Array<{ source_node_id: string; target_node_id: string | null; target_unresolved_ref: string | null }> {
  return db
    .prepare(
      `
        SELECT source_node_id, target_node_id, target_unresolved_ref
        FROM edges
        WHERE edge_type = 'derived_from'
          AND (target_node_id = ? OR target_unresolved_ref = ?)
        ORDER BY source_node_id
      `
    )
    .all(targetId, targetId) as Array<{
    source_node_id: string;
    target_node_id: string | null;
    target_unresolved_ref: string | null;
  }>;
}

function expectedIndexableFiles(root: string): string[] {
  return enumerate(path.join(root, "worlds", WORLD_SLUG)).indexable;
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

test("build succeeds, writes the current schema version, and matches source-derived node counts", () => {
  const root = createTempRepoRoot();

  try {
    const expectedCounts = loadExpectedNodeCounts(root);
    const startedAt = Date.now();
    const buildExit = build(root, WORLD_SLUG);
    const elapsedMs = Date.now() - startedAt;

    assert.equal(buildExit, 0);
    assert.ok(elapsedMs < 30_000, `build took ${elapsedMs}ms`);

    const versionPath = path.join(root, "worlds", WORLD_SLUG, "_index", "index_version.txt");
    assert.equal(readFileSync(versionPath, "utf8").trim(), String(CURRENT_INDEX_VERSION));

    const db = openBuiltDb(root);
    try {
      assert.deepEqual(loadActualNodeCounts(db), expectedCounts);
      assert.equal(countValidationRows(db, "unresolved_attribution_target"), 0);
      assert.deepEqual(loadUnresolvedRequiredWorldUpdateRefs(db), []);
      assert.deepEqual(
        loadUnresolvedModifiedByRefs(db).filter((row) =>
          ["CH-0010", "CH-0013", "CH-0014", "CH-0015"].includes(row.target_unresolved_ref)
        ),
        []
      );
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("build recreates a usable animalia index when a stale version marker exists without world.db", () => {
  const root = createTempRepoRoot();

  try {
    const indexRoot = path.join(root, "worlds", WORLD_SLUG, "_index");
    mkdirSync(indexRoot, { recursive: true });
    writeFileSync(path.join(indexRoot, "index_version.txt"), `${CURRENT_INDEX_VERSION}\n`, "utf8");

    assert.equal(build(root, WORLD_SLUG), 0);

    const db = openBuiltDb(root);
    try {
      const schemaObjects = loadSchemaObjects(db);
      assert.equal(schemaObjects.includes("nodes"), true);
      assert.equal(schemaObjects.includes("edges"), true);
      assert.equal(schemaObjects.includes("file_versions"), true);
      assert.equal(schemaObjects.includes("validation_results"), true);
      assert.equal(schemaObjects.includes("fts_nodes"), true);
    } finally {
      db.close();
    }

    const statsResult = withCapturedOutput(() => stats(root, WORLD_SLUG));
    assert.equal(statsResult.result, 0);
    assert.match(statsResult.stdout, /World: animalia/);
    assert.match(statsResult.stdout, /Node counts:/);

    const verifyResult = withCapturedOutput(() => verify(root, WORLD_SLUG));
    assert.equal(verifyResult.result, 0);
  } finally {
    cleanup(root);
  }
});

test("build resolves animalia DA-0001 references through the canonical whole-file node id", () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const db = openBuiltDb(root);
    try {
      const artifactRow = db
        .prepare(
          `
            SELECT node_id, file_path
            FROM nodes
            WHERE world_slug = ?
              AND node_type = 'diegetic_artifact_record'
              AND file_path = 'diegetic-artifacts/a-season-on-the-circuit.md'
          `
        )
        .get(WORLD_SLUG) as { node_id: string; file_path: string };

      assert.deepEqual(artifactRow, {
        node_id: "DA-0001",
        file_path: "diegetic-artifacts/a-season-on-the-circuit.md"
      });

      const derivedFromRows = loadDerivedFromRefsTo(db, "DA-0001");
      assert.equal(derivedFromRows.length, 3);
      assert.equal(derivedFromRows.every((row) => row.target_node_id === "DA-0001"), true);
      assert.equal(derivedFromRows.every((row) => row.target_unresolved_ref === null), true);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("build removes audited workflow-label entities while keeping real animalia entities", () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const db = openBuiltDb(root);
    try {
      for (const banned of [
        "Mystery Reserve",
        "Continuity Archivist",
        "Mystery Curator",
        "Canon Safety Check Trace",
        "Change Log Entry",
        "Primary Difference",
        "Primary Rule",
        "Natural Story Engines",
        "Distribution Discipline",
        "Repairs Applied",
        "Truth Check",
        "World Laundering",
        "Trade Flows",
        "Inequality Patterns",
        "Ruin Ownership",
        "Breakage Point",
        "Tier Finder",
        "Fee Wage Schedule",
        "Count Specifics",
        "Age Linguistic Recovery",
        "Career Contractor Pension",
        "Both Subsection",
        "Attempt Sub",
        "Candidate Log",
        "Captain Cycles",
        "Breakage Points",
        "Regional Asymmetry",
        "Value Stores",
        "In Brinewick",
        "An Ash",
        "Per Phase",
        "Required Updates",
        "No Silent Retcons"
      ]) {
        assert.equal(countNamedEntityRows(db, banned), 0, `${banned} should not persist as a named_entity`);
      }

      for (const retained of [
        "Vespera Nightwhisper",
        "Melissa Threadscar",
        "Charter Hall",
        "Copper Weir",
        "Ash-Seal commercial-company Brinewick anomaly"
      ]) {
        assert.equal(countNamedEntityRows(db, retained), 1, `${retained} should remain queryable`);
      }

      assert.equal(countEntityMentionsForNodeType(db, "adjudication_record"), 0);
      assert.equal(countEntityMentionsForNodeType(db, "audit_record"), 0);
      assert.equal(countValidationRows(db, "content_hash_drift"), 0);
      assert.equal(countValidationRows(db, "yaml_parse_integrity"), 0);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("build is deterministic across fresh runs", () => {
  const leftRoot = createTempRepoRoot();
  const rightRoot = createTempRepoRoot();

  try {
    assert.equal(build(leftRoot, WORLD_SLUG), 0);
    assert.equal(build(rightRoot, WORLD_SLUG), 0);

    const leftDb = openBuiltDb(leftRoot);
    const rightDb = openBuiltDb(rightRoot);
    try {
      assert.deepEqual(loadContentHashes(leftDb), loadContentHashes(rightDb));
    } finally {
      leftDb.close();
      rightDb.close();
    }
  } finally {
    cleanup(leftRoot);
    cleanup(rightRoot);
  }
});

test("build normalizes virtual named_entity provenance to relative ontology paths and valid sentinel spans", () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const db = openBuiltDb(root);
    try {
      const absolutePathRows = (
        db
          .prepare(
            `
              SELECT COUNT(*) AS count
              FROM nodes
              WHERE world_slug = ?
                AND node_type = 'named_entity'
                AND file_path GLOB '/*'
            `
          )
          .get(WORLD_SLUG) as { count: number }
      ).count;
      const invalidSentinelRows = (
        db
          .prepare(
            `
              SELECT COUNT(*) AS count
              FROM nodes
              WHERE world_slug = ?
                AND node_type = 'named_entity'
                AND (
                  file_path != 'ONTOLOGY.md'
                  OR line_start != 1
                  OR line_end != 1
                  OR byte_start != 0
                  OR byte_end != 0
                )
            `
          )
          .get(WORLD_SLUG) as { count: number }
      ).count;

      assert.equal(absolutePathRows, 0);
      assert.equal(invalidSentinelRows, 0);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("build filters audited operational-label false positives from animalia named_entity output", () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const db = openBuiltDb(root);
    try {
      const bannedRows = db
        .prepare(
          `
            SELECT body
            FROM nodes
            WHERE world_slug = ?
              AND node_type = 'named_entity'
              AND body IN (
                'Canonical name: Adds Mystery Reserve | Kind: unknown | Mentions: 2',
                'Canonical name: All Phase | Kind: unknown | Mentions: 1',
                'Canonical name: Age Details | Kind: unknown | Mentions: 15',
                'Canonical name: Action Report | Kind: unknown | Mentions: 2',
                'Canonical name: Access Path | Kind: unknown | Mentions: 1'
              )
          `
        )
        .all(WORLD_SLUG) as Array<{ body: string }>;
      const retainedRows = db
        .prepare(
          `
            SELECT body
            FROM nodes
            WHERE world_slug = ?
              AND node_type = 'named_entity'
              AND body IN (
                'Canonical name: Atreia Selviss | Kind: unknown | Mentions: 2',
                'Canonical name: Bent Willow | Kind: unknown | Mentions: 3'
              )
            ORDER BY body
          `
        )
        .all(WORLD_SLUG) as Array<{ body: string }>;

      assert.deepEqual(bannedRows, []);
      assert.deepEqual(retainedRows, [
        { body: "Canonical name: Atreia Selviss | Kind: unknown | Mentions: 2" },
        { body: "Canonical name: Bent Willow | Kind: unknown | Mentions: 3" }
      ]);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("sync reparses only the touched file", async () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const beforeDb = openBuiltDb(root);
    const before = loadFileVersions(beforeDb);
    beforeDb.close();

    await delay(25);

    const relativePath = "ECONOMY_AND_RESOURCES.md";
    const absolutePath = path.join(root, "worlds", WORLD_SLUG, relativePath);
    writeFileSync(absolutePath, `${readFileSync(absolutePath, "utf8")}\n `, "utf8");

    assert.equal(sync(root, WORLD_SLUG), 0);

    const afterDb = openBuiltDb(root);
    try {
      const after = loadFileVersions(afterDb);
      const changed = [...after.entries()]
        .filter(([filePath, lastIndexedAt]) => before.get(filePath) !== lastIndexedAt)
        .map(([filePath]) => filePath);

      assert.deepEqual(changed, [relativePath]);
    } finally {
      afterDb.close();
    }
  } finally {
    cleanup(root);
  }
});

test("verify flags drift after a manual edit", () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const relativePath = "adjudications/PA-0001-accept_with_required_updates.md";
    const absolutePath = path.join(root, "worlds", WORLD_SLUG, relativePath);

    const beforeDb = openBuiltDb(root);
    const editedNode = beforeDb
      .prepare(
        `
          SELECT node_id
          FROM nodes
          WHERE world_slug = ? AND file_path = ?
        `
      )
      .get(WORLD_SLUG, relativePath) as { node_id: string };
    beforeDb.close();

    writeFileSync(
      absolutePath,
      readFileSync(absolutePath, "utf8").replace(
        "**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES",
        "**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES_DRIFT"
      ),
      "utf8"
    );

    assert.equal(verify(root, WORLD_SLUG), 1);

    const afterDb = openBuiltDb(root);
    try {
      const driftRows = afterDb
        .prepare(
          `
            SELECT validator_name, severity, code, node_id, file_path
            FROM validation_results
            WHERE world_slug = ? AND validator_name = 'drift_check'
            ORDER BY result_id
          `
        )
        .all(WORLD_SLUG) as Array<{
        validator_name: string;
        severity: string;
        code: string;
        node_id: string | null;
        file_path: string | null;
      }>;

      assert.ok(driftRows.length > 0);
      assert.ok(
        driftRows.some(
          (row) =>
            row.severity === "fail" &&
            row.code === "content_hash_drift" &&
            row.node_id === editedNode.node_id &&
            row.file_path === relativePath
        )
      );
    } finally {
      afterDb.close();
    }
  } finally {
    cleanup(root);
  }
});

test("all indexable files appear in file_versions", () => {
  const root = createTempRepoRoot();

  try {
    assert.equal(build(root, WORLD_SLUG), 0);

    const db = openBuiltDb(root);
    try {
      const indexedFiles = db
        .prepare(
          `
            SELECT file_path
            FROM file_versions
            WHERE world_slug = ?
            ORDER BY file_path
          `
        )
        .all(WORLD_SLUG) as Array<{ file_path: string }>;

      assert.deepEqual(
        indexedFiles.map((row) => row.file_path),
        expectedIndexableFiles(root)
      );
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});
