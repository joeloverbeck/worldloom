import assert from "node:assert/strict";
import test from "node:test";

import { consequencesTranslator } from "../src/prompt/translators/consequences.js";
import "../src/prompt/translators/consequences.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureConsequence,
} from "./prompt/fixtures.js";

test("consequences translator emits Pending consequence + urgency", () => {
  const record = fixtureConsequence("mcnsq-1", "Brokers will notice", {
    pending: true,
    urgency: "high",
    details: "The brokers will notice the ledger gap by morning",
  });
  const out = consequencesTranslator(record);
  assert.ok(out.includes("- Pending consequence: The brokers will notice the ledger gap by morning"));
  assert.ok(out.includes("Urgency: high"));
  assertNoInternalIds(out, "consequences");
});

test("consequences translator marks resolved when not pending", () => {
  const record = fixtureConsequence("mcnsq-2", "Resolved", {
    pending: false,
    urgency: "low",
    details: "Already handled by the steward",
  });
  const out = consequencesTranslator(record);
  assert.ok(out.includes("- Resolved consequence:"));
});

test("consequences translator is registered", () => {
  assert.equal(getTranslator("consequences"), consequencesTranslator);
});
