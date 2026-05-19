import assert from "node:assert/strict";
import test from "node:test";

import { stemoAppraisalBasisAccessibleToHolder } from "../../src/structural/stemo-appraisal-basis-accessible-to-holder.js";
import { baseRecords, context, emotion, hasCode, storyRecord } from "./stemo-helpers.js";

test("stemo_appraisal_basis_accessible_to_holder accepts accessible active beliefs", async () => {
  const verdicts = await stemoAppraisalBasisAccessibleToHolder.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_appraisal_basis_accessible_to_holder rejects inaccessible beliefs", async () => {
  const inaccessible = storyRecord("belief_record", "BEL-2", "beliefs", {
    id: "BEL-2",
    created_at_page: "PG-1",
    holder: "STENT-2",
    basis: { access_records: ["STENT-2"] }
  });
  const verdicts = await stemoAppraisalBasisAccessibleToHolder.run(
    undefined,
    context(baseRecords([inaccessible, emotion({ appraisal_basis: ["BEL-2"] })]))
  );
  assert.ok(hasCode(verdicts, "stemo_appraisal_basis_accessible_to_holder.inaccessible_belief"));
});

test("stemo_appraisal_basis_accessible_to_holder skips dissociated records", async () => {
  const verdicts = await stemoAppraisalBasisAccessibleToHolder.run(
    undefined,
    context(baseRecords([emotion({ status: "dissociated", appraisal_basis: ["BEL-404"] })]))
  );
  assert.deepEqual(verdicts, []);
});
