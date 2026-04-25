import assert from "node:assert/strict";
import test from "node:test";

import { rule7MysteryReservePreservation } from "../../src/rules/rule7-mystery-reserve-preservation.js";
import { completeMr, mrRecord, testContext } from "./helpers.js";

test("rule7_mystery_reserve_preservation checks data-layer fields only", async () => {
  const proseNamed = mrRecord("M-1", {
    ...completeMr,
    unknowns: [],
    disallowed_cheap_answers: [],
    what_is_unknown: ["not accepted"],
    forbidden_answers: ["not accepted"],
    what_is_known_around_it: ["not accepted"]
  });

  const result = await rule7MysteryReservePreservation.run({}, testContext([proseNamed]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    ["rule7.missing_disallowed_cheap_answers", "rule7.missing_unknowns"].sort()
  );
  assert.equal(result.some((verdict) => verdict.message.includes("what_is_unknown")), false);
});

test("rule7_mystery_reserve_preservation accepts populated structural fields", async () => {
  const result = await rule7MysteryReservePreservation.run({}, testContext([mrRecord("M-1")]));
  assert.equal(result.length, 0);
});

test("rule7_mystery_reserve_preservation couples future_resolution_safety to status", async () => {
  const result = await rule7MysteryReservePreservation.run(
    {},
    testContext([
      mrRecord("M-1", { ...completeMr, status: "forbidden", future_resolution_safety: "none" }),
      mrRecord("M-2", { ...completeMr, status: "forbidden", future_resolution_safety: "low" }),
      mrRecord("M-3", { ...completeMr, status: "active", future_resolution_safety: "medium" }),
      mrRecord("M-4", { ...completeMr, status: "active", future_resolution_safety: "none" })
    ])
  );

  assert.deepEqual(
    result.map((verdict) => [verdict.location.node_id, verdict.code]),
    [
      ["M-2", "rule7.future_resolution_safety_status_mismatch"],
      ["M-4", "rule7.future_resolution_safety_status_mismatch"]
    ]
  );
});
