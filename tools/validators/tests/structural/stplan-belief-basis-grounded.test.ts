import assert from "node:assert/strict";
import test from "node:test";

import { stplanBeliefBasisGrounded } from "../../src/structural/stplan-belief-basis-grounded.js";
import { baseRecords, context, hasCode, plan, storyRecord } from "./stplan-helpers.js";

test("stplan_belief_basis_grounded accepts active accessible beliefs", async () => {
  const verdicts = await stplanBeliefBasisGrounded.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_belief_basis_grounded rejects inaccessible beliefs", async () => {
  const records = baseRecords([
    storyRecord("belief_record", "BEL-2", "beliefs", { id: "BEL-2", created_at_page: "PG-1", holder: "STENT-2", basis: { access_records: [] } }),
    plan({ belief_basis: ["BEL-2"] })
  ]);
  const verdicts = await stplanBeliefBasisGrounded.run(undefined, context(records));
  assert.ok(hasCode(verdicts, "stplan_belief_basis_grounded.inaccessible_belief"));
});
