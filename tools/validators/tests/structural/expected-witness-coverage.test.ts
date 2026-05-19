import assert from "node:assert/strict";
import test from "node:test";

import { expectedWitnessCoverage } from "../../src/structural/expected-witness-coverage.js";
import { context, record } from "./helpers.js";

test("expected_witness_coverage_rejects_missing_public_bel", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["DA-1"] }),
    artifact("DA-1", "public")
  ])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_missing_public_bel");
  assert.deepEqual((verdicts[0]?.detail as { missing_witnesses: string[] }).missing_witnesses, ["STENT-2", "STENT-3"]);
});

test("expected_witness_coverage_rejects_wrong_group_label", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", {
      create: ["DA-1"],
      non_propagation_facts: [
        { reason: "evidence_concealed", group: "guards", records: ["STENT-2", "STENT-3"] }
      ]
    }),
    artifact("DA-1", "public")
  ])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_wrong_group_label");
});

test("expected_witness_coverage_rejects_partial_bel_coverage", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    artifact("DA-1", "public")
  ])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_partial_bel_coverage");
  assert.deepEqual((verdicts[0]?.detail as { missing_witnesses: string[] }).missing_witnesses, ["STENT-3"]);
});

test("expected_witness_coverage_rejects_tag_records_unresolved", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", {
      create: ["DA-1"],
      non_propagation_facts: [
        { reason: "evidence_concealed", group: "direct_witnesses", records: ["STENT-99"] }
      ]
    }),
    artifact("DA-1", "public")
  ])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_tag_records_unresolved");
});

test("expected_witness_coverage_accepts_full_bel_coverage", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_rejects_public_da_without_indirect_propagation", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    artifact("DA-1", "public")
  ])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_missing_indirect_propagation");
});

test("expected_witness_coverage_rejects_factional_da_without_indirect_propagation", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    artifact("DA-1", "factional")
  ])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_missing_indirect_propagation");
});

test("expected_witness_coverage_accepts_public_da_with_indirect_route_bel", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "public", { access_route: "document", access_records: ["DA-1"] }),
    artifact("DA-1", "public")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_accepts_public_da_with_institutional_channel_route", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "public", { access_route: "institutional_channel", access_records: ["DA-1"] }),
    artifact("DA-1", "public")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_rejects_public_da_missing_institutional_channel_bel", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    artifact("DA-1", "public")
  ])));

  assertMissingIndirectPropagation(verdicts);
});

test("expected_witness_coverage_accepts_factional_da_with_rumor_route", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "faction", { access_route: "rumor", access_records: ["DA-1"] }),
    artifact("DA-1", "factional")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_rejects_factional_da_with_direct_observation_route", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "faction", { access_route: "direct_observation", access_records: ["DA-1"] }),
    artifact("DA-1", "factional")
  ])));

  assertMissingIndirectPropagation(verdicts);
});

test("expected_witness_coverage_accepts_public_da_with_location_trace_route", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "public", { access_route: "location_trace", access_records: ["DA-1"] }),
    artifact("DA-1", "public")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_rejects_public_da_missing_location_trace_bel", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    artifact("DA-1", "public")
  ])));

  assertMissingIndirectPropagation(verdicts);
});

test("expected_witness_coverage_accepts_public_da_with_object_trace_route", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "public", { access_route: "object_trace", access_records: ["DA-1"] }),
    artifact("DA-1", "public")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_rejects_public_da_with_direct_observation_object_trace_bel", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "BEL-3", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    belief("BEL-3", "public", { access_route: "direct_observation", access_records: ["DA-1"] }),
    artifact("DA-1", "public")
  ])));

  assertMissingIndirectPropagation(verdicts);
});

