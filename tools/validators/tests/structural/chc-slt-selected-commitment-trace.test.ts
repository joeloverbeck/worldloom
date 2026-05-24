import assert from "node:assert/strict";
import test from "node:test";

import { chcSltSelectedCommitmentTrace } from "../../src/structural/chc-slt-selected-commitment-trace.js";
import { context, record } from "./helpers.js";

const EXISTENTIAL_CASES: Array<[string, string, string]> = [
  ["any_plan_active", "plan", "STPLAN-1"],
  ["any_emotion_active", "emotion", "STEMO-1"],
  ["any_clock_active", "clock", "CLK-1"],
  ["any_secret_unrevealed", "secret", "STSEC-1"],
  ["any_story_question_open", "question", "STQ-1"],
  ["any_belief", "belief", "BEL-1"],
  ["any_intention", "intention", "STINT-1"],
  ["any_obligation_open", "obligation", "OBL-1"],
  ["any_consequence_pending", "consequence", "CNSQ-1"],
  ["any_thread_active", "thread", "THR-1"],
  ["any_relationship_axis", "relationship", "SREL-1"]
];

test("chc_slt_selected_commitment_trace accepts exact static predicate-record grounding", async () => {
  const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage(),
    event({ state_delta: { create: [], supersede: [], close: [] } }),
    storylet("SLT-1", [{ pred: "record_active", record: "STPLAN-1" }]),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));

  assert.deepEqual(verdicts, []);
});

test("chc_slt_selected_commitment_trace accepts explicit background-only rationale", async () => {
  const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STSEC-1"]),
    childPage(),
    event({ state_delta: { create: [], supersede: [], close: [] } }),
    storylet("SLT-1", [{ pred: "secret_unrevealed", secret: "STSEC-1" }]),
    choice("CHC-1", {
      grounded_in: { records: ["STENT-1"] },
      likely_state_pressure: "The secret shapes the menu in the background. eligibility_background_only: STSEC-1."
    }),
    storyRecord("story_secret_record", "STSEC-1", "secrets")
  ])));

  assert.deepEqual(verdicts, []);
});

test("chc_slt_selected_commitment_trace fails missing static eligibility-source grounding", async () => {
  const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["CLK-1"]),
    childPage(),
    event({ state_delta: { create: [], supersede: [], close: [] } }),
    storylet("SLT-1", [{ pred: "clock_at_least", clock: "CLK-1", value: 2 }]),
    choice("CHC-1", { grounded_in: { records: ["STENT-1"] } }),
    storyRecord("pressure_clock_record", "CLK-1", "clocks")
  ])));

  const verdict = verdicts.find((item) => item.code === "chc_slt_selected_commitment_trace.missing_eligibility_source");
  assert.ok(verdict);
  assert.equal(verdict.severity, "fail");
  assert.deepEqual(verdict.detail, {
    choice_id: "CHC-1",
    selected_slt_id: "SLT-1",
    grounded_records: ["STENT-1"],
    selecting_records: ["CLK-1"]
  });
});

test("chc_slt_selected_commitment_trace warns on weak same-class grounding", async () => {
  const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage(),
    event({ state_delta: { create: [], supersede: [], close: [] } }),
    storylet("SLT-1", [{ pred: "record_active", record: "STPLAN-1" }]),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-2"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans"),
    storyRecord("story_plan_record", "STPLAN-2", "plans")
  ])));

  const verdict = verdicts.find((item) => item.code === "chc_slt_selected_commitment_trace.weak_incidental_grounding");
  assert.ok(verdict);
  assert.equal(verdict.severity, "warn");
});

test("chc_slt_selected_commitment_trace validates every existential family binding", async () => {
  for (const [pred, alias, bound] of EXISTENTIAL_CASES) {
    const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
      parentPage([bound]),
      childPage(),
      event({
        commitment: commitment({ alias_bindings: { [alias]: bound } }),
        state_delta: { create: [], supersede: [bound], close: [] }
      }),
      storylet("SLT-1", [{ pred, alias }], { effects: { create: [], supersede: [`bound:${alias}`], close: [] } }),
      choice("CHC-1", { grounded_in: { records: [bound] } }),
      typedRecord(bound)
    ])));

    assert.deepEqual(verdicts, [], pred);
  }
});

