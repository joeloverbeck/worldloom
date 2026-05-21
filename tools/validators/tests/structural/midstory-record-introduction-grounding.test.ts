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

test("midstory_record_introduction_grounding accepts creation-pass fixture classes", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("midstory_record_introduction_grounding rejects mid-story creation without a structured introduction", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["THR-91"],
      world_logic_rationale: "A new investigation line opens, but no structured introduction entry is present.",
      introductions: []
    }),
    introducedRecord("THR-91", "thread_record", "threads", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "midstory_intro_missing_tag");
  assert.deepEqual(verdicts[0]?.detail, { event_id: "SE-2", record_id: "THR-91", reason: undefined });
});

test("midstory_record_introduction_grounding rejects structured introductions absent from state_delta.create", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: [],
      introductions: [intro("THR-92", "THR", "investigation_line_opened", ["SE-2"])]
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
      introductions: [intro("THR-93", "THR", "investigation_line_opened", ["BEL-404"])]
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
      introductions: [intro("THR-94", "THR", "investigation_line_opened", ["SE-2"])]
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

test("midstory_record_introduction_grounding accepts STPLAN and STEMO structured introductions", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["STPLAN-1", "STEMO-1"],
      introductions: [
        intro("STPLAN-1", "STPLAN", "tactical_approach_committed", ["SE-2"]),
        intro("STEMO-1", "STEMO", "event_revealed_truth_to_actor", ["SE-2"])
      ]
    }),
    introducedRecord("STPLAN-1", "story_plan_record", "plans", { created_at_page: "PG-2" }),
    introducedRecord("STEMO-1", "story_emotion_record", "emotions", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("midstory_record_introduction_grounding accepts grounded STCHAR structured introductions", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["STCHAR-1"],
      introductions: [intro("STCHAR-1", "STCHAR", "story_character_authority_distilled", ["SE-2"])]
    }),
    introducedRecord("STCHAR-1", "story_character_authority_record", "story-characters", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("midstory_record_introduction_grounding rejects STCHAR introductions with missing evidence", async () => {
  const records = baseRecords([
    event("SE-2", {
      create: ["STCHAR-2"],
      introductions: [intro("STCHAR-2", "STCHAR", "story_character_authority_distilled", ["CHAR-1"])]
    }),
    introducedRecord("STCHAR-2", "story_character_authority_record", "story-characters", { created_at_page: "PG-2" })
  ]);

  const verdicts = await midstoryRecordIntroductionGrounding.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "midstory_intro_evidence_missing");
  assert.deepEqual(verdicts[0]?.detail, { event_id: "SE-2", record_id: "STCHAR-2", evidence_id: "CHAR-1" });
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
    midstoryRecordIntroductionGrounding.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stplan_record") })),
    true
  );
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stemo_record") })),
    true
  );
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("append_story_character_authority_record") })),
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
  assert.equal(
    midstoryRecordIntroductionGrounding.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/story-characters/STCHAR-1.md"]
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

function event(id: string, overrides: Partial<{ create: string[]; world_logic_rationale: string; created_at_page: string; introductions: Record<string, unknown>[] }>): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: overrides.created_at_page ?? "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: overrides.world_logic_rationale ?? "Structured introduction test.",
    record_introductions: overrides.introductions ?? introEntries(overrides.create ?? []),
    state_delta: { create: overrides.create ?? [], supersede: [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .map((id) => {
      if (id.startsWith("CLK-")) return intro(id, "CLK", "deadline_declared", ["SE-2"]);
      if (id.startsWith("STSEC-")) return intro(id, "STSEC", "clue_carrier_enters_play", ["SE-2"]);
      if (id.startsWith("STQ-")) return intro(id, "STQ", "explicit_question_raised", ["SE-2"]);
      if (id.startsWith("THR-")) return intro(id, "THR", "investigation_line_opened", ["SE-2"]);
      if (id.startsWith("STENT-")) return intro(id, "STENT", "actor_enters_branch", ["SE-2"]);
      if (id.startsWith("STCHAR-")) return intro(id, "STCHAR", "story_character_authority_distilled", ["SE-2"]);
      if (id.startsWith("SREL-")) return intro(id, "SREL", "trust_axis_becomes_relevant", ["SE-2"]);
      if (id.startsWith("STPLAN-")) return intro(id, "STPLAN", "tactical_approach_committed", ["SE-2"]);
      if (id.startsWith("STEMO-")) return intro(id, "STEMO", "event_revealed_truth_to_actor", ["SE-2"]);
      return undefined;
    })
    .filter((entry): entry is Record<string, unknown> => entry !== undefined);
}

function intro(record_id: string, recordClass: string, trigger: string, evidence: string[]): Record<string, unknown> {
  return {
    record_id,
    class: recordClass,
    trigger,
    evidence,
    distinct_from: []
  };
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
  const filePath = sourceDir === "story-characters"
    ? `stories/${STORY_SLUG}/story-characters/${id}.md`
    : `stories/${STORY_SLUG}/_source/${sourceDir}/${id}.yaml`;
  return storyRecord(nodeType, id, filePath, {
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
  if (id.startsWith("STCHAR-")) return "story_character_authority_record";
  if (id.startsWith("SREL-")) return "relationship_record_story";
  if (id.startsWith("STPLAN-")) return "story_plan_record";
  if (id.startsWith("STEMO-")) return "story_emotion_record";
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
