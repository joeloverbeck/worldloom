import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { rule5NoConsequenceEvasion } from "../../src/rules/rule5-no-consequence-evasion.js";
import { completeCf, testContext } from "./helpers.js";

const secClassCases = [
  ["EVERYDAY_LIFE", "SEC-ELF-001"],
  ["INSTITUTIONS", "SEC-INS-001"],
  ["MAGIC_OR_TECH_SYSTEMS", "SEC-MTS-001"],
  ["GEOGRAPHY", "SEC-GEO-001"],
  ["ECONOMY_AND_RESOURCES", "SEC-ECR-001"],
  ["PEOPLES_AND_SPECIES", "SEC-PAS-001"],
  ["TIMELINE", "SEC-TML-001"]
] as const;

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
            target_file: "_source/canon/CF-1.yaml",
            payload: { cf_record: { ...completeCf, id: "CF-1", required_world_updates: ["INSTITUTIONS"] } }
          }
        ]
      } as unknown as PatchPlanEnvelope
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
            target_file: "_source/canon/CF-1.yaml",
            payload: { cf_record: { ...completeCf, id: "CF-1", required_world_updates: ["INSTITUTIONS"] } }
          },
          {
            op: "create_sec_record",
            target_world: "test",
            target_file: "_source/institutions/SEC-INS-001.yaml",
            payload: { sec_record: { id: "SEC-INS-001", file_class: "INSTITUTIONS" } }
          }
        ]
      } as unknown as PatchPlanEnvelope
    }
  );

  assert.equal(matched.length, 0);
});

test("rule5_no_consequence_evasion matches append_extension SEC ops by file_class prefix", async () => {
  for (const [fileClass, secId] of secClassCases) {
    const verdicts = await rule5NoConsequenceEvasion.run(
      {},
      {
        ...testContext([]),
        run_mode: "pre-apply",
        patch_plan: {
          patches: [
            {
              op: "create_cf_record",
              target_world: "test",
              target_file: "_source/canon/CF-1.yaml",
              payload: { cf_record: { ...completeCf, id: "CF-1", required_world_updates: [fileClass] } }
            },
            {
              op: "append_extension",
              target_world: "test",
              payload: {
                target_record_id: secId,
                extension: {
                  originating_cf: "CF-1",
                  change_id: "CH-1",
                  date: "2026-04-26",
                  label: "Pilot extension",
                  body: "Extension body."
                }
              }
            }
          ]
        } as unknown as PatchPlanEnvelope
      }
    );

    assert.deepEqual(verdicts, [], fileClass);
  }
});

test("rule5_no_consequence_evasion ignores non-SEC append_extension targets", async () => {
  const verdicts = await rule5NoConsequenceEvasion.run(
    {},
    {
      ...testContext([]),
      run_mode: "pre-apply",
      patch_plan: {
        patches: [
          {
            op: "create_cf_record",
            target_world: "test",
            target_file: "_source/canon/CF-1.yaml",
            payload: { cf_record: { ...completeCf, id: "CF-1", required_world_updates: ["INSTITUTIONS"] } }
          },
          {
            op: "append_extension",
            target_world: "test",
            payload: {
              target_record_id: "INV-ONT-1",
              extension: {
                originating_cf: "CF-1",
                change_id: "CH-1",
                date: "2026-04-26",
                label: "Invariant extension",
                body: "Extension body."
              }
            }
          }
        ]
      } as unknown as PatchPlanEnvelope
    }
  );

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["rule5.required_update_not_patched"]);
});

test("rule5_no_consequence_evasion explains that required_world_updates is SEC-only", async () => {
  const verdicts = await rule5NoConsequenceEvasion.run(
    {},
    {
      ...testContext([]),
      run_mode: "pre-apply",
      patch_plan: {
        patches: [
          {
            op: "create_cf_record",
            target_world: "test",
            target_file: "_source/canon/CF-1.yaml",
            payload: { cf_record: { ...completeCf, id: "CF-1", required_world_updates: ["INVARIANTS"] } }
          },
          {
            op: "append_extension",
            target_world: "test",
            target_file: "_source/invariants/ONT-2.yaml",
            payload: {
              target_record_id: "ONT-2",
              extension: {
                originating_cf: "CF-1",
                change_id: "CH-1",
                date: "2026-04-26",
                label: "Invariant extension",
                body: "Extension body."
              }
            }
          }
        ]
      } as unknown as PatchPlanEnvelope
    }
  );

  assert.equal(verdicts.length, 1);
  assert.match(verdicts[0]!.message, /only the seven SEC file classes are permissible/);
  for (const [fileClass] of secClassCases) {
    assert.match(verdicts[0]!.message, new RegExp(fileClass));
  }
  assert.match(verdicts[0]!.message, /CH\.downstream_updates\[\]/);
});

test("rule5_no_consequence_evasion is pre-apply only", () => {
  assert.equal(rule5NoConsequenceEvasion.applies_to(testContext([])), false);
});
