import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { observerFirewall, STATIC_ACCESS_RECORD_PREFIXES } from "../../src/structural/observer-firewall.js";
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

test("observer_firewall delegates non-player turn drivers to the turn-driver POV firewall", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["BEL-2"]),
    event("SE-1", "STENT-1", "PG-1", { selected_slt_id: null, alias_bindings: {} }, "npc_action"),
    belief("BEL-2", "STENT-2", "private")
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall inspects player write-in turn drivers", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["BEL-2"]),
    event("SE-1", "STENT-1", "PG-1", { selected_slt_id: null, alias_bindings: {} }, "player_write_in"),
    belief("BEL-2", "STENT-2", "private")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_private_belief_leak");
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

test("observer_firewall accepts STPLAN grounding through actor-accessible belief basis", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STPLAN-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    plan("STPLAN-1", "STENT-1", ["BEL-1"]),
    belief("BEL-1", "STENT-1", "private")
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall rejects STPLAN grounding without actor-accessible belief basis", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STPLAN-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    plan("STPLAN-1", "STENT-1", ["BEL-2"]),
    belief("BEL-2", "STENT-2", "private")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_no_access_route");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-1",
    actor: "STENT-1",
    choice_id: "CHC-1",
    reference_id: "STPLAN-1",
    reference_path: "grounded_in.records[0]"
  });
});

test("observer_firewall accepts STEMO grounding through actor-accessible appraisal basis", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STEMO-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    emotion("STEMO-1", "STENT-1", ["BEL-1"]),
    belief("BEL-1", "STENT-1", "private")
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall accepts cross-actor STEMO grounding with an observability BEL for the holder", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STEMO-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    emotion("STEMO-2", "STENT-2", ["BEL-2"]),
    beliefWithRoute("BEL-1", "STENT-1", "private", "direct_observation", ["STENT-2"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall rejects cross-actor STEMO grounding without an observability BEL for the holder", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STEMO-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    emotion("STEMO-2", "STENT-2", ["BEL-2"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_no_access_route");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-1",
    actor: "STENT-1",
    choice_id: "CHC-1",
    reference_id: "STEMO-2",
    reference_path: "grounded_in.records[0]"
  });
  assert.match(verdicts[0]?.message ?? "", /route via the holder entity of STEMO-2/);
});

test("observer_firewall rejects cross-actor STEMO grounding with a non-observability BEL route", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STEMO-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    emotion("STEMO-2", "STENT-2", ["BEL-2"]),
    beliefWithRoute("BEL-1", "STENT-1", "private", "rumor", ["STENT-2"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_no_access_route");
});

test("observer_firewall does not accept direct cross-actor STEMO access-record ids", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STEMO-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    emotion("STEMO-2", "STENT-2", ["BEL-2"]),
    beliefWithRoute("BEL-1", "STENT-1", "private", "direct_observation", ["STEMO-2"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_no_access_route");
  assert.match(verdicts[0]?.message ?? "", /route via the holder entity of STEMO-2/);
});

test("observer_firewall accepts CHC status grounding for the actor's own active STSTAT", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STSTAT-1"]),
    event("SE-1", "STENT-1", "PG-1"),
    status("STSTAT-1", "STENT-1")
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall rejects CHC status grounding for another actor without an access route", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STSTAT-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    status("STSTAT-2", "STENT-2")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "observer_firewall_violation_no_access_route");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-1",
    actor: "STENT-1",
    choice_id: "CHC-1",
    reference_id: "STSTAT-2",
    reference_path: "grounded_in.records[0]"
  });
});

test("observer_firewall accepts CHC status grounding through a BEL access route", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", ["STSTAT-2"]),
    event("SE-1", "STENT-1", "PG-1"),
    status("STSTAT-2", "STENT-2"),
    belief("BEL-1", "STENT-1", "private", ["STSTAT-2"])
  ]));

  assert.deepEqual(verdicts, []);
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

