import assert from "node:assert/strict";
import test from "node:test";

import { branchIsolation } from "../../src/structural/branch-isolation.js";
import { context, record } from "./helpers.js";

test("branch_isolation accepts ancestor and bundle-genesis active records", async () => {
  const verdicts = await branchIsolation.run(undefined, context([
    branch("BR-1", null, "PG-1"),
    branch("BR-2", "BR-1"),
    page("PG-1", "BR-1", { active_records: {} }),
    page("PG-2", "BR-2", { active_records: { SF: ["SF-1", "SF-2"] } }),
    fact("SF-1", "PG-1"),
    fact("SF-2", "PG-2")
  ]));

  assert.deepEqual(verdicts, []);
});

test("branch_isolation rejects sibling-branch active records", async () => {
  const verdicts = await branchIsolation.run(undefined, context([
    branch("BR-1", null),
    branch("BR-2", "BR-1"),
    branch("BR-3", "BR-1"),
    page("PG-1", "BR-1", { active_records: {} }),
    page("PG-2", "BR-2", { active_records: { SF: ["SF-3"] } }),
    page("PG-3", "BR-3", { active_records: { SF: ["SF-3"] } }),
    fact("SF-3", "PG-3")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "branch_isolation_violation");
  assert.deepEqual(verdicts[0]?.detail, {
    page_id: "PG-2",
    reference_id: "SF-3",
    reference_path: "state_snapshot.active_records.SF[0]",
    sibling_branch_id: "BR-3"
  });
});

test("branch_isolation accepts global storylets with world-scope and bundle-genesis references", async () => {
  const verdicts = await branchIsolation.run(undefined, context([
    branch("BR-1", null, "PG-1"),
    page("PG-1", "BR-1", { active_records: {} }),
    fact("SF-1", "PG-1"),
    storylet("SLT-1", {
      preconditions: { hard: ["record_active(SF-1)", "canon_fact(CF-1)"], soft: [] },
      effects: { create: ["ENT-1"], supersede: [], close: [] },
      exit_options: [{ likely_effects: ["CHAR-1"] }]
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("branch_isolation allows global author-pool reference to unpadded bundle-genesis record", async () => {
  const verdicts = await branchIsolation.run(undefined, context([
    branch("BR-1", null, "PG-1"),
    page("PG-1", "BR-1", { active_records: {} }, null, 0),
    belief("BEL-1", "PG-1"),
    storylet("SLT-1", {
      preconditions: { hard: ["record_active(BEL-1)"], soft: [] },
      effects: { create: [], supersede: [], close: [] },
      exit_options: []
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("branch_isolation rejects global storylets with branch-local static references", async () => {
  const verdicts = await branchIsolation.run(undefined, context([
    branch("BR-1", null),
    branch("BR-2", "BR-1"),
    page("PG-1", "BR-1", { active_records: {} }),
    page("PG-2", "BR-2", { active_records: {} }),
    fact("SF-2", "PG-2"),
    storylet("SLT-1", {
      preconditions: { hard: ["record_active(SF-2)"], soft: [] },
      effects: { create: [], supersede: [], close: [] },
      exit_options: []
    })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "global_storylet_references_branch_local");
  assert.deepEqual(verdicts[0]?.detail, {
    storylet_id: "SLT-1",
    reference_id: "SF-2",
    reference_path: "preconditions.hard[0]",
    owning_branch_id: "BR-2"
  });
});

test("branch_isolation accepts global storylets with existential and bound aliases", async () => {
  const verdicts = await branchIsolation.run(undefined, context([
    storylet("SLT-1", {
      preconditions: { hard: ["any_belief(belief_alias, holder:protagonist)"], soft: [] },
      effects: { create: ["bound:belief_alias"], supersede: [], close: [] },
      exit_options: [{ likely_effects: ["bound:belief_alias"] }]
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("branch_isolation is scoped to full-world, create page/storylet plans, and touched page/storylet files", () => {
  assert.equal(branchIsolation.applies_to(context([])), true);
  assert.equal(branchIsolation.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), false);
  assert.equal(branchIsolation.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), true);
  assert.equal(branchIsolation.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") })), true);
  assert.equal(
    branchIsolation.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test/_source/storylets/SLT-1.yaml"] })),
    true
  );
});

function branch(id: string, parentBranchId: string | null, rootPageId?: string) {
  return storyRecord("branch_record", id, "branches", {
    id,
    story_id: "STORY-1",
    parent_branch_id: parentBranchId,
    ...(rootPageId === undefined ? {} : { root_page_id: rootPageId })
  });
}

function page(
  id: string,
  branchId: string,
  stateSnapshot: Record<string, unknown>,
  parentPageId?: string | null,
  turnIndex?: number
) {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    branch_id: branchId,
    state_snapshot: stateSnapshot,
    ...(parentPageId === undefined ? {} : { parent_page_id: parentPageId }),
    ...(turnIndex === undefined ? {} : { turn_index: turnIndex })
  });
}

function fact(id: string, createdAtPage: string) {
  return storyRecord("story_fact_record", id, "facts", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage,
    authority: "branch_local",
    derived_from: []
  });
}

function belief(id: string, createdAtPage: string) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage
  });
}

function storylet(id: string, overrides: Record<string, unknown>) {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-1",
    scope: { visibility: "global_author_pool" },
    ...overrides
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
    plan_id: "plan-branch-isolation",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "PG-1" } } }]
  };
}
