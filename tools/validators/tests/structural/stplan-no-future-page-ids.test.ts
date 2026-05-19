import assert from "node:assert/strict";
import test from "node:test";

import { stplanNoFuturePageIds } from "../../src/structural/stplan-no-future-page-ids.js";
import { baseRecords, context, hasCode, plan } from "./stplan-helpers.js";

test("stplan_no_future_page_ids accepts created_at_page references", async () => {
  const verdicts = await stplanNoFuturePageIds.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_no_future_page_ids rejects later page references", async () => {
  const verdicts = await stplanNoFuturePageIds.run(undefined, context(baseRecords([
    plan({ derived_from: ["PG-3"] })
  ])));
  assert.ok(hasCode(verdicts, "stplan_no_future_page_ids.not_on_branch_path"));
});
