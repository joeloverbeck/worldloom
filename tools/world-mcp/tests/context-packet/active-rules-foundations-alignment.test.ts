import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble";
import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

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
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        node_type: "canon_fact_record",
        body: "id: CF-0001\nstatement: The salt levy shapes market days.\n",
        summary: largeSummary
      },
      {
        node_id: "M-0001",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-0001.yaml",
        node_type: "mystery_reserve_entry",
        body: "id: M-0001\nstatus: active\nwhat_is_unknown: Who first found the salt spring.\n",
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
        source_node_id: "CF-0001",
        target_node_id: "M-0001",
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
        seed_nodes: ["CF-0001"],
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
        seed_nodes: ["CF-0001"],
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
