import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { selectValidators } from "../../src/cli/_helpers.js";
import { structuralValidators, ruleValidators } from "../../src/public/registry.js";
import { parseJsonOutput, runWorldValidate } from "../_helpers/cli.js";
import { context } from "../structural/helpers.js";

test("world-validate --compatibility selects exactly the compatibility validator subset", () => {
  const selected = selectValidators(structuralValidators, ruleValidators, { compatibility: true }, context([]))
    .map((validator) => validator.name);

  assert.deepEqual(selected, [
    "record_schema_compliance",
    "approval_semantics",
    "artifact_maturity",
    "index_disk_consistency"
  ]);
});

test("world-validate --compatibility reports full-world warnings without failing", () => {
  const repo = createIndexedWorldWithIndexDrift();
  try {
    const result = runWorldValidate(["compat", "--compatibility", "--json"], {
      cwd: repo,
      expectedStatus: 0
    });

    const parsed = parseJsonOutput<{
      verdicts: Array<{ validator: string; code: string; severity: string }>;
      summary: { fail_count: number; warn_count: number; validators_run: string[] };
    }>(result);

    assert.deepEqual(parsed.summary.validators_run, [
      "record_schema_compliance",
      "approval_semantics",
      "artifact_maturity",
      "index_disk_consistency"
    ]);
    assert.equal(parsed.summary.fail_count, 0);
    assert.equal(parsed.summary.warn_count, 1);
    assert.deepEqual(parsed.verdicts.map((verdict) => ({
      validator: verdict.validator,
      code: verdict.code,
      severity: verdict.severity
    })), [
      {
        validator: "index_disk_consistency",
        code: "index_disk_drift",
        severity: "warn"
      }
    ]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

function createIndexedWorldWithIndexDrift(): string {
  const repo = mkdtempSync(path.join(tmpdir(), "worldloom-compat-cli-"));
  const world = path.join(repo, "worlds", "compat");
  mkdirSync(path.join(world, "character-proposals"), { recursive: true });
  mkdirSync(path.join(world, "_index"), { recursive: true });
  writeFileSync(
    path.join(world, "character-proposals", "INDEX.md"),
    "- [Absent Candidate](NCP-1-absent.md) - protagonist\n",
    "utf8"
  );

  const db = new Database(path.join(world, "_index", "world.db"));
  db.exec(`
    CREATE TABLE nodes (
      node_id TEXT PRIMARY KEY,
      world_slug TEXT NOT NULL,
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
  db.close();

  return repo;
}
