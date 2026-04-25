import assert from "node:assert/strict";
import test from "node:test";

import { runValidators } from "../../src/framework/run.js";
import { ruleValidators } from "../../src/public/registry.js";
import { context } from "../structural/helpers.js";
import { loadAnimaliaRuleRecords } from "./helpers.js";

test("rule validators report the current animalia bootstrap baseline in full-world mode", async () => {
  const records = loadAnimaliaRuleRecords();
  const result = await runValidators(ruleValidators, {}, context(records, { world_slug: "animalia" }));
  const actual = result.verdicts
    .filter((verdict) => verdict.severity === "fail")
    .map((verdict) => `${verdict.code}|${verdict.location.node_id ?? ""}`)
    .sort();

  assert.deepEqual(
    actual,
    [
      "rule2.non_canonical_domain|CF-0036",
      "rule2.non_canonical_domain|CF-0036",
      "rule2.non_canonical_domain|CF-0038",
      "rule2.non_canonical_domain|CF-0038",
      "rule2.non_canonical_domain|CF-0038",
      "rule2.non_canonical_domain|CF-0038"
    ].sort()
  );
});
