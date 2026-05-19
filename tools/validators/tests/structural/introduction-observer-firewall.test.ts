import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { introductionObserverFirewall } from "../../src/structural/introduction-observer-firewall.js";
import { context, record } from "./helpers.js";

const STORY_SLUG = "midstory-introduction-test";

test("introduction_observer_firewall accepts a choice grounded in a fresh secret the actor holds", async () => {
  const verdicts = await introductionObserverFirewall.run(undefined, testContext([
    event("SE-2", { create: ["STSEC-1"] }),
    page("PG-2", ["CHC-1"], "SE-2"),
    choice("CHC-1", ["STSEC-1"], ["STENT-1"]),
    secret("STSEC-1", ["STENT-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("introduction_observer_firewall rejects a choice grounded in a fresh secret without actor access", async () => {
  const verdicts = await introductionObserverFirewall.run(undefined, testContext([
    event("SE-2", { create: ["STSEC-1"] }),
    page("PG-2", ["CHC-99"], "SE-2"),
    choice("CHC-99", ["STSEC-1"], ["STENT-2"]),
    secret("STSEC-1", ["STENT-1"])
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "intro_observer_no_access_route");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "SE-2",
    actor: "STENT-2",
    choice_id: "CHC-99",
    fresh_record_id: "STSEC-1",
    reference_path: "grounded_in.records[0]"
  });
});

test("introduction_observer_firewall accepts a BEL access route to a fresh clock", async () => {
  const verdicts = await introductionObserverFirewall.run(undefined, testContext([
    event("SE-2", { create: ["CLK-1", "BEL-1"] }),
    page("PG-2", ["CHC-1"], "SE-2"),
    choice("CHC-1", ["CLK-1"], ["STENT-1"]),
    clock("CLK-1", { visibility: "hidden", driver: "STENT-2" }),
    belief("BEL-1", "STENT-1", ["CLK-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("introduction_observer_firewall accepts creating-event expected witnesses as explicit access", async () => {
  const verdicts = await introductionObserverFirewall.run(undefined, testContext([
    event("SE-2", { create: ["CLK-1"], expected_witnesses: ["STENT-1"] }),
    page("PG-2", ["CHC-1"], "SE-2"),
    choice("CHC-1", ["CLK-1"], ["STENT-1"]),
    clock("CLK-1", { visibility: "hidden", driver: "STENT-2" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("introduction_observer_firewall ignores choices grounded in existing records", async () => {
  const verdicts = await introductionObserverFirewall.run(undefined, testContext([
    event("SE-2", { create: [] }),
    page("PG-2", ["CHC-1"], "SE-2"),
    choice("CHC-1", ["STSEC-1"], ["STENT-2"]),
    secret("STSEC-1", ["STENT-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("introduction_observer_firewall is scoped to full-world, intro patch plans, and touched intro files", () => {
  assert.equal(introductionObserverFirewall.applies_to(testContext([])), true);
  assert.equal(
    introductionObserverFirewall.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_chc_record") })),
    true
  );
  assert.equal(
    introductionObserverFirewall.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_stsec_record") })),
    true
  );
  assert.equal(
    introductionObserverFirewall.applies_to(testContext([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") })),
    false
  );
  assert.equal(
    introductionObserverFirewall.applies_to(testContext([], {
      run_mode: "incremental",
      touched_files: ["stories/test/_source/choices/CHC-1.yaml"]
    })),
    true
  );
});

function event(
  id: string,
  overrides: Partial<{ create: string[]; actor: string; expected_witnesses: string[] }>
) {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: overrides.actor ?? "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: "Structured introduction firewall test.",
    record_introductions: introEntries(overrides.create ?? []),
    expected_witnesses: overrides.expected_witnesses ?? [],
    state_delta: { create: overrides.create ?? [], supersede: [], close: [] }
  });
}

function introEntries(ids: string[]): Record<string, unknown>[] {
  return ids
    .filter((id) => /^(?:CLK|STSEC|STQ|THR|STENT|SREL|STPLAN|STEMO)-/.test(id))
    .map((record_id) => ({
      record_id,
      class: record_id.split("-", 1)[0],
      trigger: triggerFor(record_id),
      evidence: ["SE-2"],
      distinct_from: []
    }));
}

function triggerFor(id: string): string {
  if (id.startsWith("CLK-")) return "deadline_declared";
  if (id.startsWith("STSEC-")) return "clue_carrier_enters_play";
  if (id.startsWith("STQ-")) return "explicit_question_raised";
  if (id.startsWith("THR-")) return "investigation_line_opened";
  if (id.startsWith("STENT-")) return "actor_enters_branch";
  if (id.startsWith("SREL-")) return "trust_axis_becomes_relevant";
  if (id.startsWith("STPLAN-")) return "tactical_approach_committed";
  if (id.startsWith("STEMO-")) return "event_revealed_truth_to_actor";
  throw new Error(`No introduction trigger for ${id}.`);
}

function page(id: string, emittedChoices: string[], resolvedEventId: string) {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    input: { choice_id: null, manual_action_text: null, resolved_event_id: resolvedEventId },
    emitted_choices: emittedChoices
  });
}

function choice(id: string, groundedRecords: string[], availableTo: string[]) {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    available_to: availableTo,
    grounded_in: { records: groundedRecords }
  });
}

function secret(id: string, holders: string[]) {
  return storyRecord("story_secret_record", id, "secrets", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holders,
    status: "hidden"
  });
}

function clock(id: string, overrides: Record<string, unknown>) {
  return storyRecord("pressure_clock_record", id, "clocks", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    ...overrides
  });
}

function belief(id: string, holder: string, accessRecords: string[]) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holder,
    visibility: "private",
    basis: { access_records: accessRecords }
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `${STORY_SLUG}:${id}`, `stories/${STORY_SLUG}/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: STORY_SLUG
  };
}

function testContext(records: ReturnType<typeof storyRecord>[], overrides = {}) {
  return context(records, overrides);
}

function patchPlan(op: string): PatchPlanEnvelope {
  return { patches: [{ op }] } as unknown as PatchPlanEnvelope;
}
