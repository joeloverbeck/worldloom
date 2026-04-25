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
      "rule2.non_canonical_domain|CF-0004",
      "rule2.non_canonical_domain|CF-0021",
      "rule2.non_canonical_domain|CF-0023",
      "rule2.non_canonical_domain|CF-0024",
      "rule2.non_canonical_domain|CF-0027",
      "rule2.non_canonical_domain|CF-0027",
      "rule2.non_canonical_domain|CF-0027",
      "rule2.non_canonical_domain|CF-0028",
      "rule2.non_canonical_domain|CF-0029",
      "rule2.non_canonical_domain|CF-0031",
      "rule2.non_canonical_domain|CF-0033",
      "rule2.non_canonical_domain|CF-0036",
      "rule2.non_canonical_domain|CF-0036",
      "rule2.non_canonical_domain|CF-0038",
      "rule2.non_canonical_domain|CF-0038",
      "rule2.non_canonical_domain|CF-0038",
      "rule2.non_canonical_domain|CF-0038",
      "rule6.dangling_modification_history|CF-0020",
      "rule7.invalid_future_resolution_safety|M-15",
      "rule7.invalid_future_resolution_safety|M-16",
      "rule7.invalid_future_resolution_safety|M-17",
      "rule7.invalid_future_resolution_safety|M-2",
      "rule7.invalid_future_resolution_safety|M-20",
      "rule7.invalid_future_resolution_safety|M-4",
      "rule7.invalid_future_resolution_safety|M-5",
      "rule7.invalid_future_resolution_safety|M-7",
      "rule7.missing_disallowed_cheap_answers|M-5"
    ].sort()
  );
});
