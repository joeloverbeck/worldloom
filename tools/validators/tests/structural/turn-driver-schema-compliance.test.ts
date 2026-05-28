import assert from "node:assert/strict";
import test from "node:test";

import { turnDriverSchemaCompliance } from "../../src/structural/turn-driver-schema-compliance.js";
import { context, record } from "./helpers.js";

test("turn_driver_schema_compliance accepts valid player and non-player driver kinds", async () => {
  const cases = [
    driver("player_action", { initiator: "player", driver_records: [], player_response_mode: "initiates", pov_visibility: "perceived_directly" }, []),
    driver("player_write_in", { initiator: "player", driver_records: [], player_response_mode: "initiates", pov_visibility: "perceived_directly" }, []),
    driver("npc_action", { initiator: "STENT-1", driver_records: ["STPLAN-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, ["STPLAN-1"]),
    driver("npc_action", { initiator: "STENT-1", driver_records: ["STINT-1", "BEL-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, ["STINT-1", "BEL-1"]),
    driver("offstage_action", { initiator: "STENT-1", driver_records: ["STPLAN-1"], player_response_mode: "responds", pov_visibility: "reported" }, ["STPLAN-1"]),
    driver("clock_fire", { initiator: "world", driver_records: ["CLK-1"], player_response_mode: "witnesses", pov_visibility: "inferred_from_trace" }, ["CLK-1"]),
    driver("world_pressure", { initiator: "world", driver_records: ["THR-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, ["THR-1"]),
    driver("secret_reveal", { initiator: "system", driver_records: ["STSEC-1"], player_response_mode: "witnesses", pov_visibility: "discovered_after" }, ["STSEC-1"]),
    driver("multi_actor_collision", { initiator: "unknown", driver_records: ["STPLAN-1", "STEMO-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, ["STPLAN-1", "STEMO-1"])
  ];

  for (const item of cases) {
    const verdicts = await turnDriverSchemaCompliance.run(undefined, context(records(item.turnDriver, item.active)));
    assert.deepEqual(verdicts, [], item.kind);
  }
});

test("turn_driver_schema_compliance reports each prescribed failure code", async () => {
  const cases: Array<[string, Record<string, unknown> | undefined, string[], string]> = [
    ["turn_driver_missing", undefined, [], "turn_driver_missing"],
    ["turn_driver_kind_invalid", { kind: "bad", initiator: "world", driver_records: [], player_response_mode: "none", pov_visibility: "withheld" }, [], "turn_driver_kind_invalid"],
    ["turn_driver_initiator_pattern_violation", { kind: "npc_action", initiator: "player", driver_records: ["STPLAN-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, ["STPLAN-1"], "turn_driver_initiator_pattern_violation"],
    ["turn_driver_driver_record_inactive", { kind: "world_pressure", initiator: "world", driver_records: ["THR-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, [], "turn_driver_driver_record_inactive"],
    ["turn_driver_driver_records_empty_for_non_player", { kind: "world_pressure", initiator: "world", driver_records: [], player_response_mode: "responds", pov_visibility: "perceived_directly" }, [], "turn_driver_driver_records_empty_for_non_player"],
    ["turn_driver_offstage_perceived_directly", { kind: "offstage_action", initiator: "STENT-1", driver_records: ["STPLAN-1"], player_response_mode: "responds", pov_visibility: "perceived_directly" }, ["STPLAN-1"], "turn_driver_offstage_perceived_directly"],
    ["turn_driver_player_kind_with_driver_records", { kind: "player_action", initiator: "player", driver_records: ["STPLAN-1"], player_response_mode: "initiates", pov_visibility: "perceived_directly" }, ["STPLAN-1"], "turn_driver_player_kind_with_driver_records"]
  ];

  for (const [name, turnDriver, active, code] of cases) {
    const verdicts = await turnDriverSchemaCompliance.run(undefined, context(records(turnDriver, active)));
    const matching = verdicts.filter((verdict) => verdict.code === code);
    assert.equal(matching.length, 1, `${name}: ${JSON.stringify(verdicts, null, 2)}`);
    assert.equal(matching[0]?.location.node_id, "test-story:SE-1");
  }
});

test("turn_driver_schema_compliance ignores non-turn-resolution events", async () => {
  const verdicts = await turnDriverSchemaCompliance.run(undefined, context([
    parentPage(["STPLAN-1"]),
    event({ event_kind: "story_start", turn_driver: undefined })
  ]));

  assert.deepEqual(verdicts, []);
});

test("turn_driver_schema_compliance is scoped to story event and page surfaces", () => {
  assert.equal(turnDriverSchemaCompliance.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(turnDriverSchemaCompliance.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") as never })), true);
  assert.equal(turnDriverSchemaCompliance.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(turnDriverSchemaCompliance.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(turnDriverSchemaCompliance.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/events/SE-1.yaml"] })), true);
});

function records(turnDriver: Record<string, unknown> | undefined, active: string[]) {
  return [
    parentPage(active),
    event(turnDriver === undefined ? { turn_driver: undefined } : { turn_driver: turnDriver }),
    storyRecord("story_plan_record", "STPLAN-1", "plans", { holder: "STENT-1" }),
    storyRecord("story_emotion_record", "STEMO-1", "emotions", { holder: "STENT-2" }),
    storyRecord("pressure_clock_record", "CLK-1", "clocks"),
    storyRecord("thread_record", "THR-1", "threads"),
    storyRecord("story_secret_record", "STSEC-1", "secrets"),
    storyRecord("intention_record", "STINT-1", "intentions", { holder: "STENT-1" }),
    storyRecord("belief_record", "BEL-1", "beliefs", { holder: "STENT-1" })
  ];
}

function driver(kind: string, turnDriver: Record<string, unknown>, active: string[]) {
  return { kind, turnDriver: { kind, ...turnDriver }, active };
}

function parentPage(active: string[]) {
  return storyRecord("page_record", "PG-0", "pages", {
    id: "PG-0",
    story_id: "STORY-1",
    parent_page_id: null,
    state_snapshot: { active_records: activeRecords(active) }
  });
}

function event(overrides: Record<string, unknown>) {
  return storyRecord("story_event_record", "SE-1", "events", {
    id: "SE-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    parent_page_id: "PG-0",
    event_kind: "turn_resolution",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "emitted_choice", alias_bindings: {} },
    turn_driver: {
      kind: "player_action",
      initiator: "player",
      driver_records: [],
      player_response_mode: "initiates",
      pov_visibility: "perceived_directly"
    },
    state_delta: { create: [], supersede: [], close: [] },
    ...overrides
  });
}

function storyRecord(nodeType: string, id: string, subdir: string, parsed: Record<string, unknown> = {}) {
  return record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    ...parsed
  });
}

function activeRecords(ids: string[]) {
  const active: Record<string, string[]> = {};
  for (const id of ids) {
    const key = id.split("-")[0] ?? "";
    active[key] = [...(active[key] ?? []), id];
  }
  return active;
}

function patchPlan(op: string) {
  return { patches: [{ op }] };
}
