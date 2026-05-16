import assert from "node:assert/strict";
import test from "node:test";

import { causalDependencyThreatScan } from "../../src/structural/causal-dependency-threat-scan.js";
import { context, record } from "./helpers.js";

test("causal_dependency_threat_scan_rejects_choice_dependency_clobbered", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { close: ["STOBJ-1"] }),
    page("PG-2", ["CHC-1"], ["CHC-1"]),
    choice("CHC-1", ["STOBJ-1"]),
    objectRecord("STOBJ-1")
  ]));

  assert.equal(verdicts.length, 2);
  assert.ok(verdicts.some((verdict) => verdict.code === "choice_dependency_clobbered"));
  assert.ok(verdicts.some((verdict) => verdict.code === "affordance_dependency_clobbered"));
});

test("causal_dependency_threat_scan_accepts_clobbered_dependency_when_choice_also_closed", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { close: ["STOBJ-1", "CHC-1"] }),
    page("PG-2", [], []),
    choice("CHC-1", ["STOBJ-1"]),
    objectRecord("STOBJ-1")
  ]));

  assert.deepEqual(verdicts, []);
});

test("causal_dependency_threat_scan_rejects_affordance_dependency_clobbered", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { supersede: ["STLOC-1"] }),
    page("PG-2", [], [], [{ ordinal: 0, grounded_in: ["STLOC-1"] }]),
    locationRecord("STLOC-1"),
    locationRecord("STLOC-2", { supersedes: "STLOC-1" })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "affordance_dependency_clobbered");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-1",
    dependency_id: "STLOC-1",
    source: "visible_affordances[0]"
  });
});

test("causal_dependency_threat_scan_accepts_affordance_when_destination_provided", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { supersede: ["STLOC-1"] }),
    page("PG-2", [], [], [{ ordinal: 0, grounded_in: ["STLOC-2"] }], { STLOC: ["STLOC-2"] }),
    locationRecord("STLOC-1"),
    locationRecord("STLOC-2", { supersedes: "STLOC-1" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("causal_dependency_threat_scan_rejects_obligation_counterparty_unavailable_without_transfer", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { supersede: ["STSTAT-1"] }),
    page("PG-2", [], [], [], { OBL: ["OBL-1"] }),
    obligation("OBL-1", "STENT-2", "STENT-1"),
    status("STSTAT-1", "STENT-1"),
    status("STSTAT-2", "STENT-1", { supersedes: "STSTAT-1", life: "dead", agency: "dead" })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "obligation_counterparty_unavailable_without_transfer");
});

test("causal_dependency_threat_scan_accepts_obligation_transferred", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { create: ["OBL-2"], supersede: ["STSTAT-1"], close: ["OBL-1"] }),
    page("PG-2", [], [], [], { OBL: ["OBL-2"] }),
    obligation("OBL-1", "STENT-2", "STENT-1"),
    obligation("OBL-2", "STENT-2", "STENT-3"),
    status("STSTAT-1", "STENT-1"),
    status("STSTAT-2", "STENT-1", { supersedes: "STSTAT-1", life: "dead", agency: "dead" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("causal_dependency_threat_scan_warns_slt_precondition_clobbered", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { close: ["STLOC-1"] }),
    page("PG-2", [], []),
    obligation("OBL-1", "STENT-1", "STENT-2", "high"),
    locationRecord("STLOC-1"),
    storylet("SLT-1", [{ record_active: "STLOC-1" }, { record_active: "OBL-1" }], "high")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "slt_precondition_clobbered");
  assert.equal(verdicts[0]?.severity, "fail");
});

test("causal_dependency_threat_scan_accepts_slt_precondition_clobbered_when_replacement_emitted", async () => {
  const verdicts = await causalDependencyThreatScan.run(undefined, context([
    event("SE-1", { create: ["SLT-2"], close: ["STLOC-1"] }),
    page("PG-2", [], []),
    obligation("OBL-1", "STENT-1", "STENT-2", "high"),
    locationRecord("STLOC-1"),
    storylet("SLT-1", [{ record_active: "STLOC-1" }, { record_active: "OBL-1" }], "high"),
    storylet("SLT-2", [{ record_active: "OBL-2" }], "high")
  ]));

  assert.deepEqual(verdicts, []);
});

test("causal_dependency_threat_scan is scoped to full-world, relevant patch plans, and touched story files", () => {
  assert.equal(causalDependencyThreatScan.applies_to(context([])), true);
  assert.equal(causalDependencyThreatScan.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), true);
  assert.equal(causalDependencyThreatScan.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), true);
  assert.equal(causalDependencyThreatScan.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_chc_record") })), true);
  assert.equal(causalDependencyThreatScan.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") })), true);
  assert.equal(causalDependencyThreatScan.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })), false);
  assert.equal(
    causalDependencyThreatScan.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test/_source/pages/PG-1.yaml"] })),
    true
  );
});

function event(id: string, delta: Partial<{ create: string[]; supersede: string[]; close: string[] }>) {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "emitted_choice", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: "test event",
    state_delta: {
      create: delta.create ?? [],
      supersede: delta.supersede ?? [],
      close: delta.close ?? []
    }
  });
}

function page(
  id: string,
  emittedChoices: string[],
  activeChoices: string[],
  visibleAffordances: Array<Record<string, unknown>> = [],
  activeRecords: Record<string, string[]> = {}
) {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: "SE-1" },
    emitted_choices: emittedChoices,
    state_snapshot: {
      active_records: { CHC: activeChoices, ...activeRecords },
      visible_affordances: visibleAffordances
    }
  });
}

function choice(id: string, groundedRecords: string[]) {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    grounded_in: { records: groundedRecords }
  });
}

function objectRecord(id: string) {
  return storyRecord("story_object_record", id, "objects", {
    id,
    story_id: "STORY-1"
  });
}

function locationRecord(id: string, overrides: Record<string, unknown> = {}) {
  return storyRecord("story_location_record", id, "locations", {
    id,
    story_id: "STORY-1",
    ...overrides
  });
}

function obligation(id: string, owedBy: string, owedTo: string, urgency = "medium") {
  return storyRecord("obligation_record", id, "obligations", {
    id,
    story_id: "STORY-1",
    status: "open",
    owed_by: owedBy,
    owed_to: owedTo,
    urgency
  });
}

function status(id: string, entity: string, overrides: Record<string, unknown> = {}) {
  return storyRecord("story_status_record", id, "status", {
    id,
    story_id: "STORY-1",
    entity,
    life: "alive",
    agency: "free",
    location: "STLOC-1",
    ...overrides
  });
}

function storylet(id: string, hardPreconditions: unknown[], urgency: string) {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-1",
    scope: { visibility: "global_author_pool", branch_id: null },
    preconditions: { hard: hardPreconditions },
    saliency: { urgency }
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, id, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_se_record" | "create_pg_record" | "create_chc_record" | "create_slt_record" | "create_cf_record"): any {
  return {
    plan_id: "plan-causal-dependency-threat-scan",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
