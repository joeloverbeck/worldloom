import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { ruleChoiceSetNoncollapse } from "../../src/rules/rule_choice_set_noncollapse.js";
import { context, record } from "../structural/helpers.js";

test("choice_set_noncollapse accepts CHCs that differ by target_or_action_families", async () => {
  const verdicts = await runChoiceSet([
    choice("CHC-0001", { target_or_action_families: ["move"] }),
    choice("CHC-0002", { target_or_action_families: ["communicate"] }),
    choice("CHC-0003", { target_or_action_families: ["protect"] })
  ]);

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse fails when all emitted CHCs share the four material axes", async () => {
  const verdicts = await runChoiceSet([
    choice("CHC-0001"),
    choice("CHC-0002"),
    choice("CHC-0003")
  ]);

  assert.ok(verdicts.some((verdict) => verdict.code === "choice_set_collapse"));
  assert.ok(verdicts.some((verdict) => verdict.code === "choice_set_rhetorical_unmarked"));
  assert.equal(verdicts.find((verdict) => verdict.code === "choice_set_collapse")?.severity, "fail");
});

test("choice_set_noncollapse accepts identical choices when at least two are page-plan-marked rhetorical", async () => {
  const verdicts = await runChoiceSet(
    [
      choice("CHC-0001"),
      choice("CHC-0002")
    ],
    "Rhetorical variants: CHC-0001 rhetorical; CHC-0002 expressive."
  );

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse warns when an unmarked identical pair appears beside a material choice", async () => {
  const verdicts = await runChoiceSet([
    choice("CHC-0001"),
    choice("CHC-0002"),
    choice("CHC-0003", { likely_state_pressure: "exposure and public risk" })
  ]);

  assert.deepEqual(verdicts.map((verdict) => [verdict.code, verdict.severity]), [
    ["choice_set_rhetorical_unmarked", "warn"]
  ]);
});

test("choice_set_noncollapse ignores pages with one CHC", async () => {
  const verdicts = await runChoiceSet([choice("CHC-0001")]);

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse ignores terminal pages", async () => {
  const verdicts = await runChoiceSet(
    [
      choice("CHC-0001"),
      choice("CHC-0002")
    ],
    "",
    { terminal: true }
  );

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse only applies to create_pg_record patch plans", () => {
  assert.equal(ruleChoiceSetNoncollapse.applies_to(testContext([], [])), true);
  assert.equal(
    ruleChoiceSetNoncollapse.applies_to(
      context([], {
        patch_plan: { patches: [{ op: "create_chc_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    false
  );
});

async function runChoiceSet(
  choices: Array<Record<string, unknown>>,
  planText = "",
  options: { terminal?: boolean } = {}
) {
  const page = pageRecord(
    choices.map((item) => String(item.id)),
    options
  );
  const records = [
    page,
    ...choices.map((item) =>
      record(
        "choice_record",
        `test-story:${String(item.id)}`,
        `stories/test-story/_source/choices/${String(item.id)}.yaml`,
        item
      )
    )
  ];

  return ruleChoiceSetNoncollapse.run(
    {
      files: planText
        ? [{ path: "stories/test-story/pages-prose-plans/PG-0002.md", content: planText }]
        : []
    },
    testContext(records, choices)
  );
}

function testContext(records: ReturnType<typeof record>[], choices: Array<Record<string, unknown>>) {
  return context(records, {
    story_slug: "test-story",
    patch_plan: {
      patches: [
        {
          op: "create_pg_record",
          target_world: "test",
          payload: { story_slug: "test-story", record: pageRecord(choices.map((item) => String(item.id))).parsed }
        }
      ]
    } as unknown as PatchPlanEnvelope
  });
}

function pageRecord(choiceIds: string[], options: { terminal?: boolean } = {}) {
  return record("page_record", "test-story:PG-0002", "stories/test-story/_source/pages/PG-0002.yaml", {
    id: "PG-0002",
    story_id: "STORY-001",
    branch_id: "BR-0001",
    parent_page_id: "PG-0001",
    branch_path: ["PG-0001", "PG-0002"],
    turn_index: 2,
    input: {
      choice_id: "CHC-0001",
      manual_action_text: null,
      resolved_event_id: "SE-0002"
    },
    state_hash_parent: "a".repeat(64),
    state_hash: "b".repeat(64),
    state_snapshot: {
      canon_revision: null,
      active_records: ["STENT-0001", "STLOC-0001"],
      visible_affordances: [],
      unresolved_mystery_claims: [],
      continuation: {
        terminal_status: options.terminal ? "terminal_closed" : "open",
        terminal_rationale: options.terminal ? "The branch is closed." : null
      }
    },
    plan: {
      plan_hash: "c".repeat(64)
    },
    prose_plan_path: "pages-prose-plans/PG-0002.md",
    emitted_choices: choiceIds,
    validation_trace: []
  });
}

function choice(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    story_id: "STORY-001",
    created_at_page: "PG-0002",
    supersedes: null,
    surface_label: `Choice ${id}`,
    player_visible_intent: "Act on the visible pressure.",
    target_or_action_families: ["communicate"],
    likely_state_pressure: "relationship pressure",
    associated_commitment_block: "SLT-0001",
    grounded_in: {
      records: ["STENT-0001", "STLOC-0001"],
      affordance_ordinals: []
    },
    ...overrides
  };
}