test("expected_witness_coverage_accepts_public_da_with_event_leaves_no_accessible_trace_fact", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", {
      create: ["BEL-1", "BEL-2", "DA-1"],
      non_propagation_facts: [
        { reason: "event_leaves_no_accessible_trace", group: "public_general", records: ["DA-1"] }
      ]
    }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    artifact("DA-1", "public")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_does_not_trigger_indirect_check_for_private_da", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", { create: ["BEL-1", "BEL-2", "DA-1"] }),
    belief("BEL-1", "STENT-2"),
    belief("BEL-2", "STENT-3"),
    artifact("DA-1", "private")
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_accepts_valid_non_propagation_evidence", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    event("SE-1", {
      create: ["STENT-4"],
      non_propagation_facts: [
        { reason: "institution_suppresses_report", group: "direct_witnesses", records: ["STENT-2", "STENT-3"] }
      ]
    })
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage_does_not_trigger_for_concealed_location", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, context(baseRecords([
    page("PG-1", ["STSTAT-4", "STSTAT-2", "STSTAT-3"]),
    event("SE-1", { create: ["DA-1"] }),
    artifact("DA-1", "public"),
    status("STSTAT-4", "STENT-1", "concealed", { supersedes: "STSTAT-1" })
  ])));

  assert.deepEqual(verdicts, []);
});

test("expected_witness_coverage is scoped to full-world, create_se_record patch plans, and touched event files", () => {
  assert.equal(expectedWitnessCoverage.applies_to(context([])), true);
  assert.equal(expectedWitnessCoverage.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), true);
  assert.equal(expectedWitnessCoverage.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), false);
  assert.equal(
    expectedWitnessCoverage.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test/_source/events/SE-1.yaml"] })),
    true
  );
});

function assertMissingIndirectPropagation(verdicts: Awaited<ReturnType<typeof expectedWitnessCoverage.run>>) {
  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "expected_witness_coverage_missing_indirect_propagation");
}

function baseRecords(records: Array<ReturnType<typeof storyRecord>> = []) {
  return [
    entity("STENT-1"),
    entity("STENT-2"),
    entity("STENT-3"),
    location("STLOC-1"),
    page("PG-1", ["STSTAT-1", "STSTAT-2", "STSTAT-3"]),
    status("STSTAT-1", "STENT-1", "STLOC-1"),
    status("STSTAT-2", "STENT-2", "STLOC-1"),
    status("STSTAT-3", "STENT-3", "STLOC-1"),
    ...records
  ];
}

function event(
  id: string,
  overrides: Partial<{
    create: string[];
    supersede: string[];
    close: string[];
    world_logic_rationale: string;
    non_propagation_facts: Array<{ reason: string; group: string; records: string[] }>;
  }>
) {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "emitted_choice", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: overrides.world_logic_rationale ?? "The event is public.",
    non_propagation_facts: overrides.non_propagation_facts ?? [],
    state_delta: {
      create: overrides.create ?? [],
      supersede: overrides.supersede ?? [],
      close: overrides.close ?? []
    },
    promotion_claims: []
  });
}

function page(id: string, activeStatuses: string[]) {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    emitted_choices: [],
    state_snapshot: {
      active_records: { STSTAT: activeStatuses },
      visible_affordances: []
    }
  });
}

function entity(id: string) {
  return storyRecord("story_entity_record", id, "entities", {
    id,
    story_id: "STORY-1",
    label: id
  });
}

function location(id: string) {
  return storyRecord("story_location_record", id, "locations", {
    id,
    story_id: "STORY-1",
    label: id,
    description: "A public location."
  });
}

function status(id: string, entityId: string, currentLocation: string, overrides: Record<string, unknown> = {}) {
  return storyRecord("story_status_record", id, "status", {
    id,
    story_id: "STORY-1",
    entity: entityId,
    life: "alive",
    agency: "free",
    location: currentLocation,
    ...overrides
  });
}

function belief(
  id: string,
  holder: string,
  basisOverrides: Partial<{ access_route: string; access_records: string[] }> = {}
) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holder,
    claim: "The public event happened.",
    belief_mode: "knows",
    truth_relation: "true",
    confidence: "high",
    visibility: "public",
    basis: {
      source_event: "SE-1",
      access_route: basisOverrides.access_route ?? "direct_observation",
      access_records: basisOverrides.access_records ?? ["SE-1"]
    },
    consequences: { opens: [], constrains_choices: [] }
  });
}

function artifact(id: string, circulation: string) {
  return storyRecord("story_diegetic_artifact_record", id, "artifacts", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    title: id,
    author: "STENT-1",
    genre: "notice",
    body: "A public notice.",
    intended_audience: "public",
    circulation,
    truth_relation: "true"
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, id, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_se_record" | "create_pg_record"): any {
  return {
    plan_id: "plan-expected-witness-coverage",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
