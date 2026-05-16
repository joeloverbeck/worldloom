import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { rule6NoSilentRetcons } from "../../src/rules/rule6-no-silent-retcons.js";
import { cfRecord, chRecord, completeCf, testContext } from "./helpers.js";

test("rule6_no_silent_retcons requires CH and modification_history entry in pre-apply", async () => {
  const baseCtx = {
    ...testContext([cfRecord("CF-1")]),
    run_mode: "pre-apply" as const
  };

  const missingHistory = await rule6NoSilentRetcons.run(
    {},
    {
      ...baseCtx,
      patch_plan: {
        patches: [
          {
            op: "update_record_field",
            target_world: "test",
            target_file: "_source/canon/CF-1.yaml",
            payload: { target_record_id: "CF-1", field_path: ["statement"], operation: "set", new_value: "Changed" }
          },
          {
            op: "create_ch_record",
            target_world: "test",
            target_file: "_source/change-log/CH-1.yaml",
            payload: { ch_record: { change_id: "CH-1", affected_fact_ids: ["CF-1"] } }
          }
        ]
      } as unknown as PatchPlanEnvelope
    }
  );

  assert.deepEqual(missingHistory.map((verdict) => verdict.code), ["rule6.missing_modification_history_entry"]);

  const matched = await rule6NoSilentRetcons.run(
    {},
    {
      ...baseCtx,
      patch_plan: {
        patches: [
          {
            op: "update_record_field",
            target_world: "test",
            target_file: "_source/canon/CF-1.yaml",
            payload: { target_record_id: "CF-1", field_path: ["statement"], operation: "set", new_value: "Changed" }
          },
          {
            op: "create_ch_record",
            target_world: "test",
            target_file: "_source/change-log/CH-1.yaml",
            payload: { ch_record: { change_id: "CH-1", affected_fact_ids: ["CF-1"] } }
          },
          {
            op: "append_modification_history_entry",
            target_world: "test",
            target_file: "_source/canon/CF-1.yaml",
            payload: { target_cf_id: "CF-1", change_id: "CH-1", originating_cf: "CF-1", date: "2026-04-25", summary: "Changed." }
          }
        ]
      } as unknown as PatchPlanEnvelope
    }
  );

  assert.equal(matched.length, 0);
});

test("rule6_no_silent_retcons catches dangling full-world modification_history", async () => {
  const cf = cfRecord("CF-1", {
    ...completeCf,
    modification_history: [{ change_id: "CH-1", originating_cf: "CF-1", date: "2026-04-25", summary: "Changed." }]
  });

  const bad = await rule6NoSilentRetcons.run({}, testContext([cf]));
  assert.deepEqual(bad.map((verdict) => verdict.code), ["rule6.dangling_modification_history"]);

  const good = await rule6NoSilentRetcons.run({}, testContext([cf, chRecord("CH-1", ["CF-1"])]));
  assert.equal(good.length, 0);
});
