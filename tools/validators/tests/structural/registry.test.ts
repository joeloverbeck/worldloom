import assert from "node:assert/strict";
import test from "node:test";

import { structuralValidators } from "../../src/public/registry.js";

test("structural registry contains exactly the 7 SPEC-04 structural validators", () => {
  assert.deepEqual(
    structuralValidators.map((validator) => validator.name),
    [
      "yaml_parse_integrity",
      "id_uniqueness",
      "cross_file_reference",
      "record_schema_compliance",
      "touched_by_cf_completeness",
      "modification_history_retrofit",
      "adjudication_discovery_fields"
    ]
  );
});
