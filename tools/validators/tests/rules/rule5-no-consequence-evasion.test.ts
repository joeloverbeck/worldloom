import assert from "node:assert/strict";
import test from "node:test";

import { rule5NoConsequenceEvasion } from "../../src/rules/rule5-no-consequence-evasion.js";
import { completeCf, testContext } from "./helpers.js";

test("rule5_no_consequence_evasion matches CF required_world_updates to SEC ops in pre-apply", async () => {
  const missing = await rule5NoConsequenceEvasion.run(
    {},
    {
      ...testContext([]),
      run_mode: "pre-apply",
      patch_plan: {
        patches: [
          {
            op: "create_cf_record",
            target_world: "test",
            target_file: "_source/canon/CF-0001.yaml",
            payload: { cf_record: { ...completeCf, id: "CF-0001", required_world_updates: ["INSTITUTIONS"] } }
          }
        ]
      }
    }
  );

  assert.deepEqual(missing.map((verdict) => verdict.code), ["rule5.required_update_not_patched"]);

  const matched = await rule5NoConsequenceEvasion.run(
    {},
    {
      ...testContext([]),
      run_mode: "pre-apply",
      patch_plan: {
        patches: [
          {
            op: "create_cf_record",
            target_world: "test",
            target_file: "_source/canon/CF-0001.yaml",
            payload: { cf_record: { ...completeCf, id: "CF-0001", required_world_updates: ["INSTITUTIONS"] } }
          },
          {
            op: "create_sec_record",
            target_world: "test",
            target_file: "_source/institutions/SEC-INS-001.yaml",
            payload: { sec_record: { id: "SEC-INS-001", file_class: "INSTITUTIONS" } }
          }
        ]
      }
    }
  );

  assert.equal(matched.length, 0);
});

test("rule5_no_consequence_evasion is pre-apply only", () => {
  assert.equal(rule5NoConsequenceEvasion.applies_to(testContext([])), false);
});
