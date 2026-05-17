import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { ruleChcGroundedInArtifactAccessible } from "../../src/rules/rule_chc_grounded_in_artifact_accessible.js";
import { context, record } from "../structural/helpers.js";

test("chc_grounded_in_artifact_accessible accepts CHC grounding in an active DA", async () => {
  const verdicts = await runChcDaAccess({
    activeChoices: ["CHC-1"],
    activeArtifacts: ["DA-1"],
    choices: [choice("CHC-1", ["DA-1"])]
  });

  assert.deepEqual(verdicts, []);
});

test("chc_grounded_in_artifact_accessible fails when CHC grounds in inactive DA", async () => {
  const verdicts = await runChcDaAccess({
    activeChoices: ["CHC-1"],
    activeArtifacts: [],
    choices: [choice("CHC-1", ["DA-1"])]
  });

  const verdict = verdicts.find((item) => item.code === "chc_grounded_in_da_not_active");
  assert.equal(verdict?.severity, "fail");
  assert.match(verdict?.message ?? "", /CHC-1 grounds in DA-1/);
  assert.deepEqual(verdict?.detail, {
    page_id: "PG-2",
    choice_id: "CHC-1",
    da_id: "DA-1",
    reference_path: "grounded_in.records[0]"
  });
});

test("chc_grounded_in_artifact_accessible fails when CHC grounds in superseded inactive DA", async () => {
  const verdicts = await runChcDaAccess({
    activeChoices: ["CHC-1"],
    activeArtifacts: ["DA-2"],
    choices: [choice("CHC-1", ["DA-1"])],
    artifacts: [
      artifact("DA-1", { supersedes: null }),
      artifact("DA-2", { supersedes: "DA-1" })
    ]
  });

  assert.ok(verdicts.some((verdict) => verdict.code === "chc_grounded_in_da_not_active"));
});

test("chc_grounded_in_artifact_accessible ignores CHCs with no DA grounding", async () => {
  const verdicts = await runChcDaAccess({
    activeChoices: ["CHC-1"],
    activeArtifacts: [],
    choices: [choice("CHC-1", ["BEL-1", "SF-1"])]
  });

  assert.deepEqual(verdicts, []);
});

test("chc_grounded_in_artifact_accessible applies to full-world, incremental, and story pre-apply runs", () => {
  assert.equal(ruleChcGroundedInArtifactAccessible.applies_to(context([])), true);
  assert.equal(
    ruleChcGroundedInArtifactAccessible.applies_to(
      context([], {
        run_mode: "incremental",
        touched_files: ["stories/test-story/_source/choices/CHC-1.yaml"]
      })
    ),
    true
  );
  assert.equal(
    ruleChcGroundedInArtifactAccessible.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: { patches: [{ op: "create_pg_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    true
  );
  assert.equal(
    ruleChcGroundedInArtifactAccessible.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: { patches: [{ op: "create_slt_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    false
  );
});

interface FixtureOptions {
  activeChoices: string[];
  activeArtifacts: string[];
  choices: Array<Record<string, unknown>>;
  artifacts?: Array<Record<string, unknown>>;
}

async function runChcDaAccess(options: FixtureOptions) {
  const records = [
    page("PG-2", options.activeChoices, options.activeArtifacts),
    ...options.choices.map((item) =>
      record(
        "choice_record",
        `test-story:${String(item.id)}`,
        `stories/test-story/_source/choices/${String(item.id)}.yaml`,
        item
      )
    ),
    ...(options.artifacts ?? options.activeArtifacts.map((id) => artifact(id))).map((item) =>
      record(
        "story_diegetic_artifact_record",
        `test-story:${String(item.id)}`,
        `stories/test-story/_source/artifacts/${String(item.id)}.yaml`,
        item
      )
    )
  ];

  return ruleChcGroundedInArtifactAccessible.run(null, context(records, { story_slug: "test-story" }));
}

function page(id: string, activeChoices: string[], activeArtifacts: string[]) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", id],
    turn_index: 2,
    state_snapshot: {
      active_records: {
        CHC: activeChoices,
        DA: activeArtifacts
      }
    }
  });
}

function choice(id: string, groundedRecords: string[]) {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    supersedes: null,
    surface_label: `Choice ${id}`,
    player_visible_intent: "Use the available record.",
    target_or_action_families: ["investigate"],
    likely_state_pressure: "information pressure",
    associated_commitment_block: "SLT-1",
    grounded_in: {
      records: groundedRecords,
      affordance_ordinals: []
    }
  };
}

function artifact(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    supersedes: null,
    title: "Letter",
    author: "Rell",
    genre: "private letter",
    body: "Meet me at the lower gate.",
    intended_audience: "Mira",
    circulation: "private",
    truth_relation: "contested",
    derived_from: [],
    ...overrides
  };
}
