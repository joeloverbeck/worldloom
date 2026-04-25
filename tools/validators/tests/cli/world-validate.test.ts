import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import yaml from "js-yaml";

const cliPath = path.resolve(process.cwd(), "dist/src/cli/world-validate.js");

test("world-validate exposes help and version", () => {
  const help = execFileSync(cliPath, ["--help"], { encoding: "utf8" });
  for (const flag of ["--rules", "--structural", "--json", "--file", "--since", "--help", "--version"]) {
    assert.match(help, new RegExp(flag));
  }

  const version = execFileSync(cliPath, ["--version"], { encoding: "utf8" }).trim();
  const packageJson = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")) as {
    version: string;
  };
  assert.equal(version, packageJson.version);
});

test("world-validate reports invalid input and missing index with documented exit codes", () => {
  const repo = createRepo();
  mkdirSync(path.join(repo, "worlds", "no-index"), { recursive: true });

  const invalidSlug = spawnSync(cliPath, ["missing-world"], { cwd: repo, encoding: "utf8" });
  assert.equal(invalidSlug.status, 2);
  assert.match(invalidSlug.stderr, /not found/);

  const missingIndex = spawnSync(cliPath, ["no-index"], { cwd: repo, encoding: "utf8" });
  assert.equal(missingIndex.status, 3);
  assert.match(missingIndex.stderr, /index missing/);
});

