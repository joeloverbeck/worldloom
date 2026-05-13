import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

test("world-validate runs scene-commitment validators against an indexed v2 story bundle", () => {
  const repo = createIndexedV2StoryWorld();

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "clean",
      "--story",
      "alpha",
      "--rules",
      "arc_schema_compliance,choice_worthiness_completeness,effect_model_legality,effect_model_replay_safety,stop_policy_parsability",
      "--json"
    ],
    { cwd: repo, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr + result.stdout);
  const run = JSON.parse(result.stdout) as { summary: { validators_run: string[]; fail_count: number } };
  assert.deepEqual(run.summary.validators_run, [
    "arc_schema_compliance",
    "choice_worthiness_completeness",
    "effect_model_legality",
    "effect_model_replay_safety",
    "stop_policy_parsability"
  ]);
  assert.equal(run.summary.fail_count, 0);
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
  insertStoryRecords(insert, "alpha", "SLT-0001", { pred: "entity_state", entity: "STENT-0001", property: "present", op: "==", value: true });
  insertStoryRecords(insert, "beta", "SLT-0002", { pred: "phase_of_moon", value: "waning" });
  db.close();

  writeFileSync(path.join(world, ".keep"), "", "utf8");
  return repo;
}

function createIndexedV2StoryWorld(): string {
  const repo = mkdtempSync(path.join(tmpdir(), "worldloom-validators-v2-story-"));
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
  const storylet = yaml.load(
    readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"),
    { schema: yaml.JSON_SCHEMA }
  ) as Record<string, unknown>;
  const choice = completeChoice();
  insert.run("alpha:SLT-0001", "alpha", "stories/alpha/_source/storylets/SLT-0001.yaml", "storylet_record", yaml.dump(storylet));
  insert.run("alpha:CHC-0001", "alpha", "stories/alpha/_source/choices/CHC-0001.yaml", "choice_record", yaml.dump(choice));
  insert.run("alpha:PG-0002", "alpha", "stories/alpha/_source/pages/PG-0002.yaml", "page_record", yaml.dump(completePage()));
  insert.run("alpha:SE-0002", "alpha", "stories/alpha/_source/events/SE-0002.yaml", "story_event_record", yaml.dump(completeEvent()));
  db.close();

  mkdirSync(path.join(world, "stories", "alpha", "pages-prose"), { recursive: true });
  writeFileSync(
    path.join(world, "stories", "alpha", "pages-prose", "PG-0002.md"),
    "Mara offers repair help and Mara accepts.",
    "utf8"
  );
  writeFileSync(path.join(world, ".keep"), "", "utf8");
  return repo;
}

function completePage(): Record<string, unknown> {
  return {
    id: "PG-0002",
    story_id: "STORY-001",
    storylet_realized: "SLT-0001",
    applied_event_ops: ["SE-0002"],
    state_snapshot: {
      applied_effect_variant: "partial-repair",
      narrative_point_classification: "NATURAL_COMMITMENT_HINGE"
    }
  };
}

function completeEvent(): Record<string, unknown> {
  return {
    id: "SE-0002",
    story_id: "STORY-001",
    created_at_page: "PG-0002",
    ops: [
      {
        op_id: "OP-0001",
        op_type: "relationship_supersede",
        input_records: [],
        output_records: ["SREL-0001"],
        deterministic_payload: {}
      }
    ]
  };
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
    ["storylet_record", storyletId, "storylets", { id: storyletId, hard_preconds: [predicate] }]
  ] as const) {
    insert.run(`${storySlug}:${id}`, storySlug, `${basePath}/${subdir}/${id}.yaml`, nodeType, yaml.dump(parsed));
  }
}

function completeChoice(): Record<string, unknown> {
  return {
    id: "CHC-0001",
    story_id: "STORY-001",
    record_version: 2,
    choice_kind: "scene_commitment",
    commitment_class: "offer_practical_help",
    strategy_cluster: "careful-help",
    choice_contract: {
      user_intent: "Offer practical help.",
      guaranteed_action: "The offer is made.",
      success_policy: "contested",
      allowed_outcome_band: ["partially_succeeds"],
      forbidden_outcomes: [],
      minimum_state_change: ["relationship_trajectory"]
    },
    likely_effects: [
      {
        type: "relationship_axis_shift",
        axis: "trust",
        direction: "increase_small"
      }
    ],
    continuation_capacity: {
      post_choice_delta: {},
      valid_seed_storylets: ["SLT-0001"],
      jit_shape_spec: null
    },
    choice_worthiness: {
      strategic_question_answered: "Can help be offered without pressure?",
      strong_axes: ["relationship_trajectory"],
      expected_state_delta: {
        relationship: { possible: ["trust increases"], magnitude: "small" }
      },
      why_not_microbeat: "The choice changes the relationship's pressure state.",
      foreseeable_difference: "Accepting help creates a distinct next arc."
    }
  };
}
