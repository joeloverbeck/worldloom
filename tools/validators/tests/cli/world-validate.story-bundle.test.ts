import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import yaml from "js-yaml";

const cliPath = path.resolve(process.cwd(), "dist/src/cli/world-validate.js");

test("world-validate --story scopes storylet predicate validation to one bundle", () => {
  const repo = createIndexedStoryWorld();

  const scoped = spawnSync(
    process.execPath,
    [cliPath, "clean", "--story", "alpha", "--rules", "storylet_predicate_dsl_parsability", "--json"],
    { cwd: repo, encoding: "utf8" }
  );
  assert.equal(scoped.status, 0, scoped.stderr + scoped.stdout);
  const scopedRun = JSON.parse(scoped.stdout) as { summary: { validators_run: string[]; fail_count: number } };
  assert.deepEqual(scopedRun.summary.validators_run, ["storylet_predicate_dsl_parsability"]);
  assert.equal(scopedRun.summary.fail_count, 0);

  const unscoped = spawnSync(
    process.execPath,
    [cliPath, "clean", "--rules", "storylet_predicate_dsl_parsability", "--json"],
    { cwd: repo, encoding: "utf8" }
  );
  assert.equal(unscoped.status, 1, unscoped.stderr + unscoped.stdout);
  const unscopedRun = JSON.parse(unscoped.stdout) as { verdicts: Array<{ code: string; message: string }> };
  assert.equal(unscopedRun.verdicts[0]?.code, "predicate.unknown_pred");
  assert.match(unscopedRun.verdicts[0]?.message ?? "", /SLT-0002/);
});

function createIndexedStoryWorld(): string {
  const repo = mkdtempSync(path.join(tmpdir(), "worldloom-validators-story-"));
  const world = path.join(repo, "worlds", "clean");
  mkdirSync(path.join(world, "_index"), { recursive: true });

  const db = new Database(path.join(world, "_index", "world.db"));
  db.exec(`
    CREATE TABLE nodes (
      node_id TEXT PRIMARY KEY,
      world_slug TEXT NOT NULL,
      story_slug TEXT,
      file_path TEXT NOT NULL,
      node_type TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE validation_results (
      result_id INTEGER PRIMARY KEY AUTOINCREMENT,
      world_slug TEXT NOT NULL,
      validator_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      node_id TEXT,
      file_path TEXT,
      line_range_start INTEGER,
      line_range_end INTEGER,
      created_at TEXT NOT NULL
    );
  `);
  const insert = db.prepare(
    "INSERT INTO nodes (node_id, world_slug, story_slug, file_path, node_type, body) VALUES (?, 'clean', ?, ?, ?, ?)"
  );
  insertStoryRecords(insert, "alpha", "SLT-0001", { pred: "entity_status", entity: "STENT-0001", axis: "agency", value: "free" });
  insertStoryRecords(insert, "beta", "SLT-0002", { pred: "phase_of_moon", value: "waning" });
  db.close();

  writeFileSync(path.join(world, ".keep"), "", "utf8");
  return repo;
}

function insertStoryRecords(
  insert: Database.Statement,
  storySlug: string,
  storyletId: string,
  predicate: Record<string, unknown>
): void {
  const basePath = `stories/${storySlug}/_source`;
  for (const [nodeType, id, subdir, parsed] of [
    ["story_entity_record", "STENT-0001", "entities", { id: "STENT-0001" }],
    ["storylet_record", storyletId, "storylets", { id: storyletId, preconditions: { hard: [predicate] } }]
  ] as const) {
    insert.run(`${storySlug}:${id}`, storySlug, `${basePath}/${subdir}/${id}.yaml`, nodeType, yaml.dump(parsed));
  }
}
