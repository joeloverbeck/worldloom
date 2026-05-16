import assert from "node:assert/strict";
import test from "node:test";

import { canonBaselineDrift } from "../../src/structural/canon-baseline-drift.js";
import { context, record } from "./helpers.js";

test("canon_baseline_drift accepts pages already at the current canon head", async () => {
  const verdicts = await canonBaselineDrift.run(undefined, context([
    change("CH-7", ["CF-1"]),
    page("PG-2", "CH-7", ["SF-1"], "compatible after reviewing CH-7."),
    fact("SF-1", ["CF-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("canon_baseline_drift accepts drift windows with no active mirrored SF intersection", async () => {
  const verdicts = await canonBaselineDrift.run(undefined, context([
    change("CH-3", ["CF-1"]),
    change("CH-5", ["CF-2"]),
    change("CH-7", ["CF-3"]),
    page("PG-2", "CH-3", ["SF-1"], "compatible after reviewing CH-7."),
    fact("SF-1", ["CF-99"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("canon_baseline_drift rejects classifications that omit an intersecting CH", async () => {
  const verdicts = await canonBaselineDrift.run(undefined, context([
    change("CH-3", ["CF-1"]),
    change("CH-5", ["CF-2"]),
    change("CH-7", ["CF-3"]),
    page("PG-2", "CH-3", ["SF-1"], "compatible after reviewing CH-7."),
    fact("SF-1", ["CF-2"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "canon_baseline_drift_window_incomplete");
  assert.deepEqual(verdicts[0]?.detail, {
    page_id: "PG-2",
    missed_change_id: "CH-5",
    affected_fact_id: "CF-2",
    active_story_fact_id: "SF-1"
  });
});

test("canon_baseline_drift rejects drift with no recorded classification", async () => {
  const verdicts = await canonBaselineDrift.run(undefined, context([
    change("CH-3", ["CF-1"]),
    change("CH-7", ["CF-2"]),
    page("PG-2", "CH-3", ["SF-1"], undefined),
    fact("SF-1", ["CF-2"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "canon_baseline_drift_unclassified");
});

test("canon_baseline_drift rejects invalid classification values", async () => {
  const verdicts = await canonBaselineDrift.run(undefined, context([
    change("CH-3", ["CF-1"]),
    change("CH-7", ["CF-2"]),
    page("PG-2", "CH-3", ["SF-1"], "latest_only_drift after reviewing CH-7."),
    fact("SF-1", ["CF-2"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "canon_baseline_drift_classification_invalid");
});

test("canon_baseline_drift accepts event-rationale classifications", async () => {
  const verdicts = await canonBaselineDrift.run(undefined, context([
    change("CH-3", ["CF-1"]),
    change("CH-5", ["CF-2"]),
    change("CH-7", ["CF-3"]),
    event("SE-2", "requires_health_audit after reviewing CH-5 and CH-7."),
    page("PG-2", "CH-3", ["SF-1"], undefined),
    fact("SF-1", ["CF-2"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("canon_baseline_drift is scoped to full-world, create page plans, and touched page files", () => {
  assert.equal(canonBaselineDrift.applies_to(context([])), true);
  assert.equal(canonBaselineDrift.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), false);
  assert.equal(canonBaselineDrift.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), true);
  assert.equal(
    canonBaselineDrift.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/pages/PG-2.yaml"] })),
    true
  );
});

function change(id: string, affectedFactIds: string[]) {
  return record("change_log_entry", id, `_source/change-log/${id}.yaml`, {
    change_id: id,
    affected_fact_ids: affectedFactIds
  });
}

function event(id: string, worldLogicRationale: string) {
  return {
    ...record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      world_logic_rationale: worldLogicRationale
    }),
    story_slug: "test-story"
  };
}

function page(
  id: string,
  canonRevision: string,
  activeFactIds: string[],
  parentSnapshotCompatibility: string | undefined
) {
  const validation_trace: Record<string, unknown> = {};
  if (parentSnapshotCompatibility !== undefined) {
    validation_trace.parent_snapshot_compatibility = parentSnapshotCompatibility;
  }

  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      input: { resolved_event_id: "SE-2" },
      state_snapshot: {
        canon_revision: canonRevision,
        active_records: { SF: activeFactIds }
      },
      validation_trace
    }),
    story_slug: "test-story"
  };
}

function fact(id: string, derivedFrom: string[]) {
  return {
    ...record("story_fact_record", `test-story:${id}`, `stories/test-story/_source/facts/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      authority: "canon_linked",
      created_at_page: "PG-1",
      derived_from: derivedFrom
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_se_record") {
  return {
    plan_id: "plan-canon-baseline-drift",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_turn",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "PG-2" } } }]
  };
}