test("observer_firewall rejects hidden CLK/STSEC/STQ preconditions without actor access", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", []),
    event("SE-1", "STENT-1", "PG-1", {
      selected_slt_id: "SLT-1",
      alias_bindings: {}
    }),
    storylet("SLT-1", [
      "clock_at_least(CLK-1, 2)",
      "secret_unrevealed(STSEC-1)",
      "story_question_open(STQ-1)"
    ]),
    pressureClock("CLK-1", "hidden", "STENT-2"),
    storySecret("STSEC-1", ["STENT-2"], "hidden"),
    storyQuestion("STQ-1", "hidden", ["SF-1"]),
    fact("SF-1")
  ]));

  assert.deepEqual(
    verdicts
      .filter((verdict) => verdict.code === "observer_firewall_violation_hidden_record_precondition")
      .map((verdict) => (verdict.detail as { reference_id: string }).reference_id)
      .sort(),
    ["CLK-1", "STQ-1", "STSEC-1"]
  );
});

test("observer_firewall accepts SPEC-42 hidden preconditions with actor access routes", async () => {
  const verdicts = await observerFirewall.run(undefined, context([
    page("PG-1", "CHC-1"),
    choice("CHC-1", []),
    event("SE-1", "STENT-1", "PG-1", {
      selected_slt_id: "SLT-1",
      alias_bindings: {}
    }),
    storylet("SLT-1", [
      { pred: "clock_at_least", clock: "CLK-1", value: 2 },
      { pred: "secret_unrevealed", secret: "STSEC-1" },
      { pred: "story_question_open", question: "STQ-1" }
    ]),
    pressureClock("CLK-1", "hidden", "STENT-2"),
    storySecret("STSEC-1", ["STENT-1"], "hidden"),
    storyQuestion("STQ-1", "hidden", ["SF-1"]),
    fact("SF-1"),
    belief("BEL-1", "STENT-1", "private", ["CLK-1", "SF-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("observer_firewall direct BEL access prefixes stay in parity with the BEL schema", () => {
  assert.deepEqual(
    [...STATIC_ACCESS_RECORD_PREFIXES].sort(),
    beliefSchemaAccessRecordPrefixes().sort()
  );
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
  commitment: Record<string, unknown> = { selected_slt_id: null, alias_bindings: {} },
  driverKind = "player_action"
) {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    event_kind: "turn_resolution",
    turn_driver: { kind: driverKind },
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

function beliefWithRoute(id: string, holder: string, visibility: string, accessRoute: string, accessRecords: string[]) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    holder,
    visibility,
    basis: { access_route: accessRoute, access_records: accessRecords }
  });
}

function beliefSchemaAccessRecordPrefixes(): string[] {
  const schema = JSON.parse(readFileSync("src/schemas/story-belief.schema.json", "utf8")) as {
    properties?: {
      basis?: {
        properties?: {
          access_records?: {
            items?: {
              pattern?: string;
            };
          };
        };
      };
    };
  };
  const pattern = schema.properties?.basis?.properties?.access_records?.items?.pattern;
  const match = pattern?.match(/^\^\(([^)]+)\)-/);
  assert.ok(match?.[1], "BEL schema access_records pattern should be a grouped prefix regex");
  return match[1].split("|");
}

function fact(id: string) {
  return storyRecord("story_fact_record", id, "facts", {
    id,
    story_id: "STORY-1",
    authority: "branch_local",
    derived_from: []
  });
}

function plan(id: string, holder: string, beliefBasis: string[]) {
  return storyRecord("story_plan_record", id, "plans", {
    id,
    story_id: "STORY-1",
    holder,
    belief_basis: beliefBasis
  });
}

function emotion(id: string, holder: string, appraisalBasis: string[]) {
  return storyRecord("story_emotion_record", id, "emotions", {
    id,
    story_id: "STORY-1",
    holder,
    status: "active",
    appraisal_basis: appraisalBasis
  });
}

function status(id: string, entity: string) {
  return storyRecord("story_status_record", id, "status", {
    id,
    story_id: "STORY-1",
    entity,
    life: "alive",
    agency: "free",
    location: "STLOC-1"
  });
}

function pressureClock(id: string, visibility: string, driver: string) {
  return storyRecord("pressure_clock_record", id, "clocks", {
    id,
    story_id: "STORY-1",
    visibility,
    driver
  });
}

function storySecret(id: string, holders: string[], status: string) {
  return storyRecord("story_secret_record", id, "secrets", {
    id,
    story_id: "STORY-1",
    holders,
    status
  });
}

function storyQuestion(id: string, audienceVisibility: string, sourceRecords: string[]) {
  return storyRecord("story_question_record", id, "story-questions", {
    id,
    story_id: "STORY-1",
    audience_visibility: audienceVisibility,
    source_records: sourceRecords
  });
}

function storylet(id: string, hardPreconditions: unknown[]) {
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
