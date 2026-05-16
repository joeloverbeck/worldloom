import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { ruleChoiceSetNoncollapse } from "../../src/rules/rule_choice_set_noncollapse.js";
import { context, record } from "../structural/helpers.js";

test("choice_set_noncollapse accepts CHCs that differ by target_or_action_families", async () => {
  const verdicts = await runChoiceSet([
    choice("CHC-1", { target_or_action_families: ["move"] }),
    choice("CHC-2", { target_or_action_families: ["communicate"] }),
    choice("CHC-3", { target_or_action_families: ["protect"] })
  ]);

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse fails when all emitted CHCs share the four material axes", async () => {
  const verdicts = await runChoiceSet([
    choice("CHC-1"),
    choice("CHC-2"),
    choice("CHC-3")
  ]);

  assert.ok(verdicts.some((verdict) => verdict.code === "choice_set_collapse"));
  assert.ok(verdicts.some((verdict) => verdict.code === "choice_set_rhetorical_unmarked"));
  assert.equal(verdicts.find((verdict) => verdict.code === "choice_set_collapse")?.severity, "fail");
});

test("choice_set_noncollapse accepts identical choices when at least two are page-plan-marked rhetorical", async () => {
  const verdicts = await runChoiceSet(
    [
      choice("CHC-1"),
      choice("CHC-2")
    ],
    "Rhetorical variants: CHC-1 rhetorical; CHC-2 expressive."
  );

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse warns when an unmarked identical pair appears beside a material choice", async () => {
  const verdicts = await runChoiceSet([
    choice("CHC-1"),
    choice("CHC-2"),
    choice("CHC-3", { likely_state_pressure: "exposure and public risk" })
  ]);

  assert.deepEqual(verdicts.map((verdict) => [verdict.code, verdict.severity]), [
    ["choice_set_rhetorical_unmarked", "warn"]
  ]);
});

test("choice_set_noncollapse ignores pages with one CHC", async () => {
  const verdicts = await runChoiceSet([choice("CHC-1")]);

  assert.deepEqual(verdicts, []);
});

test("choice_set_noncollapse ignores terminal pages", async () => {
  const verdicts = await runChoiceSet(
    [
      choice("CHC-1"),
      choice("CHC-2")
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
        ? [{ path: "stories/test-story/pages-prose-plans/PG-2.md", content: planText }]
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
  return record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
    id: "PG-2",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", "PG-2"],
    turn_index: 2,
    input: {
      choice_id: "CHC-1",
      manual_action_text: null,
      resolved_event_id: "SE-2"
    },
    state_hash_parent: "a".repeat(64),
    state_hash: "b".repeat(64),
    state_snapshot: {
      canon_revision: null,
      active_records: ["STENT-1", "STLOC-1"],
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
    prose_plan_path: "pages-prose-plans/PG-2.md",
    emitted_choices: choiceIds,
    validation_trace: []
  });
}

function choice(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    supersedes: null,
    surface_label: `Choice ${id}`,
    player_visible_intent: "Act on the visible pressure.",
    target_or_action_families: ["communicate"],
    likely_state_pressure: "relationship pressure",
    associated_commitment_block: "SLT-1",
    grounded_in: {
      records: ["STENT-1", "STLOC-1"],
      affordance_ordinals: []
    },
    ...overrides
  };
}
