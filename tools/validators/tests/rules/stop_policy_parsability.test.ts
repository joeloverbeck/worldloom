import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import {
  INTERRUPT_BEFORE_STOP_PREDICATES,
  NORMAL_EXIT_STOP_PREDICATES
} from "../../src/rules/_shared/predicate-dsl-grammar.js";
import { stopPolicyParsability } from "../../src/rules/stop_policy_parsability.js";
import { context, record } from "../structural/helpers.js";

test("stop_policy_parsability accepts all documented stop predicates", async () => {
  const parsed = completeStorylet();
  parsed.stop_policy = {
    normal_exits: NORMAL_EXIT_STOP_PREDICATES.map((predicate) => ({
      id: predicate,
      predicate,
      args: argsFor(predicate)
    })),
    interrupt_before: INTERRUPT_BEFORE_STOP_PREDICATES.map((predicate) => ({
      id: predicate,
      predicate,
      args: argsFor(predicate)
    })),
    safety_valves: { max_internal_beats: 5, max_words: 1800 }
  };

  const result = await stopPolicyParsability.run({}, context([storyletRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("stop_policy_parsability rejects unknown predicates", async () => {
  const parsed = completeStorylet();
  const stopPolicy = parsed.stop_policy as Record<string, unknown>;
  stopPolicy.normal_exits = [{ id: "unknown", predicate: "unknown_predicate", args: {} }];

  const result = await stopPolicyParsability.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => verdict.code === "stop_policy_parsability.unknown_predicate"));
});

test("stop_policy_parsability rejects malformed args", async () => {
  const parsed = completeStorylet();
  const stopPolicy = parsed.stop_policy as Record<string, unknown>;
  stopPolicy.normal_exits = [{ id: "demand", predicate: "npc_makes_demand", args: {} }];

  const result = await stopPolicyParsability.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "stop_policy_parsability.invalid_args" &&
    verdict.message.includes("args.npc")
  )));
});

function argsFor(predicate: string): Record<string, unknown> {
  switch (predicate) {
    case "commitment_satisfied":
    case "commitment_blocked":
    case "commitment_overturned":
    case "selected_commitment_would_be_violated":
      return { commitment_class: "offer_practical_help" };
    case "npc_makes_demand":
    case "npc_makes_disclosure":
      return { npc: "STENT-0001" };
    case "participant_exits":
      return { participant: "STENT-0002" };
    case "scene_goal_resolves":
    case "scene_goal_changes":
    case "protagonist_goal_change_required":
      return { goal: "repair_gate" };
    case "new_obligation_created":
      return { obligation_type: "repair_debt" };
    case "open_thread_reprioritized":
      return { thread_id: "THR-0001" };
    case "time_or_location_changes":
      return { change_kind: "location" };
    case "irreversible_cost_imminent":
      return { cost_axis: "relationship" };
    case "forbidden_mystery_resolution_risk":
      return { mystery_id: "M-0001" };
    case "user_write_in_conflicts_with_envelope":
      return { envelope_field: "prohibited_actions" };
    case "only_next_action_would_create_major_state_change":
      return { state_axis: "obligation_state" };
    default:
      return {};
  }
}

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"), {
    schema: yaml.JSON_SCHEMA
  }) as Record<string, unknown>;
}

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-0001")) {
  return record("storylet_record", id, `stories/red-bunny/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}