test("world-validate rejects mutually-exclusive validator selectors", () => {
  const repo = createIndexedWorld();
  const result = spawnSync(cliPath, ["clean", "--rules=1", "--structural"], {
    cwd: repo,
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /mutually exclusive/);

  const skillJudgmentRule = spawnSync(cliPath, ["clean", "--rules=3"], {
    cwd: repo,
    encoding: "utf8"
  });
  assert.equal(skillJudgmentRule.status, 2);
  assert.match(skillJudgmentRule.stderr, /mechanized rule numbers/);
});

test("world-validate emits JSON and keeps clean-run persistence stable", () => {
  const repo = createIndexedWorld();

  const first = spawnSync(cliPath, ["clean", "--json"], { cwd: repo, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr + first.stdout);
  const parsed = JSON.parse(first.stdout) as {
    summary: { fail_count: number; validators_run: string[] };
    run_mode: string;
  };
  assert.equal(parsed.run_mode, "full-world");
  assert.equal(parsed.summary.fail_count, 0);
  assert.ok(!parsed.summary.validators_run.includes("adjudication_discovery_fields"));

  const dbPath = path.join(repo, "worlds", "clean", "_index", "world.db");
  const firstCount = validationRowCount(dbPath);
  const second = spawnSync(cliPath, ["clean"], { cwd: repo, encoding: "utf8" });
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.equal(validationRowCount(dbPath), firstCount);
});

test("world-validate exits 1 and persists verdict rows for a deliberate violation", () => {
  const repo = createIndexedWorld({
    mysteryOverride: {
      disallowed_cheap_answers: []
    }
  });

  const result = spawnSync(cliPath, ["clean", "--file", "worlds/clean/_source/mystery-reserve/M-1.yaml"], {
    cwd: repo,
    encoding: "utf8"
  });

  assert.equal(result.status, 1, result.stderr + result.stdout);
  assert.match(result.stdout, /rule7\.missing_disallowed_cheap_answers/);
  assert.ok(validationRowCount(path.join(repo, "worlds", "clean", "_index", "world.db")) > 0);
});

test("world-validate downgrades exact grandfathered bootstrap findings to info", () => {
  const repo = createIndexedWorld({
    mysteryOverride: {
      disallowed_cheap_answers: []
    }
  });
  const world = path.join(repo, "worlds", "clean");
  mkdirSync(path.join(world, "audits"), { recursive: true });
  writeFileSync(
    path.join(world, "audits", "validation-grandfathering.yaml"),
    yaml.dump({
      schema: "worldloom.validation_grandfathering.v1",
      world_slug: "clean",
      entries: [
        {
          id: "GF-0001",
          rationale: "Known bootstrap fixture drift accepted for explicit audit proof.",
          findings: [
            {
              validator: "rule7_mystery_reserve_preservation",
              code: "rule7.missing_disallowed_cheap_answers",
              message: "M-1 has empty disallowed_cheap_answers",
              location: {
                file: "_source/mystery-reserve/M-1.yaml",
                node_id: "M-1"
              }
            }
          ]
        }
      ]
    }),
    "utf8"
  );

  const result = spawnSync(cliPath, ["clean", "--json"], { cwd: repo, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr + result.stdout);
  const parsed = JSON.parse(result.stdout) as {
    verdicts: Array<{ severity: string; code: string; message: string; suggested_fix?: string }>;
    summary: { fail_count: number; info_count: number };
  };
  assert.equal(parsed.summary.fail_count, 0);
  assert.equal(parsed.summary.info_count, 1);
  assert.equal(parsed.verdicts[0]?.severity, "info");
  assert.equal(parsed.verdicts[0]?.code, "rule7.missing_disallowed_cheap_answers");
  assert.match(parsed.verdicts[0]?.message ?? "", /Grandfathered by GF-0001/);
  assert.match(parsed.verdicts[0]?.suggested_fix ?? "", /Known bootstrap fixture drift/);
});

test("world-validate --since narrows selector applicability from the world's git repo", () => {
  const repo = createIndexedWorld();
  execFileSync("git", ["init"], { cwd: repo });
  execFileSync("git", ["add", "."], { cwd: repo });
  execFileSync("git", ["-c", "user.name=Worldloom Test", "-c", "user.email=test@example.test", "commit", "-m", "base"], {
    cwd: repo,
    stdio: "ignore"
  });
  const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  writeFileSync(
    path.join(repo, "worlds", "clean", "_source", "mystery-reserve", "M-1.yaml"),
    yaml.dump({ ...validMystery(), disallowed_cheap_answers: [] }),
    "utf8"
  );
  updateNodeBody(
    path.join(repo, "worlds", "clean", "_index", "world.db"),
    "M-1",
    { ...validMystery(), disallowed_cheap_answers: [] }
  );
  execFileSync("git", ["add", "."], { cwd: repo });
  execFileSync("git", ["-c", "user.name=Worldloom Test", "-c", "user.email=test@example.test", "commit", "-m", "break mr"], {
    cwd: repo,
    stdio: "ignore"
  });

  const result = spawnSync(cliPath, ["clean", "--since", base, "--json"], {
    cwd: repo,
    encoding: "utf8"
  });

  assert.equal(result.status, 1, result.stderr + result.stdout);
  const parsed = JSON.parse(result.stdout) as { summary: { validators_run: string[] } };
  assert.deepEqual(parsed.summary.validators_run, [
    "yaml_parse_integrity",
    "id_uniqueness",
    "cross_file_reference",
    "record_schema_compliance",
    "rule7_mystery_reserve_preservation"
  ]);
});

interface WorldOptions {
  mysteryOverride?: Record<string, unknown>;
}

function createRepo(): string {
  return mkdtempSync(path.join(tmpdir(), "worldloom-validators-"));
}

function createIndexedWorld(options: WorldOptions = {}): string {
  const repo = createRepo();
  const world = path.join(repo, "worlds", "clean");
  mkdirSync(path.join(world, "_source", "canon"), { recursive: true });
  mkdirSync(path.join(world, "_source", "institutions"), { recursive: true });
  mkdirSync(path.join(world, "_source", "mystery-reserve"), { recursive: true });
  mkdirSync(path.join(world, "_index"), { recursive: true });

  const records = [
    {
      node_id: "CF-0001",
      node_type: "canon_fact_record",
      file_path: "_source/canon/CF-0001.yaml",
      body: validCanonFact()
    },
    {
      node_id: "SEC-INS-001",
      node_type: "section",
      file_path: "_source/institutions/SEC-INS-001.yaml",
      body: validSection()
    },
    {
      node_id: "M-1",
      node_type: "mystery_reserve_entry",
      file_path: "_source/mystery-reserve/M-1.yaml",
      body: { ...validMystery(), ...options.mysteryOverride }
    }
  ];

  for (const record of records) {
    writeFileSync(path.join(world, record.file_path), yaml.dump(record.body), "utf8");
  }

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
  const insert = db.prepare(
    "INSERT INTO nodes (node_id, world_slug, file_path, node_type, body) VALUES (?, 'clean', ?, ?, ?)"
  );
  for (const record of records) {
    insert.run(record.node_id, record.file_path, record.node_type, yaml.dump(record.body));
  }
  db.close();

  return repo;
}

function validationRowCount(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true });
  const row = db.prepare("SELECT COUNT(*) AS count FROM validation_results").get() as { count: number };
  db.close();
  return row.count;
}

function updateNodeBody(dbPath: string, nodeId: string, body: Record<string, unknown>): void {
  const db = new Database(dbPath);
  db.prepare("UPDATE nodes SET body = ? WHERE node_id = ?").run(yaml.dump(body), nodeId);
  db.close();
}

function validCanonFact(): Record<string, unknown> {
  return {
    id: "CF-0001",
    title: "Grounded Institution",
    status: "hard_canon",
    type: "institution",
    statement: "The test world has a small ward office.",
    scope: { geographic: "local", temporal: "current", social: "public" },
    truth_scope: { world_level: true, diegetic_status: "objective" },
    domains_affected: ["law"],
    prerequisites: ["appointed wardens"],
    distribution: {
      who_can_do_it: ["wardens"],
      who_cannot_easily_do_it: ["travelers"],
      why_not_universal: ["requires appointment"]
    },
    costs_and_limits: ["requires time"],
    visible_consequences: ["public records exist"],
    required_world_updates: ["INSTITUTIONS"],
    source_basis: { direct_user_approval: true, derived_from: [] },
    contradiction_risk: { hard: false, soft: false },
    notes: "None",
    extensions: []
  };
}

function validSection(): Record<string, unknown> {
  return {
    id: "SEC-INS-001",
    file_class: "INSTITUTIONS",
    order: 1,
    heading: "Ward Office",
    heading_level: 2,
    body: "The ward office keeps public records.",
    extensions: [],
    touched_by_cf: ["CF-0001"]
  };
}

function validMystery(): Record<string, unknown> {
  return {
    id: "M-1",
    title: "Missing Bell",
    status: "active",
    knowns: ["A bell is missing."],
    unknowns: ["Who removed the bell is unknown."],
    common_interpretations: [],
    disallowed_cheap_answers: ["It was never real."],
    domains_touched: ["institutions"],
    future_resolution_safety: "medium",
    extensions: []
  };
}
