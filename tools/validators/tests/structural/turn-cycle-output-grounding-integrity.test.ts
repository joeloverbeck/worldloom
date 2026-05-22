import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import type { Context, IndexedRecord } from "../../src/framework/types.js";
import { turnCycleOutputGroundingIntegrity } from "../../src/structural/turn-cycle-output-grounding-integrity.js";
import { context } from "./helpers.js";

const STORY_SLUG = "turn-cycle-output-grounding-test";

test("turn_cycle_output_grounding_integrity accepts CNSQ, SF, and DA grounded in active or same-event causal records", async () => {
  const records = baseRecords([
    causalRecord("STQ-1", "story_question_record", "story-questions", { created_at_page: "PG-1" }),
    page("PG-1", { STENT: ["STENT-1"], STQ: ["STQ-1"] }),
    event("SE-2", { create: ["STEMO-1", "CNSQ-1", "SF-1", "DA-1"] }),
    causalRecord("STEMO-1", "story_emotion_record", "emotions"),
    consequence("CNSQ-1", { derived_from: ["STQ-1"] }),
    storyFact("SF-1", { derived_from: ["STEMO-1"] }),
    artifact("DA-1", { derived_from: ["SE-2"] }),
    page("PG-2", { STENT: ["STENT-1"], STQ: ["STQ-1"], STEMO: ["STEMO-1"], CNSQ: ["CNSQ-1"], SF: ["SF-1"], DA: ["DA-1"] })
  ]);

  const verdicts = await turnCycleOutputGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("turn_cycle_output_grounding_integrity rejects missing derived_from on created target records", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["CNSQ-1", "SF-1", "DA-1"] }),
    consequence("CNSQ-1", { derived_from: [] }),
    storyFact("SF-1", { derived_from: [] }),
    artifact("DA-1", { derived_from: [] }),
    page("PG-2", { STENT: ["STENT-1"], CNSQ: ["CNSQ-1"], SF: ["SF-1"], DA: ["DA-1"] })
  ]);

  const verdicts = await turnCycleOutputGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts.map((verdict) => [verdict.code, (verdict.detail as { record_id?: string }).record_id]), [
    ["turn_cycle_output_missing_derived_from", "CNSQ-1"],
    ["turn_cycle_output_missing_derived_from", "SF-1"],
    ["turn_cycle_output_missing_derived_from", "DA-1"]
  ]);
});

test("turn_cycle_output_grounding_integrity rejects inactive grounding", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["CNSQ-1"] }),
    consequence("CNSQ-1", { derived_from: ["STQ-404"] }),
    page("PG-2", { STENT: ["STENT-1"], CNSQ: ["CNSQ-1"] })
  ]);

  const verdicts = await turnCycleOutputGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "turn_cycle_output_grounding_missing");
  assert.deepEqual(verdicts[0]?.detail, { record_id: "CNSQ-1", grounding_record: "STQ-404" });
});

test("turn_cycle_output_grounding_integrity rejects disallowed grounding class", async () => {
  const records = baseRecords([
    event("SE-2", { create: ["STCHAR-1", "SF-1"] }),
    storyRecord("story_character_authority_record", "STCHAR-1", `stories/${STORY_SLUG}/story-characters/STCHAR-1.md`, {
      id: "STCHAR-1",
      story_id: "STORY-1",
      created_at_page: "PG-2"
    }),
    storyFact("SF-1", { derived_from: ["STCHAR-1"] }),
    page("PG-2", { STENT: ["STENT-1"], SF: ["SF-1"] })
  ]);

  const verdicts = await turnCycleOutputGroundingIntegrity.run(undefined, testContext(records));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "turn_cycle_output_grounding_missing");
  assert.deepEqual(verdicts[0]?.detail, { record_id: "SF-1", grounding_record: "STCHAR-1" });
});

test("turn_cycle_output_grounding_integrity ignores bootstrap and non-target created records", async () => {
  const records = [
    page("PG-1", { STENT: ["STENT-1"], CNSQ: ["CNSQ-1"] }),
    event("SE-1", { create: ["CNSQ-1", "SREL-1"], created_at_page: "PG-1", event_kind: "story_start" }),
    consequence("CNSQ-1", { created_at_page: "PG-1", derived_from: [] }),
    storyRecord("relationship_record_story", "SREL-1", `stories/${STORY_SLUG}/_source/relationships/SREL-1.yaml`, {
      id: "SREL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      derived_from: []
    })
  ];

  const verdicts = await turnCycleOutputGroundingIntegrity.run(undefined, testContext(records));

  assert.deepEqual(verdicts, []);
});

test("turn_cycle_output_grounding_integrity is scoped to full-world, event/page patch plans, and touched target files", () => {
  assert.equal(turnCycleOutputGroundingIntegrity.applies_to(testContext([])), true);
  assert.equal(
    turnCycleOutputGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })),
    true
  );
  assert.equal(
    turnCycleOutputGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })),
    true
  );
  assert.equal(
    turnCycleOutputGroundingIntegrity.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_sf_record") })),
    false
  );
  assert.equal(
    turnCycleOutputGroundingIntegrity.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/artifacts/DA-1.yaml"]
    })),
    true
  );
});

function baseRecords(records: IndexedRecord[]): IndexedRecord[] {
  return [
    page("PG-1", { STENT: ["STENT-1"] }),
    storyRecord("story_entity_record", "STENT-1", `stories/${STORY_SLUG}/_source/entities/STENT-1.yaml`, {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }),
    ...records
  ];
}

function event(id: string, overrides: Partial<{
  create: string[];
  created_at_page: string;
  parent_page_id: string;
  event_kind: string;
}>): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: overrides.created_at_page ?? "PG-2",
    parent_page_id: overrides.parent_page_id ?? "PG-1",
    event_kind: overrides.event_kind ?? "selected_choice",
    state_delta: { create: overrides.create ?? [], supersede: [], close: [] }
  });
}

function page(id: string, activeRecords: Record<string, string[]>): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY_SLUG}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    state_snapshot: { active_records: activeRecords }
  });
}

function consequence(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("consequence_record", id, `stories/${STORY_SLUG}/_source/consequences/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    status: "pending",
    consequence_kind: "social_fallout",
    description: "A concrete consequence is now pending.",
    resolves_when: "The fallout is addressed in play.",
    urgency: "medium",
    derived_from: ["SE-2"],
    ...overrides
  });
}

function storyFact(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("story_fact_record", id, `stories/${STORY_SLUG}/_source/facts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    statement: "The courier knows the lock is compromised.",
    authority: "branch_local",
    derived_from: ["SE-2"],
    ...overrides
  });
}

function artifact(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("story_diegetic_artifact_record", id, `stories/${STORY_SLUG}/_source/artifacts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    title: "Compromised Lock Note",
    author: "STENT-1",
    genre: "note",
    body: "The lock is compromised.",
    intended_audience: "self",
    circulation: "private",
    truth_relation: "true",
    derived_from: ["SE-2"],
    ...overrides
  });
}

function causalRecord(id: string, nodeType: string, sourceDir: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord(nodeType, id, `stories/${STORY_SLUG}/_source/${sourceDir}/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
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

function testContext(records: IndexedRecord[], overrides: Partial<Context> = {}): Context {
  return context(records, overrides);
}

function patchPlan(op: string): PatchPlanEnvelope {
  return { patches: [{ op }] } as unknown as PatchPlanEnvelope;
}
