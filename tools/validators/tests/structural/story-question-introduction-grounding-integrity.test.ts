import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { storyQuestionIntroductionGroundingIntegrity } from "../../src/structural/story-question-introduction-grounding-integrity.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("story_question_introduction_grounding_integrity accepts the creation-pass STQ fixture", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("story_question_introduction_grounding_integrity rejects introduced STQ with mismatched source_event", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const mismatch = (fixture.cases as FailureCase[]).find((item) => item.case_id === "stq-source-event-mismatch");
  assert.ok(mismatch?.creating_event);
  assert.ok(mismatch.record);
  const records = baseRecords([
    eventFromFixture(mismatch.creating_event),
    fixtureRecord(mismatch.record),
    artifact("DA-1")
  ]);

  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["stq_intro_source_event_mismatch"]);
});

test("story_question_introduction_grounding_integrity rejects introduced STQ with inactive source_records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STQ-91"] }),
    question("STQ-91", { source_records: ["DA-404"] })
  ]);

  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["stq_intro_source_not_active"]);
  assert.deepEqual(verdicts[0]?.detail, { question_id: "STQ-91", source_record: "DA-404" });
});

test("story_question_introduction_grounding_integrity accepts same-event-created source_records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STQ-92", "DA-2", "BEL-2"] }),
    question("STQ-92", { source_records: ["DA-2", "BEL-2"] }),
    artifact("DA-2"),
    belief("BEL-2")
  ]);

  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("story_question_introduction_grounding_integrity ignores existing STQ lifecycle updates", async () => {
  const records = [
    page("PG-1", { STQ: ["STQ-1"], DA: ["DA-1"], STENT: ["STENT-1"] }),
    event("SE-2", { create: [] }),
    question("STQ-1", { created_at_page: "PG-1", source_event: "SE-1", source_records: ["DA-1"] }),
    artifact("DA-1")
  ];

  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("story_question_introduction_grounding_integrity ignores root-bootstrap STQ creation", async () => {
  const records = [
    event("SE-1", { create: ["STQ-1"], created_at_page: "PG-1" }),
    question("STQ-1", { created_at_page: "PG-1", source_event: "SE-404", source_records: ["DA-404"] })
  ];

  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("story_question_introduction_grounding_integrity is scoped to full-world, STQ patch plans, and touched STQ files", () => {
  assert.equal(storyQuestionIntroductionGroundingIntegrity.applies_to(testContext([])), true);
  assert.equal(
    storyQuestionIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stq_record") })),
    true
  );
  assert.equal(
    storyQuestionIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    storyQuestionIntroductionGroundingIntegrity.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/story-questions/STQ-1.yaml"]
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
      DA: ["DA-1"],
      BEL: [],
      THR: [],
      STQ: []
    }),
    ...records
  ];
}

function event(id: string, overrides: { create: string[]; created_at_page?: string }): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: overrides.created_at_page ?? "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: "intro:STQ(id=STQ-1, trigger=explicit_question_raised, evidence=[DA-1], distinct_from=[])",
    state_delta: { create: overrides.create, supersede: [], close: [] }
  });
}

function eventFromFixture(item: FixtureEvent): IndexedRecord {
  return event(item.id, { create: item.state_delta.create });
}

function page(id: string, activeRecords: Record<string, string[]>): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY_SLUG}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    input: { resolved_event_id: id === "PG-1" ? null : "SE-2" },
    state_snapshot: { active_records: activeRecords }
  });
}

function question(id: string, overrides: Record<string, unknown>): IndexedRecord {
  return storyRecord("story_question_record", id, `stories/${STORY_SLUG}/_source/story-questions/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    setup_kind: "dramatic_question",
    question_or_setup: "Why did the sealed order vanish?",
    salience: "high",
    audience_visibility: "explicit",
    source_event: "SE-2",
    source_records: ["DA-1"],
    status: "open",
    ...overrides
  });
}

function artifact(id: string): IndexedRecord {
  return storyRecord("story_diegetic_artifact_record", id, `stories/${STORY_SLUG}/_source/artifacts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: id === "DA-1" ? "PG-1" : "PG-2",
    artifact_kind: "letter",
    label: "Sealed order",
    current_holder: "STENT-1",
    status: "available"
  });
}

function belief(id: string): IndexedRecord {
  return storyRecord("belief_record", id, `stories/${STORY_SLUG}/_source/beliefs/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holder: "STENT-1",
    claim: "The order is authentic.",
    confidence: "high",
    evidence: ["DA-2"],
    status: "active"
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
  if (id.startsWith("SF-")) return "story_fact_record";
  if (id.startsWith("DA-")) return "story_diegetic_artifact_record";
  if (id.startsWith("BEL-")) return "belief_record";
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

interface FixtureEvent {
  id: string;
  state_delta: { create: string[] };
}

interface FailureCase {
  case_id: string;
  creating_event?: FixtureEvent;
  record?: FixtureRecord;
}
