import assert from "node:assert/strict";
import test from "node:test";

import { stplanResourceBasisGrounded } from "../../src/structural/stplan-resource-basis-grounded.js";
import { baseRecords, context, hasCode, plan, storyRecord } from "./stplan-helpers.js";

test("stplan_resource_basis_grounded accepts accessible active resources", async () => {
  const verdicts = await stplanResourceBasisGrounded.run(undefined, context(baseRecords([plan()])));
  assert.deepEqual(verdicts, []);
});

test("stplan_resource_basis_grounded rejects inaccessible resources unless blocker-listed", async () => {
  const records = baseRecords([
    storyRecord("story_object_record", "STOBJ-2", "objects", { id: "STOBJ-2", created_at_page: "PG-1", owner: "STENT-2" }),
    plan({ resource_basis: { objects: ["STOBJ-2"] }, blockers: [] })
  ]);
  const verdicts = await stplanResourceBasisGrounded.run(undefined, context(records));
  assert.ok(hasCode(verdicts, "stplan_resource_basis_grounded.inaccessible_resource"));
});
