import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { clockIntroductionGroundingIntegrity } from "../../src/structural/clock-introduction-grounding-integrity.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("clock_introduction_grounding_integrity accepts the creation-pass CLK fixture", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("clock_introduction_grounding_integrity rejects introduced CLK with missing driver", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["CLK-91", "THR-1"] }),
    introducedRecord("CLK-91", { driver: "" })
  ]);

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.ok(verdicts.some((verdict) => verdict.code === "clock_intro_missing_driver"));
});

test("clock_introduction_grounding_integrity rejects introduced CLK without grounding links", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const vaguePressure = (fixture.cases as FailureCase[]).find((item) => item.case_id === "vague-pressure-clock");
  assert.ok(vaguePressure?.record);
  const records = baseRecords([
    event("SE-2", { create: ["CLK-99"] }),
    fixtureRecord(vaguePressure.record)
  ]);

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["clock_intro_missing_grounding_link"]);
});

test("clock_introduction_grounding_integrity rejects introduced CLK linked only to inactive records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["CLK-92"] }),
    introducedRecord("CLK-92", { linked_records: ["THR-404"] })
  ]);

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["clock_intro_link_not_active"]);
  assert.deepEqual(verdicts[0]?.detail, { clock_id: "CLK-92", linked_record: "THR-404" });
});

test("clock_introduction_grounding_integrity validates threshold bounds when present", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["CLK-93", "THR-1"] }),
    introducedRecord("CLK-93", { max: 3, thresholds: [{ at: 4, label: "late", effects: { create: [], supersede: [], close: [] } }] })
  ]);

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["clock_intro_invalid_threshold"]);
});

test("clock_introduction_grounding_integrity ignores existing CLK lifecycle updates", async () => {
  const fixture = loadFixture("lifecycle-still-valid/lifecycle-cases.yaml");
  const lifecycle = (fixture.cases as LifecycleCase[]).find((item) => item.case_id === "existing-clock-tick");
  assert.ok(lifecycle);
  const records = [
    page("PG-1", { CLK: ["CLK-1"], THR: ["THR-1"], STENT: ["STENT-1"] }),
    fixtureRecord(lifecycle.event),
    fixtureRecord(lifecycle.record)
  ];

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("clock_introduction_grounding_integrity ignores root-bootstrap CLK creation", async () => {
  const records = [
    event("SE-1", { create: ["CLK-1"] }),
    introducedRecord("CLK-1", { created_at_page: "PG-1", driver: "", linked_records: [] })
  ];

  const verdicts = await clockIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("clock_introduction_grounding_integrity is scoped to full-world, CLK patch plans, and touched clock files", () => {
  assert.equal(clockIntroductionGroundingIntegrity.applies_to(testContext([])), true);
  assert.equal(
    clockIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_clk_record") })),
    true
  );
  assert.equal(
    clockIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    clockIntroductionGroundingIntegrity.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/clocks/CLK-1.yaml"]
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

function recordsFromPassFixture(fixture: Record<string, unknown>): IndexedRecord[] {
  const sharedState = fixture.shared_state as { parent_page: { id: string; active_records: Record<string, string[]> }; child_page: { id: string; active_records: Record<string, string[]> } };
  const creatingEvent = fixture.creating_event as FixtureRecord;
  const records = fixture.records as FixtureRecord[];
  return [
    page(sharedState.parent_page.id, sharedState.parent_page.active_records),
    page(sharedState.child_page.id, sharedState.child_page.active_records),
    fixtureRecord(creatingEvent),
    ...records.map(fixtureRecord)
  ];
}

function baseRecords(records: IndexedRecord[]): IndexedRecord[] {
  return [
    page("PG-1", {
      STENT: ["STENT-1"],
      THR: ["THR-1"],
      CLK: []
    }),
    ...records
  ];
}

function event(id: string, overrides: { create: string[] }): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: "Structured clock introduction.",
    record_introductions: introEntries(overrides.create),
    state_delta: { create: overrides.create, supersede: [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .filter((id) => id.startsWith("CLK-"))
    .map((record_id) => ({
      record_id,
      class: "CLK",
      trigger: "deadline_declared",
      evidence: ["SE-2"],
      distinct_from: []
    }));
}

function page(id: string, activeRecords: Record<string, string[]>): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY_SLUG}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    input: { resolved_event_id: id === "PG-1" ? null : "SE-2" },
    state_snapshot: { active_records: activeRecords }
  });
}

function introducedRecord(id: string, overrides: Record<string, unknown>): IndexedRecord {
  return storyRecord("pressure_clock_record", id, `stories/${STORY_SLUG}/_source/clocks/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    title: "Deadline",
    clock_kind: "deadline",
    driver: "system",
    linked_records: ["THR-1"],
    value: 1,
    max: 6,
    salience: "high",
    visibility: "public",
    thresholds: [],
    tick_history: [],
    status: "active",
    ...overrides
  });
}

function fixtureRecord(item: FixtureRecord): IndexedRecord {
  const parsed = item.parsed;
  const id = parsed.id as string;
  return storyRecord(nodeTypeForId(id), id, item.file_path, parsed);
}

function storyRecord(nodeType: string, id: string, filePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    node_type: nodeType,
    node_id: `${STORY_SLUG}:${id}`,
    file_path: filePath,
    parsed,
    world_slug: "test",
    story_slug: STORY_SLUG
  };
}

function nodeTypeForId(id: string): string {
  if (id.startsWith("SE-")) return "story_event_record";
  if (id.startsWith("CLK-")) return "pressure_clock_record";
  if (id.startsWith("STSEC-")) return "story_secret_record";
  if (id.startsWith("STQ-")) return "story_question_record";
  if (id.startsWith("THR-")) return "thread_record";
  if (id.startsWith("STENT-")) return "story_entity_record";
  if (id.startsWith("SREL-")) return "relationship_record_story";
  if (id.startsWith("STSTAT-")) return "story_status_record";
  if (id.startsWith("CHC-")) return "choice_record";
  if (id.startsWith("OBL-")) return "obligation_record";
  if (id.startsWith("DA-")) return "story_diegetic_artifact_record";
  if (id.startsWith("BEL-")) return "belief_record";
  if (id.startsWith("SF-")) return "story_fact_record";
  throw new Error(`No fixture node type mapping for ${id}.`);
}

function testContext(records: IndexedRecord[], overrides: Partial<Context> = {}): Context {
  return context(records, overrides);
}

function patchPlan(op: string): PatchPlanEnvelope {
  return { patches: [{ op }] } as unknown as PatchPlanEnvelope;
}

interface FixtureRecord {
  node_type: string;
  node_id: string;
  file_path: string;
  parsed: Record<string, unknown>;
}

interface FailureCase {
  case_id: string;
  record?: FixtureRecord;
}

interface LifecycleCase {
  case_id: string;
  event: FixtureRecord;
  record: FixtureRecord;
}
