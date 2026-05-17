import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import { GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE } from "../../src/context-packet/shared";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

const FIXTURE_WORLD = "governing-body-world";
const TYPICAL_SEED_NODES = ["ENT-0001", "ENT-0004", "ENT-0003"];

test("character and artifact skill defaults protect governing full bodies", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: FIXTURE_WORLD,
      nodes: [
        {
          node_id: "ENT-0001",
          world_slug: FIXTURE_WORLD,
          file_path: "_source/entities/ENT-0001.yaml",
          node_type: "named_entity",
          body: "id: ENT-0001\ncanonical_name: Mira Vell\nentity_kind: person\n"
        },
        {
          node_id: "ENT-0003",
          world_slug: FIXTURE_WORLD,
          file_path: "_source/entities/ENT-0003.yaml",
          node_type: "named_entity",
          body: "id: ENT-0003\ncanonical_name: Ember Reliquary\nentity_kind: artifact\n"
        },
        {
          node_id: "ENT-0004",
          world_slug: FIXTURE_WORLD,
          file_path: "_source/entities/ENT-0004.yaml",
          node_type: "named_entity",
          body: "id: ENT-0004\ncanonical_name: Glassmarket\nentity_kind: place\n"
        },
        {
          node_id: "INV-0001",
          world_slug: FIXTURE_WORLD,
          file_path: "_source/invariants/INV-0001.yaml",
          node_type: "invariant",
          body: "id: INV-0001\nstatement: Embodied limits remain binding.\nrationale: Characters and artifacts cannot bypass lived constraints.\n"
        },
        {
          node_id: "M-0001",
          world_slug: FIXTURE_WORLD,
          file_path: "_source/mystery-reserve/M-0001.yaml",
          node_type: "mystery_reserve_entry",
          body: "id: M-0001\ntitle: The sealed origin\nunknowns:\n  - Who first sealed the Ember Reliquary.\nfuture_resolution_safety: low\n"
        },
        {
          node_id: "CF-0001",
          world_slug: FIXTURE_WORLD,
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Mira Vell studies the Ember Reliquary in Glassmarket.\n"
        }
      ],
      edges: [
        {
          source_node_id: "CF-0001",
          target_node_id: "ENT-0001",
          edge_type: "mentions_entity"
        },
        {
          source_node_id: "CF-0001",
          target_node_id: "ENT-0003",
          edge_type: "mentions_entity"
        },
        {
          source_node_id: "CF-0001",
          target_node_id: "ENT-0004",
          edge_type: "mentions_entity"
        }
      ]
    });

    const cases = [
      ["character_generation", 18000],
      ["diegetic_artifact_generation", 10000]
    ] as const;

    for (const [taskType, tokenBudget] of cases) {
      const result = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: taskType,
          world_slug: FIXTURE_WORLD,
          seed_nodes: TYPICAL_SEED_NODES,
          token_budget: tokenBudget
        })
      );

      if ("code" in result) {
        assert.equal(result.code, "packet_incomplete_required_classes");
        assert.ok(result.details);
        assert.deepEqual(
          result.details.governing_full_body_priority,
          GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE[taskType]
        );
        assert.deepEqual(result.details.missing_classes, ["governing_world_context.full_body"]);
        assert.equal(
          typeof result.details.minimum_required_harness_ceiling_chars,
          "number"
        );
        continue;
      }

      assert.ok(result.task_header.token_budget.allocated <= tokenBudget);
      assert.deepEqual(
        result.task_header.governing_full_body_priority,
        GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE[taskType]
      );
      assert.equal(
        result.truncation_summary.full_body_downgrades?.some(
          (entry) =>
            entry.layer === "governing_world_context" &&
            (entry.node_type === "invariant" || entry.node_type === "mystery_reserve_entry")
        ) ?? false,
        false
      );
      assert.ok(
        JSON.stringify(result).length <=
          result.task_header.harness_ceiling_chars -
            result.task_header.envelope_overhead_reserve_chars
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
