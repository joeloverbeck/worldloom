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
      "story_fact_authority",
      "audit_only_se_shape",
      "slt_created_at_page_origin_consistency",
      "snapshot_replay_equality",
      "recursive_reference_closure",
      "state_snapshot_integrity",
      "touched_by_cf_completeness",
      "proposal_package_shape",
      "modification_history_retrofit"
    ]
  );
});
