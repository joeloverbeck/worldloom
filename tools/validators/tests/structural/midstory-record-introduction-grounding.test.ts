import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { midstoryRecordIntroductionGrounding } from "../../src/structural/midstory-record-introduction-grounding.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("midstory_record_introduction_grounding accepts all six creation-pass fixture classes", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("midstory_record_introduction_grounding rejects mid-story creation without an intro tag", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["THR-91"],
      world_logic_rationale: "A new investigation line opens, but no parseable intro tag is present."
    }),
    introducedRecord("THR-91", "thread_record", "threads", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "midstory_intro_missing_tag");
  assert.deepEqual(verdicts[0]?.detail, { event_id: "SE-2", record_id: "THR-91", reason: undefined });
});

test("midstory_record_introduction_grounding rejects intro tags absent from state_delta.create", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: [],
      world_logic_rationale: "intro:THR(id=THR-92, trigger=investigation_line_opened, evidence=[SE-2], distinct_from=[])"
    }),
    introducedRecord("THR-92", "thread_record", "threads", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "midstory_intro_missing_state_delta");
  assert.deepEqual(verdicts[0]?.detail, { event_id: "SE-2", record_id: "THR-92", class: "THR" });
});

test("midstory_record_introduction_grounding rejects intro evidence missing from parent and same-event create state", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["THR-93"],
      world_logic_rationale: "intro:THR(id=THR-93, trigger=investigation_line_opened, evidence=[BEL-404], distinct_from=[])"
    }),
    introducedRecord("THR-93", "thread_record", "threads", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "midstory_intro_evidence_missing");
  assert.deepEqual(verdicts[0]?.detail, { event_id: "SE-2", record_id: "THR-93", evidence_id: "BEL-404" });
});

test("midstory_record_introduction_grounding rejects created_at_page mismatch", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["THR-94"],
      world_logic_rationale: "intro:THR(id=THR-94, trigger=investigation_line_opened, evidence=[SE-2], distinct_from=[])"
    }),
    introducedRecord("THR-94", "thread_record", "threads", { created_at_page: "PG-3" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "midstory_intro_created_at_mismatch");
  assert.deepEqual(verdicts[0]?.detail, {
    record_id: "THR-94",
    expected_created_at_page: "PG-2",
    actual_created_at_page: "PG-3"
  });
});

test("midstory_record_introduction_grounding is scoped to full-world, story-bundle patch plans, and touched story files", () => {
  assert.equal(midstoryRecordIntroductionGrounding.applies_to(testContext([])), true);
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })),
    true
  );
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_clk_record") })),
    true
  );
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/threads/THR-1.yaml"]
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

function fixtureRecord(item: FixtureRecord): IndexedRecord {
  const parsed = item.parsed;
  const id = parsed.id as string;
  const nodeType = nodeTypeForId(id);
  return storyRecord(nodeType, id, item.file_path, parsed);
}

function baseRecords(records: IndexedRecord[]): IndexedRecord[] {
  return [
    page("PG-1", {
      STENT: ["STENT-1"],
      STSTAT: ["STSTAT-1"],
      THR: [],
      CLK: [],
      STSEC: [],
      STQ: [],
      SREL: []
    }),
    ...records
  ];
}

function event(id: string, overrides: Partial<{ create: string[]; world_logic_rationale: string; created_at_page: string }>): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: overrides.created_at_page ?? "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: overrides.world_logic_rationale ?? "",
    state_delta: { create: overrides.create ?? [], supersede: [], close: [] }
  });
}

function page(id: string, activeRecords: Record<string, string[]>): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY_SLUG}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    input: { resolved_event_id: id === "PG-1" ? null : "SE-2" },
    state_snapshot: { active_records: activeRecords }
  });
}

function introducedRecord(id: string, nodeType: string, sourceDir: string, overrides: Record<string, unknown>): IndexedRecord {
  return storyRecord(nodeType, id, `stories/${STORY_SLUG}/_source/${sourceDir}/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    ...overrides
  });
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
