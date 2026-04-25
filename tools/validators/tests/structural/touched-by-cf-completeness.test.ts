import assert from "node:assert/strict";
import test from "node:test";

import { touchedByCfCompleteness } from "../../src/structural/touched-by-cf-completeness.js";
import { context, record, validCf, validSection } from "./helpers.js";

test("touched_by_cf_completeness catches SEC-to-CF and CF-to-SEC misses", async () => {
  const cf = record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", {
    ...validCf,
    required_world_updates: ["GEOGRAPHY"]
  });
  const section = record("section", "SEC-INS-001", "_source/institutions/SEC-INS-001.yaml", validSection);

  const result = await touchedByCfCompleteness.run({}, context([cf, section]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    [
      "touched_by_cf_completeness.cf_to_sec_miss",
      "touched_by_cf_completeness.sec_to_cf_miss"
    ].sort()
  );
});

test("touched_by_cf_completeness accepts matching bidirectional CF/SEC mapping", async () => {
  const cf = record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", validCf);
  const section = record("section", "SEC-INS-001", "_source/institutions/SEC-INS-001.yaml", validSection);

  const result = await touchedByCfCompleteness.run({}, context([cf, section]));

  assert.equal(result.length, 0);
});
