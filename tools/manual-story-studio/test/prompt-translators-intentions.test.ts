import assert from "node:assert/strict";
import test from "node:test";

import { intentionsTranslator } from "../src/prompt/translators/intentions.js";
import "../src/prompt/translators/intentions.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureIntention,
} from "./prompt/fixtures.js";

test("intentions translator emits holder, body, target", () => {
  const record = fixtureIntention("mint-1", "intent", {
    holder: "mchar-1",
    target: "mchar-2",
    details: "to keep her in the room a moment longer",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon", "mchar-2": "Ane" });
  const out = intentionsTranslator(record, ctx);
  assert.equal(
    out,
    "- Jon intends: to keep her in the room a moment longer (regarding Ane)",
  );
  assertNoInternalIds(out, "intentions");
});

test("intentions translator is registered", () => {
  assert.equal(getTranslator("intentions"), intentionsTranslator);
});
