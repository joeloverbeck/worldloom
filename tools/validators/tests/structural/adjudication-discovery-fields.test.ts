import assert from "node:assert/strict";
import test from "node:test";

import { adjudicationDiscoveryFields } from "../../src/structural/adjudication-discovery-fields.js";
import { context } from "./helpers.js";

test("adjudication_discovery_fields catches ad-hoc Discovery field names", async () => {
  const result = await adjudicationDiscoveryFields.run(
    {
      files: [
        {
          path: "adjudications/PA-0001-test.md",
          content: ["# PA-0001", "", "## Discovery", "- New CF: CF-0001", "- cf_records_touched: CF-0001"].join("\n")
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]?.code, "adjudication_discovery_fields.non_canonical");
});
