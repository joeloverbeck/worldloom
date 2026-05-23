import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { activePressureHandlingDiscipline } from "../../src/structural/active-pressure-handling-discipline.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;
const HIGH_IDS = ["STPLAN-1", "STEMO-1", "CLK-1", "THR-1", "STSEC-1", "STQ-1", "OBL-1", "CNSQ-1"];

test("active_pressure_handling_discipline accepts all high-urgency records with valid dispositions", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan(rows({
      "STPLAN-1": ["selected", "became this turn's driver"],
      "STEMO-1": ["deferred", "until PG-2"],
      "CLK-1": ["rejected", "clock pressure already manifested"],
      "THR-1": ["selected", "thread led the event"],
      "STSEC-1": ["deferred", "when Jon reaches the archive"],
      "STQ-1": ["rejected", "question not visible to POV"],
      "OBL-1": ["deferred", "if Mara survives"],
      "CNSQ-1": ["selected", "consequence frames the response"]
    }))),
    context(records({ active: HIGH_IDS }))
  );

  assert.deepEqual(verdicts, []);
});

test("active_pressure_handling_discipline ignores absent tables when the parent page has no high-urgency records", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan("")),
    context(records({ active: [] }))
  );

  assert.deepEqual(verdicts, []);
});

test("active_pressure_handling_discipline reports each unhandled high-urgency record class", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan("")),
    context(records({ active: HIGH_IDS }))
  );

  assert.deepEqual(
    verdicts.map((verdict) => verdict.code),
    HIGH_IDS.map(() => "high_urgency_active_record_unhandled")
  );
  assert.deepEqual(
    verdicts.map((verdict) => (verdict.detail as { record_id?: string }).record_id),
    HIGH_IDS
  );
});

test("active_pressure_handling_discipline reports rejected rows without reasons", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan(rows({ "STPLAN-1": ["rejected", ""] }))),
    context(records({ active: ["STPLAN-1"] }))
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "active_pressure_rejection_reason_missing");
});

test("active_pressure_handling_discipline reports deferred rows without expiries", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan(rows({ "STPLAN-1": ["deferred", "needs more thought"] }))),
    context(records({ active: ["STPLAN-1"] }))
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "active_pressure_deferred_without_expiry");
});

test("active_pressure_handling_discipline reports unknown dispositions", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan(rows({ "STPLAN-1": ["postponed", "until PG-2"] }))),
    context(records({ active: ["STPLAN-1"] }))
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "active_pressure_disposition_unknown");
});

test("active_pressure_handling_discipline ignores non-turn-resolution events and scopes to story pressure surfaces", async () => {
  const verdicts = await activePressureHandlingDiscipline.run(
    input(plan("")),
    context(records({ active: ["STPLAN-1"], event_kind: "story_start" }))
  );

  assert.deepEqual(verdicts, []);
  assert.equal(activePressureHandlingDiscipline.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(activePressureHandlingDiscipline.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(activePressureHandlingDiscipline.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(activePressureHandlingDiscipline.applies_to(context([], { run_mode: "incremental", touched_files: [`stories/${STORY}/pages-prose-plans/PG-1.md`] })), true);
  assert.equal(activePressureHandlingDiscipline.applies_to(context([], { run_mode: "incremental", touched_files: [`stories/${STORY}/_source/plans/STPLAN-1.yaml`] })), true);
});

function input(content: string) {
  return { files: [{ path: PLAN_PATH, content }] };
}

function plan(tableRows: string) {
  return `## 7a. Turn driver / initiative trace

- Driver kind: npc_action
- Initiator: STENT-1
- Driver records: STPLAN-1
- Player response mode: responds
- POV visibility: perceived_directly
- Observer-firewall note: Jon sees the shot line.

Active-pressure disposition

| Record | Disposition | Reason / expiry |
|---|---|---|
${tableRows}`;
}

function rows(entries: Record<string, [string, string]>) {
  return Object.entries(entries)
    .map(([id, [disposition, reason]]) => `| ${id} | ${disposition} | ${reason} |`)
    .join("\n");
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
    }),
    storyRecord("story_emotion_record", "STEMO-1", "emotions", {
      intensity: "high",
      behavioral_pressure: ["attack"]
    }),
    storyRecord("story_pressure_clock_record", "CLK-1", "pressure-clocks", {
      status: "active",
      value: 3,
      thresholds: [{ at: 3 }]
    }),
    storyRecord("story_thread_record", "THR-1", "threads", {
      status: "active",
      urgency: "high"
    }),
    storyRecord("story_secret_record", "STSEC-1", "secrets", {
      status: "partially_revealed"
    }),
    storyRecord("story_question_record", "STQ-1", "questions", {
      status: "complicated",
      payoff_due: "true"
    }),
    storyRecord("story_obligation_record", "OBL-1", "obligations", {
      status: "open",
      urgency: "high"
    }),
    storyRecord("story_consequence_record", "CNSQ-1", "consequences", {
      status: "pending",
      urgency: "high"
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
    ...overrides
  });
}

function storyRecord(nodeType: string, id: string, subdir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `${STORY}:${id}`, `stories/${STORY}/_source/${subdir}/${id}.yaml`, { id, story_id: "STORY-1", ...parsed }),
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
