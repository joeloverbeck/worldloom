import assert from "node:assert/strict";
import test from "node:test";

import { rule1NoFloatingFacts } from "../../src/rules/rule1-no-floating-facts.js";
import { cfRecord, completeCf, testContext } from "./helpers.js";

test("rule1_no_floating_facts catches missing CF structure", async () => {
  const bad = cfRecord("CF-0001", {
    ...completeCf,
    domains_affected: [],
    scope: { geographic: "local" },
    costs_and_limits: [],
    visible_consequences: [],
    prerequisites: []
  });

  const result = await rule1NoFloatingFacts.run({}, testContext([bad]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    [
      "rule1.missing_costs_and_limits",
      "rule1.missing_domains_affected",
      "rule1.missing_prerequisites",
      "rule1.missing_scope_social",
      "rule1.missing_scope_temporal",
      "rule1.missing_visible_consequences"
    ].sort()
  );
});

test("rule1_no_floating_facts accepts complete CF structure", async () => {
  const result = await rule1NoFloatingFacts.run({}, testContext([cfRecord("CF-0001")]));
  assert.equal(result.length, 0);
});
