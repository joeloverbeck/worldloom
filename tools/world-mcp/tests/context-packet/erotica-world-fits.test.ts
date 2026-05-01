import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const EROTICA_WORLD_INDEX = path.join(REPO_ROOT, "worlds", "erotica-world", "_index", "world.db");
const TYPICAL_SEED_NODES = ["ENT-0001", "ENT-0004", "ENT-0003"];

test("erotica-world character and artifact skill defaults fit the harness ceiling", async (t) => {
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

    assert.ok(!("code" in result), `${taskType} should return an inline packet`);
    assert.equal(result.truncation_summary.dropped_layers.length, 0);
    assert.ok(result.task_header.token_budget.allocated <= tokenBudget);
    assert.ok(JSON.stringify(result).length <= result.task_header.harness_ceiling_chars);
  }
});
