import assert from "node:assert/strict";
import test from "node:test";

import { beliefsTranslator } from "../src/prompt/translators/beliefs.js";
import "../src/prompt/translators/beliefs.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureBelief,
  fixtureCtx,
} from "./prompt/fixtures.js";

test("beliefs translator resolves holder title", () => {
  const record = fixtureBelief("mbel-1", "Belief about Ane", {
    holder: "mchar-1",
    details: "Ane is hurt and is trying not to scare him off",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = beliefsTranslator(record, ctx);
  assert.equal(
    out,
    "- Jon thinks: Ane is hurt and is trying not to scare him off",
  );
  assertNoInternalIds(out, "beliefs");
});

test("beliefs translator appends truth-relation clause when not unknown", () => {
  const record = fixtureBelief("mbel-2", "False belief", {
    holder: "mchar-1",
    details: "she is loyal",
    truth_relation: "false",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = beliefsTranslator(record, ctx);
  assert.ok(out.includes("the belief is mistaken"));
});

test("beliefs translator is registered", () => {
  assert.equal(getTranslator("beliefs"), beliefsTranslator);
});