test("chc_slt_selected_commitment_trace fails wrong-class, missing, and inactive existential bindings", async () => {
  const wrongClass = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["BEL-1"]),
    childPage(),
    event({ commitment: commitment({ alias_bindings: { plan: "BEL-1" } }) }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }]),
    choice("CHC-1", { grounded_in: { records: ["BEL-1"] } }),
    storyRecord("belief_record", "BEL-1", "beliefs")
  ])));
  assert.ok(wrongClass.some((item) => item.code === "chc_slt_selected_commitment_trace.alias_binding_wrong_class"));

  const missing = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage(),
    event(),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }]),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));
  assert.ok(missing.some((item) => item.code === "chc_slt_selected_commitment_trace.alias_binding_missing"));

  const inactive = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage([]),
    childPage(),
    event({ commitment: commitment({ alias_bindings: { plan: "STPLAN-1" } }) }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }]),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));
  assert.ok(inactive.some((item) => item.code === "chc_slt_selected_commitment_trace.alias_binding_not_active"));
});

test("chc_slt_selected_commitment_trace reconciles bound and static effects with state_delta", async () => {
  const pass = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1", "BEL-1"]),
    childPage(),
    event({
      commitment: commitment({ alias_bindings: { plan: "STPLAN-1" } }),
      state_delta: { create: ["BEL-1"], supersede: ["STPLAN-1"], close: [] }
    }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }], {
      effects: { create: ["BEL-1"], supersede: ["bound:plan"], close: [] }
    }),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans"),
    storyRecord("belief_record", "BEL-1", "beliefs")
  ])));
  assert.deepEqual(pass, []);

  const missing = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage(),
    event({ commitment: commitment({ alias_bindings: { plan: "STPLAN-1" } }) }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }], {
      effects: { create: [], supersede: ["bound:plan"], close: [] }
    }),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));
  assert.ok(missing.some((item) => item.code === "chc_slt_selected_commitment_trace.effect_missing_from_state_delta"));

  const unresolved = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage(),
    event(),
    storylet("SLT-1", [{ pred: "record_active", record: "STPLAN-1" }], {
      effects: { create: [], supersede: ["bound:missing"], close: [] }
    }),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));
  assert.ok(unresolved.some((item) => item.code === "chc_slt_selected_commitment_trace.bound_effect_unresolved"));
});

test("chc_slt_selected_commitment_trace fails when input choice is not parent-emitted", async () => {
  const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"], { emitted_choices: ["CHC-1"] }),
    childPage({ input: { choice_id: "CHC-2", manual_action_text: null, resolved_event_id: "SE-1" } }),
    event({ commitment: commitment({ alias_bindings: { plan: "STPLAN-1" } }) }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }]),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    choice("CHC-2", { id: "CHC-2", grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));

  const verdict = verdicts.find((item) => item.code === "chc_slt_selected_commitment_trace.selected_choice_unresolvable");
  assert.ok(verdict);
  assert.equal(verdict.severity, "fail");
  assert.deepEqual(verdict.detail, {
    event_id: "SE-1",
    selected_slt_id: "SLT-1",
    input_choice_id: "CHC-2",
    parent_page_id: "PG-0",
    selecting_records: ["STPLAN-1"]
  });
});

test("chc_slt_selected_commitment_trace reports orphan aliases and cross-branch bindings", async () => {
  const verdicts = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    branch("BR-1", null, "PG-0"),
    branch("BR-2", "BR-1", "PG-1"),
    branch("BR-3", "BR-1", "PG-2"),
    parentPage(["STPLAN-1"]),
    page("PG-2", {
      parent_page_id: "PG-0",
      branch_id: "BR-3",
      state_snapshot: { active_records: activeRecords(["STPLAN-1"]) }
    }),
    childPage({ branch_id: "BR-2" }),
    event({ commitment: commitment({ alias_bindings: { plan: "STPLAN-1", extra: "BEL-1" } }) }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }]),
    choice("CHC-1", { grounded_in: { records: ["STPLAN-1"] } }),
    storyRecord("story_plan_record", "STPLAN-1", "plans", { created_at_page: "PG-2" }),
    storyRecord("belief_record", "BEL-1", "beliefs")
  ])));

  assert.ok(verdicts.some((item) => item.code === "chc_slt_selected_commitment_trace.orphan_alias_binding"));
  assert.ok(verdicts.some((item) => item.code === "chc_slt_selected_commitment_trace.alias_binding_cross_branch"));
});

test("chc_slt_selected_commitment_trace validates write-in events through the same path", async () => {
  const pass = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage({ input: { choice_id: null, manual_action_text: "Try a new plan.", resolved_event_id: "SE-1" } }),
    event({
      event_kind: "write_in_attempt",
      commitment: commitment({ selection_source: "runtime_jit", alias_bindings: { plan: "STPLAN-1" } }),
      state_delta: { create: [], supersede: ["STPLAN-1"], close: [] }
    }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }], {
      effects: { create: [], supersede: ["bound:plan"], close: [] }
    }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));
  assert.deepEqual(pass, []);

  const fail = await chcSltSelectedCommitmentTrace.run(undefined, context(records([
    parentPage(["STPLAN-1"]),
    childPage({ input: { choice_id: null, manual_action_text: "Try a new plan.", resolved_event_id: "SE-1" } }),
    event({
      event_kind: "write_in_attempt",
      commitment: commitment({ selection_source: "runtime_jit", alias_bindings: { plan: "STPLAN-1" } })
    }),
    storylet("SLT-1", [{ pred: "any_plan_active", alias: "plan" }], {
      effects: { create: [], supersede: ["bound:plan"], close: [] }
    }),
    storyRecord("story_plan_record", "STPLAN-1", "plans")
  ])));
  assert.ok(fail.some((item) => item.code === "chc_slt_selected_commitment_trace.effect_missing_from_state_delta"));
});

