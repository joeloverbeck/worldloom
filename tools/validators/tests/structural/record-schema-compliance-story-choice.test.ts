import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const CHOICE_FILE_PATH = "stories/foo/_source/choices/CHC-1.yaml";

function choiceRecord(groundedRecords: string[]) {
  return record("choice_record", "CHC-1", CHOICE_FILE_PATH, {
    id: "CHC-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    surface_label: "Take the grounded option",
    player_visible_intent: "Act on the current branch pressure.",
    target_or_action_families: ["decide"],
    likely_state_pressure: "The active story state makes this option meaningful.",
    grounded_in: {
      records: groundedRecords,
      affordance_ordinals: []
    }
  });
}

test("record_schema_compliance accepts expanded CHC grounding record classes", async () => {
  const allowedClasses = [
    "STENT",
    "STCHAR",
    "STSTAT",
    "STLOC",
    "STOBJ",
    "BEL",
    "OBL",
    "CNSQ",
    "THR",
    "SREL",
    "DA",
    "STPLAN",
    "STEMO",
    "CLK",
    "STSEC",
    "STQ",
    "STINT",
    "SF"
  ];

  for (const recordClass of allowedClasses) {
    const result = await recordSchemaCompliance.run(
      {},
      context([choiceRecord([`${recordClass}-1`])])
    );

    assert.deepEqual(result, [], recordClass);
  }
});

test("record_schema_compliance rejects invalid CHC grounding record classes", async () => {
  const result = await recordSchemaCompliance.run(
    {},
    context([choiceRecord(["INVALID-1"])])
  );

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/grounded_in/records/0")
  )));
});
