import assert from "node:assert/strict";
import test from "node:test";

import { turnDriverPovObserverFirewall } from "../../src/structural/turn-driver-pov-observer-firewall.js";
import { context, record } from "./helpers.js";

test("turn_driver_pov_observer_firewall accepts non-player drivers with active BEL access routes", async () => {
  const cases = [
    driver("npc_action", "perceived_directly", ["STPLAN-1"], { STPLAN: ["STPLAN-1"], BEL: ["BEL-1"] }),
    driver("offstage_action", "reported", ["STPLAN-1"], { STPLAN: ["STPLAN-1"], BEL: ["BEL-1"] }),
    driver("clock_fire", "inferred_from_trace", ["CLK-1"], { CLK: ["CLK-1"], BEL: ["BEL-1"] }),
    driver("world_pressure", "reported", ["THR-1"], { THR: ["THR-1"], BEL: ["BEL-1"] }),
    driver("secret_reveal", "discovered_after", ["STSEC-1"], { STSEC: ["STSEC-1"] }),
    driver("multi_actor_collision", "perceived_directly", ["STPLAN-1", "STEMO-1"], { STPLAN: ["STPLAN-1"], STEMO: ["STEMO-1"], BEL: ["BEL-1"] })
  ];

  for (const item of cases) {
    const verdicts = await turnDriverPovObserverFirewall.run(input(), context(records(item), { story_slug: "test-story" }));
    assert.deepEqual(verdicts, [], item.kind);
  }
});

// TDPOV-001 regression: an on-stage npc_action the POV witnesses may declare perceived_directly even
// when its driver_records[] are the initiator's private interior records (STEMO/THR/SREL). FOUNDATIONS
// §6b's downgrade triggers are a closed set (hidden STSEC, offstage STPLAN, unwitnessed offstage event),
// so interior records do not downgrade perceived_directly. This is the red-bunny PG-2→PG-3 shape.
test("turn_driver_pov_observer_firewall accepts perceived_directly for an on-stage npc_action with private-interior driver records", async () => {
  const item = driver("npc_action", "perceived_directly", ["STEMO-1", "THR-1"], { STEMO: ["STEMO-1"], THR: ["THR-1"] });
  const verdicts = await turnDriverPovObserverFirewall.run(input(), context(records(item), { story_slug: "test-story" }));

  assert.deepEqual(verdicts, []);
});

test("turn_driver_pov_observer_firewall reports hidden-state and access-route failures", async () => {
  const cases: Array<[string, ReturnType<typeof driver>, string]> = [
    [
      "offstage STPLAN perceived directly",
      driver("offstage_action", "perceived_directly", ["STPLAN-1"], { STPLAN: ["STPLAN-1"] }),
      "turn_driver_hidden_state_leak"
    ],
    [
      "hidden STSEC perceived directly",
      driver("secret_reveal", "perceived_directly", ["STSEC-1"], { STSEC: ["STSEC-1"] }),
      "turn_driver_hidden_state_leak"
    ],
    [
      "reported route without BEL access",
      driver("world_pressure", "reported", ["THR-1"], { THR: ["THR-1"] }),
      "turn_driver_missing_access_route"
    ]
  ];

  for (const [name, item, code] of cases) {
    const verdicts = await turnDriverPovObserverFirewall.run(input(), context(records(item), { story_slug: "test-story" }));
    assert.equal(verdicts.filter((verdict) => verdict.code === code).length, 1, `${name}: ${JSON.stringify(verdicts, null, 2)}`);
    assert.equal(verdicts.find((verdict) => verdict.code === code)?.location.node_id, "test-story:SE-1");
  }
});

