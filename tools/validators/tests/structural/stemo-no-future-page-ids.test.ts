import assert from "node:assert/strict";
import test from "node:test";

import { stemoNoFuturePageIds } from "../../src/structural/stemo-no-future-page-ids.js";
import { baseRecords, context, emotion, hasCode } from "./stemo-helpers.js";

test("stemo_no_future_page_ids accepts created_at_page references", async () => {
  const verdicts = await stemoNoFuturePageIds.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_no_future_page_ids rejects later page references", async () => {
  const verdicts = await stemoNoFuturePageIds.run(
    undefined,
    context(baseRecords([emotion({ expires_when: "After PG-3." })]))
  );
  assert.ok(hasCode(verdicts, "stemo_no_future_page_ids.not_on_branch_path"));
});
