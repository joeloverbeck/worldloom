import assert from "node:assert/strict";
import test from "node:test";

import { stemoOrientationRecordsExist } from "../../src/structural/stemo-orientation-records-exist.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

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
