import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { narrativeShapeFieldRejection } from "../../src/structural/narrative-shape-field-rejection.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("narrative_shape_field_rejection rejects per-class narrative-shape fields", async () => {
  const fixture = loadFixture("narrative-shape-fail/prohibited-fields.yaml");
  const cases = fixture.cases as NarrativeShapeCase[];

  for (const item of cases) {
    const verdicts = await narrativeShapeFieldRejection.run(undefined, testContext([fixtureRecord(item.record)]));

    assert.equal(verdicts.length, 1, item.case_id);
    assert.equal(verdicts[0]?.code, "narrative_shape_forbidden_field");
    assert.equal((verdicts[0]?.detail as { field?: string } | undefined)?.field, item.forbidden_field);
    assert.equal(verdicts[0]?.severity, "fail");
  }
});

test("narrative_shape_field_rejection accepts clean covered classes", async () => {
  const records = [
    record("pressure_clock_record", "CLK-500", "stories/test/_source/clocks/CLK-500.yaml", {
      id: "CLK-500",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      title: "Deadline",
      clock_kind: "danger",
      driver: "system",
      linked_records: ["THR-1"],
      value: 1,
      max: 4,
      salience: "high",
      visibility: "public",
      thresholds: [],
      tick_history: [],
      status: "active"
    }),
    record("story_secret_record", "STSEC-500", "stories/test/_source/secrets/STSEC-500.yaml", {
      id: "STSEC-500",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      secret_kind: "motive",
      secret_claim: "The courier is concealing a motive.",
      truth_anchor: "SF-1",
      holders: ["STENT-1"],
      salience: "high",
      source_records: ["SF-1"],
      status: "hidden"
    }),
    record("thread_record", "THR-500", "stories/test/_source/threads/THR-500.yaml", {
      id: "THR-500",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      status: "active",
      title: "Investigation line",
      summary: "A grounded investigation continues.",
      urgency: "medium",
      derived_from: ["SE-2"]
    }),
    record("relationship_record_story", "SREL-500", "stories/test/_source/relationships/SREL-500.yaml", {
      id: "SREL-500",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      axis: "trust",
      participants: ["STENT-1", "STENT-2"],
      direction: { kind: "bidirectional", from: null, to: null },
      value: "low",
      valence: "bidirectional",
      description: "A present trust relation.",
      derived_from: ["SE-2"]
    }),
    record("story_entity_record", "STENT-500", "stories/test/_source/entities/STENT-500.yaml", {
      id: "STENT-500",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      display_name: "Courier",
      role_in_story: ["witness"]
    })
  ];

  const verdicts = await narrativeShapeFieldRejection.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("narrative_shape_field_rejection does not duplicate STQ-specific record_schema_compliance checks", async () => {
  const verdicts = await narrativeShapeFieldRejection.run(undefined, testContext([
    record("story_question_record", "STQ-500", "stories/test/_source/story-questions/STQ-500.yaml", {
      id: "STQ-500",
      story_id: "STORY-1",
      expected_payoff_mode: "climax"
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("narrative_shape_field_rejection is scoped to full-world, covered patch plans, and touched covered files", () => {
  assert.equal(narrativeShapeFieldRejection.applies_to(testContext([])), true);
  assert.equal(
    narrativeShapeFieldRejection.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_clk_record") })),
    true
  );
  assert.equal(
    narrativeShapeFieldRejection.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stq_record") })),
    false
  );
  assert.equal(
    narrativeShapeFieldRejection.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    narrativeShapeFieldRejection.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/relationships/SREL-1.yaml"]
    })),
    true
  );
});

function loadFixture(relativePath: string): Record<string, unknown> {
  const cwd = process.cwd();
  const packageRoot = cwd.endsWith(path.join("tools", "validators")) ? cwd : path.join(cwd, "tools", "validators");
  const fixturePath = path.resolve(packageRoot, "tests", "fixtures", "midstory-introduction", relativePath);
  return yaml.load(readFileSync(fixturePath, "utf8"), { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
}

function fixtureRecord(item: FixtureRecord): IndexedRecord {
  const id = String(item.parsed.id ?? item.node_id.split(":").at(-1) ?? item.node_id);
  return {
    node_type: nodeTypeForFixtureRecord(id, item.node_type),
    node_id: item.node_id,
    file_path: item.file_path ?? filePathForFixtureRecord(id),
    parsed: item.parsed,
    world_slug: "test",
    story_slug: STORY_SLUG
  };
}

function nodeTypeForFixtureRecord(id: string, fallback: string): string {
  if (id.startsWith("THR-")) return "thread_record";
  if (id.startsWith("SREL-")) return "relationship_record_story";
  return fallback;
}

function record(nodeType: string, id: string, filePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    node_type: nodeType,
    node_id: `${STORY_SLUG}:${id}`,
    file_path: filePath,
    parsed,
    world_slug: "test",
    story_slug: STORY_SLUG
  };
}

function testContext(records: IndexedRecord[], overrides: Partial<Context> = {}): Context {
  return context(records, overrides);
}

function patchPlan(op: string): PatchPlanEnvelope {
  return { patches: [{ op }] } as unknown as PatchPlanEnvelope;
}

function filePathForFixtureRecord(id: string): string {
  if (id.startsWith("CLK-")) return `stories/${STORY_SLUG}/_source/clocks/${id}.yaml`;
  if (id.startsWith("STSEC-")) return `stories/${STORY_SLUG}/_source/secrets/${id}.yaml`;
  if (id.startsWith("THR-")) return `stories/${STORY_SLUG}/_source/threads/${id}.yaml`;
  if (id.startsWith("SREL-")) return `stories/${STORY_SLUG}/_source/relationships/${id}.yaml`;
  if (id.startsWith("STENT-")) return `stories/${STORY_SLUG}/_source/entities/${id}.yaml`;
  return `stories/${STORY_SLUG}/_source/records/${id}.yaml`;
}

interface NarrativeShapeCase {
  case_id: string;
  forbidden_field: string;
  record: FixtureRecord;
}

interface FixtureRecord {
  node_type: string;
  node_id: string;
  file_path: string;
  parsed: Record<string, unknown>;
}
