import assert from "node:assert/strict";
import test from "node:test";

import { plansTranslator } from "../src/prompt/translators/plans.js";
import "../src/prompt/translators/plans.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixturePlan,
} from "./prompt/fixtures.js";

test("plans translator emits holder, body, target, visibility", () => {
  const record = fixturePlan("mplan-1", "Retrieve the ledger", {
    holder: "mchar-1",
    target: "mobj-1",
    visibility: "private",
    details: "Wait until the shift change, climb the south wall",
  });
  const ctx = fixtureCtx(
    { "mchar-1": "Jon" },
    { "mobj-1": "the brass key" },
  );
  const out = plansTranslator(record, ctx);
  assert.ok(out.includes("- Plan (Jon): Wait until the shift change, climb the south wall"));
  assert.ok(out.includes("Target/object: the brass key"));
  assert.ok(out.includes("Visibility: private — held internally"));
  assertNoInternalIds(out, "plans");
});

test("plans translator is registered", () => {
  assert.equal(getTranslator("plans"), plansTranslator);
});
