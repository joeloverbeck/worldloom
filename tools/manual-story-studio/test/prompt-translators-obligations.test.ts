import assert from "node:assert/strict";
import test from "node:test";

import { obligationsTranslator } from "../src/prompt/translators/obligations.js";
import "../src/prompt/translators/obligations.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureObligation,
} from "./prompt/fixtures.js";

test("obligations translator emits holder + recipient + body + urgency", () => {
  const record = fixtureObligation("mobl-1", "Promised the ledger", {
    owed_by: "mchar-1",
    owed_to: "mchar-2",
    urgency: "overdue",
    details: "Promised to bring the ledger by the second bell",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon", "mchar-2": "Ane" });
  const out = obligationsTranslator(record, ctx);
  assert.ok(out.includes("- Open obligation (Jon → Ane): Promised to bring the ledger by the second bell"));
  assert.ok(out.includes("Urgency: overdue"));
  assertNoInternalIds(out, "obligations");
});

test("obligations translator is registered", () => {
  assert.equal(getTranslator("obligations"), obligationsTranslator);
});
