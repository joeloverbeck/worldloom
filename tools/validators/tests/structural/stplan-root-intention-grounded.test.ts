import assert from "node:assert/strict";
import test from "node:test";

import { stplanRootIntentionGrounded } from "../../src/structural/stplan-root-intention-grounded.js";
import { baseRecords, context, hasCode, page, plan, storyRecord } from "./stplan-helpers.js";

test("stplan_root_intention_grounded accepts active same-holder intentions", async () => {
  const verdicts = await stplanRootIntentionGrounded.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_root_intention_grounded rejects holder mismatches", async () => {
  const records = baseRecords([
    page("PG-2", { STENT: ["STENT-1"], STINT: ["STINT-2"], BEL: ["BEL-1"], SF: ["SF-1"], STOBJ: ["STOBJ-1"], STLOC: ["STLOC-1"], DA: ["DA-1"], SREL: ["SREL-1"], OBL: ["OBL-1"], THR: ["THR-1"] }),
    storyRecord("intention_record", "STINT-2", "intentions", { id: "STINT-2", created_at_page: "PG-1", holder: "STENT-2" }),
    plan({ root_intention: "STINT-2" })
  ]);
  const verdicts = await stplanRootIntentionGrounded.run(undefined, context(records));
  assert.ok(hasCode(verdicts, "stplan_root_intention_grounded.holder_mismatch"));
});
