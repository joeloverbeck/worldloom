import assert from "node:assert/strict";
import test from "node:test";

import { crossFileReference } from "../../src/structural/cross-file-reference.js";
import { context, record, validCf, validSection } from "./helpers.js";

test("cross_file_reference catches orphan record references and invalid file classes", async () => {
  const cf = record("canon_fact_record", "CF-0001", "_source/canon/CF-0001.yaml", {
    ...validCf,
    source_basis: { direct_user_approval: true, derived_from: ["CF-4040"] },
    required_world_updates: ["BAD_CLASS"]
  });
  const section = record("section", "SEC-INS-001", "_source/institutions/SEC-INS-001.yaml", {
    ...validSection,
    touched_by_cf: ["CF-0001", "CF-9999"]
  });

  const result = await crossFileReference.run({}, context([cf, section]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    [
      "cross_file_reference.orphan_reference",
      "cross_file_reference.orphan_reference",
      "cross_file_reference.unknown_file_class"
    ].sort()
  );
});