test("turn_driver_pov_observer_firewall rejects offstage direct mind access in page plans", async () => {
  const item = driver("offstage_action", "reported", ["STPLAN-1"], { STPLAN: ["STPLAN-1"], BEL: ["BEL-1"] });
  const verdicts = await turnDriverPovObserverFirewall.run(input({ interiority: "Varro knew Jon would choose Mara." }), context(records(item), { story_slug: "test-story" }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "turn_driver_offstage_direct_mind_access");
  assert.equal(verdicts[0]?.location.file, "stories/test-story/pages-prose-plans/PG-1.md");
});

test("turn_driver_pov_observer_firewall ignores player drivers and is scoped to story driver surfaces", async () => {
  const verdicts = await turnDriverPovObserverFirewall.run(input(), context([
    parentPage({ STPLAN: ["STPLAN-1"] }),
    childPage(),
    event({ turn_driver: { kind: "player_action", initiator: "player", driver_records: [], player_response_mode: "initiates", pov_visibility: "perceived_directly" } })
  ], { story_slug: "test-story" }));

  assert.deepEqual(verdicts, []);
  assert.equal(turnDriverPovObserverFirewall.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(turnDriverPovObserverFirewall.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") as never })), true);
  assert.equal(turnDriverPovObserverFirewall.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(turnDriverPovObserverFirewall.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(turnDriverPovObserverFirewall.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/pages-prose-plans/PG-1.md"] })), true);
});

function records(item: ReturnType<typeof driver>) {
  const [firstRecord] = item.driverRecords;
  return [
    parentPage(item.activeRecords),
    childPage(),
    event({ turn_driver: item.turnDriver }),
    storyRecord("story_plan_record", "STPLAN-1", "plans", { holder: "STENT-1", scope: { visibility: "offstage" } }),
    storyRecord("story_emotion_record", "STEMO-1", "emotions", { holder: "STENT-2" }),
    storyRecord("pressure_clock_record", "CLK-1", "clocks"),
    storyRecord("thread_record", "THR-1", "threads"),
    storyRecord("story_secret_record", "STSEC-1", "secrets", { status: "hidden" }),
    belief("BEL-1", firstRecord ?? "STPLAN-1")
  ];
}

function driver(kind: string, povVisibility: string, driverRecords: string[], activeRecords: Record<string, string[]>) {
  const initiator = kind === "clock_fire" || kind === "world_pressure" ? "world" : kind === "multi_actor_collision" ? "unknown" : kind === "secret_reveal" ? "system" : "STENT-1";
  return {
    kind,
    driverRecords,
    activeRecords,
    turnDriver: {
      kind,
      initiator,
      driver_records: driverRecords,
      player_response_mode: kind === "clock_fire" ? "witnesses" : "responds",
      pov_visibility: povVisibility
    }
  };
}

function input(overrides: { interiority?: string } = {}) {
  return {
    files: [{
      path: "stories/test-story/pages-prose-plans/PG-1.md",
      content: `## 7a. Turn driver / initiative trace

- Driver kind: offstage_action
- Initiator: STENT-1
- Driver records: STPLAN-1
- Player response mode: responds
- POV visibility: reported
- Observer-firewall note: Jon hears the window shatter.

## 16a. STCHAR-derived character authority packets

- STENT-1 / STCHAR-1
  - Required because: offstage_causal.
  - Current-state grounding records: STPLAN-1
  - Summary: ${overrides.interiority ?? "The west window bursts inward."}
`
    }]
  };
}

function parentPage(activeRecords: Record<string, string[]>) {
  return storyRecord("page_record", "PG-0", "pages", {
    id: "PG-0",
    state_snapshot: { active_records: activeRecords }
  });
}

function childPage() {
  return storyRecord("page_record", "PG-1", "pages", {
    id: "PG-1",
    input: { resolved_event_id: "SE-1" },
    state_snapshot: { active_records: {} }
  });
}

function event(overrides: Record<string, unknown>) {
  return storyRecord("story_event_record", "SE-1", "events", {
    id: "SE-1",
    parent_page_id: "PG-0",
    event_kind: "turn_resolution",
    actor: "STENT-2",
    commitment: { selected_slt_id: "SLT-1", selection_source: "npc_initiative", alias_bindings: {} },
    state_delta: { create: [], supersede: [], close: [] },
    ...overrides
  });
}

function belief(id: string, accessRecord: string) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    holder: "STENT-2",
    belief_mode: "observed",
    truth_relation: "true",
    confidence: "high",
    visibility: "shared",
    basis: { source_event: "SE-0", access_route: "direct_observation", access_records: [accessRecord] },
    consequences: { opens: [], constrains_choices: [] }
  });
}

function storyRecord(nodeType: string, id: string, subdir: string, parsed: Record<string, unknown> = {}) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    ...parsed
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: string) {
  return { patches: [{ op }] };
}
