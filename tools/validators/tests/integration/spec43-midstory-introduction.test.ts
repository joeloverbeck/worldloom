import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import { build } from "@worldloom/world-index/commands/build";
import yaml from "js-yaml";

import { replayActiveRecords } from "../../src/_helpers/state-snapshot-replay.js";
import { runValidators } from "../../src/framework/run.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../../src/framework/types.js";
import { clockIntroductionGroundingIntegrity } from "../../src/structural/clock-introduction-grounding-integrity.js";
import { compatibilityDrift } from "../../src/structural/compatibility-drift.js";
import { entityIntroductionStatusPairing } from "../../src/structural/entity-introduction-status-pairing.js";
import { introductionObserverFirewall } from "../../src/structural/introduction-observer-firewall.js";
import { midstoryRecordIntroductionGrounding } from "../../src/structural/midstory-record-introduction-grounding.js";
import { narrativeShapeFieldRejection } from "../../src/structural/narrative-shape-field-rejection.js";
import { relationshipIntroductionGroundingIntegrity } from "../../src/structural/relationship-introduction-grounding-integrity.js";
import { secretIntroductionAnchorIntegrity } from "../../src/structural/secret-introduction-anchor-integrity.js";
import { storyQuestionIntroductionGroundingIntegrity } from "../../src/structural/story-question-introduction-grounding-integrity.js";
import { threadIntroductionGroundingIntegrity } from "../../src/structural/thread-introduction-grounding-integrity.js";
import { context, record } from "../structural/helpers.js";
import { materializeCompatibilityFixtureWorld } from "./synthetic-compatibility-world.js";

const STORY_SLUG = "midstory-introduction-test";
const INTRODUCTION_VALIDATORS: readonly Validator[] = [
  midstoryRecordIntroductionGrounding,
  clockIntroductionGroundingIntegrity,
  secretIntroductionAnchorIntegrity,
  storyQuestionIntroductionGroundingIntegrity,
  threadIntroductionGroundingIntegrity,
  entityIntroductionStatusPairing,
  relationshipIntroductionGroundingIntegrity,
  introductionObserverFirewall,
  narrativeShapeFieldRejection,
  compatibilityDrift
];
const OPTIONAL_ACTIVE_KEYS = ["DA", "CLK", "STSEC", "STQ"] as const;

test("§Verification bullet 1: mid-story CLK creation passes", async () => {
  const run = await runValidators(INTRODUCTION_VALIDATORS, undefined, testContext(passRecords()));

  assert.ok(run.summary.validators_run.includes("clock_introduction_grounding_integrity"));
  assertNoFailures(run.verdicts);
  assertRecordActive("CLK-1", "PG-2");
});

test("§Verification bullet 2: vague-pressure CLK fails with clock_intro_missing_grounding_link", async () => {
  const verdicts = await clockIntroductionGroundingIntegrity.run(
    undefined,
    testContext([
      parentPage({ THR: ["THR-1"], CLK: [] }),
      event("SE-2", { create: ["CLK-99"] }),
      failureCaseRecord("vague-pressure-clock")
    ])
  );

  assertHasCode(verdicts, "clock_intro_missing_grounding_link");
});

