import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble.js";
import {
  DEFAULT_HARNESS_CEILING_CHARS,
  ENVELOPE_OVERHEAD_RESERVE_CHARS
} from "../../src/context-packet/shared.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared.js";

function seedHarnessCeilingWorld(root: string): void {
  const largeSummary = "structural-key ".repeat(260);

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "Kernel body.",
        summary: largeSummary
      },
      {
        node_id: "seeded:INVARIANTS.md:Rule:0",
        world_slug: "seeded",
        file_path: "INVARIANTS.md",
        heading_path: "Rule",
        node_type: "invariant",
        body: "Invariant body.",
        summary: largeSummary
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Harrowgate",
        node_type: "section",
        body: "Harrowgate body.",
        summary: largeSummary
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "diegetic_artifact_record",
        body: "---\nauthor_character_id: CHAR-0002\n---\nReport body.\n",
        summary: "Seed report."
      },
      {
        node_id: "CHAR-0002",
        world_slug: "seeded",
        file_path: "characters/melissa-threadscar.md",
        node_type: "character_record",
        body: "---\nname: Melissa Threadscar\n---\nMelissa.\n",
        summary: largeSummary
      },
      {
        node_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/report.md",
        node_type: "scoped_reference",
        body: "Harrowgate",
        summary: "Harrowgate."
      },
      ...Array.from({ length: 20 }, (_, index) => ({
        node_id: `CF-${String(index + 1).padStart(4, "0")}`,
        world_slug: "seeded",
        file_path: `_source/canon/CF-${String(index + 1).padStart(4, "0")}.yaml`,
        node_type: "canon_fact_record" as const,
        body: `id: CF-${String(index + 1).padStart(4, "0")}\ntitle: Large linked fact ${index}\n`,
        summary: largeSummary
      }))
    ],
    edges: [
      {
        source_node_id: "DA-0002",
        target_node_id: "CHAR-0002",
        edge_type: "references_record"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "DA-0002#scoped:harrowgate:0",
        edge_type: "references_scoped_name"
      },
      {
        source_node_id: "DA-0002",
        target_node_id: "seeded:GEOGRAPHY.md:Harrowgate:0",
        edge_type: "required_world_update"
      },
      ...Array.from({ length: 20 }, (_, index) => ({
        source_node_id: "DA-0002",
        target_node_id: `CF-${String(index + 1).padStart(4, "0")}`,
        edge_type: "references_record" as const
      }))
    ],
    scopedReferences: [
      {
        reference_id: "DA-0002#scoped:harrowgate:0",
        world_slug: "seeded",
        display_name: "Harrowgate",
        reference_kind: "place",
        relation: "filing_location",
        source_node_id: "DA-0002"
      }
    ]
  });
}

test("assembler emits a persisted full packet plus inline summary when the full packet exceeds the harness ceiling", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "12000";
  process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = path.join(root, "tool-results");

  try {
    seedHarnessCeilingWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in result), `expected packet response, got ${"code" in result ? result.code : "n/a"}`);
    assert.equal(result.task_header.harness_ceiling_chars, 12000);
    assert.equal(result.task_header.envelope_overhead_reserve_chars, ENVELOPE_OVERHEAD_RESERVE_CHARS);
    assert.equal(result.task_header.delivery_status, "persisted_with_summary");
    assert.equal(result.task_header.estimator_version, "chars-per-token-v1");
    assert.equal(typeof result.task_header.persisted_output_path, "string");
    assert.ok(
      JSON.stringify(result).length <=
        result.task_header.harness_ceiling_chars -
          result.task_header.envelope_overhead_reserve_chars,
      "serialized response must fit the effective harness ceiling after envelope reserve"
    );
    assert.ok(result.governing_summary);
    assert.deepEqual(result.governing_summary.active_rules, result.governing_world_context.active_rules);
    assert.ok(result.governing_summary.dropped_node_ids_by_class.section?.length);
    assert.deepEqual(result.local_authority.nodes, []);
    assert.ok(existsSync(result.task_header.persisted_output_path!));

    const persisted = JSON.parse(readFileSync(result.task_header.persisted_output_path!, "utf8"));
    assert.equal(persisted.task_header.delivery_status, "inline");
    assert.ok(
      JSON.stringify(persisted).length > result.task_header.harness_ceiling_chars,
      "persisted full packet should exceed the gross ceiling that the summary replaces"
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

test("assembler reports the default harness ceiling and envelope reserve", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;

  try {
    seedHarnessCeilingWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["DA-0002"],
        token_budget: 100000
      })
    );

    assert.ok(!("code" in result), `expected packet response, got ${"code" in result ? result.code : "n/a"}`);
    assert.equal(result.task_header.harness_ceiling_chars, DEFAULT_HARNESS_CEILING_CHARS);
    assert.equal(result.task_header.envelope_overhead_reserve_chars, ENVELOPE_OVERHEAD_RESERVE_CHARS);
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    destroyTempRepoRoot(root);
  }
});
