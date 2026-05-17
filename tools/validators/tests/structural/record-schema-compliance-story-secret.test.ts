import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/secrets/STSEC-1.yaml";

test("record_schema_compliance accepts complete STSEC records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    secretRecord(validSecret())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects invalid STSEC enum values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    secretRecord(validSecret({ secret_kind: "other", status: "solved" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/secret_kind")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/status")
  ));
});

test("record_schema_compliance rejects malformed clue carriers", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    secretRecord(validSecret({
      clue_carriers: [
        {
          kind: "STCLUE",
          record: "STCLUE-1",
          clue_text: "Bad parallel clue class.",
          clue_strength: "decisive",
          discovered_by: ["STENT-1"],
          audience_visible: "visible",
          status: "available"
        }
      ]
    }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/clue_carriers/0/kind")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/clue_carriers/0/record")
  ));
});

function secretRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_secret_record", "test-story:STSEC-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validSecret(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STSEC-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    secret_kind: "motive",
    secret_claim: "Captain Sera hid the ledger to protect her brother.",
    truth_anchor: "SF-1",
    holders: ["STENT-1"],
    salience: "high",
    protected_mystery_refs: ["M-1"],
    clue_carriers: [
      {
        kind: "DA",
        record: "DA-1",
        clue_text: "The margin note uses her brother's dock name.",
        clue_strength: "suggestive",
        discovered_by: ["STENT-2"],
        audience_visible: "visible",
        status: "discovered"
      }
    ],
    source_records: ["BEL-1", "DA-1"],
    status: "partially_revealed",
    reveal_event: null,
    reveal_records: [],
    ...overrides
  };
}
