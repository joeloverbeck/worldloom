import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { entityIntroductionStatusPairing } from "../../src/structural/entity-introduction-status-pairing.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("entity_introduction_status_pairing accepts the creation-pass STENT fixture", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("entity_introduction_status_pairing rejects introduced STENT without paired STSTAT", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const missingStatus = (fixture.cases as FailureCase[]).find((item) => item.case_id === "stent-without-status");
  assert.ok(missingStatus?.record);
  assert.ok(missingStatus?.creating_event);
  const records = baseRecords([
    event("SE-2", {
      create: ["STENT-99"],
      world_logic_rationale: missingStatus.creating_event.world_logic_rationale ?? ""
    }),
    fixtureRecord(missingStatus.record),
    page("PG-2", { STENT: ["STENT-1", "STENT-99"], STSTAT: ["STSTAT-1"] })
  ]);

  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "entity_intro_missing_status");
  assert.equal((verdicts[0]?.detail as { entity_id?: string } | undefined)?.entity_id, "STENT-99");
});

test("entity_introduction_status_pairing rejects introduced STENT with multiple paired STSTAT records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STENT-98", "STSTAT-98", "STSTAT-99"] }),
    entity("STENT-98"),
    status("STSTAT-98", "STENT-98"),
    status("STSTAT-99", "STENT-98"),
    page("PG-2", { STENT: ["STENT-1", "STENT-98"], STSTAT: ["STSTAT-1", "STSTAT-98", "STSTAT-99"] })
  ]);

  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "entity_intro_multiple_active_status");
  assert.deepEqual(verdicts[0]?.detail, { entity_id: "STENT-98", status_ids: ["STSTAT-98", "STSTAT-99"] });
});

test("entity_introduction_status_pairing rejects introduced STENT when paired STSTAT is absent from child PG", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STENT-97", "STSTAT-97"] }),
    entity("STENT-97"),
    status("STSTAT-97", "STENT-97"),
    page("PG-2", { STENT: ["STENT-1", "STENT-97"], STSTAT: ["STSTAT-1"] })
  ]);

  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "entity_intro_missing_status");
});

test("entity_introduction_status_pairing ignores existing-entity status updates", async () => {
  const fixture = loadFixture("lifecycle-still-valid/lifecycle-cases.yaml");
  const lifecycle = (fixture.cases as LifecycleCase[]).find((item) => item.case_id === "existing-entity-status-update");
  assert.ok(lifecycle);
  const records = [
    page("PG-1", { STENT: ["STENT-1"], STSTAT: ["STSTAT-1"], STLOC: ["STLOC-1"] }),
    fixtureRecord(lifecycle.event),
    fixtureRecord(lifecycle.record)
  ];

  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("entity_introduction_status_pairing ignores root-bootstrap STENT creation", async () => {
  const records = [
    event("SE-1", { create: ["STENT-1"], created_at_page: "PG-1" }),
    entity("STENT-1", { created_at_page: "PG-1" })
  ];

  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("entity_introduction_status_pairing is scoped to full-world, STENT/STSTAT patch plans, and touched entity/status files", () => {
  assert.equal(entityIntroductionStatusPairing.applies_to(testContext([])), true);
  assert.equal(
    entityIntroductionStatusPairing.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stent_record") })),
    true
  );
  assert.equal(
    entityIntroductionStatusPairing.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_ststat_record") })),
    true
  );
  assert.equal(
    entityIntroductionStatusPairing.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    entityIntroductionStatusPairing.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/status/STSTAT-1.yaml"]
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
      STSTAT: ["STSTAT-1"],
      STLOC: ["STLOC-1"]
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
    world_logic_rationale: overrides.world_logic_rationale ?? "Structured entity introduction.",
    record_introductions: introEntries(overrides.create ?? []),
    state_delta: { create: overrides.create ?? [], supersede: [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .filter((id) => id.startsWith("STENT-"))
    .map((record_id) => ({
      record_id,
      class: "STENT",
      trigger: "actor_enters_branch",
      evidence: ["SE-2"],
      distinct_from: ["STENT-1"]
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

function entity(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("story_entity_record", id, `stories/${STORY_SLUG}/_source/entities/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    display_name: "Courier",
    bound_stchar_id: `STCHAR-${id.split("-")[1] ?? "1"}`,
    role_in_story: ["witness"],
    ...overrides
  });
}

function status(id: string, entityId: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("story_status_record", id, `stories/${STORY_SLUG}/_source/status/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    entity: entityId,
    life: "alive",
    agency: "free",
    location: "STLOC-1",
    derived_from: ["SE-2"],
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
  if (id.startsWith("STENT-")) return "story_entity_record";
  if (id.startsWith("STSTAT-")) return "story_status_record";
  if (id.startsWith("STLOC-")) return "story_location_record";
  if (id.startsWith("CLK-")) return "pressure_clock_record";
  if (id.startsWith("STSEC-")) return "story_secret_record";
  if (id.startsWith("STQ-")) return "story_question_record";
  if (id.startsWith("THR-")) return "thread_record";
  if (id.startsWith("SREL-")) return "relationship_record_story";
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
  creating_event?: {
    state_delta: Record<string, unknown>;
    world_logic_rationale?: string;
  };
  record?: FixtureRecord;
}

interface LifecycleCase {
  case_id: string;
  event: FixtureRecord;
  record: FixtureRecord;
}
