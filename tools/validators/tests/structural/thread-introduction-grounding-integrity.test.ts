import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { threadIntroductionGroundingIntegrity } from "../../src/structural/thread-introduction-grounding-integrity.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("thread_introduction_grounding_integrity accepts the creation-pass THR fixture", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("thread_introduction_grounding_integrity rejects introduced THR without derived_from", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const thematicThread = (fixture.cases as FailureCase[]).find((item) => item.case_id === "thematic-thread");
  assert.ok(thematicThread?.record);
  const records = baseRecords([
    event("SE-2", { create: ["THR-99"] }),
    fixtureRecord(thematicThread.record)
  ]);

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["thread_intro_missing_derived_from"]);
});

test("thread_introduction_grounding_integrity rejects introduced THR with inactive grounding", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["THR-91"] }),
    thread("THR-91", { derived_from: ["BEL-404"] })
  ]);

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["thread_intro_grounding_missing"]);
  assert.deepEqual(verdicts[0]?.detail, { thread_id: "THR-91", grounding_record: "BEL-404" });
});

test("thread_introduction_grounding_integrity rejects introduced THR with disallowed grounding class", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["THR-92", "STENT-2"] }),
    thread("THR-92", { derived_from: ["STENT-2"] }),
    entity("STENT-2")
  ]);

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["thread_intro_grounding_missing"]);
});

test("thread_introduction_grounding_integrity accepts active SPEC-42 and SPEC-47 causal grounding records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["THR-93"] }),
    thread("THR-93", { derived_from: ["CLK-1", "STSEC-1", "STQ-1", "STSTAT-1", "STPLAN-1", "STEMO-1"] })
  ]);

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("thread_introduction_grounding_integrity accepts same-event-created grounding records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["THR-92", "BEL-2", "DA-2", "CLK-2", "STSEC-2", "STQ-2", "STSTAT-2", "STPLAN-2", "STEMO-2"] }),
    thread("THR-92", { derived_from: ["SE-2", "BEL-2", "DA-2", "CLK-2", "STSEC-2", "STQ-2", "STSTAT-2", "STPLAN-2", "STEMO-2"] }),
    belief("BEL-2"),
    artifact("DA-2")
  ]);

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("thread_introduction_grounding_integrity ignores existing THR lifecycle updates", async () => {
  const records = [
    page("PG-1", { THR: ["THR-1"], STENT: ["STENT-1"], BEL: ["BEL-1"], DA: [] }),
    event("SE-2", { create: [] }),
    thread("THR-1", { created_at_page: "PG-1", derived_from: [] })
  ];

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("thread_introduction_grounding_integrity ignores root-bootstrap THR creation", async () => {
  const records = [
    event("SE-1", { create: ["THR-1"], created_at_page: "PG-1" }),
    thread("THR-1", { created_at_page: "PG-1", derived_from: [] })
  ];

  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("thread_introduction_grounding_integrity is scoped to full-world, THR patch plans, and touched thread files", () => {
  assert.equal(threadIntroductionGroundingIntegrity.applies_to(testContext([])), true);
  assert.equal(
    threadIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_thr_record") })),
    true
  );
  assert.equal(
    threadIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    threadIntroductionGroundingIntegrity.applies_to(testContext([], {
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

function baseRecords(records: IndexedRecord[]): IndexedRecord[] {
  return [
    page("PG-1", {
      STENT: ["STENT-1"],
      THR: ["THR-1"],
      BEL: ["BEL-1"],
      CLK: ["CLK-1"],
      STSEC: ["STSEC-1"],
      STQ: ["STQ-1"],
      STSTAT: ["STSTAT-1"],
      STPLAN: ["STPLAN-1"],
      STEMO: ["STEMO-1"],
      DA: ["DA-1"],
      OBL: [],
      CNSQ: [],
      STINT: [],
      SREL: [],
      SF: []
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
    world_logic_rationale: "Structured thread introduction.",
    record_introductions: introEntries(overrides.create),
    state_delta: { create: overrides.create, supersede: [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .filter((id) => id.startsWith("THR-"))
    .map((record_id) => ({
      record_id,
      class: "THR",
      trigger: "investigation_line_opened",
      evidence: ["BEL-1"],
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

function thread(id: string, overrides: Record<string, unknown>): IndexedRecord {
  return storyRecord("thread_record", id, `stories/${STORY_SLUG}/_source/threads/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    status: "active",
    title: "Find the missing patrol",
    summary: "A concrete investigation line opens from the accepted event.",
    urgency: "high",
    derived_from: ["BEL-1"],
    ...overrides
  });
}

function belief(id: string): IndexedRecord {
  return storyRecord("belief_record", id, `stories/${STORY_SLUG}/_source/beliefs/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holder: "STENT-1",
    claim: "The patrol vanished before the order arrived.",
    confidence: "high",
    evidence: ["DA-2"],
    status: "active"
  });
}

function artifact(id: string): IndexedRecord {
  return storyRecord("story_diegetic_artifact_record", id, `stories/${STORY_SLUG}/_source/artifacts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    artifact_kind: "letter",
    label: "Sealed order",
    current_holder: "STENT-1",
    status: "available"
  });
}

function entity(id: string): IndexedRecord {
  return storyRecord("story_entity_record", id, `stories/${STORY_SLUG}/_source/entities/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    display_name: "Courier",
    bound_stchar_id: `STCHAR-${id.split("-")[1] ?? "1"}`,
    role_in_story: ["witness"]
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
  if (id.startsWith("CNSQ-")) return "consequence_record";
  if (id.startsWith("STINT-")) return "intention_record";
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

interface FailureCase {
  case_id: string;
  record?: FixtureRecord;
}
