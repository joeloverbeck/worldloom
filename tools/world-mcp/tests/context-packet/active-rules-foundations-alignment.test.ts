import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble.js";
import { TASK_TYPES, type TaskType } from "../../src/ranking/profiles/index.js";
import { getContextPacket } from "../../src/tools/get-context-packet.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

const EXPECTED_CANON_ADDITION_RULES = [
  "Rule 1: no floating facts",
  "Rule 2: no pure cosmetics",
  "Rule 4: no globalization by accident",
  "Rule 5: no consequence evasion",
  "Rule 6: no silent retcons",
  "Rule 7: preserve Mystery Reserve deliberately",
  "Rule 11: no spectator castes by accident",
  "Rule 12: no single-trace truths"
];

const CANONICAL_RULE_NAMES = new Map([
  [1, "no floating facts"],
  [2, "no pure cosmetics"],
  [3, "no specialness inflation"],
  [4, "no globalization by accident"],
  [5, "no consequence evasion"],
  [6, "no silent retcons"],
  [7, "preserve Mystery Reserve deliberately"],
  [11, "no spectator castes by accident"],
  [12, "no single-trace truths"]
]);

const EXPECTED_ACTIVE_RULES_BY_TASK_TYPE: Record<TaskType, string[]> = {
  canon_addition: EXPECTED_CANON_ADDITION_RULES,
  character_generation: [
    "Rule 4: no globalization by accident - distribution discipline",
    "Rule 7: preserve Mystery Reserve deliberately",
    "No world-level writes from generation flows"
  ],
  diegetic_artifact_generation: [
    "No silent canon mutation from diegetic generation",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  continuity_audit: [
    "Audit-only surface; do not mutate canon directly",
    "Rule 1: no floating facts",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  propose_new_canon_facts: [
    "Proposal-only surface; canonization happens in canon-addition",
    "Rule 1: no floating facts",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  propose_new_characters: [
    "Proposal-only surface; character realization happens in character-generation",
    "Rule 4: no globalization by accident - distribution discipline",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  propose_new_worlds_from_preferences: [
    "Pre-world proposal surface; create-base-world owns realization",
    "Rule 7: preserve Mystery Reserve deliberately",
    "Cross-world distinctness must be explicit when existing worlds are present"
  ],
  canon_facts_from_diegetic_artifacts: [
    "Proposal-only surface; canonization happens in canon-addition",
    "Diegetic-to-world laundering firewall: diegetic claims must not become world-canon without canon-addition adjudication",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  emergent_pressure_events: [
    "Pressure events are proposal inputs, not accepted canon",
    "Rule 5: no consequence evasion - visible consequences are required",
    "Rule 4: no globalization by accident - distribution discipline",
    "Candidate events remain proposal inputs until canon-addition adjudication",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  story_bootstrap: [
    "Story bootstrap is story-local; world canon remains read-only",
    "Rule 1: no floating facts - imported facts must cite world authority",
    "Rule 4: no globalization by accident - distribution discipline",
    "Rule 5: no consequence evasion - story-local consequences remain visible",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  story_character_profile: [
    "Story character profile authoring is story-local; world canon remains read-only",
    "Rule 1: no floating facts - profile claims must cite source CHAR and story authority",
    "Rule 4: no globalization by accident - story-local characterization must not become world canon",
    "Rule 6: no silent retcons - STCHAR changes remain append-only by supersession",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  story_turn_cycle: [
    "Story turn cycle is story-local; world canon remains read-only",
    "Rule 1: no floating facts - imported facts must cite world authority",
    "Rule 4: no globalization by accident - distribution discipline",
    "Rule 5: no consequence evasion - story-local consequences remain visible",
    "Rule 6: no silent retcons - story state changes remain append-only by supersession",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  commitment_block_authoring: [
    "Commitment block authoring is story-local; world canon remains read-only",
    "Rule 1: no floating facts - imported facts must cite world authority",
    "Rule 4: no globalization by accident - distribution discipline",
    "Rule 5: no consequence evasion - story-local consequences remain visible",
    "Rule 6: no silent retcons - storylet records remain append-only by new allocation",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  branching_story_health_audit: [
    "Branching story health audit is diagnostic; world canon remains read-only",
    "Rule 1: no floating facts - findings must cite world and story authority",
    "Rule 4: no globalization by accident - branch-local facts must not globalize",
    "Rule 5: no consequence evasion - consequence and obligation debt must remain visible",
    "Rule 7: preserve Mystery Reserve deliberately"
  ],
  story_fact_promotion_to_canon: [
    "Story fact promotion is a canon-addition handoff, not a direct world-canon write",
    "Rule 1: no floating facts - promoted facts must cite story and world authority",
    "Rule 4: no globalization by accident - story-local truth must not globalize",
    "Rule 6: no silent retcons - promotion must preserve visible change lineage",
    "Rule 7: preserve Mystery Reserve deliberately",
    "Rule 12: no single-trace truths - hard-canon promotions need redundant support"
  ],
  other: ["Rule 1: no floating facts", "Rule 7: preserve Mystery Reserve deliberately"]
};

const PRIOR_HARD_WRONG_RULE_STRINGS = [
  "Rule 2: visible consequences are required",
  "Rule 5: separate diegetic claims from world-level truth"
];

const STORY_PIPELINE_TASK_TYPES = new Set<TaskType>([
  "story_bootstrap",
  "story_character_profile",
  "story_turn_cycle",
  "commitment_block_authoring",
  "branching_story_health_audit",
  "story_fact_promotion_to_canon"
]);

function canonicalPrefix(entry: string): string | null {
  const match = /^Rule ([0-9]+): ([^-]+?)(?: - .*)?$/.exec(entry);
  if (!match) {
    return null;
  }

  const ruleNumber = Number(match[1]);
  const ruleName = CANONICAL_RULE_NAMES.get(ruleNumber);
  assert.ok(ruleName, `unexpected FOUNDATIONS rule number in active_rules entry: ${entry}`);
  return `Rule ${ruleNumber}: ${ruleName}`;
}

function seedCanonAdditionActiveRulesWorld(root: string): void {
  const largeSummary = "canon-rule-alignment ".repeat(260);

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "Kernel body for canon-addition active-rules alignment.",
        summary: largeSummary
      },
      {
        node_id: "seeded:INVARIANTS.md:Core:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Core",
        node_type: "invariant",
        body: "id: INV-1\nstatement: Existing consequences must remain visible.\n",
        summary: largeSummary
      },
      {
        node_id: "CF-1",
        world_slug: "seeded",
        file_path: "_source/canon/CF-1.yaml",
        node_type: "canon_fact_record",
        body: "id: CF-1\nstatement: The salt levy shapes market days.\n",
        summary: largeSummary
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-1.yaml",
        node_type: "mystery_reserve_entry",
        body: "id: M-1\nstatus: active\nwhat_is_unknown: Who first found the salt spring.\n",
        summary: largeSummary
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        node_id: `seeded:EVERYDAY_LIFE.md:Market-${index}:0`,
        world_slug: "seeded",
        file_path: "EVERYDAY_LIFE.md",
        heading_path: `Market-${index}`,
        node_type: "section" as const,
        body: `Market consequence ${index}.`,
        summary: largeSummary
      }))
    ],
    edges: [
      {
        source_node_id: "CF-1",
        target_node_id: "M-1",
        edge_type: "firewall_for"
      }
    ]
  });
}

test("canon_addition active rules use FOUNDATIONS validation rule names", async () => {
  const root = createTempRepoRoot();

  try {
    seedCanonAdditionActiveRulesWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-1"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in result), `expected packet response, got ${"code" in result ? result.code : "n/a"}`);
    assert.deepEqual(result.governing_world_context.active_rules, EXPECTED_CANON_ADDITION_RULES);
    assert.equal(
      result.governing_world_context.active_rules.includes("Rule 2: preserve causal integrity"),
      false
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("every task type active_rules entry prefixes numbered rules with FOUNDATIONS canonical names", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    for (const taskType of TASK_TYPES) {
      const args = {
        task_type: taskType,
        world_slug: STORY_FIXTURE_WORLD,
        seed_nodes: ["entity:marla-kern"],
        token_budget: 100000
      };

      const result = await withRepoRoot(root, () =>
        getContextPacket(
          STORY_PIPELINE_TASK_TYPES.has(taskType)
            ? { ...args, story_slug: STORY_FIXTURE_SLUG }
            : args
        )
      );

      assert.ok(!("code" in result), `expected packet response for ${taskType}, got ${"code" in result ? result.code : "n/a"}`);
      assert.deepEqual(result.governing_world_context.active_rules, EXPECTED_ACTIVE_RULES_BY_TASK_TYPE[taskType]);

      for (const oldRuleString of PRIOR_HARD_WRONG_RULE_STRINGS) {
        assert.equal(
          result.governing_world_context.active_rules.includes(oldRuleString),
          false,
          `${taskType} must not expose prior hard-wrong rule string: ${oldRuleString}`
        );
      }

      for (const entry of result.governing_world_context.active_rules) {
        const prefix = canonicalPrefix(entry);
        if (prefix) {
          assert.equal(entry.startsWith(prefix), true, `${taskType} has non-canonical rule prefix: ${entry}`);
        }
      }
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("canon_addition persisted governing summary carries the same active rules", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "12000";
  process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = path.join(root, "tool-results");

  try {
    seedCanonAdditionActiveRulesWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-1"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in result), `expected packet response, got ${"code" in result ? result.code : "n/a"}`);
    assert.equal(result.task_header.delivery_status, "persisted_with_summary");
    assert.ok(result.governing_summary);
    assert.deepEqual(result.governing_summary.active_rules, EXPECTED_CANON_ADDITION_RULES);
    assert.deepEqual(
      result.governing_summary.active_rules,
      result.governing_world_context.active_rules
    );
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    if (originalResultsDir === undefined) {
      delete process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
    } else {
      process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = originalResultsDir;
    }
    destroyTempRepoRoot(root);
  }
});
