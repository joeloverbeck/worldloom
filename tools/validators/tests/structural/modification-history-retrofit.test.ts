import assert from "node:assert/strict";
import test from "node:test";

import { modificationHistoryRetrofit } from "../../src/structural/modification-history-retrofit.js";
import { context, record, validCf } from "./helpers.js";

test("modification_history_retrofit catches notes-pattern entries without array entries", async () => {
  const cf = record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", {
    ...validCf,
    notes: "Modified 2026-04-18 by CH-0006",
    modification_history: []
  });

  const result = await modificationHistoryRetrofit.run({}, context([cf]));

  assert.equal(result.length, 1);
  assert.equal(result[0]?.code, "modification_history_retrofit.missing_entry");
});

test("modification_history_retrofit accepts matching notes-pattern array entries", async () => {
  const cf = record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", {
    ...validCf,
    notes: "Modified 2026-04-18 by CH-0006",
    modification_history: [{ date: "2026-04-18", change_id: "CH-0006", originating_cf: "CF-0001", summary: "Update" }]
  });

  const result = await modificationHistoryRetrofit.run({}, context([cf]));

  assert.equal(result.length, 0);
});
