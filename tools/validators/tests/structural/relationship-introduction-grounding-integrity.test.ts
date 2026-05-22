import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { relationshipIntroductionGroundingIntegrity } from "../../src/structural/relationship-introduction-grounding-integrity.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("relationship_introduction_grounding_integrity accepts the creation-pass SREL fixture", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("relationship_introduction_grounding_integrity rejects introduced SREL with inactive participant", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const inactiveParticipant = (fixture.cases as FailureCase[]).find((item) => item.case_id === "srel-participant-inactive");
  assert.ok(inactiveParticipant?.record);
  const records = baseRecords([
    event("SE-2", { create: ["SREL-98"] }),
    fixtureRecord(inactiveParticipant.record),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-98"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "srel_intro_participant_inactive");
  assert.equal((verdicts[0]?.detail as { participant_id?: string } | undefined)?.participant_id, "STENT-404");
});

test("relationship_introduction_grounding_integrity rejects introduced SREL with empty derived_from", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const believedOnly = (fixture.cases as FailureCase[]).find((item) => item.case_id === "believed-only-relationship");
  assert.ok(believedOnly?.record);
  const records = baseRecords([
    event("SE-2", { create: ["SREL-99"] }),
    fixtureRecord(believedOnly.record),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-99"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "srel_intro_missing_derived_from");
  assert.equal(verdicts[0]?.severity, "fail");
});

test("relationship_introduction_grounding_integrity accepts active and same-event causal grounding", async () => {
  const records = baseRecords([
    storyRecord("story_question_record", "STQ-1", `stories/${STORY_SLUG}/_source/story-questions/STQ-1.yaml`, {
      id: "STQ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    page("PG-1", { STENT: ["STENT-1", "STENT-2"], STQ: ["STQ-1"], SREL: ["SREL-1"] }),
    event("SE-2", { create: ["STEMO-1", "SREL-2"] }),
    storyRecord("story_emotion_record", "STEMO-1", `stories/${STORY_SLUG}/_source/emotions/STEMO-1.yaml`, {
      id: "STEMO-1",
      story_id: "STORY-1",
      created_at_page: "PG-2"
    }),
    relationship("SREL-2", { derived_from: ["STQ-1", "STEMO-1"] }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-2"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("relationship_introduction_grounding_integrity rejects inactive grounding", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["SREL-2"] }),
    relationship("SREL-2", { derived_from: ["STQ-404"] }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-2"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "srel_intro_grounding_missing");
  assert.deepEqual(verdicts[0]?.detail, { relationship_id: "SREL-2", grounding_record: "STQ-404" });
});

test("relationship_introduction_grounding_integrity rejects disallowed grounding class", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STCHAR-1", "SREL-2"] }),
    storyRecord("story_character_authority_record", "STCHAR-1", `stories/${STORY_SLUG}/story-characters/STCHAR-1.md`, {
      id: "STCHAR-1",
      story_id: "STORY-1",
      created_at_page: "PG-2"
    }),
    relationship("SREL-2", { derived_from: ["STCHAR-1"] }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-2"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "srel_intro_grounding_missing");
  assert.deepEqual(verdicts[0]?.detail, { relationship_id: "SREL-2", grounding_record: "STCHAR-1" });
});

test("relationship_introduction_grounding_integrity fails on duplicate active relationship axis without supersedes", async () => {
  const records = baseRecords([
    relationship("SREL-1", { created_at_page: "PG-1", derived_from: ["SE-1"] }),
    event("SE-2", { create: ["SREL-2"] }),
    relationship("SREL-2", { derived_from: ["SE-2"] }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-1", "SREL-2"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "srel_intro_duplicate_axis");
  assert.equal(verdicts[0]?.severity, "fail");
  assert.deepEqual(verdicts[0]?.detail, { relationship_id: "SREL-2", duplicate_relationship_id: "SREL-1" });
});

test("relationship_introduction_grounding_integrity suppresses duplicate warning when supersedes names the active relationship", async () => {
  const records = baseRecords([
    relationship("SREL-1", { created_at_page: "PG-1", derived_from: ["SE-1"] }),
    event("SE-2", { create: ["SREL-2"] }),
    relationship("SREL-2", { derived_from: ["SE-2"], supersedes: "SREL-1" }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-2"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("relationship_introduction_grounding_integrity ignores lifecycle supersession without fresh SREL create", async () => {
  const records = baseRecords([
    relationship("SREL-1", { created_at_page: "PG-1", derived_from: ["SE-1"] }),
    event("SE-2", { create: [], supersede: ["SREL-1"] }),
    relationship("SREL-2", { derived_from: ["SE-2"], supersedes: "SREL-1" }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2"], SREL: ["SREL-2"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("relationship_introduction_grounding_integrity treats same-event STENT participants as active", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STENT-3", "SREL-3"] }),
    entity("STENT-3"),
    relationship("SREL-3", {
      participants: ["STENT-1", "STENT-3"],
      direction: { kind: "directed", from: "STENT-1", to: "STENT-3" },
      derived_from: ["SE-2"]
    }),
    page("PG-2", { STENT: ["STENT-1", "STENT-2", "STENT-3"], SREL: ["SREL-3"] })
  ]);

  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("relationship_introduction_grounding_integrity is scoped to full-world, SREL/STENT patch plans, and touched relationship/entity files", () => {
  assert.equal(relationshipIntroductionGroundingIntegrity.applies_to(testContext([])), true);
  assert.equal(
    relationshipIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_srel_record") })),
    true
  );
  assert.equal(
    relationshipIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stent_record") })),
    true
  );
  assert.equal(
    relationshipIntroductionGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    relationshipIntroductionGroundingIntegrity.applies_to(testContext([], {
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
      STENT: ["STENT-1", "STENT-2"],
      SREL: ["SREL-1"]
    }),
    entity("STENT-1", { created_at_page: "PG-1" }),
    entity("STENT-2", { created_at_page: "PG-1" }),
    ...records
  ];
}

function event(id: string, overrides: Partial<{ create: string[]; supersede: string[]; world_logic_rationale: string; created_at_page: string }>): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: overrides.created_at_page ?? "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: overrides.world_logic_rationale ?? "Structured relationship introduction.",
    record_introductions: introEntries(overrides.create ?? []),
    state_delta: { create: overrides.create ?? [], supersede: overrides.supersede ?? [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .filter((id) => id.startsWith("SREL-"))
    .map((record_id) => ({
      record_id,
      class: "SREL",
      trigger: "trust_axis_becomes_relevant",
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

function relationship(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("relationship_record_story", id, `stories/${STORY_SLUG}/_source/relationships/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    axis: "trust",
    participants: ["STENT-1", "STENT-2"],
    direction: { kind: "bidirectional", from: null, to: null },
    value: "trace",
    valence: "bidirectional",
    description: "Trust becomes an objective branch-local relation.",
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
  record?: FixtureRecord;
}
