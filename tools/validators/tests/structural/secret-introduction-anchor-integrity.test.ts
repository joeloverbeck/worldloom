import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import yaml from "js-yaml";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { secretIntroductionAnchorIntegrity } from "../../src/structural/secret-introduction-anchor-integrity.js";
import { context } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("secret_introduction_anchor_integrity accepts the creation-pass STSEC fixture", async () => {
  const fixture = loadFixture("creation-pass/all-classes.yaml");
  const records = recordsFromPassFixture(fixture);

  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("secret_introduction_anchor_integrity rejects introduced STSEC with empty source_records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STSEC-91", "SF-1"] }),
    secret("STSEC-91", { source_records: [], truth_anchor: "SF-1" }),
    fact("SF-1")
  ]);

  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(records));

  assert.ok(verdicts.some((verdict) => verdict.code === "secret_intro_missing_source"));
});

test("secret_introduction_anchor_integrity rejects introduced STSEC with no grounding anchors", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STSEC-92", "SF-1"] }),
    secret("STSEC-92", {
      holders: [],
      clue_carriers: [],
      truth_anchor: null,
      protected_mystery_refs: [],
      source_records: ["SF-1"]
    }),
    fact("SF-1")
  ]);

  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(records));

  assert.ok(verdicts.some((verdict) => verdict.code === "secret_intro_holder_missing"));
});

test("secret_introduction_anchor_integrity rejects missing truth_anchor references", async () => {
  const fixture = loadFixture("creation-fail/failure-cases.yaml");
  const secretCase = (fixture.cases as FailureCase[]).find((item) => item.case_id === "author-only-future-twist-secret");
  assert.ok(secretCase?.record);
  const records = baseRecords([
    event("SE-2", { create: ["STSEC-99"] }),
    fixtureRecord(secretCase.record)
  ]);

  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(records));

  assert.ok(verdicts.some((verdict) => verdict.code === "secret_intro_missing_source"));
  assert.ok(verdicts.some((verdict) => verdict.code === "secret_intro_truth_anchor_missing"));
});

test("secret_introduction_anchor_integrity allows protected mystery references without duplicating firewall logic", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STSEC-93", "SF-1"] }),
    secret("STSEC-93", {
      holders: [],
      clue_carriers: [],
      truth_anchor: null,
      protected_mystery_refs: ["M-1"],
      source_records: ["SF-1"]
    }),
    fact("SF-1"),
    mystery("M-1")
  ]);

  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("secret_introduction_anchor_integrity ignores root-bootstrap STSEC creation", async () => {
  const records = [
    event("SE-1", { create: ["STSEC-1"], created_at_page: "PG-1" }),
    secret("STSEC-1", { created_at_page: "PG-1", source_records: [], holders: [] })
  ];

  const verdicts = await secretIntroductionAnchorIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("secret_introduction_anchor_integrity is scoped to full-world, STSEC patch plans, and touched secret files", () => {
  assert.equal(secretIntroductionAnchorIntegrity.applies_to(testContext([])), true);
  assert.equal(
    secretIntroductionAnchorIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stsec_record") })),
    true
  );
  assert.equal(
    secretIntroductionAnchorIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    secretIntroductionAnchorIntegrity.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/secrets/STSEC-1.yaml"]
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
      SF: [],
      BEL: [],
      DA: [],
      STSEC: []
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
    world_logic_rationale: "Structured secret introduction.",
    record_introductions: introEntries(overrides.create),
    state_delta: { create: overrides.create, supersede: [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .filter((id) => id.startsWith("STSEC-"))
    .map((record_id) => ({
      record_id,
      class: "STSEC",
      trigger: "clue_carrier_enters_play",
      evidence: ["SF-1"],
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

function secret(id: string, overrides: Record<string, unknown>): IndexedRecord {
  return storyRecord("story_secret_record", id, `stories/${STORY_SLUG}/_source/secrets/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    secret_kind: "location",
    secret_claim: "The sealed order names a hidden second gate.",
    truth_anchor: "SF-1",
    holders: ["STENT-1"],
    salience: "high",
    source_records: ["SF-1", "SE-2"],
    clue_carriers: [],
    protected_mystery_refs: [],
    status: "hidden",
    ...overrides
  });
}

function fact(id: string): IndexedRecord {
  return storyRecord("story_fact_record", id, `stories/${STORY_SLUG}/_source/facts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    fact: "A hidden second gate exists.",
    authority: "branch_local",
    derived_from: ["SE-2"],
    status: "active"
  });
}

function mystery(id: string): IndexedRecord {
  return {
    node_type: "mystery_reserve_entry",
    node_id: id,
    file_path: `_source/mystery-reserve/${id}.yaml`,
    parsed: {
      id,
      title: "Unknown gate origin",
      status: "active",
      future_resolution_safety: "low"
    },
    world_slug: "test"
  };
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

interface FailureCase {
  case_id: string;
  record?: FixtureRecord;
}
