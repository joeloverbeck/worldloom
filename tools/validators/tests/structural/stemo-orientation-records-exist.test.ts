import assert from "node:assert/strict";
import test from "node:test";

import { stemoOrientationRecordsExist } from "../../src/structural/stemo-orientation-records-exist.js";
import { baseRecords, context, emotion, hasCode, page, storyRecord } from "./stemo-helpers.js";

test("stemo_orientation_records_exist accepts known orientation records", async () => {
  const verdicts = await stemoOrientationRecordsExist.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_orientation_records_exist rejects missing orientation records", async () => {
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([emotion({ orientation: { toward_records: ["STENT-404"] } })]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_exist.missing_orientation_record"));
});

test("stemo_orientation_records_exist rejects inactive orientation records", async () => {
  const inactiveTarget = storyRecord("story_entity_record", "STENT-3", "entities", {
    id: "STENT-3",
    created_at_page: "PG-1",
    holder: "public"
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([inactiveTarget, emotion({ orientation: { toward_records: ["STENT-3"] } })]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inactive_target"));
});

test("stemo_orientation_records_exist rejects inaccessible orientation records", async () => {
  const inaccessibleTarget = storyRecord("story_entity_record", "STENT-3", "entities", {
    id: "STENT-3",
    created_at_page: "PG-1"
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2", "STENT-3"],
        STSTAT: ["STSTAT-1"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        STEMO: ["STEMO-0"]
      }),
      inaccessibleTarget,
      emotion({ orientation: { toward_records: ["STENT-3"] } })
    ]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inaccessible_target"));
});

test("stemo_orientation_records_exist allows accessible false BEL imagined-object targets without active listing", async () => {
  const imaginedBelief = storyRecord("belief_record", "BEL-5", "beliefs", {
    id: "BEL-5",
    created_at_page: "PG-1",
    holder: "STENT-1",
    truth_relation: "false",
    basis: { access_records: ["STENT-1"] }
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([imaginedBelief, emotion({ orientation: { toward_records: ["BEL-5"] } })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_orientation_records_exist rejects inaccessible false BEL imagined-object targets", async () => {
  const inaccessibleBelief = storyRecord("belief_record", "BEL-5", "beliefs", {
    id: "BEL-5",
    created_at_page: "PG-1",
    holder: "STENT-2",
    truth_relation: "false",
    basis: { access_records: ["STENT-2"] }
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([inaccessibleBelief, emotion({ orientation: { toward_records: ["BEL-5"] } })]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inaccessible_target"));
  assert.ok(!hasCode(verdicts, "stemo_orientation_records_active.inactive_target"));
});
