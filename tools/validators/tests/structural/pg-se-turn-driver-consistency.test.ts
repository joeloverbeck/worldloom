import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { pgSeTurnDriverConsistency } from "../../src/structural/pg-se-turn-driver-consistency.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";

test("pg_se_turn_driver_consistency accepts matching page and turn-driver event records without page-plan input", async () => {
  const verdicts = await pgSeTurnDriverConsistency.run({}, context(records()));

  assert.deepEqual(verdicts, []);
});

test("pg_se_turn_driver_consistency reports a missing resolved turn event", async () => {
  const withoutEvent = records().filter((item) => (item.parsed as { id?: string }).id !== "SE-1");
  const verdicts = await pgSeTurnDriverConsistency.run({}, context(withoutEvent));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "turn_driver_resolved_event_missing");
  assert.deepEqual((verdicts[0]?.detail as { event_id?: string }).event_id, "SE-1");
});

test("pg_se_turn_driver_consistency reports page/event ownership mismatches", async () => {
  const mismatched = records({ created_at_page: "PG-2" });
  const verdicts = await pgSeTurnDriverConsistency.run({}, context(mismatched));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "turn_driver_created_at_page_mismatch");
  assert.deepEqual((verdicts[0]?.detail as { event_created_at_page?: string }).event_created_at_page, "PG-2");
});

test("pg_se_turn_driver_consistency ignores non-turn-resolution events and scopes to story record surfaces", async () => {
  const nonTurn = records({ event_kind: "story_start" });
  const verdicts = await pgSeTurnDriverConsistency.run({}, context(nonTurn));

  assert.deepEqual(verdicts, []);
  assert.equal(pgSeTurnDriverConsistency.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(pgSeTurnDriverConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") as never })), true);
  assert.equal(pgSeTurnDriverConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(pgSeTurnDriverConsistency.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(pgSeTurnDriverConsistency.applies_to(context([], { run_mode: "incremental", touched_files: [`stories/${STORY}/_source/pages/PG-1.yaml`] })), true);
  assert.equal(pgSeTurnDriverConsistency.applies_to(context([], { run_mode: "incremental", touched_files: [`stories/${STORY}/pages-prose-plans/PG-1.md`] })), false);
});

function records({
  created_at_page = "PG-1",
  event_kind = "turn_resolution"
}: {
  created_at_page?: string;
  event_kind?: string;
} = {}): IndexedRecord[] {
  return [
    page("PG-0", { active_records: { STPLAN: ["STPLAN-1"] } }),
    page("PG-1", { active_records: {} }, { resolved_event_id: "SE-1" }),
    event({ created_at_page, event_kind }),
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

function patchPlan(op: string) {
  return { patches: [{ op }] };
}
