import assert from "node:assert/strict";
import test from "node:test";

import { idUniqueness } from "../../src/structural/id-uniqueness.js";
import { context, record, validCf } from "./helpers.js";

test("id_uniqueness catches within-class duplicates and ignores cross-class collisions", async () => {
  const duplicateA = record("canon_fact_record", "CF-99", "_source/canon/CF-99.yaml", {
    ...validCf,
    id: "CF-99"
  });
  const duplicateB = record("canon_fact_record", "CF-99", "_source/canon/CF-100.yaml", {
    ...validCf,
    id: "CF-99"
  });
  const crossClass = record("change_log_entry", "CF-99", "_source/change-log/CH-99.yaml", {
    change_id: "CF-99"
  });

  const result = await idUniqueness.run({}, context([duplicateA, duplicateB, crossClass]));

  assert.equal(result.length, 1);
  assert.equal(result[0]?.code, "id_uniqueness.duplicate");
});