test("§Verification bullet 3: existing-clock tick remains valid", async () => {
  const lifecycle = lifecycleCase("existing-clock-tick");
  const verdicts = await clockIntroductionGroundingIntegrity.run(
    undefined,
    testContext([
      parentPage({ CLK: ["CLK-1"], THR: ["THR-1"] }),
      fixtureRecord(lifecycle.event),
      fixtureRecord(lifecycle.record)
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("§Verification bullet 4: mid-story STSEC creation passes", async () => {
  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(passRecords()));

  assert.deepEqual(verdicts, []);
  assertRecordActive("STSEC-1", "PG-2");
});

test("§Verification bullet 5: author-only-future-twist STSEC fails", async () => {
  const verdicts = await secretIntroductionAnchorIntegrity.run(
    undefined,
    testContext([
      parentPage({ STSEC: [] }),
      event("SE-2", { create: ["STSEC-99"] }),
      failureCaseRecord("author-only-future-twist-secret")
    ])
  );

  assertHasCode(verdicts, "secret_intro_truth_anchor_missing");
});

test("§Verification bullet 6: mid-story STQ creation passes", async () => {
  const verdicts = await storyQuestionIntroductionGroundingIntegrity.run(undefined, testContext(passRecords()));

  assert.deepEqual(verdicts, []);
  assertRecordActive("STQ-1", "PG-2");
});

test("§Verification bullet 7: future-shape STQ fails through record_schema_compliance", async () => {
  const { recordSchemaCompliance } = await import("../../src/structural/record-schema-compliance.js");
  const verdicts = await recordSchemaCompliance.run(undefined, testContext([
    storyRecord("story_question_record", "STQ-500", "story-questions", {
      id: "STQ-500",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      setup_kind: "dramatic_question",
      question_or_setup: "Will the planned climax happen?",
      salience: "high",
      audience_visibility: "explicit",
      source_event: "SE-2",
      source_records: ["SF-1"],
      status: "open",
      expected_payoff_mode: "climax"
    })
  ]));

  assertHasCode(verdicts, "record_schema_compliance.stq_prohibited_expected_payoff_mode");
  assert.ok(verdicts.some((verdict) => String(verdict.message).includes("expected_payoff_mode")));
});

test("§Verification bullet 8: future-shape CLK/STSEC/THR/SREL/STENT fail per-class", async () => {
  const fixture = loadFixture("narrative-shape-fail/prohibited-fields.yaml");
  const cases = fixture.cases as NarrativeShapeCase[];

  for (const item of cases) {
    const verdicts = await narrativeShapeFieldRejection.run(undefined, testContext([fixtureRecord(item.record)]));
    assertHasCode(verdicts, "narrative_shape_forbidden_field", item.case_id);
  }
});

test("§Verification bullet 9: new STENT + same-event STSTAT passes", async () => {
  const verdicts = await entityIntroductionStatusPairing.run(undefined, testContext(passRecords()));

  assert.deepEqual(verdicts, []);
  assertRecordActive("STENT-3", "PG-2");
  assertRecordActive("STSTAT-3", "PG-2");
});

test("§Verification bullet 10: new STENT without STSTAT fails", async () => {
  const verdicts = await entityIntroductionStatusPairing.run(
    undefined,
    testContext([
      parentPage({ STENT: ["STENT-1"], STSTAT: ["STSTAT-1"] }),
      event("SE-2", { create: ["STENT-99"] }),
      failureCaseRecord("stent-without-status")
    ])
  );

  assertHasCode(verdicts, "entity_intro_missing_status");
});

test("§Verification bullet 11: existing-entity status update does NOT trigger pairing", async () => {
  const lifecycle = lifecycleCase("existing-entity-status-update");
  const verdicts = await entityIntroductionStatusPairing.run(
    undefined,
    testContext([
      parentPage({ STENT: ["STENT-1"], STSTAT: ["STSTAT-1"] }),
      fixtureRecord(lifecycle.event),
      fixtureRecord(lifecycle.record)
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("§Verification bullet 12: new SREL creation passes", async () => {
  const verdicts = await relationshipIntroductionGroundingIntegrity.run(undefined, testContext(passRecords()));

  assert.deepEqual(verdicts, []);
  assertRecordActive("SREL-1", "PG-2");
});

test("§Verification bullet 13: believed-only relationship as SREL fails or warns", async () => {
  const verdicts = await relationshipIntroductionGroundingIntegrity.run(
    undefined,
    testContext([
      parentPage({ STENT: ["STENT-1", "STENT-2"], SREL: [] }),
      event("SE-2", { create: ["SREL-99"] }),
      failureCaseRecord("believed-only-relationship")
    ])
  );

  assertHasCode(verdicts, "srel_intro_missing_derived_from");
  assert.ok(verdicts.some((verdict) => verdict.severity === "fail"));
});

test("§Verification bullet 14: new THR creation passes", async () => {
  const verdicts = await threadIntroductionGroundingIntegrity.run(undefined, testContext(passRecords()));

  assert.deepEqual(verdicts, []);
  assertRecordActive("THR-1", "PG-2");
});

test("§Verification bullet 15: thematic THR fails", async () => {
  const verdicts = await threadIntroductionGroundingIntegrity.run(
    undefined,
    testContext([
      parentPage({ THR: [] }),
      event("SE-2", { create: ["THR-99"] }),
      failureCaseRecord("thematic-thread")
    ])
  );

  assertHasCode(verdicts, "thread_intro_missing_derived_from");
});

test("§Verification bullet 16: choice grounded in fresh record fails observer firewall without access route", async () => {
  const verdicts = await introductionObserverFirewall.run(
    undefined,
    testContext([
      event("SE-2", { create: ["STSEC-1"] }),
      page("PG-2", { emitted_choices: ["CHC-99"], resolved_event_id: "SE-2" }),
      choice("CHC-99", ["STSEC-1"], ["STENT-2"]),
      secret("STSEC-1", ["STENT-1"])
    ])
  );

  assertHasCode(verdicts, "intro_observer_no_access_route");
});

test("§Verification bullet 17: absence of remaining optional CLK/STSEC/STQ/STPLAN/STEMO remains valid", async () => {
  const verdicts = await compatibilityDrift.run(undefined, testContext([
    page("PG-1", { active_records: legacyActiveRecords() })
  ]));

  assert.equal(verdicts.filter((verdict) => verdict.code === "compat_optional_directory_absent").length, 6);
  assert.ok(verdicts.every((verdict) => verdict.severity === "info"));
  assert.ok(verdicts.every((verdict) => verdict.severity !== "fail"));
});

test("§Verification bullet 18: old-style PG compatibility drift is info; replay normalizes; child PG emits full map", async () => {
  const records = compatibilityRecords();
  const driftVerdicts = await compatibilityDrift.run(undefined, testContext(records));
  const replayed = replayActiveRecords(legacyActiveRecords(), { create: [], supersede: [], close: [] });

  assertClassifications(driftVerdicts, ["compatible_optional_absence", "grandfathered_snapshot_shape"]);
  assertHasCode(driftVerdicts, "compat_missing_active_record_key");
  assert.deepEqual(replayed.CLK, []);
  assert.deepEqual(replayed.STSEC, []);
  assert.deepEqual(replayed.STQ, []);
  for (const key of OPTIONAL_ACTIVE_KEYS) {
    assert.deepEqual(childCompatibilityPage().state_snapshot.active_records[key], []);
  }
});

test("§Verification bullet 19: synthetic legacy bundle validates cleanly from a temp indexed world", () => {
  const tempRepo = mkdtempSync(path.join(tmpdir(), "spec43-compatibility-world-"));
  const fixture = materializeCompatibilityFixtureWorld(tempRepo, packageRoot());
  try {
    assert.equal(build(tempRepo, fixture.worldSlug, { quiet: true }), 0);
    const run = spawnSync(process.execPath, [
      path.resolve(packageRoot(), "dist", "src", "cli", "world-validate.js"),
      fixture.worldSlug,
      "--structural",
      "--story",
      fixture.storySlug,
      "--json"
    ], {
      cwd: tempRepo,
      encoding: "utf8"
    });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    const parsed = JSON.parse(run.stdout) as { verdicts: Verdict[]; summary: { fail_count: number } };
    assert.equal(parsed.summary.fail_count, 0);
    assertClassifications(parsed.verdicts, ["compatible_optional_absence", "grandfathered_snapshot_shape"]);
  } finally {
    rmSync(tempRepo, { recursive: true, force: true });
  }
});

test("§Verification bullet 20: compatibility scan writes no SE/PG files and creates no optional records", async () => {
  const records = compatibilityRecords();

  const verdicts = await compatibilityDrift.run(undefined, testContext(records));

  assertClassifications(verdicts, ["compatible_optional_absence", "grandfathered_snapshot_shape"]);
  assert.deepEqual(records.filter((item) => item.node_type === "story_event_record"), []);
  assert.deepEqual(records.filter((item) => item.file_path.includes("/_source/events/")), []);
  assert.deepEqual(records.filter((item) => item.file_path.includes("/_source/clocks/")), []);
  assert.deepEqual(records.filter((item) => item.file_path.includes("/_source/secrets/")), []);
  assert.deepEqual(records.filter((item) => item.file_path.includes("/_source/story-questions/")), []);
});

test("SPEC-43 capstone composes all registered Wave 2 introduction validators on the shared pass fixture", async () => {
  const run = await runValidators(INTRODUCTION_VALIDATORS, undefined, testContext([
    ...passRecords()
  ], {
    run_mode: "full-world",
    patch_plan: patchPlan("create_se_record")
  }));

  for (const validator of INTRODUCTION_VALIDATORS) {
    assert.ok(run.summary.validators_run.includes(validator.name), `${validator.name} did not run`);
  }
  assertNoFailures(run.verdicts);
});

function loadFixture(relativePath: string): Record<string, unknown> {
  return yaml.load(
    readFileSync(path.resolve(packageRoot(), "tests", "fixtures", "midstory-introduction", relativePath), "utf8"),
    { schema: yaml.JSON_SCHEMA }
  ) as Record<string, unknown>;
}

function packageRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(path.join("tools", "validators")) ? cwd : path.join(cwd, "tools", "validators");
}

function passRecords(): IndexedRecord[] {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const sharedState = fixture.shared_state as SharedState;
  const creatingEvent = fixture.creating_event as FixtureRecord;
  const records = fixture.records as FixtureRecord[];
  return [
    parentPage(sharedState.parent_page.active_records),
    page(sharedState.child_page.id, {
      active_records: sharedState.child_page.active_records,
      resolved_event_id: "SE-2",
      emitted_choices: ["CHC-1"]
    }),
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Mara",
      bound_stchar_id: "STCHAR-1",
      role_in_story: ["primary_actor"]
    }),
    storyRecord("story_entity_record", "STENT-2", "entities", {
      id: "STENT-2",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Gate Watcher",
      bound_stchar_id: "STCHAR-2",
      role_in_story: ["witness"]
    }),
    fixtureRecord(creatingEvent),
    ...records.map(fixtureRecord)
  ];
}

function compatibilityRecords(): IndexedRecord[] {
  const fixture = loadFixture("compatibility/legacy-snapshot.yaml");
  return (fixture.records as FixtureRecord[]).map(fixtureRecord);
}

function childCompatibilityPage(): { state_snapshot: { active_records: Record<string, string[]> } } {
  const fixture = loadFixture("compatibility/legacy-snapshot.yaml");
  const records = fixture.records as FixtureRecord[];
  return records.find((item) => item.parsed.id === "PG-2")?.parsed as {
    state_snapshot: { active_records: Record<string, string[]> };
  };
}

function lifecycleCase(caseId: string): LifecycleCase {
  const fixture = loadFixture("lifecycle-still-valid/lifecycle-cases.yaml");
  const item = (fixture.cases as LifecycleCase[]).find((candidate) => candidate.case_id === caseId);
  assert.ok(item, `missing lifecycle fixture ${caseId}`);
  return item;
}

function failureCase(caseId: string): FailureCase {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const item = (fixture.cases as FailureCase[]).find((candidate) => candidate.case_id === caseId);
  assert.ok(item, `missing failure fixture ${caseId}`);
  return item;
}

function failureCaseRecord(caseId: string): IndexedRecord {
  const item = failureCase(caseId);
  assert.ok(item.record, `failure fixture ${caseId} has no record`);
  return fixtureRecord(item.record);
}

function fixtureRecord(item: FixtureRecord): IndexedRecord {
  const id = String(item.parsed.id ?? item.node_id.split(":").at(-1) ?? item.node_id);
  return {
    node_type: nodeTypeForId(id, item.node_type),
    node_id: item.node_id.includes(":") ? item.node_id : `${STORY_SLUG}:${id}`,
    file_path: item.file_path ?? filePathForId(id),
    parsed: item.parsed,
    world_slug: "test",
    story_slug: STORY_SLUG
  };
}

function parentPage(activeRecords: Record<string, string[]> = fullActiveRecords()): IndexedRecord {
  return page("PG-1", { active_records: { ...fullActiveRecords(), ...activeRecords }, resolved_event_id: "SE-1" });
}

function page(
  id: string,
  options: {
    active_records?: Record<string, string[]>;
    emitted_choices?: string[];
    resolved_event_id?: string;
  } = {}
): IndexedRecord {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    parent_page_id: id === "PG-1" ? null : "PG-1",
    input: { choice_id: null, manual_action_text: null, resolved_event_id: options.resolved_event_id ?? null },
    state_snapshot: { active_records: options.active_records ?? fullActiveRecords() },
    emitted_choices: options.emitted_choices ?? []
  });
}

function event(id: string, overrides: Partial<{ create: string[]; actor: string; rationale: string }> = {}): IndexedRecord {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: overrides.actor ?? "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: overrides.rationale ?? "Structured introduction validator test.",
    record_introductions: introEntries(overrides.create ?? []),
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

function choice(id: string, groundedRecords: string[], availableTo: string[]): IndexedRecord {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    available_to: availableTo,
    grounded_in: { records: groundedRecords }
  });
}

function secret(id: string, holders: string[]): IndexedRecord {
  return storyRecord("story_secret_record", id, "secrets", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holders,
    status: "hidden"
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    ...record(nodeType, `${STORY_SLUG}:${id}`, `stories/${STORY_SLUG}/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: STORY_SLUG
  };
}

function testContext(records: IndexedRecord[], overrides: Partial<Context> = {}): Context {
  return context(records, overrides);
}

function patchPlan(op: string): PatchPlanEnvelope {
  return {
    plan_id: "plan-spec43-capstone",
    target_world: "test",
    approval_token: "placeholder",
    patches: [{
      op,
      payload: {
        story_slug: STORY_SLUG,
        record: { id: "PG-2", story_id: "STORY-1" }
      }
    }]
  } as unknown as PatchPlanEnvelope;
}

function fullActiveRecords(): Record<string, string[]> {
  return {
    STENT: ["STENT-1"],
    STSTAT: ["STSTAT-1"],
    STLOC: ["STLOC-1"],
    STCHAR: [],
    STINT: [],
    SF: [],
    BEL: [],
    OBL: [],
    CNSQ: [],
    THR: [],
    SREL: [],
    STOBJ: [],
    DA: [],
    CLK: [],
    STSEC: [],
    STQ: [],
    STPLAN: [],
    STEMO: []
  };
}

function legacyActiveRecords(): Record<string, string[]> {
  const { DA, CLK, STSEC, STQ, STPLAN, STEMO, ...legacy } = fullActiveRecords();
  void DA;
  void CLK;
  void STSEC;
  void STQ;
  void STPLAN;
  void STEMO;
  return legacy;
}

function nodeTypeForId(id: string, fallback: string): string {
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
  if (id.startsWith("PG-")) return "page_record";
  return fallback;
}

function filePathForId(id: string): string {
  if (id.startsWith("THR-")) return `stories/${STORY_SLUG}/_source/threads/${id}.yaml`;
  if (id.startsWith("CLK-")) return `stories/${STORY_SLUG}/_source/clocks/${id}.yaml`;
  if (id.startsWith("STSEC-")) return `stories/${STORY_SLUG}/_source/secrets/${id}.yaml`;
  if (id.startsWith("STQ-")) return `stories/${STORY_SLUG}/_source/story-questions/${id}.yaml`;
  if (id.startsWith("STENT-")) return `stories/${STORY_SLUG}/_source/entities/${id}.yaml`;
  if (id.startsWith("SREL-")) return `stories/${STORY_SLUG}/_source/relationships/${id}.yaml`;
  if (id.startsWith("STSTAT-")) return `stories/${STORY_SLUG}/_source/status/${id}.yaml`;
  if (id.startsWith("CHC-")) return `stories/${STORY_SLUG}/_source/choices/${id}.yaml`;
  if (id.startsWith("OBL-")) return `stories/${STORY_SLUG}/_source/obligations/${id}.yaml`;
  if (id.startsWith("DA-")) return `stories/${STORY_SLUG}/_source/artifacts/${id}.yaml`;
  if (id.startsWith("BEL-")) return `stories/${STORY_SLUG}/_source/beliefs/${id}.yaml`;
  if (id.startsWith("SF-")) return `stories/${STORY_SLUG}/_source/facts/${id}.yaml`;
  if (id.startsWith("PG-")) return `stories/${STORY_SLUG}/_source/pages/${id}.yaml`;
  return `stories/${STORY_SLUG}/_source/records/${id}.yaml`;
}

function assertNoFailures(verdicts: Verdict[]): void {
  assert.deepEqual(verdicts.filter((verdict) => verdict.severity === "fail"), []);
}

function assertHasCode(verdicts: Verdict[], code: string, message?: string): void {
  assert.ok(verdicts.some((verdict) => verdict.code === code), message ?? `${code} not emitted: ${verdicts.map((verdict) => verdict.code).join(", ")}`);
}

function assertClassifications(verdicts: Verdict[], expected: string[]): void {
  const classification = verdicts.find((verdict) => verdict.code === "compatibility_drift.classification");
  assert.ok(classification, "missing compatibility_drift.classification verdict");
  const classifications = (classification.detail as { classifications?: string[] }).classifications ?? [];
  for (const item of expected) {
    assert.ok(classifications.includes(item), `${item} missing from ${classifications.join(", ")}`);
  }
}

function assertRecordActive(recordId: string, pageId: string): void {
  const pageRecord = passRecords().find((item) => item.parsed.id === pageId);
  const activeRecords = ((pageRecord?.parsed as { state_snapshot?: { active_records?: Record<string, string[]> } })
    .state_snapshot?.active_records) ?? {};
  assert.ok(Object.values(activeRecords).some((ids) => ids.includes(recordId)), `${recordId} not active on ${pageId}`);
}

interface SharedState {
  parent_page: { id: string; active_records: Record<string, string[]> };
  child_page: { id: string; active_records: Record<string, string[]> };
}

interface FixtureRecord {
  node_type: string;
  node_id: string;
  file_path?: string;
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

interface NarrativeShapeCase {
  case_id: string;
  forbidden_field: string;
  record: FixtureRecord;
}
