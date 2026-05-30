import assert from "node:assert/strict";
import test from "node:test";

import { statusesTranslator } from "../src/prompt/translators/statuses.js";
import "../src/prompt/translators/statuses.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureStatus,
} from "./prompt/fixtures.js";

test("statuses translator emits bullet + active marker when active", () => {
  const record = fixtureStatus("mstat-1", "Bad shoulder", {
    subject: "mchar-1",
    summary: "Old injury from the dockyard collapse",
    active: true,
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = statusesTranslator(record, ctx);
  assert.ok(out.includes("- Bad shoulder (subject: Jon)"));
  assert.ok(out.includes("Old injury from the dockyard collapse"));
  assert.ok(out.includes("(currently active)"));
  assertNoInternalIds(out, "statuses");
});

test("statuses translator omits active marker when inactive", () => {
  const record = fixtureStatus("mstat-2", "Recovered", {
    subject: "mchar-1",
    active: false,
    summary: "Wound healed last week",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = statusesTranslator(record, ctx);
  assert.ok(!out.includes("(currently active)"));
});

test("statuses translator is registered", () => {
  assert.equal(getTranslator("statuses"), statusesTranslator);
});
