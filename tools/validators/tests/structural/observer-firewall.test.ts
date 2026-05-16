import assert from "node:assert/strict";
import test from "node:test";

import { observerFirewall } from "../../src/structural/observer-firewall.js";
import { context, record } from "./helpers.js";

test("observer_firewall accepts choices grounded in the actor's own BEL", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["BEL-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    belief("BEL-1", "STENT-1", "private")
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall rejects private BEL leakage from another actor", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["BEL-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    belief("BEL-2", "STENT-2", "private")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_private_belief_leak");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-1",
    actor: "STENT-1",
    choice_id: "CHC-1",
    belief_id: "BEL-2",
    belief_holder: "STENT-2",
    reference_path: "grounded_in.records[0]"
  });
});

test("observer_firewall accepts defensive SF grounding with a BEL access route", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["SF-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    fact("SF-1"),
    belief("BEL-1", "STENT-1", "private", ["SF-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall rejects defensive SF grounding without an access route", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["SF-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    fact("SF-1")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_no_access_route");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-1",
    actor: "STENT-1",
    choice_id: "CHC-1",
    reference_id: "SF-1",
    reference_path: "grounded_in.records[0]"
  });
});

test("observer_firewall rejects SLT belief_record holder mismatches after alias resolution", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    storylet("SLT-1", ["belief_record(role_protagonist, BEL-1, knows)"]),
    event("SE-1", "STENT-1", "PG-1", {
      selected_slt_id: "SLT-1",
      alias_bindings: { role_protagonist: "STENT-1" }
    }),
    belief("BEL-1", "STENT-2", "private")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_predicate_holder_mismatch");
  assert.deepEqual(verdicts[0]?.detail, {
    storylet_id: "SLT-1",
    reference_path: "preconditions.hard[0]",
    predicate_holder: "role_protagonist",
    expected_holder: "STENT-1",
    belief_id: "BEL-1",
    belief_holder: "STENT-2"
  });
});

test("observer_firewall accepts public BEL grounding", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["BEL-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    belief("BEL-1", "STENT-2", "public")
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall uses child page input.choice_id, not parent page", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    page("PG-2", "CHC-2", "SE-2"),
    choice("CHC-1", ["BEL-1"]),
    choice("CHC-2", ["BEL-2"]),
    event("SE-2", "STENT-1", "PG-1"),
    belief("BEL-1", "STENT-2", "public"),
    belief("BEL-2", "STENT-2", "private")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_private_belief_leak");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-2",
    actor: "STENT-1",
    choice_id: "CHC-2",
    belief_id: "BEL-2",
    belief_holder: "STENT-2",
    reference_path: "grounded_in.records[0]"
  });
});

test("observer_firewall is scoped to full-world, create event/storylet plans, and touched event/storylet files", () => {
  assert.equal(observerFirewall.applies_to(context([])), true);
  assert.equal(observerFirewall.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), false);
  assert.equal(observerFirewall.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), true);
  assert.equal(observerFirewall.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") })), true);
  assert.equal(
    observerFirewall.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test/_source/events/SE-1.yaml"] })),
    true
  );
});

function page(id: string, choiceId: string, resolvedEventId = "SE-1") {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    input: { choice_id: choiceId, resolved_event_id: resolvedEventId }
  });
}

function choice(id: string, groundedRecords: string[]) {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    grounded_in: { records: groundedRecords }
  });
}

function event(
  id: string,
  actor: string,
  parentPageId: string,
  commitment: Record<string, unknown> = { selected_slt_id: null, alias_bindings: {} }
) {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    event_kind: "selected_choice",
    actor,
    parent_page_id: parentPageId,
    commitment
  });
}

function belief(id: string, holder: string, visibility: string, accessRecords: string[] = []) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    holder,
    visibility,
    basis: { access_records: accessRecords }
  });
}

function fact(id: string) {
  return storyRecord("story_fact_record", id, "facts", {
    id,
    story_id: "STORY-1",
    authority: "branch_local",
    derived_from: []
  });
}

function storylet(id: string, hardPreconditions: string[]) {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-1",
    preconditions: { hard: hardPreconditions, soft: [] }
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_slt_record" | "create_se_record") {
  return {
    plan_id: "plan-observer-firewall",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
