import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import { GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE } from "../../src/context-packet/shared";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const EROTICA_WORLD_INDEX = path.join(REPO_ROOT, "worlds", "erotica-world", "_index", "world.db");
const TYPICAL_SEED_NODES = ["ENT-0001", "ENT-0004", "ENT-0003"];

test("erotica-world character and artifact skill defaults protect governing full bodies", async (t) => {
  if (!existsSync(EROTICA_WORLD_INDEX)) {
    t.skip("worlds/erotica-world/_index/world.db is local world content and is absent in this checkout");
    return;
  }

  const cases = [
    ["character_generation", 18000],
    ["diegetic_artifact_generation", 10000]
  ] as const;

  for (const [taskType, tokenBudget] of cases) {
    const result = await getContextPacket({
      task_type: taskType,
      world_slug: "erotica-world",
      seed_nodes: TYPICAL_SEED_NODES,
      token_budget: tokenBudget
    });

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
});
