import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { sltGroundingMinimalIntegrity } from "../../src/structural/slt-grounding-minimal-integrity.js";
import { SLT_GROUNDING_BANNED_PHRASES } from "../../src/structural/slt-grounding-utils.js";
import { context, record } from "./helpers.js";

test("slt_grounding_minimal_integrity accepts grounded reusable and runtime-jit SLTs", async () => {
  const verdicts = await sltGroundingMinimalIntegrity.run(undefined, context([
    storylet("SLT-1", {
      grounding: {
        compatible_turn_drivers: ["npc_action", "offstage_action"],
        reason_to_exist: "Covers offstage pursuit pressure from an active opposing actor."
      },
      provenance: { origin: "global_author_pool" }
    }),
    storylet("SLT-2", {
      grounding: {
        compatible_turn_drivers: ["npc_action"],
        reason_to_exist: "Varro's active plan became due and requires a POV reaction."
      },
      provenance: { origin: "runtime_jit" }
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("slt_grounding_minimal_integrity reports each prescribed failure code", async () => {
  const cases: Array<[string, Record<string, unknown>, string, Record<string, unknown>]> = [
    [
      "missing grounding",
      { grounding: undefined },
      "slt_grounding_missing",
      {}
    ],
    [
      "empty drivers",
      { grounding: { compatible_turn_drivers: [], reason_to_exist: "Covers active pressure from a plan." } },
      "slt_grounding_compatible_turn_drivers_empty",
      {}
    ],
    [
      "unknown driver",
      { grounding: { compatible_turn_drivers: ["narrative_beat"], reason_to_exist: "Covers active pressure from a plan." } },
      "slt_grounding_compatible_turn_drivers_unknown",
      { driver: "narrative_beat" }
    ],
    [
      "short reason",
      { grounding: { compatible_turn_drivers: ["npc_action"], reason_to_exist: "too short" } },
      "slt_grounding_reason_too_short",
      { length: 9 }
    ],
    [
      "generic good conflict",
      { grounding: { compatible_turn_drivers: ["npc_action"], reason_to_exist: "Good conflict from the current plan." } },
      "slt_grounding_reason_generic",
      { phrase: "good conflict" }
    ],
    [
      "generic raise stakes",
      { grounding: { compatible_turn_drivers: ["clock_fire"], reason_to_exist: "Raise stakes before the midpoint." } },
      "slt_grounding_reason_generic",
      { phrase: "raise stakes" }
    ],
    [
      "runtime jit multi-driver",
      {
        grounding: {
          compatible_turn_drivers: ["npc_action", "clock_fire"],
          reason_to_exist: "Varro's active plan became due and requires a POV reaction."
        },
        provenance: { origin: "runtime_jit" }
      },
      "slt_grounding_runtime_jit_driver_kind_singleton",
      { count: 2 }
    ]
  ];

  for (const [name, overrides, code, expectedDetail] of cases) {
    const verdicts = await sltGroundingMinimalIntegrity.run(undefined, context([storylet("SLT-1", overrides)]));
    const matching = verdicts.filter((verdict) => verdict.code === code);

    assert.equal(matching.length, 1, `${name}: ${JSON.stringify(verdicts, null, 2)}`);
    assert.equal(matching[0]?.validator, "slt_grounding_minimal_integrity");
    assert.equal(matching[0]?.severity, "fail");
    assert.equal(matching[0]?.location.node_id, "test-story:SLT-1");
    for (const [key, value] of Object.entries(expectedDetail)) {
      assert.equal((matching[0]?.detail as Record<string, unknown> | undefined)?.[key], value, `${name}: detail.${key}`);
    }
  }
});

test("slt_grounding_minimal_integrity uses the canonical banned phrase list", () => {
  assert.deepEqual(SLT_GROUNDING_BANNED_PHRASES, [
    "dramatic variety",
    "good conflict",
    "advance the plot",
    "raise stakes",
    "create tension",
    "for pacing",
    "dramatic moment",
    "story beat",
    "narrative momentum"
  ]);
});

test("slt_grounding_minimal_integrity is scoped to storylet surfaces", () => {
  assert.equal(sltGroundingMinimalIntegrity.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(
    sltGroundingMinimalIntegrity.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") as never })),
    true
  );
  assert.equal(
    sltGroundingMinimalIntegrity.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") as never })),
    false
  );
  assert.equal(
    sltGroundingMinimalIntegrity.applies_to(context([], {
      run_mode: "incremental",
      touched_files: ["stories/test-story/_source/storylets/SLT-1.yaml"]
    })),
    true
  );
  assert.equal(
    sltGroundingMinimalIntegrity.applies_to(context([], {
      run_mode: "incremental",
      touched_files: ["stories/test-story/_source/events/SE-1.yaml"]
    })),
    false
  );
});

function storylet(id: string, overrides: Record<string, unknown> = {}) {
  const parsed: Record<string, unknown> = {
    id,
    story_id: "STORY-1",
    scope: { visibility: "global_author_pool", branch_path: null },
    title: "Pressure response",
    move_family: "pressure_response",
    preconditions: { hard: [], soft: [] },
    beats: ["A grounded pressure response occurs."],
    effects: { create: [], supersede: [], close: [] },
    exit_options: [],
    saliency: { weight: 1, rationale: "Relevant pressure is active." },
    mystery_policy: { forbidden_resolutions: [] },
    provenance: { origin: "global_author_pool" },
    grounding: {
      compatible_turn_drivers: ["npc_action"],
      reason_to_exist: "Covers active pressure from a live plan record."
    },
    ...overrides
  };

  if (overrides.grounding === undefined) {
    delete parsed.grounding;
  }

  return record("storylet_record", `test-story:${id}`, `stories/test-story/_source/storylets/${id}.yaml`, parsed);
}

function patchPlan(op: string): PatchPlanEnvelope {
  return { patches: [{ op }] } as unknown as PatchPlanEnvelope;
}
