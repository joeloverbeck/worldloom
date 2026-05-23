import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { pagePlanTurnDriverConsistency } from "../../src/structural/page-plan-turn-driver-consistency.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;

test("page_plan_turn_driver_consistency accepts matching turn-driver section with required pressure table", async () => {
  const verdicts = await pagePlanTurnDriverConsistency.run(input(plan({ table: true })), context(records({ active: ["STPLAN-1"] })));

  assert.deepEqual(verdicts, []);
});

test("page_plan_turn_driver_consistency accepts absent active-pressure table when parent has no high-urgency records", async () => {
  const verdicts = await pagePlanTurnDriverConsistency.run(input(plan({ table: false })), context(records({ active: [] })));

  assert.deepEqual(verdicts, []);
});

test("page_plan_turn_driver_consistency reports a missing section", async () => {
  const verdicts = await pagePlanTurnDriverConsistency.run(input("## 7. State snapshot\n\nNo driver section."), context(records({ active: [] })));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_driver_section_missing");
  assert.equal(verdicts[0]?.location.file, PLAN_PATH);
});

test("page_plan_turn_driver_consistency reports driver kind mismatches", async () => {
  const verdicts = await pagePlanTurnDriverConsistency.run(input(plan({ driverKind: "world_pressure", table: true })), context(records({ active: ["STPLAN-1"] })));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_driver_kind_mismatch");
});

test("page_plan_turn_driver_consistency reports omitted driver records", async () => {
  const verdicts = await pagePlanTurnDriverConsistency.run(input(plan({ driverRecords: "STEMO-1", table: true })), context(records({ active: ["STPLAN-1"] })));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_driver_record_omitted");
  assert.deepEqual((verdicts[0]?.detail as { driver_record?: string }).driver_record, "STPLAN-1");
});

test("page_plan_turn_driver_consistency reports missing active-pressure tables", async () => {
  const verdicts = await pagePlanTurnDriverConsistency.run(input(plan({ table: false })), context(records({ active: ["STPLAN-1"] })));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_active_pressure_table_missing");
});

test("page_plan_turn_driver_consistency ignores non-turn-resolution events and scopes to story driver surfaces", async () => {
  const nonTurn = records({ active: [], event_kind: "story_start" });
  const verdicts = await pagePlanTurnDriverConsistency.run(input(""), context(nonTurn));

  assert.deepEqual(verdicts, []);
  assert.equal(pagePlanTurnDriverConsistency.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(pagePlanTurnDriverConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") as never })), true);
  assert.equal(pagePlanTurnDriverConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(pagePlanTurnDriverConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(pagePlanTurnDriverConsistency.applies_to(context([], { run_mode: "incremental", touched_files: [`stories/${STORY}/pages-prose-plans/PG-1.md`] })), true);
});

function input(content: string) {
  return { files: [{ path: PLAN_PATH, content }] };
}

function plan({
  driverKind = "npc_action",
  driverRecords = "STPLAN-1",
  table = true
}: {
  driverKind?: string;
  driverRecords?: string;
  table?: boolean;
}) {
  return `## 7a. Turn driver / initiative trace

- Driver kind: ${driverKind}
- Initiator: STENT-1
- Driver records: ${driverRecords}
- Player response mode: responds
- POV visibility: perceived_directly
- Observer-firewall note: Jon sees the shot line.

${table ? `Active-pressure disposition

| Record | Disposition | Reason / expiry |
|---|---|---|
| STPLAN-1 | selected | became this turn's driver |
` : ""}`;
}

function records({
  active,
  event_kind = "turn_resolution"
}: {
  active: string[];
  event_kind?: string;
}): IndexedRecord[] {
  return [
    page("PG-0", { active_records: activeRecords(active) }),
    page("PG-1", { active_records: {} }, { resolved_event_id: "SE-1" }),
    event({ event_kind }),
    storyRecord("story_plan_record", "STPLAN-1", "plans", {
      plan_status: "active",
      current_step: { action_family: "harm", target_records: ["STENT-2"], success_condition: { predicates: [] } }
    })
  ];
}

function page(id: string, snapshot: Record<string, unknown>, inputFields: Record<string, unknown> = {}) {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    input: { resolved_event_id: null, ...inputFields },
    state_snapshot: snapshot
  });
}

function event(overrides: Record<string, unknown>) {
  return storyRecord("story_event_record", "SE-1", "events", {
    id: "SE-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    parent_page_id: "PG-0",
    event_kind: "turn_resolution",
    turn_driver: {
      kind: "npc_action",
      initiator: "STENT-1",
      driver_records: ["STPLAN-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    },
    ...overrides
  });
}

function storyRecord(nodeType: string, id: string, subdir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `${STORY}:${id}`, `stories/${STORY}/_source/${subdir}/${id}.yaml`, parsed),
    story_slug: STORY
  };
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
