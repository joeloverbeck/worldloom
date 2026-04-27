import assert from "node:assert/strict";
import test from "node:test";

import { ruleValidators } from "../../src/public/registry.js";

test("rule registry contains exactly the 8 active rule-derived validators", () => {
  assert.deepEqual(
    ruleValidators.map((validator) => validator.name),
    [
      "rule1_no_floating_facts",
      "rule2_no_pure_cosmetics",
      "rule4_no_globalization_by_accident",
      "rule5_no_consequence_evasion",
      "rule6_no_silent_retcons",
      "rule7_mystery_reserve_preservation",
      "rule11_action_space",
      "rule12_redundancy"
    ]
  );
});
