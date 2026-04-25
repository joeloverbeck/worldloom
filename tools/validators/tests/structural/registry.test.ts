import assert from "node:assert/strict";
import test from "node:test";

import { structuralValidators } from "../../src/public/registry.js";

test("structural registry omits the retired adjudication Discovery validator", () => {
  assert.deepEqual(
    structuralValidators.map((validator) => validator.name),
    [
      "yaml_parse_integrity",
      "id_uniqueness",
      "cross_file_reference",
      "record_schema_compliance",
      "touched_by_cf_completeness",
      "modification_history_retrofit"
    ]
  );
});
