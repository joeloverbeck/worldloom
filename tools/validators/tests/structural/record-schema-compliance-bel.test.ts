import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/beliefs/BEL-1.yaml";

test("record_schema_compliance accepts complete contract-shaped BEL records", async () => {
  const result = await recordSchemaCompliance.run({}, context([beliefRecord(validBelief())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects padded BEL ids", async () => {
  const parsed = validBelief();
  parsed.id = "BEL-0001";

  const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/id")
  ));
});

test("record_schema_compliance rejects BEL records missing required fields", async () => {
  for (const field of ["holder", "claim", "belief_mode", "truth_relation", "confidence", "visibility", "basis", "consequences"]) {
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

test("record_schema_compliance accepts new BEL truth, confidence, and visibility values", async () => {
  const parsed = validBelief();
  parsed.belief_mode = "knows";
  parsed.truth_relation = "future_contingent";
  parsed.confidence = "uncommitted";
  parsed.visibility = "factional";

  const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects retired BEL confidence values", async () => {
  for (const confidence of ["rumor", "performative_lie"]) {
    const parsed = validBelief();
    parsed.confidence = confidence;

    const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

    assert.ok(result.some((verdict) =>
      verdict.code === "record_schema_compliance.enum" &&
      verdict.message.includes("/confidence")
    ), confidence);
  }
});

test("record_schema_compliance rejects unexpected BEL fields", async () => {
  const parsed = validBelief();
  parsed.witnessed_page = "PG-1";

  const result = await recordSchemaCompliance.run({}, context([beliefRecord(parsed)]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  ));
});

function beliefRecord(parsed: Record<string, unknown>) {
  return {
    ...record("belief_record", "test-story:BEL-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validBelief(): Record<string, unknown> {
  return {
    id: "BEL-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    supersedes: null,
    holder: "STENT-1",
    claim: "Mara believes the door is watched.",
    belief_mode: "believes",
    truth_relation: "unknown",
    confidence: "medium",
    visibility: "private",
    basis: {
      source_event: "SE-1",
      access_route: "direct_observation",
      access_records: ["STENT-1", "SE-1"]
    },
    consequences: {
      opens: ["THR-1"],
      constrains_choices: ["CHC-1"]
    }
  };
}