test("chc_slt_selected_commitment_trace is scoped to story page, CHC, SLT, and SE surfaces", () => {
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_chc_record") as never })), true);
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") as never })), true);
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") as never })), true);
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(chcSltSelectedCommitmentTrace.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/events/SE-1.yaml"] })), true);
});

function records(items: IndexedRecordLike[]) {
  return items.map((item) => item as ReturnType<typeof record>);
}

type IndexedRecordLike = ReturnType<typeof record>;

function parentPage(active: string[], overrides: Record<string, unknown> = {}) {
  return page("PG-0", {
    parent_page_id: null,
    branch_id: "BR-1",
    state_snapshot: { active_records: activeRecords(active) },
    emitted_choices: ["CHC-1"],
    ...overrides
  });
}

function childPage(overrides: Record<string, unknown> = {}) {
  return page("PG-1", {
    parent_page_id: "PG-0",
    branch_id: "BR-1",
    input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: "SE-1" },
    state_snapshot: { active_records: {} },
    emitted_choices: [],
    ...overrides
  });
}

function page(id: string, overrides: Record<string, unknown>) {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: [id],
    turn_index: id === "PG-0" ? 0 : 1,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-0" },
    state_snapshot: { active_records: {} },
    emitted_choices: [],
    ...overrides
  });
}

function event(overrides: Record<string, unknown> = {}) {
  return storyRecord("story_event_record", "SE-1", "events", {
    id: "SE-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    parent_page_id: "PG-0",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: commitment(),
    state_delta: { create: [], supersede: [], close: [] },
    ...overrides
  });
}

function commitment(overrides: Record<string, unknown> = {}) {
  return {
    selected_slt_id: "SLT-1",
    selection_source: "emitted_choice",
    alias_bindings: {},
    ...overrides
  };
}

function storylet(id: string, hardPreconditions: unknown[], overrides: Record<string, unknown> = {}) {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-1",
    preconditions: { hard: hardPreconditions, soft: [] },
    effects: { create: [], supersede: [], close: [] },
    grounding: {
      compatible_turn_drivers: ["npc_action"],
      reason_to_exist: "Exercises commitment trace grounding through active predicates."
    },
    ...overrides
  });
}

function choice(id: string, overrides: Record<string, unknown>) {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-0",
    surface_label: "Test choice",
    player_visible_intent: "Test the branch.",
    target_or_action_families: ["investigate"],
    likely_state_pressure: "The choice pressure is visible.",
    grounded_in: { records: ["STENT-1"] },
    ...overrides
  });
}

function branch(id: string, parent: string | null, rootPage: string) {
  return storyRecord("branch_record", id, "branches", {
    id,
    story_id: "STORY-1",
    parent_branch_id: parent,
    root_page_id: rootPage
  });
}

function typedRecord(id: string) {
  const typeByClass: Record<string, [string, string]> = {
    STPLAN: ["story_plan_record", "plans"],
    STEMO: ["story_emotion_record", "emotions"],
    CLK: ["pressure_clock_record", "clocks"],
    STSEC: ["story_secret_record", "secrets"],
    STQ: ["story_question_record", "questions"],
    BEL: ["belief_record", "beliefs"],
    STINT: ["intention_record", "intentions"],
    OBL: ["obligation_record", "obligations"],
    CNSQ: ["consequence_record", "consequences"],
    THR: ["thread_record", "threads"],
    SREL: ["relationship_record_story", "relationships"]
  };
  const [nodeType, sourceDir] = typeByClass[id.split("-")[0] ?? ""] ?? ["story_fact_record", "facts"];
  return storyRecord(nodeType, id, sourceDir);
}

function storyRecord(nodeType: string, id: string, sourceDir: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function activeRecords(ids: string[]) {
  const result: Record<string, string[]> = {};
  for (const id of ids) {
    const cls = id.split("-")[0] ?? "";
    result[cls] = [...(result[cls] ?? []), id];
  }
  return result;
}

function patchPlan(op: string) {
  return {
    plan_id: "plan-chc-slt-selected-commitment-trace",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
