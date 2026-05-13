import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/beliefs/BEL-0001.yaml";

test("record_schema_compliance accepts complete BEL records", async () => {
  const result = await recordSchemaCompliance.run({}, context([beliefRecord(validBelief())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects BEL records missing required fields", async () => {
  for (const field of ["holder", "claim", "truth_relation", "confidence", "visibility", "basis", "consequences"]) {
    const parsed = validBelief();
    delete parsed[field];

    const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

    assert.ok(
      result.some((verdict) =>
        verdict.code === "record_schema_compliance.required" &&
        verdict.message.includes(`'${field}'`)
      ),
      field
    );
  }
});

test("record_schema_compliance rejects invalid BEL enums", async () => {
  const parsed = validBelief();
  parsed.truth_relation = "maybe";

  const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/truth_relation")
  ));
});

test("record_schema_compliance rejects unexpected BEL fields", async () => {
  const parsed = validBelief();
  parsed.witnessed_page = "PG-0001";

  const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  ));
});

function beliefRecord(parsed: Record<string, unknown>) {
  return {
    ...record("belief_record", "test-story:BEL-0001", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validBelief(): Record<string, unknown> {
  return {
    id: "BEL-0001",
    story_id: "STORY-001",
    created_at_page: "PG-0001",
    supersedes: null,
    holder: "STENT-0001",
    claim: "Mara believes the door is watched.",
    truth_relation: "unknown",
    confidence: "suspected",
    visibility: "private",
    basis: {
      source_event: "SE-0001"
    },
    consequences: {
      opens: ["THR-0001"],
      constrains_choices: ["CHC-0001"]
    }
  };
}
